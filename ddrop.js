/* jshint globalstrict:true, esnext:true, node:true */
"use strict";

//run server with nodejs --harmony ddrop.js
//or with sudo systemctl restart ddrop (if you've installed ddrop.service)
//logs via stdout or journalctl -u ddrop -f

const addr='localhost', port = 8000;
const cwd = "/home/ddr/Documents/dropped/"; //must be absolute, must end with /
const dropFolder = cwd+"ddrop/"; //must end with /

const fs = require('fs');

// Load the http module to create an http server.
const http = require('http');

const cp = require('child_process');

function atob(str) {
	return new Buffer(str, 'base64').toString('binary');
}

if(!fs.existsSync(dropFolder)) throw new Error('' + Date() + ": Can't read/write to folder \"" + dropFolder + '"'); //change to fs.accessSync(dropFolder, fs.R_OK | fs.W_OK) when it becomes available, because that'll check for access too
console.log('' + Date() + ": Started; listening on "+addr+':'+port+" and writing to "+dropFolder+"*");

// Configure our HTTP server to respond with Hello World to all requests.
const server = http.createServer(function (req, res) {
	console.info('' + Date() + ': handling ' + req.method + ' from ' + req.headers.host);
	
	if(req.method === "POST") {
		var data = '';
		req.on('data', function(dat) { data += dat; }); //implement limits here if dos issues
		req.on('end', function() {
			var lines = {};
			data.split('&').forEach(function(line) {
				var l = line.split('=');
				lines[decodeURIComponent(l[0])] = atob(decodeURIComponent(l[1])); //yes, it must be like this or we get plusses for spaces
			});
			lines.filename = lines.filename.replace(/[\x00-\x1F\x7F\\\/]/g, '').trim(); //try to avoid anything with control characters that might mess up konsole or relative paths
			if(!lines.filename || !lines.text) {
				writePage(res, '<span class="error">✗</span> <span>error: empty name or text</span>');
				console.log('' + Date() + ': error: empty input');
				return;
			}
			fs.open(dropFolder+lines.filename, 'wx', function(err, fd) { //fails if path exists
				if(err) {
					fs.writeFile(dropFolder+lines.filename, lines.text, function(err) {
						if(err) {
							writePage(res, '<span class="error">✗</span> <span>error: file could not be written</span>');
							console.log('' + Date() + ': ' + notify('error overwriting file "' + lines.filename + '"'));
						} else {
							writePage(res, '<span class="success">✓</span> <span>file overwritten</span>');
							console.log('' + Date() + ': ' + notify('overwriting file "' + lines.filename + '"'));
						}
					});
				} else {
					fs.close(fd, function() {
						fs.writeFile(dropFolder+lines.filename, lines.text, function(err) {
							if(err) {
								writePage(res, '<span class="error">✗</span> <span>error: file could not be written</span>');
								console.log('' + Date() + ': ' + notify('error writing file "' + lines.filename + '"'));
							} else {
								writePage(res, '<span class="success">✓</span> <span>file created</span>');
								console.log('' + Date() + ': ' + notify('creating file "' + lines.filename + '"'));
							}
						});
					});
				}
			});
		});
	} else {
		writePage(res, '');
	}
});

function writePage(res, msg) {
	fs.readFile(cwd+'ddrop.html', 'utf8', function(e, dat) {
		res.writeHead(e?500:200, {"Content-Type": "text/html"});
		res.end(e ? ''+e : dat.replace("%DROP_RESULTS%", msg)); //e must be cast to string only when run by systemd
	});
}

//listen for incoming connections
server.listen(port, addr);
console.log("Server running at http://"+addr+":"+port+"/");

//don't die on errors
process.on('uncaughtException', function (err) {
  console.error('' + Date() + ': ' + notify('error: uncaught exception: ' + 'ddrop: '+err));
  console.error(err.stack);
});

//A small function to pop up a system message; returns the displayed message.
function notify(msg) {
	cp.spawn('zenity', ['--notification', '--text', msg]); //note: this currently never exits unless you press the button due to a bug which has been fixed upstream
	return msg;
}