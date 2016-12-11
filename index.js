var fs = require('fs')
var Twit = require('twit')
var async = require("async");


var T = new Twit({
  consumer_key:         '...',
  consumer_secret:      '...',
  access_token:         '...',
  access_token_secret:  '...',
  timeout_ms:           60*1000,  // optional HTTP request timeout to apply to all requests.
})

var timeStamp = getCurrentUnixTimeStamp();
var tweetsCsv = fs.createWriteStream('../' + timeStamp + '_tweets.csv');
tweetsCsv.write("id,text,displayUrl\n");

startProcess(process.cwd());

function startProcess(dirname) {
  fs.readdir(dirname, function(err, filenames) {
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

  	var counter = 0;
  	async.mapSeries(images, function iteratee(image, callback) {
  		var imageName = imageNames[counter];
  		console.log('[' + (counter+1) + '/' + images.length + '] - ' + image + ' - ' + imageName);
  		counter ++;
  		var id = imageName;
  		var tweetText = "This is " + imageName;
  		var altText = "Image:" + imageName;
  		tweetImage(id, tweetText, image, altText, callback)
	});
   });
 }

function tweetImage(id, text, pathToImage, alternativeText, callback){
	var b64content = fs.readFileSync(pathToImage, { encoding: 'base64' })
	//console.log('   Tweeting');
	T.post('media/upload', { media_data: b64content }, function (err, data, response) {
	  var mediaIdStr = data.media_id_string
	  var meta_params = { media_id: mediaIdStr, alt_text: { text: alternativeText } }

	  T.post('media/metadata/create', meta_params, function (err, data, response) {
	    if (!err) {
	      var params = { status: text, media_ids: [mediaIdStr] }
	      T.post('statuses/update', params, function (err, data, response) {
	        //console.log(JSON.stringify(data))
	        //console.log('   Tweeted');

	        var displayUrl = data.entities.media[0].display_url
	        tweetsCsv.write('"' + id + '","' + text + '","' + displayUrl + '"\n');
	        callback();
	      })
	    }else{
	    	console.log(err);
	    }
	    
	  })
	})
}

function getCurrentUnixTimeStamp(){
    return Math.floor(new Date() / 1000)
}
