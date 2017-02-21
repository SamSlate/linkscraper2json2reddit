console.log("LOG: "+new Date());

//option to post to reddit 'r'?yes:no
console.log("post to reddit", process.argv[2] == 'r');

//requires
var jsdom = require('jsdom');
var snoowrap = require('snoowrap');
var fs = require('fs');
var hash = require("string-hash");
// process.env.UV_THREADPOOL_SIZE=16;

const snooConfig = JSON.parse(fs.readFileSync('config/snoowrap.json', 'utf8'));
var r = new snoowrap(snooConfig);

//url list
var urls = JSON.parse(fs.readFileSync('config/urls.json', 'utf8'));

//clock
var runtime = new Date().getTime();

//
var redditPostArray = [];
var count = Object.keys(urls).length;
var log = "LOG: "+new Date();

//list urls
var i = 0;
for(var n in urls){
	// if(n == "Mills Oakley") getJson(n, urls[n]);	
	// getJson(n, urls[n]);
	sleep(500*i++).then((() => {
		getJson(n, urls[n]);	
	})(i));
}
//sleep
function sleep (time) {
	return new Promise((resolve) => setTimeout(resolve, time));
}
//get json files
function getJson(name, url){
	console.log(name, "getJson()", "runtime: ", (new Date().getTime() - runtime)/1000);

	var readSpeed = new Date().getTime();
	//too async for this world
	fs.readFile('json/'+name+'.json', 'utf8', function(err, data){
		if(err && err.errno != -4058){
			//unknown error
			console.log(name, err);
			throw err;
			getPage({name: name, url: url, hash: null, linkArray: []});
		}
		if(err && err.errno == -4058){
			//file DNE
			console.log(name+'.json is NEW .json');
			getPage({name: name, url: url, hash: null, linkArray: []});
		}
		else{
			//file EXISTS
			console.log(name+'.json EXISTS');
			// getPage(url, JSON.parse(data).linkArray, name, JSON.parse(data).hash);
			getPage(JSON.parse(data));
		}
		console.log("  readSpeed: ", (new Date().getTime() - readSpeed)/1000);
	});
	return;
}
//get page	
function getPage(jsonObj){
    var readSpeed = new Date().getTime();
	var config = {
		url: jsonObj.url,
		done: function (err, window) {
			var jsonNew = Object.assign({}, jsonObj);
				jsonNew.linkArray = [];
			if (err) { //error
				console.log(err);
				console.log("  requestSpeed: ", (new Date().getTime() - readSpeed)/1000);
				compare(jsonNew, jsonObj);
				return;
			}			
			var newHash = hash(this.html);
				jsonNew.hash = newHash;				
			console.log(jsonObj.name, "\n  hash: ", newHash, jsonObj.hash, jsonObj.hash==newHash);
			console.log("  requestSpeed: ", (new Date().getTime() - readSpeed)/1000);

			var linkArray = [];
			var a = window.document.querySelectorAll('a');
				a.forEach(function(el) {
					linkArray.push({
						href: el.href,
						class: el.className,
						text: el.textContent.replace(/[^a-z&A-Z0-9 -]/g," ").replace(/\s\s+/g, ' '),
						target: el.target
					});
				}, this);
			jsonNew.linkArray = linkArray;	
			window.close();
			compare(jsonNew, jsonObj);
		}
	};
	jsdom.env(config); //go
}
//compare links
function compare(jsonNew, jsonOld){
	if(!jsonOld.linkArray) console.log(jsonOld.name, "no old array!");

	//compare and remove dups
	// var kill = 11;
	function hasDup(value) {
		// for (var i = 0; i < jsonOld.linkArray.length; i++)	
		// 	if(value.href == jsonOld.linkArray[i].href)
		// 		if(value.text.length <= jsonOld.linkArray[i].text.length) return false;
		for (var i = 0; i < jsonOld.linkArray.length; i++){			
			if(value.href == jsonOld.linkArray[i].href)
				if(value.text.length <= jsonOld.linkArray[i].text.length) return false;
			if(value.text == jsonOld.linkArray[i].text) return false;			
		}
		// if(--kill > 0){
		jsonOld.linkArray.push(value);
		redditPostArray.push({
			name: jsonOld.name,
			value: value
		});
		return true; 
		// } else return false;
	}

	var rArr = jsonNew.linkArray.filter(hasDup);
	console.log(jsonOld.name, "compare()\n  ", jsonNew.linkArray.length, "links found, ", rArr.length, "new! (", jsonOld.linkArray.length, "total )");
	
	//update existing array;
	if(rArr.length > 0){
		jsonOld.hash = jsonNew.hash; //new content => new hash
		var readSpeed = new Date().getTime();
		fs.writeFileSync('json/'+jsonOld.name+'.json', JSON.stringify(jsonOld));
			console.log(jsonOld.name+'.json UPDATED\n  writeSpeed: ', (new Date().getTime() - readSpeed)/1000,"\n  runtime: ", (new Date().getTime() - runtime)/1000);
			// log += jsonOld.name+'.json UPDATED\n  writeSpeed: '+(new Date().getTime() - readSpeed)/1000+"\n  runtime: "+(new Date().getTime() - runtime)/1000;
	}
	else{
		console.log(jsonOld.name, "no changes, nothing to update");
		console.log("  runtime: ", (new Date().getTime() - runtime)/1000);
		// log += jsonOld.name + "no changes, nothing to update\n  runtime: "+(new Date().getTime() - runtime)/1000;
	}
	count--;
	console.log(count+" open calls, "+redditPostArray.length+" new posts");
	if(count==0){ //post array to reddit
		postNewJobs(redditPostArray);
	}
	return;
}
//post to reddit:
function postNewJobs(arr){
	if(!arr) return;   
    var r = new snoowrap(snooConfig);
	for (var i = 0; i < arr.length; i++){
		var name = arr[i].name;
		var title = "["+name+"] "+arr[i].value.text;
		var url = arr[i].value.href;

		if(title == undefined || (title.length-name.length) < 5 || !(url[0] == 'h' || url[0] == 'w')){
            console.log("post rejected: ", title, url);
        }
		else{
            console.log("letspost: ["+title+"]("+url+")");
			// log += "\nletspost: ["+title+"]("+url+")";
			
			if(process.argv[2] == 'r'){
				console.log(process.argv[2]);
				r.getSubreddit('LawJobsSydney').submitLink({
					title: title,
					url: url
				});
			}
		}
    }
	console.log("runtime: ", (new Date().getTime() - runtime)/1000);
	// log += "\n\n***************************\n\n"
	// console.log(log);
	// console.log("runtime: ", (new Date().getTime() - runtime)/1000);
	// process.exit(); //can't quite before upload
	return;
}