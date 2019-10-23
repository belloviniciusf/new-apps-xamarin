var express = require('express');
var multer  = require('multer')
var XLSX = require('xlsx');
var router = express.Router();

const upload = multer({dest: 'uploads/'});

router.get('/', function(req, res, next) {
  res.render('new', { title: 'Conversão de ponto eletrônico', doc: {}, action: '/' });
});

router.post('/', upload.single("file"),  function(req, res) {    
  let workbook = XLSX.readFile(req.file.path);
  let sheet = workbook.Sheets[workbook.SheetNames[2]];
  let json = XLSX.utils.sheet_to_json(sheet);
  console.log(json);
  let tempArray = [];
  let numberOfWork = json[0]['__EMPTY_12'].split('~');
  let initialDay = numberOfWork[0].replace('Date:', '');
  initialDay = initialDay.split('.')[2];
  let finalDay = numberOfWork[1].split('.')[2];

  let totalDays = Math.trunc(((parseInt(finalDay) - parseInt(initialDay))/2) + 7);   
  let end = totalDays;

  for (let index = 0; index < json.length; index+=totalDays) {    
    tempArray.push(json.slice(index, end));
    end += totalDays;    
  }    
  let currentYear = new Date().getFullYear().toString().split('20')[1];  
  let text = '';  

  tempArray.forEach((employee) => {
    let code = '';    
  
    for (let index = 0; index < employee.length; index++) {                
      if (index == 0) {
        let id = employee[index]['__EMPTY'].split('No:')[1];
        if (!id) {
          id = employee[index]['__EMPTY'].split('ID:')[1]
        }
        if (id.length==1) {
          id = `0${id}`
        }
        code += `${id}`;        
      }   
      if (index >= 3 && index<=17) {                  
        for (let y = 2; y < 6; y++) {
          let date1 = employee[index]['__EMPTY']
          if (date1) 
            date1 = date1.split('-');
          let value = employee[index][`__EMPTY_${y}`];
          if (date1 && value && value != ' ' && value != 'Holiday' && value != 'O resto')                        
            text += `ID:${code}${date1[1]}${date1[0]}${currentYear}${value.replace(':', '')}\r\n`;
        }      
        for (let z = 10; z < 14; z++) {
          let date2 = employee[index]['__EMPTY_8'];
          if (date2)
            date2 = date2.split('-');
          let value = employee[index][`__EMPTY_${z}`];
          if (date2 && value && value != ' ' && value != 'Holiday' && value != 'O resto')
            text += `ID:${code}${date2[1]}${date2[0]}${currentYear}${value.replace(':', '')}\r\n`;      
        }
      }    
    }      
  });  

  res.setHeader('Content-type', "application/octet-stream");

  res.setHeader('Content-disposition', 'attachment; filename=pontos.txt');

  res.send(text);
})

module.exports = router;
