var Svt =
{
    sections:[],
    section_max_index:0,
    category_detail_max_index:0,
    category_detail_name:""
};

Svt.fixLink = function (Link) 
{
    if (Link) {
        Link = Link.replace(/amp;/g, "").replace(/([^:])\/\//g,"$1/")
        Link = Link.replace("{format}", "small");
        Link = Link.replace(/file:\/\/(localhost\/)?/, "http://");
    }
    if (Link && Link.match(/^\/\//)) {
        return "http:" + Link;
    } else if (Link && !Link.match("https*:")) {
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
        try {
            url = Svt.decodeJson({responseText:result.data}).context.dispatcher.stores.MetaStore.canonical;
        } catch(err) {
            result = result.data.match(/og:url"[^"]+"(http[^"]+)/)
            if (result && result.length > 0)
                return result[1]
        }
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
            if (key.match(/popu/i)) {
                Svt.sections.unshift({name:data[name], url:Svt.fixLink(data[key])})
            } else {
                Svt.sections.push({name:data[name], url:Svt.fixLink(data[key])})
            }
        }
    }
    Svt.section_max_index = Svt.sections.length-1;
    $("#a-button").text(Svt.getNextSectionText());
}

Svt.getSectionIndex = function() {
    return getIndex(Svt.section_max_index)
};

Svt.getNextSectionIndex = function() {
    if (!getIndexLocation().match(/(section|index)\.html/)) {
        return 0
    }else
        return Svt.getSectionIndex().next
}

Svt.getNextSectionText = function() {
    if (Svt.sections.length == 0)
        // Sections not added yet
        return 'Populärt';
    
    return Svt.sections[Svt.getNextSectionIndex()].name;
};

Svt.getSectionUrl = function(location) {
    var index = location.match(/tab_index=([0-9]+)/)[1];
    document.title = Svt.sections[index].name; 
    return Svt.sections[index].url;
};

Svt.setNextSection = function() {
    if (Svt.getNextSectionIndex() == 0) {
        setLocation('index.html');
    } else {
        var nextLoc = getNextIndexLocation(Svt.section_max_index)
        setLocation(nextLoc.replace("index.html", "section.html"));
    }
};

Svt.decodeJson = function(data) {
    data = data.responseText.split('root\["__svtplay"\]')[1]
    data = data.replace(/^[^{]*{/, "{");
    data = data.replace(/;$/, "");
    return JSON.parse(data)
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
        if (!extra.json) {
            data = Svt.decodeJson(data).context.dispatcher.stores;
            if (extra && extra.addSections)
                Svt.addSections(data) 
            data = data.DisplayWindowStore.start_page ;
        }

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
                    is_running:data[k].live,
                    is_channel:false,
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

Svt.decodeCategories = function (data) {

    try {
        var Name;
        var Link;
        var ImgLink;

        data = Svt.decodeJson(data).context.dispatcher.stores.ProgramsStore;

        switch (Svt.getCategoryIndex().current) {
        case 0:
            data.categories.sort(function(a, b){return (a.name > b.name) ? 1 : -1});
            Svt.decode(data.categories)
            break;
        case 1:
            for (var key in data.allClusters) {
                for (var k=0; k < data.allClusters[key].length; k++) {
                    for (var i=0; i < data.allClusters[key][k].length; i++) {
                        Name    = data.allClusters[key][k][i].name.trim();
                        ImgLink = null;
                        Link    = data.allClusters[key][k][i].uri.replace(/^tag.+:([^:]+)$/,"/genre/$1");
                        Link    = Svt.fixLink(Link);
                        if (data.allClusters[key][k][i].metaData)
                            ImgLink = Svt.fixLink(data.allClusters[key][k][i].metaData.backgroundImageSmall);
                        toHtml({name:        Name,
                                link:        Link,
                                link_prefix: '<a href="categoryDetail.html?category=',
                                thumb:       ImgLink,
                                largeThumb:  (ImgLink) ? ImgLink.replace("small", "large") : null
                               });
                    };
                };
            };            
            break;
        case 2:
            ImgLink = null;
            for (var key in data.alphabeticList) {
                for (var k=0; k < data.alphabeticList[key].titles.length; k++) {
                    Name    = data.alphabeticList[key].titles[k].title.trim();
                    Link    = data.alphabeticList[key].titles[k].urlFriendlyTitle;
                    showToHtml(Name, ImgLink, Svt.fixLink(Link));
                };
            };
            break;
        };
        data = null;
    } catch(err) {
        Log("Svt.decodeCategories Exception:" + err.message + " data:" + JSON.stringify(data));
    }
};

Svt.getNextCategory = function() {
    return getNextIndexLocation(2);
}

Svt.getCategoryIndex = function () {
    return getIndex(2);
};

Svt.updateCategoryTitle = function() {
    switch (Svt.getCategoryIndex().current) {
    case 0:
        document.title = "Kategorier";
        break;
    case 1:
        document.title = "Alla Kategorier";
        break;
    case 2:
        document.title = "Alla Program";
        break;
    }
};

Svt.getNextCategoryDetail = function() {
    var nextLocation = getNextIndexLocation(Svt.category_detail_max_index);
    switch (Svt.getCategoryDetailIndex().next) {
    case 0:
        nextLocation = nextLocation.replace("Relaterat/", "");
        break;
    case 1:
        nextLocation =  nextLocation + "Rekommenderat/"
        break;
    case 2:
        nextLocation =  nextLocation.replace("Rekommenderat/", "") + "Relaterat/"
        break
    }
    return nextLocation;
}

Svt.getCategoryDetailIndex = function () {
    return getIndex(Svt.category_detail_max_index);
};

Svt.toggleBButton = function() {

    if (getIndexLocation().indexOf("categoryDetail.html") == -1)
        Svt.toggleBButtonForCategories()
    else
        Svt.toggleBButtonForCategoryDetail()
}

Svt.toggleBButtonForCategories = function() {
    var language = Language.checkLanguage();

    switch (Svt.getCategoryIndex().next) {
    case 0:
        Language.fixBButton();
        break;
    case 1:
        if (language == "Swedish")
            $("#b-button").text("Alla Kategorier");
        else
            $("#b-button").text("All Categories");
        break;
    case 2:
        if (language == "Swedish")
            $("#b-button").text("Alla Program");
        else
            $("#b-button").text("All Shows");
        break;
    }
};

Svt.toggleBButtonForCategoryDetail = function() {
    var language = Language.checkLanguage();

    switch (Svt.getCategoryDetailIndex().next) {
    case 0:
        Language.fixBButton();
        break;
    case 1:
        if (language == "Swedish")
            $("#b-button").text(Svt.category_detail_name + " - Rekommenderat");
        else
            $("#b-button").text(Svt.category_detail_name + " - Recommended");
        break;
    case 2:
        if (language == "Swedish")
            $("#b-button").text(Svt.category_detail_name + " - Relaterat");
        else
            $("#b-button").text(Svt.category_detail_name + " - Related");
        break;
    }
};

Svt.decode_category = function (data) {
    data = Svt.decodeJson(data).context.dispatcher.stores;
    Svt.category_detail_name = data.ClusterStore.name.trim();
    Svt.category_detail_max_index = 0;
    for (var key in data.DisplayWindowStore) {
        if (data.DisplayWindowStore[key].length > 0) {
            Svt.category_detail_max_index = 1
            if (data.ClusterStore.relatedClusters.length > 0)
                Svt.category_detail_max_index = 2;
            break;
        }
    };

    switch (Svt.getCategoryDetailIndex().current) {
    case 0:
        if (data.ClusterStore.contents) {
            alert("CONTENT!!!CONTENT!!!CONTENT!!!CONTENT!!!CONTENT!!!")
            Svt.decode(data.ClusterStore.contents)
        }
        if (data.ClusterStore.titles)
            Svt.decode(data.ClusterStore.titles)
        if (Svt.category_detail_max_index == 0 && data.ClusterStore.clips)
            Svt.decode(data.ClusterStore.clips)
        break;
    case 1:
        for (var key in data.DisplayWindowStore) {
            Svt.decode_recommended(data.DisplayWindowStore[key], {json:true});
        }
        break;
    case 2:
        Svt.decode(data.ClusterStore.relatedClusters);
        break;
    };
    Svt.toggleBButton();

}

Svt.search = function(query, completeFun, url) {

    requestUrl('http://www.svtplay.se/sok?q=' + query,
               function(status, data)
               {
                   Svt.decode_search(data);
                   completeFun();
               },
               {cbError:function(status, data) {
                   completeFun()
               }}
              );
};

Svt.decode_section = function (data, filter) {
    Svt.decode(Svt.decodeJson(data).context.dispatcher.stores.GridStore.content, filter);
}

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
        data = Svt.decodeJson(data).context.dispatcher.stores.SearchStore;
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

Svt.GetChannelThumb  = function (Name)
{
    return Svt.fixLink("/assets/images/channels/posters/" + Name + ".png")
};

Svt.decodeChannels = function(data) {
    try {
        var Name;
        var Duration;
        var Link;
        var ImgLink;
        var starttime;
        var endtime;
        var IsRunning;
        var BaseUrl = 'http://www.svtplay.se/kanaler';

        data = Svt.decodeJson(data).context.dispatcher.stores.ScheduleStore.channels;
        for (var k=0; k < data.length; k++) {

            Name = data[k].title.trim();
	    Link = BaseUrl + '/' + Name;
            ImgLink = Svt.GetChannelThumb(Name);
            starttime = timeToDate(data[k].schedule[0].broadcastStartTime);
            endtime = timeToDate(data[k].schedule[0].broadcastEndTime);
            Duration  = Math.round((endtime-starttime)/1000);
            IsRunning = (getCurrentDate()-starttime) > -60*1000;
            Name = dateToClock(starttime) + "-" + dateToClock(endtime) + " " + data[k].schedule[0].title.trim();
            toHtml({name:Name,
                    duration:Duration,
                    is_live:false,
                    is_channel:true,
                    is_running:IsRunning,
                    link:Link,
                    link_prefix:'<a href="details.html?ilink=',
                    thumb:ImgLink
                   });
            data[k] = "";
	};
        data = null;

    } catch(err) {
        Log("Svt.decodeChannels Exception:" + err.message + " data[k]:" + JSON.stringify(data[k]));
    }
};

Svt.decode = function(data, filter) {
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
        var IsRunning;

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
            else if (data[k].slug)
                Link = Svt.fixLink("/genre/" + data[k].slug)

            if (filter && filter.indexOf(Link.replace(/.+\/video\/([0-9]+).*/, "$1")) != -1)
                continue;

            if (data[k].imageSmall)
                ImgLink = Svt.fixLink(data[k].imageSmall);
            else if (data[k].posterImageUrl)
                ImgLink = Svt.fixLink(data[k].posterImageUrl);
            else if (data[k].thumbnailImage)
                ImgLink = Svt.fixLink(data[k].thumbnailImage);

            IsLive    = data[k].live && !data[k].broadcastEnded;
            IsRunning = data[k].broadcastedNow;
            starttime = data[k].broadcastStartTime;
            starttime = (IsLive && starttime) ? timeToDate(starttime) : null;
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
                    is_running:IsRunning,
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