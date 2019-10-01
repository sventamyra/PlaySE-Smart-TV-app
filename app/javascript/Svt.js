// all_titles_and_singles
// search?q=
// channel_page?now=
// recommendations_from_titles
// next_episodes?
// search_autocomplete_list
// recommended
// xx?page={0}
// popular
// latest
// last_chance
// live
var Svt =
{
    sections:[],
    section_max_index:0,
    category_details:[],
    category_detail_max_index:0,
    category_detail_ref:null,
    thumbs_index:null,
    play_args:{},
    live_url:'http://www.svtplay.se/live'
};

var SVT_API_BASE = "https://www.svtplay.se/api/"
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
        Link = Link.replace(/^<>[0-9]+<>/, "http://www.svtstatic.se/image-cms/" + Publication);
    } else if (Link && Link.match(/^\/\//)) {
        Link = "http:" + Link;
    } else if (Link && !Link.match("https*:")) {
        if (!Link.match(/^\//))
            Link = "/" + Link;
        Link =  "https://www.svtplay.se" + Link
    }
    if (Link && Link.match(/www.oppetarkiv.se/))
        Link = Link.replace("www.oppetarkiv.se", "origin-www.svt.se/oppet-arkiv-api")
    return Link
};

Svt.makeGenreLink = function (genre)
{
    return Svt.fixLink(SVT_API_BASE + "cluster_titles_and_episodes?cluster=" + genre);
}

Svt.makeShowLink = function (data)
{
    var Slug = Svt.getGenre(data);
    if (Slug)
        return Svt.makeGenreLink(Slug);

    var Id = data.titleArticleId;
    if (!Id && data.articleId)
        Id = data.articleId;
    if (Id)
        return Svt.fixLink(SVT_API_BASE + "title_episodes_by_article_id?articleId=" + Id);
    return Svt.fixLink(data.contentUrl);
};

Svt.fixOldShowLink = function(url)
{
    var data = httpRequest(url.replace(/\/\/.+\/([^\/]+$)/, "//www.svtplay.se/api/title?slug=$1"),
                           {sync:true}).data;
    return Svt.makeShowLink(JSON.parse(data))
};

Svt.makeEpisodeLink = function (data)
{
    var Slug = Svt.getGenre(data);
    if (Slug)
        return Svt.makeGenreLink(Slug);

    if (data.titleType && data.titleType=="CLIP" && data.titleArticleId)
        return Svt.makeClipLink(data);

    var Id = data.articleId;
    if (!Id && data.url)
        Id = data.url.replace(/^.+\/([0-9]+)\/.+/, "$1");
    if (!Id && data.versions && data.versions.length > 0)
        return Svt.makeEpisodeLink(data.versions[0]);
    if (Id)
        return Svt.fixLink(SVT_API_BASE + "episode?id=" + Id);
    else
        return Svt.fixLink(data.contentUrl);
}

Svt.makeClipLink = function (data)
{
    return Svt.fixLink(SVT_API_BASE + "title_clips_by_title_article_id?articleId=" + data.titleArticleId + "&id=" + data.id)
}

Svt.makeLink = function (data)
{
    var Slug = Svt.getGenre(data);
    if (Slug)
        return Svt.makeGenreLink(Slug);

    if (data.type == "EPISODE")
        return Svt.makeEpisodeLink(data);

   return Svt.makeShowLink(data);
};

Svt.getGenre = function (data) {
    var url = data.contentUrl;
    if (!url) url = data.url;
    if (url) {
        url = url.match(/\/genre\/([^\/]+)$/);
        return url ? url[1] : null;
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
            size = Math.round(BACKGROUND_THUMB_FACTOR*THUMB_WIDTH);
        else if (size == "large")
            size = Math.round(DETAILS_THUMB_FACTOR*THUMB_WIDTH);
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
    return url.match(/\/video|klipp\//) || url.match(/api\/episode\?/) || Svt.IsClip({link:url});
}

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
    if (streamUrl.match(/www.svtplay.se\/[^\/]+$/))
        return Svt.getDetailsUrl(Svt.fixOldShowLink(streamUrl))
    return Svt.fixLink(streamUrl.replace(/title_episodes_by_article_id/, "title_by_article_id"));
};

Svt.getDetailsData = function(url, data) {

    if (url.match("oppet-arkiv-api"))
        return Oa.getDetailsData(url, data);

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
        if (url.match("/kanaler/")) {
            data = Svt.decodeJson(data);
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
            data = JSON.parse(data.responseText);
            if (url.match(/title_clips_by_title_article_id/))
            {
                for (var i=0; i < data.length; i++) {
                    if (data[i].id == url.match(/&id=([0-9]+)/)[1]) {
                        data = data[i];
                        break
                    }
                }
            }
            ImgLink = Svt.getThumb(data, "large");
            if (data.programTitle && data.titleType != "MOVIE") {
                Show = {name : data.programTitle.trim(),
                        url  : Svt.makeShowLink(data),
                        thumb: Svt.fixLink(data.poster)
                       }

                // Lets see if we need this below...
                // for (var key in data.titlePage.clusters) {
                //     if (data.titlePage.clusters[key].name.toLowerCase == Show.name.toLowerCase())
                //     {
                //         Show = null;
                //         break
                //     }
                // }
            } else if (data.clusters && data.clusters.length > 0) {
                Show = data.clusters[0];
                for (var cluster in data.clusters) {
                    // Couldn't find any "main" any longer
                    if (data.clusters[cluster].clusterType == "emiBased")
                        continue;
                    Show = data.clusters[cluster];
                    break;
                }
                Show = {name        : Show.name.trim(),
                        url         : Svt.makeGenreLink(Show.slug),
                        thumb       : Svt.getThumb(ImgLink, "small"),
                        large_thumb : ImgLink,
                        is_category : true
                       }
            }
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
        data = JSON.parse(data.responseText);

        Name = data.programTitle.trim();
        ImgLink = Svt.getThumb(data, "large");
	Description = data.shortDescription.trim()
        if (Description && data.description.indexOf(Description) == -1)
            Description = "<p>" + Description + "</p>" + data.description.trim();
        else
            Description = data.description.trim();
        Genre = [];
        for (var i=0; i < data.clusters.length; i++) {
            Genre.push(data.clusters[i].name.trim());
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
        return Svt.getCategoryDetailsUrl(extra.location);

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
    case 0:
    case 1:
        return 'http://www.svtplay.se/api/clusters';
    case 2:
        return 'http://www.svtplay.se/program'
    }
};

Svt.getCategoryDetailsUrl = function(location) {
    switch (Svt.getCategoryDetailIndex().current) {
    case 0:
        return location;
    default:
        return Svt.category_details[Svt.getCategoryDetailIndex().current].url
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
        var Index = Svt.getCategoryIndex().current;

        switch (Index) {
        case 0:
        case 1:
            data = JSON.parse(data.responseText);
            if (Index == 0) {
                // Filter main categories
                data.main = [];
                for (var k=0; k < data.length; k++) {
                    if (data[k].type == "main")
                        data.main.push(data[k])
                }
                data = data.main;
            }
            data.sort(function(a, b) {
                if (b.name.toLowerCase() > a.name.toLowerCase())
                    return -1
                return 1
            })
            for (var k=0; k < data.length; k++) {
                Name    = data[k].name.trim();
                ImgLink = data[k].backgroundImage;
                if (!ImgLink) ImgLink = data[k];
                ImgLink = Svt.getThumb(ImgLink);
                Link    = Svt.makeGenreLink(data[k].slug);
                categoryToHtml(Name,
                               ImgLink,
                               Svt.getThumb(ImgLink, "large"),
                               Link
                              )
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
    if (extra.url.match(/\/genre\//)) {
        // Still try to use old API...
        Log("OLD API:" + extra.url);
        extra.url =
            extra.url.replace(/\/\/.+\/([^\/]+$)/, "//www.svtplay.se/api/cluster_titles_and_episodes?cluster=$1");
        return requestUrl(extra.url, function(status,data) {
            Svt.decodeCategoryDetail(data,extra)
        });
    }
    data = JSON.parse(data.responseText);

    var Slug     = extra.url.match(/\?cluster=([^&]+)/)[1]
    var MainName = Slug.capitalize();

    if (Svt.getCategoryDetailIndex().current == 0 || extra.out_of_sync) {
        Svt.category_details = [];
        Svt.category_detail_max_index = 0;
        Svt.category_detail_ref = Slug + new Date().getTime();
        for (var k=0; k < data[0].clusters.length; k++) {
            if (data[0].clusters[k].slug == Slug) {
                MainName = data[0].clusters[k].name
                break;
            }
        }
        // Add main view
        Svt.category_details.push({name:MainName, main:true, section:"none"})
        // For "larger" Categories add the category sections
        if (data.length > 5) {
            // Add recommended
            Svt.category_details.push({name:MainName + " - Rekommenderat",
                                       recommended: true,
                                       section: "Rekommenderat",
                                       tab_index: 1,
                                       url: SVT_API_BASE + "cluster_recommended?cluster=" + Slug,
                                       popular_url: SVT_API_BASE + "cluster_popular?cluster=" + Slug,
                                      })

            var Tabs = [{tag:"cluster_latest", name: "Senaste"},
                        {tag:"cluster_last_chance", name: "Sista Chansen"},
                        {tag:"cluster_related", name: "Relaterat"},
                        {tag:"cluster_clips", name: "Klipp"}
                       ];

            var OptionalTabs = [];
            for (var k=0; k < Tabs.length; k++) {
                OptionalTabs.push(
                    {name:      MainName + " - " + Tabs[k].name,
                     section:   Tabs[k].name,
                     tab_index: k,
                     url:  SVT_API_BASE + Tabs[k].tag + "?cluster=" + Slug
                    });
            }
            var Ref = Svt.category_detail_ref;
            Svt.addCategoryIndexSections(Ref, extra, OptionalTabs, 0);
            if (extra.out_of_sync) {
                extra.out_of_sync = false;
                extra.url = Svt.getCategoryDetailsUrl();
                return requestUrl(extra.url, function(status,data) {
                    Svt.decodeCategoryDetail(data,extra)
                });
            }
        };
        Svt.category_detail_max_index = Svt.category_details.length-1;

    } else {
        var ExpectedSlug = getLocation(extra.refresh).match(/\?cluster=([^&]+)/)[1];
        if (ExpectedSlug != Slug) {
            extra.url = extra.url.replace(/cluster.+\?cluster.+/, "cluster_titles_and_episodes?cluster=" + ExpectedSlug);
            extra.out_of_sync = true;
            // alert("OUT OF SYNC, ExpectedSlug: " + ExpectedSlug + " Actual: " + Slug + " New:" + extra.url);
            return requestUrl(extra.url, function(status,data) {
                Svt.decodeCategoryDetail(data,extra)
            })
        }
    }

    Language.fixBButton();
    var current = Svt.category_details[Svt.getCategoryDetailIndex().current];

    if (current.recommended) {
        var recommendedLinks = Svt.decodeRecommended(data, {json:true});
        return requestUrl(current.popular_url,
                          function(status, data)
                          {
                              extra.recommended_links = recommendedLinks
                              extra.cbComplete = null;
                              Svt.decode(JSON.parse(data.responseText), extra);
                          },
                          {callLoadFinished:true,
                           refresh:extra.refresh
                          }
                         );
    } else {
        Svt.decode(data);
        if (extra.cbComplete)
            extra.cbComplete()
    }

};

Svt.addCategoryIndexSections = function(Ref, extra, OptionalTabs, Index) {
    if (Ref != Svt.category_detail_ref)
        return;
    if (Index < OptionalTabs.length) {
        httpRequest(OptionalTabs[Index].url,
                    {cb:function(status, data) {
                        if (Ref == Svt.category_detail_ref) {
                            if (status==200 && JSON.parse(data).length > 0) {
                                Svt.category_details.push(OptionalTabs[Index]);
                                Svt.category_detail_max_index = Svt.category_details.length-1;
                            }
                            Svt.addCategoryIndexSections(Ref, extra, OptionalTabs, Index+1)
                        }
                    },
                     sync:extra.out_of_sync
                    });
    }
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
    if (extra.url.match("oppet-arkiv-api"))
        return Oa.decodeShowList(data, extra);

    if (!extra.url.match(/\/api\//)) {
        Log("OLD API:" + extra.url);
        extra.url = Svt.fixOldShowLink(extra.url);
        return requestUrl(extra.url, function(status,data) {
            Svt.decodeShowList(data,extra)
        });
    }

    data = JSON.parse(data.responseText);

    var showThumb = (data.length > 0) ? Svt.fixLink(data[0].poster): null;
    var seasons = [];
    var clipsUrl = extra.url.replace("episodes_by_article", "clips_by_title_article"); 
    var hasClips = false;
    var hasZeroSeason = false
    if (!extra.is_clips && !extra.season && !extra.variant) {
        hasClips = (JSON.parse(httpRequest(clipsUrl, {sync:true}).data)).length > 0;
        for (var i=0; i < data.length; i++) {
            if (data[i].season > 0 && seasons.indexOf(data[i].season) == -1) {
                seasons.push(data[i].season);
            } else if (data[i].season == 0) {
                hasZeroSeason = true;
            }
        }

        if (seasons.length > 1 || hasZeroSeason) {
            seasons.sort(function(a, b){return b-a})
            for (var i=0; i < seasons.length; i++) {
                seasonToHtml("Säsong " + seasons[i],
                             showThumb,
                             extra.url,
                             seasons[i]
                            )
            };
        } else if (extra.season!=0 && seasons.length == 1) {
            return callTheOnlySeason("Säsong " + seasons[0], extra.url, extra.loc);
        }
    }

    // Filter episodes belonging to correct season.
    if (hasZeroSeason || extra.season) {
        var Season = (extra.season) ? extra.season : 0;
        data.filtered = [];
        for (var i=0; i < data.length; i++) {
            if (data[i].season == Season)
                data.filtered.push(data[i])
        }
        data = data.filtered;
    }

    if (extra.season || extra.is_clips || seasons.length < 2) {
        extra.strip_show = true;
        extra.show_thumb = showThumb;
        Svt.decode(data, extra);
    }

    if (hasClips)
        clipToHtml(showThumb, clipsUrl)

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
    if (url.match("oppet-arkiv-api"))
        return Oa.getPlayUrl(url, isLive);

    var video_urls=[], extra = {isLive:isLive};

    if (url.match("/kanaler/"))
        streamUrl = SVT_ALT_API_URL + "ch-" + url.match(/\/kanaler\/([^\/]+)/)[1].toLowerCase()
    else if (url.match(/\/title_clips_by_title_article_id/))
        streamUrl = SVT_ALT_API_URL + url.match(/&id=([0-9]+)/)[1];
    else if(!streamUrl) {
        streamUrl = url;
    }

    requestUrl(streamUrl,
               function(status, data)
               {
                   if (Player.checkPlayUrlStillValid(url)) {
                       var videoReferences, subtitleReferences=[], srtUrl=null;
                       var hls_url=null, dash_hbbtv_url=null, other_url=null;
                       if (url.indexOf("/kanaler/") != -1) {
                           data = JSON.parse(data.responseText);
                           // No subtitles
                           data.disabled = true;
                           data.subtitleReferences = []
                       } else if (streamUrl == url) {
                           if (data.responseText == "") {
                               // Can't get clips working...
                               data = streamUrl.replace(/^[^0-9]+/, "")
                           } else {
                               data = JSON.parse(data.responseText)
                               if (data.versions && data.versions.length > 0) {
                                   var articleId = streamUrl.match(/\?id=([0-9]+)/)[1];
		                   for (var i=0; i < data.versions.length; i++) {
                                       if (data.versions[i].articleId == articleId) {
                                           data = data.versions[i].id
                                           break
                                       }
                                   }
                               } else {
                                   data = data.id;
                               }
                           }
                           streamUrl = SVT_ALT_API_URL + data;
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
                           if ((videoReferences[i].format.match("cmaf")) ||
                               (videoReferences[i].format.match("\-lb")))
                               continue;
                           if (videoReferences[i].url.match(/\.m3u8/)) {
                               if (!hls_url ||
                                   (videoReferences[i].format &&
                                    videoReferences[i].format.match(/vtt/))
                                  )
		                   hls_url = videoReferences[i].url;
                           } else if (videoReferences[i].format &&
                                      videoReferences[i].format.match("dash-hbbtv")) {
                               dash_hbbtv_url = videoReferences[i].url
                           } else if (!other_url && videoReferences[i].url.match(/\.mpd/))
                               other_url = videoReferences[i].url
		       }
                       if (dash_hbbtv_url)
                           video_urls.push(dash_hbbtv_url)
                       if (hls_url)
                           video_urls.push(hls_url)
                       if (other_url)
                           video_urls.push(other_url)
                       alert("video_urls:" + video_urls);
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
                       Svt.play_args = {urls:video_urls, srt_url:srtUrl, extra:extra};
                       Svt.playUrl();
                   }
               })
};

Svt.playUrl = function() {
    if (Svt.play_args.urls[0].match(/\.(m3u8|mpd)/)) {
	Resolution.getCorrectStream(Svt.play_args.urls[0],
                                    Svt.play_args.srt_url,
                                    Svt.play_args.extra
                                   );
    } else{
        Svt.play_args.extra.cb = function() {Player.playVideo()};
	Player.setVideoURL(Svt.play_args.urls[0],
                           Svt.play_args.urls[0],
                           Svt.play_args.srt_url,
                           Svt.play_args.extra
                          );
	// Player.stopCallback();

	// 	url = url + '?type=embed';
	// 	Log(url);
	// 	widgetAPI.runSearchWidget('29_fullbrowser', url);
	// //	$('#outer').css("display", "none");
	// //	$('.video-wrapper').css("display", "none");

	// //	$('.video-footer').css("display", "none");

	// //	$('#flash-content').css("display", "block");
	// //	$('#iframe').attr('src', url);
    }
};

Svt.tryAltPlayUrl = function(failedUrl, cb)
{
    if (Svt.play_args.urls[0].match(/[?&]alt=/)) {
        Svt.play_args.urls[0] = Svt.play_args.urls[0].match(/[?&]alt=([^|]+)/)[1];
        Svt.play_args.urls[0] = decodeURIComponent(Svt.play_args.urls[0])
        if (Svt.play_args.urls[0].match(/^[^?]+&/))
            Svt.play_args.urls[0] = Svt.play_args.urls[0].replace(/&/,"?");
    } else {
        Svt.play_args.urls.shift();
    }

    if (Svt.play_args.urls.length > 0) {
        Svt.play_args.extra.cb = cb
        Svt.playUrl();
        return true
    }
    else
        return false
};

Svt.decodeJson = function(data) {
    if (data.responseText) {
        if (data.responseText[0] != "{") {
            data = data.responseText.split("root\['__svtplay']")
            if (data.length > 1 && !data[1].match(/"stores":{}/)) {
                data = data[1]
            } else {
                data = data.join("").split("root\['__reduxStore']")[1]
            }
            data = data.split('};')[0] + '}'
            data = data.replace(/^[^{]*{/, "{");
            data = data.replace(/;$/, "");
        } else
            data = data.responseText;
    }
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
            Link = Svt.makeLink(data[k]);
            Description = data[k].description;
            ImgLink = Svt.getThumb(data[k]);
            Background = Svt.getThumb(data[k], "extralarge");
            if (Svt.isPlayable(Link)) {
                recommendedLinks.push(Link.replace(/.+d=([0-9]+).*/, "$1"));
                LinkPrefix = '<a href="details.html?ilink=';
            } else {
                LinkPrefix = makeShowLinkPrefix();
                if (Link.match(/\?cluster=/)) {
                    LinkPrefix = makeCategoryLinkPrefix();
                    Link = fixCategoryLink(Name,
                                           Svt.getThumb(ImgLink, "large"),
                                           Link
                                          )
                } else {
                    // Can show and episodes share ID?
                    recommendedLinks.push(Link.replace(/.+d=([0-9]+).*/, "$1"));
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
    } else if (Svt.category_details.length == 0)
        return null
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
            if (!IgnoreEpisodes) {
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
            if (data[k].contentUrl && data[k].contentType != "titel") {
                if (extra.variant) {
                    Link = null;
                    // Find correct variant
                    for (var i=0; i < data[k].versions.length; i++) {
                        if (data[k].versions[i].accessService == extra.variant) {
                            Link = Svt.makeEpisodeLink(data[k].versions[i]);
                            break;
                        }
                    }
                    if (!Link) continue;
                } else {
                    Link = Svt.makeEpisodeLink(data[k]);
                }
            }
            else if (data[k].urlPart) {
                Link = data[k].urlPart
                if (!Link.match(/^\//))
                    Link = Svt.makeGenreLink(Link);
                Link = Svt.fixLink(Link); // This will not work?
            } else if (data[k].url)
                Link = Svt.makeEpisodeLink(data[k]); // Is this ok? I.e. perhaps not Episodes?
            else if (data[k].slug)
                Link = Svt.makeGenreLink(data[k].slug)
            else
                Link = Svt.makeShowLink(data[k])

            if (extra.recommended_links) {
                if (extra.recommended_links.indexOf(Link.replace(/.+d=([0-9]+).*/, "$1")) != -1) {
                    alert(Name + " found in recommended_links")
                    continue;
                }
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
            else if (data[k].urlPart || Link.match(/\?cluster=/)) {
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
    return a.link.match(/\/klipp\/|articleId=[0-9]+&id=/)
}
