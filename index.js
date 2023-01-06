let args = process.argv;
const fs = require('fs');
const colors = require('colors/safe');
const { SitemapStream, streamToPromise } = require('sitemap');
const { Readable } = require('stream');
let MarkdownIt = require('markdown-it');
let actions = ["create", "delete", "update", "list"];
let metadata;
let templateMain = "";
let templatePost = "";
let filenames = [];
let siteMapLinks = [];

if(args.includes("version")){
	console.log(colors.yellow("Version: " + process.env.npm_package_version));
	process.exit();
}

if(args.length < 4){
	console.log("Bloggy website directory location and Action needs to be provided in the parameters!\n");
	console.log("Format: bloggy-engine /home/ziga/Documents/Projects/Bloggy/website list\n")
	console.log("Available actions:");
	actions.forEach(action => {
		console.log(" - " + action);
	});
	process.exit();
}

let location = args[2];
try{
	metadata = require(location + "/content/metadata.js");
}catch(err){
	console.log(colors.red("Provided location '" + location + "' does not contain a 'content' folder with metadata.js file!"));
	process.exit();
}

let action = args[3];

if(!actions.includes(action)){
	console.log(colors.red("Provided action '" + action + "' is invalid!\n"));
	console.log("Available actions:");
	actions.forEach(action => {
		console.log(" - " + action);
	});
	process.exit();
}

try{
	templateMain = fs.readFileSync("template-main.html", 'utf8');
}catch(err){
	console.log(colors.red("Something went wrong while reading 'template-main.html' file!"));
	process.exit();
}

try{
	templatePost = fs.readFileSync("template-post.html", 'utf8');
}catch(err){
	console.log(colors.red("Something went wrong while reading 'template-post.html' file!"));
	process.exit();
}

try{
	filenames = fs.readdirSync(location + "/content");
}catch(err){
	console.log(colors.red("Something went wrong while reading 'content' directory!"));
	process.exit();
}

function actionList(){
	console.log("List of posts:")
	filenames.forEach(file => {
		if(!file.includes(".md")) return;

		let id = file.replaceAll(".md", "");
		let text = " - " + file + " - ";
		let active = Object.keys(metadata.posts).includes(id);
		text += (active) ? colors.green("metadata") : colors.red("metadata");
		let staticPost = false;

		if(!active){
			console.log(text);
			return;
		}

		let date = metadata.posts[id].date;
		date = date.split("-");

		let staticPostLocation = location + "/" + date[0] + "/" + date[1] + "/" + date[2] + "/" + id + ".html";

		try{
			fs.readFileSync(staticPostLocation, 'utf8');
			staticPost = true;
		}catch(err){
			staticPost = false;
		}

		text += " - ";
		text += (staticPost) ? colors.green("static") : colors.red("static");

		console.log(text);
	});
}

function actionCreate(){

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
	tempTemplate = tempTemplate.replaceAll("::analytics::", metadata.analytics);

	let social = "";
	if(typeof(metadata.website) === 'string') social += "<a href='" + metadata.website + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Website</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><path d='M19.5 7a8.998 8.998 0 0 0 -7.5 -4a8.991 8.991 0 0 0 -7.484 4'></path><path d='M11.5 3a16.989 16.989 0 0 0 -1.826 4'></path><path d='M12.5 3a16.989 16.989 0 0 1 1.828 4.004'></path><path d='M19.5 17a8.998 8.998 0 0 1 -7.5 4a8.991 8.991 0 0 1 -7.484 -4'></path><path d='M11.5 21a16.989 16.989 0 0 1 -1.826 -4'></path><path d='M12.5 21a16.989 16.989 0 0 0 1.828 -4.004'></path><path d='M2 10l1 4l1.5 -4l1.5 4l1 -4'></path><path d='M17 10l1 4l1.5 -4l1.5 4l1 -4'></path><path d='M9.5 10l1 4l1.5 -4l1.5 4l1 -4'></path></svg></a>";
	if(typeof(metadata.discord) === 'string') social += "<a href='" + metadata.discord + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Discord</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><circle cx='9' cy='12' r='1'></circle><circle cx='15' cy='12' r='1'></circle><path d='M7.5 7.5c3.5 -1 5.5 -1 9 0'></path><path d='M7 16.5c3.5 1 6.5 1 10 0'></path><path d='M15.5 17c0 1 1.5 3 2 3c1.5 0 2.833 -1.667 3.5 -3c.667 -1.667 .5 -5.833 -1.5 -11.5c-1.457 -1.015 -3 -1.34 -4.5 -1.5l-1 2.5'></path><path d='M8.5 17c0 1 -1.356 3 -1.832 3c-1.429 0 -2.698 -1.667 -3.333 -3c-.635 -1.667 -.476 -5.833 1.428 -11.5c1.388 -1.015 2.782 -1.34 4.237 -1.5l1 2.5'></path></svg></a>";
	if(typeof(metadata.twitter) === 'string') social += "<a href='" + metadata.twitter + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Twitter</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><path d='M22 4.01c-1 .49 -1.98 .689 -3 .99c-1.121 -1.265 -2.783 -1.335 -4.38 -.737s-2.643 2.06 -2.62 3.737v1c-3.245 .083 -6.135 -1.395 -8 -4c0 0 -4.182 7.433 4 11c-1.872 1.247 -3.739 2.088 -6 2c3.308 1.803 6.913 2.423 10.034 1.517c3.58 -1.04 6.522 -3.723 7.651 -7.742a13.84 13.84 0 0 0 .497 -3.753c-.002 -.249 1.51 -2.772 1.818 -4.013z'></path></svg></a>";
	if(typeof(metadata.github) === 'string') social += "<a href='" + metadata.github + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Github</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><path d='M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5'></path></svg></a>";
	tempTemplate = tempTemplate.replaceAll("::social::", social);

	let html = "";
	Object.keys(metadata.posts).forEach(key => {
		let date = metadata.posts[key].date.split("-");
		let location = "/" + date[0] + "/" + date[1] + "/" + date[2] + "/" + key + ".html";
		html += "<div class='flex flex-col overflow-hidden rounded-lg shadow-lg'><div class='flex-shrink-0'><img class='h-48 w-full object-cover' src='" + metadata.posts[key].picture + "' alt='" + metadata.posts[key].title + "'></div><div class='flex flex-1 flex-col justify-between bg-white p-6'><div class='flex-1'><p class='text-sm font-medium text-indigo-600'><a href='/?tag=" + metadata.posts[key].tag.replaceAll(" ", "_") + "' class='hover:underline'>" + metadata.posts[key].tag + "</a></p><a href='" + location + "' class='mt-2 block'><p class='text-xl font-semibold text-gray-900'>" + metadata.posts[key].title + "</p><p class='mt-3 text-base text-gray-500'>" + metadata.posts[key].description + "</p></a></div><div class='mt-6 flex items-center'><div class='flex-shrink-0'><a href='/?author=" + metadata.posts[key].author.replaceAll(" ", "_") + "'><span class='sr-only'>" + metadata.posts[key].author + "</span><img class='h-10 w-10 rounded-full' src='" + metadata.posts[key].avatar + "' alt='" + metadata.posts[key].author + "'></a></div><div class='ml-3'><p class='text-sm font-medium text-gray-900'><a href='/?author=" + metadata.posts[key].author.replaceAll(" ", "_") + "' class='hover:underline'>" + metadata.posts[key].author + "</a></p><div class='flex space-x-1 text-sm text-gray-500'><time datetime='" + metadata.posts[key].date + "'>" + metadata.posts[key].date + "</time><span aria-hidden='true'>&middot;</span><span>" + metadata.posts[key].read + " min read</span></div></div></div></div></div>";
	});
	tempTemplate = tempTemplate.replaceAll("::post::", html);

	fs.writeFileSync(location + "/index.html", tempTemplate);
	console.log(" - index.html - " + colors.green("Success: Main page has been updated!"));
}

function actionUpdate(){
	updateMain();

	siteMapLinks.push({ url: metadata.domain, changefreq: 'daily', priority: 1 });

	filenames.forEach(file => {
		if(!file.includes(".md")) return;

		let id = file.replaceAll(".md", "");

		let active = Object.keys(metadata.posts).includes(id);
		if(!active){
			console.log(" - " + file + " - " + colors.yellow("Skipped: Doesn't contain metadata!"));
			return;
		}

		let date = metadata.posts[id].date;
		date = date.split("-");

		// SiteMap
		let siteMapURL = "/" + date[0] + "/" + date[1] + "/" + date[2] + "/" + id + ".html";
		siteMapLinks.push({ url: siteMapURL, changefreq: 'daily', priority: 0.8 });

		let staticPostLocation = location + "/" + date[0] + "/" + date[1] + "/" + date[2];

		try{
			fs.readFileSync(staticPostLocation + "/" + id + ".html", 'utf8');
			console.log(" - " + file + " - " + colors.green("Skipped: Post is already live!"));
			return;
		}catch{}

		if(!fs.existsSync(staticPostLocation)){
			fs.mkdirSync(staticPostLocation, { recursive: true });
		}

		let tempTemplate = templatePost;
		tempTemplate = tempTemplate.replaceAll("::metatitle::", metadata.posts[id].title);
		tempTemplate = tempTemplate.replaceAll("::metaDescription::", metadata.posts[id].description);
		tempTemplate = tempTemplate.replaceAll("::metaAuthor::", metadata.posts[id].author);
		tempTemplate = tempTemplate.replaceAll("::metaTag::", metadata.posts[id].tag);
		if(metadata.posts[id].picture.startsWith("http")){
			tempTemplate = tempTemplate.replaceAll("::metaImage::", metadata.posts[id].picture);
		}else{
			tempTemplate = tempTemplate.replaceAll("::metaImage::", metadata.domain + metadata.posts[id].picture);
		}
		tempTemplate = tempTemplate.replaceAll("::title::", metadata.title);
		tempTemplate = tempTemplate.replaceAll("::description::", metadata.description);
		tempTemplate = tempTemplate.replaceAll("::metaDomain::", metadata.domain.replace("https://", ""));
		tempTemplate = tempTemplate.replaceAll("::metaTwitterHandle::", metadata.twitter.replace("https://twitter.com/", "@"));
		tempTemplate = tempTemplate.replaceAll("::metaURL::", metadata.domain + "/" + date[0] + "/" + date[1] + "/" + date[2] + "/" + id + ".html");
		tempTemplate = tempTemplate.replaceAll("::shareTwitter::", metadata.posts[id].title + "%0A%0A" + metadata.domain + "/" + date[0] + "/" + date[1] + "/" + date[2] + "/" + id + ".html");

		tempTemplate = tempTemplate.replaceAll("::analytics::", metadata.analytics);

		let social = "";
		if(typeof(metadata.website) === 'string') social += "<a href='" + metadata.website + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Website</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><path d='M19.5 7a8.998 8.998 0 0 0 -7.5 -4a8.991 8.991 0 0 0 -7.484 4'></path><path d='M11.5 3a16.989 16.989 0 0 0 -1.826 4'></path><path d='M12.5 3a16.989 16.989 0 0 1 1.828 4.004'></path><path d='M19.5 17a8.998 8.998 0 0 1 -7.5 4a8.991 8.991 0 0 1 -7.484 -4'></path><path d='M11.5 21a16.989 16.989 0 0 1 -1.826 -4'></path><path d='M12.5 21a16.989 16.989 0 0 0 1.828 -4.004'></path><path d='M2 10l1 4l1.5 -4l1.5 4l1 -4'></path><path d='M17 10l1 4l1.5 -4l1.5 4l1 -4'></path><path d='M9.5 10l1 4l1.5 -4l1.5 4l1 -4'></path></svg></a>";
		if(typeof(metadata.discord) === 'string') social += "<a href='" + metadata.discord + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Discord</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><circle cx='9' cy='12' r='1'></circle><circle cx='15' cy='12' r='1'></circle><path d='M7.5 7.5c3.5 -1 5.5 -1 9 0'></path><path d='M7 16.5c3.5 1 6.5 1 10 0'></path><path d='M15.5 17c0 1 1.5 3 2 3c1.5 0 2.833 -1.667 3.5 -3c.667 -1.667 .5 -5.833 -1.5 -11.5c-1.457 -1.015 -3 -1.34 -4.5 -1.5l-1 2.5'></path><path d='M8.5 17c0 1 -1.356 3 -1.832 3c-1.429 0 -2.698 -1.667 -3.333 -3c-.635 -1.667 -.476 -5.833 1.428 -11.5c1.388 -1.015 2.782 -1.34 4.237 -1.5l1 2.5'></path></svg></a>";
		if(typeof(metadata.twitter) === 'string') social += "<a href='" + metadata.twitter + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Twitter</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><path d='M22 4.01c-1 .49 -1.98 .689 -3 .99c-1.121 -1.265 -2.783 -1.335 -4.38 -.737s-2.643 2.06 -2.62 3.737v1c-3.245 .083 -6.135 -1.395 -8 -4c0 0 -4.182 7.433 4 11c-1.872 1.247 -3.739 2.088 -6 2c3.308 1.803 6.913 2.423 10.034 1.517c3.58 -1.04 6.522 -3.723 7.651 -7.742a13.84 13.84 0 0 0 .497 -3.753c-.002 -.249 1.51 -2.772 1.818 -4.013z'></path></svg></a>";
		if(typeof(metadata.github) === 'string') social += "<a href='" + metadata.github + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Github</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><path d='M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5'></path></svg></a>";
		tempTemplate = tempTemplate.replaceAll("::social::", social);

		try{
			let mark = fs.readFileSync(location + "/content/" + id + ".md", 'utf8');
			let readTime = Math.round(getWordCount(mark) / 200);

			let html = "<h1 class='post-title'>" + metadata.posts[id].title + "</h1>";
			html += "<div class='flex space-x-1 f16'><time datetime='" + metadata.posts[id].date + "'>" + metadata.posts[id].date + "</time><span aria-hidden='true'>&middot;</span><span>" + readTime + " min read</span></div>";
			html += "<div class='mt-6 flex items-center'><div class='flex-shrink-0'><a href='/?author=" + metadata.posts[id].author.replaceAll(" ", "_") + "'><span class='sr-only'>" + metadata.posts[id].author + "</span><img class='h-12 w-12 rounded-full' src='" + metadata.posts[id].avatar + "' alt='" + metadata.posts[id].author + "'></a></div><div class='ml-3'><p class='f16 font-medium'><a href='/?author=" + metadata.posts[id].author.replaceAll(" ", "_") + "'>" + metadata.posts[id].author + "</a></p></div></div>";

			let md = new MarkdownIt();
			// Adds target="_blank" to the links.
			var defaultRender = md.renderer.rules.link_open || function(tokens, idx, options, env, self) {
				return self.renderToken(tokens, idx, options);
			};
			md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
				tokens[idx].attrPush(['target', '_blank']);
				return defaultRender(tokens, idx, options, env, self);
			};

			html += md.render(mark);
			tempTemplate = tempTemplate.replaceAll("::post::", html);
		}catch(err){
			console.log(" - " + file + " - " + colors.red("Error: While trying to open '" + id + ".md'!"));
			return;
		}

		fs.writeFileSync(staticPostLocation + "/" + id + ".html", tempTemplate);
		console.log(" - " + file + " - " + colors.green("Success: Post has been created!"));
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
}

if(action == "list"){
	actionList();
}else if(action == "create"){
	actionCreate();
}else if(action == "update"){
	actionUpdate();
}