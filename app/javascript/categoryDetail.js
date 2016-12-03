var categoryDetail =
{
};

categoryDetail.onLoad = function(refresh)
{
    if (!refresh)
	PathHistory.GetPath();

    if (!detailsOnTop) {
        var location = getLocation(refresh);
	this.loadXml(this.Geturl(refresh), refresh);
    }
//	widgetAPI.sendReadyEvent();
};

categoryDetail.getCategoryName = function()
{
    return decodeURIComponent(document.title.match(/[^\/]+\/([^\/]+)/)[1]);
};

categoryDetail.onUnload = function()
{

};

categoryDetail.Geturl=function(refresh){
    var url;
    url = getLocation(refresh);
    var parse;
    var name="";
    if (url.match(/category=/))
    {
        name = url.match(/category=(.+)&catThumb/)[1]
    }
    return name;
};

categoryDetail.loadXml = function(url, refresh) {
    $("#content-scroll").hide();

    switch (channel) {
    case "svt":
        categoryDetail.loadSvt(url, refresh);
        break;
    case "viasat":
        categoryDetail.loadViasat(url, refresh);
        break;
    case "tv4":
        categoryDetail.loadTv4(url, refresh);
        break;
    case "dplay":
        categoryDetail.loadDplay(url, refresh);
        break;
    }
};

categoryDetail.loadSvt = function(url, refresh) {
    requestUrl(url,
               function(status, data)
               {
                   itemCounter = 0;
                   Svt.decode_category(data);
                   data = null;
               },
               {callLoadFinished:true,
                refresh:refresh
               }
              );
};

categoryDetail.loadViasat = function(url, refresh) {

    var url = Viasat.getUrl(url);
    requestUrl(url,
               function(status, data)
               {
                   itemCounter = 0;
                   Viasat.decode_shows(data.responseText, url, false, false, 
                                       function() {loadFinished(status, refresh)}
                                      );
               },
               {cbError:function(status, data) {loadFinished(status, refresh)}}
              );
};

categoryDetail.loadTv4 = function(url, refresh) {
    requestUrl(Tv4.getUrl(url),
               function(status, data)
               {
                   itemCounter = 0;
                   Tv4.decode_shows(data.responseText);
                   data = null
               },
               {callLoadFinished:true,
                refresh:refresh
               }
              );
};

categoryDetail.loadDplay = function(url, refresh) {

    Dplay.getAllShows(function() {loadFinished("success", refresh)}, url);
};

categoryDetail.decode_data = function (categoryData) {

    try {
        var Name;
        var Link;
        var ImgLink;

        categoryData = categoryData.split("</article>");
        categoryData.pop();

        for (var k=0; k < categoryData.length; k++) {
            categoryData[k] = "<article" + categoryData[k].split("<article")[1];
            Name = categoryData[k].match(/data-title="([^"]+)"/)[1];
            Link = Svt.fixLink(categoryData[k].match(/href="([^"]+)"/)[1]);
            if (Svt.isPlayable(Link))
                // Episode amongst shows - skip
                continue;
            // Log(Link);
            ImgLink = categoryData[k].match(/data-imagename="([^"]+)"/);
            if (!ImgLink) {
                ImgLink = categoryData[k].match(/src="([^"]+)"/)[1];
            } else {
                ImgLink = ImgLink[1];
            }
            ImgLink = Svt.fixLink(ImgLink);
            categoryData[k] = "";
            showToHtml(Name, ImgLink, Link);
        }
    } catch(err) {
        Log("decode_data Exception:" + err.message + " data[" + k + "]:" + categoryData[k]);
    }
};
//window.location = 'showList.html?name=' + ilink + '&history=' + historyPath + iname + '/';
