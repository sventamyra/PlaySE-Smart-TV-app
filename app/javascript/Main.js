var widgetAPI = new Common.API.Widget();
var pluginAPI = new Common.API.Plugin();
var Main =
{
    loaded: false
};

Main.onLoad = function()
{
    Header.display('Populärt');
    if (!this.loaded) {
        loadingStart();
        this.loaded = true;
	Audio.init();
	Audio.showMuteFooter();
	Search.init();
	Language.init();
	ConnectionError.init();
	widgetAPI.sendReadyEvent();
        pluginAPI.registIMEKey();
	Language.setLang();
	Resolution.displayRes();
        setSystemOffset();
	this.loadXml();	
	// Enable key event processing
	Buttons.enableKeys();
    } else if (!detailsOnTop) {
	this.loadXml();	
    }
};

Main.onUnload = function()
{
	Player.deinit();
};


Main.loadXml = function(){
	$.support.cors = true;
	
	  $.ajax(
    {
        type: 'GET',
        // url: 'http://188.40.102.5/recommended.ashx',
        url: 'http://www.svtplay.se/populara?sida=1',
        tryCount : 0,
        retryLimit : 3,
	timeout: 15000,
        success: function(data, status, xhr)
        {
            Log('Success:' + this.url);
            data = xhr.responseText.split("div id=\"gridpage-content")[1];
            data = data.split("</article>");
            data.pop();
            xhr.destroy();
            xhr = null;
            Main.decode_data(data);
            data = null;
            Log("itemCounter:" + itemCounter);
            restorePosition();
        },
        error: function(XMLHttpRequest, textStatus, errorThrown)
        {
          	if (textStatus == 'timeout') {
                this.tryCount++;
                if (this.tryCount <= this.retryLimit) {
                    //try again
                    $.ajax(this);
                    return;
                }            
                return;
            }
        	else{
        		Log('Failure:' + textStatus);
        		ConnectionError.show();
        	}
         
        }
    });
};

Main.decode_data = function(mainData) {
    try {
        var html; 
        var Name;
        var Link;
        var Description;
        var Duration;
        var ImgLink;
        var Live;
        var starttime;
        for (var k=0; k < mainData.length; k++) {
            if (mainData[k].search(/data-broadcastended=\"true\"/i) > -1)
                // Show already ended
                continue;
            Name = mainData[k].match(/data-title="([^"]+)"/)[1];
            Duration = mainData[k].match(/data-length="([^"]+)"/)[1];
            Link = fixLink(mainData[k].match(/href="([^#][^#"]+)"/)[1]);
            Description = mainData[k].match(/data-description="([^"]+)"/);
            Description = (!Description) ? "" : Description[1];
            ImgLink = fixLink(mainData[k].match(/data-imagename="([^"]+)"/)[1]);
            mainData[k] = "";

	    if(Description.length > 55){
		Description = Description.substring(0, 52)+ "...";
	    }
	    if(itemCounter % 2 == 0){
		if(itemCounter > 0){
		    html = '<div class="scroll-content-item topitem">';
		}
		else{
		    html = '<div class="scroll-content-item selected topitem">';
		}
	    }
	    else{
		html = '<div class="scroll-content-item bottomitem">';
	    }
	    html += '<div class="scroll-item-img">';
	    html += '<a href="details.html?ilink=' + Link + '&history=Populärt/' + Name +'/" class="ilink" data-length="' + Duration + '"><img src="' + ImgLink + '" width="240" height="135" alt="'+ Name + '" /></a>';
	    if(Live == 1){
		html += '<span class="topoverlay">LIVE</span>';
		html += '<span class="bottomoverlay">' + starttime + '</span>';
	    }
	    else if(Live == 2){
		html += '<span class="topoverlayred">LIVE</span>';
		html += '<span class="bottomoverlayred">' + starttime + '</span>';
	    }
	    html += '</div>';
	    html += '<div class="scroll-item-name">';
	    html +=	'<p><a href="#">' + Name + '</a></p>';
	    html += '<span class="item-date">' + Description + '</span>';
	    html += '</div>';
	    html += '</div>';
	    if(itemCounter % 2 == 0){
		$('#topRow').append($(html));
	    }
	    else{
		$('#bottomRow').append($(html));
	    }
	    html = null;
	    itemCounter++;
	}
    } catch(err) {
        Log("decode_data Exception:" + err.message + " data[" + k + "]:" + mainData[k]);
    }
};