var app = require('express')();
var express = require('express');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var moment = require('moment');

var ExpressWaf = require('express-waf');
var bodyParser = require('body-parser');

var luisModule = require('./modules/luisModule.js');
var calculatorModule = require('./modules/calculatorModule.js')();
var moduleName = 'INDEX';
var isLog = false;
var logHistory = {};
var platformValue = {};
var lastSocketEventTimestamps = {};
var userComments = {};
var userScore = {};

var isDevelopmentMode = false;

var calculatorModules = {};


const QUESTIONS = {
	"START_GREETING": [
		"Greetings!"
	],
	"START_QUESTION": [
		"Hello, How can I help you today?"
	]
}

const MOST_SIGNIFICANT_CARRIER_RULES = "most significant carrier rules";

const NO_OF_EVENTS_PER_SEOCOND_TO_DISCONNECT = 5; // treat as bot attack and disconnect

var getQuestion = function(questionKey,socket,channel) {
        
    currentQuestion = questionKey;

	var question = getRandomQuest(questionKey);
	socket.emit(channel, 'SERVER', question,false);
	
}

var getRandomQuest = function(questionKey) {
	var question = questionKey;

	var questions = QUESTIONS[questionKey];

	if (questions) {
		question = questions[Math.floor(Math.random() * questions.length)];
	}
	return question;
}

var setWaf = function() {
	var emudb = new ExpressWaf.EmulatedDB();
	var waf = new ExpressWaf.ExpressWaf({
	    blocker:{
	        db: emudb,
	        blockTime: 1000
	    },
	    log: true
	});

	//add modules to the firewall
	//name and configuration for the specific module have to be set
	waf.addModule('xss-module', {}, function(error) {
	    console.log(error);
	});

	waf.addModule('lfi-module', {appInstance: app, publicPath: "./public"}, function(error) {
	    console.log(error);
	});

	waf.addModule('sql-module', {}, function(error) {
	    console.log(error);
	});

	waf.addModule('csrf-module', {
	    allowedMethods:['GET', 'POST'],
	    refererIndependentUrls: ['/']
	}, function (error) {
	    console.log(error);
	});

	//body parser is necessary for some modules
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({
	    extended: true
	}));

	//add the configured firewall to your express environment
	app.use(waf.check);
}

var setChatBotApp = function() {
	app.use(express.static('public'));

	app.get('/chatbot', function(req, res){
	   res.sendFile(__dirname + '/public/clientchat/index-clientchat.html');
	});

	app.get('/getNlcQueue', function(req, res){
	   	res.json(luisModule.getNlcQueue());
	});

}

var setFWDApp = function() {
	app.use(express.static('public/app/'));

	app.get('/', function(req, res){
	   res.sendFile(__dirname + '/public/app/login.html');
	});

}

var setSocketIo = function() {
	var isBotAttackDetected = function(socket) {
		var now = moment().format('x');

		var timestamps = lastSocketEventTimestamps[socket.id];

		timestamps.push(now);

		if (timestamps.length < NO_OF_EVENTS_PER_SEOCOND_TO_DISCONNECT) {
			return false;
		}

		if (timestamps[timestamps.length-1] - timestamps[0] < 1000) {
			console.log('bot attack detected! Disconnecting ' + socket.id);
			socket.disconnect();
			return true;
		}

		timestamps.shift();
		return false;
	};

	io.sockets.on('connection', function(socket){
		var platform;
		var url = socket.handshake.headers.referer;
		if (url && url.indexOf("platform=")>=0) {
            var platformAry = url.split("platform=");
            platform = platformAry[1];
		}

		if(platform == 'android' || platform == 'ios'){
			platformValue[socket.id] = "MOBILE("+platform+")";
		}else{
			platformValue[socket.id] = "WEB";
		}

		calculatorModules[socket.id] = require('./modules/calculatorModule.js')();
		calculatorModules[socket.id].setDevelopmentMode(isDevelopmentMode);
		logHistory[socket.id] = [];
		lastSocketEventTimestamps[socket.id] = [];
		userComments[socket.id] = '';
		userScore[socket.id] = '';
		
		console.log('Active connections: ' + Object.keys(calculatorModules).length);

		socket.on('test', function() {
			if (isBotAttackDetected(socket))
				return;

			//console.log('test');
		});

		socket.on('disconnect', function() {
			console.log('Disconnection: ' + socket.id);

			delete calculatorModules[socket.id];

			console.log('Active connections: ' + Object.keys(calculatorModules).length);
		})

		socket.on('adduser', function(){
			if (isBotAttackDetected(socket))
				return;

			if (isDevelopmentMode) {
				socket.emit('updatechat', 'SERVER', 'DEVELOPMENT MODE',false);
			}

			var mscLinkContent = '';
				
			//getQuestion("START_GREETING",socket,'updatechat');
			getQuestion("START_QUESTION",socket,'updatechat');


		});

		socket.on('sendchat', function (data,widgetType,widgetData) {
			if (isBotAttackDetected(socket))
				return;

			global_socket = socket;
			
			if(widgetType == null){
				data = data.replace(/<[^>]+>/g, "");
			}			
				socket.emit('updatechat_user', "user", data);
			

			if (calculatorModules[socket.id]) {
				calculatorModules[socket.id].askChatBot(data,platformValue[socket.id],widgetType,widgetData, function(answer, delay) { 
					var data = answer;
					socket.emit('updatechat', "vera", data,false,delay);

				});
			}
			
		});

	});

}

if (process.argv[2] == "-d") {
	isDevelopmentMode = true;
}


setChatBotApp();
setFWDApp();

setWaf();

setSocketIo();

http.listen(4000, function(){
  console.log('listening on *:4000');
});

