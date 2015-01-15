var widgetAPI = new Common.API.Widget();
var itemCounter = 0;
var columnCounter = 0;
var historyPath;
var language;
var html;
var categoryData;
var $tmpData;
var $video; 
var Name;
var Link;
var ImgLink;
var logXhr;
var i;
var chunk_length;
var categoryDetail =
{

};

categoryDetail.onLoad = function()
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

categoryDetail.onUnload = function()
{

};
// categoryDetail.html?category=/barn&history=Kategorier/Barn
categoryDetail.Geturl=function(){
    var url = document.location.href;
	var parse;
    var name="";
    if (url.indexOf("category=")>0)
    {
		// parse = url.substring(url.indexOf("=")+13,url.length);
		parse = url.substring(url.indexOf("=")+1,url.length);
		if (url.indexOf("&")>0)
		{
			name = parse.substring(0,parse.indexOf("&"));
			
		}
		else{
			name = parse;
		}
	}
    return name.replace("tvcategories\/", "");
};


categoryDetail.loadXml = function(){
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
                // Log("xhr.responseText.length:"+ xhr.responseText.length);
                // Log("org items:" + $(data).find('article').length);
                // data = xhr.responseText.split("a id=\"play-navigation-tabs")[1];
                data = xhr.responseText.split("div id=\"playJs-alphabetic-list")[1];
                data = data.split("div id=\"playJs-")[0];
                // Log("data.length:"+ data.length);
                data = data.split("</article>");
                data.pop();
                categoryData = data;
                data = null;
                i = 0;
                chunk_length = categoryData.length;
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
                
            }
        });

};

function decode_data() {
    try {
        for (; i < categoryData.length;) {
            // Log("working on " + i + " to " + (i+chunk_length));
            $tmpData = "<div id=\"crap" + categoryData.slice(i, i+chunk_length).join("</article>") + "</article>";
            // Log("slice done:" + $tmpData.length);
            $tmpData = $($tmpData).find('article');
            // Log('articles found:' + $tmpData.length);
            $tmpData.each(function(){
                $video = $(this); 
                Name = $video.attr('data-title');
                // Log("Name:" + Name);
	        Link = "http://www.svtplay.se"+$video.find('a').attr('href');
	        // Log("Link:" + Link);
	        ImgLink  = $video.find('img').attr('data-imagename');
                if (!ImgLink) ImgLink = $video.find('img').attr('src');
	        // Log("ImgLink:" + ImgLink);
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
	        html += '<a href="showList.html?name=' + Link + '&history=' + document.title  + Name + '/" class="ilink"><img src="' + ImgLink + '" width="240" height="135" alt="' + Name + '" /></a>';
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
//window.location = 'showList.html?name=' + ilink + '&history=' + historyPath + iname + '/';
