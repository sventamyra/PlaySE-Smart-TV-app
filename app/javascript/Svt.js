// https://www.svtstatic.se/image/small/224/24061018/1571995297

// /Start
// https://api.svt.se/contento/graphql?ua=svtplaywebb-play-render-prod-client&operationName=StartPage&variables={}&extensions={"persistedQuery":{"version":1,"sha256Hash":"ed75c27d9ea5c3319ed4fb88f483e3abbf156361cffccd2c1ec271dc70ce08d9"}}

var SVT_API_BASE = "https://api.svt.se/contento/graphql?ua=svtplaywebb-play-render-prod-client&operationName=";
var SVT_OLD_API_BASE = "https://www.svtplay.se/api/"
var SVT_ALT_API_URL = "http://www.svt.se/videoplayer-api/video/"

var Svt =
{
    sections:[],
    section_max_index:0,
    category_details:[],
    category_detail_max_index:0,
    thumbs_index:null,
    play_args:{},
    live_url:SVT_OLD_API_BASE + "live?includeEnded=true"
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

Svt.oldFixLink = function (Link, Publication)
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

Svt.makeApiLink = function(Operation, variables, sha) {
    var Link = addUrlParam(SVT_API_BASE + Operation,
                           "variables",
                           variables
                          );
    return addUrlParam(Link,
                       "extensions",
                       '{"persistedQuery":{"version":1,"sha256Hash":"' + sha + '"}}'
                      );
}

Svt.makeGenreLink = function (data)
{
    return Svt.makeApiLink("GenreProgramsAO",
                           '{"genre":["' + data.id + '"]}',
                           "189b3613ec93e869feace9a379cca47d8b68b97b3f53c04163769dcffa509318"
                          );
}

Svt.makeShowLink = function (data)
{
    var Link = data.slug;
    if (!Link && data.contentUrl)
        Link = data.contentUrl.match(/video\/[0-9]+\/([^\/]+)/)[1];
    else if (!Link && data.urls)
        Link = data.urls.svtplay.replace(/^\//, "")

    return Svt.makeApiLink("TitlePage",
                           '{"titleSlugs":["' + Link + '"]}',
                           "4122efcb63970216e0cfb8abb25b74d1ba2bb7e780f438bbee19d92230d491c5"
                          );
};

Svt.makeSearchLink = function (query) {
    return Svt.makeApiLink("SearchPage",
                           '{"querystring":["' + query + '"]}',
                           "bed799b6f3105046779adff02a29028c1847782da4b171e9fe1bcc48622a342d"
                          );
}

Svt.makeEpisodeLink = function (data)
{
    var ArticleId = data.articleId ?
        data.articleId :
        data.urls.svtplay.match(/\/video\/([0-9]+)/)[1];

    return Svt.makeApiLink("VideoPage",
                           '{"legacyIds":[' + ArticleId + ']}',
                           "ae75c500d4f6f8743f6673f8ade2f8af89fb019d4b23f464ad84658734838c78"
                          );
}

Svt.fixOldShowLink = function(url)
{
    var data = httpRequest(url.replace(/\/\/.+\/([^\/]+$)/, "//www.svtplay.se/api/title?slug=$1"),
                           {sync:true}).data;
    return Svt.makeShowLink(JSON.parse(data))
};

Svt.oldMakeEpisodeLink = function (data)
{
    var Slug = Svt.getGenre(data);
    if (Slug)
        return Svt.makeGenreLink(Slug);

    if (data.titleType && data.titleType=="CLIP" && data.titleArticleId)
        return Svt.makeClipLink(data);

    var Id = data.articleId;
    if (!Id && data.url)
        Id = data.url.replace(/^.+\/([0-9]+)\/.+/, "$1");
    if (!Id && data.contentUrl && data.contentUrl.match(/\/video\/([0-9]+)/))
        Id = data.contentUrl.match(/\/video\/([0-9]+)/)[1];
    if (!Id && data.versions && data.versions.length > 0)
        Id = data.versions[0].articleId;
    if (Id && data.id)
        return Svt.oldFixLink(SVT_OLD_API_BASE + "episodes?ids=" + data.id + "&articleId=" + Id);
        // return Svt.oldFixLink(SVT_OLD_API_BASE + "episode?id=" + Id);
    else
        return Svt.oldFixLink(data.contentUrl);
}

Svt.makeClipLink = function (data)
{
    return Svt.oldFixLink(SVT_OLD_API_BASE + "title_clips_by_title_article_id?articleId=" + data.titleArticleId + "&id=" + data.id)
}

Svt.makeLink = function (data)
{
    var Slug = Svt.getGenre(data);
    if (Slug)
        return Svt.makeGenreLink(Slug);

    if (data.type == "EPISODE")
        return Svt.oldMakeEpisodeLink(data);

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

    if (data.images) {
        for (var key in data.images) {
            if (key.match(/wide$/)) {
                data.image = data.images[key]
                break;
            }
        }
    } else if (data.item) {
        return Svt.getThumb(data.item, size);
    }

    data = data.image;

    if (!data) return null;
    if (size == "extralarge")
        size = "wide/" + Math.round(BACKGROUND_THUMB_FACTOR*THUMB_WIDTH);
    else if (size == "large")
        size = "wide/" + Math.round(DETAILS_THUMB_FACTOR*THUMB_WIDTH);
    else {
        // size = "small/" + THUMB_WIDTH;
        // Seems 224 is standard and faster...
        size = "small/" + 224;
    }
    return "https://www.svtstatic.se/image/" + size + "/" + data.id + "/" + data.changed;
}

Svt.oldGetThumb = function(data, size) {
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
    Thumb = Svt.oldFixLink(Thumb, data.publication).replace("_imax", "");
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
    return url.match(/\/video\//) || url.match(/VideoPage/) || Svt.IsClip({link:url});
}

Svt.addSections = function(data) {
    Svt.sections = [];
    data = data.startPage.content
    var name, url;
    for (var key in data) {
        if (key.match(/Url$/)) {
            if  (key.match(/live/i)) {
                Svt.live_url = Svt.oldFixLink(data[key])
            } else {
                name = key.replace(/Url$/, "Header");
                if (key.match(/popu/i)) {
                    Svt.sections.unshift({name:data[name], url:Svt.oldFixLink(data[key])})
                } else {
                    Svt.sections.push({name:data[name], url:Svt.oldFixLink(data[key])})
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
    if (streamUrl.match("Barnkanalen"))
        return streamUrl.replace("Barnkanalen", "svtbarn");
    // else if (streamUrl.match(/www.svtplay.se\/[^\/]+$/))
    //     return Svt.getDetailsUrl(Svt.fixOldShowLink(streamUrl))
    // return Svt.oldFixLink(streamUrl.replace(/title_episodes_by_article_id/, "title_by_article_id"));
    return streamUrl
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
                if (data.schedule[i].channel == data.activeChannelId.toLowerCase()) {
                    data = data.schedule[i];
                    break;
                }
            }
            Name = data.channelName.trim() + " - " + data.programmeTitle.trim();
            if (data.description)
	        Description = data.description.trim();
            ImgLink = Svt.oldGetThumb(data, "large")
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
            data = JSON.parse(data.responseText).data.listablesByEscenicId[0];
            ImgLink = Svt.getThumb(data, "large");
            if (data.parent && data.parent.__typename != "Single") {
                Show = {name : data.parent.name,
                        url  : Svt.makeShowLink(data.parent),
                        thumb: Svt.getThumb(data.parent)
                       }
            } else if (data.genres && data.genres.length > 0) {
                Show = data.genres[0];
                for (var genre in data.genres) {
                    if (data.genres[genre].type == "Main")
                        continue;
                    Show = data.genres[genre];
                    break;
                }
                Show = {name        : Show.name,
                        url         : Svt.makeGenreLink(Show),
                        thumb       : Svt.getThumb(data, "small"),
                        large_thumb : ImgLink,
                        is_category : true
                       }
            }
            Season = Svt.getSeasonNumber(data);
            Episode = Svt.getEpisodeNumber(data);;
            EpisodeName = data.name,
            Variant = data.accessibilities
            if (Variant && Variant[0] != "Default")
                Variant = Variant[0];
            else
                Variant = null
            Name = data.name;
            if (Show && Show.name != Name)
                Name = Show.name + " - " + Name;
            if (data.longDescription)
                Description = data.longDescription;
            Title = Name;
            AirDate = Svt.getAirDate(data);
            VideoLength = data.duration
            startTime = AirDate;
            if (data.validTo)
                endTime = timeToDate(data.validTo);
            if (!VideoLength && startTime && endTime) {
                VideoLength = Math.round((endTime-startTime)/1000);
            }
            isLive = data.live && (endTime > getCurrentDate());
            if (isLive) {
                NotAvailable = (getCurrentDate() < startTime);
            } else if (data.validTo) {
		AvailDate = timeToDate(data.validTo)
                var hoursLeft = Math.floor((AvailDate-getCurrentDate())/1000/3600);
                AvailDate = dateToHuman(AvailDate);
                if (hoursLeft > 24)
                    AvailDate = AvailDate + " (" + Math.floor(hoursLeft/24) + " dagar kvar)"
                else
                    AvailDate = AvailDate + " (" + hoursLeft + " timmar kvar)"
            }
        }
        VideoLength = dataLengthToVideoLength(null,VideoLength)
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
        data = JSON.parse(data.responseText).data;
        if (data.listablesByEscenicId)
            data = data.listablesByEscenicId[0];
        else
            data = data.listablesBySlug[0];

        if (url.match(/title_clips_by_title_article_id/)) {
            data = data[0];
            Name = "Klipp";
        } else
            Name = data.name.trim();

        ImgLink = Svt.getThumb(data, "large");
	Description = data.shortDescription;
        if (Description && data.longDescription.indexOf(Description) == -1)
            Description = "<p>" + Description + "</p>" + data.longDescription;
        else
            Description = data.longDescription;
        Genre = [];
        for (var i=0; i < data.genres.length; i++) {
            Genre.push(data.genres[i].name);
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
        return "https://www.svtplay.se";

    case "section":
        return Svt.getSectionUrl(extra.location);

    case "categories":
        return Svt.getCategoryUrl();

    case "categoryDetail":
        return Svt.getCategoryDetailsUrl(extra.location);

    case "live":
        return "https://api.svt.se/program-guide/programs?channel=svt1,svt2,svt24,svtb,svtk&includePartiallyOverlapping=true&from=" + getCurrentDate().toISOString()+ "&to=" + getCurrentDate().toISOString();

    case "searchList":
        return Svt.makeSearchLink(extra.query);

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
        return Svt.makeApiLink("MainGenres",
                               '{}',
                               "66fea23f05ac32bbb67e32dbd7b9ab932692b644b90fdbb651bc039f43e387ff"
                              );
    case 1:
        return Svt.makeApiLink("AllGenres",
                               '{}',
                               "6bef51146d05b427fba78f326453127f7601188e46038c9a5c7b9c2649d4719c"
                              );
    case 2:
        return Svt.makeApiLink("ProgramsListing",
                               '{}',
                               "1eeb0fb08078393c17658c1a22e7eea3fbaa34bd2667cec91bbc4db8d778580f"
                              );
    }
};

Svt.getCategoryDetailsUrl = function(location) {
    var DetailIndex = Svt.getCategoryDetailIndex();
    switch (DetailIndex.current) {
    case 0:
        return location;

    default:
        if (DetailIndex.current > Svt.category_detail_max_index)
            return Svt.category_details[0].url // Lets sort it when response is received.
        return Svt.category_details[DetailIndex.current].url
    }
};

Svt.upgradeUrl = function(url) {
    // alert("UpgradeUrl:" + url)
    if (url.match(/\/genre\//))
        return Svt.makeGenreLink({id:url.replace(/.*\/genre\//,"")});
    else if (url.match(/cluster_titles_and_episodes\?cluster=([^?&]+)/))
        return Svt.makeGenreLink({id:url.match(/cluster_titles_and_episodes\?cluster=([^?&]+)/)[1]});
    else if (url.match(/title_episodes_by_article_id\?articleId=([0-9]+)/)) {
        var ArticleId = url.match(/title_episodes_by_article_id\?articleId=([0-9]+)/)[1]
        // EpisodeLink for Show Id....
        return Svt.makeEpisodeLink({articleId:ArticleId});
    }
    else if (url.match(/www.svtplay.se\/([^\/]+)$/))
        return Svt.makeShowLink({slug:url.match(/www.svtplay.se\/([^\/]+)$/)[1]});
    return url
}

Svt.decodeMain = function(data, extra) {

    Svt.sections = [];
    Svt.sections.push({name:"Populärt", url:SVT_OLD_API_BASE + "popular?pageSize=50"});
    Svt.sections.push({name:"Senaste", url:SVT_OLD_API_BASE + "latest?pageSize=50"});
    Svt.sections.push({name:"Sista Chansen", url:SVT_OLD_API_BASE + "last_chance?pageSize=50"});

    Svt.section_max_index = Svt.sections.length-1;
    $("#a-button").text(Svt.getNextSectionText());

    // var recommendedLinks = Svt.decodeRecommended(data, {add_sections:true, json:true});

    var RecommendedData = data.responseText;
    data = null;
    requestUrl(Svt.sections[0].url,
               function(status, data)
               {
                   extra.recommended_links = Svt.decodeXmlRecommended(RecommendedData)
                   extra.cbComplete = null;
                   Svt.decodeSection(data, extra);
               },
               {callLoadFinished:true,
                refresh:extra.refresh
               }
              );
};

Svt.decodeSection = function(data, extra) {

    data = JSON.parse(data.responseText).data;
    Svt.oldDecode(data, extra);
    // Svt.oldDecode(Svt.decodeJson(data).gridPage.content, extra.recommended_links);
    // data = Svt.decodeJson(data);
    // if (data.gridPage)
    //     Svt.oldDecode(data.gridPage.content, extra);
    // else
    //     Svt.oldDecode(data.VideoTitlePageStore.data.videosInSameCategory.videoItems);

    if (extra.cbComplete)
        extra.cbComplete();
};

Svt.decodeCategories = function (data, extra) {

    try {
        var Name;
        var Link;
        var ImgLink = null;
        var Index = Svt.getCategoryIndex().current;

        data = JSON.parse(data.responseText).data
        switch (Index) {
        case 0:
        case 1:
            if (Index == 0)
                data = data.genres;
            else
                data = data.genresSortedByName.genres;

            data.sort(function(a, b) {
                if (b.name.toLowerCase() > a.name.toLowerCase())
                    return -1
                return 1
            });
            for (var k=0; k < data.length; k++) {
                categoryToHtml(data[k].name,
                               Svt.getThumb(data[k]),
                               Svt.getThumb(data[k], "large"),
                               Svt.makeGenreLink(data[k])
                              )
            };
            break;

        case 2:
            data = data.programAtillO.flat;
            data.sort(function(a, b) {
                if (b.name.toLowerCase() > a.name.toLowerCase())
                    return -1
                return 1
            })
            ImgLink = null;
            for (var k=0; k < data.length; k++) {
                Name = data[k].name;
                if (data[k].urls.svtplay.match(/\/video\//)) {
                    toHtml({name: Name,
                            link: Svt.makeEpisodeLink(data[k]),
                            link_prefix: '<a href="details.html?ilink=',
                           });
                } else {
                    Link = Svt.makeShowLink(data[k]);
                    showToHtml(Name, ImgLink, Link);
                }
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

    var Name = getUrlParam(getLocation(extra.refresh), "catName");
    var Slug = decodeURIComponent(getLocation(extra.refresh)).match(/(genre|cluster)"[^"]+"([^"]+)/)[2];
    var TabsUrl = Svt.makeApiLink("GenreLists",
                                  '{"genre":["' + Slug + '"]}',
                                  "90dca0b51b57904ccc59a418332e43e17db21c93a2346d1c73e05583a9aa598c"
                                 );
    var DetailIndex = Svt.getCategoryDetailIndex();
    var DecodeAndComplete = function(data, extra) {
        Svt.decode(data, extra);
        if (extra.cbComplete)
            extra.cbComplete()
    };

    switch (DetailIndex.current) {
    case 0:
        var data = JSON.parse(data.responseText).data.genres[0].selectionsForWeb[0].items;
        // Initiate Tabs before decoding Category Details.
        requestUrl(TabsUrl,
                   function(status, tabs_data)
                   {
                       Svt.decodeCategoryTabs(Name, Slug, tabs_data, TabsUrl);
                       DecodeAndComplete(data, extra);
                   }
                  );
        break;

    default :
        var Current = Svt.category_details[DetailIndex.current];
        if (!Current || Slug != Current.slug) {
            // Wrong Category - must re-initiate Tabs data.
            return requestUrl(TabsUrl, function(status,data) {
                Svt.decodeCategoryTabs(Name, Slug, data, TabsUrl);
                // Now re-fetch current index
                extra.url = Svt.category_details[DetailIndex.current].url;
                requestUrl(extra.url, function(status,data) {
                    Svt.decodeCategoryDetail(data,extra)
                })
            })
        }
        // Find items matching current Tab
        data = JSON.parse(data.responseText).data.genres[0]
        if (data.relatedGenres)
            data = data.relatedGenres
        else {
            data = data.selectionsForWeb;
            for (var k=0; k < data.length; k++) {
                if (Current.id == data[k].id) {
                    data = data[k].items;
                    break
                }
            };
        }
        if (Current.recommended) {
            // Fetch recommended and merge with Popular
            requestUrl(Svt.makeApiLink("GenrePage",
                                       '{"cluster":["' + Slug + '"]}',
                                       "5127949eadc41dd7f7c5474dcfc26c2ab6ea0fb10e17c7cd9885df3576759825"
                                      ),
                       function(status, recommended_data)
                       {
                           recommended_data = JSON.parse(recommended_data.responseText).data.genres[0].selectionsForWeb[0].items.slice(0,10);
                           extra.recommended_links = Svt.decodeRecommended(recommended_data)
                           DecodeAndComplete(data, extra);
                       });
        } else {
            DecodeAndComplete(data, extra)
        }
    }
};

Svt.decodeCategoryTabs = function (name, slug, data, url) {
    data = JSON.parse(data.responseText).data.genres[0].selectionsForWeb;
    Svt.category_details = [];
    Svt.category_detail_max_index = 0;
    // Add main view
    Svt.category_details.push({name:name, section:"none", slug:slug, url:url})
    var recommended;
    for (var k=0; k < data.length; k++) {
        if (data[k].items.length > 0) {
            recommended = data[k].id.match(/popular/);
            if (recommended)
                data[k].name = "Rekommenderat";
            Svt.category_details.push({name:name + " - " + data[k].name,
                                       slug:slug,
                                       section: data[k].name,
                                       id: data[k].id,
                                       url: url,
                                       recommended:recommended
                                      })
        }
    }
    // Add Related
    if (Svt.category_details.length > 1)
        Svt.category_details.push({name:name + " - Relaterat",
                                   slug:slug,
                                   section: "Relaterat",
                                   url: Svt.makeApiLink("RelatedGenres",
                                                        '{"genre":["' + slug + '"]}',
                                                        "1f49eadb4c7ebd51b66e8975fe24c6eab892c2f57b9154a3760978f239c30534"
                                                       )
                                  });

    Svt.category_detail_max_index = Svt.category_details.length-1;
    Language.fixBButton();
};

Svt.decodeLive = function(data, extra) {
    var ChannelsData = JSON.parse(data.responseText);
    data = null;
    extra.url = Svt.live_url; 
    requestUrl(extra.url,
               function(status, data)
               {
                   Svt.decodeChannels(ChannelsData)
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

    if (!extra.url.match(/\/graphql/)) {
        Log("OLD API:" + extra.url);
        extra.url = Svt.fixOldShowLink(extra.url);
        return requestUrl(extra.url, function(status,data) {
            Svt.decodeShowList(data,extra)
        });
    }

    data = JSON.parse(data.responseText).data;
    if (data.listablesByEscenicId)
        data = data.listablesByEscenicId[0];
    else
        data = data.listablesBySlug[0];

    var showThumb = Svt.getThumb(data);
    var seasons = [];
    // var clipsUrl = extra.url.replace("episodes_by_article", "clips_by_title_article"); 
    var hasClips = false;
    var hasZeroSeason = false
    var showName;

    showName = data.name;
    data = data.associatedContent;
    if (!extra.is_clips && !extra.season && !extra.variant) {
        // hasClips = (JSON.parse(httpRequest(clipsUrl, {sync:true}).data)).length > 0;
        for (var i=0; i < data.length; i++) {
            if (data[i].type == "Season" && seasons.indexOf(data[i].name) == -1) {
                seasons.push(data[i].name);
            } else if (data[i].id == "clips") {
                hasClips = true;
            }
            // } else if (data[i].season == 0) {
            //     hasZeroSeason = true;
            // }
        }

        if (seasons.length > 1 || hasZeroSeason) {
            seasons.sort(function(a, b){
                a = +a.replace(/[^0-9]+/g,"");
                b = +b.replace(/[^0-9]+/g,"");
                return b-a
            });
            for (var i=0; i < seasons.length; i++) {
                seasonToHtml(seasons[i],
                             showThumb,
                             extra.url,
                             +seasons[i].replace(/[^0-9]+/g,"")
                            )
            };
        } else if (extra.season!=0 && seasons.length == 1) {
            return callTheOnlySeason(seasons[0], extra.url, extra.loc);
        }
    }

    // Filter episodes belonging to correct season.
    // if (hasZeroSeason || extra.season) {
    //     var Season = (extra.season) ? extra.season : 0;
    //     data.filtered = [];
    //     for (var i=0; i < data.length; i++) {
    //         if (data[i].season == Season)
    //             data.filtered.push(data[i])
    //     }
    //     data = data.filtered;
    // }

    if (extra.season===0 | extra.season || extra.is_clips || seasons.length < 2) {

        for (var i=0; i < data.length; i++) {
            if (extra.is_clips && data[i].id=="clips") {
                data = data[i].items;
                break
            } else if (extra.season == +data[i].name.replace(/[^0-9]+/g,"") ||
                       (extra.season===0 && data[i].type == "Season")) {
                extra.season = +data[i].name.replace(/[^0-9]+/g,"");
                data = data[i].items;
                break
            }
        }
        extra.strip_show = true;
        extra.show_thumb = showThumb;
        extra.show_name = showName;
        Svt.decode(data, extra);
    }

    if (hasClips)
        clipToHtml(showThumb, extra.url)

    if (extra.cbComplete)
        extra.cbComplete();
}

Svt.decodeSearchList = function (data, extra) {
    try {
        var Genres = [];
        var Shows = [];
        var Episodes = [];
        data = JSON.parse(data.responseText).data.search;
        // Group hits
        for (var k=0; k < data.length; k++) {
            switch (data[k].item.__typename) {
            case "Genre":
                Genres.push(data[k]);
                break;

            case "TvSeries":
            case "TvShow":
            case "KidsTvShow":
                Shows.push(data[k]);
                break;

            default:
                Episodes.push(data[k]);
            }
        }
        Svt.decode(Genres);
        Svt.decode(Shows);
        Svt.decode(Episodes);
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
                       } else if (streamUrl==url && !streamUrl.match(SVT_ALT_API_URL)) {
                           data = JSON.parse(data.responseText).data.listablesByEscenicId[0];
                           streamUrl = SVT_ALT_API_URL + data.videoSvtId;
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
};

Svt.decodeXmlRecommended = function(data) {
    var recommendedLinks = [];
    try {
        var Name;
        var Link;
        var LinkPrefix;
        var Description;
        var ImgLink;
        var IsLive;

        data = data.split('<section');
        data.shift();
        data = "<section" + data.join("");
        data = data.split('</section')[0] + "</section>";

        data = data.split("</article>");
        data.pop();
        for (var k=0; k < data.length; k++) {
            data[k] = "<article" + data[k].split("<article")[1];
	    Name = $(data[k]).find('.play_display-window__title').text().trim();
            Name = Name + " - " + $(data[k]).find('.play_display-window__prefix').text().trim();
            Name = Name.replace(/Live just nu /, "").trim();
            Description = $(data[k]).find('[class^="play_display-window__text-"]').text(),
            ImgLink = Svt.oldFixLink($(data[k]).find('img').attr('src'));
            Link = data[k].match(/href="([^#][^#"]+)"/)[1]
            Link = (Link.match(/\/video\//))
                ? Svt.makeEpisodeLink({urls:{svtplay:Link}})
                : Svt.makeShowLink({contentUrl:Link});
            if (Svt.isPlayable(Link)) {
                recommendedLinks.push(Link.replace(/.+d=([0-9]+).*/, "$1"));
                LinkPrefix = '<a href="details.html?ilink=';
            } else {
                LinkPrefix = '<a href="showList.html?name=';
            }
            IsLive = data[k].match('play_display-window__live');
            toHtml({name:Name,
                    is_live:IsLive,
                    is_running:IsLive,
                    link:Link,
                    link_prefix:LinkPrefix,
                    description:Description.trim(),
                    thumb:ImgLink
                   })
            data[k] = "";
	};
    } catch(err) {
        Log("decodeXmlRecommended Exception:" + err.message + " data[" + k + "]:" + data[k]);
    }
    return recommendedLinks
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
    return Svt.oldFixLink("/assets/images/channels/posters/" + Name.toLowerCase().replace(" ","") + ".png");
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
        var FoundChannels = [];

        data = data.hits;
        data.sort(function(a, b) {
                if (b.channel.toLowerCase() > a.channel.toLowerCase())
                    return -1
                return 1
            })
        for (var k in data) {
            Name = data[k].channel.trim();
            if (FoundChannels.indexOf(Name) != -1)
                continue;
            FoundChannels.push(Name);
            if (Name == "SVTB")
                Name = "Barnkanalen";
            else if (Name == "SVTK")
                Name = "Kunskapskanalen"
            Link = BaseUrl + '/' + Name;
            ImgLink = Svt.GetChannelThumb(Name);
            Background = Svt.oldGetThumb(data[k], "extralarge");
            if (!Background)
                Background = Svt.oldGetThumb(ImgLink, "extralarge");
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

Svt.decodeRecommended = function (data, extra) {
    if (!extra)
        extra = {};
    extra.is_recommended = true;
    return Svt.decode(data, extra);
}

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
        var Links = [];

        if (!extra)
            extra = {};
        Show = extra.show_name;
        // if (extra.strip_show) {
        //     var Episodes = [];
        //     for (var k=0; k < data.length; k++) {
        //         if (data[k].episodeNumber >= 1) {
        //             if (Episodes[data[k].episodeNumber]) {
        //                 Episodes[data[k].episodeNumber]++
        //             } else {
        //                 Episodes[data[k].episodeNumber] = 1;
        //             }
        //         } else {
        //             IgnoreEpisodes = true
        //         }
        //     }
        //     if (!IgnoreEpisodes) {
        //         for (var k=0; k < Episodes.length; k++) {
        //             if (Episodes[k] > 1) {
        //                 IgnoreEpisodes = true
        //                 break;
        //             }
        //         }
        //     }
        // }
        for (var k=0; k < data.length; k++) {
            Name = Svt.getItemName(data[k]);
            ImgLink = Svt.getThumb(data[k]);
            Episode = Svt.getEpisodeNumber(data[k]);
            Season  = extra.season || Svt.getSeasonNumber(data[k]);
            Description = data[k].subHeading;
            // alert("Season: " + Season + " Episode: " +Episode);
            if (data[k].item)
                data[k] = data[k].item;
            Description = data[k].longDescription || Description;
            Duration = data[k].duration;
            Background = Svt.getThumb(data[k], "extralarge");
            IsLive = data[k].live;
            starttime = (IsLive) ? Svt.getAirDate(data[k]) : null;
            IsRunning = IsLive && (getCurrentDate() > startTime);
            if (extra.strip_show && !IgnoreEpisodes) {
                if (!Name.match(/(avsnitt|del)\s*([0-9]+)/i) && Episode) {
                    Description = Name.replace(SEASON_REGEXP, "$4")
                    Name = Name.replace(SEASON_REGEXP, "$1Avsnitt " + Episode);
                } else {
                    Description = "";
                }
            }

            if (!extra.strip_show) {
                Show = data[k].parent && data[k].parent.name;
                if (!Show || !Show.length) Show = null;
                if (Show || !Name.match(/(avsnitt|del)/i,"")) {
                    if (Episode || Season) 
                        Description = "";
                    if (Episode)
                        Description = "Avsnitt " + Episode;
                    if (Season && Episode)
                        Description = "Säsong " + Season + " - " + Description;
                    else if (Season)
                        Description = "Säsong " + Season
                    if (Show) {
                        Name = Name.replace(/^(((avsnitt|del) [0-9]+)|[0-9.]+\.)/i,"");
                        if (Name.length && !Name.match(new RegExp(Show, 'i')))
                            Name = Show + " - " + Name;
                        else if (!Name.length)
                            Name = Show;
                    }
                }
            } else
                Names.push(Name);

            // if (data[k].contentUrl && data[k].contentType != "titel") {
            LinkPrefix = '<a href="details.html?ilink=';
            if (extra.variant) {
                Link = null;
                // Find correct variant
                for (var i=0; i < data[k].variants.length; i++) {
                    if (data[k].variants[i].accessibility == extra.variant) {
                        Link = Svt.makeEpisodeLink(data[k].variants[i]);
                        break;
                    }
                }
                if (!Link) continue;
            } else if (data[k].variants) {
                Link = Svt.makeEpisodeLink(data[k].variants[0]);
            } else if (extra.is_clips) {
                Link = Svt.makeEpisodeLink({articleId:data[k].id});
            } else if (data[k].__typename == "Single" ||
                       data[k].__typename == "Episode"
                      ) {
                Link = Svt.makeEpisodeLink(data[k]);
            } else if (data[k].__typename == "Genre") {
                Link = fixCategoryLink(Name, ImgLink, Svt.makeGenreLink(data[k]))
                LinkPrefix = makeCategoryLinkPrefix();
            } else {
                Link = Svt.makeShowLink(data[k]);
                LinkPrefix = makeShowLinkPrefix()
            }
            // } else if (data[k].urlPart) {
            //     Link = data[k].urlPart
            //     if (!Link.match(/^\//))
            //         Link = Svt.makeGenreLink(Link);
            //     Link = Svt.oldFixLink(Link); // This will not work?
            // } else if (data[k].url)
            //     Link = Svt.oldMakeEpisodeLink(data[k]); // Is this ok? I.e. perhaps not Episodes?
            // else if (data[k].slug)
            //     Link = Svt.makeGenreLink(data[k].slug)
            // else
            //     Link = Svt.makeShowLink(data[k])

            if (extra.recommended_links) {
                if (extra.recommended_links.indexOf(Link) != -1) {
                    alert(Name + " found in recommended_links")
                    continue;
                }
            }

            for (var i=0; !extra.variant && data[k].accessibilities && i < data[k].accessibilities.length; i++) {
                if (Variants.indexOf(data[k].accessibilities[i]) == -1)
                    Variants.push(data[k].accessibilities[i]);
            }
            // if (data[k].versions &&
            //     data[k].versions.length &&
            //     data[k].versions[0].accessService &&
            //     Variants.indexOf(data[k].versions[0].accessService) != -1
            //    )
            //     continue;

            if (extra.is_recommended)
                Links.push(Link);
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
        return Links;
    } catch(err) {
        Log("Svt.decode Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
};


Svt.oldDecode = function(data, extra) {
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
                            Link = Svt.oldMakeEpisodeLink(data[k].versions[i]);
                            break;
                        }
                    }
                    if (!Link) continue;
                } else if (data[k].versions) {
                    Link = Svt.makeEpisodeLink({urls:{svtplay:data[k].versions[0].contentUrl}});
                } else
                    Link = Svt.oldMakeEpisodeLink(data[k]);
            }
            else if (data[k].urlPart) {
                Link = data[k].urlPart
                if (!Link.match(/^\//))
                    Link = Svt.makeGenreLink(Link);
                Link = Svt.oldFixLink(Link); // This will not work?
            } else if (data[k].url)
                Link = Svt.oldMakeEpisodeLink(data[k]); // Is this ok? I.e. perhaps not Episodes?
            else if (data[k].slug)
                Link = Svt.makeGenreLink(data[k].slug)
            else
                Link = Svt.makeShowLink({slug:data[k].urlFriendlyTitle})

            if (extra.recommended_links) {
                if (extra.recommended_links.indexOf(Link.replace(/.+d=([0-9]+).*/, "$1")) != -1) {
                    alert(Name + " found in recommended_links")
                    continue;
                }
            }
            ImgLink = Svt.oldGetThumb(data[k]);
            Background = Svt.oldGetThumb(data[k], "extralarge");
            IsLive = data[k].live && !data[k].broadcastEnded;
            IsRunning = data[k].broadcastedNow;
            starttime = (IsLive) ? Svt.getAirDate(data[k]) : null;
            if (!IsLive && getCurrentDate() < Svt.getAirDate(data[k]))
                continue;
            LinkPrefix = makeShowLinkPrefix();
            if (Svt.isPlayable(Link)) {
                Duration = (Duration) ? Duration : 0;
                LinkPrefix = '<a href="details.html?ilink=';
            }
            else if (data[k].urlPart || Link.match(/\?cluster=/)) {
                LinkPrefix = makeCategoryLinkPrefix();
                Link = fixCategoryLink(Name,
                                       Svt.oldGetThumb(ImgLink, "large"),
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
        Log("Svt.oldDecode Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
};

Svt.getVariantName = function(accessService) {
    if (accessService.match(/audio.*desc/i))
        return "Syntolkat";
    else if (accessService.match(/^sign/i))
        return "Teckentolkat";
    else if (accessService.match(/caption/i))
        return "Textat";
    else
        return accessService
}

Svt.getSeasonNumber = function(data) {
    var Season = (data.episode &&
                  data.episode.positionInSeason &&
                  data.episode.positionInSeason.match(/[^0-9]*([0-9]+)/)
                 );
    if (Season)
        return +Season[1];
    else if (data.analyticsIdentifiers) {
        Season = data.analyticsIdentifiers.viewId.match(/[^\/]+\/([^\/]+)\//);
        if (Season) {
            Season = Season[1].replace(/[^0-9]/g,"")
            if (Season.length > 0)
                return +Season
        }
    } else if (data.urls && data.urls.svtplay) {
        Season = data.urls.svtplay.match(/sasong-([0-9]+)/);
        if (Season)
            return +Season[1]
    }
    if (data.item)
        return Svt.getSeasonNumber(data.item);
    return null;
}
Svt.getEpisodeNumber = function(data) {
    var Episode, Candidates = [data.slug, data.name, data.heading, data.subHeading];
    for (var i=0; i < Candidates.length; i++) {
        if (Candidates[i]) {
            Episode =
                Candidates[i].match(/.+\-([0-9]+)$/) ||
                Candidates[i].match(/^([0-9]+)\-$/) ||
                Candidates[i].match(/avsnitt\s*([0-9]+)/i) ||
                Candidates[i].match(/^([0-9]+)\./i);
            if (Episode)
                return +Episode[1]
        }
    }
    if (data.urls && data.urls.svtplay) {
        Episode = data.urls.svtplay.match(/(del|avsnitt)-([0-9]+)/);
        if (Episode)
            return  +Episode[2]
    }
    if (data.item)
        return Svt.getEpisodeNumber(data.item)
    return null
};

Svt.getItemName = function(data) {
    Name = data.nameRaw || data.name || data.heading;
    if (!Name && data.item)
        return Svt.getItemName(data.item)
    return Name;
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

Svt.findVersion = function (url, versions) {
    var ArticleId = url.match(/[?&](articleId|id)=([0-9]+)/)[2];

    if (versions && versions.length > 0) {
	for (var i=0; i < versions.length; i++) {
            if (versions[i].articleId == ArticleId) {
                return versions[i]
            }
        }
    }
}
