var live =
{
};

live.onLoad = function(refresh)
{
    document.title = 'Kanaler & livesändningar'
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
		       html += '<a href="details.html?ilink=' + Link + '&history=' + document.title + '/' + Name + '/" class="ilink" data-length="' + Duration + '" is-live><img src="' + ImgLink + '" width="240" height="135" alt="" /></a>';
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
                   data = ("<article" + data).split("</article>");
                   data.pop();
                   // Log("items:" + data.length + ", channels:" + itemCounter);
                   Section.decode_data(data);
                   data = null;
                   Log("itemCounter:" + itemCounter);
                   if (!restorePosition() && !refresh)
                       $("#content-scroll").show();
               },
               function(status, data) {
                   if (!refresh)
                       $("#content-scroll").show();
               }
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
