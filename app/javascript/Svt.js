var Svt =
{
    sections:[],
    section_max_index:0,
    category_details:[],
    category_detail_max_index:0,
    thumbs_index:null
};

Svt.fixLink = function (Link, Publication) 
{
    if (Link) {
        Link = Link.replace(/amp;/g, "").replace(/([^:])\/\//g,"$1/")
        Link = Link.replace("{format}", "small");
        Link = Link.replace(/file:\/\/(localhost\/)?/, "http://");
    }
    if (Link && Link.match(/^<>[0-9]+<>/)) {
        var index = +Link.match(/^<>([0-9]+)<>/)[1]
        if (Publication)
            Svt.checkThumbIndex(index, Publication);
        else
            Publication = Svt.getThumbIndex(index);
        Publication = (Publication) ? Publication : "svtse";
        return Link.replace(/^<>[0-9]+<>/, "http://www.svtstatic.se/image-cms/" + Publication);
    } else if (Link && Link.match(/^\/\//)) {
        return "http:" + Link;
    } else if (Link && !Link.match("https*:")) {
        if (!Link.match(/^\//))
            Link = "/" + Link;
        return "http://www.svtplay.se" + Link
    } else {
        return Link
    }
};

Svt.checkThumbIndex = function(index, data) {
    if (data && Svt.getThumbIndex(+index)!=data) {
        Svt.thumbs_index[+index] = data;
        Config.save("svtThumbs", Svt.thumbs_index);
    }
};

Svt.getThumbIndex = function(index) {
    if (Svt.thumbs_index == null) {
        Svt.thumbs_index = Config.read("svtThumbs")
        if (Svt.thumbs_index == null)
            Svt.thumbs_index = []
    }
    return Svt.thumbs_index[+index]
};

Svt.getThumb = function(data, size) {
    var Thumb = "";
    if (data.thumbnail)
        Thumb = data.thumbnail;
    else if (data.imageSmall)
        Thumb = data.imageSmall;
    else if (data.thumbnailXL)
        Thumb = data.thumbnailXL;
    else if (data.imageLarge)
        Thumb = data.imageLarge;
    else if (data.thumbnailImage)
        Thumb = data.thumbnailImage;
    else if (data.posterImageUrl)
        Thumb = data.posterImageUrl;
    else if (data.posterXL)
        Thumb = data.posterXL;
    else if (data.imageMedium)
        Thumb = data.imageMedium;
    Thumb = Svt.fixLink(Thumb, data.publication).replace("_imax", "");
    if (!size || size == "small")
        return Thumb.replace(/\/(medium|(extra)?large)\//, "/small/")
    else if (size == "large")
        return Thumb.replace(/\/(small|medium|extralarge)\//, "/large/")
    return Thumb
}

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
            url = Svt.decodeJson({responseText:result.data}).metaData.canonical;
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
    data = data.startPage.content
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

Svt.getDetailsUrl = function(streamUrl) {
    return Svt.fixLink(streamUrl);
};

Svt.getDetailsData = function(url, data) {
    if (!Svt.isPlayable(url) && url.indexOf("/kanaler/") == -1) {
        return Svt.getShowData(url, data);
    }

    var Name="";
    var Title = Name;
    var ImgLink="";
    var ImgLinkAlt="";
    var AirDate="";
    var VideoLength = "";
    var AvailDate=null;
    var Description="";
    var onlySweden="";
    var isChannel=false;
    var NotAvailable=false;
    var startTime=0;
    var endTime=0;
    var Show = null;
    var isLive = false;
    try {
        if (url.indexOf("oppetarkiv") > -1) {
            data = data.responseText.split("<aside class=\"svtoa-related svt-position-relative")[0];
            Name = $($(data).find('span.svt-heading-s')[0]).text();
            Title = Name;
	    ImgLink = Svt.fixLink($($(data).find('video')).attr('poster'));
	    AirDate = $($(data).find('strong')[0]).text();
            VideoLength = $($(data).find('strong')[1]).text().trim();

            Description = $(data).find('div.svt-text-bread').text();

	    onlySweden = ($(data).find('span').filter(function() {
                return $(this).attr('class') == "svtoa-icon-geoblock svtIcon";
            }).length > 0);
            isLive = false;
        } else {
            data = Svt.decodeJson(data);
            if (url.indexOf("/kanaler/") > -1) {
	        for (var i = 0; i < data.channels.schedule.length; i++) {
                    if (data.channels.schedule[i].name == data.metaData.title) {
                        data = data.channels.schedule[i];
                        break;
                    }
                }
                Name = data.name.trim() + " - " + data.schedule[0].title.trim();
	        Description = data.schedule[0].description.trim();
                if (data.schedule[0].titlePage) {
                    ImgLink = Svt.getThumb(data.schedule[0].titlePage, "large")
                } else {
	            ImgLink = Svt.GetChannelThumb(data.title);
                }
                startTime = timeToDate(data.schedule[0].broadcastStartTime);
                endTime = timeToDate(data.schedule[0].broadcastEndTime);
                VideoLength = Math.round((endTime-startTime)/1000);
                AirDate = dateToClock(startTime) + "-" + dateToClock(endTime);
                Title = AirDate + " " + Name;
                isChannel = true;
                isLive = true;
                NotAvailable = (startTime - getCurrentDate()) > 60*1000;
            } else {
                data = data.videoTitlePage;
                if (data.titlePage && data.titlePage.title.trim().toLowerCase() != data.titlePage.category.trim().toLowerCase()) {
                    
                    Show = {name : data.titlePage.title.trim(),
                            url  : Svt.fixLink(data.titlePage.urlFriendlyTitle)
                           }
                }
                data = data.video;
                if (data.programTitle == data.title || !data.programTitle) {
                    Name = data.title;
                    if (Show && Show.name != data.title)
                        Name = Show.name + " - " + Name

                } else {
                    Name = data.programTitle + " - " + data.title;
                }
                Description = data.description.trim();
                Title = Name;
                ImgLink = Svt.getThumb(data, "large");
                if (data.broadcastDate)
                    AirDate = timeToDate(data.broadcastDate);
                else if (data.publishDate)
                    AirDate = timeToDate(data.publishDate);
                else
                    AirDate = null
                VideoLength = data.materialLength
                startTime = AirDate;
                if (data.broadcastEndTime)
                    endTime = timeToDate(data.broadcastEndTime);
                if (!VideoLength && startTime && endTime) {
                    VideoLength = Math.round((endTime-startTime)/1000);
                }                    
                isLive = data.live && (endTime > getCurrentDate());
                if (isLive) {
                    NotAvailable = data.upcomingBroadcast;
                } else if (data.expireDate) {
		    AvailDate = timeToDate(data.expireDate)
                    var hoursLeft = Math.floor((AvailDate-getCurrentDate())/1000/3600);
                    AvailDate = dateToHuman(AvailDate);
                    if (hoursLeft > 24)
                        AvailDate = AvailDate + " (" + Math.floor(hoursLeft/24) + " dagar kvar)"
                    else
                        AvailDate = AvailDate + " (" + hoursLeft + " timmar kvar)"
                }
	        onlySweden = data.onlyAvailableInSweden;
            }
            VideoLength = dataLengthToVideoLength(null,VideoLength)
	    // if (onlySweden != "false" && onlySweden != false) {
	    //     //proxy = 'http://playse.kantaris.net/?mode=native&url=';
	    //     $.getJSON( "http://smart-ip.net/geoip-json?callback=?",
	    //                function(data){
	    //     	       if(data.countryCode != 'SE'){
			           
	    //     	           //Geofilter.show();	
	    //     	       }
	    //                }
	    //              );
            // }
        }
    } catch(err) {
        Log("Svt.getDetails Exception:" + err.message);
        Log("Name:" + Name);
        Log("AirDate:" + AirDate);
        Log("AvailDate:" + AvailDate);
        Log("VideoLength:" + VideoLength);
        Log("Description:" + Description);
        Log("NotAvailable:" + NotAvailable);
        Log("ImgLink:" + ImgLink);
    }
    data = null;
    return {name          : Name.trim(),
            title         : Title.trim(),
            is_live       : isLive,
            air_date      : AirDate,
            avail_date    : AvailDate,
            start_time    : startTime,
            duration      : VideoLength,
            description   : Description,
            not_available : NotAvailable,
            thumb         : ImgLink,
            parent_show   : Show
    }
};

Svt.getShowData = function(url, data) {

    var Name="";
    var Genre = Name;
    var ImgLink="";
    var Description="";

    try {
        data = Svt.decodeJson(data).videoTitlePage;
        data = data.titlePage

        Name  = data.title.trim();
        ImgLink = Svt.getThumb(data, "large");
	Description = data.shortDescription.trim()
        if (Description && data.description.indexOf(Description) == -1)
            Description = "<p>" + Description + "</p>" + data.description.trim();
        else
            Description = data.description.trim();
        Genre = [];
        for (var i=0; i < data.tagList.length; i++) {
            Genre.push(data.tagList[i].name.trim());
        }
        Genre.sort();
        Genre = Genre.join('/');
        if (!Genre)
            Genre == "";

    } catch(err) {
        Log("Details Exception:" + err.message);
        Log("Name:" + Name);
        Log("Genre:" + Genre);
        Log("Description:" + Description);
        Log("ImgLink:" + ImgLink);
    }
    $show = data = null;
    return {show          : true,
            name          : Name,
            description   : Description,
            genre         : Genre,
            thumb         : ImgLink
           }
};

Svt.decodeJson = function(data) {
    data = data.responseText.split("root\['__svtplay']")
    if (data.length > 1 && !data[1].match(/"stores":{}/)) {
        data = data[1]
    } else {
        data = data.join("").split("root\['__reduxStore']")[1]
    }
    data = data.split('};')[0] + '}'
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
        var recommendedLinks = [];

        if (!extra.json) {
            data = Svt.decodeJson(data);
            if (extra && extra.addSections)
                Svt.addSections(data) 
            data = data.displayWindow.start_page;
        }

        for (var k=0; k < data.length; k++) {
            Name = data[k].title.trim();
            Link = Svt.redirectUrl(Svt.fixLink(data[k].url));
            Description = data[k].description;
            ImgLink = Svt.getThumb(data[k]);
            if (Svt.isPlayable(Link)) {
                recommendedLinks.push(Link.replace(/.+\/video\/([0-9]+).*/, "$1"));
                LinkPrefix = '<a href="details.html?ilink=';
            } else {
                LinkPrefix = '<a href="showList.html?name=';
                if (Link.match(/\/genre\//))
                    LinkPrefix = '<a href="categoryDetail.html?category='
                else {
                    recommendedLinks.push(Link.replace(/.+\/([^\/]+)$/, "$1"))
                }
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

        data = Svt.decodeJson(data).programsPage.content;

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
                            ImgLink = Svt.getThumb(data.allClusters[key][k][i].metaData);
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
    var nextLocation    = getNextIndexLocation(Svt.category_detail_max_index);
    var category_detail = Svt.getCategoryDetailIndex()
    var old_detail     = Svt.category_details[category_detail.current].section
    var new_detail     = Svt.category_details[category_detail.next].section
    nextLocation =  nextLocation.replace(new RegExp(old_detail+"/$"), "")
    return nextLocation + new_detail + "/";
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
    if(Svt.getCategoryDetailIndex().next == 0)
        Language.fixBButton();
    else
        $("#b-button").text(Svt.category_details[Svt.getCategoryDetailIndex().next].name);
};

Svt.decode_category = function (data) {
    data = Svt.decodeJson(data);
    Svt.category_details = [];
    Svt.category_detail_max_index = 0;

    var main_name = data.clusterPage.content.clusterName.trim()
    var popular   = {};
    var current;

    for (var key in data.displayWindow) {
        if (data.displayWindow[key].length > 0) {
            popular.name = main_name + " - Rekommenderat";
            popular.section = "Rekommenderat";
            popular.recommended = true;
            break;
        }
    };

    if (data.clusterTabs) {
        for (var k=0; k < data.clusterTabs.length; k++) {
            if (data.clusterTabs[k].name.match(/^Popul/)) {
                // Popular is special and merged with recommended
                popular.name = main_name + " - " + data.clusterTabs[k].name.trim();
                popular.section = data.clusterTabs[k].name.trim();
                popular.tab_index = k;
            } else {
                Svt.category_details.push({name:      main_name + " - " + data.clusterTabs[k].name.trim(),
                                           section: data.clusterTabs[k].name.trim(),
                                           tab_index: k
                                          });
            }
        }
    };
    if (data.clusterPage.content.relatedClusters.length > 0) {
        Svt.category_details.push({name   : main_name + " - Relaterat",
                                   section: "Relaterat",
                                   related: true
                                  });
    }

    if (popular.name)
        Svt.category_details.unshift(popular)

    // Add main view as well
    Svt.category_details.unshift({name:main_name, main:true, section:"none"})
    Svt.category_detail_max_index = Svt.category_details.length-1;

    current = Svt.category_details[Svt.getCategoryDetailIndex().current];
    var recommendedLinks = []
    if (current.main) {
        if (data.clusterPage.content.contents) {
            alert("CONTENT!!!CONTENT!!!CONTENT!!!CONTENT!!!CONTENT!!!")
            Svt.decode(data.clusterPage.content.contents)
        }
        if (data.clusterPage.content.titles)
            Svt.decode(data.clusterPage.content.titles)
        if (Svt.category_detail_max_index == 0 && data.clusterPage.content.clips)
            Svt.decode(data.clusterPage.content.clips)
    } else if (current.recommended) {
        for (var key in data.displayWindow) {
            recommendedLinks = recommendedLinks.concat(Svt.decode_recommended(data.displayWindow[key], {json:true}));
        }
    } else if (current.related) {
        Svt.decode(data.clusterPage.content.relatedClusters);
    }
        
    if (current.tab_index >= 0)
        Svt.decode(data.clusterTabs[current.tab_index].content, recommendedLinks);

    Svt.toggleBButton();
}

Svt.decode_show = function (data, url, is_clips, requested_season) {
    data = Svt.decodeJson(data).videoTitlePage;
    var seasons = []
    var has_clips = false
    var has_zero_season = false
    if (!is_clips && !requested_season) {
        for (var i=0; i < data.realatedVideoTabs.length; i++) {
            if (!has_zero_season && data.realatedVideoTabs[i].season > 0) {
                seasons.push({season:data.realatedVideoTabs[i].season,
                              name  : data.realatedVideoTabs[i].name.trim()
                             });
            } else if (data.realatedVideoTabs[i].season == 0) {
                has_zero_season = true;
                seasons = [];
            }
            if (!has_clips && data.realatedVideoTabs[i].type == "VIDEO_TYPE_CLIPS")
                has_clips = true
        }
        if (seasons.length > 1) {
            seasons.sort(function(a, b){return b.season-a.season})
            for (var i=0; i < seasons.length; i++) {
                seasonToHtml(seasons[i].name,
                             Svt.getThumb(data.titlePage),
                             url,
                             seasons[i].season
                            )
            };
        } else if (requested_season!=0 && seasons.length == 1) {
            requested_season = seasons[0].season
            return callTheOnlySeason(seasons[0].name, url);
        }
    }
    // Get Correct Tab
    var videos = [];
    for (var i=0; i < data.realatedVideoTabs.length; i++) {
        if (requested_season && requested_season != 0) {
            if (data.realatedVideoTabs[i].season == +requested_season) {
                videos = data.realatedVideoTabs[i].videos
                break
            }
        } else if (is_clips) {
            if (data.realatedVideoTabs[i].type == "VIDEO_TYPE_CLIPS") {
                videos = data.realatedVideoTabs[i].videos
                break
            }
        } else {
                if (has_zero_season) {
                    if (data.realatedVideoTabs[i].key == "RELATED_VIDEO_TABS_LATEST") {
                        videos = data.realatedVideoTabs[i].videos
                        break;
                    }
                } else if (data.realatedVideoTabs[i].type != "VIDEO_TYPE_CLIPS") {
                    videos = data.realatedVideoTabs[i].videos
                    break
                }
        }
    };

    if (requested_season || is_clips || seasons.length < 2)
        Svt.decode(videos, null, true);

    if (has_clips)
        clipToHtml(Svt.getThumb(data.titlePage), url)
};

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
    Svt.decode(Svt.decodeJson(data).gridPage.content, filter);
}

Svt.decode_search = function (data) {
    try {
        var keys = [];
        data = Svt.decodeJson(data).searchResult;
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

        data = Svt.decodeJson(data).channels.schedule;
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

Svt.decode = function(data, filter, stripShow) {
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
        var Season;
        var Episode;
        var Variant;
        var SEASON_REGEXP = new RegExp("((s[^s]+song\\s*([0-9]+))\\s*-\\s*)?(.+)","i");
        var VARIANT_REGEXP = new RegExp("\\s*-\\s*(textat|syntolkat|tecken(spr[^k]+ks?)?(tolkat)?|originalspr[^k]+k)","i");
        var Names = [];
        var Shows = [];
        var IgnoreEpisodes = false;

        if (stripShow) {
            var Episodes = [];
            for (var k=0; k < data.length; k++) {
                if (data[k].episodeNumber >= 1) {
                    if (data[k].title.match(VARIANT_REGEXP))
                        // Ignore variants
                        continue;
                    if (Episodes[data[k].episodeNumber]) {
                        Episodes[data[k].episodeNumber]++
                    } else {
                        Episodes[data[k].episodeNumber] = 1;
                    }
                } else {
                    IgnoreEpisodes = true
                }
            }
            if (!IgnoreEpisodes == 1) {
                for (var k=0; k < Episodes.length; k++) {
                    if (Episodes[k] > 1) {
                        IgnoreEpisodes = true
                        break;
                    }
                }
            }
        }
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
            if (!stripShow) {
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
            }
            Description = (Description) ? Description.trim() : "";
            if (data[k].contentUrl)
                Link = Svt.fixLink(data[k].contentUrl);
            else if (data[k].urlPart) {
                Link = data[k].urlPart
                if (!Link.match(/^\//))
                    Link = "/genre/" + Link;
                Link = Svt.fixLink(Link);
            } else if (data[k].url)
                Link = Svt.fixLink(data[k].url);
            else if (data[k].slug)
                Link = Svt.fixLink("/genre/" + data[k].slug)

            if (filter) {
                if (filter.indexOf(Link.replace(/.+\/(video|klipp)\/([0-9]+).*/, "$2")) != -1)
                    continue;
                else if (filter.indexOf(Link.replace(/.+\/(video|klipp)\/[0-9]+\/([^\/]+)\/.+$/, "$2")) != -1)
                    continue;
            }

            ImgLink = Svt.getThumb(data[k]);
            IsLive = data[k].live && !data[k].broadcastEnded;
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
            Season  = data[k].season;
            Episode = data[k].episodeNumber; // || Name.match(/avsnitt\s*([0-9]+)/i) || Description.match(/[Dd]el\s([0-9]+)/i);
            Variant = Name.match(VARIANT_REGEXP);
            Variant = (Variant) ? Variant[1] : null;            
            
            if (stripShow && !IgnoreEpisodes) {
                if (!Name.match(/avsnitt\s*([0-9]+)/i) && Episode) {
                    Description = Name.replace(SEASON_REGEXP, "$4")
                    Description = Description.replace(VARIANT_REGEXP, "")
                    Name = Name.replace(SEASON_REGEXP, "$1Avsnitt " + Episode);
                    Name = (Variant) ? Name + " - " + Variant : Name;
                } else {
                    Description = "";
                }
            }
            Names.push(Name);
            Shows.push({name:Name,
                        duration:Duration,
                        is_live:IsLive,
                        is_channel:false,
                        is_running:IsRunning,
                        starttime:starttime,
                        link:Link,
                        link_prefix:LinkPrefix,
                        description:Description,
                        thumb:ImgLink,
                        largeThumb:(ImgLink) ? ImgLink.replace("small", "large") : null,
                        season:Season,
                        episode:Episode,
                        variant:Svt.FixVariant(Variant)
                       })
            data[k] = "";
	};
        if (stripShow) 
            Svt.sortEpisodes(Shows, Names, IgnoreEpisodes);
        for (var k=0; k < Shows.length; k++) {
            toHtml(Shows[k])
        };
    } catch(err) {
        Log("Svt.decode Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
};

Svt.FixVariant = function(variant) {
    if (variant) {
        variant = variant.toLowerCase();
        variant = variant.replace(/tecken(spr[^k]+ks?)?(tolkat)?/, "teckentolkat")
        // alert(variant)
    }
    return variant;
};

Svt.sortEpisodes = function(Episodes, Names, IgnoreEpisodes) {
    Episodes.sort(function(a, b){
        if (Svt.IsClip(a) && Svt.IsClip(b)) {
            // Keep SVT sorting amongst clips
            return Names.indexOf(a.name) - Names.indexOf(b.name)
        } else if(Svt.IsClip(a)) {
            // Clips has lower prio
            return 1
        } else if(Svt.IsClip(b)) {
            // Clips has lower prio
            return -1
        } else if (a.variant == b.variant) {
            if (IgnoreEpisodes)
                // Keep SVT sorting in case not all videos has an episod number.
                return Names.indexOf(a.name) - Names.indexOf(b.name)
            else if (Svt.IsNewer(a,b))
                return -1
            else
                return 1
        } else if (!a.variant || (b.variant && b.variant > a.variant)) {
            return -1
        } else {
            return 1
        }
    });
};

Svt.IsNewer = function(a,b) {
    if (a.season == b.season) {
        return a.episode > b.episode
    } else if (b.season && a.season) {
        return a.season > b.season
    } else
        return a.season
}

Svt.IsClip = function(a) {
    return a.link.match(/\/klipp\//)
}
