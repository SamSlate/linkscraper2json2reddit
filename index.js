console.log("begin");

//requires
var request = require('request');
var jsdom = require('jsdom');
var snoowrap = require('snoowrap');
var fs = require('fs');
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

//list urls
for(var n in urls){
	// if(n == "Mills Oakley") getJson(n, urls[n]);	
	getJson(n, urls[n]);	
}

function getJson(name, url){
	console.log(name, "getJson()", "runtime: ", (new Date().getTime() - runtime)/1000);

	var readSpeed = new Date().getTime();
	//too async for this world
	fs.readFile('json/'+name+'.json', 'utf8', function(err, data){
		if(err && err.errno != -4058){
			throw err;
		}
		if(err && err.errno == -4058){
			//file DNE
			console.log(name+'.json', "is NEW .json");
			getPage(url, {linkArray: []}.linkArray, name);
		}
		else{
			//file EXISTS
			console.log(name+'.json', "EXISTS");
			getPage(url, JSON.parse(data).linkArray, name);
		}
		console.log("  readSpeed: ", (new Date().getTime() - readSpeed)/1000);
	});
	return;
}
//pull domain
function extractDomain(url) {
    var domain;
    //find & remove protocol (http, ftp, etc.) and get domain
    if (url.indexOf("://") > -1) domain = url.split('/')[2];
    else domain = url.split('/')[0];
	//find & remove port number
    domain = domain.split(':')[0];
	domain = (url[4]=='s')?"https://":"http://"+domain;
    return domain;
}
//get page	
function getPage(url, arrOld, name){
    var readSpeed = new Date().getTime();
	request(url, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			console.log(name, response.statusCode);
            console.log("  requestSpeed: ", (new Date().getTime() - readSpeed)/1000);
			//console.log(body) // Show the HTML for the Google homepage.
			compare(name, getAnchorEl(body, url), arrOld);
		}
		else console.log(name, error, response); //POST THIS TO PAGE
	});
    return;
}
//get links
function getAnchorEl(body, url){
	// console.log("getAnchorEl()");
	var jsdom = require("jsdom").jsdom;
	var document = jsdom(body, undefined);
	var window = document.defaultView;

	var linkArray = [];
	var a = document.querySelectorAll('a');
		a.forEach(function(el) {
			//console.log(el.textContent);
			if(el.href[0] == '/') el.href = extractDomain(url) + el.href;
			linkArray.push({
				href: el.href,
				class: el.className,
				text: el.textContent.replace(/[^a-zA-Z0-9 -]/g," ").replace(/\s\s+/g, ' '),
				target: el.target
			});
		}, this);
		window.close();
	return linkArray;
}
//compare links
function compare(name, arrNew, arrOld){
	
	if(!arrOld) console.log(name, "no old array!");
	if(!arrOld) var arrOld = [];
	if(!arrNew) var arrNew = [];
		

	//compare and remove dups
	var kill = 9;
	function hasDup(value) {
		for (var i = 0; i < arrOld.length; i++)		
			if(value.href == arrOld[i].href)
				if(value.text.length <= arrOld[i].text.length) return false;
		if(--kill > 0){
			arrOld.push(value);
			redditPostArray.push({
				name: name,
				value: value
			});
			return true;
		}
		else return false;
	}

	var rArr = arrNew.filter(hasDup);
	console.log(name, "compare()\n  ", arrNew.length, "links found, ", rArr.length, "new! (", arrOld.length, "total )");
	
	//update existing array;
	if(rArr.length > 0){
		var readSpeed = new Date().getTime();   
		fs.writeFileSync('json/'+name+'.json', JSON.stringify({linkArray: arrOld}));
			console.log(name+'.json UPDATED\n  writeSpeed: ', (new Date().getTime() - readSpeed)/1000,"\n  runtime: ", (new Date().getTime() - runtime)/1000);
	}
	else{
		console.log(name, "no changes, nothing to update");
		console.log("  runtime: ", (new Date().getTime() - runtime)/1000);
	}
	console.log(count+" open calls, "+redditPostArray.length+" new posts");

	count--;
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
			console.log("letspost: ", title, url);
			// r.getSubreddit('LawJobsSydney').submitLink({
			//     title: title,
			//     url: url
			// });
		}
    }
	console.log("runtime: ", (new Date().getTime() - runtime)/1000);
	return;
}