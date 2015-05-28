var categoryDetail =
{

};

categoryDetail.onLoad = function(refresh)
{
    if (!detailsOnTop)
	this.loadXml(refresh);
    if (!refresh)
	PathHistory.GetPath();
//	widgetAPI.sendReadyEvent();
};

categoryDetail.onUnload = function()
{

};
// categoryDetail.html?category=/barn&history=Kategorier/Barn
categoryDetail.Geturl=function(refresh){
    var url = myLocation;
    if (refresh)
        url = myRefreshLocation;
    var parse;
    var name="";
    if (url.indexOf("category=")>0)
    {
		// parse = url.substring(url.indexOf("=")+13,url.length);
		parse = url.substring(url.indexOf("=")+1,url.length);
		if (url.indexOf("&")>0)
		{
			name = parse.substring(0,parse.indexOf("&"));
			
		}
		else{
			name = parse;
		}
	}
    return name.replace("tvcategories\/", "");
};


categoryDetail.loadXml = function(refresh){
    requestUrl(this.Geturl(refresh),
               function(status, data)
               {
                   data = data.responseText.split("ul class=\"play_category__tab")[1];
                   data = data.split("div id=\"playJs-alphabetic-list")[1];
                   data = data.split("div class=\"play_js-videolist__item-container")[1];
                   data = data.split("</article>");
                   data.pop();
                   // Log("articles:"+ data.length);
                   itemCounter = 0;
                   categoryDetail.decode_data(data);
                   Log("itemCounter:" + itemCounter);
                   restorePosition();
               }
              );
};


categoryDetail.decode_data = function (categoryData) {

    try {
        var html;
        var Name;
        var Link;
        var ImgLink;
        for (var k=0; k < categoryData.length; k++) {
            categoryData[k] = "<article" + categoryData[k].split("<article")[1];
            Name = categoryData[k].match(/data-title="([^"]+)"/)[1];
            Link = fixLink(categoryData[k].match(/href="([^"]+)"/)[1]);
            // Log(Link);
            ImgLink = categoryData[k].match(/data-imagename="([^"]+)"/);
            if (!ImgLink) {
                ImgLink = categoryData[k].match(/src="([^"]+)"/)[1];
            } else {
                ImgLink = ImgLink[1];
            }
            ImgLink = fixLink(ImgLink);
            categoryData[k] = "";

            if(itemCounter % 2 == 0){
		if(itemCounter > 0){
		    html = '<div class="scroll-content-item topitem">';
		}
		else{
		    html = '<div class="scroll-content-item selected topitem">';
		}
	    }
	    else{
		html = '<div class="scroll-content-item bottomitem">';
	    }
	    html += '<div class="scroll-item-img">';
	    html += '<a href="showList.html?name=' + Link + '&history=' + document.title  + Name + '/" class="ilink"><img src="' + ImgLink + '" width="240" height="135" alt="' + Name + '" /></a>';
	    html += '</div>';
	    html += '<div class="scroll-item-name">';
	    html +=	'<p><a href="#">' + Name + '</a></p>';
	    //html += '<span class="item-date">' + Description + '</span>';
	    html += '</div>';
	    html += '</div>';
	    if(itemCounter % 2 == 0){
		$('#topRow').append($(html));
	    }
	    else{
		$('#bottomRow').append($(html));
	    }
	    itemCounter++;
        }
    } catch(err) {
        Log("decode_data Exception:" + err.message + " data[" + k + "]:" + categoryData[k]);
    }
};
//window.location = 'showList.html?name=' + ilink + '&history=' + historyPath + iname + '/';
