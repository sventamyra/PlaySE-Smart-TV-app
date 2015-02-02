var widgetAPI = new Common.API.Widget();
var fired = false;
var itemCounter = 0;
var columnCounter = 0;
var seqNo = 0;
var SearchList =
{

};

SearchList.onLoad = function()
{
	Header.display('Populärt');
	Audio.init();
	Audio.showMuteFooter();
	Search.init();
	Language.init();
	ConnectionError.init();
	Language.setLang();
	Resolution.displayRes();
        this.setPath(this.Geturl());
	this.loadXml();
	// Enable key event processing
	this.enableKeys();
//	widgetAPI.sendReadyEvent();
};

SearchList.onUnload = function()
{

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

SearchList.Geturl=function(){
    var url = document.location.href;
    var name="";
    if (url.indexOf("=")>0)
    {
        name = url.substring(url.indexOf("=")+1,url.length);
    }
    return name;
};


SearchList.setPath = function(name, count) {
    document.title = "Sökning: " + name;
    var title = this.urldecode(name);
    var html;
    html = '<li class="root-item"><a href="index.html" class="active">Sökning: ' + title + '</a></li>';
    if (count != undefined)
        html += '<li class="root-item"><a href="index.html" class="active"> ' + count + '</a></li>';
    $('.dropdown').html($(html));
};

SearchList.sscroll = function(param) 
{
	var xaxis = 0;
	if(columnCounter > 0){
		xaxis = columnCounter - 1;
	}
	xaxis = -xaxis * 240;
	$('.content-holder').animate({ marginLeft: xaxis});
	 
};

SearchList.loadXml = function(){
    var parentThis = this;
    $.support.cors = true;
    $.ajax(
        {
            type: 'GET',
            url: 'http://www.svtplay.se/sok?q='+this.Geturl(),
            tryCount : 0,
            retryLimit : 3,
	    timeout: 15000,
            success: function(data, status, xhr)
            {
                Log('Success:' + this.url);
                // Log("xhr.responseText.length:" + xhr.responseText.length);
                data = xhr.responseText.split("id=\"search-categories");
                data = (data.length > 1) ? data[1] : data[0];
                data = data.split("id=\"search-");
                data.shift();
                data = data.join("").split("</article>");
                data.pop();
                xhr.destroy();
                xhr = null;
                decode_data(data);
                data = null;
                Log("itemCounter:" + itemCounter);
                Buttons.restorePosition();
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
        	    Log('Failure');
        	    ConnectionError.show();
        	}
                
            },
            complete: function() {
                parentThis.setPath(parentThis.Geturl(), itemCounter);
            }
        });
};

function decode_data(searchData) {
    try {
        var html;
        var Name;
        var IsLive;
        var running;
        var starttime;
        var Link;
        var LinkPrefx;
        var Description;
        var ImgLink;
        for (var k=0; k < searchData.length; k++) {
            Name = searchData[k].match(/data-title="([^"]+)"/)[1];
            Description = searchData[k].match(/data-description="([^"]+)"/);
            Link = searchData[k].match(/href="([^#][^#"]+)"/)[1];
            ImgLink = searchData[k].match(/data-imagename="([^"]+)"/);
            IsLive = searchData[k].search(/svt_icon--live/) > -1;
            running = searchData[k].search(/play_graphics-live--inactive/) == -1;
            starttime = searchData[k].match(/alt="([^"]+)"/);
            Description = (!Description) ? "" : Description[1];
            ImgLink = (!ImgLink) ? searchData[k].match(/src="([^"]+)"/)[1] : ImgLink[1];
            starttime = (IsLive) ? starttime[1].replace(/([^:]+):.+/, "$1") : "";
            searchData[k] = "";
	    if (Description.length > 55){
		Description = Description.substring(0, 52)+ "...";
	    }
            LinkPrefx = '<a href="showList.html?name=';
            if (Link.search("/klipp/") != -1 || Link.search("/video/") != -1) {
                LinkPrefx = '<a href="details.html?ilink=';
            }
            else {
                Link = "http://svtplay.se" + Link
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
	    html += LinkPrefx + Link + '&history=' + document.title  + Name + '/" class="ilink"><img src="' + ImgLink + '" width="240" height="135" alt="" /></a>';

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

function getModelYear() 
{
    var pluginNNavi = document.getElementById("pluginObjectNNavi");
    var firmwareVersion = pluginNNavi.GetFirmware();

    if (firmwareVersion === "") {  // for emulator only
        firmwareVersion = "T-INFOLINK2011-1000";
    }

    //Main.debug("[Main.js] - firmwareVersion: " + firmwareVersion);
    return Number(firmwareVersion.substr(10, 4));
};

function Log(msg) 
{
    // var logXhr = new XMLHttpRequest();
    // logXhr.onreadystatechange = function () {
    //     if (logXhr.readyState == 4) {
    //         logXhr.destroy();
    //         logXhr = null;
    //     }
    // };
    // logXhr.open("GET", "http://<LOGSERVER>/log?msg='[PlaySE] " + seqNo++ % 10 + " : " + msg + "'");
    // logXhr.send();
    alert(msg);
};