var DETAILS_THUMB_FACTOR = 600/THUMB_WIDTH;
var OldDplay =
{
    channel_idx:null,
    channels:[],
    all_shows:[],
    all_show_names:[],
    all_genres:[],
    show_names:[],
    show_result:[],
    other_result:[],
    play_args:{}
};

OldDplay.resetSubChannel = function() {
    if (OldDplay.channel_idx) {
        OldDplay.channel_idx = null;
        OldDplay.all_shows = [];
        OldDplay.all_show_names = [];
        OldDplay.all_genres = [];
        OldDplay.reset();
        deleteAllCookies("dsc-geo")
    };
}

OldDplay.isSubChannelSet = function() {
    return OldDplay.channel_idx != null;
}

OldDplay.reset = function() {
    OldDplay.show_names = [];
    OldDplay.show_result = [];
    OldDplay.other_result = [];
}

OldDplay.getUrl = function(tag, extra) {
    
    switch (tag)
    {
    case "main":
        var newChannel = getLocation(extra.refresh).match(/dplay_channel=([0-9]+|reset)/);
        newChannel = (newChannel && newChannel.length > 0) ? newChannel[1] : null;
        if (newChannel && !extra.refresh)
            myHistory = [];
        if (newChannel && OldDplay.channel_idx != newChannel) {
            OldDplay.resetSubChannel();
            if (newChannel != "reset")
                OldDplay.channel_idx = newChannel;
            // Force new channel name
            Header.display(document.title);
        }
        OldDplay.preFetchAllShows();
        return OldDplay.makeApiUrl("/shows/recommended", "&limit=50");
        break;

    case "section":
        switch (extra.location) {

        case "Popular.html":
            return OldDplay.makeApiUrl("/shows/popular", "&limit=50");
            break;

        case "Latest.html":
            return OldDplay.makeApiUrl("/videos/recent", "&sort=sort_date_desc&limit=50");
            break;
        };
        break;

    case "categories":
        if (OldDplay.getCategoryIndex().current==1) {
            if (OldDplay.all_shows.length == 0)
                return OldDplay.getAllShowsUrl();
            else
                return {cached:true};
        } else {
            return OldDplay.makeApiUrl("/genres");
        }
        break;

    case "categoryDetail":
        return {cached:true,url:extra.location};

    case "live":
        return OldDplay.makeApiUrl("/channels");
        break;

    case "searchList":
        if (OldDplay.all_show_names.length == 0)
            return OldDplay.getAllShowsUrl()
        else if (extra.query.length > 1)
            return OldDplay.makeApiUrl('/search', '&query=' + extra.query);
        else
            return {cached:true}
        break;

    // case "live":
    //     return OldDplay.makeApiUrl("/videos/live", "&sort=sort_date_desc&limit=50");

    default:
        return tag;
    };
};

OldDplay.decodeMain = function(data, extra) {
    OldDplay.decode(data, extra);
};

OldDplay.decodeSection = function(data, extra) {
    OldDplay.decode(data, extra);
};

OldDplay.decodeCategories = function(data, extra, allFetched) {

    if (extra.url.cached || !extra.url.match(/\/genres/)) {
        OldDplay.handleAllShows(data, extra);
        data = null;
    } else if (OldDplay.all_shows.length == 0 && !allFetched) {
        // I don't understans JS it seems. Seems reference object is re-used
        // somehow. I.e. when callback is invoked data contains the data
        // received in getAllShowsUrl...
        var responseText = data.responseText;
        return OldDplay.getAllShows(function(){OldDplay.decodeCategories({responseText:responseText}, extra, true)}, null, true);
        data = null;
    } else {
        try {
            var genres = [];
            data = JSON.parse(data.responseText).data;
            for (var k=0; k < data.length; k++) {                   
                if (data[k].name.trim().match(/gratis/i))
                    continue;
                if (OldDplay.all_genres.indexOf(data[k].id) == -1)
                    // No shows
                    continue;
                genres.push({name:data[k].name.trim(), 
                             link:OldDplay.getAllShowsUrl() + "&genres=" + data[k].id
                            });
	    }
            genres.sort(function(a, b) {
                if (a.name.toLowerCase() < b.name.toLowerCase()) {
                    return -1;
                } else {
                    return 1;
                }
            });
	    data = null;

            for (var k=0; k < genres.length; k++)
                categoryToHtml(genres[k].name,
                               null,
                               null,
                               genres[k].link
                              );

            if (extra.cbComplete)
                extra.cbComplete();

        } catch(err) {
            Log("OldDplay.decodeCategories Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
        }
    }
};

OldDplay.decodeCategoryDetail = function(data, extra) {
    OldDplay.getAllShows(extra.cbComplete, extra.url.url);
};

OldDplay.decodeLive = function(data, extra) {

    var oldId = (OldDplay.isSubChannelSet()) ? OldDplay.channels[OldDplay.channel_idx].id : null;
    var Name;
    OldDplay.channels = [];
    data = JSON.parse(data.responseText).data;

    for (var k=0; k < data.length; k++) {
        Name = data[k].title.replace(/.*dplay[	 ]*.[	 ]*([^:]+).*/i, "$1").trim();
        OldDplay.channels.push({name:Name, id:data[k].id});
        if (oldId != null) {
            if (k == 0)
                OldDplay.channelToHtml("Old DPLAY", "reset", null);
            if (oldId == data[k].id) {
                OldDplay.channel_idx = k;
                continue;
            }
        }
        OldDplay.channelToHtml(Name, k, OldDplay.fixThumb(data[k].logo_image));
    }
    if (extra.cbComplete)
        extra.cbComplete();
};

OldDplay.decodeShowList = function(data, extra) {
    OldDplay.decode(data, extra);
}

OldDplay.decodeSearchList = function(data, extra) {
    OldDplay.reset()
    // At least in old OldDplay api Search result for shows also contains "unplayable" shows, 
    // so first fetch all shows and then we filter from that.
    if (OldDplay.all_show_names.length == 0)
    {
        extra.only_save = true;
        OldDplay.handleAllShows(data, extra);
        extra.url = OldDplay.getUrl("searchList", extra),
        requestUrl(extra.url,
                   function(status, data)
                   {
                       OldDplay.decodeSearchList(data, extra)
                       data = null;
                   },
                   {cbError:extra.cbComplete}
                  );
    } else {
        if (extra.query.length > 1) {
            data = JSON.parse(data.responseText).data;
            if (data.shows)
                OldDplay.decodeShows(data.shows, extra);
            if (data.videos)
                OldDplay.decodeSearchHits(data.videos);
            data = null;
            OldDplay.finishSearch(extra.cbComplete)
        } else {
            var queryReqexp = (extra.query && extra.query.length == 1) ? new RegExp("^" + extra.query, 'i') : null;
            OldDplay.show_result = [];
            for (var k=0; k < OldDplay.all_shows.length; k++) {
                if (!queryReqexp.test(OldDplay.all_shows[k].name))
                    continue;
                OldDplay.show_result.push(OldDplay.all_shows[k]);
            }
            OldDplay.finishSearch(extra.cbComplete)
        }
    }
};

// TODO - merge handleAllShows and getAllShows
OldDplay.handleAllShows = function(data, extra) {
    OldDplay.reset();
    if (OldDplay.all_shows.length == 0) {
        extra.all_shows = true;
        var cbComplete = extra.cbComplete
        extra.cbComplete = null
        OldDplay.decode(data, extra);
        extra.cbComplete = cbComplete;
        data = null;
    } else if (!extra.only_save) {
        OldDplay.show_result = OldDplay.all_shows;
        OldDplay.resultToHtml();
        if (extra.cbComplete)
            extra.cbComplete();
    }
};

OldDplay.getAllShows = function(completeFun, url, onlySave) {
    OldDplay.reset();
    if (OldDplay.all_shows.length == 0) {
        url = OldDplay.getAllShowsUrl();
        requestUrl(url,
                   function(status, data)
                   {
                       OldDplay.decode(data, {all_shows:true,url:url,only_save:onlySave});
                       data = null;
                   },
                   {cbComplete:completeFun}
                  );
    } else {
        if (!onlySave) {
            var genre = (url) ? url.match(/genres=([0-9]+)/) : null;
            genre = (genre) ? +genre[1] : null;
            OldDplay.show_result = OldDplay.filterShows(OldDplay.all_shows, genre);
            OldDplay.resultToHtml();
        }
        if (completeFun)
            completeFun();
    }
};

OldDplay.preFetchAllShows = function() {
    if (OldDplay.all_shows.length != 0)
        return
    var extra = {only_save:true,
                 all_shows:true,
                 url      :OldDplay.getAllShowsUrl(),
                }
    httpRequest(extra.url,
                {cb:function(status, text) {
                    OldDplay.handleAllShows({responseText:text}, extra)
                }}
               )
}

OldDplay.getAllShowsUrl = function() {
    return OldDplay.makeApiUrl('/shows');
}

OldDplay.filterShows = function(shows, genre) {
    if (!genre)
        return shows
    var result = [];
    for (var k=0; k < shows.length; k++) {
        if (shows[k].genres.indexOf(genre) > -1)
            result.push(shows[k])
    }
    return result;
}

OldDplay.makeApiUrl = function(path, extra) {
    
    var channel = (OldDplay.channel_idx) ? OldDplay.channels[OldDplay.channel_idx].id : null
    channel = (!path.match(/\/channels/) && channel) ? "&channel_id=" + channel : "";
    extra = (extra) ? extra : "";
    return "http://www.dplay.se/api/v2/content/device" + path + "?appVersion=3.0.0&platform=IPHONE&realm=DPLAYSE&site=SE&embed=reference,show,package,genres,videos,shows,season&package=41&limit=500" + channel + extra;
};

OldDplay.makeShowUrl = function(id) {
    return OldDplay.makeApiUrl('/shows/' + id + '/seasons');
};

OldDplay.getPrefix = function(channel_idx) {
    var Name = channel;
    if (channel_idx)
        Name = OldDplay.channels[channel_idx].prefix;
    return 'http://www.' + Name + 'play.se/'
};

OldDplay.addChannel = function(url) {
    if (OldDplay.isSubChannelSet())
        return url + "&channel=" + OldDplay.channels[OldDplay.channel_idx].id;
    return url;
};

OldDplay.finishSearch = function (completeFun) {
    OldDplay.resultToHtml();
    if (completeFun)
        completeFun();
};

OldDplay.getNextCategory = function() {
    return getNextIndexLocation(1);
};

OldDplay.getCategoryIndex = function () {
    return getIndex(1);
};

OldDplay.getHeaderPrefix = function(MainName) {
    if (MainName || !OldDplay.channel_idx)
        return "OLD DPLAY";
    else {
        return OldDplay.channels[OldDplay.channel_idx].name;
    }
};

OldDplay.keyRed = function() {
    if ($("#a-button").text().indexOf("Re") != -1) {
	setLocation('index.html');
    } else if ($("#a-button").text().indexOf("Pop") != -1) {
	setLocation('Popular.html');
    } else {
	setLocation('Latest.html');
    }
}

OldDplay.keyGreen = function() {
    if ($("#b-button").text().indexOf("ateg") != -1)
	setLocation('categories.html');
    else
        setLocation(OldDplay.getNextCategory())
}

OldDplay.getMainTitle = function () {
    return "Rekommenderat"
}

OldDplay.getSectionTitle = function(location) {
    if (location.match(/Popular.html/))
        return 'Populärt';
    else if (location.match(/Latest.html/))
        return 'Senaste';
}

OldDplay.getCategoryTitle = function() {
    switch (OldDplay.getCategoryIndex().current) {
    case 0:
        return "Kategorier";
    case 1:
        return "Alla Program";
    }
};

OldDplay.getLiveTitle = function() {
    return 'Kanaler';
}

OldDplay.getAButtonText = function(language) {
    var loc = getIndexLocation();
    if (loc.match(/index\.html/)) {
        if(language == 'English'){
	    return 'Latest';
        } else {
	    return 'Senaste';
        }
    } else if (loc.match(/Latest\.html/)) {
        if(language == 'English'){
	    return 'Popular';
        } else {
	    return 'Populärt';
        }
    // } else if (loc.match(/Popular\.html/)) {
    } else {
        if(language == 'English'){
	    return 'Recommended';
        } else {
	    return OldDplay.getMainTitle();
        }
    }
};

OldDplay.getBButtonText = function(language) {
    if (getIndexLocation().match(/categories\.html/)) {
        switch (OldDplay.getCategoryIndex().next) {
        case 0:
            // Use Default
            return null;
        case 1:
            if (language == "Swedish")
                return "Alla Program";
            else
                return "All Shows";
            break;
        }
    } else
        return null
};

OldDplay.getCButtonText = function (language) {
    if(language == 'English')
	return 'Channels';
    else
        return 'Kanaler';
};

OldDplay.decodeSearchHits = function(data) {
    try {
        var Name;
        var Duration;
        var Link;
        var Description;
        var ImgLink;
        var next = null;
        var AirDate;
        var Show = null;
        var Season = null;
        var Episode=null;

        for (var k=0; k < data.length; k++) {

            Name = OldDplay.determineEpisodeName(data[k]);
            if (!OldDplay.isItemOk(Name, data[k]))
                continue;
            if (data[k].widevineRequired) {
                Log("DPLAY DRM??:" + Name)
                continue;
            }
            if (data[k].show) {
                if (OldDplay.show_names.indexOf(data[k].show.title.trim()) != -1)
                    continue;
                Name = data[k].show.title.trim() + " - " + Name;
            }

            Description = data[k].description.trim();
            Duration = (data[k].duration)/1000;
            ImgLink = OldDplay.fixThumb(data[k].thumbnail_image);
            AirDate = data[k].first_run;
            Link = OldDplay.makeApiUrl("/videos/" + data[k].id);
            Show = (data[k].show) ? data[k].show.title.trim() : null;
            Season  = (data[k].season) ? data[k].season.season_number : null;
            Episode = data[k].episode_number
            OldDplay.other_result.push({name:Name, 
                                     show:Show,
                                     season:Season,
                                     episode:Episode,
                                     duration:Duration, 
                                     link:Link,
                                     thumb:ImgLink, 
                                     description:Description,
                                     airDate:AirDate,
                                     isFollowUp:false
                                    }
                                   );
            data[k] = null;
        }
        data = null; 
    } catch(err) {
        Log("OldDplay.decodeSearchHits Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
};

OldDplay.decode = function(data, extra) {
    try {
        var Name;
        var Duration;
        var Link;
        var Description="";
        var ImgLink;
        var next = null;
        var AirDate;
        var Show=null;
        var Season=null;
        var Episode=null;

        OldDplay.reset();
        if (extra.url.match(/\/seasons\?/)) {
            return OldDplay.decodeSeason(extra, data);
        }

        data = JSON.parse(data.responseText);
        if (data.data[0].reference) {
            OldDplay.decodeShows(data.data, extra);
        } else if (data.data[0].type == "show") {
            OldDplay.decodeShows(data.data, extra);
        } else {
            data = data.data;
            for (var k=0; k < data.length; k++) {
                Name = OldDplay.determineEpisodeName(data[k]);
                Show = (data[k].show) ? data[k].show.title.trim() : null;
                if (!OldDplay.isItemOk(Name, data[k]))
                    continue;
                if (data[k].widevineRequired)
                    continue;
                if (extra.strip_show && data[k].episode_number) {
                    Description = data[k].title.trim();
                    Name        = "Avsnitt " + data[k].episode_number;
                } else if (!extra.strip_show && Show){
                    if (Name.indexOf(Show) == -1) {
                        Name = Show + " - " + Name;
                    }
                    Description = data[k].description.trim();
                }
                if (Description == Name)
                    Description = "";
                Duration = (data[k].duration)/1000;
                if (!Duration && data[k].live) {
                    Duration = (timeToDate(data[k].live.end)-timeToDate(data[k].live.start))/1000;
                }
                ImgLink = OldDplay.fixThumb(data[k].thumbnail_image);
                AirDate = data[k].first_run;
                Link = OldDplay.makeApiUrl("/videos/" + data[k].id);
                Season  = (data[k].season) ? data[k].season.season_number : null;
                Episode = data[k].episode_number
                OldDplay.other_result.push(
                    {name:Name, 
                     show:Show,
                     season:Season,
                     episode:Episode,
                     link:Link, 
                     thumb:ImgLink, 
                     duration:Duration, 
                     description:Description,
                     airDate:AirDate,
                     isFollowUp:data[k].video_type.match(/FOLLOWUP/),
                     isLive : data[k].live,
                     startTime : (data[k].live) ? timeToDate(data[k].live.start) : null,
                     // Non-running live shows are skipped - so if here it's running...
                     isRunning : data[k].live
                    }
                );
                data[k] = null;
            }
        }
        data = null;
        if (extra.strip_show) {
            OldDplay.other_result.sort(function(a, b){
                if (a.episode == b.episode) {
                    if (a.isFollowUp || a.airDate > b.airDate)
                        return -1
                    else 
                        return 1
                } else if (!b.episode || +a.episode > +b.episode) {
                    return -1
                } else {
                    return 1
                }
            })
        };
        if (extra.only_save)
            OldDplay.reset();
        else 
            OldDplay.resultToHtml();
    } catch(err) {
        Log("OldDplay.decode Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
    if (extra.cbComplete)
        extra.cbComplete();
};

OldDplay.decodeShows = function(data, extra) {
    try {
        var Link;
        var ImgLink;
        var showData;
        var Name;
        var Genres = [];
        var queryReqexp = (extra.query && extra.query.length == 1) ? new RegExp("^" + extra.query, 'i') : null;

        for (var k=0; k < data.length; k++) {
            Genres = [];
            showData = data[k];
            if (showData.reference)
                showData = showData.reference;

            Name = showData.title.trim();
            if (!OldDplay.isItemOk(Name, showData))
                continue;
            if (showData.episodes_available == 0) {
                Log(Name + ": No episodes");
                continue;
            }
            if (queryReqexp && !queryReqexp.test(Name)) {
                continue;
            }
            if (extra.query && OldDplay.all_show_names.indexOf(Name) == -1) {
                // Not playable... Probably not applicable after DPLAY
                Log(Name +  ": queried show isn't playable.");
                continue;
            }
            for (var i=0; i < showData.genres.length; i++)
                Genres.push(showData.genres[i].id);
            Link = OldDplay.makeShowUrl(showData.id);
            ImgLink = OldDplay.fixThumb(showData.poster_image);
            OldDplay.show_names.push(Name);
            OldDplay.show_result.push({name:Name, thumb:ImgLink, link:Link, genres:Genres});
            data[k] = null;
        }
        if (extra.all_shows) {
            OldDplay.show_result.sort(function(a, b) {
                if (a.name.toLowerCase() < b.name.toLowerCase()) {
                    return -1;
                } else {
                    return 1;
                }
            })

            OldDplay.all_show_names = OldDplay.show_names;
            OldDplay.all_shows      = OldDplay.show_result;
            // Save genres
            for (var genres, k=0; k < OldDplay.all_shows.length; k++) {
                genres = OldDplay.all_shows[k].genres;
                for (var i=0; i < genres.length; i++) {
                    if (OldDplay.all_genres.indexOf(genres[i]) == -1)
                        OldDplay.all_genres.push(genres[i]);
                }
            }
        }
        data = null;
    } catch(err) {
        Log("OldDplay.decodeShows Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
};

OldDplay.decodeSeason = function(extra, data) {
    try {
        var Name;
        var Link;
        var ImgLink;
        var seasons = [];
        var showId = extra.url.match(/\/shows\/([0-9]+)\/seasons/)[1]
        data = JSON.parse(data.responseText).data;
        for (var k=0; k < data.length; k++) {
            if (data[k].episodes_available > 0) {
                Link = '/shows/' + showId + '/seasons/' + data[k].id + '/videos';
                Link = OldDplay.makeApiUrl(Link);
                Name = "Säsong " + data[k].season_number;
                seasons.push({season:data[k].season_number, name:Name, link:Link});
            }
        }
        data = null;
        if (seasons.length == 1) {
            return callTheOnlySeason(seasons[0].name, seasons[0].link, extra.loc);
        }
        seasons.sort(function(a, b){
                if (a.season > b.season)
                    return -1;
                else
                    return 1
        });
        ImgLink = JSON.parse(httpRequest(OldDplay.makeApiUrl("/shows/" + showId),{sync:true}).data).data;
        ImgLink = OldDplay.fixThumb(ImgLink.poster_image);
        for (var k=0; k < seasons.length; k++) {
            seasonToHtml(seasons[k].name, ImgLink, seasons[k].link, seasons[k].season);
        }
                     
    } catch(err) {
        Log("OldDplay.decodeSeason Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
    if (extra.cbComplete)
        extra.cbComplete();
};

OldDplay.channelToHtml = function(name, idx, thumb) {
    if (thumb)
        thumb = thumb.replace(/c_fill,/,"");
    toHtml({name:name,
            duration:"",
            is_live:false,
            is_channel:false,
            is_running:null,
            starttime:null,
            link:idx,
            link_prefix:'<a href="index.html?dplay_channel=',
            description:"",
            thumb:thumb
           });
};

OldDplay.getDetailsData = function(url, data) {

    if (url.match(/\/shows/))
        return OldDplay.getShowData(url,data);

    var Name="";
    var Title = Name;
    var DetailsImgLink="";
    var AirDate="";
    var AvailDate=null;
    var VideoLength = "";
    var Description="";
    var Show=null;
    var isLive = false;
    var Season = null;
    var Episode = null;
    try {
        data = JSON.parse(data.responseText).data;
        Name = OldDplay.determineEpisodeName(data);
        Title = (data.episode_number) ? "Avsnitt " + data.episode_number : Name;
        isLive = data.live
        if (data.show)
            Title = data.show.title.trim() + " - " + Title;
	DetailsImgLink = OldDplay.fixThumb(data.thumbnail_image, DETAILS_THUMB_FACTOR);
        AirDate = (isLive) ? timeToDate(data.live.start) : timeToDate(data.first_run);
        VideoLength = data.duration;
        if (!VideoLength && data.live) {
            VideoLength = (timeToDate(data.live.end)-timeToDate(data.live.start));
        }
        VideoLength = dataLengthToVideoLength(null, VideoLength/1000);
        if (!VideoLength && data.live) {
            VideoLength = (timeToDate(data.live.end)-timeToDate(data.live.start))/1000/1000;
        }
	Description = data.description.trim();
        if (data.available_until) {
            AvailDate = timeToDate(data.available_until);
        }

        if (data.show && OldDplay.isItemOk(data.show.title.trim(), data.show)) {
            Show = {name  : data.show.title.trim(),
                    url   : OldDplay.makeShowUrl(data.show.id),
                    thumb : OldDplay.fixThumb(data.show.poster_image)
                   }
        }

        Season  = (data.season) ? data.season.season_number : null;
        Episode = data.episode_number;

    } catch(err) {
        Log("OldDplay.getDetailsData Exception:" + err.message);
        Log("Name:" + Name);
        Log("AirDate:" + AirDate);
        Log("VideoLength:" + VideoLength);
        Log("Description:" + Description);
        Log("DetailsImgLink:" + DetailsImgLink);
    }
    data = null;
    return {name          : Name,
            title         : Title,
            is_live       : isLive,
            air_date      : AirDate,
            avail_date    : AvailDate,
            start_time    : AirDate,
            duration      : VideoLength,
            description   : Description,
            not_available : false,
            thumb         : DetailsImgLink,
            season        : Season,
            episode       : Episode,
            episode_name  : Name,
            parent_show   : Show
    }
};

OldDplay.determineEpisodeName = function(data) {
    var Name = data.title.trim();
    if (data.show && data.episode_number && data.show.title.indexOf(Name) != -1)
        Name = "Avsnitt " + data.episode_number;
    return Name;
}

OldDplay.getShowData = function(url, data) {
    var Name="";
    var Genre = [];
    var DetailsImgLink="";
    var Description="";

    try {

        data = JSON.parse(data.responseText).data;
        Name = data.title.trim();
        DetailsImgLink = OldDplay.fixThumb(data.poster_image, DETAILS_THUMB_FACTOR);
        Description = data.description.trim();
        for (var i=0; i < data.genres.length; i++) {
            if (data.genres[i].name.match(/gratis/i))
                continue;
            Genre.push(data.genres[i].name)
        }
        Genre = Genre.join('/');

    } catch(err) {
        Log("OldDplay.getShowData exception:" + err.message);
        Log("Name:" + Name);
        Log("Genre:" + Genre);
        Log("Description:" + Description);
        Log("DetailsImgLink:" + DetailsImgLink);
    }
    data = null;
    return {show          : true,
            name          : Name,
            description   : Description,
            genre         : Genre,
            thumb         : DetailsImgLink
           };
};

OldDplay.getDetailsUrl = function(streamUrl) {
    return streamUrl.replace(/\/seasons/, "");
};

OldDplay.getPlayUrl = function(streamUrl, isLive, download, callback, otherStreamUrl) {
    OldDplay.play_args = {stream_url:streamUrl, is_live:isLive, download:download};
    var videoUrl = "https://secure.dplay.se/secure/api/v2/user/authorization/stream/" + streamUrl.match(/\/videos\/([0-9]+)/)[1] + "?stream_type=hls";
    var countryCode = JSON.parse(httpRequest("http://geo.dplay.se/geo.js",{sync:true}).data).countryCode;
    var cookie = '{"countryCode":"' + countryCode + '","expiry":' + (getCurrentDate().getTime() + 3600*1000) + '}';
    cookie = 'dsc-geo='+encodeURIComponent(cookie);
    fallback_url = null;
    var actualStreamUrl = (otherStreamUrl) ? otherStreamUrl : streamUrl;
    if (deviceYear == 2011) {
    // if (deviceYear == 2011 || deviceYear == 2014) {
        fallback_url = videoUrl.replace(/https?:\/\//,"");
        fallback_url = "http://192.168.1.33:10666/jt_https/jtproxy/" + fallback_url + "&mycookie=" + encodeURIComponent(cookie);
        videoUrl = fallback_url
        fallback_url = null
    }

    requestUrl(videoUrl,
               function(status, data)
               {
                   if (Player.checkPlayUrlStillValid(actualStreamUrl)) {
                       var srtUrl = null;
                       try {
                           srtUrl = JSON.parse(httpRequest(streamUrl,{sync:true}).data).data.subtitles.sv.srt; 
                       } catch(err) {
                           srtUrl = null;
                       }
                       Resolution.getCorrectStream(JSON.parse(data.responseText).hls, srtUrl, {useBitrates:true,useCookies:true,download:download}, callback);
                   }
               },
               {cookie:cookie,
                fallback_url:fallback_url
               }
              );
};

OldDplay.refreshPlayUrl = function(callback) {
    OldDplay.getPlayUrl(OldDplay.play_args.stream_url,
                     OldDplay.play_args.is_live,
                     OldDplay.play_args.download,
                     callback
                    );
};

//     $.support.cors = true;
//     $.ajax(
//         {
//             type: 'GET',
//             url: videoUrl,
//             tryCount : 0,
//             retryLimit : 3,
// 	    timeout: 15000,
//             beforeSend: function (request)
//             {
//                 request.setRequestHeader("Cookie", 'dsc-geo=' + cookie);
//             },
//             success: function(data, status, xhr)
//             {
//                 Log('Success:' + this.url);
//                 if (Player.checkPlayUrlStillValid(streamUrl)) {
//                     var srtUrl = null;
//                     try {
//                         srtUrl = JSON.parse(httpRequest(streamUrl,{sync:true}).data).data.subtitles.sv.srt; 
//                     } catch(err) {
//                         srtUrl = null;
//                     }
//                     Resolution.getCorrectStream(JSON.parse(xhr.responseText).hls, false, srtUrl, true);
//                 };
//                 xhr.destroy();
//                 xhr = null;
//             },
//             error: function(xhr, textStatus, errorThrown)
//             {
//         	Log('Failure:' + this.url + " status:" + xhr.status + " " + textStatus + " error:" + errorThrown);
//             }
//         }
//     );
// };
    
//     httpRequest(videoUrl,
//                 {cb:function(data) {
//                          if (Player.checkPlayUrlStillValid(streamUrl)) {
//                              var srtUrl = null;
//                              try {
//                                  srtUrl = JSON.parse(httpRequest(streamUrl,{sync:true}).data).data.subtitles.sv.srt; 
//                              } catch(err) {
//                                  srtUrl = null;
//                              }
//                              Resolution.getCorrectStream(JSON.parse(data).hls, false, srtUrl, true);
//                          };
//                      },
//                      'dsc-geo=' + cookie
//                     );
// };

OldDplay.fixThumb = function(thumb, factor) {
    if (thumb) {
        var height = (factor) ? Math.floor(factor*THUMB_HEIGHT) : THUMB_HEIGHT;
        var width  = (factor) ? Math.floor(factor*THUMB_WIDTH)  : THUMB_WIDTH;
        thumb = "http://a3.res.cloudinary.com/dumrsasw1/image/upload/c_fill,h_" + height + ",w_" + width + "/" + thumb.file;
    }
    return thumb
};

OldDplay.isPlayable = function(Name, data) {

    var isPremium = false;
    if (data.package) {
        for (var k=0; k < data.package.length; k++) {
            if (data.package[k].id == 41)
                // 41 = Free
                return true
            else (data.package[k].id == 42)
                isPremium = true
        };
        return !isPremium;
    } else {
        Log(Name + ": No package");
        return true;
    }

};

OldDplay.isCorrectChannel = function(Name, data) {
    if (!OldDplay.isSubChannelSet())
        return true;

    var channel_id = OldDplay.channels[OldDplay.channel_idx].id

    if (data.show)
        data = data.show
    if (data.home_channel)
        return data.home_channel.id == channel_id
    else
        Log(Name + ": No home_channel");
    return true
};

OldDplay.isAvailable = function(Name, data) {

    if (data.live) {
        if (timeToDate(data.live.start) > getCurrentDate() || 
            getCurrentDate() > timeToDate(data.live.end)) {
            // Future/Ended live show
            return false;
        }
    } else if (data.rights) {
        var start = (data.rights.advod) ? data.rights.advod.start : null;
        if (!start && data.rights.svod)
            start = data.rights.svod.start
        if (start && timeToDate(start) > getCurrentDate()) {
            // Premium/Future episode
            alert("Skipping " + data.show.title + " " + data.title)
            return false;
        }
    }
    return true;
};

OldDplay.isItemOk = function(Name, data, genre) {
    if (!OldDplay.isPlayable(Name, data)) {
        // alert(Name + ": Premium");
        return false;
    }
    if (!OldDplay.isCorrectChannel(Name, data)) {
        // alert(Name + ": wrong channel");
        return false;
    }
    if (!OldDplay.isAvailable(Name, data)) {
        // alert(Name + ": not yet available");
        return false;
    }
    return true;

};

OldDplay.resultToHtml = function() {
    for (var k=0; k < OldDplay.show_result.length; k++) {
        showToHtml(OldDplay.show_result[k].name, 
                   OldDplay.show_result[k].thumb, 
                   OldDplay.show_result[k].link);
    };
    OldDplay.show_result = [];
    for (var k=0; k < OldDplay.other_result.length; k++) {
        toHtml({name:OldDplay.other_result[k].name,
                duration:OldDplay.other_result[k].duration,
                is_live:OldDplay.other_result[k].isLive,
                is_channel:false,
                is_running:OldDplay.other_result[k].isRunning,
                starttime:OldDplay.other_result[k].startTime,
                link:OldDplay.other_result[k].link,
                link_prefix:'<a href="details.html?ilink=',
                description:OldDplay.other_result[k].description,
                thumb:OldDplay.other_result[k].thumb,
                show:OldDplay.other_result[k].show,
                season:OldDplay.other_result[k].season,
                episode:OldDplay.other_result[k].episode
               });
    };
};

OldDplay.getOldPlayUrl = function(playArgs, callback, notFoundCallback) {
    var myTitle = itemSelected.find(".ilink").attr("href").match(/[?&](mytitle[^&]+)/);
    if (myTitle)
        myTitle = myTitle[1].match(/mytitle=([^.]+)\.s([0-9]+)e([0-9]+)/);

    if (myTitle) {
        myTitle[1] = unescape(myTitle[1])
        httpRequest(OldDplay.makeApiUrl('/search', '&query=' + myTitle[1]),
                    {cb:function(status, data) {
                        OldDplay.playEpisode(data, myTitle, playArgs, callback, notFoundCallback)
                    }}
                   );
    } else
        notFoundCallback()
};

OldDplay.playEpisode = function(data, myTitle, playArgs, callback, notFoundCallback) {
    try {
        OldDplay.reset();
        data = JSON.parse(data).data;
        if (data.videos) {
            OldDplay.decodeSearchHits(data.videos);
        } else {
            OldDplay.decodeSearchHits(data);
        }
        for (var i=0; i < OldDplay.other_result.length; i++) {
            if (OldDplay.other_result[i].show == myTitle[1] &&
                OldDplay.other_result[i].season == myTitle[2] &&
                OldDplay.other_result[i].episode == myTitle[3]) {
                return OldDplay.getPlayUrl(OldDplay.other_result[i].link,
                                           playArgs.is_live,
                                           playArgs.download,
                                           callback,
                                           playArgs.stream_url
                                          )
            }
        };
        if (data.shows) {
            OldDplay.reset();
            OldDplay.decodeShows(data.shows, {})
            for (var i=0; i < OldDplay.show_result.length; i++) {
                if (OldDplay.show_result[i].name == myTitle[1]) {
                    return httpRequest(OldDplay.show_result[i].link.replace("/seasons", "/videos"),
                                       {cb:function(status, data) {
                                           OldDplay.playEpisode(data,
                                                                myTitle,
                                                                playArgs,
                                                                callback,
                                                                notFoundCallback
                                                               )
                                       }}
                                      )
                }
            }
        }
    } catch(err) {
        Log("OldDplay.playEpisode Exception:" + err.message);
    }
    notFoundCallback()
};
