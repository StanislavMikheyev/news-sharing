'use strict';

const express = require('express');
const app = express();
const createHash = require('hash-generator');

let database = null;
require('mongodb').MongoClient.connect('mongodb://localhost:27017', (err, client) => {
    database = client.db('news-sharing');
});

const exphbs = require('express-handlebars');
app.engine('handlebars', exphbs());
app.set('view engine', 'handlebars');

const bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.listen(3000, () => {
    console.log('news-sharing app listening on port 3000!');
});

//Routers
app.get('/', (req, res) => {
    res.render('new');
});

app.post('/article-api/create', (req, res) => {
    let article = req.body;
    article.name = createHash(16);
    database.collection('articles').insertOne(article).then(() => {
        res.sendStatus(200);
    });
});

app.post('/article-api/update', (req, res) => {
    //
});

app.get('/article/:articleName', (req, res) => {
    database.collection('articles').findOne({name: req.params.articleName}).then((result) => {
        if (result == null) {
            res.render('noArticle');
            return;
        }
        res.render('article', result);
    });
});
