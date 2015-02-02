var widgetAPI = new Common.API.Widget();
var itemSelected;
var itemCounter = 0;
var seqNo = 0;
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
            success: function(data, status, xhr)
            {
                var html;
                var $video;
                var Name;
                var Link;
                var ImgLink;
                var starttime;
                var endtime;
                var BaseUrl = this.url;
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
		    if (itemCounter % 2 == 0) {
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
                
            },
            complete: function(xhr, status)
            {
                live.getLiveJson();
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
                xhr.destroy();
                xhr = null;
                // Log("items:" + data.length + ", channels:" + itemCounter);
                decode_live(data);
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

function tsToClock(ts)
{
    var time;
    var hour;
    var minutes;

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

function decode_live(liveData) {
    try {
        var html;
        var Name;
        var running;
        var starttime;
        var Link;
        var ImgLink;
        for (var k=0; k < liveData.length; k++) {
            if (liveData[k].search(/data-broadcastended=\"true\"/i) > -1)
                // Show already ended
                continue;
            Name = liveData[k].match(/data-title="([^"]+)"/)[1];
            Link = liveData[k].match(/href="([^#][^#"]+)"/)[1];
            ImgLink = liveData[k].match(/data-imagename="([^"]+)"/)[1];
            running = liveData[k].search(/play_graphics-live--inactive/) == -1;
            starttime = liveData[k].match(/alt="([^"]+)"/)[1].replace(/([^:]+):.+/, "$1");
            liveData[k] = "";
	    if (itemCounter % 2 == 0) 
            {
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
	    html = null;
	    itemCounter++;
	}
    } catch(err) {
        Log("decode_live Exception:" + err.message + " data[" + k + "]:" + liveData[k]);
    }
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
//window.location = 'project.html?ilink=' + ilink;
