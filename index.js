var fs = require('fs')
var Twit = require('twit')
var path = require('path')
var argv = require('minimist')(process.argv.slice(2));
var async = require("async");
var naturalSort = require('node-natural-sort')
var credentials = require('./credentials.js');


var T = new Twit({
  consumer_key:         credentials.twitter.consumer_key,
  consumer_secret:      credentials.twitter.consumer_secret,
  access_token:         credentials.twitter.access_token,
  access_token_secret:  credentials.twitter.access_token_secret
})

var timeStamp = getCurrentUnixTimeStamp();
var fileName = timeStamp + '_tweets.csv';
var tweetsCsv;
var timingHelper;

var tweetsPerDay = 2400;
var millisecondsPerDay = 24*60*60*1000;
var waitBetweenTweets = millisecondsPerDay / tweetsPerDay
console.log(waitBetweenTweets);

init();

function init(){
  if (argv.images) {
    tweetsCsv = fs.createWriteStream( path.join(argv.images, '..', fileName) );
    tweetsCsv.write("id,text,displayUrl\n");
    startProcess(argv.images);
  }else{
    printInstructions();
  }
}

function printInstructions(){
  console.log("Run like 'node index.js --images /path/to/data'")
}

function startProcess(dirname) {
  fs.readdir(dirname, function(err, filenames) {
    filenames = filenames.sort(naturalSort())
    var images = [];
    var imageNames = [];
    for (var i = 0; i < filenames.length; i++) {
      var fileName = filenames[i];
      //ignore invisible files
      if (fileName.charAt(0) != ".") {
        images.push(dirname + "/" + fileName);
        //remove file ending
        var splits = fileName.split(".");
        splits.pop();
        var imageSplit = splits.join(".");
        imageNames.push(imageSplit);
      }
    };

    iterateOverImages(images, imageNames);    
   });
 }

 function iterateOverImages(images, imageNames){
  var counter = 0;
    async.mapSeries(images, function iteratee(image, callback) {
      var imageName = imageNames[counter];
      console.log('[' + (counter+1) + '/' + images.length + '] - ' + image + ' - ' + imageName);
      counter ++;
      var id = imageName;
      var tweetText = "This is #" + imageName;
      var altText = "Image:" + imageName;

      resetTimer();
      console.log('    Tweeting')
      tweetImage(id, tweetText, image, altText, callback, 0)
  });
 }

function resetTimer(){
  timingHelper = process.hrtime();
}

function getElapsedTime(){
  var diff = process.hrtime(timingHelper);
  var nanoseconds = diff[0] * 1e9 + diff[1];
  return Math.ceil( nanoseconds / 1000000 );
}

function tweetImage(id, text, pathToImage, alternativeText, callback, tries){
  var maximumTries = 3;
  var tryAgainIn = 1000;
  var b64content = fs.readFileSync(pathToImage, { encoding: 'base64' })

  if (tries < maximumTries) {

  T.post('media/upload', { media_data: b64content }, function (err, data, response) {
    var mediaIdStr = data.media_id_string
    var meta_params = { media_id: mediaIdStr, alt_text: { text: alternativeText } }

    T.post('media/metadata/create', meta_params, function (err, data, response) {
      if (!err) {
        var params = { status: text, media_ids: [mediaIdStr] }
        T.post('statuses/update', params, function (err, data, response) {
          var displayUrl = data.entities.media[0].display_url
          tweetsCsv.write('"' + id + '","' + text + '","' + displayUrl + '"\n');
          var elapsedTime = getElapsedTime();
          var wait = Math.max(0, waitBetweenTweets - elapsedTime)

          console.log('    Tweeted after ' + elapsedTime + 'ms');
          console.log('    Next tweet in ' + wait + 'ms');
          setTimeout(function(){ 
            callback();
          }, wait);
        })
      }else{
        console.log('Error occured, trying again in ' + tryAgainIn + 'ms', err);
        setTimeout(function(){ 
          tweetImage(id, text, pathToImage, alternativeText, callback, tries + 1)
        }, tryAgainIn);
      }
    })
  })
  }else{
    tweetsCsv.write('"' + id + '","' + text + '","tweetFailed"\n');
    callback();
  }
}

function getCurrentUnixTimeStamp(){
    return Math.floor(new Date() / 1000)
}