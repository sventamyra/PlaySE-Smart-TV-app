var live =
{
};

live.onLoad = function(refresh)
{
    if (channel == "svt")
        document.title = 'Kanaler & livesändningar'
    else if (channel == "viasat")
        document.title = 'Kanaler'
    else if (channel == "tv4")
        document.title = 'Livesändningar'
    else if (channel == "dplay")
        document.title = 'Kanaler'

    if (!refresh) {
	Header.display(document.title);
    }
    if (!detailsOnTop)
	this.getChannelsJson(refresh);
//	widgetAPI.sendReadyEvent();
};

live.onUnload = function()
{
	Player.deinit();
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

live.getChannelsJson = function(refresh) {
    $("#content-scroll").hide();
    if (channel == "svt") {
        live.getSvtChannelJson(refresh);
    } else if (channel == "viasat") {
        live.getViasatChannelJson(refresh);
    } else if (channel == "tv4") {
        live.getTv4LiveJson(refresh);
    } else if (channel == "dplay") {
        live.getDplayChannelJson(refresh);
    }

};

live.getViasatChannelJson = function (refresh) {
 
    requestUrl(Viasat.getUrl("channels"),
               function(status, data)
               {
                   Viasat.decodeChannels(data.responseText);
                   data = null
               },
               null,
               null,
               true,
               refresh
              );
};

live.getTv4LiveJson = function (refresh) {
 
    requestUrl(Tv4.getUrl("live"),
               function(status, data)
               {
                   Tv4.decode(data.responseText);
                   data = null
               },
               null,
               null,
               true,
               refresh
              );
};

live.getDplayChannelJson = function (refresh) {

    requestUrl(Dplay.getUrl("channels"),
               function(status, data)
               {
                   Dplay.decodeChannels(data.responseText);
                   data = null
               },
               null,
               null,
               true,
               refresh
              );
};

live.getSvtChannelJson = function (refresh) {

    requestUrl('http://www.svtplay.se/kanaler',
               function(status, data)
               {
                   var html;
                   var $video;
                   var Name;
                   var Duration;
                   var Link;
                   var ImgLink;
                   var starttime;
                   var endtime;
                   var BaseUrl = 'http://www.svtplay.se/kanaler';

                   data = data.responseText.split("<div class=\"play_channel-schedules\"")[0];
	           $(data).find('div').filter(function() {
                       return $(this).attr('class').indexOf("play_channels__active-video-info") > -1;
                   }).each(function(){
                       
		       $video = $(this); 
                       Name = $video.attr('data-channel');
	               Link = BaseUrl + '/' + Name;
                       // Log("Link:" + Link);
	               ImgLink  = GetChannelThumb(BaseUrl, Name);
                       // Log("ImgLink:" + ImgLink);
                       starttime = $video.find('div').filter(function() {
                           if ($(this).attr('data-starttime'))
                               return true;
                           else 
                               return false;
                       }).attr('data-starttime')*1;
                       endtime = $video.find('div').filter(function() {
                           if ($(this).attr('data-endtime'))
                               return true;
                           else 
                               return false;
                       }).attr('data-endtime')*1;
                       Duration  = Math.round((endtime-starttime)/1000);
                       starttime = tsToClock(starttime);
                       endtime   = tsToClock(endtime);
                       Name = starttime + "-" + endtime + " " + $($video.children()[0]).text();
                       toHtml({name:Name,
                               duration:Duration,
                               is_live:false,
                               is_channel:true,
                               running:false,
                               starttime:"",
                               link:Link,
                               link_prefix:'<a href="details.html?ilink=',
                               description:"",
                               thumb:ImgLink
                              });
	           });
                   data = null;
	       },
               null,
               function(xhr, status)
               {
                   live.getLiveJson(refresh);
               }
              );
};

live.getLiveJson = function(refresh) {

    requestUrl('http://www.svtplay.se/live',
               function(status, data)
               {
                   data = data.responseText.split("<article");
                   data.shift();
                   data = ("<article" + data);
                   // Log("items:" + data.length + ", channels:" + itemCounter);
                   Section.decode_data(data);
                   data = null
               },
               null,
               null,
               true,
               refresh
              );
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
//window.location = 'project.html?ilink=' + ilink;
