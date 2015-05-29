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
    var title = this.urldecode(name);
    var html;
    html = '<li class="root-item"><a href="index.html" class="active">Sökning: ' + title + '</a></li>';
    if (count != undefined)
        html += '<li class="root-item"><a href="index.html" class="active"> ' + count + '</a></li>';
    $('.dropdown').html($(html));
};

SearchList.loadXml = function(refresh) {
    var parentThis = this;
    requestUrl('http://www.svtplay.se/sok?q='+this.Geturl(refresh),
               function(status, data)
               {
                   data = data.responseText.split("id=\"search-categories");
                   data = (data.length > 1) ? data[1] : data[0];
                   data = data.split("id=\"search-");
                   data.shift();
                   data = data.join("").split("</article>");
                   data.pop();
                   Section.decode_data(data);
                   Log("itemCounter:" + itemCounter);
                   restorePosition();
               },
               null,
               function() {
                   parentThis.setPath(parentThis.Geturl(refresh), itemCounter, refresh);
               }
              );
};