module.exports = function (app) {  
  var controller = app.controllers.createApp;  

  app.route('/')      
    .get((req, res, next) => {
      res.render('new', { title: 'Create new TitleClose App', doc: {name: ""}, action: '/' });
    })
    .post(controller.createNewApp);  
}
