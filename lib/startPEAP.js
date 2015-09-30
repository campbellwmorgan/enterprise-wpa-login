#!/bin/env node

var exec = require('child_process').exec,
	fs = require('fs'),
	_ = require('lodash'),
	temp = require('temp').track(),
	async = require('async'),
	argv = require('minimist')(process.argv.slice(2)),
	prompt = require('prompt'),
	template = function(data){ return "ctrl_interface=/var/run/wpa_supplicant\n" +
				'ap_scan=1\n' +
				'network={\n' +
				'ssid="' + data.ssid + '"\n' +
				'key_mgmt=WPA-EAP\n' +
				'eap=PEAP\n' +
				'identity="' + data.uid + '"\n' +
				'anonymous_identity="' + data.uid + '"\n' +
				'password="' + data.password + '"\n' +
				'phase1="peaplabel=0"\n' +
				'phase2="auth=MSCHAPV2"\n' + 
				'}\n'},
	defs = {
		ssid: process.env.SSID || "<YOURS_SSID>",
		uid: "<YOUR USERID>",
		password: '',
		device: '',
	};

var log = console.log;

async.waterfall([
	function(cb){
		if(!argv._.length){
			return cb(null, false);
		}
		log('Reading config file');
		cnfPath = argv._[0];
		try {
			var data = JSON.parse(
				fs.readFileSync(cnfPath)
			);
		} catch(e) {
			return cb(e);
		}
		return cb(null, data);
	},
	function(data, cb){
		log('Log into your enterprise wifi (must be executed as root)');
		if(data){
			_.extend(defs, data);
			return cb(null, defs);
		}
		prompt.start();
		var schema = {
			properties: {
				username:{
					required: false
				},
				password: {
					hidden: true
				}
			}
		};
		prompt.get(schema, function(err, res){
			if(err) return cb(err);
			userData = defs;
			userData.uid = res.username ? res.username : userData.uid;
			userData.password = res.password;
			cb(null, userData);
		});
	},
	function(userData, cb){
		log('getting wifi device');
		userData.wifiName = false;
		var conn = "ifconfig -a | awk '/^w[a-z0-9]+/'";
		var wifiExec = exec(conn, 
			function(err, stdout, stderr){
				if(!stdout || !stdout.length){
					return cb(new Error("Wifi device not found"));
				}
				var device = stdout.replace('\n', '').replace(/\:.*$/, '');
				userData.wifiName = device;
				cb(null, userData);
			});
	},
	function(userData, cb){
		log('Stopping Network Manager');
		var nw = exec("service NetworkManager stop || true")
			.on("exit", function(){
				cb(null, userData);
			});
	},
	function(userData, cb){
		log('Killing wpa_supplicant');
		var nw = exec("killall wpa_supplicant || true")
			.on("exit", function(){
				cb(null, userData);
			});
	},
	function(userData, cb){
		log('Killing dhclient');
		var nw = exec("killall dhclient || true")
			.on("exit", function(){
				cb(null, userData);
			});
	},
	function(userData, cb){
		log("Shutting down wifi");
		var wif = exec("ifconfig " + userData.wifiName + " down")
			.on('exit', function(){
				cb(null, userData);
			});
	},
	function(userData, cb){
		log("Generating temp config file");
		temp.open('wpaconf',function(err, info){
			if(err){ return cb(err)};
			fs.write(info.fd, template(userData));
			fs.close(info.fd, function(err){
				if(err){ return cb(err)}
				userData.tmpFile = info;
				cb(null, userData);
			});
		});
	},
	function(userData, cb){
		var cmd = "wpa_supplicant -Dwext -i" +
			userData.wifiName +
			" -c " + userData.tmpFile.path;

		log("Connecting to wifi", cmd);
		var wif = exec(cmd, function(err, stdout, stderr){
			console.log(err, stdout, stderr);
		});
		wif.stdout.on('data', function(data){
			log(data);
			if(data.match(/completed successfully/g)){
				cb(null, userData);
			}
		});
	},
	function(userData, cb){
		log("Getting ip address");
		var dh = exec(
			"killall dhclient || dhclient " + userData.wifiName
		).on("exit", function(){
			cb(null, userData);
		});
	}
	], 
function(err, res){
	if(err) return console.error("Failed", err);
	console.log("Successfully Connected");
});

