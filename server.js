var express = require('express'),
    path = require('path'),
    morgan = require('morgan'),
    bodyParser = require('body-parser'),
    app = express();

var index = require('./routes/index');
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);

var porta = process.env.PORT || 8080;

const server = app.listen(porta, () => {
    console.log(`Express is running on port ${porta}`);
});
