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
}

function syncToChrome(subreddit, visitEpoch, reloadAfterSync) {
	if(reloadAfterSync) {
		chrome.storage.sync.set({ [subreddit]: visitEpoch}, function() {
			console.log("Saved visit: " + subreddit + " at " + visitEpoch)
			reloadPage();
		});
	}
	else {
		chrome.storage.sync.set({ [subreddit]: visitEpoch}, function() {
			console.log("Saved visit: " + subreddit + " at " + visitEpoch)
		});		
	}
}

function getLastVisitEpochAndReplace(subreddit, reloadAfterSync) {
	console.log(visitData);

	console.log("Called lastVisitEpoch with subreddit " + subreddit);

	var lastVisitEpoch = visitData[subreddit];
	if(lastVisitEpoch !== undefined) {	
		visitData[subreddit] = nowEpoch;
		console.log("Syncing data");
		syncToChrome(subreddit, nowEpoch, reloadAfterSync);
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

    console.log("Adding button " + id);
    console.log(newElement);

    p.appendChild(newElement);
    p.appendChild(document.createElement('br')); // Line break
    // Maybe I can find a way to do this inline in the html file's styles?
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
	for (var subreddit in visitData) {
		addButton('sBtn-' + subreddit, subreddit, generateButtonText(subreddit), function() {
			loadSubreddit(this.value);
		});
	}
}

function loadSubreddit(subreddit) {
	console.log("Clicked " + subreddit);
	var lastVisitEpoch = getLastVisitEpochAndReplace(subreddit, true);
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
			syncToChrome(subreddit, nowEpoch, true);
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
			reloadPage();
		});
	}
	console.log("Removing subreddit: " + subreddit);
}

function reloadPage() {
	//location.reload();
}
/////////////////// I'm still not a fan of this. It works, but it feels like a nuclear option, and also it clears the console whenever everything is reloaded.

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

function createHtml(pushshiftUrl, subreddit, fromEpoch, toEpoch) {
	htmlChildren = undefined;
	return createHtmlContent(pushshiftUrl).then(html => htmlChildren === undefined 
		? HtmlBody(HtmlPageTitle(subreddit) + HtmlTimeSpan(fromEpoch, toEpoch) + HtmlPostTitle("No results found"))
		: HtmlBody(HtmlPageTitle(subreddit) + HtmlTimeSpan(fromEpoch, toEpoch) + htmlChildren));
	// Analyse json and create HTML string with all images, pictures, videos, etc.
}

function createHtmlContent(pushshiftUrl) {
	const addToString = post => {

		console.log(post);

		var extension = post.img.substring(post.img.lastIndexOf('.') + 1, post.img.length).toString(); 
		/////////////// THis works, but a good regex would be better, because it chops up gfycat links, etc. too

		var element;


		// Is it an image (or some gifs)?
		if(extension === "jpg" || extension === "png")
			element = HtmlImage(post.img);

		// Is it an imgur album?
		else if(post.img.includes("imgur.com/a"))
			element = `<blockquote><a href="${post.img}">Album</a></blockquote>`;
			//<script async src="http://s.imgur.com/min/embed.js"></script>
			///////////////Doesnt work yet

		// Is it a gfycat?


		// Is it a gif?
		else if(extension === "gif" || extension === "gifv" || extension === "mp4")
			element = HtmlMp4(post.img.toString().slice(0, - (extension.length)) + "mp4");

		// Is it a picture without extension?
		else if (post.domain.includes("imgur.com") || post.domain.includes("i.redd.it"))
			element = HtmlImageWithoutExtension(post.img);





/*

		// Is it an image (or some gifs)?
		if(post.img.endsWith(".jpg") || post.img.endsWith(".png"))
			element = HtmlImage(post.img);

		// Is it an imgur album?
		else if(post.img.includes("imgur.com/a"))
			element = `<blockquote><a href="${post.img}">Album</a></blockquote>`;
			//<script async src="http://s.imgur.com/min/embed.js"></script>

		// Is it a gif?
		else if(post.img.endsWith(".gif") || post.img.endsWith(".gifv") || post.img.endsWith(".mp4"))
			element = HtmlMp4(post.img);

		// Is it a picture without extension?
		else if (post.domain.includes("imgur.com") || post.domain.includes("i.redd.it"))
			element = HtmlImageWithoutExtension(post.img);
*/

		//PLEASE, do not use the .gif ending. Use the .gifv ending instead! While imgur will serve the image regardless of the extension, you must use .gifv to force the web video.
		// If it doesn't autoplay, then change gif to gifv?
		// What about .mp4?
		// If mp4 gifs work, I should just change all shortcuts to mp4 because it loads faster


		// Is it a video?
//		else if (post.domain.includes("v.redd.it"))
//			element = HtmlImageWithoutExtension(post.img);

		var html = HtmlPostTitle(post.title) + element + HtmlComments(post.comments, post.num_comments) + HtmlLineBreak();

		htmlChildren === undefined ? htmlChildren = html : htmlChildren += html;

	  	return post
	  }

//https://api.pushshift.io/reddit/submission/search/?subreddit=doujinshi&after=1532345148&before=1532355327&sort_type=num_comments&sort=desc&size=50
	return fetch('https://api.pushshift.io/reddit/submission/search/?subreddit=gifs&after=1532345148&before=1532521236&sort_type=num_comments&sort=desc&size=50') //////Todo
	  .then(res => res.json())
	  .then(res => res.data)
	  .then(res => res.map(post => ({img: post.url, comments: post.full_link, num_comments: post.num_comments, domain: post.domain, title: post.title, is_self: post.is_self})))
	  .then(res => res.map(addToString));
//	  .then(res => console.log(res)); //cant have this, otherwise it returns shit
}


function HtmlBody(pageContent) {
	return `<html><body> ${pageContent} </body></html>`;
}

function HtmlPageTitle(title) {
	return `<h1>${title}</h1>`;
}

function HtmlTimeSpan(fromEpoch, toEpoch) { /////fix
	return "";
}

function HtmlPostTitle(postTitle) {
	return `<b>${postTitle}</b>`; 
}


function HtmlNewLine() {
	return `
			`;
}

function HtmlLineBreak() {
	return HtmlNewLine() + 
		`<hr>`;
}

function HtmlComments(threadUrl, num_comments) {
	return HtmlNewLine() + 
		`<p>
			<a href="${threadUrl}">${num_comments} comments</a>
		</p>`;
}

function HtmlImage(imageUrl) {
	return HtmlNewLine() + 
		`<div>
			<a href="${imageUrl}">
				<img src="${imageUrl}"/>
			</a>
		</div>`;
}

function HtmlMp4(imageUrl) {
	return HtmlNewLine() + HtmlDiv(
		`<video controls autoplay loop muted src="${imageUrl}"> 
			Your browser does not support the video tag. 
		</video>`);
}
/*
IMGUR EMBED GIFS??

	<blockquote class="imgur-embed-pub" lang="en" data-id="91S22q6" data-context="false">
		<a href="//imgur.com/91S22q6">View post on imgur.com</a>
	</blockquote>
    <script async src="//s.imgur.com/min/embed.js" charset="utf-8"></script>
*/

function HtmlDiv(content) {
	return HtmlNewLine() + 
		`<div>
			${content}
		</div>`;
}

function HtmlGfycat() {
	return HtmlNewLine() + 
		`<div>

		</div>`;
}

function HtmlYoutube() {
	return HtmlNewLine() + 
		`<div>
			<a href="${imageUrl}">
				<img src="${imageUrl}"/>
			</a>
		</div>`;
}

function HtmlSelfPost() {
	return HtmlNewLine() + 
		`<div>
			<a href="${imageUrl}">
				<img src="${imageUrl}"/>
			</a>
		</div>`;
}

function HtmlImageWithoutExtension(url) {
	return HtmlImage(url + ".jpg");
}

function HtmlRedIt() {
	return HtmlNewLine() + 
		`<div>
			<a href="${imageUrl}">
				<img src="${imageUrl}"/>
			</a>
		</div>`;
}

function HtmlOtherVideo() {
	return HtmlNewLine() + 
		`<div>
			<a href="${imageUrl}">
				<img src="${imageUrl}"/>
			</a>
		</div>`;
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

