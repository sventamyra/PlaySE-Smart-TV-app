var showList =
{
};

showList.onLoad = function(refresh)
{
    if (!refresh)
	PathHistory.GetPath();
    if (!detailsOnTop)
	this.loadXml(refresh);
//	widgetAPI.sendReadyEvent();
};

showList.onUnload = function()
{
	Player.deinit();
};


showList.getUrl=function(location){
    if (location.indexOf("name=") > 0)
    {
        return location.match(/name=(.+)&history=/)[1];
    }
    return "";
};

showList.loadXml = function(refresh)
{
    $("#content-scroll").hide();
    var location = getLocation(refresh);
    var url = this.getUrl(location);
    var season   = location.match("season=([0-9]+)");
    season = (season) ? +season[1] : null
    var variant = location.match("variant=([^&]+)");
    variant = (variant) ? variant[1] : null
    var cbComplete = function(status){loadFinished(status, refresh)};
    requestUrl(url,
               function(status, data)
               {
                   Channel.decodeShowList(data, 
                                          {url:url, 
                                           refresh:refresh,
                                           strip_show:true,
                                           is_clips:(location.indexOf("clips=1") != -1),
                                           season:season,
                                           variant:variant,
                                           cbComplete:function(){cbComplete(status)}
                                          });
                   data = null;
               },
               {cbError:function(status, data) {cbComplete(status)},
                headers:Channel.getHeaders()
               }
              );
};
//window.location = 'project.html?ilink=' + ilink + '&history=' + historyPath + iname + '/';
