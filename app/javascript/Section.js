var Section =
{
    loaded: false
};

Section.onLoad = function(location, refresh)
{
    var locationUrl;
    if (channel == "svt") {
        locationUrl = Svt.getSectionUrl(location);
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
            Link = Svt.redirectUrl(Svt.fixLink(Decoded.link));
            Description = Decoded.description;
	    ImgLink = Svt.fixLink(Decoded.img).replace("_imax", "");
            ImgLink = ImgLink.replace("extralarge", "small");
            if (Svt.isPlayable(Link)) {
                recommendedLinks.push(Link.replace(/.+\/video\/([0-9]+).*/, "$1"));
                LinkPrefix = '<a href="details.html?ilink=';
            } else {
                LinkPrefix = '<a href="showList.html?name=';
            }
            toHtml({name:Name,
                    duration:Duration,
                    is_live:Decoded.is_live,
                    is_running:Decoded.is_live,
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

Section.decode_data = function(data, filter) {
    try {
        data = data.split("</article>");
        data.pop();
        for (var k=0; k < data.length; k++) {

            if (data[k].match(/data-title="([^"]+)"/))
                decode_video(data[k], filter);
            else
                decode_new_video(data[k]);
        }
    } catch(err) {
        Log("Section.decode_data Exception:" + err.message + " data[" + k + "]:" + data[k]);
    }
};

decode_video = function(data, filter) {
    var Name;
    var Duration;
    var IsLive;
    var IsRunning;
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
    Link = Svt.fixLink(data.match(/href="([^#][^#"]+)"/)[1]);
    if (filter && filter.indexOf(Link.replace(/.+\/video\/([0-9]+).*/, "$1")) != -1)
        return;
    ImgLink = data.match(/data-imagename="([^"]+)"/);
    IsLive = data.search(/svt_icon--live/) > -1;
    IsRunning = data.search(/play_graphics-live--inactive/) == -1;
    starttime = data.match(/alt="([^"]+)"/);
    Description = (!Description) ? "" : Description[1].trim();
    ImgLink = (!ImgLink) ? data.match(/src="([^"]+)"/)[1] : ImgLink[1];
    ImgLink = Svt.fixLink(ImgLink);
    starttime = (IsLive) ? starttime[1].replace(/([^:]+):.+/, "$1") : "";
    data = "";
    LinkPrefix = '<a href="showList.html?name=';
    if (Svt.isPlayable(Link)) {
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
            is_running:IsRunning,
            starttime:starttime,
            link:Link,
            link_prefix:LinkPrefix,
            description:Description,
            thumb:ImgLink
           })
}

decode_new_video = function(data, filter) {
    var Name;
    var Duration;
    var IsLive;
    var IsRunning;
    var starttime;
    var Link;
    var LinkPrefix;
    var Description;
    var ImgLink;

    Name = data.match(/play_videolist-element__title[^>]+><span[^>]+>([^<]+)/)
    Name = (Name) ? Name[1].trim() : $($(data).find(".play_videolist-element__title").find("span")[3]).text().trim();
    if (!Name)
        Name = data.match(/img[^>]+alt="([^"]+)"/)[1];
    Duration = data.match(/L.+ngd[^<]+<\/span>[^>]+>([^<]+)/);
    Description = $(data).find('.play_videolist-element__subtext')
    Description = (Description) ? $(Description).text().trim() : "";
    if (Description.match(/^L.+ngd/))
        Description = "";
    Link = Svt.fixLink(data.match(/href="([^#][^#"]+)"/)[1]);
    if (filter && filter.indexOf(Link.replace(/.+\/(video|klipp)\/([0-9]+).*/, "$2")) != -1)
        return;
    ImgLink = data.match(/img[^>]+src="([^"]+)"/)[1];
    ImgLink = Svt.fixLink(ImgLink);
    IsLive = data.match(/play_graphics-live/)
    IsRunning = data.match(/play_graphics-live--active/)
    starttime = data.match(/play_graphics-live__secondary-text[^>]+>([^<]+)/);
    starttime = (!IsRunning && starttime) ? starttime[1] : "";
    data = "";
    LinkPrefix = '<a href="showList.html?name=';
    if (Svt.isPlayable(Link)) {
        Duration = (Duration) ? Duration[1] : 0;
        LinkPrefix = '<a href="details.html?ilink=';
    }
    else {
        if (Link.match(/\/genre\//))
            // Block Info for Genres
            LinkPrefix = LinkPrefix.replace("name=", "genre=1&name=")
        Duration = 0;
    }
    toHtml({name:Name,
            duration:Duration,
            is_live:IsLive,
            is_channel:false,
            is_running:IsRunning,
            starttime:starttime,
            link:Link,
            link_prefix:LinkPrefix,
            description:Description,
            thumb:ImgLink
           })
}
