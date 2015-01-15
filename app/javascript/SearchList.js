var widgetAPI = new Common.API.Widget();
var fired = false;
var topItems;
var html;
var i;
var chunk_length;
var searchData;
var $tmpData;
var BottomItems;
var itemSelected;
var itemCounter = 0;
var columnCounter = 0;
var $video; 
var Name;
var IsLive;
var running;
var starttime;
var Link;
var LinkPrefx;
var Description;
var ImgLink;
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
                data = xhr.responseText.split("id=\"search-");
                data.shift();
                searchData = data.join("").split("</article>");
                searchData.pop();
                data = null;
                i = 0;
                chunk_length = searchData.length;
                decode_data();
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
        	    Log('Failure');
        	    ConnectionError.show();
        	}
                
            },
            complete: function() {
                parentThis.setPath(parentThis.Geturl(), itemCounter);
            }
        });
};

function decode_data() {
    try {
        for (; i < searchData.length;) {
            // Log("working on " + i + " to " + (i+chunk_length));
            $tmpData = "<div id=\"crap" + searchData.slice(i, i+chunk_length).join("</article>") + "</article>";
            // Log("slice done:" + $tmpData.length);
            $tmpData = $($tmpData).find('article');
            // Log('articles found:' + $tmpData.length);
            $tmpData.each(function(){
                if ($(this).find('a').attr('class').indexOf("play_categorylist-element__link") != -1) {
                    i++;
                    return true;
                }
                $video = $(this); 
                Name = $video.attr('data-title');
                IsLive = $video.find('span').text().indexOf("Live") != -1;
                running = false;
                starttime;
                if (IsLive) {
	            running = $($video.find('figure').find('span')[0]).attr('class').indexOf("play_graphics-live--inactive") == -1;
                    starttime  = $video.find('img').attr('alt').replace(/([^:]+):.+/, "$1");
                }
                
	        Link = $video.find('a').attr('href');
		Description = $video.attr('data-description');
	        ImgLink  = $video.find('img').attr('data-imagename');
                if (!ImgLink) ImgLink = $video.find('img').attr('src');

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
                LinkPrefx = '<a href="showList.html?name=';
                if (Link.search("/klipp/") != -1 || Link.search("/video/") != -1) {
                    LinkPrefx = '<a href="details.html?ilink=';
                }
                else {
                    Link = "http://svtplay.se" + Link
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
                i++;
	        itemCounter++;
	    });
            if (i == 0)
                break;
        }
    } catch(err) {
        // Probably "script stack space quota is exhausted", try smaller chunk
        Log("decode_data Exception:" + err.message + " chunk_length:" + chunk_length);
        if (chunk_length > 1) {
            chunk_length = Math.floor(chunk_length/2);
            Log("retry with chunk_length:" + chunk_length);
            decode_data();
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