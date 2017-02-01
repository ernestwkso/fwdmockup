var socket = io();

$(document).ready(function() {

    $( "#faq_search_input" ).keypress(function(e) {
        if(e.keyCode === 10 || e.keyCode === 13) {
            e.preventDefault();
            submit();
        }
    });
});

socket.on('translateTextResult',function(row,err){
    if (err && err["err"]) {
        alert(err["err"]);
    }else{
        document.getElementById('answers').innerHTML = row;
    }
});

function submit(){
    var question = document.getElementById("faq_search_input").value;

    var lan = 'en';
    var params = window.location.href.split("?");
    if (params.length >= 2){
        var paramStr = params[1];
        var paramAry = paramStr.split("&");
        var paramsMap = {};
        paramAry.forEach(function (p) {
            var v = p.split("=");
            paramsMap[v[0]]=decodeURIComponent(v[1]);
        });
        if (paramsMap && paramsMap["lan"]) {
          lan = paramsMap["lan"];
        }
    }
    socket.emit('translateText',question,lan);
}

function askAnotherQuestion() {
    $('#answers').html('');
    $('#faq_search_input').val('');
}
