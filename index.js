let args = process.argv;
const fs = require('fs');
const colors = require('colors/safe');
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

		let staticPostLocation = location.replace("/content", "/") + date[0] + "/" + date[1] + "/" + date[2] + "/" + id;

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

function actionUpdate(){
	filenames.forEach(file => {
		if(!file.includes(".md")) return;

		let id = file.replace(".md", "");

		let active = Object.keys(metadata.posts).includes(id);
		if(!active){
			console.log(" - " + file + " - false");
			return;
		}
	});
}

if(action == "list"){
	actionList();
}else if(action == "create"){
	actionCreate();
}else if(action == "update"){
	actionUpdate();
}