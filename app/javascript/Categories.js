var Categories = {};

Categories.onLoad = function(refresh) {
    if (!refresh) {
        document.title = Channel.getCategoryTitle();
	Header.display(document.title);
    }
    if (!detailsOnTop)
	this.loadXml(refresh);
};

Categories.onUnload = function() {
};

Categories.loadXml = function(refresh) {
    $('#content-scroll').hide();
    var url = Channel.getUrl('categories', {refresh:refresh});
    var cbComplete = function(status){loadFinished(status, refresh)};
    requestUrl(url,
               function(status, data) {
                   Channel.decodeCategories(data, 
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
//window.location = 'categoryDetail.html?category=' + ilink + '&history=Kategorier/' + iname +'/';
