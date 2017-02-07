var DETAILS_THUMB_FACTOR = 600/THUMB_WIDTH;
var Dplay =
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

Dplay.resetSubChannel = function() {
    if (Dplay.channel_idx) {
        Dplay.channel_idx = null;
        Dplay.all_shows = [];
        Dplay.all_show_names = [];
        Dplay.all_genres = [];
        Dplay.reset();
        deleteAllCookies("dsc-geo")
    };
}

Dplay.isSubChannelSet = function() {
    return Dplay.channel_idx != null;
}

Dplay.reset = function() {
    Dplay.show_names = [];
    Dplay.show_result = [];
    Dplay.other_result = [];
}

Dplay.getUrl = function(tag, extra) {
    
    switch (tag)
    {
    case "main":
        var newChannel = getLocation(extra.refresh).match(/dplay_channel=([0-9]+|reset)/);
        newChannel = (newChannel && newChannel.length > 0) ? newChannel[1] : null;
        if (newChannel && !extra.refresh)
            myHistory = [];
        if (newChannel && Dplay.channel_idx != newChannel) {
            Dplay.resetSubChannel();
            if (newChannel != "reset")
                Dplay.channel_idx = newChannel;
            // Force new channel name
            Header.display(document.title);
        }
        Dplay.preFetchAllShows();
        return Dplay.makeApiUrl("/shows/recommended", "&limit=50");
        break;

    case "section":
        switch (extra.location) {

        case "Popular.html":
            return Dplay.makeApiUrl("/shows/popular", "&limit=50");
            break;

        case "Latest.html":
            return Dplay.makeApiUrl("/videos/recent", "&sort=sort_date_desc&limit=50");
            break;
        };
        break;

    case "categories":
        if (Dplay.getCategoryIndex().current==1) {
            if (Dplay.all_shows.length == 0)
                return Dplay.getAllShowsUrl();
            else
                return {cached:true};
        } else {
            return Dplay.makeApiUrl("/genres");
        }
        break;

    case "categoryDetail":
        return {cached:true,url:extra.location};

    case "live":
        return Dplay.makeApiUrl("/channels");
        break;

    case "searchList":
        if (Dplay.all_show_names.length == 0)
            return Dplay.getAllShowsUrl()
        else if (extra.query.length > 1)
            return Dplay.makeApiUrl('/search', '&query=' + extra.query);
        else
            return {cached:true}
        break;

    // case "live":
    //     return Dplay.makeApiUrl("/videos/live", "&sort=sort_date_desc&limit=50");

    default:
        return tag;
    };
};

Dplay.decodeMain = function(data, extra) {
    Dplay.decode(data, extra);
};

Dplay.decodeSection = function(data, extra) {
    Dplay.decode(data, extra);
};

Dplay.decodeCategories = function(data, extra, allFetched) {

    if (extra.url.cached || !extra.url.match(/\/genres/)) {
        Dplay.handleAllShows(data, extra);
        data = null;
    } else if (Dplay.all_shows.length == 0 && !allFetched) {
        // I don't understans JS it seems. Seems reference object is re-used
        // somehow. I.e. when callback is invoked data contains the data
        // received in getAllShowsUrl...
        var responseText = data.responseText;
        return Dplay.getAllShows(function(){Dplay.decodeCategories({responseText:responseText}, extra, true)}, null, true);
        data = null;
    } else {
        try {
            var genres = [];
            data = JSON.parse(data.responseText).data;
            for (var k=0; k < data.length; k++) {                   
                if (data[k].name.trim().match(/gratis/i))
                    continue;
                if (Dplay.all_genres.indexOf(data[k].id) == -1)
                    // No shows
                    continue;
                genres.push({name:data[k].name.trim(), 
                             link:Dplay.getAllShowsUrl() + "&genres=" + data[k].id
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
                toHtml({name:genres[k].name,
                        link:genres[k].link,
                        link_prefix:'<a href="categoryDetail.html?category=',
                        thumb:null
                       });

            if (extra.cbComplete)
                extra.cbComplete();

        } catch(err) {
            Log("Dplay.decodeCategories Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
        }
    }
};

Dplay.decodeCategoryDetail = function(data, extra) {
    Dplay.getAllShows(extra.cbComplete, extra.url.url);
};

Dplay.decodeLive = function(data, extra) {

    var oldId = (Dplay.isSubChannelSet()) ? Dplay.channels[Dplay.channel_idx].id : null;
    var Name;
    Dplay.channels = [];
    data = JSON.parse(data.responseText).data;

    for (var k=0; k < data.length; k++) {
        Name = data[k].title.replace(/.*dplay[	 ]*.[	 ]*([^:]+).*/i, "$1").trim();
        Dplay.channels.push({name:Name, id:data[k].id});
        if (oldId != null) {
            if (k == 0)
                Dplay.channelToHtml("DPLAY", "reset", null);
            if (oldId == data[k].id) {
                Dplay.channel_idx = k;
                continue;
            }
        }
        Dplay.channelToHtml(Name, k, Dplay.fixThumb(data[k].logo_image));
    }
    if (extra.cbComplete)
        extra.cbComplete();
};

Dplay.decodeShowList = function(data, extra) {
    Dplay.decode(data, extra);
}

Dplay.decodeSearchList = function(data, extra) {
    Dplay.reset()
    // At least in old Dplay api Search result for shows also contains "unplayable" shows, 
    // so first fetch all shows and then we filter from that.
    if (Dplay.all_show_names.length == 0)
    {
        extra.only_save = true;
        Dplay.handleAllShows(data, extra);
        extra.url = Dplay.getUrl("searchList", extra),
        requestUrl(extra.url,
                   function(status, data)
                   {
                       Dplay.decodeSearchList(data, extra)
                       data = null;
                   },
                   {cbError:extra.cbComplete}
                  );
    } else {
        if (extra.query.length > 1) {
            data = JSON.parse(data.responseText).data;
            if (data.shows)
                Dplay.decodeShows(data.shows, extra);
            if (data.videos)
                Dplay.decodeSearchHits(data.videos);
            data = null;
            Dplay.finishSearch(extra.cbComplete)
        } else {
            var queryReqexp = (extra.query && extra.query.length == 1) ? new RegExp("^" + extra.query, 'i') : null;
            Dplay.show_result = [];
            for (var k=0; k < Dplay.all_shows.length; k++) {
                if (!queryReqexp.test(Dplay.all_shows[k].name))
                    continue;
                Dplay.show_result.push(Dplay.all_shows[k]);
            }
            Dplay.finishSearch(extra.cbComplete)
        }
    }
};

// TODO - merge handleAllShows and getAllShows
Dplay.handleAllShows = function(data, extra) {
    Dplay.reset();
    if (Dplay.all_shows.length == 0) {
        extra.all_shows = true;
        var cbComplete = extra.cbComplete
        extra.cbComplete = null
        Dplay.decode(data, extra);
        extra.cbComplete = cbComplete;
        data = null;
    } else if (!extra.only_save) {
        Dplay.show_result = Dplay.all_shows;
        Dplay.resultToHtml();
        if (extra.cbComplete)
            extra.cbComplete();
    }
};

Dplay.getAllShows = function(completeFun, url, onlySave) {
    Dplay.reset();
    if (Dplay.all_shows.length == 0) {
        url = Dplay.getAllShowsUrl();
        requestUrl(url,
                   function(status, data)
                   {
                       Dplay.decode(data, {all_shows:true,url:url,only_save:onlySave});
                       data = null;
                   },
                   {cbComplete:completeFun}
                  );
    } else {
        if (!onlySave) {
            var genre = (url) ? url.match(/genres=([0-9]+)/) : null;
            genre = (genre) ? +genre[1] : null;
            Dplay.show_result = Dplay.filterShows(Dplay.all_shows, genre);
            Dplay.resultToHtml();
        }
        if (completeFun)
            completeFun();
    }
};

Dplay.preFetchAllShows = function() {
    if (Dplay.all_shows.length != 0)
        return
    var extra = {only_save:true,
                 all_shows:true,
                 url      :Dplay.getAllShowsUrl(),
                }
    httpRequest(extra.url,
                {cb:function(status, text) {
                    Dplay.handleAllShows({responseText:text}, extra)
                }}
               )
}

Dplay.getAllShowsUrl = function() {
    return Dplay.makeApiUrl('/shows');
}

Dplay.filterShows = function(shows, genre) {
    if (!genre)
        return shows
    var result = [];
    for (var k=0; k < shows.length; k++) {
        if (shows[k].genres.indexOf(genre) > -1)
            result.push(shows[k])
    }
    return result;
}

Dplay.makeApiUrl = function(path, extra) {
    
    var channel = (Dplay.channel_idx) ? Dplay.channels[Dplay.channel_idx].id : null
    channel = (!path.match(/\/channels/) && channel) ? "&channel_id=" + channel : "";
    extra = (extra) ? extra : "";
    return "http://www.dplay.se/api/v2/content/device" + path + "?appVersion=3.0.0&platform=IPHONE&realm=DPLAYSE&site=SE&embed=reference,show,package,genres,videos,shows,season&package=41&limit=500" + channel + extra;
};

Dplay.makeShowUrl = function(id) {
    return Dplay.makeApiUrl('/shows/' + id + '/seasons');
};

Dplay.getPrefix = function(channel_idx) {
    var Name = channel;
    if (channel_idx)
        Name = Dplay.channels[channel_idx].prefix;
    return 'http://www.' + Name + 'play.se/'
};

Dplay.addChannel = function(url) {
    if (Dplay.isSubChannelSet())
        return url + "&channel=" + Dplay.channels[Dplay.channel_idx].id;
    return url;
};

Dplay.finishSearch = function (completeFun) {
    Dplay.resultToHtml();
    if (completeFun)
        completeFun();
};

Dplay.getNextCategory = function() {
    return getNextIndexLocation(1);
};

Dplay.getCategoryIndex = function () {
    return getIndex(1);
};

Dplay.getHeaderPrefix = function(MainName) {
    if (MainName || !Dplay.channel_idx)
        return "DPLAY";
    else {
        return Dplay.channels[Dplay.channel_idx].name;
    }
};

Dplay.keyRed = function() {
    if ($("#a-button").text().indexOf("Re") != -1) {
	setLocation('index.html');
    } else if ($("#a-button").text().indexOf("Pop") != -1) {
	setLocation('Popular.html');
    } else {
	setLocation('Latest.html');
    }
}

Dplay.keyGreen = function() {
    if ($("#b-button").text().indexOf("ateg") != -1)
	setLocation('categories.html');
    else
        setLocation(Dplay.getNextCategory())
}

Dplay.getMainTitle = function () {
    return "Rekommenderat"
}

Dplay.getSectionTitle = function(location) {
    if (location.match(/Popular.html/))
        return 'Populärt';
    else if (location.match(/Latest.html/))
        return 'Senaste';
}

Dplay.getCategoryTitle = function() {
    switch (Dplay.getCategoryIndex().current) {
    case 0:
        return "Kategorier";
    case 1:
        return "Alla Program";
    }
};

Dplay.getLiveTitle = function() {
    return 'Kanaler';
}

Dplay.getAButtonText = function(language) {
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
	    return Dplay.getMainTitle();
        }
    }
};

Dplay.getBButtonText = function(language) {
    if (getIndexLocation().match(/categories\.html/)) {
        switch (Dplay.getCategoryIndex().next) {
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

Dplay.getCButtonText = function (language) {
    if(language == 'English')
	return 'Channels';
    else
        return 'Kanaler';
};

Dplay.decodeSearchHits = function(data) {
    try {
        var Name;
        var Duration;
        var Link;
        var Description;
        var ImgLink;
        var next = null;
        var AirDate;
        var Episode=null;

        for (var k=0; k < data.length; k++) {

            Name = Dplay.determineEpisodeName(data[k]);
            if (!Dplay.isItemOk(Name, data))
                continue;
            if (data[k].widevineRequired)
                continue;
            if (data[k].show) {
                if (Dplay.show_names.indexOf(data[k].show.title.trim()) != -1)
                    continue;
                Name = data[k].show.title.trim() + " - " + Name;
            }

            Description = data[k].description.trim();
            Duration = (data[k].duration)/1000;
            ImgLink = Dplay.fixThumb(data[k].thumbnail_image);
            AirDate = data[k].first_run;
            Link = Dplay.makeApiUrl("/videos/" + data[k].id);
            Dplay.other_result.push({name:Name, 
                                      episode:null,
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
        Log("Dplay.decodeSearchHits Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
};

Dplay.decode = function(data, extra) {
    try {
        var Name;
        var Duration;
        var Link;
        var Description="";
        var ImgLink;
        var next = null;
        var AirDate;
        var Episode=null;

        Dplay.reset();
        if (extra.url.match(/\/seasons\?/)) {
            return Dplay.decodeSeason(extra.url, data, extra.cbComplete);
        }

        data = JSON.parse(data.responseText);
        if (data.data[0].reference) {
            Dplay.decodeShows(data.data, extra);
        } else if (data.data[0].type == "show") {
            Dplay.decodeShows(data.data, extra);
        } else {
            data = data.data;
            for (var k=0; k < data.length; k++) {
                Name = Dplay.determineEpisodeName(data[k]);
                if (!Dplay.isItemOk(Name, data[k]))
                    continue;
                if (data[k].widevineRequired)
                    continue;
                if (extra.strip_show && data[k].episode_number) {
                    Description = data[k].title.trim();
                    Name        = "Avsnitt " + data[k].episode_number;
                } else if (!extra.strip_show && data[k].show){
                    if (Name.indexOf(data[k].show.title) == -1) {
                        Name = data[k].show.title.trim() + " - " + Name;
                    }
                    Description = data[k].description.trim();
                }
                Duration = (data[k].duration)/1000;
                if (!Duration && data[k].live) {
                    Duration = (timeToDate(data[k].live.end)-timeToDate(data[k].live.start))/1000;
                }
                ImgLink = Dplay.fixThumb(data[k].thumbnail_image);
                AirDate = data[k].first_run;
                Link = Dplay.makeApiUrl("/videos/" + data[k].id);
                Episode = data[k].episode_number
                Dplay.other_result.push(
                    {name:Name, 
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
            Dplay.other_result.sort(function(a, b){
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
            Dplay.reset();
        else 
            Dplay.resultToHtml();
    } catch(err) {
        Log("Dplay.decode Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
    if (extra.cbComplete)
        extra.cbComplete();
};

Dplay.decodeShows = function(data, extra) {
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
            if (!Dplay.isItemOk(Name, showData))
                continue;
            if (showData.episodes_available == 0) {
                Log(Name + ": No episodes");
                continue;
            }
            if (queryReqexp && !queryReqexp.test(Name)) {
                continue;
            }
            if (extra.query && Dplay.all_show_names.indexOf(Name) == -1) {
                // Not playable... Probably not applicable after DPLAY
                Log(Name +  ": queried show isn't playable.");
                continue;
            }
            for (var i=0; i < showData.genres.length; i++)
                Genres.push(showData.genres[i].id);
            Link = Dplay.makeShowUrl(showData.id);
            ImgLink = Dplay.fixThumb(showData.poster_image);
            Dplay.show_names.push(Name);
            Dplay.show_result.push({name:Name, thumb:ImgLink, link:Link, genres:Genres});
            data[k] = null;
        }
        if (extra.all_shows) {
            Dplay.show_result.sort(function(a, b) {
                if (a.name.toLowerCase() < b.name.toLowerCase()) {
                    return -1;
                } else {
                    return 1;
                }
            })

            Dplay.all_show_names = Dplay.show_names;
            Dplay.all_shows      = Dplay.show_result;
            // Save genres
            for (var genres, k=0; k < Dplay.all_shows.length; k++) {
                genres = Dplay.all_shows[k].genres;
                for (var i=0; i < genres.length; i++) {
                    if (Dplay.all_genres.indexOf(genres[i]) == -1)
                        Dplay.all_genres.push(genres[i]);
                }
            }
        }
        data = null;
    } catch(err) {
        Log("Dplay.decodeShows Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
};

Dplay.decodeSeason = function(targetUrl, data, completeFun) {
    try {
        var Name;
        var Link;
        var ImgLink;
        var seasons = [];
        var showId = targetUrl.match(/\/shows\/([0-9]+)\/seasons/)[1]
        data = JSON.parse(data.responseText).data;
        for (var k=0; k < data.length; k++) {
            if (data[k].episodes_available > 0) {
                Link = '/shows/' + showId + '/seasons/' + data[k].id + '/videos';
                Link = Dplay.makeApiUrl(Link);
                Name = "Säsong " + data[k].season_number;
                seasons.push({season:data[k].season_number, name:Name, link:Link});
            }
        }
        data = null;
        if (seasons.length == 1) {
            return callTheOnlySeason(seasons[0].name, seasons[0].link);
        }
        seasons.sort(function(a, b){
                if (a.season > b.season)
                    return -1;
                else
                    return 1
        });
        ImgLink = JSON.parse(httpRequest(Dplay.makeApiUrl("/shows/" + showId),{sync:true}).data).data;
        ImgLink = Dplay.fixThumb(ImgLink.poster_image);
        for (var k=0; k < seasons.length; k++) {
            seasonToHtml(seasons[k].name, ImgLink, seasons[k].link);
        }
                     
    } catch(err) {
        Log("Dplay.decodeSeason Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
    if (completeFun)
        completeFun();
};

Dplay.channelToHtml = function(name, idx, thumb) {
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

Dplay.getDetailsData = function(url, data) {

    if (url.match(/\/shows/))
        return Dplay.getShowData(url,data);

    var Name="";
    var Title = Name;
    var DetailsImgLink="";
    var AirDate="";
    var AvailDate=null;
    var VideoLength = "";
    var Description="";
    var Show=null;
    var isLive = false;
    try {
        data = JSON.parse(data.responseText).data;
        Name = Dplay.determineEpisodeName(data);
        Title = (data.episode_number) ? "Avsnitt " + data.episode_number : Name;
        if (data.show)
            Title = data.show.title.trim() + " - " + Title;
	DetailsImgLink = Dplay.fixThumb(data.thumbnail_image, DETAILS_THUMB_FACTOR);
        AirDate = timeToDate(data.first_run);
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
        isLive = data.live
        if (data.show && Dplay.isItemOk(data.show.title.trim(), data.show)) {
            Show = {name : data.show.title.trim(),
                    url  : Dplay.makeShowUrl(data.show.id)
                   }
        }

    } catch(err) {
        Log("Dplay.getDetailsData Exception:" + err.message);
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
            parent_show   : Show
    }
};

Dplay.determineEpisodeName = function(data) {
    var Name = data.title.trim();
    if (data.show && data.episode_number && data.show.title.indexOf(Name) != -1)
        Name = "Avsnitt " + data.episode_number;
    return Name;
}

Dplay.getShowData = function(url, data) {
    var Name="";
    var Genre = [];
    var DetailsImgLink="";
    var Description="";

    try {

        data = JSON.parse(data.responseText).data;
        Name = data.title.trim();
        DetailsImgLink = Dplay.fixThumb(data.poster_image, DETAILS_THUMB_FACTOR);
        Description = data.description.trim();
        for (var i=0; i < data.genres.length; i++) {
            if (data.genres[i].name.match(/gratis/i))
                continue;
            Genre.push(data.genres[i].name)
        }
        Genre = Genre.join('/');

    } catch(err) {
        Log("Dplay.getShowData exception:" + err.message);
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

Dplay.getDetailsUrl = function(streamUrl) {
    return streamUrl.replace(/\/seasons/, "");
};

Dplay.getPlayUrl = function(streamUrl, isLive, callback) {
    Dplay.play_args = {stream_url:streamUrl, is_live:isLive};
    var videoUrl = "https://secure.dplay.se/secure/api/v2/user/authorization/stream/" + streamUrl.match(/\/videos\/([0-9]+)/)[1] + "?stream_type=hls";
    var countryCode = JSON.parse(httpRequest("http://geo.dplay.se/geo.js",{sync:true}).data).countryCode;
    var cookie = '{"countryCode":"' + countryCode + '","expiry":' + (getCurrentDate().getTime() + 3600*1000) + '}';
    cookie = 'dsc-geo='+encodeURIComponent(cookie);

    requestUrl(videoUrl,
               function(status, data)
               {
                   if (Player.checkPlayUrlStillValid(streamUrl)) {
                       var srtUrl = null;
                       try {
                           srtUrl = JSON.parse(httpRequest(streamUrl,{sync:true}).data).data.subtitles.sv.srt; 
                       } catch(err) {
                           srtUrl = null;
                       }
                       if (callback)
                           Resolution.setStreamUrl(JSON.parse(data.responseText).hls, srtUrl, callback, {useBitrates:true,useCookies:true});
                       else
                           Resolution.getCorrectStream(JSON.parse(data.responseText).hls, srtUrl, {useBitrates:true,useCookies:true});
                   }
               },
               {cookie:cookie}
              );
};

Dplay.refreshPlayUrl = function(callback) {
    Dplay.getPlayUrl(Dplay.play_args.stream_url,
                     Dplay.play_args.is_live,
                     callback
                    );
};

Dplay.fixThumb = function(thumb, factor) {
    if (thumb) {
        var height = (factor) ? Math.floor(factor*THUMB_HEIGHT) : THUMB_HEIGHT;
        var width  = (factor) ? Math.floor(factor*THUMB_WIDTH)  : THUMB_WIDTH;
        thumb = "http://a3.res.cloudinary.com/dumrsasw1/image/upload/c_fill,h_" + height + ",w_" + width + "/" + thumb.file;
    }
    return thumb
};

Dplay.isPlayable = function(Name, data) {

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

Dplay.isCorrectChannel = function(Name, data) {
    if (!Dplay.isSubChannelSet())
        return true;

    var channel_id = Dplay.channels[Dplay.channel_idx].id

    if (data.show)
        data = data.show
    if (data.home_channel)
        return data.home_channel.id == channel_id
    else
        Log(Name + ": No home_channel");
    return true
};

Dplay.isAvailable = function(Name, data) {

    if (data.live) {
        if (timeToDate(data.live.start) > getCurrentDate() || 
            getCurrentDate() > timeToDate(data.live.end)) {
            // Future/Ended live show
            return false;
        }
    } else if (data.rights && data.rights.advod) {
        if (timeToDate(data.rights.advod.start) > getCurrentDate()) {
            // Premium/Future episode
            return false;
        }
    }
    return true;
};

Dplay.isItemOk = function(Name, data, genre) {
    if (!Dplay.isPlayable(Name, data)) {
        // alert(Name + ": Premium");
        return false;
    }
    if (!Dplay.isCorrectChannel(Name, data)) {
        // alert(Name + ": wrong channel");
        return false;
    }
    if (!Dplay.isAvailable(Name, data)) {
        // alert(Name + ": not yet available");
        return false;
    }
    return true;

};

Dplay.resultToHtml = function() {
    for (var k=0; k < Dplay.show_result.length; k++) {
        showToHtml(Dplay.show_result[k].name, 
                   Dplay.show_result[k].thumb, 
                   Dplay.show_result[k].link);
    };
    Dplay.show_result = [];
    for (var k=0; k < Dplay.other_result.length; k++) {
        toHtml({name:Dplay.other_result[k].name,
                duration:Dplay.other_result[k].duration,
                is_live:Dplay.other_result[k].isLive,
                is_channel:false,
                is_running:Dplay.other_result[k].isRunning,
                starttime:Dplay.other_result[k].startTime,
                link:Dplay.other_result[k].link,
                link_prefix:'<a href="details.html?ilink=',
                description:Dplay.other_result[k].description,
                thumb:Dplay.other_result[k].thumb
               });
    };
};