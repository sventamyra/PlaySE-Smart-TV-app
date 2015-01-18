var widgetAPI = new Common.API.Widget();
var pluginAPI = new Common.API.Plugin();

var fired = false;
var itemCounter = 0;
var columnCounter = 0;
var language;
var mainData;
var result="error";
var i;
var chunk_length;
var Main =
{

};

Main.onLoad = function()
{
	Header.display('Populärt');
	Audio.init();
	Audio.showMuteFooter();
	Search.init();
	Language.init();
	ConnectionError.init();
	widgetAPI.sendReadyEvent();
        pluginAPI.registIMEKey();
	Language.setLang();
	Resolution.displayRes();
	this.loadXml();	
	// Enable key event processing
	Buttons.enableKeys();
	
};

Main.onUnload = function()
{

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
            data = xhr.responseText.split("</article>");
            data.pop();
            mainData = data;
            xhr.destroy();
            xhr = data = null;
            i = 0;
            chunk_length = mainData.length;
            decode_data();
            mainData = null;
            Log("itemCounter:" + itemCounter);
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

function decode_data() {
    var html; 
    var $tmpData;
    var $video; 
    var Name;
    var Link;
    var Description;
    var ImgLink;
    var Live;
    var starttime;
    try {
        for (; i < mainData.length;) {
            // Log("working on " + i + " to " + (i+chunk_length));
            if (i == 0) {
                html = "<div id=\"crap" + mainData.slice(i, i+chunk_length).join("</article>") + "</article>";
            } else {
                html = "<div id=\"crap\">" + mainData.slice(i, i+chunk_length).join("</article>") + "</article>";
            }
            // Log("slice done:" + html.length);
            $tmpData = $(html).find('article');
            // Log('articles found:' + $tmpData.length);
            $tmpData.each(function(){
	        $video = $(this); 
                Name = $video.attr('data-title');
		Link = $video.find('a').attr('href');
		Description = $video.attr('data-description');
	        ImgLink  = $video.find('img').attr('data-imagename');
		Live = $video.find('Live').text();
		starttime = $video.find('Startime').text();

		if(Description.length > 47){
		    Description = Description.substring(0, 47)+ "...";
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
		html += '<a href="details.html?ilink=' + Link + '&history=Populärt/' + Name +'/" class="ilink"><img src="' + ImgLink + '" width="240" height="135" alt="'+ Name + '" /></a>';
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
	        $tmpData = $video = html = null;
                i++;
	        itemCounter++;
	    });
            if (i == 0 || html != null) {
                Log("Unexpected quit i:" + i + " $tmpData:" + html);
                break;
            }
        }
    } catch(err) {
        // Probably "script stack space quota is exhausted", try smaller chunk
        Log("decode_data Exception:" + err.message + " chunk_length:" + chunk_length);
        $tmpData = null;
        if (chunk_length > 1) {
            chunk_length = Math.floor(chunk_length/2);
            Log("retry with chunk_length:" + chunk_length);
            return decode_data();
        }
    }
};

function Log(msg) 
{
    // logXhr = new XMLHttpRequest();
    // logXhr.open("GET", "http://<LOGSERVER>/log?msg='[PlaySE] " + msg + "'", false);
    // logXhr.send();
    // logXhr.destroy();
    // logXhr = null;
    alert(msg);
};