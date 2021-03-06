console.log("begin");

//requires
var request = require('request');
var jsdom = require('jsdom');
var snoowrap = require('snoowrap');
var fs = require('fs');
// process.env.UV_THREADPOOL_SIZE=16;

var snooConfig = JSON.parse(fs.readFileSync('config/snoowrap.json', 'utf8'));
var r = new snoowrap(snooConfig);

//url list
var urls = JSON.parse(fs.readFileSync('config/urls.json', 'utf8'));

//clock
var runtime = new Date().getTime();

//list urls
for(var n in urls){
	getPage(n, urls[n]);	
}

//get page
function getPage(name, url){
	request(url, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			console.log(name, response.statusCode);
			//console.log(body) // Show the HTML for the Google homepage. 
			checkLinks(getAnchorEl(body), name);
		}
		else console.log(error, response); //POST THIS TO PAGE
	});
	return;
}

//get links
function getAnchorEl(body){
	// console.log("getAnchorEl()");
	var jsdom = require("jsdom").jsdom;
	var document = jsdom(body, undefined);
	var window = document.defaultView;

	var linkArray = [];
	var a = document.querySelectorAll('a');
		a.forEach(function(el) {
			//console.log(el.textContent);
			if(el.href[0] == '/') el.href = document.domain + el.href;
			linkArray.push({
				href: el.href,
				class: el.className,
				text: el.textContent,
				target: el.target
			});
		}, this);
		window.close();
	return linkArray;
}
function checkLinks(linkArray, name){
	console.log(name, "checkLinks()", "runtime: ", (new Date().getTime() - runtime)/1000);


	// console.log(process._getActiveHandles());
	// console.log(process._getActiveRequests());

	// fs.readFile('json/'+name+'.json', 'utf8', function readFileCallback(err, data){
	// try {
	// 	var data = fs.readFileSync('json/'+name+'.json', 'utf8');
	// 	compareAndAdd(linkArray, JSON.parse(data).linkArray, name);
	// } catch (e) {
	// 	console.log(name+'.json', " is NEW .json", e);
	// 	compareAndAdd(linkArray, {linkArray: []}.linkArray, name);
	// }
	// return;


	var readSpeed = new Date().getTime();
	//too async for this world
	fs.readFile('json/'+name+'.json', 'utf8', function(err, data){
		if(err && err.errno != -4058) throw err;
		if(err && err.errno == -4058){
			//file DNE
			console.log(name+'.json', "is NEW .json");
			compareAndAdd(linkArray, {linkArray: []}.linkArray, name);
		}
		else{
			//file EXISTS
			console.log(name+'.json', "EXISTS");
			compareAndAdd(linkArray, JSON.parse(data).linkArray, name);
		}
		console.log("  readSpeed: ", (new Date().getTime() - readSpeed)/1000);
	});
	return;
}
function compareAndAdd(arrNew, arrOld, name){	
	console.log(name, "compareAndAdd()");
	// console.log("compareAndAdd()", name, arrNew, arrOld);
	if(!arrOld) var arrOld = [];
	if(!arrNew) var arrNew = [];
	
	//compare and remove dups
	var kill = 5;
	function hasDup(value) {
		for (var i = 0; i < arrOld.length; i++)		
			if(value.href == arrOld[i].href)
				if(value.text.length <= arrOld[i].text.length) return false;
		if(--kill > 0){
			arrOld.push(value);
			return true;
		}
		else return false;
	}
	// console.log(name, "arrOld.length: ", arrOld.length);
	var rArr = arrNew.filter(hasDup);
	// console.log(name, "arrOld.length: ", arrOld.length, rArr.length);

	console.log("  "+name, rArr.length, "new!");
	// postNewJobs(rArr);

	//update existing array;
	if(rArr.length > 0){
		fs.writeFile('json/'+name+'.json', JSON.stringify({linkArray: arrOld}), function (err) {
			if (err) return console.log(err);
			console.log("  "+name+'.json UPDATED');
			console.log("  runtime: ", (new Date().getTime() - runtime)/1000);
		});

		//write sync
		// console.log(fs.writeFileSync('json/'+name+'.json', JSON.stringify({linkArray: arrOld})));
	}
	else{
		console.log("  "+name, "no changes, nothing to update");
		console.log("  runtime: ", (new Date().getTime() - runtime)/1000);
	} 
	return;
}

//post to reddit:
function postNewJobs(arr){
	if(!arr) return;
	for (var i = 0; i < arr.length; i++)
		post(arr[i].title, arr[i].href);	
	return;
}
function post(title, url){
	console.log("letspost: ", title, url);
	r.getSubreddit('LawJobsSydney').submitLink({
		title: title,
		url: url
	});
	return;
}