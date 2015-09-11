var SearchList =
{

};

SearchList.onLoad = function(refresh)
{
    if (!detailsOnTop) {
        this.setPath(this.Geturl(refresh), undefined, refresh);
	this.loadXml(refresh);
    } else {
        this.setPath(this.Geturl(refresh), itemCounter, refresh);
    }
//	widgetAPI.sendReadyEvent();
};

SearchList.onUnload = function()
{
	Player.deinit();
};

SearchList.urldecode = function(str) {
   return decodeURIComponent((str+'').replace(/\+/g, '%20'));
};

SearchList.Geturl=function(refresh){
    var url = myLocation;
    if (refresh)
        url = myRefreshLocation;
    var name="";
    if (url.indexOf("=")>0)
    {
        name = url.substring(url.indexOf("=")+1,url.length);
    }
    return name;
};

SearchList.setPath = function(name, count, refresh) {
    document.title = "Sökning: " + name;
    if (refresh)
        return;
    Header.display('');
    var title = document.title;
    if (count != undefined)
        title = title + '/' + count + '/'
    Header.display(title);
};

SearchList.loadXml = function(refresh) {
    $("#content-scroll").hide();
    var parentThis = this;
    if (channel == "viasat") {
        Viasat.search(parentThis.Geturl(refresh), function() {SearchList.finish(parentThis,"success",refresh)});
        return
    } else if (channel == "kanal5") {
        Kanal5.search(parentThis.Geturl(refresh), function() {SearchList.finish(parentThis,"success",refresh)});
        return
    }
    requestUrl('http://www.svtplay.se/sok?q='+this.Geturl(refresh),
               function(status, data)
               {
                   data = data.responseText.split("id=\"search-categories");
                   data = (data.length > 1) ? data[1] : data[0];
                   data = data.split("id=\"search-");
                   data.shift();
                   Section.decode_data(data.join(""));
                   SearchList.finish(parentThis, status, refresh);
               },
               function(status, data) {
                   SearchList.finish(parentThis, status, refresh);
               }
              );
};

SearchList.finish = function(parent, status, refresh) {
    loadFinished(status, refresh);
    parent.setPath(parent.Geturl(refresh), itemCounter, refresh);
};
