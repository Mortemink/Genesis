if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const express = require('express')
const app = express()
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')
const mongoStore = require('connect-mongo')
const Users = require('./models/users')
const Forms = require('./models/forms')
const Items = require('./models/items')
const fileUpload = require('express-fileupload')
const methodOverride = require('method-override')
const fs = require('fs')
const path = require('path')
const execSync = require('child_process').execSync

const MongoURL = `mongodb://127.0.0.1:27017/Genesis`

const initializePassport = require('./passport-config')
initializePassport(
    passport,
    email => Users.findOne({email: email}),
    id => Users.findOne({_id: id})
)

app.set('view-engine', 'ejs')
app.set('views', 'views')

app.use(fileUpload({
    createParentPath: true
}))
app.use(bodyParser.urlencoded({extended: false}))
app.use(flash())
app.set('trust proxy', true);
app.use(session({
    store: mongoStore.create({
        mongoUrl: MongoURL,
        ttl: 60 * 60 * 24 * 1
    }),
    secret: process.env.SESSION_SECRET || 'xXx_ЕБУЧКА_xXx',
    resave: false,
    saveUninitialized: false,
    httpOnly: true,
    secure: true
}))

app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))

app.use(express.static(path.join(__dirname, 'public')))

async function start() {
    try {

        mongoose.set('strictQuery', true)

        // Запуск службы mongodb если она не запущена
        if (process.platform === 'win32') {
            try {
                await execSync('net start mongodb', { stdio: 'pipe' })
            } catch {}
        }

        console.log('Подключение к базе данных...')
        await mongoose.connect(MongoURL, {
            useNewUrlParser: true,
            autoIndex: false,
            useUnifiedTopology: true
        })
            .then(() => {
                console.log('Успешное подключение к базе данных!')
            })
            .catch((e) => {
                console.error('Не получилось подключится к базе данных!')
            })
    } catch (e) {
        throw new Error(e);
    }
}

start()
    .then(() => {
        const PORT = 3000
        app.listen(PORT)
        console.log(`Сайт запущен!\nСсылка: http://localhost:${PORT}`)
    })

app.get('/', async (req, res) => {
    res.render('index.ejs', await GetUser(req))

})

app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login.ejs')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true,
}))

app.route('/addItem')
    .get(checkModerator, async (req, res) => {
        res.render('add_item.ejs', await GetUser(req))
    })
    .post(checkModerator, async (req, res) => {

        await RequestTryCatch(req, res, async () => {
            const body = await req.body

            if (body.title && body.sellerName) {

                const encodedImages = await encodeImages(req)
                console.log(encodedImages)
                const item = new Items({
                    title: body.title,
                    sellerName: body.sellerName,
                    square: body.square,
                    floor: body.floor,
                    floorCount: body.floorCount,
                    price: body.price,
                    description: body.description,
                    firstImage: encodedImages[0] ?? { mimetype: null, buffer: null },
                    images: encodedImages,
                    created: Date.now()
                })

                await item.save()

                res.redirect('/moderator_page?good=true')
            } else {
                throw new Error('Не удалось сохранить новое объявление!')
            }
        }, '/moderator_page?good=false')

    })


app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('register.ejs')
})

app.post('/register', checkNotAuthenticated, async (req, res) => {

    await RequestTryCatch(req, res, async () => {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)

        let doesExist = await Users.findOne({email: req.body.email, telephone: req.body.telephone});

        if (doesExist) {
            res.redirect('/register?errStatus=1');
        } else {
            const newUser = new Users({
                firstName: req.body.name,
                lastName: req.body.lastname,
                email: req.body.email,
                telephone: req.body.number,
                password: hashedPassword,
                accountType: 0,
                created: Date.now().toString()
            })
            await newUser.save();

            res.redirect('login');
        }
    }, '/register')

})

app.get('/item_page', async (req, res) => {

    await RequestTryCatch(req, res, async () => {
        const _id = req.query._id
        if (_id === null) {
            throw new Error("Не указан параметр _id.")
        }

        const item = await Items.findOne({_id: _id})
        if (!item) {
            throw new Error("Не найден item.")
        }

        const session = await GetUser(req);
        res.render('item_page.ejs', {
            logged: session.logged,
            user: session.user,
            item
        })
    })

})

app.get('/moderator_page', checkModerator, async (req, res) => {

    await RequestTryCatch(req, res, async () => {
        const items = await Items.find({}, { images: 0, __v: 0 })
        const session = await GetUser(req);
        res.render('moderator_page.ejs', {
            logged: session.logged,
            user: session.user,
            items
        })
    })

})

app.post('/moderator_page', checkModerator, async (req, res) => {
    throw new Error('Еще не сделано')
})

app.get('/catalog', async (req, res) => {

    await RequestTryCatch(req, res, async () => {
        const items = await Items.find({}, { images: 0, __v: 0 })
        const session = await GetUser(req);
        res.render('catalog.ejs', {
            logged: session.logged,
            user: session.user,
            items
        })
    })

})

app.get('/profile', checkAuthenticated, async (req, res) => {
    try {
        res.render('profile.ejs', await GetUser(req))
    } catch (e) {
        console.error(e);
    }
})

app.post('/sendform', checkAuthenticated, async (req, res) => {
    await RequestTryCatch(req, res, async () => {
        const form = req.body
        const user = await req.user
        const newForm = new Forms({
            country: form.country,
            state: form.state,
            city: form.city,
            typeOfService: form.typeofservice,
            senderEmail: user.email,
            senderNumber: user.telephone,
            created: Date.now().toString()
        })
        await newForm.save()

        res.redirect('/')
    })
})


// FUNCTIONS //

async function RequestTryCatch(req, res, cb = async () => {
}, redirectURL = null) {
    try {
        await cb();
    } catch (e) {
        console.error(e);
        const secs = 3;
        const text = `<h1>Произошла ошибка при выполнении запроса!<br>Вы будете перенаправлены на главную страницу через ${secs} секунды.</h1>
                      <script type="text/javascript"> setTimeout(() => { window.location.replace('/') }, ${ secs * 1000 }) </script>`

        res.set('Content-Type', 'text/html')
        res.send(Buffer.from(text))
    }
}

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
    if (req.isAuthenticated()) {
        return next()
    }
    res.redirect('/login')
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/')
    }
    next()
}

// Type == 1
async function checkModerator(req, res, next) {
    if (req.isAuthenticated()) {
        const user = await req.user.clone();
        if (user.accountType >= 1) {
            return next()
        }
    }

    res.redirect('/')
}

// Type == 2
async function checkAdmin(req, res, next) {
    if (req.isAuthenticated()) {
        const user = await req.user.clone();
        if (user.accountType >= 2) {
            return next()
        }
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

async function encodeImages(req) {
    const images = []

    if (req.files && req.files.images) {
        for (const key in req.files.images) {
            let image;
            if (req.files.images.length === undefined) {
                image = req.files.images
            } else {
                image = req.files.images[key]
            }

            try {
                // скип фотки если вес больше 4мб (или 5 не помню пох)
                const acceptedMimetypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/bmp', 'image/gif']
                if (image.size > 16000000 || !acceptedMimetypes.includes(image.mimetype)) {
                    continue
                }
                images.push({
                    mimetype: image.mimetype,
                    buffer: new Buffer.from(image.data, 'base64')
                })
            } catch (e) {
                console.error(e)
            }
        }
    }

    return images
}