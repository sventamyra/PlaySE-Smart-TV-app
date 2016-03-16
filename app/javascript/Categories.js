var Categories =
{

};

Categories.onLoad = function(refresh)
{
    document.title = "Kategorier";
    if (channel == "svt")
        Svt.updateCategoryTitle();
    else if (channel == "viasat")
        Viasat.updateCategoryTitle();
    else if (channel == "dplay")
        Dplay.updateCategoryTitle();

    if (!refresh) {
	Header.display(document.title);
    }
    if (!detailsOnTop)
	this.loadXml(refresh);
};

Categories.onUnload = function()
{

};

Categories.loadXml = function(refresh) {
    $("#content-scroll").hide();
    switch (channel) {
    case "svt":
        Categories.loadSvt(refresh);
        break;
    case "viasat":
        Categories.loadViasat(refresh);
        break;
    case "tv4":
        Categories.loadTv4(refresh);
        break;
    case "dplay":
        Categories.loadDplay(refresh);
        break;
    }
};

Categories.loadSvt = function(refresh) {
    Svt.toggleBButton();
    requestUrl('http://www.svtplay.se/program',
               function(status, data)
               {
                   Svt.decodeCategories(data);
                   data = null;
               },
               {callLoadFinished:true,
                refresh:refresh
               }
              );
};

Categories.setNextLocation = function()
{
    if (channel == "svt")
        setLocation(Svt.getNextCategory());
    else if (channel == "viasat")
        setLocation(Viasat.getNextCategory());
    else if (channel == "dplay")
        setLocation(Dplay.getNextCategory());
};

Categories.loadViasat = function(refresh) {
    url = Viasat.getUrl("categories")
    Viasat.toggleBButton();
    requestUrl(url,
               function(status, data)
               {
                   Viasat.decodeCategories(data.responseText, url, function(){loadFinished(status, refresh)});
                   data = null;
               },
               {cbError: function(status, data) {loadFinished(status, refresh)}}
              );
};

Categories.loadTv4 = function(refresh) {
    requestUrl(Tv4.getUrl("categories"),
               function(status, data)
               {
                   Tv4.decodeCategories(data.responseText);
                   data = null;
               },
               {callLoadFinished:true,
                refresh:refresh
               }
              );
};

Categories.loadDplay = function(refresh) {
    url = Dplay.getUrl("categories")
    Dplay.toggleBButton();
    Dplay.categories(url, refresh);
};
//window.location = 'categoryDetail.html?category=' + ilink + '&history=Kategorier/' + iname +'/';


