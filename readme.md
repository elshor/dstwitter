dstwitter - Easy use of twitter API
===================================
dstwitter is a module for simplifying data analysis and manipulation of twitter tweets and users. It integrates into [dstools](https://www.npmjs.com/package/dstools) by adding functions to the dstools collection object. See the [dstools documentation](https://elshor.github.io/dstools/) for some more information about the dstools module.

You will need access token key, access token secret, consumer key and consumer token to run the code.

## Examples
### Initialize the environment
```javascript
const ME = 'MY_SCREEN_NAME';
require('dstwitter');//initialize twitter functions
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
//get followers and following IDs
let followers = start.followersIDs(ME);
let following = start.followingIDs(ME);

//some stats
console.log('followers:',followers.count());
console.log('I follow:',following.count());
console.log("Follow me that I don't follow back:", followers.drop(following).count());
console.log("Don't follow me back:", following.drop(followers).count());
```
### Follow back all users that follow me
```javascript
//follow users that follow me (that I don't already follow)
followers
	.drop(following) //ignore users I am already following
	.follow(); //follow them

### create a word cloud of user tweets
start.tweets('SOME_SCREEN_NAME',10000)
.column('text').toLowerCase()
.terms().dropStopwords('term')
.sortDesc('count').head(50).wordCloud('term','count').save('word-cloud.html');
```
### Find users tweeting about javascript and react
```javascript
start.searchTweets('javascript react',10000,{result_type:'mixed'})
.filter((tweet)=>!tweet.text.startsWith('RT @'))//filter out retweets
.map((tweet)=>tweet.user)//get users of the tweets
.column('screen_name')//get their screen name
.do((names)=>console.log('screen names',names.join()));//print names after finish loading tweets
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