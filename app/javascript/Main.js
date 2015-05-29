var widgetAPI = new Common.API.Widget();
var pluginAPI = new Common.API.Plugin();
var recommendedLinks = [];
var Main =
{
    loaded: false
};

Main.onLoad = function(refresh)
{
    Language.fixAButton();
    document.title = "Populärt";
    if (!refresh)
	Header.display(document.title);
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
	this.loadXml(refresh);	
	// Enable key event processing
	Buttons.enableKeys();
    } else if (!detailsOnTop) {
	this.loadXml(refresh);	
    }
};

Main.onUnload = function()
{
	Player.deinit();
};


Main.loadXml = function(refresh){
    $("#content-scroll").hide();
    requestUrl('http://www.svtplay.se',
               function(status, data)
               {
                   data = data.responseText.split("<section class=\"play_js-hovered-list play_videolist-group")[0];
                   data = data.split("</article>");
                   data.pop();
                   Main.decode_recommended(data);
                   restorePosition();
               },
               null,
               function(xhr, status)
               {
                   Main.loadPopular(refresh);
               }
              );
};

Main.loadPopular = function(refresh){
    requestUrl('http://www.svtplay.se/populara?sida=1',
               function(status, data)
               {
                   data = data.responseText.split("div id=\"gridpage-content")[1];
                   data = data.split("</article>");
                   data.pop();
                   Section.decode_data(data, recommendedLinks);
                   Log("itemCounter:" + itemCounter);
                   if (!restorePosition() && !refresh)
                       $("#content-scroll").show();
               },
               function(status, data) {
                   if (!refresh)
                       $("#content-scroll").show();
               }
              );
};

Main.decode_recommended = function(mainData) {
    try {
        var html; 
        var Name;
        var Link;
        var Description;
        var Duration;
        var ImgLink;
        var Live;
        var starttime;
        recommendedLinks = [];
        for (var k=0; k < mainData.length; k++) {
            mainData[k] = "<article" + mainData[k].split("<article")[1];
	    Name = $(mainData[k]).find('span.play_carousel-caption__title-inner');
            var i = 0;
            while (i < Name.length) {
                if ($(Name[i]).text().length >= 1) {
                    Name = $(Name[i]).text();
                    break;
                }
                i = i+1;
            }
            Link = fixLink(mainData[k].match(/href="([^#][^#"]+)"/)[1]);
            Description = $(mainData[k]).find('span.play_carousel-caption__description').text();
	    ImgLink = fixLink($(mainData[k]).find('img').attr('data-imagename')).replace("_imax", "");
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
            if (Link.indexOf("/video/") != -1 ) {
                recommendedLinks.push(Link.replace(/.+\/video\/([0-9]+).*/, "$1"));
	        html += '<a href="details.html?ilink=' + Link + '&history=Populärt/' + Name +'/" class="ilink" data-length="' + Duration + '"><img src="' + ImgLink + '" width="240" height="135" alt="'+ Name + '" /></a>';
            } else
	        html += '<a href="showList.html?name=' + Link + '&history=Populärt/' + Name + '/" class="ilink"><img src="' + ImgLink + '" width="240" height="135" alt="' + Name + '" /></a>';
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