var widgetAPI = new Common.API.Widget();
var itemCounter = 0;
var seqNo = 0;
var showList =
{
};

showList.onLoad = function()
{
	Header.display('Populärt');
	Audio.init();
	Audio.showMuteFooter();
	Search.init();
	Language.init();
	ConnectionError.init();
	Language.setLang();
	Resolution.displayRes();
	this.loadXml();
	PathHistory.GetPath();
	// Enable key event processing
	Buttons.enableKeys();
//	widgetAPI.sendReadyEvent();
};

showList.onUnload = function()
{

};


showList.Geturl=function(){
    var url = document.location.href;
    var name="";
    if (url.indexOf("=")>0)
    {
        name = url.substring(url.indexOf("=")+1,url.indexOf("&"));
    }
    Log(name);
    return name;
};





showList.loadXml = function(){
    
    $.support.cors = true;
    $.ajax(
        {
            type: 'GET',
            url: this.Geturl(),
            tryCount : 0,
            retryLimit : 3,
	    timeout: 15000,
            success: function(data, status, xhr)
            {
                Log('Success:' + this.url);
                data = xhr.responseText.split("id=\"videos-in-same-category")[0];
                data = "<div id=\"more-episodes-panel\"" + data.split("id=\"more-episodes-panel")[1];
                data = data.split("</article>");
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
                
            }
        });

};

function decode_data(showData) {
    try {
        var html; 
        var Name;
        var Link;
        var ImgLink;
        for (var k=0; k < showData.length; k++) {
            
            // Name = $(showData[k]).find('span').filter(function() {
            //         return $(this).attr('class') == "play_videolist-element__title-text";
            //     }).text();
            showData[k] = showData[k].split("<article")[1];
            Name = showData[k].match(/play_videolist-element__title-text[^>]+>([^<]+)/);
            if (Name && Name[1].length > 0) {
                Name = Name[1].trim();
            } else {
                // Name = $video.attr('data-title');
                Name = showData[k].match(/data-title="([^"]+)"/)[1];
            }
            Link = showData[k].match(/href="([^#][^#"]+)"/)[1];
            ImgLink = showData[k].match(/data-imagename="([^"]+)"/);
            ImgLink = (!ImgLink) ? showData[k].match(/src="([^"]+)"/)[1] : ImgLink[1];
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
	    html += '<a href="details.html?ilink=' + Link + '&history=' + document.title + Name + '/" class="ilink"><img src="' + ImgLink + '" width="240" height="135" alt="' + Name + '" /></a>';
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

String.prototype.trim = function () {
    return this.replace(/^\s*/, "").replace(/\s*$/, "").replace(/[ 	]*\n[	 ]*/g, "");
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

//window.location = 'project.html?ilink=' + ilink + '&history=' + historyPath + iname + '/';
