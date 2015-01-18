var widgetAPI = new Common.API.Widget();
var fired = false;
var topItems;
var BottomItems;
var itemSelected;
var itemCounter = 0;
var columnCounter = 0;
var language;
var html;
var BaseUrl;
var $video;
var liveData;
var Name;
var Link;
var ImgLink;
var starttime;
var endtime;
var running;
var time;
var hour;
var minutes;
var logXhr;
var i;
var chunk_length;
var live =
{

};

live.onLoad = function()
{
	Header.display('Kanaler & livesändningar');
	Audio.init();
	Audio.showMuteFooter();
	Search.init();
	Language.init();
	ConnectionError.init();
	Language.setLang();
	Resolution.displayRes();
        this.getChannelsJson();
	this.getLiveJson();
    	//this.loadXml();
	
	// Enable key event processing
	Buttons.enableKeys();
//	widgetAPI.sendReadyEvent();
};

live.onUnload = function()
{

};




function getimg(param,arr) 
{
	param=param.substring(0,param.indexOf("-"));
	 
	
	
	for(var i=0;i<arr.length;i++)
		{
		
		Log(arr[i].title);
		Log(param);
	       if(arr[i].title.indexOf(param)==0||param.indexOf(arr[i].title)==0)
			
			{ 
	    	   
	    	   Log(arr[i].thumbnail);
			
			return arr[i].thumbnail;
		
			
			}
		
		
		}
	
	return ;
	
};

live.getChannelsJson = function() {
    $.support.cors = true; 

    $.ajax(
        {
            type: 'GET',
            // url: 'http://188.40.102.5/categoryDetail.ashx?category=live',
            url: 'http://www.svtplay.se/kanaler',
            tryCount : 0,
            retryLimit : 3,
	    timeout: 15000,
            async: false,
            success: function(data, status, xhr)
            {
                BaseUrl = this.url;
                Log('Success:' + this.url);
                data = xhr.responseText.split("<div class=\"play_channel-schedules\"")[0];
	        $(data).find('div').filter(function() {
                    return $(this).attr('class').indexOf("play_channels__active-video-info") > -1;
                }).each(function(){
                    
		    $video = $(this); 
                    Name = $video.attr('data-channel');
	            Link = BaseUrl + '/' + Name;
                    // Log("Link:" + Link);
	            ImgLink  = GetChannelThumb(BaseUrl, Name);
                    // Log("ImgLink:" + ImgLink);
                    starttime = tsToClock($video.find('div').filter(function() {
                        if ($(this).attr('data-starttime'))
                            return true;
                        else 
                            return false;
                    }).attr('data-starttime')*1);
                    endtime = tsToClock($video.find('div').filter(function() {
                        if ($(this).attr('data-endtime'))
                            return true;
                        else 
                            return false;
                    }).attr('data-endtime')*1);
                    Name = starttime + "-" + endtime  + " " + $($video.children()[0]).text();
		    if(itemCounter % 2 == 0){
			html = '<div class="scroll-content-item topitem">';
		    }
		    else{
			html = '<div class="scroll-content-item bottomitem">';
		    }
		    
		    
		    html += '<div class="scroll-item-img">';
		    html += '<a href="details.html?ilink=' + Link + '&history=' + document.title + '/' + Name + '/" class="ilink"><img src="' + ImgLink + '" width="240" height="135" alt="" /></a>';
		    html += '</div>';
		    html += '<div class="scroll-item-name">';
		    html +=	'<p><a href="#">' + Name + '</a></p>';
		    html += '</div>';
		    html += '</div>';
		    
		    if(itemCounter % 2 == 0){
			$('#topRow').append($(html));
		    }
		    else{
			$('#bottomRow').append($(html));
		    }
	            $video = html = null;
                    // Log(Name);
		    itemCounter++;

	        });
                // xhr.destroy();
                xhr = data = null;
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

live.getLiveJson = function() {

    $.support.cors = true; 
    $.ajax(
        {
            type: 'GET',
            // url: 'http://188.40.102.5/categoryDetail.ashx?category=live',
            url: 'http://www.svtplay.se/live',
            tryCount : 0,
            retryLimit : 3,
	    timeout: 15000,
            success: function(data, status, xhr)
            {

                Log('Success:' + this.url);
                data = xhr.responseText.split("</article>");
                data.pop();
                // Log("items:" + data.length + ", channels:" + itemCounter);
                liveData = data;
                xhr.destroy();
                xhr = data = null;
                i = 0;
                chunk_length = liveData.length;
                decode_live();
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

function tsToClock(ts)
{
    time = new Date(ts *1);
    hour = time.getHours();
    minutes = time.getMinutes();
    if (hour < 10) hour = "0" + hour;
    if (minutes < 10) minutes = "0" + minutes;
    return hour + ":" + minutes;
};

function GetChannelThumb(url, Name) 
{
    var channels = [{"name":"svt1", "thumb":"images/svt1.jpg"},
                    {"name":"svt2", "thumb":"images/svt2.jpg"},
                    {"name":"barnkanalen", "thumb":"images/barnkanalen.jpg"},
                    {"name":"svt24", "thumb":"images/svt24.jpg"},
                    {"name":"kunskapskanalen", "thumb":"images/kunskapskanalen.jpg"}
                   ];

    pattern = new RegExp(Name, 'i');
    for (var i = 0; i < channels.length; i++) {
        if (pattern.test(channels[i].name))
            return channels[i].thumb;
    }
    return url + '/public/images/channels/backgrounds/' + Name + '-background.jpg';
};

function decode_live() {
    var $tmpData;
    try {
        for (; i < liveData.length;) {
            // Log("working on " + i + " to " + (i+chunk_length));
            if (i == 0) {
                html = "<div id=\"crap" + liveData.slice(i, i+chunk_length).join("</article>") + "</article>";
            } else {
                html = "<div id=\"crap\">" + liveData.slice(i, i+chunk_length).join("</article>") + "</article>";
            }
            // Log("slice done:" + html.length);
            $tmpData = $(html).find('article');
            // Log('articles found:' + $tmpData.length);
            $tmpData.each(function(){
	        $video = $(this); 

                if ($video.attr('data-broadcastended') == "true") {
                    i++;
                    return true;
                }

                Name = $video.attr('data-title');
	        Link = $video.find('a').attr('href');
	        //var Description = $video.find('Description').text();
	        ImgLink  = $video.find('img').attr('data-imagename');
	        running = $($video.find('figure').find('span')[0]).attr('class').indexOf("play_graphics-live--inactive") == -1;
	        starttime  = $video.find('img').attr('alt').replace(/([^:]+):.+/, "$1");
	        if(itemCounter % 2 == 0){
		    html = '<div class="scroll-content-item topitem">';
	        }
	        else{
		    html = '<div class="scroll-content-item bottomitem">';
	        }
	        
	        
	        html += '<div class="scroll-item-img">';
	        html += '<a href="details.html?ilink=' + Link + '&history=' + document.title + '/' + Name + '/" class="ilink"><img src="' + ImgLink + '" width="240" height="135" alt="" /></a>';
	        if (!running){
		    html += '<span class="topoverlay">LIVE</span>';
		    // html += '<span class="bottomoverlay">' + starttime + ' - ' + endtime + '</span>';
		    html += '<span class="bottomoverlay">' + starttime + '</span>';
	        }
	        else{
		    html += '<span class="topoverlayred">LIVE</span>';
		    // html += '<span class="bottomoverlayred">' + starttime + ' - ' + endtime + '</span>';
		    html += '<span class="bottomoverlayred">' + starttime + '</span>';
	        }
	        html += '</div>';
	        html += '<div class="scroll-item-name">';
	        html +=	'<p><a href="#">' + Name + '</a></p>';
	        //	html += '<span class="item-date">' + Description + '</span>';
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
	$tmpData = null;
        // Probably "script stack space quota is exhausted", try smaller chunk
        Log("decode_live Exception:" + err.message + " chunk_length:" + chunk_length);
        if (chunk_length > 1) {
            chunk_length = Math.floor(chunk_length/2);
            Log("retry with chunk_length:" + chunk_length);
            return decode_live();
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
//window.location = 'project.html?ilink=' + ilink;
