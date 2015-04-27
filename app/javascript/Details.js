var widgetAPI = new Common.API.Widget();
var isLive = false;
var currentTime = 0;
var countd=0;
var downCounter;

var Details =
{
    duration:null,
    starttime:0
};

Details.onLoad = function()
{
        $(".slider-body").hide();
        $(".content").show();
        isLive = false;
        Details.duration = null;
        Details.starttime = 0;
	Header.display('');
	PathHistory.GetPath();
	Buttons.setKeyHandleID(1);					
	this.loadXml();
};

Details.onUnload = function()
{
	Player.deinit();
};


Details.Geturl=function(){
    var url = myLocation;
	var parse;
    var name="";
    if (url.indexOf("ilink=")>0)
    {
		parse = url.substring(url.indexOf("=")+1,url.length);
		if (url.indexOf("&")>0)
		{
			name = parse.substring(0,parse.indexOf("&"));
			
		}
		else{
			name = parse;
		}
	}
    return name;
};

Details.Prepare = function(){

    this.GetPlayUrl();

    // if(isLive){
    //     var url= "http://188.40.102.5/CurrentTime.ashx";
    //     Log(url);
    //     $.support.cors = true;
    //     $.ajax(
    //         {
    //     	type: 'GET',
    //     	url: url,
    //     	timeout: 15000,
    //     	tryCount : 0,
    //     	retryLimit : 3,
    //     	success: function(data)
    //     	{
    //     	    Log('Success prepare');
    //     	    currentTime = +($(data).find('CurrentTime').text());
    //     	    Log("currentTime=" + currentTime);
    //     	    if(airTime > currentTime){
    //     		countd = airTime - currentTime + 60;
    //     		Log("countd = " + countd);
    //     		downCounter = setInterval(Details.CountDown, 1000); 
    //     	    }
    //     	    else{
    //     		Details.GetPlayUrl();
    //     	    }
    //     	}
    //     	, 
    //             error: function(XMLHttpRequest, textStatus, errorThrown)
    //             {
    //                 if (textStatus == 'timeout') {
    //                     this.tryCount++;
    //                     if (this.tryCount <= this.retryLimit) {
    //                         //try again
    //                         $.ajax(this);
    //                         return;
    //                     }            
    //                     return;
    //                 }
    //                 else{
    //             	Log('Failure');
    //             	ConnectionError.show();
    //                 }
	            
    //             }
    //         });	
	
    // }
    // else{
    //     this.GetPlayUrl();
    // }

};

Details.CountDown = function()
{
	  countd = countd - 1;
	  if (countd <= 0)
	  {
	     clearInterval(downCounter);
	     Details.GetPlayUrl();
	     return;
	  }
	  var secs = Math.floor(countd % 60);
	  var mins = Math.floor(countd / 60);
	  var hrs = Math.floor(mins / 60);
	  mins = Math.floor(mins % 60);
	  var smins;
	  var ssecs;
	  var shrs;
	  if(hrs < 10){
			shrs = '0' + hrs;
		}
		else{
			shrs = hrs;
		}
		if(mins < 10){
			smins = '0' + mins;
		}
		else{
			smins = mins;
		}
		if(secs < 10){
			ssecs = '0' + secs;
		}
		else{
			ssecs = secs;
		}
		if(Language.getisSwedish()){
			 $('.bottomoverlaybig').html("Live - börjar om: " + shrs + ":" + smins + ":" + ssecs);
		}
		else{
			$('.bottomoverlaybig').html("Live - starts in: " + shrs + ":" + smins + ":" + ssecs);
		}
};

Details.GetPlayUrl = function(){
        var url_param = '?output=json';
        var gurl = fixLink(this.Geturl());
        if (gurl.indexOf('?') != -1)
                url_param = '&output=json'; 
	$.getJSON(gurl + url_param, function(data) {
		
		$.each(data, function(key, val) {
			if(key == 'video'){
				var videoUrl = '';
				for (var i = 0; i < val.videoReferences.length; i++) {
				    Log(val.videoReferences[i].url);
				    videoUrl = val.videoReferences[i].url;
				    if(videoUrl.indexOf('.m3u8') >= 0){
				    	break;
				    }
				}
                                srtUrl="";
                                for (var i = 0; i < val.subtitleReferences.length; i++) {
				    Log(val.subtitleReferences[i].url);
				    srtUrl = val.subtitleReferences[i].url;
                                    if (srtUrl.length > 0){
				    	break;
				    }
				}


				if(videoUrl.indexOf('.m3u8') >= 0){
				    Resolution.getCorrectStream(videoUrl, isLive, srtUrl);
				}
				else{
		                    Player.setVideoURL(videoUrl, srtUrl);
		                    Player.playVideo();
                                    
				    // Player.stopCallback();	
					
				// 	gurl = gurl + '?type=embed';
				// 	Log(gurl);
				// 	widgetAPI.runSearchWidget('29_fullbrowser', gurl);
				// //	$('#outer').css("display", "none");
				// //	$('.video-wrapper').css("display", "none");
					
				// //	$('.video-footer').css("display", "none");

				// //	$('#flash-content').css("display", "block");
				// //	$('#iframe').attr('src', gurl);
				}
			}
		});
		
	});
};

Details.loadXml = function(){
    var url = fixLink(this.Geturl());
    var html;

    $.support.cors = true;
    $.ajax(
        {
            type: 'GET',
            url: url,
	    timeout: 15000,
	    tryCount : 0,
	    retryLimit : 3,
            success: function(data, status, xhr)
            {
                Log('Success:' + this.url);
                data = xhr.responseText.split("<section class=\"play_js-tabs")[0]
                data = data.split("<aside class=\"svtoa-related svt-position-relative")[0];
                xhr.destroy();
                xhr = null;

                var Name="";
		var DetailsImgLink="";
		var DetailsPlayTime="";
                var VideoLength = "";
                var AvailDate="";
		var Description="";
		var onlySweden="";
                var $video;
                var isChannel=false;
                var notAvailable=false;
                try {

                    if (this.url.indexOf("/kanaler/") > -1) {
                        var $video = $(data).find('div').filter(function() {
                            return $(this).attr('class') == "play_channels";
                        });
                        isChannel = true;

                        Name = $video.find('a').attr('data-title');
		        DetailsImgLink = fixLink($video.find('img').attr('data-imagename'));
                        pattern = new RegExp("\\b" + Name + "\\b", "i");
	                var $info = $(data).find('div').filter(function() {
                            
                            return ($(this).attr('class').indexOf("play_channels__active-video-info") > -1 &&
                                    pattern.test($(this).attr('data-channel')));
                        });
                        Name = Name + " - " + $($info.children()[0]).text();
                        VideoLength = $($($info.find('p')[1]).children()[1]).text();
		        Description = $($info.find('p')[0]).text();
                        var timeData = $info.find('div').find('div').find('div').filter(function() {
                            if ($(this).attr('data-starttime'))
                                return true;
                            else 
                                return false;
                        });
                        DetailsPlayTime = tsToClock(+timeData.attr('data-starttime')) + "-" +
                            tsToClock(timeData.attr('data-endtime'));
                        isLive = true;

                    } else if (url.indexOf("oppetarkiv") > -1) {
                        Name = $($(data).find('img')[1]).attr('alt');
                        // Log("Name:" + Name);
		        DetailsImgLink = fixLink($($(data).find('img')[1]).attr('data-imagename'));
		        DetailsPlayTime = $($(data).find('strong')[0]).text();
                        VideoLength = $($(data).find('strong')[1]).text();

                        Description = $(data).find('div').filter(function() {
                            return $(this).attr('class') == "svt-text-bread svt-text-margin-large";
                        }).text();

		        onlySweden = ($(data).find('span').filter(function() {
                            return $(this).attr('class') == "svtoa-icon-geoblock svtIcon";
                        }).length > 0);


                    } else {
                        $video = $(data).find('div').filter(function() {
                            return $(this).attr('class') == "play_container";
                        });
                        if ($video.find('section').find('a').attr('data-livestart'))
		            isLive = true;

                        Name = $video.find('a').attr('data-title');
		        DetailsImgLink = fixLink($video.find('img').attr('data-imagename'));
                        // Log(DetailsImgLink);
                        var DetailsClock = "";
                        try {
                            DetailsClock = $video.find('p').find('time').attr('datetime').replace(/.+T([^+]+)+.+/, "$1"); 
                        } catch(err) {
                            Log("Exception:" + err.message);
                        }
                        DetailsPlayTime = $video.find('p').find('time').text();
                        // Log(DetailsPlayTime);
                        // Log(DetailsClock);
                        if (DetailsPlayTime.indexOf(DetailsClock.replace(":", ".")) == -1)
                            DetailsPlayTime  = DetailsPlayTime + " " + DetailsClock;
                        
                        if (isLive) {
                            notAvailable = +($video.find('section').find('a').attr('data-livestart')) < 0;
                            VideoLength = dataLengthToVideoLength($video);
                        } else {
		            AvailDate  = $video.find('p').filter(function() {
                                return $(this).text().indexOf("Kan ses till") > -1;
                            }).text().replace(/.*Kan ses till /, "");
                            VideoLength = dataLengthToVideoLength($video);
                            if (VideoLength.length == 0)
                            {
                                VideoLength = $video.find('span').find('time').text();
                            }
                        }
		        Description = $($video.find('p')[0]).text();
		        onlySweden = $video.find('section').find('a').attr('data-only-available-in-sweden');
                    }
                    // Log("Name:" + Name);
                    // Log("DetailsImgLink:" + DetailsImgLink);
                    // Log("Description:" + Description);
                    // Log("DetailsPlayTime:" + DetailsPlayTime);
                    // Log("VideoLength:" + VideoLength);
                    // Log("onlySweden:" + onlySweden);

		    if(!Language.getisSwedish()){
		        DetailsPlayTime=DetailsPlayTime.replace("igår","yesterday");
		        DetailsPlayTime=DetailsPlayTime.replace("idag","today");
		    }

                    Details.duration = VideoLength;

                    Details.starttime = DetailsPlayTime.match(/([0-9]+[:.][0-9]+)/);
                    if ((isChannel || (isLive && getDeviceYear() == 2013)) && Details.starttime.length > 1)
                        Details.starttime = Details.starttime[1];
                    else 
                        Details.starttime = 0;
                        
		    // Log("isLive=" + isLive);
		    if (onlySweden != "false" && onlySweden != false) {
		        //proxy = 'http://playse.kantaris.net/?mode=native&url=';
		        $.getJSON( "http://smart-ip.net/geoip-json?callback=?",
			           function(data){
				       if(data.countryCode != 'SE'){
				           
				           //Geofilter.show();	
				       }
			           }
			         );
                    }
                } catch(err) {
                    Log("Details Exception:" + err.message);
                }
		if(Name.length > 47){
		    Name = Name.substring(0, 47)+ "...";
		}
                Player.setNowPlaying(Name);
		html = '<div class="project-text">';
		html+='<div class="project-name">';
		html+='<h1>'+Name+'</h1>';
		html+='<div class="project-meta border"><a id="aired" type="text">Sändes: </a><a>'+DetailsPlayTime+'</a></div>';
		html+='<div class="project-meta border"><a id="available" type="text">Tillgänglig till </a><a>'+AvailDate+'</a></div>';
		html+='<div class="project-meta"><a id="duration" type="text">Längd: </a><a>'+VideoLength+'</a></div>';
		html+='<div class="project-desc">'+Description+'</div>';
		html+='<div class="bottom-buttons">';
                if (notAvailable) {
                    html+='<a href="#" id="notStartedButton" class="link-button">Ej Startat</a>';
                    html+='<a href="#" id="backButton" class="link-button selected">Tillbaka</a>';
                } else {
                    html+='<a href="#" id="playButton" class="link-button selected">Spela upp</a> ';
                    html+='<a href="#" id="backButton" class="link-button">Tillbaka</a>';
                }
                html+=' </div>';
		html+=' </div>';
		
                html+='</div>';
		html+='<img class="imagestyle" src="'+DetailsImgLink+'" alt="Image" />';
            	$('#projdetails').html(html);
	        $video = html = null;
		
		Language.setDetailLang();
                loadingStop();
                data = null;       
            },
            error: function(XMLHttpRequest, textStatus, errorThrown)
            {
                loadingStop();
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


Details.startPlayer = function()
{
    Player.setDuration(Details.duration);
    // Log("isLive:" + isLive + " starttime:" + Details.starttime);
    Player.startPlayer(this.Geturl(), isLive, this.starttime);
    
};

function dataLengthToVideoLength($video)
{
    VideoLength = "";
    var duration = $video.find('section').find('a').attr('data-length');

    if (!duration)
        return VideoLength;

    var hours = Math.floor(duration/3600);
    if (hours > 0) {
        VideoLength = hours + " h "
        duration = duration - (hours*3600)
    }
    var minutes = Math.floor(duration/60);
    if (minutes > 0) {
        VideoLength = VideoLength + minutes + " min "
        duration = duration - (minutes*60)
    }
    var seconds = Math.floor(duration/60);
    if (seconds > 0) {
        VideoLength = VideoLength + seconds + " sek"
    }                      
    return VideoLength;
}
