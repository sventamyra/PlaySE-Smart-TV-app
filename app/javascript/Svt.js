var Svt =
{
    sections:[],
    section_index:0
};

Svt.fixLink = function (Link) 
{
    if (Link)
        Link = Link.replace(/amp;/g, "").replace(/([^:])\/\//g,"$1/")
    if (Link.match(/^\/\//)) {
        return "http:" + Link;
    } else if (!Link.match("https*:")) {
        if (!Link.match(/^\//))
            Link = "/" + Link;
        return "http://www.svtplay.se" + Link
    } else {
        return Link
    }
};

Svt.isPlayable = function (url) {
    return url.match(/\/video|klipp\//)
}

Svt.redirectUrl = function(url) {
    if (Svt.isPlayable(url))
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

Svt.addSections = function(data) {
    Svt.sections = [];
    data = data.StartStore
    var name, url;
    for (var key in data) {
        if (key.match(/Url$/) && !key.match(/live/i)) {
            name = key.replace(/Url$/, "Header");
            Svt.sections.push({name:data[name], url:Svt.fixLink(data[key])})
            if (key.match(/popu/i))
                Svt.section_index = Svt.sections.length - 1
        }
    }
    $("#a-button").text(Svt.getNextSectionText());
}

Svt.getSectionIndex = function() {
    var location =  (myRefreshLocation) ? myRefreshLocation : myLocation;
    var index = location.match(/section.html\?tab_index=([0-9]+)/)
    if (index)
        return +index[1]
    else if (location.match(/index.html/))
        return Svt.section_index;
    else
        return null;
}


Svt.getNextSectionText = function() {
    var index = Svt.getSectionIndex();
    if (index != null) {
        if (Svt.sections.length > 0) {
            if (index+1 >= Svt.sections.length)
                return Svt.sections[0].name;
            else
                return Svt.sections[index+1].name;
        }
    }
    return 'Populärt';
}

Svt.getSectionUrl = function(location) {
    var index = location.match(/tab_index=([0-9]+)/)[1];
    document.title = Svt.sections[index].name; 
    return Svt.sections[index].url;
}

Svt.setNextSection = function() {

    if ($("#a-button").text().indexOf("Pop") != -1) {
	setLocation('index.html');
    } else {
        Svt.section_index = Svt.section_index + 1;
        if (Svt.section_index >= Svt.sections.length)
            Svt.section_index = 0;
        if (Svt.sections[Svt.section_index].name.match(/popu/i))
	    setLocation('index.html');
        else
            setLocation("section.html?tab_index=" + Svt.section_index);
    }
}

Svt.decode_recommended = function (data, extra) {
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
        data = JSON.parse(data).context.dispatcher.stores;
        if (extra && extra.addSections)
            Svt.addSections(data) 
        data = data.DisplayWindowStore.start_page ;

        for (var k=0; k < data.length; k++) {
            Name = data[k].title.trim();
            Link = Svt.redirectUrl(Svt.fixLink(data[k].url));
            Description = data[k].description;
	    ImgLink = Svt.fixLink(data[k].imageMedium).replace("_imax", "");
            ImgLink = ImgLink.replace("medium", "small");
            if (Svt.isPlayable(Link)) {
                recommendedLinks.push(Link.replace(/.+\/video\/([0-9]+).*/, "$1"));
                LinkPrefix = '<a href="details.html?ilink=';
            } else {
                LinkPrefix = '<a href="showList.html?name=';
                if (Link.match(/\/genre\//))
                    LinkPrefix = '<a href="categoryDetail.html?category='
            }
            toHtml({name:Name,
                    duration:0,
                    is_live:data[k].live,
                    running:data[k].live,
                    is_channel:false,
                    starttime:"",
                    link:Link,
                    link_prefix:LinkPrefix,
                    description:Description,
                    thumb:ImgLink,
                    largeThumb:(ImgLink) ? ImgLink.replace("small", "large") : null
                   })
            data[k] = "";
	}
        return recommendedLinks;
    } catch(err) {
        Log("Svt.decode_recommended Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
};

Svt.decode_category = function (data) {
    data = JSON.parse(data).context.dispatcher.stores.ClusterStore;
    Svt.decode(data.contents)
    Svt.decode(data.clips)
}

Svt.search = function(query, completeFun, url) {

    requestUrl('http://www.svtplay.se/sok?q=' + query,
               function(status, data)
               {
                   data = data.responseText.split('root\["__svtplay"\]')[1]
                   data = data.replace(/[^{]*(.+);$/, "$1");
                   Svt.decode_search(data);
                   completeFun();
               },
               {cbError:function(status, data) {
                   completeFun()
               }}
              );
};

Svt.decode_search = function (data) {
    try {
        var html;
        var Titles;
        var Name;
        var Link;
        var LinkPrefix;
        var Description;
        var Duration;
        var ImgLink;
        var keys = [];

        recommendedLinks = [];
        data = JSON.parse(data).context.dispatcher.stores.SearchStore ;
        for (var key in data){
            if (!data[key][0] || (!data[key][0].contentType && !data[key][0].name))
                continue;
            keys.push(key)
        }
        keys.sort(function(a, b){
            // Category
            if (data[a][0].name)
                return -1
            else if (data[b][0].name)
                return 1
            // Show
            else if (data[a][0].contentType == "titelsida")
                return -1
            else if (data[b][0].contentType == "titelsida")
                return 1
            // Episode/Live/Clip
            else if (keys.indexOf(a) < keys.indexOf(b))
                return -1
            else 
                return 1
        });
        for (var key, i=0; i < keys.length; i++) {
            key = keys[i];
            Svt.decode(data[key]);
        };
    } catch(err) {
        Log("Svt.decode_search Exception:" + err.message + " data[key][" + k + "]:" + JSON.stringify(data[key][k]));
    }
};

Svt.decode = function(data) {
    try {
        var html;
        var Titles;
        var Name;
        var Link;
        var LinkPrefix;
        var Description;
        var Duration;
        var ImgLink;

        for (var k=0; k < data.length; k++) {
            if (data[k].title)
                Name = data[k].title.trim()
            else if (data[k].programTitle)
                Name = data[k].programTitle.trim()
            else if (data[k].name)
                Name = data[k].name.trim()
            else
                Name = "WHAT?!?!?"
            Duration = data[k].materialLength;
            Description = data[k].description;
            if (Name.match(/^(avsnitt|del)/i)) {
                if (data[k].season > 0)
                    Name = "Säsong " + data[k].season + " - " + Name;
                if (data[k].programTitle) {
                    Description = Name;
                    Name = data[k].programTitle.trim();
                }
            } else if (data[k].programTitle && Name.indexOf(data[k].programTitle.trim()) == -1) {
                Name = data[k].programTitle.trim() + " - " + Name;
            }

            Description = (Description) ? Description.trim() : "";
            if (data[k].contentUrl)
                Link = Svt.fixLink(data[k].contentUrl);
            else if (data[k].urlPart) {
                Link = data[k].urlPart
                if (!Link.match(/^\//))
                    Link = "/genre/" + Link;
                Link = Svt.fixLink(Link);
            }
            if (data[k].imageSmall)
                ImgLink = Svt.fixLink(data[k].imageSmall);
            else if (data[k].posterImageUrl)
                ImgLink = Svt.fixLink(data[k].posterImageUrl);
            IsLive = data[k].live;
            if (IsLive && data[k].broadcastEnded)
                continue;
            running = data[k].broadcastedNow;
            starttime = data[k].broadcastStartTime;
            starttime = (!running && starttime) ? starttime.replace(/([^:]+):.+/, "$1") : "";
            LinkPrefix = '<a href="showList.html?name=';
            if (Svt.isPlayable(Link)) {
                Duration = (Duration) ? Duration : 0;
                LinkPrefix = '<a href="details.html?ilink=';
            }
            else if (data[k].urlPart || Link.match(/\/genre\//)) {
                LinkPrefix = '<a href="categoryDetail.html?category=';
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
                    thumb:ImgLink,
                    largeThumb:(ImgLink) ? ImgLink.replace("small", "large") : null
                   })
            data[k] = "";
	};
    } catch(err) {
        Log("Svt.decode Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
}