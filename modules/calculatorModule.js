var _ = require('underscore');
var luisModule = require('./luisModule.js');

/*****
Globally declared random set of questions
****/

const QUESTIONS = {
	"START_QUESTION": [
		"How can I help you today?"
	],
	"ASK_FOR_COVERAGE":[
		"What type of coverage would you like to inquire about? (Hospitalization, Outpatient, or Dental)"
	],
	"ASK_FOR_OUTPATIENT_TYPE_SERVICE": [
		"Can you provide 9 digit <strong>FWD Policy Number</strong>?"
	],
	"ASK_FOR_TYPE_HEALTH_INSURANCE": [
		"What type of Outpatient coverage are you looking for? (Physician, Physiotherapist / Chiropractor, Specialist, Chinese Medicine Practitioner, or Diagnostic X-Ray / Lab Tests?)"
	],
	"ASK_FOR_OUT_PATIENT_SERVICE": [
		"Which Outpatient service you want to know?<span class='help-text'>(Physician, Physiotherapist / Chiropractor, Specialist, Chinese Medicine Practitioner, Diagnostic X-Ray / Lab Test)</span>"
	],
	"ASK_FOR_DIFFERENT_TYPE": [
		"Which other service you want to know?<span class='help-text'>(Physician, Physiotherapist / Chiropractor, Specialist, Chinese Medicine Practitioner, Diagnostic X-Ray / Lab Test)</span>"
	],
	"ASK_FOR_SERVICE": [
		"What kind of services you want to know?<span class='help-text'>(Coverage, Benefit Used / Benefit Remaining , Claim Steps)</span>"
	],
	"ASK_FOR_FINAL_SERVICE": [
		"What kind of services you want to know?<span class='help-text'>(Coverage, Benefit Used / Benefit Remaining , Claim Steps)</span>"
	],
	"DO_NOT_UNDERSTAND": [
		"I'm sorry,  but I didn't understand your answer.",
		"I unfortunately did not understand that but I will try my best to learn it in the future.",
		"Apologies, but I didn't quite understand that. I'll look into learning that phrase shortly."
	],
	"COVERAGE_DETAILS":[
		"Great. Here are your coverage details for Specialist care: <br> Cover Limit: (HK$) 400 <br> Reimbursement: 100% <br> Network co-payment per visit: 0 <br> Max. no. of visits per policy year: 30"
	],
	"POLICY_SUMMARY":[
		"And for your policy, here is a summary of the benefits used and benefits remaining for this policy year: <br> No. of visits claimed: 8 <br> Max. no. of visits remaining: 22",
		"And for your policy, here is a summary of the benefits used and benefits remaining for this policy year: <br> No. of visits claimed: 6 <br> Max. no. of visits remaining: 20"
	],
	"SPECIALIST_SEARCH":[
		"Would you like to search for any specialists in your area?"
	],
	"TYPE_OF_SPECIALIST":[
		"Great. What type of Specialist are you looking for?"
	],
	"LIST_OF_DIABETES_DOC":[
		"Sure. Here is the list of Endocrinologists ('Diabetes doctor') in your area:"
	],
	"DOC_LIST":[
		"ABC Doc name"
	],
	"TRANSACTION_EXCEEDED_FROM_LUIS":[
		"I am sorry but I am quite busy at the moment. Can you re-send your last message?",
		"Apologies, but things are quite busy at this end. Could you kindly re-send your last message?"
	],
	"GOOD_BYE":[
		"Goodbye and have a great day!",
		"Bye! I look forward to chatting again soon!",
		"Take care and talk to you soon!"
	],
	"APOLOGY_FOR_REPEATING_QUESTION":[
	    "I am sorry, but I didn't understand your answer.",
		"I unfortunately did not understand your answer.",
		"Apologies, but I didn't quite understand that."
	],
	"HAPPY_TO_HELP":[
		"Sure, I would be happy to help you!"
	],
	"COVERAGE_ENQUIRY":[
		"I see here that you have an Employee Benefits Health policy with us at FWD. What type of coverage would you like to inquire about? (Hospitalization, Outpatient, or Dental)"
	],
	"RESTART":[
		"Do you want to ask another question?"
	],
	"THANK_YOU":[
		"Thank you for chatting with us. See you next time!",
		"If you have any question, you can ask me at any time!"
	],
	"NO_PHYSIOTHERAPIST_COVERAGE":[
		"I'm sorry, it appears you do not have Physiotherapist coverage in your policy."
	],
	"INFO_PHYSIOTHERAPIST_COVERAGE":[
		"Would you like some information on a policy with Physiotherapist coverage?"
	],
	"RELEVANT_POLICY":[
		"Sure, I would be happy to help you. Here is the information on the relevant policy."
	],
	"HEALTH_POLICY_OPTION":[
		"Please refer to this: <a> https://www.fwd.com.hk/en/protect/health-accident/medical/ </a>"
	]

};


/*****
Actual Model functionality
****/

var cCalculatorModule = function (){
	var that = {};

	var isDevelopmentMode = false;
	
    var isCalculationInProgress = true;
	var extractionEngine = null;
	var extractsFromQuestion = {};
	var isLog = true;
	// set by default infant question to yes
	extractsFromQuestion.QTAG5 = 'yes';
	var responseCallback = null;
	var currentQuestion = "";
	var currentQuestionBackup;
	var platformValue = 'WEB';
	var isLocationConflict = false;
	var autoCorrectedString = [];
	var identifiedAndCorrectedLocation = {};

	var entityToIgnore = [];

	var currentInputQuestion;
	var lastInputQuestion;
	var delayAccumulated;

	var shouldLearnLocation = false;
	var isLearningLocation = false;

	// constants

	var NODATAFOUND = "No Data Found";
	var LOCATIONINVALID = "LocationInvalid";

	// Greeting / Help
	var isHelpQuestionAsked = false;
	var isFAQIntentQuestionAsked;

	var userInputQuestion;
	var TOTAL_SPACE_IN_STATEMENT = 2;

	var log = function(msg) {
		console.log(msg);
	}

	var callback = function(questionKey, extraDelay) {
		var delay;
		var sequence = require('sequence').Sequence.create();
		sequence
			.then(function(next) {
				if (process.env.VERA_ENV == 'DEV') {
					if((questionKey == "ASK_FOR_VALID_ORI_LOCATION" || questionKey == "DO_NOT_UNDERSTAND" 
						|| questionKey == "ASK_FOR_VALID_DEST_LOCATION" || questionKey == "ASK_FOR_VALID_OD_LOCATION") && (currentQuestion != "LOCATION_CONFLICT")){
						verifyQithKnowledgeBase(userInputQuestion,function(result){
							if(result){

								if (!extraDelay) {
									extraDelay = 1;
								}

						        if (currentInputQuestion != lastInputQuestion) {
						        	lastInputQuestion = currentInputQuestion;
						        	delayAccumulated = 0;
						        	delay = getRandomDelay(result) + extraDelay;
						        }
						        else {
									delay = delayAccumulated + extraDelay; // for now, always add 100ms  
						        }

								delayAccumulated = delay;

								fetchCorrectQuestion(result,delay);
								displayNextPromptQuestion();
							}else{
								next();
							}
							
						});
					}else{
						if(currentQuestion == "LOCATION_CONFLICT"){
							if(questionKey == "ASK_FOR_VALID_ORI_LOCATION"){
								questionKey = "ASK_FOR_POLICY_NUMBER";
							}else if(questionKey == "ASK_FOR_VALID_DEST_LOCATION"){
								questionKey = "ASK_FOR_TYPE_HEALTH_INSURANCE";
							}
						}
						next();
						
					}
				}else{
					next();
				}

				})
			.then(function(next) {
				delay = fetchCorrectQuestion(questionKey,extraDelay);

				return delay;

			});
	}


	var fetchCorrectQuestion = function(questionKey,extraDelay){
		log('questionKey in fetchCorrectQuestion:::'+questionKey);
		currentQuestion = questionKey;
		var question = getRandomQuestion(questionKey);

		if (!extraDelay) {
			extraDelay = 1;
		}

        if (currentInputQuestion != lastInputQuestion) {
        	lastInputQuestion = currentInputQuestion;
        	delayAccumulated = 0;
        	delay = getRandomDelay(question) + extraDelay;
        }
        else {
			delay = delayAccumulated + extraDelay; // for now, always add 100ms  
        }

		delayAccumulated = delay;

		if (responseCallback) {
			responseCallback(question, delay);
		}
	}


	var getRandomDelay = function(text) {
		// no. of characters to type / 20 * 1s + random (0~1s), cap it to max 3s
		var delay = Math.floor(Math.random() * 500); 
		delay += (JSON.stringify(text).length / 20) * 1000;
		delay = Math.min(delay, 3000);

		if (isDevelopmentMode) {
			delay = 0;
		}

		return delay;
	}

	 var getRandomQuestion = function(questionKey) {
		log(questionKey);
		var question = questionKey;

		var questions = QUESTIONS[questionKey];

		if (questions) {
			question = questions[Math.floor(Math.random() * questions.length)];
		}
		return question;
	}

	
	
	that.askChatBot = function(question, platform, widgetType,widgetData,callbackHandler) {
		log("askChatBot(): question=" + question);

		responseCallback = callbackHandler;
		platformValue = platform;
		userInputQuestion = question;

		currentInputQuestion = question;

		if(widgetType == null && question.trim() != '' && question.length > 0){

			//call LUIS NLC
			getClassifier(question,function(classifierResponse){
				var intent = classifierResponse["intent"];
				console.log("intent:::"+intent);
				if (intent == "medicalIntent") {
					isCalculationInProgress = true;
					calculateInformation(question,classifierResponse);
				} else if(intent == "greetings"){
					callback("Hello");
					callback("START_QUESTION");
				}
				else {
					//seems some other intent
					callback("DO_NOT_UNDERSTAND");
				}
				
				
			},function(failureResponse){
				if(failureResponse == '429'){
					callback("TRANSACTION_EXCEEDED_FROM_LUIS");
				}else{
					callback(failureResponse);
				}
			});
		}
	}

	var cExtractionEngine = function() {
		var that = {};

		that.extractBookingRef = function(question) {
			var bookingRef = null;

			if (question) {
				var tokens = question.split(/[^A-Za-z0-9]/);
				tokens.some(function(word) {
					var re = /\b((?=.*\d)(?=.*[A-Za-z])[A-Za-z0-9]{6})\b/; 
					var m;

					if ((m = re.exec(word)) !== null) {
					    if (m.index === re.lastIndex) {
					        re.lastIndex++;
					    }
						bookingRef = m[0];

						return true;
					}
				})
			}

			return bookingRef;
		}

		return that;
	}

	var calculateInformation = function(question,classifierResponse){
		console.log('in calculateInformation');

		if(extractsFromQuestion.QTAG1 == null &&
			extractsFromQuestion.QTAG2 == null &&
			extractsFromQuestion.QTAG3 == null &&
			extractsFromQuestion.QTAG4 == null && 
			extractsFromQuestion.INTENT == null){
			
			extractsFromQuestion.INTENT = "MEDICAL_INTENT";
			callback("HAPPY_TO_HELP");
			callback("COVERAGE_ENQUIRY");
		}else if(extractsFromQuestion.QTAG1 == null ||
			extractsFromQuestion.QTAG2 == null ||
			extractsFromQuestion.QTAG3 == null ||
			extractsFromQuestion.QTAG4 == null ||
			extractsFromQuestion.QTAG5 == null){
			
			extractionOfParameters(question,classifierResponse);
		}
	}

	var apologiesForRepeating = function(attemptedCallbackStr){
		if (attemptedCallbackStr == currentQuestion) {
			callback("APOLOGY_FOR_REPEATING_QUESTION");
		}
	}

	var showQuestion = function(questionType){
		apologiesForRepeating(questionType);
		callback(questionType);
	}


	var extractionOfParameters = function(question,classifierResponse){
		console.log('in extractionOfParameters');
		processInformation(question,classifierResponse,function(){

				log('------------------');
				log(extractsFromQuestion);

				if(extractsFromQuestion.RESTART != null && extractsFromQuestion.RESTART == 'yes'){
					clearProfile();
					extractsFromQuestion.INTENT = "MEDICAL_INTENT";
					showQuestion("ASK_FOR_COVERAGE");
					extractsFromQuestion.RESTART = '';
				}else if(extractsFromQuestion.RESTART != null && extractsFromQuestion.RESTART == 'no'){
					clearProfile();
					showQuestion("THANK_YOU");
					extractsFromQuestion.RESTART = '';
				}else if(extractsFromQuestion.QTAG1 == null){
					showQuestion("ASK_FOR_COVERAGE");

				}else if(extractsFromQuestion.QTAG2 == null){
					showQuestion("ASK_FOR_TYPE_HEALTH_INSURANCE");
				}else if(extractsFromQuestion.QTAG1 != null && 
						extractsFromQuestion.QTAG2 != null && 
						extractsFromQuestion.QTAG1 == "outpatient" &&
						extractsFromQuestion.QTAG2 == "specialist" &&
						extractsFromQuestion.SPECIALIST_SEARCH == null){
						showQuestion("COVERAGE_DETAILS");
						showQuestion("POLICY_SUMMARY");
						showQuestion("SPECIALIST_SEARCH");
				}else if(extractsFromQuestion.QTAG1 != null && 
						extractsFromQuestion.QTAG2 != null && 
						extractsFromQuestion.QTAG1 == "outpatient" &&
						extractsFromQuestion.QTAG2 == "physiotherapist" &&
						extractsFromQuestion.PHYSIOTHERAPIST_COVERAGE == null){
						showQuestion("NO_PHYSIOTHERAPIST_COVERAGE");
						showQuestion("INFO_PHYSIOTHERAPIST_COVERAGE");
				}else if(extractsFromQuestion.QTAG1 != null && 
						extractsFromQuestion.QTAG2 != null && 
						extractsFromQuestion.QTAG1 == "outpatient" &&
						extractsFromQuestion.QTAG2 == "physiotherapist" &&
						extractsFromQuestion.PHYSIOTHERAPIST_COVERAGE == "yes"){
						showQuestion("RELEVANT_POLICY");
						showQuestion("HEALTH_POLICY_OPTION");
						showQuestion("THANK_YOU");
				}else if(extractsFromQuestion.QTAG1 == "outpatient" &&
						extractsFromQuestion.QTAG2 == "specialist" &&
						extractsFromQuestion.SPECIALIST_SEARCH == "yes" &&
						extractsFromQuestion.TYPE_OF_SPECIALIST == null){
					showQuestion("TYPE_OF_SPECIALIST");
				}else if(extractsFromQuestion.QTAG1 == "outpatient" &&
						extractsFromQuestion.QTAG2 == "specialist" &&
						extractsFromQuestion.SPECIALIST_SEARCH == "no" &&
						extractsFromQuestion.TYPE_OF_SPECIALIST == null){
					showQuestion("RESTART");
				}else if(extractsFromQuestion.QTAG1 == "outpatient" &&
						extractsFromQuestion.QTAG2 == "specialist" &&
						extractsFromQuestion.SPECIALIST_SEARCH == "yes" &&
						extractsFromQuestion.TYPE_OF_SPECIALIST != null){
					showQuestion("LIST_OF_DIABETES_DOC");
					showQuestion({"showDoc":true});
					showQuestion("RESTART");
				}else if(extractsFromQuestion.QTAG3 == null){
					showQuestion("ASK_FOR_OUT_PATIENT_SERVICE");
				}else if(extractsFromQuestion.QTAG4 == null){
					showQuestion("ASK_FOR_FINAL_SERVICE");
				}else{
					var request = {};
					request.origin = extractsFromQuestion.QTAG1;
					request.destination = extractsFromQuestion.QTAG2;
					request.classType = extractsFromQuestion.QTAG3;
					request.tierType = extractsFromQuestion.QTAG4;
					request.infantType = extractsFromQuestion.QTAG5;

					if(request.origin != null && 
					   request.destination == 'outpatient' &&
					   request.classType == 'chinese medicine practitioner' &&
					   request.tierType == 'coverage'){
					   callback("According to your policy, FWD medical insurance protects you with 30 times of network doctor visit or HK$100 claim for non-networked doctor visit within a year");
					}

					else if(request.origin != null && 
					   request.destination == 'outpatient' &&
					   request.classType == 'specialist' &&
					   request.tierType == 'coverage'){
					   callback("According to your policy, FWD medical insurance protects you with 30 times of network doctor visit or HK$200 claim for non-networked doctor visit within a year");
					}

					else if(request.origin != null && 
					   request.destination == 'outpatient' &&
					   request.classType == 'physician' &&
					   request.tierType == 'claim'){
					   callback("According to your policy, FWD medical insurance protects you with 30 times of network doctor visit or HK$250 claim for non-networked doctor visit within a year");
					}else{
						callback("According to your policy, FWD medical insurance protects you with 30 times of network doctor visit or HK$300 claim for non-networked doctor visit within a year");
					}
				}
           });
	}

	
	var processInformation = function(question,classifierResponse,callbackFunc){
		log('in processInformation');
		var preExtractsFromQuestionStr = JSON.stringify(extractsFromQuestion);
		
		var sequence = require('sequence').Sequence.create();
		sequence
			.then(function(next) {
				console.log("currentQuestion");
				console.log(currentQuestion);
				if(extractsFromQuestion.QTAG1 == null){
					console.log("Enters in QTAG1 check...");
					var entities = classifierResponse["entities"];

					for(var i=0;i<entities.length;i++){
						var entity = entities[i]['type'];
						console.log("entity:::"+entity);
						if(entity == "medicalBenefit"){
							if(entity == "medicalBenefit" && entities[i]['entity'] == "outpatient"){
									extractsFromQuestion.QTAG1 = entities[i]['entity'];
									break;
							}else{
								callback("DO_NOT_UNDERSTAND");
							}
							break;
						}
					}
					callbackFunc();
				}else{
					next();
				}
			})
			.then(function(next) {
					console.log('comes here in QTAG2 check...');
					if(currentQuestion == 'ASK_FOR_TYPE_HEALTH_INSURANCE'){
						console.log('got current question correct');
						var entities = classifierResponse["entities"];
						for(var i=0;i<entities.length;i++){
							var entity = entities[i]['type'];
							console.log("entity:::"+entity);
							if(entity == "medicalBenefit" && entities[i]['entity'] == "specialist"){
									extractsFromQuestion.QTAG2 = entities[i]['entity'];
									break;
							}else if(entity == "medicalBenefit" && (entities[i]['entity'] == "physiotherapist") || 
																	(entities[i]['entity'] == "physio") ||
																	(entities[i]['entity'] == "physical therapy")){
									extractsFromQuestion.QTAG2 = "physiotherapist";
									break;
							}
						}
						console.log("returns from qtag2 check");
						callbackFunc();
					}else{
						next();
					}
				}
			)
			.then(function(next) {
					console.log('2222');
					if(currentQuestion == 'SPECIALIST_SEARCH'){
						if(question == "yes" || question == "sure" || question == "ofcourse"){
							extractsFromQuestion.SPECIALIST_SEARCH = "yes";
						}else{
							extractsFromQuestion.SPECIALIST_SEARCH = "no";
						}
						callbackFunc();
					}else{
						next();
					}
				}
			)
			.then(function(next) {
				console.log('33333');
					console.log("currentQuestion:::"+currentQuestion);
					if(currentQuestion == 'TYPE_OF_SPECIALIST'){
						var entities = classifierResponse["entities"];
						for(var i=0;i<entities.length;i++){
							var entity = entities[i]['type'];
							console.log("GOT ENTTITY TYPE");
							console.log("entity:::"+entity);
							if(entity == "doc"){
								extractsFromQuestion.TYPE_OF_SPECIALIST = entities[i]['entity'];
								break;
							}
						}
						callbackFunc();
					}else{
						next();
					}
				}
			)
			.then(function(next, result) {
				console.log('44444');
				if(currentQuestion == 'RESTART'){
					if(question == "yes" || question == "sure" || question == "ofcourse"){
						extractsFromQuestion.RESTART = "yes";
					}else{
						extractsFromQuestion.RESTART = "no";
					}
					callbackFunc();
				}else{
					next();
				}
			})
			.then(function(next) {
				console.log('5555');
					console.log("currentQuestion:::"+currentQuestion);
					if(currentQuestion == 'INFO_PHYSIOTHERAPIST_COVERAGE'){
						if(question == "yes" || question == "sure" || question == "ofcourse"){
							extractsFromQuestion.PHYSIOTHERAPIST_COVERAGE = "yes";
						}else{
							extractsFromQuestion.PHYSIOTHERAPIST_COVERAGE = "no";
						}
						callbackFunc();
					}else{
						next();
					}
				}
			)
		;
	}

	var processEntityFromLuis = function(question, type, value, score, callback) {
		log('processEntityFromLuis:' + type + ':' + value);

		if (type == "medicalBenefit") {
			console.log('found medical benefit ...');
			if (extractsFromQuestion.QTAG2 == null) {

				log('Found type == medicalBenefit');
				if(value == "Outpatient"){
					extractsFromQuestion.QTAG2 = value;
				}else{
					callback('ERROR - Cannot undesratnd this service at this moment');
				}
				
			}
		}else {
			callback();
		}
	}

	

	

	var clearProfile = function(){
        
        log("************CLEAR PROFILE***************");
		extractsFromQuestion.QTAG1 = null;
	    extractsFromQuestion.QTAG2 = null;
		extractsFromQuestion.QTAG3 = null;
		extractsFromQuestion.QTAG4 = null;
		extractsFromQuestion.QTAG5 = 'yes';
		extractsFromQuestion.INTENT = null;
		extractsFromQuestion.SPECIALIST_SEARCH=null;
		extractsFromQuestion.TYPE_OF_SPECIALIST=null;
		extractsFromQuestion.PHYSIOTHERAPIST_COVERAGE=null;
		extractsFromQuestion.MEMBERTIER = null;
		
		currentQuestion = "";
	}

	var handleSpecialCharacter = function(value,callback){
		value = value.replace(/\?/g,'');
		value = value.replace(/\+/g,'');
		value = value.replace(/\[/g,'');
		callback(value);
	}

	var getClassifier = function(question,returnSuccessResponse,failureResponse){
		console.log('in getClassifier');
		luisModule.nlc(question,function(predictClass){
		    log(predictClass);
		    returnSuccessResponse(predictClass);
		},function(err){
			log('in NLC returing error');
			log(err);
			failureResponse(err);
		});
	}

   	var init = function(){
		// initialize global variables and methods
		extractionEngine = new cExtractionEngine();
	}

    // for extractionEngineSpec.js
	that.getExtractionEngine = function(){
    	return extractionEngine;
    }

    that.setDevelopmentMode = function(isDev) {
    	isDevelopmentMode = isDev;
    }

    init();
   
    return that;
} 
module.exports = function() {
	return new cCalculatorModule();
}
