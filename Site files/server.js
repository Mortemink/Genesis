if(process.env.NODE_ENV !=='production'){
    require('dotenv').config()
}

const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session') 
const methodOverride = require('method-override')

const initializePassport = require('./passport-config')
initializePassport(
    passport,
     email => users.find(user => user.email === email),
     id => users.find(user => user.id === id),
)

const users = []

app.set('view-engine', 'ejs')
app.use(express.urlencoded({ extended: false}))
app.use(flash())
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false, 
    saveUninitialized: false,
}))

app.use(passport.initialize())
app.use(passport.session()) 

let path = require('path')

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('index.ejs')
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
        users.push({
            id: Date.now().toString(),
            name: req.body.name,
            lastname: req.body.lastname,
            email: req.body.email, 
            number: req.body.number, 
            password: hashedPassword,
        })
        res.redirect('/login')
    } catch{
res.redirect('/register')
    }
    console.log(users)
})


app.get('/profile', checkAuthenticated, (req, res)=>{
    res.render('profile.ejs', {name: req.user.name, lastname: req.user.lastname, email: req.user.email, number: req.user.number })
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
    req.logOut()
    res.redirect('/')
})

app.listen(3000)
