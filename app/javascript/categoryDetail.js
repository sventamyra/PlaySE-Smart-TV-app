var categoryDetail = {};

categoryDetail.onLoad = function(location, refresh) {
    if (!refresh)
	PathHistory.GetPath();

    if (!detailsOnTop) {
	this.loadXml(location, refresh);
    }
};

categoryDetail.getCategoryName = function() {
    return decodeURIComponent(document.title.match(/[^\/]+\/([^\/]+)/)[1]);
};

categoryDetail.onUnload = function() {
};

categoryDetail.loadXml = function(location, refresh) {
    $('#content-scroll').hide();
    var url = location;
    if (location.match(/category=/))
        url = location.match(/category=(.+)&catThumb/)[1];
    url = Channel.getUrl('categoryDetail', {refresh:refresh, location:url});
    var cbComplete = function(status) {
        if (refresh || myPos || !Channel.checkResume(location)) {
            if (refresh || myPos)
                Channel.markResumed();
            loadFinished(status, refresh);
        }
    };
    requestUrl(url,
               function(status, data) {
                   // Clear to avoid something with setPosition?
                   itemCounter = 0;
                   Channel.decodeCategoryDetail(data, 
                                                {url:url, 
                                                 refresh:refresh,
                                                 cbComplete:function(){cbComplete(status);}
                                                });
                   data = null;
               },
               {cbError:cbComplete,
                headers:Channel.getHeaders()
               });
};
