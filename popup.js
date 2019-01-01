// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This software was made using the chrome extension "getting started" guide, using its software as a working foundation, then changing it to accommodate the intended functionality. 

'use strict';

var visitData; 		// Local copy of sync data
var nowEpoch;		// Shared epoch time at start of function execution
var htmlChildren; 	// Html layout of the inner part of the tab that opens when a button is clicked (contains pictures, gifs, comment hyperlinks, etc.)

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
// Example pushshift url for testing purposes: https://api.pushshift.io/reddit/submission/search/?subreddit=pics&after=1532345148&before=1532355327&sort_type=num_comments&sort=desc&size=50

function renderPage(pushshiftUrl, subreddit, toEpoch, fromEpoch){
	console.log("Creating tab " + pushshiftUrl);
	createHtml(pushshiftUrl, subreddit, toEpoch, fromEpoch).then(html => openHtmlAsNewTab(html));
	// Encode the pushshiftUrl json file into some html representation, then open as new tab
}

function openHtmlAsNewTab(html) {
//	console.log(html);
	console.log("Opening new tab");
	var url = "data:text/html," + encodeURIComponent(html);
	chrome.tabs.create({url: url, active: false});
	//var w = window.open(); NOW OBSOLETE SOMEHOW?
//	w.document.open().write(html);
	//w.document.body.innerHTML = html; NOW OBSOLETE SOMEHOW?

}

function syncToChrome(subreddit, visitEpoch) {
	chrome.storage.sync.set({ [subreddit]: visitEpoch}, function() {
		console.log("Saved visit: " + subreddit + " at " + visitEpoch)
	});
}

function getLastVisitEpochAndReplace(subreddit) {
	console.log(visitData);
	console.log("Called lastVisitEpoch with subreddit " + subreddit);

	var lastVisitEpoch = visitData[subreddit];
	if(lastVisitEpoch !== undefined) {	
		visitData[subreddit] = nowEpoch;
		console.log("Syncing data");
		syncToChrome(subreddit, nowEpoch);
	}
	return lastVisitEpoch;
}

function addButton(id, value, text, onclick) {
	// Adapted from: https://www.abeautifulsite.net/adding-and-removing-elements-on-the-fly-using-javascript
    var p = document.getElementById('subredditButtonFrame');
    var newElement = document.createElement('button');
    newElement.setAttribute('id', id);
    newElement.setAttribute('value', value);
    newElement.addEventListener('click', onclick);

	newElement.textContent = generateButtonText(value); ////////////////////////// PROBLEM: This may execute prior to storage.sync completing, so it may not update. Find better solution.
	///// I'm not sure that's important, since we use the local visitdata for this

    console.log("Adding button " + id);
    console.log(newElement);

    p.appendChild(newElement);
    p.appendChild(document.createElement('br')); // Line break
}

function convertEpochToDays(epoch) {
	return Math.round((nowEpoch - epoch) / 86400);
	// Amount of (24 hours) that can fit in the time difference
}

function getCurrentEpoch(){
	return Math.round(Date.now() / 1000.0); 
	// Date.now returns Epoch time in milliseconds, I convert to seconds
}

function generateButtonText(subreddit) {
	var days = convertEpochToDays(visitData[subreddit]);
	return subreddit + ": " + days + (days == 1 ? " day" : " days");
}

function populatePopup() {
	// Turn my associative array into an actual array that guarantees the order of objects, which means that I can sort through them
	var dayArray = [];
	for (var subreddit in visitData) 
		dayArray.push([subreddit, convertEpochToDays(visitData[subreddit])]);

	dayArray.sort(function(a, b) {
		var dayA = a[1];
		var dayB = b[1];
		return dayB - dayA; // Returns positive, negative or zero depending on whether they need to be swapped or not
	});
	// Sort subreddits by amount of days since last visit (descending)

	for (var i = 0; i < dayArray.length; i++) {
		var subreddit = dayArray[i][0];
		addButton('sBtn-' + subreddit, subreddit, generateButtonText(subreddit), function() {
			loadSubreddit(this.value);
			this.textContent = generateButtonText(this.value);
			document.getElementById("subredditButtonFrame").appendChild(this);
			// Makes the button change location to the back of the frame
		});
	}
	// Generate button for each subreddit
}

function loadSubreddit(subreddit) {
	console.log("Clicked " + subreddit);
	postCounter = 0;
	var lastVisitEpoch = getLastVisitEpochAndReplace(subreddit);
	var pushshiftUrl = getPushshiftUrl(subreddit, lastVisitEpoch);
	renderPage(pushshiftUrl, subreddit, nowEpoch, lastVisitEpoch);
}

function addNewSubreddit() {
	console.log("Add current tab to visitData");
	chrome.tabs.query({currentWindow: true, active: true}, function (tab) {
		var subreddit = getSubreddit(tab);
		var lastVisit = visitData[subreddit];
		if(lastVisit !== undefined)
			console.log("No prior visits");
			visitData[subreddit] = nowEpoch;
			syncToChrome(subreddit, nowEpoch);
	});
}

function removeSubreddit() {
	console.log("Clicked remove subreddit");
	var subreddit = prompt("Remove subreddit:");
	if(subreddit !== null) {
		console.log("Removing subreddit " + subreddit);
		delete visitData[subreddit];
		chrome.storage.sync.remove(subreddit, function() {
			console.log("Successfully removed subreddit");
		});
	}
	console.log("Removing subreddit: " + subreddit);
}

// Add event handlers
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById("btnAddNewSub").addEventListener("click", addNewSubreddit);
  document.getElementById("btnRemoveSub").addEventListener("click", removeSubreddit);
});

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

