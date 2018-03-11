dstwitter - Easy use of twitter API
===================================
dstwitter is a module for simplifying data analysis and manipulation of twitter tweets and users. It integrates into [dstools](https://www.npmjs.com/package/dstools) by adding functions to the dstools collection object. See the [dstools documentation](https://elshor.github.io/dstools/) for some more information about the dstools module.

An important feature is its ability to break single requests with many required items into many API calls and when reached twitter API quota, wait for 15 minutes until the API is open again. For example, if you would like to search for 10,000 tweets about javascript, a single API call will not do. The twitter API limits each request to 100 tweets and there can only be 180 API calls in a 15 minute window. This package handles paging and waits when reached the 15 minute window quota.

You will need access token key, access token secret, consumer key and consumer token to run the code. 

## Examples
### Initialize the environment
```javascript
const ME = 'MY_SCREEN_NAME';
require('dstwitter'); //initialize twitter functions
start = require('dstools').Collection
.context('twitter',{ //context function sets the context twitter credentials
	access_token_key:'FILL-IN',
	access_token_secret : 'FILL-IN',
	consumer_key: 'FILL-IN',
	consumer_secret: 'FILL-IN'
});
```
### Show some stats
```javascript
//dot is at the end of the line so pasting into REPL will work
let followers, following;
start.followersIDs(ME).//load followers
do((output)=>followers=output).//set followers variable
followingIDs(ME).//load following
do((output)=>following=output).//set following variable
do(()=>{
	console.log('followers:',followers.length);
	console.log('I follow:',following.length);
	console.log("Follow me that I don't follow back:", Collection(followers).drop(following).count());//use Collection function to create dstools collection and use its functions such as `drop`
	console.log("Don't follow me back:", Collection(following).drop(followers).count());
});

```
### Follow back all users that follow me
```javascript
//follow users that follow me (that I don't already follow)
start.collection(followers). //wrap in collection. Need to start with `start` because `start` has the context twitter credentials
	drop(following).  //ignore users I am already following
	follow(); //follow them

### create a word cloud of user tweets
start.tweets('JavaScriptDaily',10000).
column('text').toLowerCase().
terms().dropStopwords('term').
sortDesc('count').head(50).wordCloud('term','count').save('word-cloud.html');
```
### Find users tweeting about javascript and react
```javascript
start.searchTweets('javascript react',10000,{result_type:'mixed'}).
filter((tweet)=>!tweet.text.startsWith('RT @')). //filter out retweets
map((tweet)=>tweet.user). //get users of the tweets
column('screen_name'). //get their screen name
do((names)=>console.log('screen names',names.join())); //print names after finish loading tweets
```
## Installing dstwitter
Install dstwitter using npm

```bash
npm install dstwitter
```
## Documentation
Documentation of the package is [over here](https://elshor.github.io/dstwitter/)

## License
MIT