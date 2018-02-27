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

//Data helpers
class Article {
    constructor(title, text) {
        this._id = undefined;
        this.url = createHash(16);
        this.author = null;
        this.title = title;
        this.text = text;
        this.comments = [];
        this.date = Date.now()
    }
}

class Comment {
    constructor(text) {
        this.author = "Anonymous";
        this.text = text;
        this.date = Date.now();
    }
}

//Routers

//Index
app.get('/', (req, res) => {
    database.collection('articles').find().sort({date: -1}).toArray().then((articles) => {
        let renderData = {
            articles: articles.map((article) => {
                let articleRenderData = {};
                if (article.title.length > 140) {
                    articleRenderData.title = article.title.substring(0, 139) + ' ...';
                } else {
                    articleRenderData.title = article.title;
                }
                if (article.text.length > 500) {
                    articleRenderData.text = article.text.substring(0, 499) + ' ...';
                } else {
                    articleRenderData.text = article.text;
                }
                articleRenderData.url = article.url;
                return articleRenderData;
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
    let article = new Article(req.body.title, req.body.text);
    database.collection('articles').insertOne(article).then(() => {
        res.redirect(302, '/article/' + article.name);
    });
});

app.post('/article-api/update', (req, res) => {
    //todo
});

app.get('/article/:articleUrl', (req, res) => {
    database.collection('articles').findOne({url: req.params.articleUrl}).then((result) => {
        if (result == null) {
            return res.render('articleNotFound');
        }
        let renderData = {
            title: result.title,
            text: result.text,
            comments: result.comments,
            url: req.params.articleUrl,
        };
        res.render('viewArticle', renderData);
    });
});

app.post('/article-api/add-comment', (req, res) => {
    console.log(req.session);
    let newComment = new Comment(req.body.text);
    if (req.body.anonymous === "false") {
        newComment.author = req.session.user.username;
    }
    database.collection('articles').findOneAndUpdate({url: req.body.url}, {$push: {comments: newComment}}).then(() => {
        res.redirect(302, '/article/' + req.body.url);
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

