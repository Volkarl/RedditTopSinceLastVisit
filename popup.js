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
	//var url = "data:text/html," + encodeURIComponent(html);
	//chrome.tabs.create({url: url, active: false});
	var w = window.open();
//	w.document.open().write(html);
	w.document.body.innerHTML = html;

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

function createHtml(pushshiftUrl, subreddit, toEpoch, fromEpoch) {
	htmlChildren = undefined;
	return createHtmlContent(pushshiftUrl).then(html => htmlChildren === undefined 
		? HtmlBody(HtmlPageTitle(subreddit) + HtmlTimeSpan(toEpoch, fromEpoch) + HtmlPostTitle("No results found"))
		: HtmlBody(HtmlPageTitle(subreddit) + HtmlTimeSpan(toEpoch, fromEpoch) + htmlChildren));
	// Analyse json and create HTML string with all images, pictures, videos, etc.
}



function createHtmlContent(pushshiftUrl) {
	const addToString = post => {

		console.log(post);

		var extension = post.img.substring(post.img.lastIndexOf('.') + 1, post.img.length).toString(); 
		/////////////// This works, but a good regex would be better, because it chops up gfycat links, etc. too

		var element;

		// Is it an image (or some gifs)?
		if(extension === "jpg" || extension === "png")
			element = HtmlImage(post.img);

		// Is it an imgur album?
		else if(post.img.includes("imgur.com/a")) {
			var regex = /imgur.com\/a\/(\w+)/i; ///////change to const?
			var albumId = regex.exec(post.img.toString())[1];
			console.log("Album: " + albumId);
			element = HtmlImgurAlbum(albumId);
		}

		// Is it a gfycat?
		else if(post.img.includes("gfycat"))
			element = HtmlGfycat(post.img);

		// Is it a Giphy?
		else if(post.domain.includes("giphy"))
			element = HtmlGiphy(post.img);

		// Is it a gif?
		else if(extension === "gif" || extension === "gifv" || extension === "mp4")
			element = HtmlMp4(post.img.toString().slice(0, - (extension.length)) + "mp4");

		// Is it a picture without extension?
		else if (post.domain.includes("imgur.com") || post.domain.includes("i.redd.it"))
			element = HtmlImageWithoutExtension(post.img);

		// Is it a youtube video?
		else if(post.domain.includes("youtube") || post.domain.includes("youtu.be"))
			element = HtmlYoutube(post.img);

		else if(post.domain.includes("pornhub"))
			element = HtmlPorhub(post.img);

		else if(post.domain.includes("redtube"))
			element = HtmlRedtube(post.img);



						//////////////////Fix
		// Is it a video?
//		else if (post.domain.includes("v.redd.it"))
//			element = HtmlImageWithoutExtension(post.img);


		else if(post.domain.includes("twitter"))
			element = HtmlTwitter(post.img);

		// Is it a dailymotion video?
		else if(post.domain.includes("dailymotion"))
			element = HtmlDailymotion(post.img);

		// Is it a self post?
		else if(post.is_self)
			element = HtmlSelfPost();

		// Is it none of the above?
		else 
			element = HtmlDiv(HtmlLink(post.img, "Unrecognized source url")); 
			///// I feel like post.img should be renamed



		var html = HtmlDiv(HtmlPostTitle(post.title) + HtmlLineBreak() + element + HtmlComments(post.comments, post.num_comments) + HtmlLineDivider());

		console.log(html);

		htmlChildren === undefined ? htmlChildren = html : htmlChildren += html;

	  	return post
	  }

//https://api.pushshift.io/reddit/submission/search/?subreddit=doujinshi&after=1532345148&before=1532355327&sort_type=num_comments&sort=desc&size=50
	return fetch('https://api.pushshift.io/reddit/submission/search/?subreddit=nsfw_gifs&after=1532345148&before=1532521236&sort_type=num_comments&sort=desc&size=50') //////Todo
	  .then(res => res.json())
	  .then(res => res.data)
	  .then(res => res.map(post => ({img: post.url, comments: post.full_link, num_comments: post.num_comments, domain: post.domain, title: post.title, is_self: post.is_self})))
	  .then(res => res.map(addToString));
//	  .then(res => console.log(res)); //cant have this, otherwise it returns shit
}

			
function HtmlBody(pageContent) {
	return `<html><body> ${pageContent} </body></html>`;
}

function HtmlImgurAlbum(albumId) {
	// The official way this is done, according to iframely.com:
	/*
		<blockquote class="imgur-embed-pub" lang="en" data-id="a/twP6C">
			<a href="https://imgur.com/a/twP6C">Hey Imgur want to see some magic? (OC)</a>
		</blockquote>
		<script async src="//s.imgur.com/min/embed.js" charset="utf-8"></script>
	*/
	// However, this does not work, because the script never runs, since I embed into an already created page
	// The result of the script is the following, and I simply inject the correct AlbumId's and chockingly, it works:
	return `<iframe class="imgur-embed-iframe-pub imgur-embed-iframe-pub-a-${albumId}-true-540" scrolling="no" src="https://imgur.com/a/${albumId}/embed?pub=true" id="imgur-embed-iframe-pub-a-${albumId}" style="height: 900px; width: 540px; margin: 10px 0px;"></iframe>`;
}

function HtmlTwitter(url) {
	return HtmlLink(url, "Twitter post");
}

function HtmlPageTitle(title) {
	return `<h1>${title}</h1>`;
}

function HtmlTimeSpan(toEpoch, fromEpoch) { 
	var from = new Date(fromEpoch * 1000); // Needs epoch milliseconds as input
	var to = new Date(toEpoch * 1000);
	return HtmlPostTitle(`Spans ${convertEpochToDays(fromEpoch)} days`) + HtmlLineBreak() + HtmlPostTitle(`${from.toString()} to ${to.toString()}`) + HtmlLineDivider();
}

function HtmlPostTitle(postTitle) {
	return `<b>${postTitle}</b>`; 
}

function HtmlLineBreak() {
	return `<br>`;
}

function HtmlLineDivider() {
	return `<hr>`;
}

function HtmlComments(threadUrl, num_comments) {
	return HtmlLink(threadUrl, num_comments + " comments");
}

function HtmlLink(url, text) {
	return `<p>
				<a href="${url}">${text}</a>
			</p>`;
}

function HtmlImage(imageUrl) {
	return HtmlDiv(`<a href="${imageUrl}">
						<img src="${imageUrl}"/>
					</a>`);
}

function HtmlMp4(imageUrl) {
	return HtmlDiv(
		`<video controls autoplay loop muted src="${imageUrl}"> 
			Your browser does not support the video tag. 
		</video>`);
	// In order for autoplay to work on multiple videos at once, they have to be muted
}

function HtmlDiv(content) {
	return `<div>
				${content}
			</div>`;
		//style="left: 0; width: 100%; height: 0; position: relative;" 
}

function HtmlMp4(imageUrl) {
	return HtmlDiv(
		`<video controls autoplay loop muted src="${imageUrl}"> 
			Your browser does not support the video tag. 
		</video>`);
	// In order for autoplay to work on multiple videos at once, they have to be muted
}

function HtmlGiphy(url) {
	const regex = /giphy\.com\/gifs\/(\w+)/i;
	return HtmlIFrame("Giphy", regex, "https://giphy.com/embed/", url, "");
	//////// Doesn't work with all kinds of Giphy links yet
}

function HtmlGfycat(url) {
// Other solution that doesn't fit entire screen
// So it probably has something to do with the div and inner width/height at 100%?
//			element = `<iframe src='${post.img}' frameborder='0' scrolling='no' allowfullscreen width='640' height='346'></iframe>`
	//return HtmlDiv(
	//`<iframe src='${url}' frameborder='0' scrolling='no' width='100%' height='100%' style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: relative;" allowfullscreen></iframe>`);
	///// The frame fits entire screen, while the gfycat only fits its size, so it looks a bit dumb

//	return `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 74.0247%;">
//				<iframe src="${url}" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" allowfullscreen scrolling="no"></iframe>
//			</div>`;

///////////////////// Make my iframes responsive? Absolute size, etc.?

	const regex = /gfycat\.com\/(?:gifs\/detail\/)?(\w+)/i; // gifs/detail/ is an optional non capture group
	//return `<div style="left: 0; width: 100%; position: relative;">
	//			${HtmlIFrame("Gfycat", regex, "https://gfycat.com/", url, "")}
	//		</div>`;
	return HtmlIFrame("Gfycat", regex, "https://gfycat.com/", url, "");
//Removed: padding-bottom: 74.0247%;
}

function HtmlDailymotion(url) {
	const regex = /dailymotion\.com\/video\/(\w+)/i;
	return HtmlIFrame("Dailymotion", regex, "https://www.dailymotion.com/embed/video/", url, "");
}

function HtmlYoutube(url) {
	const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i;
	//Turns: https://m.youtube.com/watch?v=hWLjYJ4BzvI&feature=youtu.be into hWLjYJ4BzvI, etc, see: https://stackoverflow.com/questions/6903823/regex-for-youtube-id

	return HtmlIFrame("Youtube", regex, "https://youtube.com/embed/", url, "");

/*	
To make the video fill entire screen, use: 

	return `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.2493%;">
				<iframe src="${"https://youtube.com/embed/" + videoId}" style="border: 0; top: 0; left: 0; width: 100%; height: 100%; position: absolute;" allowfullscreen scrolling="no"></iframe>
			</div>`;
*/
}

function HtmlPorhub(url) {
	const regex = /pornhub.com\/view_video\.php\?viewkey=(\w+)/i;
	return HtmlIFrame("Pornhub", regex, "https://www.pornhub.com/embed/", url, "");
}

///////////////Only works with .com THAT SHOULD BE FIXABLE WITH BETTER REGEX

function HtmlRedtube(url) {
	const regex = /redtube.com\/(\w+)/i;
	return HtmlIFrame("Redtube", regex, "https://embed.redtube.com/?id=", url, "");
}

function HtmlIFrame(hostName, regex, srcStart, url, srcEnd) {
	var result = regex.exec(url);
	if(result === null) return HtmlDiv(HtmlLink(url, `Invalid ${hostName} link`));
	var videoId = result[1];
	return HtmlResponsiveDiv(`<iframe src="${srcStart}${videoId}${srcEnd}" frameborder="0" scrolling="no" allowfullscreen style="width: 100%; height: 100%; position: absolute;"></iframe>`);
}

function HtmlResponsiveDiv(content) {
	return `<div style="left: 0; width: 100%; height: 0; position: relative; padding-bottom: 56.2493%;">${content}</div>`;
}

function HtmlSelfPost() {
	return ``;
	// Return nothing, because I don't know how to embed the contents of a self post (it's not in the JSON file)
}

function HtmlImageWithoutExtension(url) {
	return HtmlImage(url + ".jpg");
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

