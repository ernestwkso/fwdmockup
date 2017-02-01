/***********
	Project Vera Test Messenger
	Custom scripts
	(c) 2016 Cathay Pacific Airways Ltd.
***********/


// Global variables
var last_user;
var socket ;

var chatSound = document.createElement('audio');
    chatSound.setAttribute('src', '../media/space_rise1.wav');
    chatSound.setAttribute('type', 'audio/wav');
    chatSound.setAttribute('autoplay', 'autoplay');

// INIT Functions
function init() {

	//textarea init - apply autosize plugin and add return key listener
	autosize($('textarea'));
	$('.chat-footer-message-entry').focus();
	$( ".chat-footer-message-entry textarea" ).keypress(function(e) {
		if(e.keyCode === 10 || e.keyCode === 13) {
        	e.preventDefault();
        	sendMessage('.chat-footer-message-entry textarea', '.chat-window');
    	}
	});

	socket = io();
	// on connection to server, ask for user's name with an anonymous callback
  	socket.on('connect', function(){
    	// call the server-side function 'adduser' and send one parameter (value of prompt)
    	socket.emit('adduser');
  	});
  	// listener, whenever the server emits 'updatechat', this updates the chat body
  	socket.on('updatechat', function (username, data,time,typing) {
  		//alert('in updatechat window..' +data);
    	manageChatWindow(data, time, ".chat-window", "vera",typing);
  	});
	// listener, whenever the server emits 'updatechat_user', this updates the chat body
  	socket.on('updatechat_user', function (username, data,time) {
  		if(typeof time != 'undefined' && time != ""){
  			manageChatWindow(data, time, ".chat-window", username="user",false);
  		}else{
  			manageChatWindow(data, getTimeStamp(), ".chat-window", username="user",false);
    	}
    	//$('#conversation').append('<b>'+username + ':</b> ' + data + '<br>');
    	//manageChatWindow(data, "11.05.2016, 10:35", ".chat-window", "vera", false);
  	});
  	socket.on('callbackWidget', function (type,data,time,typing) {
  		//alert('in callbackWidget window..' +data);
  		makeWidget(type,data,time,".chat-window");
  	});

  	
  	window.setInterval("getTypingStatus(socket)", 1000);

}

var getTypingStatus = function(socket){
	var textArea = $('.chat-footer-message-entry textarea');
	if(textArea.val()){
		//user is typing
		socket.emit('typingStatus','true');
	}else{
		socket.emit('typingStatus','false');
	}
}

var getTimeStamp = function(){
	return(moment(new Date()).format("DD-MM-YYYY HH:mm"));
 }


function sendMessage(message_input, chat_window) {
//Sends a message from the textarea to server
//message_input: target class of input/textarea
//chat_window: target class for the UI chat window where message is displayed

	var chat_message = $(message_input).val();
	if (chat_message != "") {
	   // tell server to execute 'sendchat' and send along one parameter
        socket.emit('sendchat', chat_message);
    	//manageChatWindow(chat_message, chat_window, user="user");
	}

	//Clear message_input
	$(message_input).val('');
	$(message_input).attr('rows', '1');
}


function handleHtmlSyntax(encoded) {
	var elem = document.createElement('textarea');
	elem.innerHTML = encoded;
	var decoded = elem.value;
	decoded = decoded.replace("\\n", '<br />');
	console.log(decoded);
	return decoded;
}

function manageChatWindow(chat_message, chat_message_timestamp, chat_window, user, vera_typing, chat_bubble_id="") {
//Manages the visual display of messages in the chat window
//chat_message: string of chat message text
//chat_window: target class for the UI chat window where message is displayed
//user: defined as either "vera" or "user" for display of message bubbles

	//if typing is false, remove animation
	if (vera_typing == false) {
		$('.chat-bubble.typing').hide('slow', function(){ $('.chat-bubble.typing').remove(); });
	}

	//chat blocks are groups of messages from the same user
	if(!$(".chat-block")[0] || user != last_user)  {

		$(chat_window).append(
    		'<div class="row chat-block ' + user + '">' +
			'<div class="col-lg-12">' +
			'<ul class="chat-list"></ul>' +
			'</div>' +
			'</div> <!-- /.chat-block /.row -->'
		).clone();

		makeChatBubble(chat_message, chat_message_timestamp, chat_window, user, vera_typing, chat_bubble_id);
		
	} else if (user = last_user) {

		makeChatBubble(chat_message, chat_message_timestamp, chat_window, user, vera_typing, chat_bubble_id);
	} 

	last_user = user;
}

function makeChatBubble (chat_message, chat_message_timestamp, chat_window, user, vera_typing, chat_bubble_id) {
//Draws a chat bubble containing chat_message or typing animation to the chat_window
	console.log(chat_bubble_id);

	if (chat_bubble_id != ""){
		var chat_bubble_id = 'id="' + chat_bubble_id + '"';	
	}

	if (vera_typing == true ) {
		var bubble_content = '<li ' + chat_bubble_id + 'class="chat-bubble typing"><img src="clientchat/assets/img/ellipsis.gif" height="40" width="40"></li>';

	 } else {
	 	var bubble_content = '<li ' + chat_bubble_id + 'class="chat-bubble" style="display: none;">' + chat_message + '<div class="timestamp">' + chat_message_timestamp +  '</div></li>';
	 	$('.' + user + '-message-audio')[0].play();
	 }

	$(".chat-list").last().append(bubble_content).find('.chat-bubble').fadeIn('slow');
	$(chat_window).scrollTop($(chat_window)[0].scrollHeight);
}



/////////////////////////////

newMakeWidget("confirm", "123", "23.05.2016");
newMakeWidget("single-select", ["1", "2", "3", "4"], "23.05.2016");

function Widget(type, data, timestamp) {
	this.type = type;
  	this.data = data;
  	this.id = "widget-" + $('[id^="widget-"]').length.toString();
  	this.timestamp = timestamp;
  	this.processWidgetData = processWidgetData;
  	this.renderWidget = renderWidget;
}

function WidgetFrame(content, widget_frame_class="", confirm="") {

  	this.class = widget_frame_class;
  	this.content = content;
  	this.confirm = "";
  	if (confirm != "") {
  		this.confirm = '<div class="cta confirm"><p>' + confirm + '</p></div>';
  	}
  	this.html = 
  			'<div class="widget-frame unselected ' + this.class + '" onclick="widgetResponse(' + this.class + ');">' +
            '<div class="widget-frame-l"></div>' +
            '<div class="widget-frame-c">' +
            '<div class="content">' +
            this.content +
            this.confirm +
            '</div><!-- /.content -->' +
    		'</div><!-- /.widget-frame-c -->' +
    		'<div class="widget-frame-r"></div>' +
    		'</div><!-- /.widget-frame -->';
}

function newMakeWidget(widget_type, data, chat_message_timestamp) {

	//Create new widget
	var widget = new Widget(widget_type, data, chat_message_timestamp);
	//console.log(widgets);

	//Process widget data
	widget.processWidgetData();

	//Process widget data
	widget.renderWidget();

	//Attach listener
	attachWidgetListener(widget.id, widget);
}

function processWidgetData() {
	//console.log("widget.processWidgetData() called");
}

function renderWidget() {
	//create widget structure
	var widget_output =
			'<div class="widget ' + this.type + '">' +
			'</div><!-- /.widget -->';

	manageChatWindow(widget_output, this.timestamp, ".chat-window", "vera", false, this.id);

    var cta_confirm = '<div class="cta confirm"><p>Confirm</p></div>';
	
	switch (this.type) {
		case "confirm":
			var widget_frame = new WidgetFrame(this.data, "", "Confirm");
			$("#" + this.id).find('.widget').append(widget_frame.html);
			break;
		case "single-select":
			for (i in this.data) {
				widget_frame_class = "frame-index-" + i.toString();
    			var widget_frame = new WidgetFrame(this.data[i], widget_frame_class, "");
				$("#" + this.id).find('.widget').append(widget_frame.html);
    		}
			break;
		case "date":
			break;
	}
}

function widgetResponse(class_x) {
	alert(class_x);
}

function attachWidgetListener(target, widget){
	//console.log("widget.attachWidgetListener() called");
	$("#" + target).click(function () {
		//figure out frame index of clicked element


		//get object data
		//alert(widget.data);
	});
}


function toDo() {
	//Make incremental widget counter
	//Render each widget type
	//Add listeners for each widget
}
