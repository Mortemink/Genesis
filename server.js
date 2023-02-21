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
const path = require('path')

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
app.use(methodOverride('_method'));

app.use(express.static(path.join(__dirname, 'public')));

async function start() {
    try {
        const DB = `mongodb://127.0.0.1/Genesis`

        await connectedToDBCheck()

        mongoose.set('strictQuery', true)
        await mongoose.connect(DB, {
                useNewUrlParser: true,
                autoIndex: false,
                useUnifiedTopology: true
            })
            .then(() => {
                connectedToDB = true;
                console.log('Успешное подключение к базе данных.');

                app.listen(3000, () => {
                    console.log('Сайт запущен!\nСсылка: http://localhost:3000')
                })
            });
    } catch (e) {
        throw new Error(e);
    }
}

let connectedToDB = false;
const maxCheckIterations = 5;
async function connectedToDBCheck() {
    const shell = require('shelljs');
    const OS = process.platform;
    let iterations = 0;
    let tryEnableDB = false;
    const Interval = setInterval(() => {

        iterations++;

        if (tryEnableDB === false && iterations >= maxCheckIterations && !connectedToDB) {
            if (OS === "win32")
                shell.exec('net start mongodb');
            else if (OS === "linux")
                shell.exec('sudo systemctl restart mongodb');
            else 
                throw new Error('Служба MongoDB не смогла запуститься из Node.js, попробуйте сделать это вручную.');

            tryEnableDB = true;
            iterations = 0;
            
        } else if (tryEnableDB === true && iterations >= maxCheckIterations && !connectedToDB) {
            throw new Error('Служба MongoDB не смогла запуститься из Node.js, попробуйте сделать это вручную.');
        }
            
        if (connectedToDB) {
            clearInterval(Interval);
        }
    }, 1000);
}

start();

app.get('/', async (req, res) => {
    res.render('index.ejs', await GetUser(req))
    
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

        if (doesExist) {
            res.redirect('/register?errStatus=1');
        }
        else {
            const newUser = new users({
                firstName: req.body.name,
                lastName: req.body.lastname,
                email: req.body.email,
                telephone: req.body.number,
                password: hashedPassword,
                accountType: 0,
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
    res.render('item_page.ejs', await GetUser(req))
})

app.get('/moderator_page', checkModerator, async (req, res) => {
    res.render('moderator_page.ejs', await GetUser(req))
})

app.post('/moderator_page', checkModerator, async(req, res)=>{
    res.render('moderatior_page.ejs')
})

app.get('/catalog', async (req, res) => {
    res.render('catalog.ejs', await GetUser(req))
})

app.get('/profile', checkAuthenticated, async (req, res) => {
    try {
        res.render('profile.ejs', await GetUser(req))
    } catch (e) {
        console.error(e);
    }
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



// FUNCTIONS //

async function GetUser(req) {
    let user = await req.user;
    if (user === undefined) {
        user = {
            firstName: null,
            lastName: null,
            email: null,
            telephone: null,
            accountType: null,
        }
    }

    return {
        logged: user.accountType != null ?? false,
        user
    }
}

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

// Type == 1
function checkModerator(req, res, next) {
    if (req.isAuthenticated() && req.user.accountType >= 1){
        return next()
    }
    res.redirect('/')
}

// Type == 2
function checkAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.accountType >= 2){
        return next()
    }
    res.redirect('/')
}

app.delete('/logout', async (req, res) => {
    try {
        await req.logOut((e) => {
            if (e) {
                console.error(e)
            }
        });
    } catch (e) {
        console.log(e + '\nНе получилось выйти из аккаунта, кто-то где-то насрал.')
    }

    res.redirect('/')
})


