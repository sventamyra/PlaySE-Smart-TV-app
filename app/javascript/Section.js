var Section = {
    loaded: false
};

Section.onLoad = function(location, refresh) {
    if (!refresh) {
        document.title = Channel.getSectionTitle(location);
	Header.display(document.title);
    }
    if (!detailsOnTop) {
	this.loadXml(location, refresh);	
    }
};

Section.loadXml = function(location, refresh) {
    $('#content-scroll').hide();
    var cbComplete = function(status){loadFinished(status, refresh);};
    var url = Channel.getUrl('section', {refresh:refresh, location:location});
    requestUrl(url,
               function(status, data) {
                   Channel.decodeSection(data, 
                                         {url:url, 
                                          refresh:refresh,
                                          cbComplete:function(){cbComplete(status);}
                                         });
                   data = null;
               },
               {cbError:function(status){cbComplete(status);},
                headers:Channel.getHeaders()
               });
};
