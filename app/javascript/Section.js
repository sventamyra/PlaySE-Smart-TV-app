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
    } else if (channel == "kanal5") {
        locationUrl = Kanal5.getUrl(location);
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
                       Tv4.decode(data.responseText, false, function() {loadFinished(status, refresh)});
                   } else if (channel == "kanal5") {
                       Kanal5.decode(data.responseText, {tag:"section",url:locationUrl}, false, function() {loadFinished(status, refresh)});
                   }
               },
               function(status, data)
               {
                   loadFinished(status, refresh);
               }
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
        var starttime;
        recommendedLinks = [];
        data = data.split("</article>");
        data.pop();

        for (var k=0; k < data.length; k++) {
            data[k] = "<article" + data[k].split("<article")[1];
	    Titles = $(data[k]).find('span.play_carousel-caption__title-inner');
            var i = 0;
            Name = "";
            while (i < Titles.length) {
                Name = Name + " " + $(Titles[i]).text().trim();
                Name.trim();
                i = i+1;
            }
            Name = Name.replace(/Live just nu /, "").trim();
            Link = fixLink(data[k].match(/href="([^#][^#"]+)"/)[1]);
            Description = $(data[k]).find('span.play_carousel-caption__description').text();
	    ImgLink = fixLink($(data[k]).find('img').attr('data-imagename')).replace("_imax", "");
            ImgLink = ImgLink.replace("extralarge", "small");
	    if(Description.length > 55){
		Description = Description.substring(0, 52)+ "...";
	    }
            if (Link.match(/\/(video|klipp)\//)) {
                recommendedLinks.push(Link.replace(/.+\/video\/([0-9]+).*/, "$1"));
                LinkPrefix = '<a href="details.html?ilink=';
            } else {
                LinkPrefix = '<a href="showList.html?name=';
            }

            toHtml({name:Name,
                    duration:Duration,
                    is_live:data[k].match(/play_graphics-live-top--visible/),
                    running:data[k].match(/play_graphics-live-top--visible/),
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
        Log("decode_data Exception:" + err.message + " data[" + k + "]:" + data[k]);
    }
};

Section.decode_data = function(data, filter) {
    try {
        var Name;
        var Duration;
        var IsLive;
        var running;
        var starttime;
        var Link;
        var LinkPrefix;
        var Description;
        var ImgLink;

        data = data.split("</article>");
        data.pop();

        for (var k=0; k < data.length; k++) {
            if (data[k].search(/data-broadcastended=\"true\"/i) > -1)
                // Show already ended
                continue;
            Name = data[k].match(/data-title="([^"]+)"/)[1].trim();
            Duration = data[k].match(/data-length="([^"]+)"/);
            Description = data[k].match(/data-description="([^"]+)"/);
            Link = fixLink(data[k].match(/href="([^#][^#"]+)"/)[1]);
            if (filter && filter.indexOf(Link.replace(/.+\/video\/([0-9]+).*/, "$1")) != -1)
                continue;
            ImgLink = data[k].match(/data-imagename="([^"]+)"/);
            IsLive = data[k].search(/svt_icon--live/) > -1;
            running = data[k].search(/play_graphics-live--inactive/) == -1;
            starttime = data[k].match(/alt="([^"]+)"/);
            Description = (!Description) ? "" : Description[1].trim();
            ImgLink = (!ImgLink) ? data[k].match(/src="([^"]+)"/)[1] : ImgLink[1];
            ImgLink = fixLink(ImgLink);
            starttime = (IsLive) ? starttime[1].replace(/([^:]+):.+/, "$1") : "";
            data[k] = "";
	    if (Description.length > 55){
		Description = Description.substring(0, 52)+ "...";
	    }
            LinkPrefix = '<a href="showList.html?name=';
            if (Link.search("/klipp/") != -1 || Link.search("/video/") != -1) {
                Duration = Duration[1];
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
    } catch(err) {
        Log("Section.decode_data Exception:" + err.message + " data[" + k + "]:" + data[k]);
    }
};