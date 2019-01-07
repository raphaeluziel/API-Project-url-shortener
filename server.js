'use strict';

var express = require('express');
var mongo = require('mongodb');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');

var cors = require('cors');

const url = require('url');
const dns = require('dns');

var app = express();

// Basic Configuration 
var port = process.env.PORT || 3000;


/** this project needs a db !! **/ 
mongoose.connect(process.env.MONGO_URI, { useMongoClient: true });

// mongoose promise library
mongoose.Promise = global.Promise;

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({'extended': false}));

app.use('/public', express.static(process.cwd() + '/public'));

app.get('/', function(req, res){
  res.sendFile(process.cwd() + '/views/index.html');
});


var Schema = mongoose.Schema;

var urlSchema = new Schema({
  original: {type: String, required: true},
  short: {type: Number, unique: true}
});

var urlModel = mongoose.model('urlModel', urlSchema);

app.route('/api/shorturl/new').post(function(req, res){

  var checkHost = function(sentUrl){
    try {
      var sentUrlHost = sentUrl.host;
      checkDNS(sentUrlHost);
    }
    catch(error) {
      console.error('not a valid host');
      
      //res.json({"message": "not a valid host"});
    }
  };
  
  var checkDNS = function(sentUrlHost){
    try{
      dns.lookup(sentUrlHost, function(err, address, family){
        console.log("address: ", sentUrlHost,"ip: ", address, "type: ", family);
        if (address === null) {res.json({"message": "NO IP ADDRESS"})}
        else{console.log("ALL GOOD")}
      });
    }
    catch(error) {
      console.error('DNS lookup failed', error.code);
      res.json({"message": "website does not exist"});
    }
  };
  
  try {
    var sentUrl = new URL(req.body.url);
    checkHost(sentUrl);
  }
    catch(error) {
    console.error('not a valid url');
    //res.json({"message": "not a valid url"});
  }
    
  var query = urlModel.findOne({original: req.body.url});
  
  query.then(function(doc){
    
    if (!doc) {
      var findHighestIndex = urlModel.find({}).sort({short: -1}).limit(1);
      findHighestIndex.then(function(doc){
        if (!doc[0]) {
          var newUrl = new urlModel({original: req.body.url, short: 1});
          newUrl.save().then(function(doc){
            res.json({"original-url": req.body.url, "short-url": 1});
          });
        }
        else{
          var newUrl = new urlModel({original:req.body.url, short: doc[0].short + 1});
          newUrl.save().then(function(doc){
            res.json({"original-url": req.body.url, "short-url": doc.short});
          });
        }
        
      });
    }
    else{
      res.json({"original-url": doc.original, "short-url": doc.short});
    }
  });
});


app.route('/api/shorturl/new/:data_string?').get(function(req, res){
  
  var shortUrl = req.path.replace("/api/shorturl/new/", "");
  var query = urlModel.findOne({short: shortUrl});
  

  query.then(function(doc){

    if (!doc) {
      res.json({"message": "no url with this short url exists yet"});
    }
    else{
      res.redirect(doc.original);
    }

  });
  
});


app.listen(port, function () {
  console.log('Node.js listening ...');
});
