let args = process.argv;
const fs = require('fs');
const colors = require('colors/safe');
const { SitemapStream, streamToPromise } = require('sitemap');
const { Readable } = require('stream');
const { Feed } = require('feed');
let MarkdownIt = require('markdown-it');
let actions = ["create", "delete", "update", "list", "version"];
let metadata;
let templateMain = "";
let templatePost = "";
let templateUser = "";
let creators = [];
let siteMapLinks = [];

if(args.includes("version")){
	displayTitle();
	console.log(colors.yellow("Version: 2.0.0"));
	console.log("");
	process.exit();
}

function displayTitle(){
	console.log("\n");
	console.log(colors.blue(String.raw`  ____  _                         `));
	console.log(colors.blue(String.raw` |  _ \| |                        `));
	console.log(colors.blue(String.raw` | |_) | | ___   ____  ____ _   _ `));
	console.log(colors.blue(String.raw` |  _ <| |/ _ \ / _  |/ _  | | | |`));
	console.log(colors.blue(String.raw` | |_) | | (_) | (_| | (_| | |_| |`));
	console.log(colors.blue(String.raw` |____/|_|\___/ \__, |\__, |\__, |`));
	console.log(colors.blue(String.raw`                 __/ | __/ | __/ |`));
	console.log(colors.blue(String.raw`                |___/ |___/ |___/ `));
	console.log("\n");
}

if(args.length < 4){
	displayTitle();
	console.log(colors.yellow("Bloggy website directory location and Action needs to be provided in the parameters!\n"));
	console.log(colors.cyan("1. First parameter is always required to be the full path / location of the Bloggy website / root directory."));
	console.log(colors.cyan("2. Second parameter needs to be the action name. You can see action names on the list below.\n"));
	console.log(colors.white("Example format: bloggy-engine /home/ziga/Documents/Projects/Bloggy/website list\n"));
	console.log("Available actions:");
	actions.forEach(action => {
		console.log(" - " + action);
	});
	console.log("");
	process.exit();
}

let location = args[2];
if(location[location.length-1] == '/') location = location.slice(0, -1);
try{
	metadata = require(location + "/metadata.js");
}catch(err){
	displayTitle();
	console.log(colors.red("Provided path / location '" + location + "' does not contain a metadata.js file!\n"));
	process.exit();
}

let action = args[3];
if(!actions.includes(action)){
	displayTitle();
	console.log(colors.red("Provided action '" + action + "' is invalid!\n"));
	console.log("Available actions:");
	actions.forEach(action => {
		console.log(" - " + action);
	});
	console.log("");
	process.exit();
}

try{
	templateMain = fs.readFileSync("template-main.html", 'utf8');
}catch(err){
	displayTitle();
	console.log(colors.red("It seems that 'template-main.html' file is missing!\n"));
	console.log(colors.red("Make sure 'template-main.html' file is located in the same folder as bloggy-engine executable.\n"));
	process.exit();
}

try{
	templatePost = fs.readFileSync("template-post.html", 'utf8');
}catch(err){
	displayTitle();
	console.log(colors.red("It seems that 'template-post.html' file is missing!\n"));
	console.log(colors.red("Make sure 'template-post.html' file is located in the same folder as bloggy-engine executable.\n"));
	process.exit();
}

try{
	templateUser = fs.readFileSync("template-user.html", 'utf8');
}catch(err){
	displayTitle();
	console.log(colors.red("It seems that 'template-user.html' file is missing!\n"));
	console.log(colors.red("Make sure 'template-user.html' file is located in the same folder as bloggy-engine executable.\n"));
	process.exit();
}

try{
	creators = fs.readdirSync(location + "/creator");
}catch(err){
	displayTitle();
	console.log(colors.red("Something went wrong while reading 'creator' directory!\n"));
	process.exit();
}

function createUserFeed(username, userMetadata){
	let link = metadata.domain + "/creator/" + username + "/";
	let image = metadata.imagesLink + "/avatars/" + username + ".png";
	let copyright = "?? " + new Date().getFullYear() + " " + userMetadata.author + ", All rights reserved.";
	let jsonFeed = metadata.domain + "/creator/" + username + "/feed.json";
	let atomFeed = metadata.domain + "/creator/" + username + "/feed.atom";
	let userFeed = new Feed({
		title: userMetadata.title,
		description: userMetadata.description,
		id: link,
		link: link,
		language: userMetadata.language,
		image: image,
		favicon: image,
		copyright: copyright,
		feedLinks: {
			json: jsonFeed,
			atom: atomFeed
		},
		author: {
			name: userMetadata.author,
			email: userMetadata.email,
			link: link
		}
	});

	userFeed.addCategory(userMetadata.category);
	return userFeed;
}

function actionList(){
	displayTitle();
	console.log(colors.yellow("List will display every markdown (.md) file located in 'creator' directory."));
	console.log(colors.yellow("Each .md file needs to have a metadata provided in metadata.js file."));
	console.log(colors.yellow("If " + colors.red("metadata") + " is shown in " + colors.red("red") +", then it needs to be created with 'create' command."));
	console.log(colors.yellow("If " + colors.green("metadata") + " is shown in " + colors.green("green") +", then post can be auto created with 'update' command."));
	console.log(colors.yellow("When " + colors.green("live") + " is colored " + colors.green("green") +", then we know this post is live / online / has already been created.\n"));
	let totalfiles = 0;
	let totallive = 0;
	creators.forEach(creator => {
		let creatorfiles = 0;
		let creatorlive = 0;

		console.log(colors.blue(creator) + ":");

		let userMetadata;
		try{
			userMetadata = require(location + "/creator/" + creator + "/metadata.js");
		}catch(err){
			console.log(console.red(" '" + location + "/creator/" + creator + "/metadata.js" + "' file is missing!"));
			return;
		}

		let files = [];
		try{
			files = fs.readdirSync(location + "/creator/" + creator + "/markdown");
		}catch(err){
			console.log(console.red(" '" + location + "/creator/" + creator + "/markdown"  + "' directory is missing!"));
			return;
		}

		files.forEach(file => {
			if(!file.includes(".md")) return;
			totalfiles++;
			creatorfiles++;

			let id = file.replaceAll(".md", "");
			let text = " - " + file + " - ";
			let active = Object.keys(userMetadata.posts).includes(id);
			text += (active) ? colors.green("metadata") : colors.red("metadata");
			let staticPost = false;

			if(!active){
				console.log(text);
				return;
			}

			let language = (typeof(userMetadata.posts[id].language) === 'string') ? userMetadata.posts[id].language : userMetadata.language;
			let staticPostLocation = location + "/creator/" + creator + "/" + language + "/" + id + ".html";

			try{
				fs.readFileSync(staticPostLocation, 'utf8');
				staticPost = true;
				totallive++;
				creatorlive++;
			}catch(err){
				staticPost = false;
			}

			text += " - ";
			text += (staticPost) ? colors.green("live") : colors.red("live");

			console.log(text);
		});

		if(creatorfiles != creatorlive){
			console.log(colors.yellow(" - Not all posts from " + creator + " are live!"));
		}

		console.log("");

	});

	// Stats
	console.log(colors.cyan("\nStats:"));
	console.log(colors.cyan(" - Total .md files: " + totalfiles));
	console.log(colors.cyan(" - Total live posts: " + totallive));

	if(totalfiles != totallive){
		console.log(colors.red("\nThere seems to be " + (totalfiles-totallive) + " posts that haven't been created yet!"));
		console.log(colors.red("If those posts already have a " + colors.green("metadata") + ", then you can just execute 'update' command to create them."));
	}

	console.log("");
}

function actionCreate(){
	displayTitle();
	console.log(colors.yellow("Create action still hasn't been made yet. Until then you can manually edit metadata.js file to create metadata for new posts."));
	console.log(colors.yellow("After metadata for the post has been added in metadata.js file, you can then execute 'update' command for posts to be generated.\n"));
}

function getWordCount(str) {
	return str.trim().split(/\s+/).length;
}

function updateMain(){
	let tempTemplate = templateMain;
	tempTemplate = tempTemplate.replaceAll("::metatitle::", metadata.title);
	tempTemplate = tempTemplate.replaceAll("::metaDescription::", metadata.description);
	tempTemplate = tempTemplate.replaceAll("::title::", metadata.title);
	tempTemplate = tempTemplate.replaceAll("::description::", metadata.description);
	tempTemplate = tempTemplate.replaceAll("::author::", metadata.author);
	tempTemplate = tempTemplate.replaceAll("::language::", metadata.language);
	tempTemplate = tempTemplate.replaceAll("::metaURL::", metadata.domain);
	tempTemplate = tempTemplate.replaceAll("::analytics::", metadata.analytics);
	tempTemplate = tempTemplate.replaceAll("::metaDomain::", metadata.domain.replace("https://", ""));
	tempTemplate = tempTemplate.replaceAll("::metaTwitterSite::", metadata.twitter.replace("https://twitter.com/", "@"));
	tempTemplate = tempTemplate.replaceAll("::metaTwitterCreator::", metadata.twitter.replace("https://twitter.com/", "@"));

	let social = "";
	if(typeof(metadata.website) === 'string') social += "<a href='" + metadata.website + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Website</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><path d='M19.5 7a8.998 8.998 0 0 0 -7.5 -4a8.991 8.991 0 0 0 -7.484 4'></path><path d='M11.5 3a16.989 16.989 0 0 0 -1.826 4'></path><path d='M12.5 3a16.989 16.989 0 0 1 1.828 4.004'></path><path d='M19.5 17a8.998 8.998 0 0 1 -7.5 4a8.991 8.991 0 0 1 -7.484 -4'></path><path d='M11.5 21a16.989 16.989 0 0 1 -1.826 -4'></path><path d='M12.5 21a16.989 16.989 0 0 0 1.828 -4.004'></path><path d='M2 10l1 4l1.5 -4l1.5 4l1 -4'></path><path d='M17 10l1 4l1.5 -4l1.5 4l1 -4'></path><path d='M9.5 10l1 4l1.5 -4l1.5 4l1 -4'></path></svg></a>";
	if(typeof(metadata.discord) === 'string') social += "<a href='" + metadata.discord + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Discord</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><circle cx='9' cy='12' r='1'></circle><circle cx='15' cy='12' r='1'></circle><path d='M7.5 7.5c3.5 -1 5.5 -1 9 0'></path><path d='M7 16.5c3.5 1 6.5 1 10 0'></path><path d='M15.5 17c0 1 1.5 3 2 3c1.5 0 2.833 -1.667 3.5 -3c.667 -1.667 .5 -5.833 -1.5 -11.5c-1.457 -1.015 -3 -1.34 -4.5 -1.5l-1 2.5'></path><path d='M8.5 17c0 1 -1.356 3 -1.832 3c-1.429 0 -2.698 -1.667 -3.333 -3c-.635 -1.667 -.476 -5.833 1.428 -11.5c1.388 -1.015 2.782 -1.34 4.237 -1.5l1 2.5'></path></svg></a>";
	if(typeof(metadata.twitter) === 'string') social += "<a href='" + metadata.twitter + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Twitter</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><path d='M22 4.01c-1 .49 -1.98 .689 -3 .99c-1.121 -1.265 -2.783 -1.335 -4.38 -.737s-2.643 2.06 -2.62 3.737v1c-3.245 .083 -6.135 -1.395 -8 -4c0 0 -4.182 7.433 4 11c-1.872 1.247 -3.739 2.088 -6 2c3.308 1.803 6.913 2.423 10.034 1.517c3.58 -1.04 6.522 -3.723 7.651 -7.742a13.84 13.84 0 0 0 .497 -3.753c-.002 -.249 1.51 -2.772 1.818 -4.013z'></path></svg></a>";
	if(typeof(metadata.github) === 'string') social += "<a href='" + metadata.github + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Github</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><path d='M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5'></path></svg></a>";
	tempTemplate = tempTemplate.replaceAll("::social::", social);

	let logo = metadata.domain + "/images/logo.png";
	const jsondl = {
		"@context": "https://schema.org",
    "@type": "Organization",
    "url": metadata.domain,
    "logo": logo
	};
	tempTemplate = tempTemplate.replaceAll("::jsondl::", JSON.stringify(jsondl));

	let html = "";
	creators.forEach(creator => {

		let userMetadata;
		try{
			userMetadata = require(location + "/creator/" + creator + "/metadata.js");
		}catch(err){
			console.log(console.red(" - '" + location + "/creator/" + creator + "/metadata.js" + "' file is missing!"));
			return;
		}

		let avatar = metadata.imagesLink + "/avatars/" + creator + ".png";
		html += "<li><div class='space-y-6'><a href='/creator/" + creator + "/'><img class='mx-auto h-40 w-40 shadow-lg rounded-full' loading='lazy' src='" + avatar + "' alt='" + userMetadata.author + "' /></a><div class='space-y-2'><div class='space-y-1 text-lg font-medium leading-6'><a href='/creator/" + creator + "/'><h2>" + userMetadata.author + "</h2></a></div></div></div></li>";
	});
	tempTemplate = tempTemplate.replaceAll("::creators::", html);

	fs.writeFileSync(location + "/index.html", tempTemplate);
	console.log(" - index.html - " + colors.green("Success: Main page has been updated!"));
}

function updateUserMain(username, userMetadata){
	let tempTemplate = templateUser;
	tempTemplate = tempTemplate.replaceAll("::metatitle::", userMetadata.title);
	tempTemplate = tempTemplate.replaceAll("::metaDescription::", userMetadata.description);
	tempTemplate = tempTemplate.replaceAll("::title::", userMetadata.title);
	tempTemplate = tempTemplate.replaceAll("::description::", userMetadata.description);
	tempTemplate = tempTemplate.replaceAll("::siteName::", metadata.title);
	tempTemplate = tempTemplate.replaceAll("::icon::", metadata.imagesLink + "/avatars/" + username + ".png");
	tempTemplate = tempTemplate.replaceAll("::username::", username);
	tempTemplate = tempTemplate.replaceAll("::author::", userMetadata.author);
	tempTemplate = tempTemplate.replaceAll("::authorURL::", "/creator/" + username + "/");
	tempTemplate = tempTemplate.replaceAll("::language::", userMetadata.language);
	tempTemplate = tempTemplate.replaceAll("::metaRSS::", metadata.domain + "/creator/" + username + "/feed.rss");
	tempTemplate = tempTemplate.replaceAll("::metaURL::", metadata.domain + "/creator/" + username + "/");
	tempTemplate = tempTemplate.replaceAll("::analytics::", metadata.analytics);
	tempTemplate = tempTemplate.replaceAll("::metaDomain::", metadata.domain.replace("https://", ""));
	tempTemplate = tempTemplate.replaceAll("::metaTwitterSite::", metadata.twitter.replace("https://twitter.com/", "@"));

	let twitterCreator = (typeof(userMetadata.twitter) === 'string') ? userMetadata.twitter : metadata.twitter;
	tempTemplate = tempTemplate.replaceAll("::metaTwitterCreator::", twitterCreator.replace("https://twitter.com/", "@"));

	let social = "";
	if(typeof(userMetadata.website) === 'string') social += "<a href='" + userMetadata.website + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Website</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><path d='M19.5 7a8.998 8.998 0 0 0 -7.5 -4a8.991 8.991 0 0 0 -7.484 4'></path><path d='M11.5 3a16.989 16.989 0 0 0 -1.826 4'></path><path d='M12.5 3a16.989 16.989 0 0 1 1.828 4.004'></path><path d='M19.5 17a8.998 8.998 0 0 1 -7.5 4a8.991 8.991 0 0 1 -7.484 -4'></path><path d='M11.5 21a16.989 16.989 0 0 1 -1.826 -4'></path><path d='M12.5 21a16.989 16.989 0 0 0 1.828 -4.004'></path><path d='M2 10l1 4l1.5 -4l1.5 4l1 -4'></path><path d='M17 10l1 4l1.5 -4l1.5 4l1 -4'></path><path d='M9.5 10l1 4l1.5 -4l1.5 4l1 -4'></path></svg></a>";
	if(typeof(userMetadata.discord) === 'string') social += "<a href='" + userMetadata.discord + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Discord</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><circle cx='9' cy='12' r='1'></circle><circle cx='15' cy='12' r='1'></circle><path d='M7.5 7.5c3.5 -1 5.5 -1 9 0'></path><path d='M7 16.5c3.5 1 6.5 1 10 0'></path><path d='M15.5 17c0 1 1.5 3 2 3c1.5 0 2.833 -1.667 3.5 -3c.667 -1.667 .5 -5.833 -1.5 -11.5c-1.457 -1.015 -3 -1.34 -4.5 -1.5l-1 2.5'></path><path d='M8.5 17c0 1 -1.356 3 -1.832 3c-1.429 0 -2.698 -1.667 -3.333 -3c-.635 -1.667 -.476 -5.833 1.428 -11.5c1.388 -1.015 2.782 -1.34 4.237 -1.5l1 2.5'></path></svg></a>";
	if(typeof(userMetadata.twitter) === 'string') social += "<a href='" + userMetadata.twitter + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Twitter</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><path d='M22 4.01c-1 .49 -1.98 .689 -3 .99c-1.121 -1.265 -2.783 -1.335 -4.38 -.737s-2.643 2.06 -2.62 3.737v1c-3.245 .083 -6.135 -1.395 -8 -4c0 0 -4.182 7.433 4 11c-1.872 1.247 -3.739 2.088 -6 2c3.308 1.803 6.913 2.423 10.034 1.517c3.58 -1.04 6.522 -3.723 7.651 -7.742a13.84 13.84 0 0 0 .497 -3.753c-.002 -.249 1.51 -2.772 1.818 -4.013z'></path></svg></a>";
	if(typeof(userMetadata.github) === 'string') social += "<a href='" + userMetadata.github + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Github</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><path d='M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5'></path></svg></a>";
	tempTemplate = tempTemplate.replaceAll("::social::", social);

	let jsondl = [];

	let html = "";
	let counter = 0;
	Object.keys(userMetadata.posts).reverse().forEach(key => {
		if(counter >= 9) return;
		let language = (typeof(userMetadata.posts[key].language) === 'string') ? userMetadata.posts[key].language : userMetadata.language;
		let location = "/creator/" + username + "/" + language + "/" + key;
		if(!metadata.extensionHidden) location += ".html";
		let avatar = metadata.imagesLink + "/avatars/" + username + ".png";
		let picture = (userMetadata.posts[key].picture.startsWith('http')) ? userMetadata.posts[key].picture : metadata.imagesLink + "/posts/" + username + "/" + userMetadata.posts[key].picture;
		let url = metadata.domain + location;
		let authorLink = metadata.domain + "/creator/" + username + "/";
		let category = (typeof(userMetadata.posts[key].category) === 'string') ? userMetadata.posts[key].category : userMetadata.category;
		let website = (typeof(userMetadata.website) === 'string') ? userMetadata.website : authorLink;

		jsondl.push({
			"@context": "http://schema.org",
			"@type": "BlogPosting",
			"headline": userMetadata.posts[key].title,
			"description": userMetadata.posts[key].description,
			"url": url,
			"genre": category,
			"articleSection": category,
			"keywords": userMetadata.posts[key].keywords,
			"image": [
				picture,
				avatar
			],
			"datePublished": userMetadata.posts[key].date,
			"dateModified": new Date().toISOString(),
			"publisher": {
				"@type": "Organization",
				"name": userMetadata.title,
				"url": authorLink
			},
			"author": {
				"@type": "Person",
				"name": userMetadata.author,
				"url": website
			},
		});

		html += "<div class='flex flex-col overflow-hidden rounded-lg shadow-lg'><div class='flex-shrink-0'><img class='h-48 w-full object-cover' loading='lazy' src='" + picture + "' alt='" + userMetadata.posts[key].title + "'></div><div class='flex flex-1 flex-col justify-between bg-white p-6'><div class='flex-1'><p class='text-sm font-medium text-indigo-600'><a href='/creator/" + username + "/?tag=" + userMetadata.posts[key].tag.replaceAll(" ", "_") + "' class='hover:underline'>" + userMetadata.posts[key].tag + "</a></p><a href='" + location + "' class='mt-2 block'><p class='text-xl font-semibold text-gray-900'>" + userMetadata.posts[key].title + "</p><p class='mt-3 text-base text-gray-500'>" + userMetadata.posts[key].description + "</p></a></div><div class='mt-6 flex items-center'><div class='flex-shrink-0'><a href='/creator/" + username + "/'><span class='sr-only'>" + userMetadata.author + "</span><img class='h-10 w-10 rounded-full' loading='lazy' src='" + avatar + "' alt='" + userMetadata.author + "'></a></div><div class='ml-3'><p class='text-sm font-medium text-gray-900'><a href='/creator/" + username + "/' class='hover:underline'>" + userMetadata.author + "</a></p><div class='flex space-x-1 text-sm text-gray-500'><time datetime='" + userMetadata.posts[key].date + "'>" + userMetadata.posts[key].date + "</time><span aria-hidden='true'>&middot;</span><span>" + userMetadata.posts[key].read + " min read</span></div></div></div></div></div>";
		counter++;
	});
	tempTemplate = tempTemplate.replaceAll("::post::", html);
	tempTemplate = tempTemplate.replaceAll("::jsondl::", JSON.stringify(jsondl));

	fs.writeFileSync(location + "/creator/" + username + "/index.html", tempTemplate);
	console.log(" - " + colors.blue("index.html") + " - " + colors.green("Success: User page has been updated!"));
}

function actionUpdate(){
	displayTitle();
	updateMain();

	siteMapLinks.push({ url: metadata.domain, changefreq: 'daily', priority: 1 });

	creators.forEach(creator => {

		console.log("\n" + colors.blue(creator) + ":");

		let userMetadata;
		try{
			userMetadata = require(location + "/creator/" + creator + "/metadata.js");
		}catch(err){
			console.log(console.red(" - '" + location + "/creator/" + creator + "/metadata.js" + "' file is missing!"));
			return;
		}

		let files = [];
		try{
			files = fs.readdirSync(location + "/creator/" + creator + "/markdown");
		}catch(err){
			console.log(console.red(" - '" + location + "/creator/" + creator + "/markdown"  + "' directory is missing!"));
			return;
		}

		// SiteMap
		let siteMapURL = "/creator/" + creator + "/";
		siteMapLinks.push({ url: siteMapURL, changefreq: 'daily', priority: 0.9 });

		let userFeed = createUserFeed(creator, userMetadata);

		updateUserMain(creator, userMetadata);

		files.forEach(file => {
			if(!file.includes(".md")) return;

			let id = file.replaceAll(".md", "");

			let active = Object.keys(userMetadata.posts).includes(id);
			if(!active){
				console.log(" - " + file + " - " + colors.yellow("Skipped: Doesn't contain metadata!"));
				return;
			}

			let language = (typeof(userMetadata.posts[id].language) === 'string') ? userMetadata.posts[id].language : userMetadata.language;
			if(!fs.existsSync(location + "/creator/" + creator + "/" + language)){
				fs.mkdirSync(location + "/creator/" + creator + "/" + language, { recursive: true });
			}

			// SiteMap
			let siteMapURL = "/creator/" + creator + "/" + language + "/" + id;
			if(!metadata.extensionHidden) siteMapURL += ".html";
			siteMapLinks.push({ url: siteMapURL, changefreq: 'daily', priority: 0.8 });

			// Feed
			let postURL = metadata.domain + "/creator/" + creator + "/" + language + "/" + id;
			if(!metadata.extensionHidden) postURL += ".html";

			let authorLink = metadata.domain + "/creator/" + creator + "/";
			let picture = (userMetadata.posts[id].picture.startsWith('http')) ? userMetadata.posts[id].picture : metadata.imagesLink + "/posts/" + creator + "/" + userMetadata.posts[id].picture;
			let avatar = metadata.imagesLink + "/avatars/" + creator + ".png";
			let category = (typeof(userMetadata.posts[id].category) === 'string') ? userMetadata.posts[id].category : userMetadata.category;
			let userTitle = (typeof(userMetadata.title) === 'string') ? userMetadata.title : metadata.title;
			let userDescription = (typeof(userMetadata.description) === 'string') ? userMetadata.description : metadata.description;
			let userWebsite = (typeof(userMetadata.website) === 'string') ? userMetadata.website : authorLink;
			let userEmail = (typeof(userMetadata.email) === 'string') ? userMetadata.email : metadata.email;
			let userTwitter = (typeof(userMetadata.twitter) === 'string') ? userMetadata.twitter : metadata.twitter;
			let authorLocation = "/creator/" + creator + "/";

			userFeed.addItem({
				title: userMetadata.posts[id].title,
				id: postURL,
				link: postURL,
				description: userMetadata.posts[id].description,
				author: [{
					name: userMetadata.author,
					email: userEmail,
					link: authorLink
				}],
				date: new Date(userMetadata.posts[id].date),
				image: picture
			});

			let staticPostLocation = location + "/creator/" + creator + "/" + language;

			try{
				fs.readFileSync(staticPostLocation + "/" + id + ".html", 'utf8');
				console.log(" - " + file + " - " + colors.green("Skipped: Post is already live!"));
				return;
			}catch{}

			let tempTemplate = templatePost;
			tempTemplate = tempTemplate.replaceAll("::metatitle::", userMetadata.posts[id].title);
			tempTemplate = tempTemplate.replaceAll("::metaDescription::", userMetadata.posts[id].description);
			tempTemplate = tempTemplate.replaceAll("::language::", language);
			tempTemplate = tempTemplate.replaceAll("::metaAuthor::", userMetadata.author);
			tempTemplate = tempTemplate.replaceAll("::metaTag::", userMetadata.posts[id].tag);
			tempTemplate = tempTemplate.replaceAll("::metaCategory::", category);
			tempTemplate = tempTemplate.replaceAll("::metaPublishedTime::", new Date(userMetadata.posts[id].date).toISOString());
			tempTemplate = tempTemplate.replaceAll("::metaModifiedTime::", new Date().toISOString());
			tempTemplate = tempTemplate.replaceAll("::metaImage::", picture);
			tempTemplate = tempTemplate.replaceAll("::title::", userTitle);
			tempTemplate = tempTemplate.replaceAll("::description::", userDescription);
			tempTemplate = tempTemplate.replaceAll("::siteName::", metadata.title);
			tempTemplate = tempTemplate.replaceAll("::icon::", metadata.imagesLink + "/avatars/" + creator + ".png");
			tempTemplate = tempTemplate.replaceAll("::username::", creator);
			tempTemplate = tempTemplate.replaceAll("::previousLocation::", authorLocation);
			tempTemplate = tempTemplate.replaceAll("::metaDomain::", metadata.domain.replace("https://", ""));
			tempTemplate = tempTemplate.replaceAll("::metaRSS::", metadata.domain + "/creator/" + creator + "/feed.rss");
			tempTemplate = tempTemplate.replaceAll("::metaTwitterSite::", metadata.twitter.replace("https://twitter.com/", "@"));
			let twitterCreator = (typeof(userMetadata.twitter) === 'string') ? userMetadata.twitter : metadata.twitter;
			tempTemplate = tempTemplate.replaceAll("::metaTwitterCreator::", twitterCreator.replace("https://twitter.com/", "@"));
			tempTemplate = tempTemplate.replaceAll("::metaURL::", postURL);
			let shareTwitter = userMetadata.posts[id].title + "%0A%0A" + metadata.domain + "/creator/" + creator + "/" + language + "/" + id;
			if(!metadata.extensionHidden) shareTwitter += ".html";
			tempTemplate = tempTemplate.replaceAll("::shareTwitter::", shareTwitter);

			tempTemplate = tempTemplate.replaceAll("::analytics::", metadata.analytics);

			let keywords = "";
			userMetadata.posts[id].keywords.forEach(keyword => {
				keywords += keyword + ", ";
			});
			keywords = keywords.slice(0, -2);

			tempTemplate = tempTemplate.replaceAll("::metaKeywords::", keywords);

			let social = "";
			if(typeof(userMetadata.website) === 'string') social += "<a href='" + userMetadata.website + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Website</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><path d='M19.5 7a8.998 8.998 0 0 0 -7.5 -4a8.991 8.991 0 0 0 -7.484 4'></path><path d='M11.5 3a16.989 16.989 0 0 0 -1.826 4'></path><path d='M12.5 3a16.989 16.989 0 0 1 1.828 4.004'></path><path d='M19.5 17a8.998 8.998 0 0 1 -7.5 4a8.991 8.991 0 0 1 -7.484 -4'></path><path d='M11.5 21a16.989 16.989 0 0 1 -1.826 -4'></path><path d='M12.5 21a16.989 16.989 0 0 0 1.828 -4.004'></path><path d='M2 10l1 4l1.5 -4l1.5 4l1 -4'></path><path d='M17 10l1 4l1.5 -4l1.5 4l1 -4'></path><path d='M9.5 10l1 4l1.5 -4l1.5 4l1 -4'></path></svg></a>";
			if(typeof(userMetadata.discord) === 'string') social += "<a href='" + userMetadata.discord + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Discord</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><circle cx='9' cy='12' r='1'></circle><circle cx='15' cy='12' r='1'></circle><path d='M7.5 7.5c3.5 -1 5.5 -1 9 0'></path><path d='M7 16.5c3.5 1 6.5 1 10 0'></path><path d='M15.5 17c0 1 1.5 3 2 3c1.5 0 2.833 -1.667 3.5 -3c.667 -1.667 .5 -5.833 -1.5 -11.5c-1.457 -1.015 -3 -1.34 -4.5 -1.5l-1 2.5'></path><path d='M8.5 17c0 1 -1.356 3 -1.832 3c-1.429 0 -2.698 -1.667 -3.333 -3c-.635 -1.667 -.476 -5.833 1.428 -11.5c1.388 -1.015 2.782 -1.34 4.237 -1.5l1 2.5'></path></svg></a>";
			if(typeof(userMetadata.twitter) === 'string') social += "<a href='" + userMetadata.twitter + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Twitter</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><path d='M22 4.01c-1 .49 -1.98 .689 -3 .99c-1.121 -1.265 -2.783 -1.335 -4.38 -.737s-2.643 2.06 -2.62 3.737v1c-3.245 .083 -6.135 -1.395 -8 -4c0 0 -4.182 7.433 4 11c-1.872 1.247 -3.739 2.088 -6 2c3.308 1.803 6.913 2.423 10.034 1.517c3.58 -1.04 6.522 -3.723 7.651 -7.742a13.84 13.84 0 0 0 .497 -3.753c-.002 -.249 1.51 -2.772 1.818 -4.013z'></path></svg></a>";
			if(typeof(userMetadata.github) === 'string') social += "<a href='" + userMetadata.github + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Github</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><path d='M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5'></path></svg></a>";
			tempTemplate = tempTemplate.replaceAll("::social::", social);

			try{
				let mark = fs.readFileSync(location + "/creator/" + creator + "/markdown/" + id + ".md", 'utf8');
				let wordcount = getWordCount(mark);
				let readTime = Math.round(wordcount / 200);

				let html = "<h1 class='post-title'>" + userMetadata.posts[id].title + "</h1>";
				html += "<div class='flex space-x-1 f16'><time datetime='" + userMetadata.posts[id].date + "'>" + userMetadata.posts[id].date + "</time><span aria-hidden='true'>&middot;</span><span>" + readTime + " min read</span></div>";
				html += "<div class='mt-6 flex items-center'><div class='flex-shrink-0'><a href='/creator/" + creator + "/'><span class='sr-only'>" + userMetadata.author + "</span><img class='h-12 w-12 rounded-full' loading='lazy' src='" + avatar + "' alt='" + userMetadata.author + "'></a></div><div class='ml-3'><p class='f16 font-medium'><a href='/creator/" + creator + "/'>" + userMetadata.author + "</a></p></div></div>";

				let md = new MarkdownIt();
				// Adds target="_blank" to the links.
				var defaultRender = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
					return self.renderToken(tokens, idx, options);
				};
				md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
					tokens[idx].attrPush(['target', '_blank']);
					return defaultRender(tokens, idx, options, env, self);
				};

				let postHtml = md.render(mark);
				html += postHtml;
				tempTemplate = tempTemplate.replaceAll("::post::", html);

				const jsondl = {
					"@context": "http://schema.org",
					"@type": "BlogPosting",
					"headline": userMetadata.posts[id].title,
					"description": userMetadata.posts[id].description,
					"url": postURL,
					"genre": category,
					"articleSection": category,
					"wordcount": wordcount,
					"keywords": userMetadata.posts[id].keywords,
					"image": [
						picture,
						avatar
					],
					"datePublished": userMetadata.posts[id].date,
					"dateModified": new Date().toISOString(),
					"articleBody": postHtml,
					"publisher": {
						"@type": "Organization",
						"name": userMetadata.title,
						"url": authorLink
					},
					"author": {
						"@type": "Person",
						"name": userMetadata.author,
						"url": userWebsite
					},
				};

				tempTemplate = tempTemplate.replaceAll("::jsondl::", JSON.stringify(jsondl));
			}catch(err){
				console.log(" - " + file + " - " + colors.red("Error: While trying to open '" + id + ".md'!"));
				return;
			}

			fs.writeFileSync(staticPostLocation + "/" + id + ".html", tempTemplate);
			console.log(" - " + file + " - " + colors.green("Success: Post has been created!"));
		});

		// Generate RSS feed
		fs.writeFileSync(location + "/creator/" + creator + "/feed.rss", userFeed.rss2());
		console.log(" - " + colors.blue("feed.rss") + " - " + colors.green("Success: feed.rss has been created!"));

		// Generate Atom feed
		fs.writeFileSync(location + "/creator/" + creator + "/feed.atom", userFeed.atom1());
		console.log(" - " + colors.blue("feed.atom") + " - " + colors.green("Success: feed.atom has been created!"));

		// Generate Json feed
		fs.writeFileSync(location + "/creator/" + creator + "/feed.json", userFeed.json1());
		console.log(" - " + colors.blue("feed.json") + " - " + colors.green("Success: feed.json has been created!"));

	});

	// Generate sitemap.xml
	const stream = new SitemapStream( { hostname: metadata.domain } );
	streamToPromise(Readable.from(siteMapLinks).pipe(stream)).then((data) => {
		fs.writeFileSync(location + "/sitemap.xml", data.toString());
		console.log(" - " + colors.blue("sitemap.xml") + " - " + colors.green("Success: sitemap.xml has been created!"));
	});

	// Generate robots.txt
	let robots = "User-agent: *\nDisallow: /cgi-bin/\nSitemap: " + metadata.domain + "/sitemap.xml";
	fs.writeFileSync(location + "/robots.txt", robots);
	console.log(" - " + colors.blue("robots.txt") + " - " + colors.green("Success: robots.txt has been created!"));

	// Generate manifest.json
	let manifest = {
		"name": metadata.title,
		"short_name": metadata.title,
		"id": "/",
		"start_url": "/",
		"scope": ".",
		"description": metadata.description,
		"categories": ["entertainment", "news", "social"],
		"icons": [
			{
				"src": "images/icons/icon-48x48.png",
				"sizes": "48x48",
				"type": "image/png"
			},
			{
				"src": "images/icons/icon-72x72.png",
				"sizes": "72x72",
				"type": "image/png"
			},
			{
				"src": "images/icons/icon-96x96.png",
				"sizes": "96x96",
				"type": "image/png"
			},
			{
				"src": "images/icons/icon-128x128.png",
				"sizes": "128x128",
				"type": "image/png"
			},
			{
				"src": "images/icons/icon-144x144.png",
				"sizes": "144x144",
				"type": "image/png"
			},
			{
				"src": "images/icons/icon-152x152.png",
				"sizes": "152x152",
				"type": "image/png"
			},
			{
				"src": "images/icons/icon-192x192.png",
				"sizes": "192x192",
				"type": "image/png"
			},
			{
				"src": "images/icons/icon-384x384.png",
				"sizes": "384x384",
				"type": "image/png"
			},
			{
				"src": "images/icons/icon-512x512.png",
				"sizes": "512x512",
				"type": "image/png",
				"purpose": "any"
			},
			{
				"src": "images/icons/icon-512x512.png",
				"sizes": "512x512",
				"type": "image/png",
				"purpose": "maskable"
			}
		],
		"screenshots": [
			{
				"src": "/images/screenshots/1.jpeg",
				"sizes": "720x1600",
				"type": "image/jpg"
			},
			{
				"src": "/images/screenshots/2.jpeg",
				"sizes": "720x1600",
				"type": "image/jpg"
			},
			{
				"src": "/images/screenshots/3.jpeg",
				"sizes": "720x1600",
				"type": "image/jpg"
			}
		],
		"theme_color": "#0D1117",
		"background_color": "#0D1117",
		"display": "standalone",
		"orientation": "portrait",
		"related_applications": [],
		"dir": "ltr",
		"lang": metadata.language
	};

	fs.writeFileSync(location + "/manifest.json", JSON.stringify(manifest));
	console.log(" - " + colors.blue("manifest.json") + " - " + colors.green("Success: manifest.json has been created!"));

}

function actionDelete(){
	displayTitle();
	console.log(colors.yellow("Delete action still hasn't been made yet. Until then you can delete posts manually.\n"));
}

if(action == "list"){
	actionList();
}else if(action == "create"){
	actionCreate();
}else if(action == "update"){
	actionUpdate();
}else if(action == "delete"){
	actionDelete();
}