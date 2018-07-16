// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

function getSubreddit(tab){
	var regex = /reddit.com\/r\/(\w+)/gim;
	var subreddit = regex.exec(tab[0].url)[1]; // Matches string, then returns only the first capture group (\w+) 
	return subreddit;
}

function getPushshiftUrl(subreddit, lastVisitEpoch, nowEpoch){
	var searchParams = "subreddit=" + subreddit + "&after=" + lastVisitEpoch + "&before=" + nowEpoch + "&sort_type=num_comments&sort=desc&size=50";
	return "https://api.pushshift.io/reddit/submission/search/?" + searchParams;
}

function renderPage(tab, pushshiftUrl){
	chrome.tabs.update(tab.id, {url: pushshiftUrl});
}




// Old: cannibalise this and use storage sync, then delete
let changeColor = document.getElementById('changeColor');

chrome.storage.sync.get('color', function(data) {
	changeColor.style.backgroundColor = data.color;
	changeColor.setAttribute('value', data.color);
});
// Old




// My class for saving data
function subredditVisit(subreddit, visitEpoch) {
    this.subreddit = subreddit;
    this.visit = visitEpoch;
} 

changeColor.onclick = function(element) {
	var lastVisitEpoch = 1531526400; //   Friday, June 15, 2018 7:35:50 PM GMT //PLACEHOLDER
	var nowEpoch = Math.round(Date.now() / 1000.0); // Returns Epoch time in milliseconds, I convert to seconds

	chrome.tabs.query({currentWindow: true, active: true}, function (tab) {
		var subreddit = getSubreddit(tab);
		var pushshiftUrl = getPushshiftUrl(subreddit, lastVisitEpoch, nowEpoch);
		renderPage(tab, pushshiftUrl);
	});
};




/* Function: fetchJsonPictures && renderPage
// ----------------------------------------
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

// ----------------------------------------
*/






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


