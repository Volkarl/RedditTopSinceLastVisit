# RedditTopperGetter
Chrome extension that opens a page containing the top posts of any particular reddit subreddit since last you visited it. 

## Isn't reddit search enough?
Well, probably, but it was a fun project. In any case, this used to be far, far easier, as you used to be able to type epoch times directly into the reddit standard search query. This was changed a year ago, and now you have to use another servie to get their data. Also you can't use RES any longer to display/embed the data, so this project was suddenly got a whole lot more difficult than I expected. 

## Weaknesses
The reddit posts are sorted by number of comments instead of score, since score isn't updated often in the pushshift API. Why number of comments is updated often and score isn't, is a great question that I don't know the answer to. In any case, the number of comments and the score of posts are *usually* correlated.

I am limited by my (probably) stupid implementation in what I can actually embed into the HTML page that I create. It turns out that any elements that require a script to run are almost impossible to get working, since chrome doesn't allow in-line scripts and the page doesn't re-evaluate the DOM elements once it's created. So, for instance, to embed imgur albums, I need to embed their script, which then changes the element that I have embedded into something that actually works. I cannot seem to get this working with my implementation. I feel like I reached some sort of limit on what you can and cannot do with HTML embedding into an already-created page. 

-------------------------------------------------

Author: Jonathan Karlsson

## DISCLAIMER
This may be the ugliest code I have ever written. It's my absolute first try with HTML, JavaScript and writing an extension for a browser. I barely understand what jQuery is and I haven't the faintest as to when it's worth using. What is nodeJs? Specifically, you might also notice that I have completely omitted using CSS, as I didn't want to prematurely add more complexity to something I already did not understand. The way I generate the HTML page is also horrendous, but I cannot seem to find a better way, which is puzzeling to me. Also, is there really not a good way to dynamically create HTML elements other than to write it in the JavaScript code?

All in all, it actually works pretty well, and was relatively fast to make (though I have hit some limits). Just don't look beneath the hood. Never do that. 
