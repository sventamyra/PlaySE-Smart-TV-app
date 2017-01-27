var categoryDetail = {};

categoryDetail.onLoad = function(location, refresh)
{
    if (!refresh)
	PathHistory.GetPath();

    if (!detailsOnTop) {
	this.loadXml(location, refresh);
    }
};

categoryDetail.getCategoryName = function()
{
    return decodeURIComponent(document.title.match(/[^\/]+\/([^\/]+)/)[1]);
};

categoryDetail.onUnload = function()
{
};

categoryDetail.loadXml = function(location, refresh) {
    $("#content-scroll").hide();
    if (location.match(/category=/))
        location = location.match(/category=(.+)&catThumb/)[1]
    var url = Channel.getUrl("categoryDetail", {refresh:refresh, location:location});
    var cbComplete = function(status){loadFinished(status, refresh)};
    requestUrl(url,
               function(status, data)
               {
                   // Clear to avoid something with setPosition?
                   itemCounter = 0;
                   Channel.decodeCategoryDetail(data, 
                                                {url:url, 
                                                 refresh:refresh,
                                                 cbComplete:function(){cbComplete(status)}
                                                });
                   data = null;
               },
               {cbError:function(status){cbComplete(status)},
                headers:Channel.getHeaders()
               });
};
//window.location = 'showList.html?name=' + ilink + '&history=' + historyPath + iname + '/';
