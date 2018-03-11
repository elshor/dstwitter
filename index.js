/*jshint esversion:6, node:true */

const Twitter = require('twitter');
const ds = require('../dstools');
const ProgressReporter = ds.ProgressReporter;
const registerFunction = ds.Wrapper.registerFunction;

const WAIT_PERIOD = 900000;
const MAX_RECORDS = 10000;
const DEFAULT_PAGE_RECORDS = 200;
const Long = require('long');

/**
 This function sends API requests to the twitter API. This function can be called directly. It is also used by all dstwitter functions
 * @name twitter
 * @param   {Container} wrapped                        the wrapped data
 * @param   {string}    endpoint                       API endpoint name
 * @param   {string}    property                       name of property in the response JSON to return. E.g. with followers it is 'users'. If the value is 'this' then just return the whole response JSON
 * @param   {Object}    params                         An object representing the properties of the API calls. These properties are passed to the HTTP call. An exception is the param 'method' that is used to determine the HTTP API method to use - default is 'GET'.
 * @param   {number}    pageCount=DEFAULT_PAGE_RECORDS number of items per API request-  based on the twitter API limitations
 * @param   {number}    count=MAX_RECORDS              maximum number or items to load
 * @returns {Collection}  A collection of the requested entities
 */
module.exports = function(
	wrapped,endpoint,property,params,pageCount=DEFAULT_PAGE_RECORDS,count=MAX_RECORDS){
	const keys = this.getContext('twitter');
	console.assert(keys,'twitter functions require that the context will contain an object named "twitter" with access_token_key, access_token_secret, consumer_key and consumer_secret');
	return twitterPage.call(this,keys,wrapped,endpoint,property,params,pageCount,count,[]);
};

function twitterPage(
	keys, wrapped,endpoint,property,inparams,pageCount,count,previous,reporter=new ProgressReporter()){
	let params =  Object.assign({},inparams);
	const client = new Twitter(keys);
	const method = params.method || 'get';
	params.count = Math.min(pageCount,count);
	return client[method](endpoint, params).then((res)=>{
		const thisPage = property==='this'?res : res[property];
		const upToNow = previous.concat(thisPage);
		//if thisPage is not an array - just return it. This is not a collection
		if(!Array.isArray(thisPage)){
			reporter();
			return thisPage;
		}
		const left = count - thisPage.length;
		if(previous.length > 0){
			reporter(`${new Date().toISOString()} twitter ${endpoint}` +
										`- got ${upToNow.length} items`);
		}
		if((left <= 0) || (thisPage.length===0) || res.next_cursor_str === '0'){
			//this is a paged request and reached the last request
			reporter();//close progress reporter
			return upToNow;
		}else if(typeof res.next_cursor_str === 'string'){
			//this is a paged request and their are additional pages
			params.cursor = res.next_cursor_str;
			return twitterPage.call(
				this,keys, wrapped, endpoint,property, params, pageCount, left, upToNow,reporter);
		}else if(typeof thisPage[0].id_str === 'string'){
			params.max_id = 
				Long.fromString(thisPage[thisPage.length-1].id_str).sub(1).toString();
			return twitterPage.call(
				this,keys, wrapped, endpoint, property, params, pageCount, left, upToNow, reporter);
		}else{
			reporter();
			return upToNow;
		}
	}).catch((err)=>{
		if(rateLimitExceeded(err)){
			reporter(`${new Date().toISOString()}: rate limit for ${endpoint} exceeded. Waiting 15 minutes`);
			return wait(WAIT_PERIOD)
			.then(()=>{
				reporter(`${new Date().toISOString()}: endpoint continuing`);
				return twitterPage.call(this,keys, wrapped, endpoint, property, params, pageCount, count, previous,reporter);
			});
		}else{
			throw `Got twitter error - ${JSON.stringify(err)}\nendpoint is ${endpoint}, params are ${JSON.stringify(params)}`;
		}
	});
}

function rateLimitExceeded(err){
	for(let i=0;i<err.length;++i){
		if(err[i].code === 88){
			return true;
		}
	}
	return false;
}

function wait(ms){
	return new Promise((resolver,rejector)=>{
		setTimeout(()=>resolver(),ms);
	});
}

registerFunction('twitter',module.exports);

/**
 * Return followers of the screen name
 * @name whatever
 * @function
 * @param   {string}     screenName screen name of twitter user
 * @param   {number}     max        max number of  followers to return
 * @returns {Collection} A collection of twitter user objects
 */
registerFunction('followers',function(wrapped,screenName,max){
	return this.twitter('followers/list','users',
											{screen_name:screenName,
											skip_status:true //statuses will not be includes in user objects
											},200,max);
});

/**
 * Return users the user with screenName follows (friends)
 * @name following
 * @function
 * @param   {string}     screenName screen name of twitter user
 * @param   {number}     max        max number of users to return
 * @returns {Collection} A collection of twitter user objects
 */
registerFunction('following',function(wrapped,screenName,max){
	return this.twitter('friends/list','users',
											{screen_name:screenName,
											skip_status:true
											},200,max);
});

/**
 * Return ids for followers of the screen name
 * @name followersIDs
 * @function
 * @param   {string}     screenName screen name of twitter user
 * @param   {number}     max        max number of  followers to return
 * @returns {Collection} A collection of twitter user ids
 */
registerFunction('followersIDs',function(wrapped,screenName,max){
	return this.twitter('followers/ids','ids',
											{screen_name:screenName,
											 stringify_ids:true
											},5000,500000);
});

/**
 * Return ids for users the user with screenName follows (friends)
 * @name followingIDs
 * @function
 * @param   {string}     screenName screen name of twitter user
 * @param   {number}     max        max number of  users to return
 * @returns {Collection} A collection of twitter user ids
 */
registerFunction('followingIDs',function(wrapped,screenName,max){
	return this.twitter('friends/ids','ids',
											{screen_name:screenName,
											 stringify_ids:true
											},5000,500000);
});

/**
 * Return all tweets of a user
 * @name tweets
 * @function
 * @param   {string}     id  twitter userid or screen name
 * @param   {number}     max max tweets to return
 * @returns {Collection} A collection of tweets by the user
 */
registerFunction('tweets',function(wrapped,id,max){
	return this.twitter('statuses/user_timeline','this',{
		screen_name:isTwitterId(id)? undefined : id,
		user_id:isTwitterId(id)? id : undefined
	},200,max);
});

/**
 * Search for tweets using a query text
 * @name searchTweets
 * @function
 * @param   {string}     query   text of the query
 * @param   {number}     max     max number of tweets to return
 * @param   {object}     options additional params such as result_type and include_entities
 * @returns {Collection} a collection of tweets
 */
registerFunction('searchTweets',function(wrapped,query,max,options){
	options = Object.assign({
		q:query,
		result_type: 'recent',
		include_entities:true
	},options||{});

	return this.twitter('search/tweets','statuses',options,100,max);
});

/**
 * Follow a user or users. If id is specified then follow the user with the specified userid or screen name. Otherwise follow all entities in the wrapped collection. Each item can be a twitter userid, screen name or twitter user object
 * @name follow
 * @function
 * @param   {string}     id twitter userid or screen name
 * @returns {Collection} return JSON from API request
 */
registerFunction('follow',function(wrapped,id){
	return getIDs(id,wrapped).map((item)=>this.twitter(
		'friendships/create','this',{
			screen_name:isTwitterId(item)? undefined : item,
			user_id:isTwitterId(item)? item : undefined,
			method:'post'
		},1,1));
});

/**
 * Unfollow a user or users. If id is specified then unfollow the user with the specified userid or screen name. Otherwise unfollow all entities in the wrapped collection. Each item can be a twitter userid, screen name or twitter user object
 * @name unfollow
 * @function
 * @param   {string}     id twitter userid or screen name
 * @returns {Collection} return JSON from API request
 */
registerFunction('unfollow',function(wrapped,id){
	let ids = getIDs(id,wrapped);
	return ids.map((item)=>this.twitter(
		'friendships/destroy','this',{
			screen_name:isTwitterId(item)? undefined : item,
			user_id:isTwitterId(item)? item : undefined,
			method:'post'
		},1,1));
});

/**
 * Return a collection of the most recent retweets of the tweet specified by id
 * @name retweets
 * @function
 * @param   {string}     id  tweet id
 * @param   {number}     max max number of tweets to return
 * @returns {Collection} Collection of tweets
 */
registerFunction('retweets',function(wrapped,id,max){
	return this.twitter('statuses/retweets','this',{id:id},100,max);
});


/**
 * Return a collection of twitter user objects based on twitter screen names or collection of screen names. If screenName is specified then return its twitter user object. Otherwise, expect the wrapped collection to be a collection of screen names or objects with property screen_name
 * @name twitterUser
 * @function
 * @param   {string}     screenName screenName of the required user
 * @returns {Collection} Collection of twitter user objects
 */
registerFunction('twitterUser',function(wrapped,screenName){
	let screenNames = [];
	if(screenName){
		screenNames.push(screenName);
	}else if(!Array.isArray(wrapped)){
		screenNames = typeof wrapped === 'object'? [wrapped.screen_name] :[wrapped];
	}else{
		screenNames = wrapped.map((user)=>typeof user === 'string'? user : user.screen_name);
	}
	return this.twitter(
		'users/lookup','this',
		{screen_name:screenNames.join()},1,1
	);
});


/////////////////////////////////////////////////////////////////
//private functions
/////////////////////////////////////////////////////////////////

function getIDs(input,collection){
	collection = collection.valueOf();
	if(typeof input == 'string'){
		return [input];
	}
	if(!Array.isArray(collection)){
		collection = [collection];
	}
	return collection.map((item)=>{
		if(typeof item === 'string'){
			return item;
		}else if(typeof item !== 'object'){
			return undefined;
		}else if(item.screen_name){
			return item.screen_name;
		}else if(item.id_str){
			return item.id_str;
		}else{
			return undefined;
		}
	});
}

function isTwitterId(input){
	return typeof input === 'string' && input.match(/^\d+$/) !== null;
}