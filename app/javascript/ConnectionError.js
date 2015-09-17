var timeout;
var oldKeyHandle=null;
var isSwedish=true;
var ConnectionError =
{
   
};

ConnectionError.init = function()
{
	 var html = '<div class="error-content">';
	 html += '<ul>';
	 html += '<li class="btext"><a href="#">Connection error, can\'t connect.</a></li>';
	 // html += '<li id="breturn" class="selected"><a href="#">Retry</a></li>';
	 html += '</ul>';
	 html += '</div>';
	 $(".slider-error").html(html);
    return true;
};



ConnectionError.show = function(hide)
{
	
	if (Buttons.getKeyHandleID() != 9 && !hide) {
            if ($('.bottomoverlaybig').is(':visible')) {
                $('.bottomoverlaybig').html('Network Error!');
                return;
            } else {
                oldKeyHandle = Buttons.getKeyHandleID();
		Buttons.setKeyHandleID(9);
            }
	}
        else if (oldKeyHandle) {
		Buttons.setKeyHandleID(oldKeyHandle);
                oldKeyHandle = null;
	}
	$(".slider-error").slideToggle(500, function() {});	

};





