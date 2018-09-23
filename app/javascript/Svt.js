var Svt =
{
    sections:[],
    section_max_index:0,
    category_details:[],
    category_detail_max_index:0,
    thumbs_index:null,
    play_args:{},
    live_url:'http://www.svtplay.se/live'
};

var SVT_ALT_API_URL = "http://www.svt.se/videoplayer-api/video/"

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
    if (getIndexLocation().match(/categoryDetail\.html/))
	setLocation(Svt.getNextCategoryDetail());
    else if (getIndexLocation().match(/categories\.html/))
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
        Link = Link.replace(/file:\/\/(localhost\/)?/, "http://").trim();
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
        return "https://www.svtplay.se" + Link
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
    else if (data.backgroundImage)
        Thumb = data.backgroundImage;
    else if (typeof(data) === 'string')
        Thumb = data;
    Thumb = Svt.fixLink(Thumb, data.publication).replace("_imax", "");
    if (Thumb.match(/\/wide\/[0-9]+/)) {
        if (size == "extralarge")
            size = BACKGROUND_THUMB_FACTOR*THUMB_WIDTH;
        else if (size == "large")
            size = DETAILS_THUMB_FACTOR*THUMB_WIDTH;
        else
            size = THUMB_WIDTH;
        Thumb = Thumb.replace(/\/wide\/[0-9]+/, "/wide/" + size);
    } else {
        if (!size) size = "small";
        Thumb = Thumb.replace(/\/(small|medium|(extra)?large)\//, "/" + size + "/")
    }
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
        if (key.match(/Url$/)) {
            if  (key.match(/live/i)) {
                Svt.live_url = Svt.fixLink(data[key])
            } else {
                name = key.replace(/Url$/, "Header");
                if (key.match(/popu/i)) {
                    Svt.sections.unshift({name:data[name], url:Svt.fixLink(data[key])})
                } else {
                    Svt.sections.push({name:data[name], url:Svt.fixLink(data[key])})
                }
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
    var NotAvailable=false;
    var startTime=0;
    var endTime=0;
    var Show = null;
    var isLive = false;
    var Season=null;
    var Episode=null;
    var EpisodeName=null;
    var Variant=null;
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
                data = data.channelsPage
	        for (var i in data.schedule) {
                    if (data.schedule[i].channelName == data.activeChannelId) {
                        data = data.schedule[i];
                        break;
                    }
                }
                Name = data.channelName.trim() + " - " + data.programmeTitle.trim();
	        Description = data.description.trim();
                ImgLink = Svt.getThumb(data, "large")
                if (!ImgLink)
	            ImgLink = Svt.GetChannelThumb(data.channel);
                startTime = timeToDate(data.publishingTime);
                endTime = timeToDate(data.publishingEndTime);
                VideoLength = Math.round((endTime-startTime)/1000);
                AirDate = dateToClock(startTime) + "-" + dateToClock(endTime);
                Title = AirDate + " " + Name;
                isLive = true;
                NotAvailable = (startTime - getCurrentDate()) > 60*1000;
            } else {
                data = data.videoPage;
                ImgLink = Svt.getThumb(data.video, "large");
                if (data.titlePage && data.titlePage.programTitle) {
                    Show = {name : data.titlePage.programTitle.trim(),
                            url  : Svt.fixLink(data.titlePage.urlFriendlyTitle),
                            thumb: Svt.getThumb(data.titlePage)
                           }

                    // Lets see if we need this below...
                    // for (var key in data.titlePage.clusters) {
                    //     if (data.titlePage.clusters[key].name.toLowerCase == Show.name.toLowerCase())
                    //     {
                    //         Show = null;
                    //         break
                    //     }
                    // }
                } else if (data.video.clusters && data.video.clusters.length > 0) {
                    Show = data.video.clusters[0];
                    for (var cluster in data.video.clusters) {
                        if (data.video.clusters[cluster].clusterType == "main")
                            continue;
                        Show = data.video.clusters[cluster];
                        break;
                    }
                    Show = {name        : Show.name.trim(),
                            url         : Svt.fixLink("/genre/" + Show.slug),
                            thumb       : Svt.getThumb(ImgLink, "small"),
                            large_thumb : ImgLink,
                            is_category : true
                           }
                }
                data = data.video;
                Season  = data.season;
                Episode = data.episodeNumber;
                EpisodeName = Svt.determineEpisodeName(data),
                Variant = data.accessService;
                if (Variant == "none")
                    Variant = null;
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
                AirDate = Svt.getAirDate(data);
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
            season        : Season,
            variant       : Variant,
            episode       : Episode,
            episode_name  : EpisodeName,
            parent_show   : Show
    }
};

Svt.getShowData = function(url, data) {

    var Name="";
    var Genre = Name;
    var ImgLink="";
    var Description="";

    try {
        data = Svt.decodeJson(data).titlePage.titlePage;

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
        return Svt.getCategoryUrl();

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

Svt.getCategoryUrl = function() {
    switch (Svt.getCategoryIndex().current) {
    case 1:
        return 'http://www.svtplay.se/genre';
    default:
        return 'http://www.svtplay.se/program'
    }
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

        switch (Svt.getCategoryIndex().current) {
        case 0:
            data = Svt.decodeJson(data).clusters.main;
            data.sort(function(a, b) {
                if (b.name > a.name)
                    return -1
                return 1
            })
            for (var k=0; k < data.length; k++) {
                Name    = data[k].name.trim();
                ImgLink = Svt.getThumb(data[k].backgroundImage);
                Link    = Svt.fixLink(data[k].contentUrl);
                categoryToHtml(Name,
                               ImgLink,
                               Svt.getThumb(ImgLink, "large"),
                               Link
                              )
            };
            break;
        case 1:
            data = Svt.decodeJson(data).clusters.alphabetical;
            data.sort(function(a, b) {
                if (b.letter > a.letter)
                    return -1
                return 1
            })
            for (var key in data) {
                for (var k=0; k < data[key].clusters.length; k++) {
                    Name    = data[key].clusters[k].name.trim();
                    ImgLink = Svt.getThumb(data[key].clusters[k]);
                    Link    = data[key].clusters[k].contentUrl.replace(/^tag.+:([^:]+)$/,"/genre/$1");
                    Link    = Svt.fixLink(Link);
                    categoryToHtml(Name,
                                   ImgLink,
                                   Svt.getThumb(ImgLink, "large"),
                                   Link
                                  );
                };
            };
            break;
        case 2:
            data = Svt.decodeJson(data).programsPage.alphabeticList;
            data.sort(function(a, b) {
                if (b.letter > a.letter)
                    return -1
                return 1
            })
            ImgLink = null;
            for (var key in data) {
                for (var k=0; k < data[key].titles.length; k++) {
                    Name    = data[key].titles[k].programTitle.trim();
                    Link    = data[key].titles[k].contentUrl;
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

    var main_name = data.clusterPage.meta.name.trim()
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
    if (data.clusterPage.relatedClusters.length > 0) {
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
        if (data.clusterPage.titlesAndEpisodes) {
            Svt.decode(data.clusterPage.titlesAndEpisodes)
            // var shows = [];
            // for (var i=0; i<data.clusterPage.titlesAndEpisodes.length; i++) {
                // if (data.clusterPage.titlesAndEpisodes[i].episodic) {
                //     alert("Skipping:" + data.clusterPage.titlesAndEpisodes[i].programTitle)
                //     continue;
                // }
            //     shows.push(data.clusterPage.titlesAndEpisodes[i])
            // };
            // Svt.decode(shows);
            // shows = [];
        }
        if (Svt.category_detail_max_index == 0 && data.clusterPage.content.clips)
            Svt.decode(data.clusterPage.content.clips)
    } else if (current.recommended) {
        for (var key in data.displayWindow) {
            recommendedLinks = recommendedLinks.concat(Svt.decodeRecommended(data.displayWindow[key], {json:true}));
        }
    } else if (current.related) {
        Svt.decode(data.clusterPage.relatedClusters);
    }
        
    if (current.tab_index >= 0)
        Svt.decode(data.clusterPage.tabs[current.tab_index].content, {recommended_links:recommendedLinks});

    Language.fixBButton();
    if (extra.cbComplete)
        extra.cbComplete()
};

Svt.decodeLive = function(data, extra) {
    Svt.decodeChannels(data);
    extra.url = Svt.live_url; 
    requestUrl(extra.url,
               function(status, data)
               {
                   extra.cbComplete = null;
                   Svt.decodeSection(data, extra);
                   data = null
               },
               {callLoadFinished:true,
                no_cache:true,
                refresh:extra.refresh
               }
              );
};

Svt.decodeShowList = function(data, extra) {
    data = Svt.decodeJson(data);
    var showThumb = Svt.getThumb(data.titlePage.titlePage);
    var seasons = []
    var has_clips = false
    var has_zero_season = false
    data = data.relatedVideoContent;
    if (!extra.is_clips && !extra.season && !extra.variant) {
        for (var i=0; i < data.relatedVideosAccordion.length; i++) {
            if (data.relatedVideosAccordion[i].season > 0) {
                seasons.push({season:data.relatedVideosAccordion[i].season,
                              name  : data.relatedVideosAccordion[i].name.trim()
                             });
            } else if (data.relatedVideosAccordion[i].season == 0) {
                has_zero_season = true;
            }
            if (!has_clips && data.relatedVideosAccordion[i].type == "RELATED_VIDEOS_ACCORDION_CLIP")
                has_clips = true
        }

        if (seasons.length > 1 || has_zero_season) {
            seasons.sort(function(a, b){return b.season-a.season})
            for (var i=0; i < seasons.length; i++) {
                seasonToHtml(seasons[i].name,
                             showThumb,
                             extra.url,
                             seasons[i].season
                            )
            };
        } else if (extra.season!=0 && seasons.length == 1) {
            return callTheOnlySeason(seasons[0].name, extra.url, extra.loc);
        }
    }
    // Get Correct Tab
    var videos = [];
    for (var i=0; i < data.relatedVideosAccordion.length; i++) {
        if (extra.season && extra.season != 0) {
            if (data.relatedVideosAccordion[i].season == +extra.season) {
                videos = data.relatedVideosAccordion[i].videos
                break
            }
        } else if (extra.is_clips) {
            if (data.relatedVideosAccordion[i].type == "RELATED_VIDEOS_ACCORDION_CLIP") {
                videos = data.relatedVideosAccordion[i].videos
                break
            }
        } else {
                if (has_zero_season) {
                    if (data.relatedVideosAccordion[i].season == 0) {
                        videos = data.relatedVideosAccordion[i].videos
                        break;
                    }
                } else if (data.relatedVideosAccordion[i].type != "RELATED_VIDEOS_ACCORDION_CLIP") {
                    videos = data.relatedVideosAccordion[i].videos
                    break
                }
        }
    };

    if (extra.season || extra.is_clips || seasons.length < 2) {
        extra.strip_show = true;
        extra.show_thumb = showThumb;
        Svt.decode(videos, extra);
    }

    if (has_clips)
        clipToHtml(showThumb, extra.url)

    if (extra.cbComplete)
        extra.cbComplete();
}

Svt.decodeSearchList = function (data, extra) {
    try {
        var keys = [];
        data = Svt.decodeJson(data).searchPage;
        for (var key in data){
            if (data[key].sort && data[key].length > 0) {
                keys.push(key)
            }
        }
        // Make sure Categories are first.
        keys.sort(function(a, b){
            // Category
            if (data[a][0].name && !data[b][0].name)
                return -1
            else if (data[b][0].name && !data[a][0].name)
                return 1
            // Others
            else if (keys.indexOf(a) < keys.indexOf(b))
                return -1
            else 
                return 1
        });
        for (var key, i=0; i < keys.length; i++) {
            key = keys[i];
            // Put shows first in list (they're mixed with Episodes and Clips...)
            data[key].sort(function(a, b) {
                // Show
                if (!a.contentType && b.contentType)
                    return -1
                if (!b.contentType && a.contentType)
                    return 1
                // Other
                else if (data[key].indexOf(a) < data[key].indexOf(b))
                    return -1
                else 
                    return 1
            });
            Svt.decode(data[key]);
        };
    } catch(err) {
        Log("Svt.decodeSearchList Exception:" + err.message + " data[" + key  + "]:" + JSON.stringify(data[key]));
    }
    if (extra.cbComplete)
        extra.cbComplete();
};

Svt.getPlayUrl = function(url, isLive, streamUrl, cb, failedUrl)
{
    Svt.play_args = {url:url, is_live:isLive, stream_url:streamUrl};
    // url = Svt.fixLink(url);
    // Log("url:" + url);
    var video_url, extra = {isLive:isLive};

    if (url.indexOf("/kanaler/") != -1)
        streamUrl = SVT_ALT_API_URL + "ch-" + url.match(/\/kanaler\/([^\/]+)/)[1].toLowerCase()
    else if (url.indexOf("oppetarkiv") != -1) {
        streamUrl = url + (((url.indexOf('?') == -1) ) ? '?' : '&') + "output=json";
    } else if(!streamUrl) {
        streamUrl = url;
    }

    requestUrl(streamUrl,
               function(status, data)
               {
                   if (Player.checkPlayUrlStillValid(url)) {
                       var videoReferences, subtitleReferences=[], srtUrl=null;
                       if (url.indexOf("/kanaler/") != -1) {
                           data = JSON.parse(data.responseText);
                           // No subtitles
                           data.disabled = true;
                           data.subtitleReferences = []
                       } else if (streamUrl == url) {
                           streamUrl = SVT_ALT_API_URL + Svt.decodeJson(data).videoPage.video.id;
                           return Svt.getPlayUrl(url, isLive, streamUrl, cb, failedUrl);
                       } else {
                           data = JSON.parse(data.responseText);
                       }

                       if (data.video)
                           videoReferences = data.video.videoReferences
                       else
                           videoReferences = data.videoReferences;

		       for (var i = 0; i < videoReferences.length; i++) {
		           Log("videoReferences:" + videoReferences[i].url);
                           if (cb) {
                               if (failedUrl && failedUrl.match(/[?&]alt=/)) {
                                   video_url = decodeURIComponent(failedUrl.match(/[?&]alt=([^|]+)/)[1])
                                   break;
                               }
                               if (videoReferences[i].url.match(/\.mpd/)) {
                                   video_url = videoReferences[i].url
                                   break;
                               }
                           } else {
                               if (!video_url || !video_url.match(/\.m3u8/))
		                   video_url = videoReferences[i].url;
                               if (videoReferences[i].format &&
                                   videoReferences[i].format.match(/vtt/)) {
		                   video_url = videoReferences[i].url;
                                   break
                               }
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
                               continue;
                           else if (subtitleReferences[i].url.length > 0) {
		               srtUrl = subtitleReferences[i].url;
                               break;
                           }
		       }
		       if (video_url.match(/\.(m3u8|mpd)/)) {
                           extra.cb = cb;
		           Resolution.getCorrectStream(video_url, srtUrl, extra);
		       }
		       else{
                           extra.cb = function() {Player.playVideo()};
		           Player.setVideoURL(video_url, video_url, srtUrl, extra);
		       }
	           }
               }
              );
};

Svt.tryAltPlayUrl = function(failedUrl, cb)
{
    if (failedUrl.match(/\.m3u8/) || failedUrl.match(/[?&]alt=/)) {
        Svt.getPlayUrl(Svt.play_args.url,
                       Svt.play_args.is_live,
                       Svt.play_args.stream_url,
                       cb,
                       failedUrl
                      );
    }
}

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
        var Background;
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
            Background = Svt.getThumb(data[k], "extralarge");
            if (Svt.isPlayable(Link)) {
                recommendedLinks.push(Link.replace(/.+\/video\/([0-9]+).*/, "$1"));
                LinkPrefix = '<a href="details.html?ilink=';
            } else {
                LinkPrefix = makeShowLinkPrefix();
                if (Link.match(/\/genre\//)) {
                    LinkPrefix = makeCategoryLinkPrefix();
                    Link = fixCategoryLink(Name,
                                           Svt.getThumb(ImgLink, "large"),
                                           Link
                                          )
                } else {
                    recommendedLinks.push(Link.replace(/.+\/([^\/]+)$/, "$1"))
                }
            }
            toHtml({name:Name,
                    duration:0,
                    is_live:data[k].live,
                    starttime:(data[k].live) ? Svt.getAirDate(data[k]) : null,
                    is_running:data[k].liveNow,
                    is_channel:false,
                    link:Link,
                    link_prefix:LinkPrefix,
                    description:Description,
                    thumb:ImgLink,
                    background:Background
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
    if (Svt.category_details.length > Svt.getCategoryDetailIndex().next) {
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

Svt.GetChannelThumb = function (Name)
{
    return Svt.fixLink("/assets/images/channels/posters/" + Name.toLowerCase() + ".png");
};

Svt.decodeChannels = function(data) {
    try {
        var Name;
        var Duration;
        var Link;
        var ImgLink;
        var Background;
        var starttime;
        var endtime;
        var BaseUrl = 'http://www.svtplay.se/kanaler';

        data = Svt.decodeJson(data).channelsPage.schedule;
        for (var k in data) {
            Name = data[k].channelName.trim();
            if (!data[k].publishingTime) {
                alert(Name + " isn't broadcasting.")
                continue
            }
	    Link = BaseUrl + '/' + Name;
            ImgLink = Svt.GetChannelThumb(Name);
            Background = Svt.getThumb(data[k], "extralarge");
            if (!Background)
                Background = Svt.getThumb(ImgLink, "extralarge");
            starttime = timeToDate(data[k].publishingTime);
            endtime = timeToDate(data[k].publishingEndTime);
            Duration  = Math.round((endtime-starttime)/1000);
            Name = dateToClock(starttime) + "-" + dateToClock(endtime) + " " + data[k].programmeTitle.trim();
            toHtml({name:Name,
                    duration:Duration,
                    is_live:false,
                    is_channel:true,
                    link:Link,
                    link_prefix:'<a href="details.html?ilink=',
                    thumb:ImgLink,
                    background:Background
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
        var Show;
        var Name;
        var Link;
        var LinkPrefix;
        var Description;
        var Duration;
        var ImgLink;
        var Background;
        var starttime;
        var IsRunning;
        var Season;
        var Episode;
        var Variants = [];
        var SEASON_REGEXP = new RegExp("((s[^s]+song\\s*([0-9]+))\\s*-\\s*)?(.+)","i");
        var Names = [];
        var Shows = [];
        var IgnoreEpisodes = false;

        if (!extra)
            extra = {};

        if (extra.strip_show) {
            var Episodes = [];
            for (var k=0; k < data.length; k++) {
                if (data[k].episodeNumber >= 1) {
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
            Name = Svt.determineEpisodeName(data[k]);
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
            if (data[k].contentUrl) {
                if (extra.variant) {
                    Link = null;
                    // Find correct variant
                    for (var i=0; i < data[k].versions.length; i++) {
                        if (data[k].versions[i].accessService == extra.variant) {
                            Link = Svt.fixLink(data[k].versions[i].contentUrl);
                            break;
                        }
                    }
                    if (!Link) continue;
                } else {
                    Link = Svt.fixLink(data[k].contentUrl);
                }
            }
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
            Background = Svt.getThumb(data[k], "extralarge");
            IsLive = data[k].live && !data[k].broadcastEnded;
            IsRunning = data[k].broadcastedNow;
            starttime = (IsLive) ? Svt.getAirDate(data[k]) : null;
            LinkPrefix = makeShowLinkPrefix();
            if (Svt.isPlayable(Link)) {
                Duration = (Duration) ? Duration : 0;
                LinkPrefix = '<a href="details.html?ilink=';
            }
            else if (data[k].urlPart || Link.match(/\/genre\//)) {
                LinkPrefix = makeCategoryLinkPrefix();
                Link = fixCategoryLink(Name,
                                       Svt.getThumb(ImgLink, "large"),
                                       Link
                                      );
            }
            else {
                Duration = 0;
            }
            Show    = data[k].programTitle;
            Season  = data[k].season;
            Episode = data[k].episodeNumber; // || Name.match(/avsnitt\s*([0-9]+)/i) || Description.match(/[Dd]el\s([0-9]+)/i);
            for (var i=0; !extra.variant && data[k].versions && i < data[k].versions.length; i++) {
                if (data[k].versions[i].accessService &&
                    data[k].versions[i].accessService != "none" &&
                    Variants.indexOf(data[k].versions[i].accessService) == -1
                   )
                    Variants.push(data[k].versions[i].accessService);
            }
            if (data[k].versions &&
                data[k].versions.length &&
                data[k].versions[0].accessService &&
                Variants.indexOf(data[k].versions[0].accessService) != -1
               )
                continue;
            
            if (!data[k].movie && extra.strip_show && !IgnoreEpisodes) {
                if (!Name.match(/avsnitt\s*([0-9]+)/i) && Episode) {
                    Description = Name.replace(SEASON_REGEXP, "$4")
                    Name = Name.replace(SEASON_REGEXP, "$1Avsnitt " + Episode);
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
                        background:Background,
                        season:Season,
                        episode:Episode,
                        show:Show
                       })
            data[k] = "";
	};
        if (extra.strip_show) 
            Svt.sortEpisodes(Shows, Names, IgnoreEpisodes);
        for (var k=0; k < Shows.length; k++) {
            toHtml(Shows[k])
        };
        
        if (extra.strip_show) {
            for (var i=0; i < Variants.length; i++) {
                seasonToHtml(Svt.getVariantName(Variants[i]),
                             extra.show_thumb,
                             extra.url,
                             extra.season || 0,
                             Variants[i]
                            );
            }
        }
    } catch(err) {
        Log("Svt.decode Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
};

Svt.getVariantName = function(accessService) {
    switch (accessService) {
    case "signInterpretation":
        return "Teckentolkat";
    case "signLanguage":
        return "Teckentolkat";
    case "audioDescription":
        return "Syntolkat";
    case "liveCaptioning":
        return "Textat";
    default:
        return accessService
    }
}

Svt.determineEpisodeName = function(data) {
    if (data.movie && data.programTitle)
        return data.programTitle.trim();
    else if (data.title)
        return data.title.trim()
    else if (data.programTitle)
        return data.programTitle.trim()
    else if (data.name)
        return data.name.trim()
    else
        return "WHAT?!?!?"
};

Svt.getAirDate = function(data) {
    if (data.broadcastStartTime)
        return timeToDate(data.broadcastStartTime);
    else if (data.broadcastDate)
        return timeToDate(data.broadcastDate);
    else if (data.publishDate)
        return timeToDate(data.publishDate);
    else if (data.validFrom)
        return timeToDate(data.validFrom);
    else
        return null;
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
        } else {
            if (IgnoreEpisodes)
                // Keep SVT sorting in case not all videos has an episod number.
                return Names.indexOf(a.name) - Names.indexOf(b.name)
            else if (Svt.IsNewer(a,b))
                return -1
            else
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
