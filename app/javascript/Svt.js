var Svt =
{
    sections:[],
    section_max_index:0,
    category_details:[],
    category_detail_max_index:0,
    thumbs_index:null
};

Svt.getHeaderPrefix = function() {
    return "SVT";
}

Svt.getSectionTitle = function() {
    return Svt.sections[Svt.getSectionIndex().current].name;
}

Svt.getCategoryTitle = function() {
    switch (Svt.getCategoryIndex().current) {
    case 0:
        return "Kategorier";
    case 1:
        return "Alla Kategorier";
    case 2:
        return "Alla Program";
    }
};

Svt.keyRed = function() {
    Svt.setNextSection();
}

Svt.keyGreen = function() {
    if (myLocation.match(/categoryDetail\.html/))
	setLocation(Svt.getNextCategoryDetail());
    else if (myLocation.match(/categories\.html/))
        setLocation(Svt.getNextCategory());
    else
        setLocation("categories.html")
};

Svt.getAButtonText = function(language) {
    return Svt.getNextSectionText();
}

Svt.getBButtonText = function(language, catLoaded) {
    var loc = getIndexLocation();
    var text = null;
    if (loc.match(/categoryDetail\.html/)) {
        text = Svt.getNextCategoryDetailText(language)
    } else if (loc.match(/categories\.html/))
        text = Svt.getNextCategoryText()
    return text;
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
    else if (data.image)
        Thumb = data.image;
    else if (data.poster)
        Thumb = data.poster;
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
    var new_url = url;
    var result = httpRequest(url,{sync:true})
    if (result.location) {
        new_url = result.location;
    } else if (result.success) {
        try {
            new_url = Svt.decodeJson({responseText:result.data}).metaData.canonical;
        } catch(err) {
            Log("Svt.redirectUrl exception:" + err.message);
            result = result.data.match(/og:url"[^"]+"(http[^"]+)/)
            if (result && result.length > 0)
                new_url = result[1]
        }
    }
    if (new_url != url)
        Log("URL redirected:" + new_url)
    return new_url
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
	        for (var i = 0; i < data.channelsPage.schedule.length; i++) {
                    if (data.channelsPage.schedule[i].name == data.metaData.title) {
                        data = data.channelsPage.schedule[i];
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
                if (data.titlePage) {
                    Show = {name : data.titlePage.programTitle.trim(),
                            url  : Svt.fixLink(data.titlePage.urlFriendlyTitle)
                           }
                    
                    // Lets see if we need this below...
                    // for (var key in data.titlePage.clusters) {
                    //     if (data.titlePage.clusters[key].name.toLowerCase == Show.name.toLowerCase())
                    //     {
                    //         Show = null;
                    //         break
                    //     }
                    // }
                }
                data = data.video;
                if (data.programTitle == data.title || !data.programTitle) {
                    Name = data.title;
                    if (Show && Show.name != data.title)
                        Name = Show.name + " - " + Name

                } else {
                    Name = data.programTitle + " - " + data.title;
                }
                if (data.description)
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

        Name  = data.programTitle.trim();
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

Svt.getUrl = function(tag, extra) {
    switch (tag.replace(/\.html.+/,".html"))
    {
    case "main":
        return "http://www.svtplay.se";
        
    case "section":
        return Svt.getSectionUrl(extra.location);

    case "categories":
        return 'http://www.svtplay.se/genre';

    case "categoryDetail":
        return extra.location;

    case "live":
        return "http://www.svtplay.se/kanaler";

    case "searchList":
        return 'http://www.svtplay.se/sok?q=' + extra.query;

    default:
        alert("Default:" + tag)
        return tag;
    };
};

Svt.getSectionUrl = function(location) {
    if (location.indexOf("similar.html?url=") != -1) {
        PathHistory.GetPath();
        return location.match(/similar.html\?url=([^&]+)/)[1]
    }

    var index = location.match(/tab_index=([0-9]+)/)[1];
    return Svt.sections[index].url;
};

Svt.decodeMain = function(data, extra) {
    var recommendedLinks = Svt.decodeRecommended(data, {add_sections:true});

    requestUrl(Svt.sections[0].url,
               function(status, data)
               {
                   extra.recommended_links = recommendedLinks
                   extra.cbComplete = null;
                   Svt.decodeSection(data, extra);
               },
               {callLoadFinished:true,
                refresh:extra.refresh
               }
              );
};

Svt.decodeSection = function(data, extra) {
    data = Svt.decodeJson(data);
    if (data.gridPage && data.gridPage.content && data.gridPage.content.length > 0) {
        data = data.gridPage.content
    } else if (data.clusterPage) {
        // Nyheter - why is there a category in start page?
        data  = data.clusterPage.tabs
        for (var i=0; i < data.length; i++) {
            if (data[i].name.match(/senast/i)) {
                data = data[i].content
                break
            }
        }
    }
    Svt.decode(data, extra);
    // Svt.decode(Svt.decodeJson(data).gridPage.content, extra.recommended_links);
    // data = Svt.decodeJson(data);
    // if (data.gridPage)
    //     Svt.decode(data.gridPage.content, extra);
    // else
    //     Svt.decode(data.VideoTitlePageStore.data.videosInSameCategory.videoItems);

    if (extra.cbComplete)
        extra.cbComplete();
};

Svt.decodeCategories = function (data, extra) {

    try {
        var Name;
        var Link;
        var ImgLink;

        data = Svt.decodeJson(data)

        switch (Svt.getCategoryIndex().current) {
        // case 0:
        //     data = data.programsPage.content;
        //     data.mainClusters.sort(function(a, b){return (a.name > b.name) ? 1 : -1});
        //     Svt.decode(data.mainClusters)
        //     break;
        case 0:
        case 1:
        case 2:
            data = data.clusters.alphabetical;
            var keys = [];
            for (var key in data) {
                keys.push({letter:data[key].letter,
                           idx:key
                          })
            }
            keys.sort(function(a, b) {
                if (b.letter > a.letter) 
                    return -1
                return 1
            })
            for (var k=0; k<keys.length; k++) {
                for (var i=0; i < data[keys[k].idx].clusters.length; i++) {
                    Name    = data[keys[k].idx].clusters[i].name.trim();
                    ImgLink = null;
                    Link    = data[keys[k].idx].clusters[i].contentUrl.replace(/^tag.+:([^:]+)$/,"/genre/$1");
                    Link    = Svt.fixLink(Link);
                    if (data[keys[k].idx].clusters[i].metaData)
                        ImgLink = Svt.getThumb(data[keys[k].idx].clusters[i].metaData);
                    toHtml({name:        Name,
                            link:        Link,
                            link_prefix: '<a href="categoryDetail.html?category=',
                            thumb:       ImgLink,
                            largeThumb:  (ImgLink) ? ImgLink.replace("small", "large") : null
                           });
                };
            };            
            break;
        case 2:
            data = data.alphabeticList.content;
            ImgLink = null;
            for (var key in data) {
                for (var k=0; k < data[key].titles.length; k++) {
                    Name    = data[key].titles[k].title.trim();
                    Link    = data[key].titles[k].urlFriendlyTitle;
                    showToHtml(Name, ImgLink, Svt.fixLink(Link));
                };
            };
            break;
        };
        data = null;
    } catch(err) {
        Log("Svt.decodeCategories Exception:" + err.message + " data:" + JSON.stringify(data));
    }
    if (extra.cbComplete)
        extra.cbComplete();
};

Svt.decodeCategoryDetail = function (data, extra) {
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

    if (data.clusterPage.tabs) {
        for (var k=0; k < data.clusterPage.tabs.length; k++) {
            if (data.clusterPage.tabs[k].name.match(/^Popul/)) {
                // Popular is special and merged with recommended
                popular.name = main_name + " - " + data.clusterPage.tabs[k].name.trim();
                popular.section = data.clusterPage.tabs[k].name.trim();
                popular.tab_index = k;
            } else {
                Svt.category_details.push({name:      main_name + " - " + data.clusterPage.tabs[k].name.trim(),
                                           section: data.clusterPage.tabs[k].name.trim(),
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
        if (data.clusterPage.titlesAndEpisodes)
            Svt.decode(data.clusterPage.titlesAndEpisodes)
        if (Svt.category_detail_max_index == 0 && data.clusterPage.content.clips)
            Svt.decode(data.clusterPage.content.clips)
    } else if (current.recommended) {
        for (var key in data.displayWindow) {
            recommendedLinks = recommendedLinks.concat(Svt.decodeRecommended(data.displayWindow[key], {json:true}));
        }
    } else if (current.related) {
        Svt.decode(data.clusterPage.content.relatedClusters);
    }
        
    if (current.tab_index >= 0)
        Svt.decode(data.clusterPage.tabs[current.tab_index].content, {recommended_links:recommendedLinks});

    Language.fixBButton();
    if (extra.cbComplete)
        extra.cbComplete()
};

Svt.decodeLive = function(data, extra) {
    Svt.decodeChannels(data);
    extra.url = 'http://www.svtplay.se/live'; 
    requestUrl(extra.url,
               function(status, data)
               {
                   extra.cbComplete = null;
                   Svt.decodeSection(data, extra);
                   data = null
               },
               {callLoadFinished:true,
                refresh:extra.refresh
               }
              );
};

Svt.decodeShowList = function(data, extra) {
    data = Svt.decodeJson(data).videoTitlePage;
    var seasons = []
    var has_clips = false
    var has_zero_season = false
    if (!extra.is_clips && !extra.season) {
        for (var i=0; i < data.relatedVideosTabs.length; i++) {
            if (data.relatedVideosTabs[i].season > 0) {
                seasons.push({season:data.relatedVideosTabs[i].season,
                              name  : data.relatedVideosTabs[i].name.trim()
                             });
            } else if (data.relatedVideosTabs[i].season == 0) {
                has_zero_season = true;
            }
            if (!has_clips && data.relatedVideosTabs[i].type == "RELATED_VIDEO_TABS_CLIP")
                has_clips = true
        }

        if (seasons.length > 1 || has_zero_season) {
            seasons.sort(function(a, b){return b.season-a.season})
            for (var i=0; i < seasons.length; i++) {
                seasonToHtml(seasons[i].name,
                             Svt.getThumb(data.titlePage),
                             extra.url,
                             seasons[i].season
                            )
            };
        } else if (extra.season!=0 && seasons.length == 1) {
            return callTheOnlySeason(seasons[0].name, extra.url);
        }
    }
    // Get Correct Tab
    var videos = [];
    for (var i=0; i < data.relatedVideosTabs.length; i++) {
        if (extra.season && extra.season != 0) {
            if (data.relatedVideosTabs[i].season == +extra.season) {
                videos = data.relatedVideosTabs[i].videos
                break
            }
        } else if (extra.is_clips) {
            if (data.relatedVideosTabs[i].type == "RELATED_VIDEO_TABS_CLIP") {
                videos = data.relatedVideosTabs[i].videos
                break
            }
        } else {
                if (has_zero_season) {
                    if (data.relatedVideosTabs[i].season == 0) {
                        videos = data.relatedVideosTabs[i].videos
                        break;
                    }
                } else if (data.relatedVideosTabs[i].type != "RELATED_VIDEO_TABS_CLIP") {
                    videos = data.relatedVideosTabs[i].videos
                    break
                }
        }
    };

    if (extra.season || extra.is_clips || seasons.length < 2) {
        extra.strip_show = true;
        Svt.decode(videos, extra);
    }

    if (has_clips)
        clipToHtml(Svt.getThumb(data.titlePage), extra.url)

    if (extra.cbComplete)
        extra.cbComplete();
}

Svt.decodeSearchList = function (data, extra) {
    try {
        var keys = [];
        data = Svt.decodeJson(data).searchPage;
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
    if (extra.cbComplete)
        extra.cbComplete();
};

Svt.getPlayUrl = function(url, isLive, altUrl, altVideoUrl) 
{
    // url = Svt.fixLink(url);
    // Log("url:" + url);
    var video_url, stream_url, url_param = '?output=json';
    if (url.indexOf('?') != -1)
        url_param = '&output=json'; 
    var stream_url = url;
    if (url.indexOf("/kanaler/") == -1)
        stream_url = (altUrl) ? altUrl : url+url_param;

    requestUrl(stream_url,
               function(status, data)
               {
                   if (Player.checkPlayUrlStillValid(url)) {
                       var videoReferences, subtitleReferences = [], srtUrl = null;
                       if (url.indexOf("/kanaler/") != -1) {
                           data = Svt.decodeJson(data);
	                   for (var i = 0; i < data.channelsPage.schedule.length; i++) {
                               if (data.channelsPage.schedule[i].name == data.metaData.title) {
                                   data = data.channelsPage.schedule[i];
                                   // No subtitles
                                   data.disabled = true;
                                   data.subtitleReferences = []
                                   break;
                               }
                           }
                       } else {
                           try {
                               data = Svt.decodeJson(data).context.dispatcher.stores.VideoTitlePageStore.data;
                           } catch (err) {
                               data = JSON.parse(data.responseText);
                           }
                       }
                       
                       if (data.video)
                           videoReferences = data.video.videoReferences
                       else
                           videoReferences = data.videoReferences;

		       for (var i = 0; i < videoReferences.length; i++) {
		           Log("videoReferences:" + videoReferences[i].url);
		           video_url = videoReferences[i].url;
                           if (video_url.indexOf('.m3u8') >= 0) {
			       break;
		           }
		       }
                       if (data.video && data.video.subtitleReferences)
                           subtitleReferences = data.video.subtitleReferences
                       else if (data.video && data.video.subtitles)
                           subtitleReferences = data.video.subtitles
                       else if (data.subtitleReferences)
                           subtitleReferences = data.subtitleReferences;

                       for (var i = 0; i < subtitleReferences.length; i++) {
		           Log("subtitleReferences:" + subtitleReferences[i].url);
                           if (subtitleReferences[i].url.indexOf(".m3u8") != -1)
                               continue
		           srtUrl = subtitleReferences[i].url;
                           if (srtUrl.length > 0){
			       break;
		           }
		       }
                       if (!altUrl && !srtUrl && !data.disabled) {
                           var programVersionId = null;
                           if (data.video && data.video.programVersionId)
                               programVersionId = data.video.programVersionId;
                           else if (data.context)
                               programVersionId  = data.context.programVersionId
                           if (programVersionId) {
                               // Try alternative url
                               altUrl = SVT_ALT_API_URL + programVersionId;
                               return Svt.getPlayUrl(url, isLive, altUrl, video_url);
                           }
                       } 

		       if (video_url.match(/\.m3u8/)) {
		           Resolution.getCorrectStream(video_url, srtUrl, {isLive:isLive});
		       }
		       else{
		           Player.setVideoURL(video_url, video_url, srtUrl);
		           Player.playVideo();
		       }
	           }
               },
               {cbError:function(status, data) {
                   if (altVideoUrl) {
                       loadingStart();
                       Resolution.getCorrectStream(altVideoUrl, null, {isLive:isLive});
                   };
               },
                dont_show_errors:altVideoUrl
               }
              );
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

Svt.decodeRecommended = function (data, extra) {
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
            if (extra && extra.add_sections)
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
        Log("Svt.decodeRecommended Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
};

Svt.getNextCategory = function() {
    return getNextIndexLocation(2);
}

Svt.getCategoryIndex = function () {
    return getIndex(2);
};

Svt.getNextCategoryDetail = function() {
    var nextLocation    = getNextIndexLocation(Svt.category_detail_max_index);
    var category_detail = Svt.getCategoryDetailIndex()
    if (category_detail.next == 0)
        return "categories.html";
    var old_detail     = Svt.category_details[category_detail.current].section
    var new_detail     = Svt.category_details[category_detail.next].section
    nextLocation =  nextLocation.replace(new RegExp(old_detail+"/$"), "")
    return nextLocation + new_detail + "/";
}

Svt.getCategoryDetailIndex = function () {
    return getIndex(Svt.category_detail_max_index);
};

Svt.getNextCategoryText = function() {
    var language = Language.checkLanguage();

    switch (Svt.getCategoryIndex().next) {
    case 0:
        // Use default
        return null;
    case 1:
        if (language == "Swedish")
            return "Alla Kategorier";
        else
            return "All Categories";
        break;
    case 2:
        if (language == "Swedish")
            return "Alla Program";
        else
            return"All Shows";
        break;
    }
};

Svt.getNextCategoryDetailText = function() {
    if (Svt.category_details.length) {
        var text = Svt.category_details[Svt.getCategoryDetailIndex().next].name
        var category = decodeURIComponent(getIndexLocation().match(/catName=([^&]+)/)[1])
        if (text.match(new RegExp("^" + category + "( - .+|$)"))) {
            if(Svt.getCategoryDetailIndex().next == 0)
                // We're at the end - start over with default
                return null
            else
                return text
        }
    }
    // Wrong category - keep unchanged
    return 0;
}

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

        data = Svt.decodeJson(data).channelsPage.schedule;
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

Svt.decode = function(data, extra) {
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

        if (!extra)
            extra = {};

        if (extra.strip_show) {
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
            if (data[k].movie && data[k].programTitle)
                Name = data[k].programTitle.trim();
            else if (data[k].title)
                Name = data[k].title.trim()
            else if (data[k].programTitle)
                Name = data[k].programTitle.trim()
            else if (data[k].name)
                Name = data[k].name.trim()
            else
                Name = "WHAT?!?!?"
            Duration = data[k].materialLength;
            Description = data[k].description;
            if (!extra.strip_show) {
                if (Name.match(/^(avsnitt|del)/i)) {
                    if (data[k].season > 0)
                        Name = "Säsong " + data[k].season + " - " + Name;
                    if (data[k].programTitle) {
                        Description = Name;
                        Name = data[k].programTitle.trim();
                    }
                } else if (data[k].programTitle) {
                    if (!Name.match(new RegExp(data[k].programTitle.trim(), 'i')))
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

            if (extra.recommended_links) {
                if (extra.recommended_links.indexOf(Link.replace(/.+\/(video|klipp)\/([0-9]+).*/, "$2")) != -1)
                    continue;
                else if (extra.recommended_links.indexOf(Link.replace(/.+\/(video|klipp)\/[0-9]+\/([^\/]+)\/.+$/, "$2")) != -1)
                    continue;
            }

            ImgLink = Svt.getThumb(data[k]);
            IsLive = data[k].live && !data[k].broadcastEnded;
            IsRunning = data[k].broadcastedNow;
            starttime = data[k].broadcastDate;
            if (!starttime)
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
            
            if (!data[k].movie && extra.strip_show && !IgnoreEpisodes) {
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
        if (extra.strip_show) 
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
