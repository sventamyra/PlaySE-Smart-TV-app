var widgetAPI = new Common.API.Widget();
var itemCounter = 0;
var columnCounter = 0;
var historyPath;
var showData;
var i;
var chunk_length;
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
                showData = data;
                xhr.destroy();
                xhr = data = null;
                i = 0;
                chunk_length = showData.length;
                decode_data();
                showData = null;
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
                
            }
        });

};

function decode_data() {
    var $video; 
    var $tmpData; 
    var Name;
    var Link;
    var ImgLink;
    var html;
    
    try {
        for (; i < showData.length;) {
            // Log("working on " + i + " to " + (i+chunk_length));
            if (i == 0) {
                html = "<div id=\"crap" + showData.slice(i, i+chunk_length).join("</article>") + "</article>";
            } else {
                html = "<div id=\"crap\">" + showData.slice(i, i+chunk_length).join("</article>") + "</article>";
            }
            // Log("slice done:" + html.length);
            $tmpData = $(html).find('article');
            // Log('articles found:' + $tmpData.length);
            $tmpData.each(function(){
                $video = $(this); 
                Name = $video.find('a').find('span').filter(function() {
                    return $(this).attr('class') == "play_videolist-element__title-text";
                }).text();
                if (!Name)
                    Name = $video.attr('data-title');
                Link = $video.find('a').attr('href');
                // Log(Link);
	        // var Description = $video.find('Description').text();
	        ImgLink  = $video.find('img').attr('data-imagename');
                if (!ImgLink) ImgLink = $video.find('img').attr('src');
	        // Log(ImgLink);
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

//window.location = 'project.html?ilink=' + ilink + '&history=' + historyPath + iname + '/';
