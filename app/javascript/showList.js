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


showList.Geturl=function(refresh){
    var url = getLocation(refresh);
    var name="";
    if (url.indexOf("name=")>0)
    {
        name = url.match(/name=(.+)&history=/)[1];
    }
    return name;
};

showList.loadXml = function(refresh)
{
    $("#content-scroll").hide();
    var gurl = this.Geturl(refresh);
    var location = getLocation(refresh);
    var is_clips = (location.indexOf("clips=1") != -1);
    var season   = location.match("season=([0-9]+)");
    season = (season) ? +season[1] : null
    requestUrl(gurl,
               function(status, data)
               {
                   switch (channel) {
                   case "svt":
                       Svt.decode_show(data, gurl, is_clips, season);
                       loadFinished(status, refresh);
                       break;

                   case "viasat":
                       Viasat.decode(data.responseText, gurl, true, function(){loadFinished(status, refresh)}, is_clips);
                       break;

                   case "tv4":
                       Tv4.decode(data.responseText, true, is_clips, function(){loadFinished(status, refresh)});
                       break;

                   case "dplay":
                       Dplay.decode(data.responseText, {name:"showList", url:gurl}, true, function(){loadFinished(status, refresh)});
                       break;
                   }
               },
               {cbError:function(status, data) {loadFinished(status, refresh)}}
              );
};

//window.location = 'project.html?ilink=' + ilink + '&history=' + historyPath + iname + '/';
