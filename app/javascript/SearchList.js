var fired = false;
var SearchList =
{

};

SearchList.onLoad = function(refresh)
{
    if (!detailsOnTop) {
        this.setPath(this.Geturl(refresh), undefined, refresh);
	this.loadXml(refresh);
    } else {
        this.setPath(this.Geturl(refresh), itemCounter, refresh);
    }
//	widgetAPI.sendReadyEvent();
};

SearchList.onUnload = function()
{
	Player.deinit();
};

SearchList.enableKeys = function()
{
	document.getElementById("anchor").focus();
};

SearchList.setFired = function() 
{
	fired = false;
};

SearchList.urldecode = function(str) {
   return decodeURIComponent((str+'').replace(/\+/g, '%20'));
};

SearchList.Geturl=function(refresh){
    var url = myLocation;
    if (refresh)
        url = myRefreshLocation;
    var name="";
    if (url.indexOf("=")>0)
    {
        name = url.substring(url.indexOf("=")+1,url.length);
    }
    return name;
};


SearchList.setPath = function(name, count, refresh) {
    document.title = "Sökning: " + name;
    if (refresh)
        return;
    Header.display('');
    var title = this.urldecode(name);
    var html;
    html = '<li class="root-item"><a href="index.html" class="active">Sökning: ' + title + '</a></li>';
    if (count != undefined)
        html += '<li class="root-item"><a href="index.html" class="active"> ' + count + '</a></li>';
    $('.dropdown').html($(html));
};

SearchList.loadXml = function(refresh) {
    var parentThis = this;
    requestUrl('http://www.svtplay.se/sok?q='+this.Geturl(refresh),
               function(status, data)
               {
                   data = data.responseText.split("id=\"search-categories");
                   data = (data.length > 1) ? data[1] : data[0];
                   data = data.split("id=\"search-");
                   data.shift();
                   data = data.join("").split("</article>");
                   data.pop();
                   SearchList.decode_data(data);
                   Log("itemCounter:" + itemCounter);
                   restorePosition();
               },
               null,
               function() {
                   parentThis.setPath(parentThis.Geturl(refresh), itemCounter, refresh);
               }
              );
};

SearchList.decode_data = function(searchData) {
    try {
        var html;
        var Name;
        var Duration;
        var IsLive;
        var IsLiveText;
        var running;
        var starttime;
        var Link;
        var LinkPrefx;
        var Description;
        var ImgLink;
        for (var k=0; k < searchData.length; k++) {
            Name = searchData[k].match(/data-title="([^"]+)"/)[1];
            Duration = searchData[k].match(/data-length="([^"]+)"/);
            Description = searchData[k].match(/data-description="([^"]+)"/);
            Link = fixLink(searchData[k].match(/href="([^#][^#"]+)"/)[1]);
            ImgLink = searchData[k].match(/data-imagename="([^"]+)"/);
            IsLive = searchData[k].search(/svt_icon--live/) > -1;
            running = searchData[k].search(/play_graphics-live--inactive/) == -1;
            starttime = searchData[k].match(/alt="([^"]+)"/);
            Description = (!Description) ? "" : Description[1];
            ImgLink = (!ImgLink) ? searchData[k].match(/src="([^"]+)"/)[1] : ImgLink[1];
            ImgLink = fixLink(ImgLink);
            starttime = (IsLive) ? starttime[1].replace(/([^:]+):.+/, "$1") : "";
            searchData[k] = "";
	    if (Description.length > 55){
		Description = Description.substring(0, 52)+ "...";
	    }
            LinkPrefx = '<a href="showList.html?name=';
            if (Link.search("/klipp/") != -1 || Link.search("/video/") != -1) {
                Duration = Duration[1];
                LinkPrefx = '<a href="details.html?ilink=';
            }
            else {
                Duration = 0;
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

            IsLiveText = (IsLive) ? " is-live" : "";
	    html += '<div class="scroll-item-img">';
	    html += LinkPrefx + Link + '&history=' + document.title + '/' + Name + '/" class="ilink" data-length="' + Duration + '"' + IsLiveText + '><img src="' + ImgLink + '" width="240" height="135" alt="" /></a>';

	    if (IsLive && !running) {
		html += '<span class="topoverlay">LIVE</span>';
		// html += '<span class="bottomoverlay">' + starttime + ' - ' + endtime + '</span>';
		html += '<span class="bottomoverlay">' + starttime + '</span>';
	    }
	    else if (IsLive){
		html += '<span class="topoverlayred">LIVE</span>';
		// html += '<span class="bottomoverlayred">' + starttime + ' - ' + endtime + '</span>';
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
        Log("decode_data Exception:" + err.message + " data[" + k + "]:" + searchData[k]);
    }
};