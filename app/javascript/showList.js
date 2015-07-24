var showList =
{
};

showList.onLoad = function(refresh)
{
    if (!detailsOnTop)
	this.loadXml(refresh);
    if (!refresh)
	PathHistory.GetPath();
//	widgetAPI.sendReadyEvent();
};

showList.onUnload = function()
{
	Player.deinit();
};


showList.Geturl=function(refresh){
    var url = myLocation;
    if (refresh)
        url = myRefreshLocation;
    var name="";
    if (url.indexOf("=")>0)
    {
        name = url.substring(url.indexOf("=")+1,url.indexOf("&"));
    }
    Log(name);
    return name;
};

showList.loadXml = function(refresh)
{
    requestUrl(this.Geturl(refresh),
               function(status, data)
               {
                   data = data.responseText.split("id=\"videos-in-same-category")[0];
                   if (!data.match("play_js-tabs")) {
                       data = data.split("<article").slice(1).join("<article");
                       Section.decode_data("<article" + data);
                   } else {
                       data = "<section class=\"play_js-tabs\"" + data.split("class=\"play_js-tabs")[1];
                       showList.decode_data(data);
                   }
                   Log("itemCounter:" + itemCounter);
                   restorePosition();
               }
              );
};

showList.decode_data = function(showData) {
    try {
        var html; 
        var Name;
        var Duration;
        var Link;
        var ImgLink;

        showData = showData.split("</article>");
        showData.pop();

        for (var k=0; k < showData.length; k++) {
            
            // Name = $(showData[k]).find('span').filter(function() {
            //         return $(this).attr('class') == "play_videolist-element__title-text";
            //     }).text();
            showData[k] = showData[k].split("<article")[1];
            if (showData[k].match('countdown play_live-countdown'))
                continue;
            Name = showData[k].match(/play_vertical-list__header-link\">([^<]+)</)[1].trim();

            // Duration = showData[k].match(/data-length="([^"]+)"/)[1];
            Duration = showData[k].match(/time>([^<]+)/)[1];
            Link = fixLink(showData[k].match(/href="([^#][^#"]+)"/)[1]);
            ImgLink = showData[k].match(/data-imagename="([^"]+)"/);
            ImgLink = (!ImgLink) ? showData[k].match(/src="([^"]+)"/)[1] : ImgLink[1];
            ImgLink = fixLink(ImgLink);
            showData[k] = "";
	    // if(Description.length > 55){
	    //     Description = Description.substring(0, 52)+ "...";
	    // }
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
	    html += '<a href="details.html?ilink=' + Link + '&history=' + document.title + encodeURIComponent(Name) + '/" class="ilink" data-length="' + Duration + '"><img src="' + ImgLink + '" width="240" height="135" alt="' + Name + '" /></a>';
	    html += '</div>';
	    html += '<div class="scroll-item-name">';
	    html +=	'<p><a href="#">' + Name + '</a></p>';
	    //html += '<span class="item-date">' + Description + '</span>';
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
        Log("decode_data Exception:" + err.message + ". showData[" + k + "]:" + showData[k]);
    }
};

//window.location = 'project.html?ilink=' + ilink + '&history=' + historyPath + iname + '/';
