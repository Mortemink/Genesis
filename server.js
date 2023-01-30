if(process.env.NODE_ENV !=='production'){
    require('dotenv').config()
}

const shell = require('shelljs')
const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const bodyParser = require("body-parser") 
const mongoose = require("mongoose")
const users = require("./models/users")
const forms = require("./models/forms")
const methodOverride = require('method-override')

const initializePassport = require('./passport-config')
initializePassport(
    passport,
    email => users.findOne({ email: email }),
    id => users.findOne({ _id: id })
)

app.set('view-engine', 'ejs')
app.set('views', 'views')

app.use(bodyParser.urlencoded({ extended: false}))
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    httpOnly: true,
    secure: true
}))

app.use(passport.initialize())
app.use(passport.session()) 

let path = require('path')

app.use(express.static(path.join(__dirname, 'public')));

async function start() {

    const DB = `mongodb://127.0.0.1/Genesis`

    await connectedToDBCheck()

    mongoose.set('strictQuery', true)
    await mongoose.connect(DB, {
        useNewUrlParser: true,
        autoIndex: false,
        useUnifiedTopology: true
    });

    connectedToDB = true;
    console.log('Успешное подключение к базе данных.');

    app.listen(3000, () => {
        console.log('Сайт запущен!\nСсылка: localhost:3000')
    })
}

let connectedToDB = false;
const maxCheckIterations = 5;
async function connectedToDBCheck() {
    const shell = require('shelljs');
    const OS = process.platform;
    let iterations = 0;
    let tryEnableDB = false;
    setInterval(() => {

        iterations++;

        if (tryEnableDB == false && iterations >= maxCheckIterations && !connectedToDB) {
            if (OS == "win32") 
                shell.exec('net start mongodb');
            else if (OS == "linux") 
                shell.exec('sudo systemctl restart mongodb');
            else 
                throw new error('Служба MongoDB не смогла запуститься из Node.js, попробуйте сделать это вручную.');

            tryEnableDB = true;
            iterations = 0;
            
        } else if (tryEnableDB == true && iterations >= maxCheckIterations && !connectedToDB) {
            throw new error('Служба MongoDB не смогла запуститься из Node.js, попробуйте сделать это вручную.');
        }
            
        if (connectedToDB)
            return;

    }, 1000);
}

start();

app.get('/', async (req, res) => {
    res.render('index.ejs', { logged: !!(await req.user) })
    
})

app.get('/login', checkNotAuthenticated, (req, res) =>{
    res.render('login.ejs')
})

app.post('/login', checkNotAuthenticated,  passport.authenticate('local',{
    successRedirect: '/', 
    failureRedirect: '/login', 
    failureFlash: true,
}))

 
app.get('/register', checkNotAuthenticated,  (req, res) =>{
    res.render('register.ejs')
})

app.post('/register', checkNotAuthenticated,  async (req, res)=>{
    try{
        const hashedPassword = await bcrypt.hash(req.body.password, 10)

        let doesExist = await users.findOne({ email: req.body.email, telephone: req.body.telephone });

        if ((!!doesExist) == true) {
            res.redirect('/register?errStatus=1');
        }
        else {
            const newUser = new users({
                firstName: req.body.name,
                lastName: req.body.lastname,
                email: req.body.email,
                telephone: req.body.number,
                password: hashedPassword,
                created: Date.now().toString()
            })
            newUser.save();
            res.redirect('login');
        }
    } catch{
        res.redirect('/register')
    }
})

app.get('/item_page', async (req, res) => {
    res.render('item_page.ejs', { logged: !!(await req.user) })
})

app.get('/catalog', async (req, res) => {
    res.render('catalog.ejs', { logged: !!(await req.user) })
})

app.get('/profile', checkAuthenticated, async (req, res) => {
    const user = await req.user
    
    const name = user.firstName
    const lastname = user.lastName
    const number = user.telephone
    const email = user.email

    res.render('profile.ejs', { name, lastname, email, number })
})

app.post('/sendform', checkAuthenticated, async (req, res) => {
    try {
        const form = req.body
        const user = await req.user
        const newForm = new forms({
            country: form.country,
            state: form.state,
            city: form.city,
            typeOfService: form.typeofservice,
            senderEmail: user.email,
            senderNumber: user.telephone,
            created: Date.now().toString()
        })
        newForm.save()
    } finally {
        res.redirect('/')
    }
})

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()){
        return next()
    }
    res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()){
        return res.redirect('/')
    } 
    next()
}

app.delete('/logout', (req, res) => {
    try {
        req.logOut();
    } catch (e) {
        console.log(e + '\nНе получилось выйти из аккаунта, кто-то где-то насрал.')
    } finally {
        res.redirect('/')
    }
})


