module.exports = function (app) {  
    var controller = app.controllers.createApp,  
        multer = require('multer'),
        upload  = multer({ storage: multer.memoryStorage() });

  app.route('/')      
    .get((req, res, next) => {
      res.render('new', { title: 'Create new TitleClose App', doc: {name: ""}, action: '/' });
    })
    .post(upload.array('files'), controller.createNewApp);  
}
