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
               {callLoadFinished:true,
                refresh:refresh
               }
              );
};

live.getTv4LiveJson = function (refresh) {
 
    requestUrl(Tv4.getUrl("live"),
               function(status, data)
               {
                   Tv4.decode(data.responseText);
                   data = null
               },
               {callLoadFinished:true,
                refresh:refresh
               }
              );
};

live.getDplayChannelJson = function (refresh) {

    requestUrl(Dplay.getUrl("channels"),
               function(status, data)
               {
                   Dplay.decodeChannels(data.responseText);
                   data = null
               },
               {callLoadFinished:true,
                refresh:refresh
               }
              );
};

live.getSvtChannelJson = function (refresh) {

    requestUrl('http://www.svtplay.se/kanaler',
               function(status, data)
               {
                   Svt.decodeChannels(data);
                   data = null
	       },
               {cbComplete:function(xhr, status) {live.getLiveJson(refresh)}}
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
               {callLoadFinished:true,
                refresh:refresh
               }
              );
};

//window.location = 'project.html?ilink=' + ilink;
