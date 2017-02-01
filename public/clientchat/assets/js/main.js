/***********
	Project Vera Test Messenger
	Custom scripts
	(c) 2016 Cathay Pacific Airways Ltd.
***********/


// Global variables
var last_user;
var socket ;
var LBS_CONVERSION = 2.2;
var platform;

var isChatBubbleShowing = false;
var MOST_SIGNIFICANT_CARRIER_RULES = "most significant carrier rules";
var COPY_RIGHT = "Copyright";

var collapseCounter = 0;
var expandID = "expand";
var collapseID = "collapse";
var additionalInfoID= "additional-information-";
var additionalInfoBodyID= "additional-information-body-";
var autocorrect_id_counter = 0;
var autocorrections = [];

// INIT Functions
function init() {

	//Modenizr fixes
	if (Modernizr.touch) { 
		//touch-specific actions
		$(".btn.chat-send").hover().css("border", "0");
	} else { 
		//no-touch specific actions
	}

	platform = window.location.href;
	var copyright_link = '';
	if((platform.indexOf('?platform=android') == -1) && (platform.indexOf('?platform=ios') == -1)){
		platform = 'WEB';
		$(".chat-header").removeClass('hidden');
		$(".chat-header-mobile").addClass('hidden');
		copyright_link = COPY_RIGHT+' </a>© FWD Limited';
	}

	//add copyright
	$(".copyright").append('<div class="row"> '+
                            '<div class="col-xs-12"> '+ copyright_link +
                            '</div>');

	//textarea init - apply autosize plugin and add return key listener
	autosize($('textarea'));
	$('.chat-footer-message-entry').focus();
	$('.chat-footer-message-entry textarea').focus(	function() {
	  	if(platform == "ANDROID"){
          $( ".flexbox" ).height("55%");
		}
	});
	$('.chat-footer-message-entry textarea').focusout(function() {
	  	if(platform == "ANDROID"){
          $( ".flexbox" ).height("100%");
		}
	});
	$( ".chat-footer-message-entry textarea" ).keypress(function(e) {
		if(e.keyCode === 10 || e.keyCode === 13) {
        	e.preventDefault();
        	sendMessage('.chat-footer-message-entry textarea', '.chat-window');
    	}
	});

	$( ".chat-send" ).on("mousedown", function(event) {
	  	// Do things
	  	event.preventDefault();
	  	event.stopPropagation();
	  	sendMessage('.chat-footer-message-entry textarea', '.chat-window');
	  	return false;
	});

	$( ".chat-window" ).click(function() {
  		//Accordion
  		$('.additional-information').on('hidden.bs.collapse', function () {
  			var chosenID = this.id;
  			var curIndex  = chosenID.replace(additionalInfoID,"");
  			var curCollapseID = collapseID+curIndex;
  			var curExpandID = expandID+curIndex;
			$("#"+curCollapseID).addClass('hidden');
	  		$("#"+curExpandID).removeClass('hidden');
		})

		$('.additional-information').on('shown.bs.collapse', function () {
			var chosenID = this.id;
			var curIndex  = chosenID.replace(additionalInfoID,"");
  			var curCollapseID = collapseID+curIndex;
  			var curExpandID = expandID+curIndex;
			$("#"+curExpandID).addClass('hidden');
	  		$("#"+curCollapseID).removeClass('hidden');
		})
	});

	//Initialise rating with accessibility fixes
	$('.stars').raty({
	  path       : '../img/icon/',
	  starOff    : 'icon-star-empty@2x.png',
	  starOn     : 'icon-star@2x.png',
	  hints: ["1 of 5 star", "2 of 5 stars", "3 of 5 stars", "4 of 5 stars", "5 of 5 stars"]
	});

	$(".stars img").attr("role", "button");
	$(".stars img").attr("tabindex", "0");
	$(".stars img").keydown(function(e) {
		var code = e.which;
  		if ((code === 13) || (code === 32)) {
			$(this).click();
		}
	});

	//Interactive
	// $( "body" ).hover(function() {
	//   $('.container').addCLass( 'active' );
	// });

	//SOCKET.IO
	socket = io();
	// on connection to server, ask for user's name with an anonymous callback
  	socket.on('connect', function(){
    	// call the server-side function 'adduser' and send one parameter (value of prompt)
    	socket.emit('adduser');
  	});
  	// listener, whenever the server emits 'updatechat', this updates the chat body
  	socket.on('updatechat', function (username, data, typing, delay) {
  		//alert('in updatechat window..' +data);
    	manageChatWindow("", "", ".chat-window", "vera", true);
    	if (!delay)
			delay = 0;

    	setTimeout(function() {
    		//console.log(data);
    		if(data.type == "faq" || data.type == "faq-www"){
    			//console.log(data.arr[data.index]);
    			makeWidget(data.type, data.arr, data.index,data.content,getTimeStamp());
    		}else{
    			manageChatWindow(data,  getTimeStamp(), ".chat-window", "vera",typing);
    		}
	    }, delay);
  	});
	// listener, whenever the server emits 'updatechat_user', this updates the chat body
  	socket.on('updatechat_user', function (username, data) {
  		manageChatWindow(data, getTimeStamp(), ".chat-window", username="user",false);
  	});
  	// listener, whenever the server emits 'updatechat_start', this updates the start of chat body
  	socket.on('updatechat_start', function (username, data, typing, delay) {
  		manageChatWindow("", "", ".chat-window", "vera", true);

		if (!delay)
			delay = 0;

    	setTimeout(function() {
	    	manageChatWindow(data,  getTimeStamp(), ".chat-window", "vera",typing);
	    	
	    	//Add custom style to disclaimer chat bubbles
			$('.disclaimer-trigger').closest('li.chat-bubble').addClass('disclaimer');
	    }, delay);
  	});

    socket.on('create_chatBubble', function () {
    	manageChatWindow("", "", ".chat-window", "vera", true);
  	});

    socket.on('remove_chatBubble', function () {
      removeChatBubble();
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
	return(moment(new Date()).format("DD MMM HH:mm"));
 }

function sendMessage(message_input, chat_window) {
//Sends a message from the textarea to server
//message_input: target class of input/textarea
//chat_window: target class for the UI chat window where message is displayed
	
	$('li.chat-bubble.autocorrect').not(".status-incorrect").addClass('status-correct');

	setWidgetSelected();

	var chat_message = $(message_input).val();
	if (chat_message != "") {
	   // tell server to execute 'sendchat' and send along one parameter
        socket.emit('sendchat', chat_message);
    	//manageChatWindow(chat_message, chat_window, user="user");
	}

	//Clear message_input and reset height
	$(message_input).val('');
	$(message_input).attr('style', '');
}


function handleHtmlSyntax(encoded) {
	var elem = document.createElement('textarea');
	elem.innerHTML = encoded;
	var decoded = elem.value;
	decoded = decoded.replace("\\n", '<br />');
	return decoded;
}

function manageChatWindow(chat_message, chat_message_timestamp, chat_window, user, vera_typing, chat_bubble_id, custom_class) {
//Manages the visual display of messages in the chat window
//chat_message: string of chat message text
//chat_window: target class for the UI chat window where message is displayed
//user: defined as either "vera" or "user" for display of message bubbles

	var chat_bubble_id = chat_bubble_id || "";
	var custom_class = custom_class || "";
	
	//if typing is false, remove animation
	if (vera_typing == false) {
		removeChatBubble();
	}

	//chat blocks are groups of messages from the same user
	if(!$(".chat-block")[0] || user != last_user)  {

		$(chat_window + " ul.chat-list").append(
			'<div class="chat-block" role="presentation"></div>'
		).clone();

		makeChatBubble(chat_message, chat_message_timestamp, chat_window, user, vera_typing, chat_bubble_id, custom_class);
		
	} else if (user = last_user) {

		makeChatBubble(chat_message, chat_message_timestamp, chat_window, user, vera_typing, chat_bubble_id, custom_class);
	} 

	last_user = user;

	//Add custom style to user-autocorrect chat bubbles
	//$('.autocorrect-marker').closest('li.chat-bubble').addClass('autocorrect');
}

function removeChatBubble(){
	$('.chat-bubble.typing').hide('slow', function(){ $('.chat-bubble.typing').remove(); });
	isChatBubbleShowing = false;
}

function makeChatBubble (chat_message, chat_message_timestamp, chat_window, user, vera_typing, chat_bubble_id, custom_class) {
//Draws a chat bubble containing chat_message or typing animation to the chat_window
	var sr_users = {"user": "You", "vera": "Cathay Pacific"};

	if (chat_bubble_id != ""){
		chat_bubble_id = 'id="' + chat_bubble_id + '"';	
	}

	if (vera_typing == true ) {
		if (!isChatBubbleShowing) {
			isChatBubbleShowing = true;

			var bubble_content = '<li ' + chat_bubble_id + 'class="chat-bubble typing ' + user + '"><img src="clientchat/assets/img/vera-typing-ellipsis.gif" height="40" width="40"></li>';
		}
	 } else {
	 	var output = '';
	 	var free_carry_on_weight = '';
	 	var free_carry_on_piece = '';
	 	var free_carry_on_err = '';

	 	var additional_weight = '';
	 	var additional_piece = '';
	 	var excess_check_in_err = '';
	 	var disclaimer_text = '';

	 	var free_check_in_weight = '';
	 	var free_check_in_piece = '';

	 	var free_infant_check_in_weight = '';
	 	var free_infant_check_in_piece = '';

	 	var free_check_in_disclaimer = '';
	 	var free_carry_on_disclaimer = '';

	 	var free_allowance_type = '';

	 	var user_input_summary = '';

	 	var isAutoSpellFlag = '';
	 	var locationArray;
	 	var content = '';
	 	var showDoc = false;

	 	var veraGuessOd = false;

	 	for (var entry in chat_message) {
	 		console.log('*****');
	 		console.log(chat_message['showDoc']);
			output += 'key: ' + entry + ' | value: ' + chat_message[entry] + '\n';
			if(entry == 'free_carry_on_weight'){
		  		free_carry_on_weight = chat_message[entry];
		  	}else if(entry == 'free_carry_on_piece'){
		  		free_carry_on_piece = chat_message[entry];
		  	}else if(entry == 'free_carry_on_err'){
				free_carry_on_err = chat_message[entry];
			}else if(entry == 'additional_weight'){
				additional_weight = chat_message[entry];
			}else if(entry == 'additional_piece'){
				additional_piece = chat_message[entry];
			}else if(entry == 'excess_check_in_err'){
				excess_check_in_err = chat_message[entry];
			}else  if(entry == 'free_check_in_weight'){
				free_check_in_weight = chat_message[entry];
			}else if(entry == 'free_check_in_piece'){
				free_check_in_piece = chat_message[entry];
			}else if(entry == 'free_infant_check_in_weight'){
				free_infant_check_in_weight = chat_message[entry];
			}else if(entry == 'free_infant_check_in_piece'){
				free_infant_check_in_piece = chat_message[entry];
			}else if(entry == 'free_check_in_disclaimer'){
				free_check_in_disclaimer = chat_message[entry];
			}else if(entry == 'free_carry_on_disclaimer'){
				free_carry_on_disclaimer = chat_message[entry];
			}else if(entry == 'oversized_piece'){
				disclaimer_text = chat_message[entry];
			}else if(entry == 'free_allowance_type'){
				free_allowance_type = chat_message[entry];
			}else if(entry == 'user_input_summary'){
				user_input_summary = chat_message[entry];
			}else if(entry == 'autocorrect_flag'){
				isAutoSpellFlag = chat_message[entry];
			}else if(entry == 'autocorrect_location_values'){
				locationArray = chat_message[entry];
			}else if(entry == 'autocorrect_content'){
				content = chat_message[entry];
			}else if(entry == 'vera_guess_od'){
				veraGuessOd = true;
				content = chat_message[entry];
			}else if(entry == 'showDoc'){
				console.log('comes here.............mikita:::: '+chat_message[entry]);
				showDoc = true;
			}
		}
		
		if(showDoc){
			var bubble_content = '<li ' + chat_bubble_id + 'class="chat-bubble key-response ' + user + ' ' + custom_class + '" style="display: none;"> <span class="sr-only">' + sr_users[user] + ': </span>' + 

				'<style>'+
				'table {'+
				'border-collapse: collapse;'+
				'width: 100%;'+
				'}'+

				'td, th {'+
				'border: 1px solid #dddddd;'+
				'text-align: left;'+
				'padding: 8px;'+
				'}'+

				'tr:nth-child(even) {'+
				'background-color: #dddddd;'+
				'}'+
				'</style>'+

				'<table>'+
				'<tr>'+
				"<th>Doctor's Name</th>"+
				'<th>Speciality</th>'+
				'<th>Address</th>'+
				'</tr>'+
				'<tr>'+
				'<td>Dr. Leung Yin Ching</td>'+
				'<td>Endocrinology, Diabetes and Metabolism</td>'+
				'<td>Room 618-619, 6/F, Block A, Hoi Luen Industrial Centre, 55 Hoi Yuen Rd, Kwun Tong (MTR Kwun Tong Station Exit B3)</td>'+
				'</tr>'+
				'<tr>'+
				'<td>Dr. Lo Chi Kit Michael</td>'+
				'<td>Endocrinology, Diabetes and Metabolism</td>'+
				'<td>Room 618-619, 6/F, Block A, Hoi Luen Industrial Centre, 55 Hoi Yuen Rd, Kwun Tong (MTR Kwun Tong Station Exit B3)</td>'+
				'</tr>'+
				'<tr>'+
				'<td>Dr. Siu Kai Leung Simon</td>'+
				'<td>Endocrinology, Diabetes and Metabolism</td>'+
				'<td>Room 618-619, 6/F, Block A, Hoi Luen Industrial Centre, 55 Hoi Yuen Rd, Kwun Tong (MTR Kwun Tong Station Exit B3)</td>'+
				'</tr>'+
				'<tr>'+
				'<td>Dr. Yau Wing Him</td>'+
				'<td>Endocrinology, Diabetes and Metabolism</td>'+
				'<td>Shop No. 149, Hip Wo Street, Kwun Tong, Kowloon</td>'+
				'</tr>'+
				'<tr>'+
				'<td>Dr. Ho Yiu Keung Steven</td>'+
				'<td>Endocrinology, Diabetes and Metabolism</td>'+
				'<td>Shop No. 149, Hip Wo Street, Kwun Tong, Kowloon</td>'+
				'</tr>'+
				'<tr>'+
				'<td>Dr. Yu Chung Kwan Cellina</td>'+
				'<td>Endocrinology, Diabetes and Metabolism</td>'+
				'<td>Shop No. 149, Hip Wo Street, Kwun Tong, Kowloon</td>'+
				'</tr>'+
				'</table>'+

		
			'<div class="timestamp"><time datetime="' + chat_message_timestamp + '">' + chat_message_timestamp +  '</div>' +
			'<div class="chat-bubble-tail"></div></li>';
		}else{
			var bubble_content = '<li ' + chat_bubble_id + 'class="chat-bubble ' + user + ' ' + custom_class + '" style="display: none;"> <span class="sr-only">' + sr_users[user] + ': </span>' + chat_message + '<div class="timestamp"><time datetime="' + chat_message_timestamp + '">' + chat_message_timestamp +  '</div><div class="chat-bubble-tail"></div></li>';
		}
		if (user == "vera") {
			$('.vera-message-audio')[0].play();
		}
	 }

	$(".chat-block").last().append(bubble_content).find('.chat-bubble').fadeIn('slow');
	$(chat_window).scrollTop($(chat_window)[0].scrollHeight);
}

function feedbackHandler(target) {
//handles callback from the feedback modal
	var score = $(target + " .stars").raty('score');
	var comments = $(target + " .comments").val();

	if (score == undefined) {
		//$(target + " .star-rating .validation").removeClass("hidden");
		//$(target + " .star-rating .validation").attr("aria-hidden","false");
		$(target + " .star-rating .validation").append('<span class="icon icon-warning" aria-hidden="true"></span> Please provide an overall rating before submitting your feedback.');

	} else {
		//submit response and comments to DB
		socket.emit('send_score_comment', score, comments);

		//transition to thank you screen
		$(target + " .feedback-step-1").fadeOut('slow');
		$(target + " .feedback-step-1").attr("aria-hidden","true");
		$(target + " .feedback-step-2").fadeIn('slow');
		$(target + " .feedback-step-2").attr("aria-hidden","false");

		var hide_feedback_link = true;
	}

	//reset on modal close/hide
	$(target).on('hidden.bs.modal', function (e) {
		$(target + " textarea").val('');
		$(target + " .stars").raty('set');
		$(target + " .feedback-step-1").show();
		$(target + " .feedback-step-2").hide();
		$(target + " .star-rating .validation").empty();

		if (hide_feedback_link == true) {
			$(".feedback-link-container").fadeOut('slow');
		}
	})
}


function autoCorrectHandler(target) {
	var target_id = $(target).closest('li.chat-bubble.autocorrect')[0].id;
	var autocorrection  = $.grep(autocorrections, function(e){ return e.id == target_id; })[0];
	var locations = autocorrection.locations;
	var content = autocorrection.content;
	$("#" + target_id).addClass('status-incorrect');
	socket.emit('sendchat', "<!--<span class='autocorrect-marker'></span>-->The location suggestion was not correct.", 'autocorrect_reset', locations);
}


function Widget(type, data, index, content, timestamp) {
    this.type = type;
  	this.data = data;
    this.index = index;
    this.content = content;
  	this.id = "widget-" + $('[id^="widget-"]').length.toString();
  	this.response = {};
  	this.timestamp = timestamp;
  	this.renderWidget = renderWidget;
  	this.widgetAction = widgetAction;
}

function makeWidget(widget_type, data, index, content, chat_message_timestamp) {
  //Variables
  var index = index || "0";
  var content = content || "";

	//Create new widget
	var widget = new Widget(widget_type, data, index, content, chat_message_timestamp);

	//Process widget data
	widget.renderWidget();

	//Add action listeners
	widgetAction(widget);
}

function renderWidget() {
	//create widget structure
	var widget_output;
	var custom_class = "widget";
	var user = "user";

	switch (this.type) {
		case "yes-no":
			user = "vera";
			custom_class += " yes-no";
			widget_output =
				'<div class="row">' +
        '<div class="col-xs-12">' +
        this.data +
        '</div><!-- /.col -->' +
        '</div><!-- /.row -->' +

        '<div class="row feedback-buttons">' +
        '<div class="col-xs-12">' +
          '<button class="btn btn-secondary feedback-yes">Yes</button> ' +
          '<button class="btn btn-secondary feedback-no">No</button>' +
        '</div><!-- /.col -->' +
        '</div><!-- /.row -->';
    break;
    case "faq":
      user = "vera";
      custom_class += " faq";
      content = this.content;
      answer_arr = this.data;
      index = parseInt(this.index);
      display_answer = answer_arr[index];
      question = display_answer.faq_question;
      answer = display_answer.faq_answer;
      widget_output =
        '<p>' + content + '</p>' +
        '<div class="well">' +
          '<div class="well-header">' +
              '<div class="well-header-icon icon-faq"></div>' +
              '<div class="well-header-content">From our FAQ</div>' +
          '</div>' +
          '<div class="well-content">' +
            '<h3>' + question + '</h3>' +
            '<p>' + answer + '</p>' +
          '</div> <!-- /.well-content -->' +

          '<div class="readmore-toggle">' +
          '<a href="#" class="more" onclick="readMoreHandler(this);">Read More <span class="icon icon-arrow-down" aria-hidden="true"></span></a>' +
        '</div>' +
        '</div> <!-- /.well -->' +
        '<div class="widget-feedback">' +
        '<div class="row">' +
              '<div class="col-xs-12">' +
                '<button class="btn btn-secondary not-helpful"><i class="fa fa-thumbs-o-down" aria-hidden="true"></i> This answer was not helpful </button>' +
              '</div>' +
          '</div> <!-- /.row -->' +
        '</div> <!-- /.widget-feedback -->';
    break;
    case "faq-www":
      user = "vera";
      custom_class += " faq www";
      content = this.content;
      answer_arr = this.data;
      index = parseInt(this.index);
      display_answer = answer_arr[index];
      link_title = display_answer.faq_question;
      link_url = display_answer.faq_answer;
      widget_output =
        '<p>' + content + '</p>' +
        '<div class="well">' +
          '<div class="well-header">' +
              '<div class="well-header-icon icon-www"></div>' +
              '<div class="well-header-content">From Cathaypacific.com</div>' +
          '</div>' +
          '<div class="well-content">' +
            '<h3><a href="' + link_url + '" target="_blank" alt="' + link_title + '"> ' + link_title + ' <span class="icon icon-newpage" aria-hidden="true" aria-label="opens in a new window"></span></a></h3>' +
            '<p>This link will open in a new window</p>' +
          '</div> <!-- /.well-content -->' +
          '<div class="readmore-toggle">' +
          '<a href="#" class="more" onclick="readMoreHandler(this);">Read More <span class="icon icon-arrow-down" aria-hidden="true"></span></a>' +
        '</div>' +
        '</div> <!-- /.well -->' +
        '<div class="widget-feedback">' +
        '<div class="row">' +
              '<div class="col-xs-12">' +
                '<button class="btn btn-secondary not-helpful"><i class="fa fa-thumbs-o-down" aria-hidden="true"></i> This answer was not helpful </button>' +
              '</div>' +
          '</div> <!-- /.row -->' +
        '</div> <!-- /.widget-feedback -->';
    break;
	}
	manageChatWindow(widget_output, this.timestamp, ".chat-window", user, false, this.id, custom_class);

	$('.widget.faq .well').readmore('.widget.faq .well', {
  		speed: 500,
  		moreLink: '',
  		lessLink: '',
      afterToggle: function(trigger, element, expanded) {
        if(! expanded) { // The "Close" link was clicked
        $('html, body').animate( { scrollTop: element.offset().top }, {duration: 100 } );
    }
  }
	});
}

function widgetAction(widget) {
	switch (widget.type) {
		case "yes-no":
			var response = "";
			$("#" + widget.id + " button" ).click(function() {
  			if ($(this).hasClass('feedback-yes')) {
  				response = "Yes";
  			} else if ($(this).hasClass('feedback-no')) {
  				response = "No";
  			}
  			
  			//Update UI
  			$("#" + widget.id).addClass('selected');
  			socket.emit('sendchat', response);			
	  	});

      case "faq":
      case "faq-www":
        $("#" + widget.id + " .not-helpful" ).click(function() {
          //Send data back to Mikita
          socket.emit('sendchat',"<!--<span class='autocorrect-marker'></span>--> This answer was not helpful",widget.type, widget);
          //Update UI
          $("#" + widget.id).addClass('selected');
        });
      break;
	}
}

function setWidgetSelected() {
  //EXTEND THIS FUNCTION
	$(".widget").last().addClass('selected');
}

function readMoreHandler(toggle_target) {
  var target_well = "#" + $(toggle_target).closest('.widget').attr('id') + " .well";
	console.log(target_well);
  $(target_well).readmore(target_well, 'toggle');
  $(target_well).toggleClass('expanded');


	if ($(toggle_target).hasClass("more")) {
		$(toggle_target).removeClass("more").addClass("less");
		$(toggle_target).html('<span class="icon icon-arrow-up" aria-hidden="true"></span> Collapse');
	} else if ($(toggle_target).hasClass("less")) {
		$(toggle_target).removeClass("less").addClass("more");
		$(toggle_target).html('<span class="icon icon-arrow-down" aria-hidden="true"></span> Read More');

		//SCROLL TO TOP
	}
}
