var tvKey = new Common.API.TVKeyValue();
var input = null;
var search_text = "";

var timeout;
var oldKeyHandle = 0;
var Search =
{
   
};

function Input(/**Object*/id)
{
    alert("Input called:" + id);
    // var parent = null;
    var imeReady = function()
    {
        installFocusKeyCallbacks();
        installStatusCallbacks();
        // document.getElementById(id).focus()
        Search.imeReady();
    };
    var self = this;   
    var ime = new IMEShell(id, imeReady, 'sv');
    var element = document.getElementById( id );
    var installFocusKeyCallbacks = function() 
    {
        ime.setKeyFunc(tvKey.KEY_RETURN, onReturn);
        ime.setKeyFunc(tvKey.KEY_EXIT, onReturn); 
        ime.setKeyFunc(tvKey.KEY_ENTER, onEnter); //do
        ime.setKeyFunc(tvKey.KEY_RED, onRed); 
    };
    
    var installStatusCallbacks = function()
    {
        // ime.setKeySetFunc('12key'); 
        ime.setKeypadPos(350, 155);
        ime.setWordBoxPos(290, -1);
        // ime.setKeypadPos(350, 169);
        // ime.setQWERTYPos(215, 169);
    };
    
    var onEnter = function(string)
    {
        Search.imeShow(0);
	setLocation('SearchList.html?sok=' + $('#ime_write').val());
	return true;
    };

    var onReturn = function() {
        Search.imeShow();
	return true;
    };

    var onRed = function() {
        ime.setString("");
        return true
    };
}

Search.init = function()
{
	var ime_html = '<div class="imesearch-content">';
	ime_html += '<div class="input_bg">';
        ime_html += '    <form id="searchForm" onSubmit="return false;">';
	ime_html += '        <input id="ime_write" type="text" class="footer_input" maxlength="256" />';
	ime_html += '    </form>';
	ime_html += '</div>';
	ime_html += '</div>';
	$('.slider-imesearch').html(ime_html);
    return true;
};

Search.imeShow = function(slideDuration)
{
    if (slideDuration == undefined)
        // Default value
        slideDuration = 500

    alert("Search.imeShow called:" + slideDuration);
    if(Buttons.getKeyHandleID()!=7){
        oldKeyHandle = Buttons.getKeyHandleID();
        Buttons.setKeyHandleID(7);
        $(".slider-imesearch").slideToggle(slideDuration, function() {
            // Position of input box gets messed up in case focus is called too soon (at least in 2012 simulator).
            if (Buttons.getKeyHandleID() == 7)
                document.getElementById("ime_write").focus();
        });

        // pluginAPI.registIMEKey()
        if(input == null)
        {
            if (search_text) {
	        $('#ime_write').val(search_text);
            }

            try {
                input = new Input("ime_write");
            }
            catch(err) {
                Search.imeShow();
            }
        }
        else {
            Search.imeReady();
        }
    }
    else{
        $(".slider-imesearch").slideToggle(slideDuration, function() {});
        document.getElementById("ime_write").blur()
        document.body.focus();
        Buttons.setKeyHandleID(oldKeyHandle); 
        Buttons.enableKeys();
    }
};

Search.imeReady = function()
{
    true;
    // document.getElementById("ime_write").focus();
};

Search.hide = function()
{
	if(Buttons.getKeyHandleID()==4){
		Buttons.setKeyHandleID(oldKeyHandle);
		$(".slider-search").slideToggle(500, function() {});	
	}
        else if (Buttons.getKeyHandleID()==7){
            Search.imeShow();
        }
};