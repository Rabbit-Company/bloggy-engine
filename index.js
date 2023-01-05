let args = process.argv;
const fs = require('fs');
const colors = require('colors/safe');
let MarkdownIt = require('markdown-it');
let actions = ["create", "delete", "update", "list"];
let metadata;
let template = "";
let filenames = [];

if(args.includes("version")){
	console.log(colors.yellow("Version: " + process.env.npm_package_version));
	process.exit();
}

if(args.length < 4){
	console.log("content directory location from Bloggy and Action needs to be provided in the parameters!\n");
	console.log("Format: bloggy-engine website/content list \n")
	console.log("Available actions:");
	actions.forEach(action => {
		console.log(" - " + action);
	});
	process.exit();
}

let location = args[2];
try{
	metadata = require(location + "/metadata.js");
}catch(err){
	console.log(colors.red("Provided location '" + location + "' does not contain metadata.js file!"));
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
	template = fs.readFileSync("template.html", 'utf8');
}catch(err){
	console.log(colors.red("Something went wrong while reading 'template.html' file!"));
	process.exit();
}

try{
	filenames = fs.readdirSync(location);
}catch(err){
	console.log(colors.red("Something went wrong while reading '" + location + "' directory!"));
	process.exit();
}

function actionList(){
	console.log("List of posts:")
	filenames.forEach(file => {
		if(!file.includes(".md")) return;

		let id = file.replace(".md", "");
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

		let staticPostLocation = location.replace("/content", "/") + date[0] + "/" + date[1] + "/" + date[2] + "/" + id + ".html";

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

function actionUpdate(){
	filenames.forEach(file => {
		if(!file.includes(".md")) return;

		let id = file.replace(".md", "");

		let active = Object.keys(metadata.posts).includes(id);
		if(!active){
			console.log(" - " + file + " - " + colors.yellow("Skipped: Doesn't contain metadata!"));
			return;
		}

		let date = metadata.posts[id].date;
		date = date.split("-");

		let staticPostLocation = location.replace("/content", "/") + date[0] + "/" + date[1] + "/" + date[2];

		try{
			fs.readFileSync(staticPostLocation + "/" + id + ".html", 'utf8');
			console.log(" - " + file + " - " + colors.green("Skipped: Post is already live!"));
			return;
		}catch{}

		if(!fs.existsSync(staticPostLocation)){
			fs.mkdirSync(staticPostLocation, { recursive: true });
		}

		let tempTemplate = template;
		tempTemplate = tempTemplate.replace("::metatitle::", metadata.posts[id].title);
		tempTemplate = tempTemplate.replace("::metaDescription::", metadata.posts[id].description);
		tempTemplate = tempTemplate.replace("::title::", metadata.title);
		tempTemplate = tempTemplate.replace("::description::", metadata.description);

		let social = "";
		if(typeof(metadata.website) === 'string') social += "<a href='" + metadata.website + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Website</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><path d='M19.5 7a8.998 8.998 0 0 0 -7.5 -4a8.991 8.991 0 0 0 -7.484 4'></path><path d='M11.5 3a16.989 16.989 0 0 0 -1.826 4'></path><path d='M12.5 3a16.989 16.989 0 0 1 1.828 4.004'></path><path d='M19.5 17a8.998 8.998 0 0 1 -7.5 4a8.991 8.991 0 0 1 -7.484 -4'></path><path d='M11.5 21a16.989 16.989 0 0 1 -1.826 -4'></path><path d='M12.5 21a16.989 16.989 0 0 0 1.828 -4.004'></path><path d='M2 10l1 4l1.5 -4l1.5 4l1 -4'></path><path d='M17 10l1 4l1.5 -4l1.5 4l1 -4'></path><path d='M9.5 10l1 4l1.5 -4l1.5 4l1 -4'></path></svg></a>";
		if(typeof(metadata.discord) === 'string') social += "<a href='" + metadata.discord + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Discord</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><circle cx='9' cy='12' r='1'></circle><circle cx='15' cy='12' r='1'></circle><path d='M7.5 7.5c3.5 -1 5.5 -1 9 0'></path><path d='M7 16.5c3.5 1 6.5 1 10 0'></path><path d='M15.5 17c0 1 1.5 3 2 3c1.5 0 2.833 -1.667 3.5 -3c.667 -1.667 .5 -5.833 -1.5 -11.5c-1.457 -1.015 -3 -1.34 -4.5 -1.5l-1 2.5'></path><path d='M8.5 17c0 1 -1.356 3 -1.832 3c-1.429 0 -2.698 -1.667 -3.333 -3c-.635 -1.667 -.476 -5.833 1.428 -11.5c1.388 -1.015 2.782 -1.34 4.237 -1.5l1 2.5'></path></svg></a>";
		if(typeof(metadata.twitter) === 'string') social += "<a href='" + metadata.twitter + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Twitter</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><path d='M22 4.01c-1 .49 -1.98 .689 -3 .99c-1.121 -1.265 -2.783 -1.335 -4.38 -.737s-2.643 2.06 -2.62 3.737v1c-3.245 .083 -6.135 -1.395 -8 -4c0 0 -4.182 7.433 4 11c-1.872 1.247 -3.739 2.088 -6 2c3.308 1.803 6.913 2.423 10.034 1.517c3.58 -1.04 6.522 -3.723 7.651 -7.742a13.84 13.84 0 0 0 .497 -3.753c-.002 -.249 1.51 -2.772 1.818 -4.013z'></path></svg></a>";
		if(typeof(metadata.github) === 'string') social += "<a href='" + metadata.github + "' target='_blank' class='text-gray-500 hover:text-gray-600'><span class='sr-only'>Github</span><svg class='h-6 w-6' stroke='currentColor' viewBox='0 0 24 24' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'><path stroke='none' d='M0 0h24v24H0z' fill='none'></path><path d='M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5'></path></svg></a>";
		tempTemplate = tempTemplate.replace("::social::", social);

		try{
			let mark = fs.readFileSync(location + "/" + id + ".md", 'utf8');
			let readTime = Math.round(getWordCount(mark) / 200);

			let html = "<h1 class='post-title'>" + metadata.posts[id].title + "</h1>";
			html += "<div class='flex space-x-1 f16'><time datetime='" + metadata.posts[id].date + "'>" + metadata.posts[id].date + "</time><span aria-hidden='true'>&middot;</span><span>" + readTime + " min read</span></div>";
			html += "<div class='mt-6 flex items-center'><div class='flex-shrink-0'><a href='/?author=" + metadata.posts[id].author.replace(" ", "_") + "'><span class='sr-only'>" + metadata.posts[id].author + "</span><img class='h-12 w-12 rounded-full' src='" + metadata.posts[id].avatar + "' alt='" + metadata.posts[id].author + "'></a></div><div class='ml-3'><p class='f16 font-medium'><a href='/?author=" + metadata.posts[id].author.replace(" ", "_") + "'>" + metadata.posts[id].author + "</a></p></div></div>";

			let md = new MarkdownIt();
			html += md.render(mark);
			tempTemplate = tempTemplate.replace("::post::", html);
		}catch(err){
			console.log(" - " + file + " - " + colors.red("Error: While trying to open '" + id + ".md'!"));
			return;
		}

		fs.writeFileSync(staticPostLocation + "/" + id + ".html", tempTemplate);
		console.log(" - " + file + " - " + colors.green("Success: Post has been created!"));
	});
}

if(action == "list"){
	actionList();
}else if(action == "create"){
	actionCreate();
}else if(action == "update"){
	actionUpdate();
}