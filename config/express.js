module.exports = function () {
    var express = require('express'),        
        load = require('express-load'),
        path = require('path'),
        morgan = require('morgan'),
        bodyParser = require('body-parser');    

    let app = express();
    var index = require('../routes/index');
    app.set('views', './views');
    app.set('view engine', 'ejs');
    app.use(morgan('dev'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(require('method-override')());
    app.use(express.static('./public'));        

    load('controllers', {cwd: '', verbose: true})    
        .then('routes')
        .into(app, function (err, instance) {
        if (err) throw err;
    });

    app.use('/', index);

    let port = process.env.PORT || 8080;
    app.set('port', port);    

    return app;
};
