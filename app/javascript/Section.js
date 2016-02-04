var Section =
{
    loaded: false
};

Section.onLoad = function(location, refresh)
{
    var locationUrl;
    if (channel == "svt") {
        switch (location)
        {
        case "LastChance.html":
            document.title = 'Sista Chansen'
            locationUrl    = 'http://www.svtplay.se/sista-chansen?sida=1'
            break;

        case "Latest.html":
            document.title = 'Senaste'
            locationUrl    = 'http://www.svtplay.se/senaste?sida=1'
            break

        case "LatestNews.html":
            document.title = 'Senaste Nyheter'
            locationUrl    = 'http://www.svtplay.se/nyheter?sida=1'
            break
        }
    } else if (channel == "viasat") {
        locationUrl = Viasat.getUrl(location)
    } else if (channel == "tv4") {
        locationUrl = Tv4.getUrl(location)
    } else if (channel == "dplay") {
        locationUrl = Dplay.getUrl(location);
    }

    if (!refresh) {
	Header.display(document.title);
    }
    if (!detailsOnTop) {
	this.loadXml(locationUrl, refresh);	
    }
};

Section.loadXml = function(locationUrl, refresh){
    $("#content-scroll").hide();
    requestUrl(locationUrl,
               function(status, data)
               {
                   if (channel == "svt") {
                       if (locationUrl.indexOf("nyheter") != -1) {
                           data = data.responseText.split("<section class=\"play_js-tabs")[0];
                           data = "<section class" + data.split("<section class")[1];
                       } else {
                           data = data.responseText.split("div id=\"gridpage-content")[1];
                       }
                       Section.decode_data(data);
                       loadFinished(status, refresh);
                   } else if (channel == "viasat") {
                       Viasat.decode(data.responseText, locationUrl, false, function() {loadFinished(status, refresh)});
                   } else if (channel == "tv4") {
                       Tv4.decode(data.responseText, false, false, function() {loadFinished(status, refresh)});
                   } else if (channel == "dplay") {
                       Dplay.decode(data.responseText, {tag:"section",url:locationUrl}, false, function() {loadFinished(status, refresh)});
                   }
               },
               {cbError:function(status, data){loadFinished(status, refresh)}}
              );
};

Section.decode_recommended = function(data) {
    try {
        var html;
        var Titles;
        var Name;
        var Link;
        var LinkPrefix;
        var Description;
        var Duration;
        var ImgLink;

        recommendedLinks = [];
        data = data.split("</article>");
        data.pop();

        for (var k=0; k < data.length; k++) {
            data[k] = "<article" + data[k].split("<article")[1];
	    Titles = $(data[k]).find('.play_display-window__title');
            if (Titles.length > 0) {
                Decoded = decode_new_recommended(data[k]);
            }
            else 
            {
	        Titles = $(data[k]).find('.play_carousel-caption__title-inner');
                Decoded = decode_legacy_recommended(data[k]);
            }
            var i = 0;
            Name = "";
            while (i < Titles.length) {
                Name = Name + " " + $(Titles[i]).text().trim();
                Name.trim();
                i = i+1;
            }
            Name = Name.replace(/Live just nu /, "").trim();
            Link = redirectUrl(fixLink(Decoded.link));
            Description = Decoded.description;
	    ImgLink = fixLink(Decoded.img).replace("_imax", "");
            ImgLink = ImgLink.replace("extralarge", "small");
            if (isPlayable(Link)) {
                recommendedLinks.push(Link.replace(/.+\/video\/([0-9]+).*/, "$1"));
                LinkPrefix = '<a href="details.html?ilink=';
            } else {
                LinkPrefix = '<a href="showList.html?name=';
            }
            toHtml({name:Name,
                    duration:Duration,
                    is_live:Decoded.is_live,
                    running:Decoded.is_live,
                    is_channel:false,
                    starttime:"",
                    link:Link,
                    link_prefix:LinkPrefix,
                    description:Description,
                    thumb:ImgLink
                   })
            data[k] = "";
	}
        return recommendedLinks;
    } catch(err) {
        Log("decode_recommended Exception:" + err.message + " data[" + k + "]:" + data[k]);
    }
};

decode_new_recommended = function(data) {
    return {link:data.match(/href="([^#][^#"]+)"/)[1],
            description:$(data).find('.play_display-window__text').text(),
            img:$(data).find('img').attr('src'),
            is_live:data.match(/play_graphics-live--active/)
           }
};

decode_legacy_recommended = function(data) {
    return {link:data.match(/href="([^#][^#"]+)"/)[1],
            description:$(data).find('span.play_carousel-caption__description').text(),
            img:$(data).find('img').attr('data-imagename'),
            is_live:data.match(/play_graphics-live-top--visible/)
           }
};

redirectUrl = function(url) {
    if (isPlayable(url))
        // No need to check re-direct for an already playable url.
        return url;
    var result = syncHttpRequest(url)
    if (result.location) {
        return result.location
    } else if (result.success) {
        result = result.data.match(/og:url"[^"]+"(http[^"]+)/)
        if (result && result.length > 0)
            return result[1]
    }
    return url
};

Section.decode_data = function(data, filter) {
    try {
        data = data.split("</article>");
        data.pop();
        for (var k=0; k < data.length; k++) {

            if (data[k].match(/data-title="([^"]+)"/))
                decode_video(data[k], filter);
            else
                decode_show(data[k]);
        }
    } catch(err) {
        Log("Section.decode_data Exception:" + err.message + " data[" + k + "]:" + data[k]);
    }
};

decode_video = function(data, filter) {
    var Name;
    var Duration;
    var IsLive;
    var running;
    var starttime;
    var Link;
    var LinkPrefix;
    var Description;
    var ImgLink;

    if (data.search(/data-broadcastended=\"true\"/i) > -1)
        // Show already ended
        return;
    Name = data.match(/data-title="([^"]+)"/)[1].trim();
    Duration = data.match(/data-length="([^"]+)"/);
    Description = data.match(/data-description="([^"]+)"/);
    Link = fixLink(data.match(/href="([^#][^#"]+)"/)[1]);
    if (filter && filter.indexOf(Link.replace(/.+\/video\/([0-9]+).*/, "$1")) != -1)
        return;
    ImgLink = data.match(/data-imagename="([^"]+)"/);
    IsLive = data.search(/svt_icon--live/) > -1;
    running = data.search(/play_graphics-live--inactive/) == -1;
    starttime = data.match(/alt="([^"]+)"/);
    Description = (!Description) ? "" : Description[1].trim();
    ImgLink = (!ImgLink) ? data.match(/src="([^"]+)"/)[1] : ImgLink[1];
    ImgLink = fixLink(ImgLink);
    starttime = (IsLive) ? starttime[1].replace(/([^:]+):.+/, "$1") : "";
    data = "";
    LinkPrefix = '<a href="showList.html?name=';
    if (isPlayable(Link)) {
        Duration = (Duration) ? Duration[1] : 0;
        LinkPrefix = '<a href="details.html?ilink=';
    }
    else {
        Duration = 0;
    }

    toHtml({name:Name,
            duration:Duration,
            is_live:IsLive,
            is_channel:false,
            running:running,
            starttime:starttime,
            link:Link,
            link_prefix:LinkPrefix,
            description:Description,
            thumb:ImgLink
           })
}

decode_show = function(data) {
    showToHtml($(data).find('h3.play_videolist-element__title').text(),
               $(data).find('img').attr('src'),
               fixLink(data.match(/href="([^#][^#"]+)"/)[1])
              )
};
