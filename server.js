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
const fs = require('node:fs')
const path = require('node:path')
const execSync = require('node:child_process').execSync

const MongoURL = `mongodb://127.0.0.1:27017/Genesis`

const initializePassport = require('./passport-config')
const {query} = require("express");
initializePassport(
    passport,
    email => Users.findOne({email: email}),
    id => Users.findOne({_id: id})
)

app.set('view-engine', 'ejs')
app.set('views', 'views')

app.use(fileUpload({
    createParentPath: true,
    useTempFiles: true
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
                await execSync('net start mongodb', {stdio: 'pipe'})
            } catch {
            }
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

app.route('/item_page')
    .get(async (req, res) => {

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
    .delete(async (req, res) => {

        await RequestTryCatch(req, res, async () => {
            const _id = req.query._id
            if (_id === null) {
                throw new Error("Не указан параметр _id.")
            }

            Items.findOneAndDelete({_id: _id})
                .then(() => {
                    res.redirect('/moderator_page')
                })
                .catch((e) => {
                    throw new Error(e)
                })

        })

    })


app.get('/moderator_page', checkModerator, async (req, res) => {

    await RequestTryCatch(req, res, async () => {
        const items = await Items.find({}, {images: 0, __v: 0})
        const session = await GetUser(req);
        res.render('moderator_page.ejs', {
            logged: session.logged,
            user: session.user,
            items
        })
    })

})

app.route('/addItem')
    .get(checkModerator, async (req, res) => {
        const session = await GetUser(req)
        res.render('add_item.ejs', {
            logged: session.logged,
            user: session.user,
            item: undefined
        })
    })
    .post(checkModerator, async (req, res) => {

        await RequestTryCatch(req, res, async () => {
            const body = await req.body

            if (body.title && body.sellerName) {

                const encodedImages = await uploadImagesToDB(req.files)

                const item = new Items({
                    title: body.title,
                    sellerName: body.sellerName,
                    square: body.square,
                    floor: body.floor,
                    floorCount: body.floorCount,
                    address: body.address,
                    price: body.price,
                    description: body.description,
                    firstImage: encodedImages[0] ?? {mimetype: null, buffer: null},
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


app.route('/editItem')
    .get(checkModerator, async (req, res) => {

        await RequestTryCatch(req, res, async () => {
            const id = req.query._id
            const item = await Items.findOne({_id: id})
            if (item) {
                const session = await GetUser(req)
                res.render('add_item.ejs', {
                    logged: session.logged,
                    user: session.user,
                    item
                })
            } else {
                throw new Error('Не найдено объявление с данным id.')
            }
        })

    })
    .post(checkModerator, async (req, res) => {

        await RequestTryCatch(req, res, async () => {
            const body = await req.body

            if (body.title && body.sellerName) {

                const encodedImages = await uploadImagesToDB(req.files)

                await Items.findOneAndUpdate({_id: req.query._id},{
                    title: body.title,
                    sellerName: body.sellerName,
                    square: body.square,
                    floor: body.floor,
                    floorCount: body.floorCount,
                    price: body.price,
                    description: body.description,
                    firstImage: encodedImages[0] ?? {mimetype: null, buffer: null},
                    images: encodedImages,
                    updatedAt: Date.now()
                })

                res.redirect('/moderator_page?good=true')
            } else {
                throw new Error('Не удалось сохранить измененное объявление!')
            }
        }, '/moderator_page?good=false')

    })

app.get('/catalog', async (req, res) => {

    await RequestTryCatch(req, res, async () => {
        const items = await Items.find({}, {images: 0, __v: 0})
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

app.post('/save_profile_info', checkAuthenticated, async (req, res) => {
    try {
        const body = req.body
        if (body.email || body.password) {
            const session = await GetUser(req)

            let needLogout = false;
            let hashedPassword;
            if (body.password) {
                hashedPassword = await bcrypt.hashSync(body.password, 10)
                await Users.findOneAndUpdate({_id: session.user._id}, {
                    password: hashedPassword
                });

                needLogout = true;
            }

            if (body.email) {
                await Users.findOneAndUpdate({_id: session.user._id}, {
                    email: body.email
                });
            }

            if (needLogout) {
                await logout(req, res)
            } else {
                res.redirect('/profile');
            }

        } else {
            res.redirect('/profile')
        }
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
}, redirectURL = '/') {
    try {
        await cb();
    } catch (e) {
        console.error(e);
        const secs = 3;
        const text = `<h1>Произошла ошибка при выполнении запроса!<br>Вы будете перенаправлены на ${redirectURL === '/' || null ? 'главную страницу' : redirectURL} через ${secs} секунды.</h1>
                      <script type="text/javascript"> setTimeout(() => { window.location.replace('${redirectURL}') }, ${secs * 1000}) </script>`

        res.set('Content-Type', 'text/html')
        res.send(Buffer.from(text))
    }
}

async function GetUser(req) {
    let user = await req.user;
    if (user === undefined) {
        user = {
            _id: null,
            firstName: null,
            lastName: null,
            email: null,
            telephone: null,
            accountType: null
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

async function logout(req, res) {
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
}

app.delete('/logout', async (req, res) => {
    await logout(req, res)
})

async function uploadImagesToDB(reqFiles) {
    const tempPathsToUnlink = []
    const images = []
    let image;
    if (reqFiles && reqFiles.images) {
        for (let key in reqFiles.images) {
            try {
                const oneFile = reqFiles.images.md5 !== undefined

                image = oneFile
                    ? reqFiles.images
                    : reqFiles.images[key]

                const acceptedMimetypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/bmp', 'image/gif']
                if (image.size > 16000000 /* 16МБ */ || !acceptedMimetypes.includes(image.mimetype)) {
                    continue
                }

                images.push({
                    mimetype: image.mimetype,
                    buffer: fs.readFileSync(image.tempFilePath)
                })

                if (oneFile)
                    break;

            } catch (e) {
                console.error(e)
            } finally {
                tempPathsToUnlink.push(image.tempFilePath)
            }
        }

        for (let path of tempPathsToUnlink) {
            fs.unlink(path, () => {})
        }
    }

    return images
}