var tvKey = new Common.API.TVKeyValue();

var index = 0; // list = 0, details = 1, player = 2, kanaler = 3, search = 4, player2 = 5, language = 6, imeSearch = 7, blocked = 8, connection error = 9
var keyHeld = false;
var keyTimer;
var itemSelected;
var lastKey = 0;

var shift = false;
var capslock = false;
var rowCount = 1;
var keyCount = 0;
var first = true;
var channels = ['svt1', 'svt2', 'svt24', 'barnkanalen', 'kunskapskanalen'];
var channelId = 0;
var isLeft = 1;
var menuId = 0;
var resButton = ["#resauto", "#res1", "#res2", "#res3", "#res4", "#res5"];
var reslButton = ["#resl1", "#resl2", "#resl3", "#resl4", "#resl5"];
var langButton = ["#english", "#swedish"];
var animateCallbacked = 0;

var Buttons =
{
};
Buttons.keyDown = function()
{
	if(index == 0){
		this.keyHandleForList();
	}
	else if(index == 1)
	{
		this.keyHandleForDetails();
	}
	else if(index == 2){
		this.keyHandleForPlayer();
	}
	else if(index == 3){
		this.keyHandleForKanaler();
	}
	else if(index == 4){
		this.keyHandleForSearch();
	}
	else if(index == 5){
		this.getCurrentChannelId();
		this.keyHandleForPlayer2();
	}
	else if(index == 6){
		this.keyHandleForLanguage();
	}
	else if(index == 7){
		this.keyHandleForImeSearch();
	}
	else if(index == 8){
		this.keyHandleForGeofilter();
	}
	else if(index == 9){
		this.keyHandleForConnectionError();
	}
};

Buttons.getCurrentChannelId = function(){
	var url = document.location.href;
	for(var i = 0; i < channels.length; i++){
		if (url.indexOf(channels[i])>0)
		{
			channelId = i;
		}
	}
	
};

Buttons.setKeyHandleID = function(iid){
	index = iid;
};

Buttons.getKeyHandleID = function(){
	return index; 
};



Buttons.enableKeys = function()
{
	document.getElementById("anchor").focus();
};

Buttons.clearKey = function() 
{
    // Log("clearKey");
    lastKey = 0;
    keyHeld = false;
};

Buttons.sscroll = function(hide) 
{
    var xaxis = 0;
    if(columnCounter > 0){
	xaxis = columnCounter - 1;
    }
    xaxis = -xaxis * 260;
    animateCallbacked = 0;
    $('.content-holder').animate(
        {marginLeft: xaxis},
        {complete: function() 
         {
             animateCallbacked = animateCallbacked+1;
             if (!hide && animateCallbacked == 2 && !$("#content-scroll").is(':visible')) {
                 $("#content-scroll").show();
             }
         }
        }
    );
};

Buttons.keyHandleForList = function()
{
	var topItems = $('.topitem');
	var bottomItems = $('.bottomitem');
	var keyCode = event.keyCode;

        if (keyCode != lastKey) {
            window.clearTimeout(keyTimer);
            keyHeld = false;
        }

        if (keyCode != lastKey || keyHeld) {
                Log("Key handled: " + keyCode + " lastKey=" + lastKey);
                lastKey = keyCode;
                window.clearTimeout(keyTimer);
                if (keyHeld) {
                    // Use longer to avoid end up in "first repeat is ignored" again.
	            keyTimer = window.setTimeout(this.clearKey, 600);
                }
                else
	            keyTimer = window.setTimeout(this.clearKey, 300);

		if (!itemSelected) {
			itemSelected = topItems.eq(0).addClass('selected');
			columnCounter = 0;
		}
		switch(keyCode)
		{
			case tvKey.KEY_RIGHT:
                            if (keyHeld) {
                                itemSelected = nextInList(topItems, itemSelected, 4);
                            }
                            else {
                                itemSelected = nextInList(topItems, itemSelected, 1);
                            }
	                    break;

	                case tvKey.KEY_CH_UP:
                        case tvKey.KEY_PANEL_CH_UP:         
	                case tvKey.KEY_FF:
                        case tvKey.KEY_FF_:
                            itemSelected = nextInList(topItems, itemSelected, 4);
	                    break;
				
			case tvKey.KEY_LEFT:
                            if (keyHeld) {
                                itemSelected = prevInList(topItems, itemSelected, 4);
                            }
                            else {
                                itemSelected = prevInList(topItems, itemSelected, 1);
                            }
	                    break;

            	        case tvKey.KEY_CH_DOWN:
         	        case tvKey.KEY_PANEL_CH_DOWN:
	                case tvKey.KEY_RW:
                        case tvKey.KEY_REWIND_:
                            itemSelected = prevInList(topItems, itemSelected, 4);
	                    break;

			case tvKey.KEY_DOWN:
				if(isTopRowSelected && bottomItems.length > columnCounter){
                                        isTopRowSelected = false;
					itemSelected.removeClass('selected');
					itemSelected = bottomItems.eq(columnCounter).addClass('selected');
				}
				break;

			case tvKey.KEY_UP:				
		               if (!isTopRowSelected) {
                                   isTopRowSelected = true;
		                   itemSelected.removeClass('selected');
               		           itemSelected = topItems.eq(columnCounter).addClass('selected');				
                                }
				break;
			case tvKey.KEY_INFO:
			case tvKey.KEY_ENTER:
			case tvKey.KEY_PANEL_ENTER:
                        case tvKey.KEY_PLAY:
				var ilink = itemSelected.find('.ilink').attr("href");
				Log(ilink);
                                if (ilink != undefined)
                                {
                                    if (keyCode != tvKey.KEY_INFO && ilink.search("details.html\\?") != -1) {
                                        Buttons.playItem();
                                        break;
                                    }
                                    else if (keyCode == tvKey.KEY_INFO && ilink.search("details.html\\?") == -1) {
                                        // Info only relevant if episode, not if show.
                                        break;
                                    }
                                    
	                            setLocation(ilink);
                                }
                                else {
	                            itemSelected.removeClass('selected');
                                    itemSelected = false;
                                }
				break;
                default:
                    this.handleMenuKeys(keyCode);
                    return;
                    
		}
		this.sscroll();
        }
        else {
            Log("Key repeated, first time is ignored: " + keyCode + " KeyHeld:" + keyHeld);
            keyHeld = true;
            window.clearTimeout(keyTimer);
	    keyTimer = window.setTimeout(this.clearKey, 600);
        }
};

nextInList = function(topItems, itemSelected, steps)
{
    itemSelected.removeClass('selected');
    next = itemSelected.next();
    while(--steps > 0 && next.length > 0){
        if ((next.next()).length > 0)
        {
            columnCounter++;
            itemSelected = next.addClass('selected');
            itemSelected.removeClass('selected');
            next = itemSelected.next();
        }
    }

    if (next.length > 0) {
        columnCounter++;
	itemSelected = next.addClass('selected');
    } else {
	itemSelected = topItems.eq(0).addClass('selected');
	columnCounter = 0;
        isTopRowSelected = true;
    }
    return itemSelected;
};

prevInList = function(topItems, itemSelected, steps)
{
    itemSelected.removeClass('selected');
    prev = itemSelected.prev();
    while(--steps > 0 && prev.length > 0){
        if ((prev.prev()).length > 0)
        {
            columnCounter--;
            itemSelected = prev.addClass('selected');
            itemSelected.removeClass('selected');
            prev = itemSelected.prev();
        }
    }

    if (prev.length > 0) {
        columnCounter--;
	itemSelected = prev.addClass('selected');
    } else {
	itemSelected = topItems.last().addClass('selected');
	columnCounter = topItems.length - 1;
        isTopRowSelected = true;
    }
    return itemSelected;
};

Buttons.keyHandleForDetails = function()
{
    var keyCode = event.keyCode;
    switch(keyCode)
    {
    case tvKey.KEY_LEFT:
        if ($('#playButton').is(':visible')) {
	    isLeft = 1;
	    $('#playButton').addClass('selected');
	    $('#backButton').removeClass('selected');
        }
	break;
    case tvKey.KEY_RIGHT:
        if ($('#playButton').is(':visible')) {
	    isLeft = 0;
	    $('#backButton').addClass('selected');
	    $('#playButton').removeClass('selected');
        }
	break;
    case tvKey.KEY_ENTER:
    case tvKey.KEY_PANEL_ENTER:
	Log("enter");
	if(isLeft == 0 || !$('#playButton').is(':visible')) {
	    goBack();
	}
	else {
	    Details.startPlayer();
	}
	break;
	
    case tvKey.KEY_INFO:
	goBack();
	break;
    }
    this.handleMenuKeys(keyCode);
    
};

Buttons.keyHandleForLanguage = function()
{
	var keyCode = event.keyCode;
	if(menuId == 0){
		
		var li = 0;
		var lSel = -1;
		for(li = 0; li < langButton.length; li++){
			if($(langButton[li]).hasClass('selected')){
				$(langButton[li]).addClass('unselected');
				$(langButton[li]).removeClass('selected');
				lSel = li;
			}
		}
		switch(keyCode)
		{
			case tvKey.KEY_RIGHT:
				
				lSel++;
				if(lSel < langButton.length){
					$(langButton[lSel]).addClass('selected');
					$(langButton[lSel]).removeClass('unselected');
				}
				break;
			case tvKey.KEY_LEFT:
				lSel--;
				if(lSel >= 0){
					$(langButton[lSel]).addClass('selected');
					$(langButton[lSel]).removeClass('unselected');
				}
				break;
			case tvKey.KEY_ENTER:
			case tvKey.KEY_PANEL_ENTER:
				Log("enter");
				if(lSel == 1){
					$('#swedish').addClass('checked');
					$('#swedish').addClass('selected');
					$('#english').removeClass('checked');
					Language.setLanguage('Swedish');
					Language.setLang();
				}
				else if(lSel == 0){
					$('#english').addClass('checked');
					$('#english').addClass('selected');
					$('#swedish').removeClass('checked');
					Language.setLanguage('English');
					Language.setLang();
				}
				break;
			case tvKey.KEY_DOWN:
				menuId = 1;
				$('.res-content .title').addClass('stitle');
				$('.language-content .title').removeClass('stitle');
				break;
		}
		
	}
	else if(menuId == 1){
		var ri = 0;
		var cSel = -1;
		for(ri = 0; ri < resButton.length; ri++){
			if($(resButton[ri]).hasClass('selected')){
				$(resButton[ri]).addClass('unselected');
				$(resButton[ri]).removeClass('selected');
				cSel = ri;
			}
		}
		Log(cSel);
		switch(keyCode)
		{
			case tvKey.KEY_RIGHT:
				
				cSel++;
				if(cSel < resButton.length){
					$(resButton[cSel]).addClass('selected');
					$(resButton[cSel]).removeClass('unselected');
				}
				break;
			case tvKey.KEY_LEFT:
				cSel--;
				if(cSel >= 0){
					$(resButton[cSel]).addClass('selected');
					$(resButton[cSel]).removeClass('unselected');
				}
				break;
			case tvKey.KEY_ENTER:
			case tvKey.KEY_PANEL_ENTER:
				if(cSel > -1){
					Log("enter");
					var rj = 0;
					for(rj = 0; rj < resButton.length; rj++){
						if($(resButton[rj]).hasClass('checked')){
							$(resButton[rj]).removeClass('checked');
						}
					}
					$(resButton[cSel]).addClass('checked');
					$(resButton[cSel]).addClass('selected');
					Resolution.setRes(cSel);
				}
				break;
			case tvKey.KEY_UP:
				menuId = 0;
				$('.language-content .title').addClass('stitle');
				$('.res-content .title').removeClass('stitle');
				break;
			case tvKey.KEY_DOWN:
				menuId = 2;
				$('.res-live-content .title').addClass('stitle');
				$('.res-content .title').removeClass('stitle');
				break;
		}
		
	}
	else if(menuId == 2){
		var ri = 0;
		var cSel = -1;
		for(ri = 0; ri < reslButton.length; ri++){
			if($(reslButton[ri]).hasClass('selected')){
				$(reslButton[ri]).addClass('unselected');
				$(reslButton[ri]).removeClass('selected');
				cSel = ri;
			}
		}
		Log(cSel);
		switch(keyCode)
		{
			case tvKey.KEY_RIGHT:
				
				cSel++;
				if(cSel < reslButton.length){
					$(reslButton[cSel]).addClass('selected');
					$(reslButton[cSel]).removeClass('unselected');
				}
				break;
			case tvKey.KEY_LEFT:
				cSel--;
				if(cSel >= 0){
					$(reslButton[cSel]).addClass('selected');
					$(reslButton[cSel]).removeClass('unselected');
				}
				break;
			case tvKey.KEY_ENTER:
			case tvKey.KEY_PANEL_ENTER:
				if(cSel > -1){
					Log("enter");
					var rj = 0;
					for(rj = 0; rj < reslButton.length; rj++){
						if($(reslButton[rj]).hasClass('checked')){
							$(reslButton[rj]).removeClass('checked');
						}
					}
					$(reslButton[cSel]).addClass('checked');
					$(reslButton[cSel]).addClass('selected');
					Resolution.setLiveRes(cSel);
				}
				break;
			case tvKey.KEY_UP:
				menuId = 1;
				$('.res-content .title').addClass('stitle');
				$('.res-live-content .title').removeClass('stitle');
				break;
			
		}
		
	}
	this.handleMenuKeys(keyCode);
	
};

Buttons.keyHandleForImeSearch = function()
{
};

Buttons.keyHandleForSearch = function()
{
	var keys = $('.row' + rowCount);
    keys.eq(keyCount).removeClass('selected');
	var keyCode = event.keyCode;
	switch(keyCode)
	{
		case tvKey.KEY_LEFT:
			if (keyCount > 0) {
                keyCount--;
            }
			break;
		case tvKey.KEY_RIGHT:
			if (keyCount < keys.length - 1) {
                keyCount++;
            }
			break;
		case tvKey.KEY_UP:
			if (rowCount > 1) {
                rowCount--;
            }
			break;
		case tvKey.KEY_DOWN:
			if (rowCount < 5) {
                rowCount++;
            }
			break;
		case tvKey.KEY_ENTER:
		case tvKey.KEY_PANEL_ENTER:
			var $this = keys.eq(keyCount);
			if(first)
			{
				$('#write').val('');
				first = false;
			}
			var character = $this.html(); // If it's a lowercase letter, nothing happens to this variable
			Log(character);
        // Shift keys
        if ($this.hasClass('left-shift') || $this.hasClass('right-shift')) {
            $('.letter').toggleClass('uppercase');
            $('.symbol span').toggle();

            shift = (shift === true) ? false : true;
            capslock = false;
            break;
        }

        // Caps lock
        if ($this.hasClass('capslock')) {
            $('.letter').toggleClass('uppercase');
            capslock = true;
            break;
        }

        // Delete
        if ($this.hasClass('delete')) {
            var html = $('#write').val();

            $('#write').val(html.substr(0, html.length - 1));
            break;
        }

        // Special characters
        if ($this.hasClass('space')) character = ' ';
        if ($this.hasClass('tab')) character = "\t";
        if ($this.hasClass('return')) {
			setLocation('SearchList.html?sok=' + $('#write').val());
			return false;
		}

        // Uppercase letter
        if ($this.hasClass('uppercase')) character = character.toUpperCase();
		
		// Remove shift once a key is clicked.
        if (shift === true) {
            $('.symbol span').toggle();
            //if (capslock === false) $('.letter').toggleClass('uppercase');

            shift = false;
        }

        // Add the character
		Log("text " + $('#write').val() + character);
        $('#write').val($('#write').val() + character);
		break;
	}
	keys = $('.row' + rowCount);
	if (keyCount > keys.length - 1) {
		keyCount = keys.length - 1;
	}
	keys.eq(keyCount).addClass('selected');
	Log(keyCount);
	$('.keyboard').hide(0, function(){$(this).show();});
	this.handleMenuKeys(keyCode);
};

Buttons.keyHandleForKanaler = function()
{
	var keyCode = event.keyCode;
	switch(keyCode)
	{
		case tvKey.KEY_LEFT:
		isLeft = 1;
		$('#playButton').addClass('selected');
		$('#backButton').removeClass('selected');
		break;
		case tvKey.KEY_RIGHT:
		isLeft = 0;
		$('#backButton').addClass('selected');
		$('#playButton').removeClass('selected');
		break;
		case tvKey.KEY_ENTER:
		case tvKey.KEY_PANEL_ENTER:
			Log("enter");
			if(isLeft == 0){
			        goBack();
			}
			else{
				Kanaler.startPlayer();
			}
			break;
		
	}
	this.handleMenuKeys(keyCode);
	
};
Buttons.keyHandleForPlayer2 = function(){
		var keyCode = event.keyCode;
	switch(keyCode)
		{
			case tvKey.KEY_PAUSE:
				Player.togglePause();
				break;
			case tvKey.KEY_PLAY:
				Player.resumeVideo();
				break;
			case tvKey.KEY_STOP:
				Player.stopVideo();
				break;
			case tvKey.KEY_VOL_DOWN:
					Log("VOL_DOWN");
					Audio.setRelativeVolume(1);
				break;
			case tvKey.KEY_PANEL_VOL_DOWN:
				Log("VOL_DOWN");
					Audio.setRelativeVolume(1);
				break;
			case tvKey.KEY_VOL_UP:
				Log("VOL_UP");
				Audio.setRelativeVolume(0);
				break;
			case tvKey.KEY_PANEL_VOL_UP:
				Log("VOL_UP");
				Audio.setRelativeVolume(0);
				break;
			case tvKey.KEY_RETURN:
				widgetAPI.blockNavigation(event); 
				Player.stopVideo();
				break;
			case tvKey.KEY_CH_UP:
			case tvKey.KEY_PANEL_CH_UP:
				Log('ch up');
				Player.stopVideoNoCallback();
				if(channelId < channels.length - 1){
					channelId = channelId + 1;
					setLocation('kanaler.html?ilink=kanaler/' + channels[channelId] + '&history=Kanaler/' + channels[channelId] + '/&direct=1');
				}
				break;
			case tvKey.KEY_CH_DOWN:
			case tvKey.KEY_PANEL_CH_DOWN:
				Player.stopVideoNoCallback();
				if(channelId > 0){
					channelId--;
					setLocation('kanaler.html?ilink=kanaler/' + channels[channelId] + '&history=Kanaler/' + channels[channelId] + '/&direct=1');
				}
				break;
			case tvKey.KEY_INFO:
				Player.showDetails();
				break;
			 case tvKey.KEY_MUTE:
				Audio.toggleMute();
				break;
			}
};
Buttons.keyHandleForPlayer = function(){
    var keyCode = event.keyCode;
    switch(keyCode)
    {
    case tvKey.KEY_RIGHT:
        Player.skipLongForwardVideo();
	break;
    case tvKey.KEY_LEFT:
        Player.skipLongBackwardVideo();
	break;
    case tvKey.KEY_RW:
	Player.skipBackwardVideo();
	break;
    case tvKey.KEY_PAUSE:
	Player.togglePause();
	break;
    case tvKey.KEY_FF:
	Player.skipForwardVideo();
	break;
    case tvKey.KEY_CH_UP:
    case tvKey.KEY_PANEL_CH_UP:
    case tvKey.KEY_FF_:
	this.playNextItem(1);
	break;
    case tvKey.KEY_CH_DOWN:
    case tvKey.KEY_PANEL_CH_DOWN:
    case tvKey.KEY_REWIND_:
	this.playNextItem(-1);
	break;
    case tvKey.KEY_PLAY:
	Player.resumeVideo();
	break;
    case tvKey.KEY_STOP:
	Player.stopVideo();
	break;
    case tvKey.KEY_VOL_DOWN:
	Log("VOL_DOWN");
	Audio.setRelativeVolume(1);
	break;
    case tvKey.KEY_PANEL_VOL_DOWN:
	Log("VOL_DOWN");
	Audio.setRelativeVolume(1);
	break;
    case tvKey.KEY_VOL_UP:
	Log("VOL_UP");
	Audio.setRelativeVolume(0);
	break;
    case tvKey.KEY_PANEL_VOL_UP:
	Log("VOL_UP");
	Audio.setRelativeVolume(0);
	break;
    case tvKey.KEY_RETURN:
	widgetAPI.blockNavigation(event); 
	Player.stopVideo();
	break;
    case tvKey.KEY_EXIT:
    case tvKey.KEY_INFOLINK:
    case tvKey.KEY_HOME:
    case tvKey.KEY_MENU:
    case tvKey.KEY_PANEL_MENU:
    case tvKey.KEY_12:
    case tvKey.KEY_DISC_MENU:
	Player.stopVideo();
	// Terminated by force
	break;
    case tvKey.KEY_INFO:
	Player.showDetails();
	break;
    case tvKey.KEY_MUTE:
	Audio.toggleMute();
	break;
    case tvKey.KEY_RED:
	Player.toggleRepeat();
	break;
    case tvKey.KEY_BLUE:
    case tvKey.KEY_ASPECT:
    case tvKey.KEY_CALLER_ID:
    case tvKey.KEY_D_VIEW_MODE:
	Player.toggleAspectRatio();
	break;
    case tvKey.KEY_YELLOW:
    case tvKey.KEY_SUBTITLE:     
    case tvKey.KEY_SUB_TITLE:
	Player.toggleSubtitles();
	break;

    case tvKey.KEY_UP:
    case tvKey.KEY_DOWN:
	Player.moveSubtitles(keyCode == tvKey.KEY_UP);
	break;

    case tvKey.KEY_2:
    case tvKey.KEY_8:
	Player.sizeSubtitles(keyCode == tvKey.KEY_2);
	break;

    case tvKey.KEY_4:
    case tvKey.KEY_6:
	Player.separateSubtitles(keyCode == tvKey.KEY_6);
	break;
    default:
        Log("Unhandled key:" + keyCode);
    }
};


Buttons.keyHandleForGeofilter = function()
{
	var keyCode = event.keyCode;
	switch(keyCode)
	{
		
		case tvKey.KEY_ENTER:
		case tvKey.KEY_PANEL_ENTER:
	                history.go(-1);
			break;
		
	}
	this.handleMenuKeys(keyCode);
	
};

Buttons.keyHandleForConnectionError = function()
{
	var keyCode = event.keyCode;
	switch(keyCode)
	{
		
		case tvKey.KEY_ENTER:
		case tvKey.KEY_PANEL_ENTER:
			location.reload(true);
			break;
		
	}
	this.handleMenuKeys(keyCode);

};

Buttons.handleMenuKeys = function(keyCode){
	switch(keyCode)
		{
			case tvKey.KEY_RED: 
				setLocation('index.html');
				break;
			case tvKey.KEY_GREEN: 
				setLocation('categories.html');
				break;
			case tvKey.KEY_YELLOW:
				setLocation('live.html');
				break;
			case tvKey.KEY_BLUE:
				Language.hide();
                                Search.imeShow();
				break;
			case tvKey.KEY_RETURN:
				var urlpath = myLocation;
				var ifound = urlpath.indexOf('index.html');
				if(index == 6){
					widgetAPI.blockNavigation(event); 
					Language.hide();
				}
				else if(index == 4){
					widgetAPI.blockNavigation(event); 
					Search.hide();
				}
				else if(myHistory.length > 0) {
				// else if(ifound < 0){
					widgetAPI.blockNavigation(event); 
					goBack();
				}
				else{
					//terminate app
				}
				break;
			case tvKey.KEY_EXIT:
                        case tvKey.KEY_INFOLINK:
                        case tvKey.KEY_HOME:
                        case tvKey.KEY_MENU:
                        case tvKey.KEY_PANEL_MENU:
                        case tvKey.KEY_12:
                        case tvKey.KEY_DISC_MENU:
	            // Terminated by force
	            break;
			case tvKey.KEY_TOOLS:
				widgetAPI.blockNavigation(event); 
				Search.hide();
				Language.show();
				break;
			case tvKey.KEY_MUTE:
				Audio.uiToggleMute();
				break;
			 break;
		}
};


Buttons.playItem = function() {
    var duration  = itemSelected.find('.ilink').attr("data-length");
    var isLive    = (itemSelected.find('.ilink').attr("is-live") != null);
    var starttime = 0;
    var itemLink  = itemSelected.find('.ilink').attr("href")

    if (isLive) {
        if (itemSelected.html().indexOf('bottomoverlay\"') != -1) {
            // Not available yet
            return -1;
        } else if (itemSelected.html().indexOf('bottomoverlay') == -1) {
            starttime = itemSelected.find('a').text().match(/([0-9]+[:.][0-9]+)-[0-9]/)[1];
        } else if (getDeviceYear() == 2013 && itemSelected.html().indexOf('bottomoverlayred') != -1) {
            starttime = itemSelected.html().match(/bottomoverlayred">([0-9]+[:.][0-9]+)/)[1];
        }
    }
    // Log("isLive:" + isLive + " starttime:" + starttime);
    if (duration.search(/[hsekmin]/) == -1) {
        duration = duration + " sek";
    }
    Player.setDuration(duration);
    Player.setNowPlaying(itemSelected.find('a').text());
    Player.startPlayer(itemLink.match(/ilink=(.+)&history/)[1], isLive, starttime);
    return 0;
};

Buttons.findNextPlayItem = function() {

    var topItems = $('.topitem');
    var bottomItems = $('.bottomitem');
    var tmpItem;
    var tmpTopSelected = isTopRowSelected
    var tmpColumnCounter = columnCounter;

    while (true) {
        // First go down if possible
        if(tmpTopSelected) {
            if (bottomItems.length > tmpColumnCounter) {
                tmpTopSelected = false;
	        tmpItem = bottomItems.eq(tmpColumnCounter);
            } else {
                return -1
            }
        } else {
            // Go Up and right
            tmpTopSelected = true;
            tmpItem = topItems.eq(tmpColumnCounter).next();
            if (tmpItem.length <= 0) {
                return -1
            }
            tmpColumnCounter++;
        }
        if (tmpItem.find('.ilink').attr("href") != undefined && 
            tmpItem.find('.ilink').attr("href").search("details.html\\?") != -1 &&
            tmpItem.html().indexOf('bottomoverlay\"') === -1) {
            return {item:tmpItem, top:tmpTopSelected, col:tmpColumnCounter}
        }
    }
};

Buttons.findPriorPlayItem = function() {

    var topItems = $('.topitem');
    var bottomItems = $('.bottomitem');
    var tmpItem;
    var tmpTopSelected = isTopRowSelected
    var tmpColumnCounter = columnCounter;

    while (true) {
        // First go up
        if(!tmpTopSelected) {
            // Go Up
            tmpTopSelected = true;
            tmpItem = topItems.eq(tmpColumnCounter);
        } else if (tmpColumnCounter == 0) {
            // At first Item
            return -1;
        } else {
            // Go left and down
            tmpColumnCounter--;
            tmpItem = bottomItems.eq(tmpColumnCounter);
        }
        if (tmpItem.find('.ilink').attr("href") != undefined && 
            tmpItem.find('.ilink').attr("href").search("details.html\\?") != -1 &&
            tmpItem.html().indexOf('bottomoverlay\"') === -1) {
            return {item:tmpItem, top:tmpTopSelected, col:tmpColumnCounter}
        }
    }
};

Buttons.playNextItem = function(direction) {
    var tmpItem;
    if (direction == 1)
        tmpItem = this.findNextPlayItem();
    else
        tmpItem = this.findPriorPlayItem();
    if (tmpItem != -1) {
        Player.stopVideo();
        itemSelected.removeClass('selected');
        columnCounter = tmpItem.col;
        isTopRowSelected = tmpItem.top;
        itemSelected = tmpItem.item;
        itemSelected.addClass('selected');
        this.sscroll(true);
        this.playItem()
    }
};
