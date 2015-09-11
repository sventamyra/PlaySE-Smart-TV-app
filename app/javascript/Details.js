var widgetAPI = new Common.API.Widget();
var isLive = false;
var currentTime = 0;
var countd=0;
var downCounter;

var Details =
{
    url:"",
    duration:null,
    startTime:0,
    fetchedDetails:null
};

Details.init = function() {
    isLive = false;
    Details.url = "";
    Details.duration = null;
    Details.startTime = 0;
};

Details.onLoad = function()
{
    $(".slider-body").hide();
    $(".content").show();
    Buttons.setKeyHandleID(1);
    Details.refresh(false);
};

Details.onUnload = function()
{
	Player.deinit();
};

Details.refresh = function (isBackground) {
    Details.init();
    Header.display('');
    PathHistory.GetPath();
    this.loadXml(isBackground);
}

Details.Geturl=function(detailsUrl){
    var url;
    if (!detailsUrl)
        url = myLocation;
    else
        url = detailsUrl;
    var parse;
    var name=url;
    if (url.indexOf("ilink=")>0 || url.indexOf("name=")>0)
    {
        name = url.match(/(ilink|name)=(.+)&history=/)[2]
    }
    if (channel == "viasat")
        name = Viasat.getDetailsUrl(name);
    else if (channel == "kanal5")
        name = Kanal5.getDetailsUrl(name);
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
    if (channel == "viasat") {
        Viasat.getPlayUrl(gurl);
        return 0;
    } else if (channel == "kanal5") {
        Kanal5.getPlayUrl(gurl);
        return 0;
    }
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

Details.loadXml = function(isBackground) {
    $('#projdetails').html("");
    Details.url = fixLink(this.Geturl());
    requestUrl(Details.url,
               false,
               null,
               function(status, data)
               {
                   var html;
                   programData = Details.getData(Details.url, data);
                   Details.fetchedDetails = programData;
                   if (!isBackground) {
		       Language.setDetailLang();
                       Player.setNowPlaying(programData.name);
                       loadingStop();
                   }
                   loadThumb(programData.thumb, function() {
                       if(programData.name.length > 47){
	                   programData.name = programData.name.substring(0, 47)+ "...";
                       }
		       html = '<div class="project-text">';
		       html+='<div class="project-name">';
		       html+='<h1>'+programData.name+'</h1>';
                       if (programData.show) {
		           html+='<div class="project-meta"><a id="genre" type="text"></a><a>'+programData.genre+'</a></div>';
                       } else {
		           html+='<div class="project-meta border"><a id="aired" type="text">Sändes: </a><a>'+programData.air_date+'</a></div>';
                           if (programData.avail_date)
		               html+='<div class="project-meta border"><a id="available" type="text">Tillgänglig till </a><a>'+programData.avail_date+'</a></div>';
		           html+='<div class="project-meta"><a id="duration" type="text">Längd: </a><a>'+programData.duration+'</a></div>';
                       }
		       html+='<div class="project-desc">'+programData.description+'</div>';
		       html+='<div class="bottom-buttons">';
                       if (programData.show) {
                           html+='<a href="#" id="enterShowButton" class="link-button selected" style="margin-left:80px;">Till Programmet</a>';
                       } else if (programData.not_available) {
                           html+='<a href="#" id="notStartedButton" class="link-button" style="margin-left:80px;">Ej Startat</a>';
                       } else {
                           html+='<a href="#" id="playButton" class="link-button selected" style="margin-left:80px;">Spela upp</a>';
                       }
                       html+=' </div>';
		       html+=' </div>';
		       
                       html+='</div>';
		       html+='<img class="imagestyle" src="'+programData.thumb+'" alt="Image" />';
            	       $('#projdetails').html(html);
	               html = null;
                       if (!detailsOnTop)
                           fetchPriorLocation();
                   });
               },
               function(textStatus, errorThrown)
               {
                   if (!isBackground) {
                       loadingStop();
                   }
               }
              )
};


Details.fetchData = function(detailsUrl) {
    // Log("Details.fetchData");
    Details.init();
    Details.fetchedDetails = null;
    var detailsXhr = new XMLHttpRequest();
    detailsUrl = fixLink(this.Geturl(detailsUrl));
    detailsXhr.onreadystatechange = function () {
        if (detailsXhr.readyState == 4) {
            Details.fetchedDetails = Details.getData(detailsUrl,detailsXhr);
            detailsXhr.destroy();
        }
    };
    detailsXhr.open("GET", detailsUrl);
    detailsXhr.send();
};

Details.getData = function(url, data) {

    if (channel == "svt") 
        return Details.getSvtData(url, data);
    else if (channel == "viasat") 
        return Viasat.getDetailsData(url,data)
    else if (channel == "kanal5") 
        return Kanal5.getDetailsData(url,data)
};

Details.getSvtData = function(url, data) {
    if (url.indexOf("/video/") == -1 && url.indexOf("/klipp/") == -1 && url.indexOf("/kanaler/") == -1) {
        return Details.getShowData(url, data);
    }

    data = data.responseText.split("<section class=\"play_js-tabs")[0]
    data = data.split("<aside class=\"svtoa-related svt-position-relative")[0];


    var Name="";
    var Title = Name;
    var DetailsImgLink="";
    var DetailsPlayTime="";
    var VideoLength = "";
    var AvailDate=null;
    var Description="";
    var onlySweden="";
    var $video;
    var isChannel=false;
    var NotAvailable=false;
    var startTime=0;
    try {

        if (url.indexOf("/kanaler/") > -1) {
            data = data.split("<div class=\"play_channel-schedules")[0];
            $video = $(data).find('div.play_channels');
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
            Title = DetailsPlayTime + " " + Name;
            isLive = true;

        } else if (url.indexOf("oppetarkiv") > -1) {
            Name = $($(data).find('img')[1]).attr('alt');
            Title = Name;
            // Log("Name:" + Name);
	    DetailsImgLink = $($(data).find('img')[1]).attr('srcset');
            DetailsImgLink = fixLink(DetailsImgLink.split(",").pop().split(" ")[1]);
	    DetailsPlayTime = $($(data).find('strong')[0]).text();
            VideoLength = $($(data).find('strong')[1]).text();

            Description = $(data).find('div.svt-text-bread').text();

	    onlySweden = ($(data).find('span').filter(function() {
                return $(this).attr('class') == "svtoa-icon-geoblock svtIcon";
            }).length > 0);


        } else {
            $video = $(data).find('div.play_container');
            if ($video.find('section').find('a').attr('data-livestart'))
		isLive = true;

            Name = $video.find('a').attr('data-title');
            Title = Name;
	    DetailsImgLink = fixLink($video.find('img').attr('data-imagename'));
            // Log(DetailsImgLink);
            var DetailsClock = "";
            try {
                DetailsClock = $video.find('p').find('time').attr('datetime'); 
                DetailsClock = DetailsClock.replace(/.+T([^+]+)+.+/, "$1");
            } catch(err) {
                Log("Exception:" + err.message);
            }
            DetailsPlayTime = $video.find('p').find('time').text();
            // Log(DetailsPlayTime);
            // Log(DetailsClock);
            if (DetailsPlayTime.indexOf(DetailsClock.replace(":", ".")) == -1)
                DetailsPlayTime  = DetailsPlayTime + " " + DetailsClock;
            
            if (isLive) {
                NotAvailable = +($video.find('section').find('a').attr('data-livestart')) < 0;
                // Log("NotAvailable:" + NotAvailable + " " +$video.find('section').find('a').attr('data-livestart'));
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
	if(!Language.getisSwedish()){
	    DetailsPlayTime=DetailsPlayTime.replace("igår","yesterday");
	    DetailsPlayTime=DetailsPlayTime.replace("idag","today");
	}

        Details.duration = VideoLength.trim();

        startTime = DetailsPlayTime.match(/([0-9]+[:.][0-9]+)/);
        if ((isChannel || (isLive && getDeviceYear() == 2013)) && startTime.length > 1)
            startTime = startTime[1];
        else 
            startTime = 0;
        Details.startTime = startTime;
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
        Log("Name:" + Name);
        Log("DetailsPlayTime:" + DetailsPlayTime);
        Log("AvailDate:" + AvailDate);
        Log("VideoLength:" + VideoLength);
        Log("Description:" + Description);
        Log("NotAvailable:" + NotAvailable);
        Log("DetailsImgLink:" + DetailsImgLink);
    }
    $video = data = null;
    return {name          : Name,
            title         : Title,
            is_live       : isLive,
            air_date      : DetailsPlayTime,
            avail_date    : AvailDate,
            start_time    : startTime,
            duration      : VideoLength.trim(),
            description   : Description,
            not_available : NotAvailable,
            thumb         : DetailsImgLink
    }
};

Details.getShowData = function(url, data) {

    var Name="";
    var Genre = Name;
    var DetailsImgLink="";
    var Description="";

    try {
        data = data.responseText.split("<section class=\"play_title-page__title-info")[1];
        data = data.split("<section class=\"play_js-tabs")[0];
        data = data.split("id=\"videos-in-same-category")[0];
        var $show = $(data);

        Name  = $show.find('h1').text();
	DetailsImgLink = fixLink($show.find('img').attr('data-imagename'));
	Description = $($show.find('p.play_title-page-info__description')[1]).text();
        Genre = [];
        GenreData = $show.find('li.play_tag-list__tag').find("a");
        for (var i=0; i < GenreData.length;i++) {
            Genre.push($(GenreData[i]).text());
        }
        Genre = Genre.join('/');
        if (!Genre)
            Genre = $($show.find('p.play_title-page-info__description')[0]).text();
        if (Genre == Description)
            Genre == "";

    } catch(err) {
        Log("Details Exception:" + err.message);
        Log("Name:" + Name);
        Log("Genre:" + Genre);
        Log("Description:" + Description);
        Log("DetailsImgLink:" + DetailsImgLink);
    }
    $show = data = null;
    return {show          : true,
            name          : Name,
            description   : Description,
            genre         : Genre,
            thumb         : DetailsImgLink
           }
};

Details.startPlayer = function()
{
    Player.setDuration(Details.duration);
    // Log("isLive:" + isLive + " startTime:" + Details.startTime);
    Player.startPlayer(this.Geturl(), isLive, this.startTime);
    
};

function dataLengthToVideoLength($video, duration)
{
    VideoLength = "";
    if (!duration && $video) {
        duration = $video.find('section').find('a').attr('data-length');
    }
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
    var seconds = Math.round(duration - (hours*3600) - (minutes*60));
    if (seconds > 0) {
        VideoLength = VideoLength + seconds + " sek"
    }                      
    return VideoLength;
}

loadThumb = function (thumb, callback) {
    var img = document.createElement("img");
    img.onload = callback;
    img.onerror = callback;
    img.src = thumb;
};
