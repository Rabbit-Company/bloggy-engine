let args = process.argv;
const fs = require('fs');
let actions = ["create", "delete", "list"];
let metadata = "";
let template = "";
let filenames = [];

if(args.includes("version")){
	console.log("Version: " + process.env.npm_package_version);
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
	metadata = fs.readFileSync(location + "/metadata.js", 'utf8');
}catch(err){
	console.log("Provided location '" + location + "' does not contain metadata.js file!");
	process.exit();
}

let action = args[3];

if(!actions.includes(action)){
	console.log("Provided action '" + action + "' is invalid!\n");
	console.log("Available actions:");
	actions.forEach(action => {
		console.log(" - " + action);
	});
	process.exit();
}

try{
	template = fs.readFileSync("template.html", 'utf8');
}catch(err){
	console.log("Something went wrong while reading 'template.html' file!");
	process.exit();
}

try{
	filenames = fs.readdirSync(location);
}catch(err){
	console.log("Something went wrong while reading '" + location + "' directory!");
	process.exit();
}

function actionList(){
	console.log("List of posts:")
	filenames.forEach(file => {
		if(file.includes(".md")){
			console.log(" - " + file);
		}
	});
}

if(action == "list"){
	actionList();
}