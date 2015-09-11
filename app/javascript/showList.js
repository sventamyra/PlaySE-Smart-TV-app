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
    var url = myLocation;
    if (refresh)
        url = myRefreshLocation;
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
    requestUrl(gurl,
               function(status, data)
               {
                   switch (channel) {
                   case "svt":
                       data = data.responseText.split("id=\"videos-in-same-category")[0];
                       if (!data.match("play_js-tabs")) {
                           data = data.split("<article").slice(1).join("<article");
                           Section.decode_data("<article" + data);
                       } else {
                           data = "<section class=\"play_js-tabs\"" + data.split("class=\"play_js-tabs")[1];
                           showList.decode_data(data);
                       }
                       loadFinished(status, refresh);
                       break;

                   case "viasat":
                       Viasat.decode(data.responseText, gurl, true, function(){loadFinished(status, refresh)});
                       break;

                   case "kanal5":
                       Kanal5.decode(data.responseText, {name:"showList", url:gurl}, true, function(){loadFinished(status, refresh)});
                       break;
                   }
               },
               function(status, data) {
                   loadFinished(status, refresh);
               }
              );
};

showList.decode_data = function(showData) {
    try {
        var Name;
        var Duration;
        var Link;
        var ImgLink;

        showData = showData.split("</article>");
        showData.pop();

        for (var k=0; k < showData.length; k++) {
            
            // Name = $(showData[k]).find('span').filter(function() {
            //         return $(this).attr('class') == "play_videolist-element__title-text";
            //     }).text();
            showData[k] = showData[k].split("<article")[1];
            if (showData[k].match('countdown play_live-countdown'))
                continue;
            Name = showData[k].match(/play_vertical-list__header-link\">([^<]+)</)[1].trim();

            // Duration = showData[k].match(/data-length="([^"]+)"/)[1];
            Duration = showData[k].match(/time>([^<]+)/)[1];
            Link = fixLink(showData[k].match(/href="([^#][^#"]+)"/)[1]);
            ImgLink = showData[k].match(/data-imagename="([^"]+)"/);
            ImgLink = (!ImgLink) ? showData[k].match(/src="([^"]+)"/)[1] : ImgLink[1];
            ImgLink = fixLink(ImgLink);
            showData[k] = "";
            toHtml({name:Name,
                    duration:Duration,
                    is_live:false,
                    is_channel:false,
                    running:null,
                    starttime:null,
                    link:Link,
                    link_prefix:'<a href="details.html?ilink=',
                    description:"",
                    thumb:ImgLink
                   })
	}
    } catch(err) {
        Log("decode_data Exception:" + err.message + ". showData[" + k + "]:" + showData[k]);
    }
};

//window.location = 'project.html?ilink=' + ilink + '&history=' + historyPath + iname + '/';
