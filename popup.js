// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This software was made using the chrome extension "getting started" guide, using its software as a working foundation, then changing it to accommodate the intended functionality. 

'use strict';

var visitData;
var nowEpoch;

function getSubreddit(tab){
	var regex = /reddit.com\/r\/(\w+)/gim;
	var subreddit = regex.exec(tab[0].url)[1]; // Matches string, then returns only the first capture group (\w+) 
	console.log("Matched subreddit " + subreddit);
	return subreddit;
}

function getPushshiftUrl(subreddit, lastVisitEpoch){
	var searchParams = "subreddit=" + subreddit + "&after=" + lastVisitEpoch + "&before=" + nowEpoch + "&sort_type=num_comments&sort=desc&size=50";
	return "https://api.pushshift.io/reddit/submission/search/?" + searchParams;
}

function renderPage(pushshiftUrl){
	console.log("Creating tab " + pushshiftUrl);
	chrome.tabs.create({url: pushshiftUrl, active: false});
}

function getLastVisitEpochAndReplace(subreddit) {
	console.log(visitData);

	var lastVisitEpoch = visitData[subreddit];
	// If there was no prior visit, undefined is returned
	visitData[subreddit] = nowEpoch;
	console.log("Syncing data");
	chrome.storage.sync.set({ [subreddit]: nowEpoch}, function() {console.log("Saved visit: " + subreddit + " at " + nowEpoch)}); // WHAT IF IT TIMES OUT? 
	return lastVisitEpoch;
}

function addButton(id, text, onclick) {
	// Adapted from: https://www.abeautifulsite.net/adding-and-removing-elements-on-the-fly-using-javascript
    var p = document.getElementById('subredditButtonFrame');
    var newElement = document.createElement('button');
    newElement.setAttribute('id', id);
    newElement.setAttribute('onclick', onclick);
    newElement.addEventListener('click', onclick);
    newElement.textContent = text;

    console.log("Adding button");
    console.log(newElement);

    p.appendChild(newElement);    
}

function convertEpochToDays(epoch) {
	return Math.round((nowEpoch - epoch) / 86400);
	// Amount of (24 hours) that can fit in the time difference
}

function getCurrentEpoch(){
	return Math.round(Date.now() / 1000.0); 
	// Date.now returns Epoch time in milliseconds, I convert to seconds
}

function populatePopup() {
	for (var subreddit in visitData) {
		// Make percentage instead of pixels TODO ////////////////////////
		var days = convertEpochToDays(visitData[subreddit]);
		var text = subreddit + ": " + days + (days == 1 ? " day" : " days"); 
		// var buttonHtml = '<div "class="button" onclick="javascript:loadSubreddit(' + subreddit + ');>' + text + '</div> ';
		// var buttonHtml = '<button onclick="javascript:loadSubreddit(' + subreddit + ');>' + text + '</button> ';
		// style="width:60px;height:100px;" 
		// id="sBtn-' + subreddit + '" 
		addButton('sBtn-' + subreddit, text, function() {loadSubreddit(subreddit)});
		// "loadSubreddit(" + subreddit + ")"
		//javascript:loadSubreddit
	}
        //     '<a href="" onclick="javascript:loadSubreddit(subreddit, visitData[subreddit]);">'
}

function loadSubreddit(subreddit) {
	console.log("Clicked " + subreddit);
	var lastVisitEpoch = getLastVisitEpochAndReplace(subreddit);
	var pushshiftUrl = getPushshiftUrl(subreddit, lastVisitEpoch);
	renderPage(pushshiftUrl);
}

function addSubreddit() {
	console.log("Add current tab to visitData");
	chrome.tabs.query({currentWindow: true, active: true}, function (tab) {
		var subreddit = getSubreddit(tab);
		var lastVisitEpoch = getLastVisitEpochAndReplace(subreddit);
		if(lastVisitEpoch === undefined) {
			console.log("No prior visit to subreddit " + subreddit);
		}
	});
}

document.body.onload = function() {
	nowEpoch = getCurrentEpoch(); 

	console.log("Loading data");
	chrome.storage.sync.get(null, function(result) {
		if (chrome.runtime.error) {
			console.log("Error loading data"); ////////////////////////// Give error message? Allow option for retrying?
		}
		else if (result === undefined) {
			console.log("Undefined");
			visitData = {};
		}
		else {
			console.log(result);
			visitData = result;
		}

		populatePopup();
	});
}

/*

mainWindow.onclick = function(element) {
	console.log("Clicked!");
	chrome.tabs.query({currentWindow: true, active: true}, function (tab) {
		var subreddit = getSubreddit(tab);
		var lastVisitEpoch = getLastVisitEpochAndReplace(subreddit, nowEpoch);
		if(lastVisitEpoch === undefined) {
			console.log("No prior visit to subreddit " + subreddit);
			return;
		}
		var pushshiftUrl = getPushshiftUrl(subreddit, lastVisitEpoch, nowEpoch);
		renderPage(tab, pushshiftUrl);
	});
};

*/


/* Function: fetchJsonPictures && renderPage
// ----------------------------------------------------------------------------------
// Test with jsfiddle.net

// HTML
// <div id="app"></div>

// Displays all images from the json file it fetches below each other
// I can use this to display pictures in their original quality below each other, with links to the reddit thread in between (havent added this yet)
// What I still lack is the ability to display gifs (it kind of works, but breaks easily), gfycat and videos (? do I want this?)


fetch('https://api.pushshift.io/reddit/submission/search/?subreddit=pics&after=1531526400&before=1531725505&sort_type=num_comments&sort=desc&size=50')
  .then(res => res.json())
  .then(res => res.data)
  .then(res => res.map(post => ({
    img: post.url})))
	.then(res => res.map(render))
	.then(res => console.log(res))

const app = document.querySelector('#app');

const render = post => {
	const node = document.createElement('div');
	node.innerHTML = `
      <a href="${post.img}">
        <img src="${post.img}"/>
      </a>`;
	app.appendChild(node);
  return post
}

// ----------------------------------------------------------------------------------
*/




//////////////////////////////////// Search URL selection
// ----------------------------------------------------------------------------------

/* NOTE: I'm sorting by number of comments because score of the post doesn't work, and those two are often similar. 
It seems as if pusshift (elasticsearch?) and reddit scores mean differing things?? As soon as I put before and after parameters there, score sorting stops working.  
It's weird though, because with elasaticsearch.pushshift.io you can sort by score, although it does need a day (?) to get the updated upvote score
This does mean that I have two choices, either I use api.pushshift and sort for num_comments or I use elasticsearch.pushshift and try to work with it.
Or I go through all of my results, get the real score from the reddit api and then sort by score.
*/

// Elasticsearch.pushshift:
// var searchParams = "https://elasticsearch.pushshift.io/?q=(subreddit:" + subreddit + " AND created_utc:>" + lastVisit + " AND created_utc:<" + now + ")&sort=score:desc&size=1000";
// https://elasticsearch.pushshift.io/?
// STATUS:
// I can't seem to get this to work how I want it at all. It appears to return weird results regardless of what I do. 


// Api.pushshift:
// var searchParams = "subreddit=" + subreddit + "&after=" + lastVisit + "&before=" + now + "&sort_type=num_comments&sort=desc&size=50";
// https://api.pushshift.io/reddit/submission/search/?


// ----------------------------------------------------------------------------------
// https://elasticsearch.pushshift.io/?
// https://elastic.pushshift.io/rs/submissions/_search/?
// var searchParams = "q=(subreddit:" + subreddit + " AND created_utc:>" + lastVisit + " AND created_utc:<" + now + ")&sort=score:desc&size=50";

// https://api.pushshift.io/reddit/submission/search/?
// var searchParams = "after=" + lastVisit + "&before=" + now + "&sort_type=score&sort=desc";
// ----------------------------------------------------------------------------------

