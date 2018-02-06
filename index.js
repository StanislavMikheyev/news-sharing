'use strict';

const express = require('express');
const app = express();
const createHash = require('hash-generator');
const session = require('express-session');

let database = null;
require('mongodb').MongoClient.connect('mongodb://localhost:27017', (err, client) => {
    database = client.db('news-sharing');
});

const exphbs = require('express-handlebars');
app.engine('handlebars', exphbs({
    defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: 'verysecuresecretkey12345!@#$%',
    resave: false,
    saveUninitialized: false,
}));

app.listen(3000, () => {
    console.log('news-sharing app listening on port 3000!');
});

//Routers

app.get('/', (req, res) => {
    database.collection('articles').find().toArray().then((articles) => {
        let renderData = {
            articles: articles.map((article) => {
                if (article.text.length > 140) {
                    article.text = article.text.substring(0, 139) + '...';
                }
                return article;
            })
        };
        res.render('index', renderData);
    });
});

//Article
app.get('/new', (req, res) => {
    res.render('newArticle');
});

app.post('/article-api/create', (req, res) => {
    let article = req.body;
    article.name = createHash(16);
    database.collection('articles').insertOne(article).then(() => {
        res.redirect(302, '/article/' + article.name);
    });
});

app.post('/article-api/update', (req, res) => {
    //
});

app.get('/article/:articleName', (req, res) => {
    database.collection('articles').findOne({name: req.params.articleName}).then((result) => {
        if (result == null) {
            res.render('articleNotFound');
            return;
        }
        res.render('viewArticle', result);
    });
});

//User

app.get('/user/login', (req, res) => {
    res.render('login');
});

app.get('/user/create', (req, res) => {
    res.render('createUser');
});

app.post('/user-api/auth', (req, res) => {
    database.collection('users').findOne({username: req.body.username}).then((user) => {
        if ((user == null) || (user.password !== req.body.password)) {
            res.redirect(302, '/user/login');
            return;
        }
        req.session.user = user;
        res.redirect(302, '/');
    });
});

app.post('/user-api/create', (req, res) => {
    database.collection('users').findOne({
        $or: [
            {username: req.body.username},
            {email: req.body.email}
        ]
    }).then((user) => {
        if (user != null) {
            res.redirect(302, '/user/create');
            return;
        }
        let newUser = {
            username: req.body.username,
            password: req.body.password,
            email: req.body.email,
        };
        database.collection('users').insertOne(newUser).then((user) => {
            req.session.user = user;
            res.redirect(302, '/');
        });
    })
});

