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
    other_result:[]
};

Dplay.resetSubChannel = function() {
    Dplay.channel_idx = null;
    Dplay.all_shows = [];
    Dplay.all_show_names = [];
    Dplay.all_genres = [];
    Dplay.reset();
    deleteAllCookies("dsc-geo");
}

Dplay.anySubChannel = function() {
    return Dplay.channel_idx != null;
}

Dplay.reset = function() {
    Dplay.show_names = [];
    Dplay.show_result = [];
    Dplay.other_result = [];
}

Dplay.getUrl = function(name, new_channel) {
    if (new_channel != undefined && Dplay.channel_idx != new_channel) {
        Dplay.resetSubChannel();
        if (new_channel != "reset")
            Dplay.channel_idx = new_channel;
        // Force new channel name
        Header.display(document.title);
    }
    switch (name)
    {
    case "main":
        return Dplay.makeApiUrl("/shows/recommended", "&limit=50");
        break;

    case "Popular.html":
        document.title = "Populärt";
        return Dplay.makeApiUrl("/shows/popular", "&limit=50");
        break;

    case "Latest.html":
        document.title = 'Senaste';
        return Dplay.makeApiUrl("/videos/recent", "&sort=sort_date_desc&limit=50");
        break;

    case "categories":
        var thisCategory = Dplay.getCurrentLocation();
        if (thisCategory.match(/\?tab_index=1/))
            return Dplay.getAllShowsUrl();
        else
            return Dplay.makeApiUrl("/genres");
        break;

    // case "allShows":
    //     return 
    //     break;

    case "channels":
        return Dplay.makeApiUrl("/channels");
        break;

    // case "live":
    //     return Dplay.makeApiUrl("/videos/live", "&sort=sort_date_desc&limit=50");

    default:
        return name;
    };
};

Dplay.getAllShowsUrl = function() {
    return Dplay.makeApiUrl('/shows');
}

Dplay.getAllShows = function(completeFun, url, onlySave) {
    Dplay.reset();
    if (Dplay.all_shows.length == 0) {
        url = Dplay.getAllShowsUrl();
        requestUrl(url,
                   function(status, data)
                   {
                       Dplay.decode(data.responseText, {tag:"allShows",url:url}, false, completeFun, onlySave);
                       data = null;
                   }
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

Dplay.getPrefix = function(channel_idx) {
    var Name = channel;
    if (channel_idx)
        Name = Dplay.channels[channel_idx].prefix;
    return 'http://www.' + Name + 'play.se/'
};

Dplay.addChannel = function(url) {
    if (Dplay.anySubChannel())
        return url + "&channel=" + Dplay.channels[Dplay.channel_idx].id;
    return url;
};

Dplay.search = function(query, completeFun, url) {
    Dplay.reset()
    url = Dplay.makeApiUrl('/search', '&query=' + query);

    // At least in old Dplay api Search result for shows also contains "unplayable" shows, 
    // so first fetch all shows and then we filter from that.
    if (Dplay.all_show_names.length == 0)
    {
        Dplay.getAllShows(function(){Dplay.search(query, completeFun, url)},
                           null,
                           true
                          );
    } else {
        if (query.length > 1) {
            requestUrl(url,
                       function(status, data)
                       {
                           data = JSON.parse(data.responseText).data;
                           if (data.shows)
                               Dplay.decode_shows(data.shows, query);
                           if (data.videos)
                               Dplay.decode_search_hits(data.videos);
                           data = null;
                       },
                       {cbComplete:function(status, data){Dplay.finishSearch(completeFun)}}
                       );
        } else {
            var queryReqexp = (query && query.length == 1) ? new RegExp("^" + query, 'i') : null;
            Dplay.show_result = [];
            for (var k=0; k < Dplay.all_shows.length; k++) {
                if (!queryReqexp.test(Dplay.all_shows[k].name))
                    continue;
                Dplay.show_result.push(Dplay.all_shows[k]);
            }
            Dplay.finishSearch(completeFun)
        }
    }
};

Dplay.finishSearch = function (completeFun) {
    Dplay.resultToHtml();
    if (completeFun)
        completeFun();
};

Dplay.getCurrentLocation = function() {
    var myNewLocation = myLocation;
    if (detailsOnTop)
        myNewLocation = getOldLocation();
    return myNewLocation;
};

Dplay.getNextCategory = function() {
    var thisCategory = Dplay.getCurrentLocation();
    switch (Dplay.getCategoryIndex().next) {
    case 0:
        return thisCategory.replace(/\?tab_index=[0-9]+/, "")
        break;
    case 1:
        return thisCategory.replace(/categories.html(\?tab_index=[0-9]+)?/, "categories.html?tab_index=1")
        break;
    }
};

Dplay.getCategoryIndex = function () {
    var thisCategory = Dplay.getCurrentLocation();
    if (thisCategory.match(/\?tab_index=1/)) {
        return {current:1, next:0}
    }  else {
        return {current:0, next:1}
    }
};

Dplay.updateCategoryTitle = function() {
    switch (Dplay.getCategoryIndex().current) {
    case 0:
        document.title = "Kategorier";
        break;
    case 1:
        document.title = "Alla Program";
        break;
    }
};

Dplay.getHeaderPrefix = function() {
    if (!Dplay.channel_idx)
        return "DPLAY";
    else {
        return Dplay.channels[Dplay.channel_idx].name;
    }
};

Dplay.fixAButton = function(language) {
    if ((myRefreshLocation && (myRefreshLocation.indexOf("index.html")) != -1) || myLocation.indexOf("index.html") != -1) {
        if(language == 'English'){
	    $("#a-button").text('Latest');
        } else {
	    $("#a-button").text('Senaste');
        }

    } else if((myRefreshLocation && (myRefreshLocation.indexOf("Popular.html")) != -1) || myLocation.indexOf("Latest.html") != -1) {
        if(language == 'English'){
	    $("#a-button").text('Popular');
        } else {
	    $("#a-button").text('Populärt');
        }
    } else {
        if(language == 'English'){
	    $("#a-button").text('Recommended');
        } else {
	    $("#a-button").text('Rekommenderat');
        }
    }
};

Dplay.toggleBButton = function() {

    var language = Language.checkLanguage();

    switch (Dplay.getCategoryIndex().next) {
    case 0:
        Language.fixBButton();
        break;
    case 1:
        if (language == "Swedish")
            $("#b-button").text("Alla Program");
        else
            $("#b-button").text("All Shows");
        break;
    }
};

Dplay.getCButtonText = function (language) {
    if(language == 'English')
	return 'Channels';
    else
        return 'Kanaler';
};

Dplay.decode_search_hits = function(data) {
    try {
        var Name;
        var Duration;
        var IsLive;
        var IsLiveText;
        var running;
        var starttime;
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
            ImgLink = Dplay.fixThumb(data[k].thumbnail_image.file);
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
        }
        data = null; 
    } catch(err) {
        Log("Dplay.decode_search_hits Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
};

Dplay.categories = function(url, refresh, allFetched) {
    if (!url.match(/\/genres/))
        return Dplay.getAllShows(function(){loadFinished("success", refresh)});

    // Make sure all shows are fetched first so we can filter empty categories
    if (Dplay.all_shows.length == 0 && !allFetched) {
        Dplay.getAllShows(function(){Dplay.categories(url, refresh, true)}, null, true);
    } else {
        requestUrl(url,
                   function(status, data)
                   {
                       Dplay.decode_categories(data.responseText);
                       data = null;
                   },
                   {callLoadFinished:true,
                    refresh:refresh
                   }
                  );
    }
};

Dplay.decode_categories = function(data) {
    try {
        var genres = [];
        data = JSON.parse(data).data;
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
                    duration:"",
                    is_live:false,
                    is_channel:false,
                    running:null,
                    starttime:null,
                    link:genres[k].link,
                    link_prefix:'<a href="categoryDetail.html?category=',
                    description:"",
                    thumb:null
                   });


    } catch(err) {
        Log("Dplay.decodeCategories Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
};

Dplay.decode = function(data, target, stripShow, completeFun, onlySave) {
    try {
        var Name;
        var Duration;
        var IsLive;
        var IsLiveText;
        var running;
        var starttime;
        var Link;
        var Description="";
        var ImgLink;
        var next = null;
        var AirDate;
        var Episode=null;

        Dplay.reset();
        if (target.url.match(/\/seasons\?/)) {
            return Dplay.decode_season(target.url, data, completeFun);
        }
        data = JSON.parse(data);
        if (data.data[0].reference) {
            Dplay.decode_shows(data.data);
        } else if (data.data[0].type == "show") {
            Dplay.decode_shows(data.data, null, target.tag=="allShows", target.tag=="allShows");
        } else {
            data = data.data;
            for (var k=0; k < data.length; k++) {
                Name = Dplay.determineEpisodeName(data[k]);
                if (!Dplay.isItemOk(Name, data[k]))
                    continue;
                if (data[k].widevineRequired)
                    continue;
                if (stripShow && data[k].episode_number) {
                    Description = data[k].title.trim();
                    Name        = "Avsnitt " + data[k].episode_number;
                } else if (!stripShow && data[k].show){
                    if (Name.indexOf(data[k].show.title) == -1) {
                        Name = data[k].show.title.trim() + " - " + Name;
                    }
                    Description = data[k].description.trim();
                }
                Duration = (data[k].duration)/1000;
                ImgLink = Dplay.fixThumb(data[k].thumbnail_image.file);
                AirDate = data[k].first_run;
                Link = Dplay.makeApiUrl("/videos/" + data[k].id);
                Episode = data[k].episode_number
                Dplay.other_result.push({name:Name, 
                                          episode:Episode,
                                          link:Link, 
                                          thumb:ImgLink, 
                                          duration:Duration, 
                                          description:Description,
                                          airDate:AirDate,
                                          isFollowUp:data[k].video_type.match(/FOLLOWUP/)
                                         }
                                        );
            }
        }
        data = null;
        if (stripShow) {
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
        if (onlySave)
            Dplay.reset();
        else 
            Dplay.resultToHtml();
    } catch(err) {
        Log("Dplay.decode Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
    if (completeFun)
        completeFun();
};

Dplay.decode_shows = function(data, query, sort, allShows) {
    try {
        var Link;
        var ImgLink;
        var showData;
        var Name;
        var Genres = [];
        var queryReqexp = (query && query.length == 1) ? new RegExp("^" + query, 'i') : null;

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
            if (query && Dplay.all_show_names.indexOf(Name) == -1) {
                // Not playable... Probably not applicable after DPLAY
                Log(Name +  ": queried show isn't playable.");
                continue;
            }
            for (var i=0; i < showData.genres.length; i++)
                Genres.push(showData.genres[i].id);
            Link = Dplay.makeApiUrl('/shows/' + showData.id + '/seasons');
            ImgLink = Dplay.fixThumb(showData.poster_image.file);
            Dplay.show_names.push(Name);
            Dplay.show_result.push({name:Name, thumb:ImgLink, link:Link, genres:Genres});
        }
        if (sort) {
            Dplay.show_result.sort(function(a, b) {
                if (a.name.toLowerCase() < b.name.toLowerCase()) {
                    return -1;
                } else {
                    return 1;
                }
            })
        };
        if (allShows) {
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
        Log("Dplay.decode_shows Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
};

Dplay.decode_season = function(targetUrl, data, completeFun) {
    try {
        var Name;
        var Link;
        var ImgLink;
        var seasons = [];
        var showId = targetUrl.match(/\/shows\/([0-9]+)\/seasons/)[1]
        data = JSON.parse(data).data;
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
            replaceLocation('showList.html?name=' + Link + '&history=' + getHistory(Name));
            return;
        }
        seasons.sort(function(a, b){
                if (a.season > b.season)
                    return -1;
                else
                    return 1
        });
        ImgLink = JSON.parse(syncHttpRequest(Dplay.makeApiUrl("/shows/" + showId)).data).data;
        ImgLink = Dplay.fixThumb(ImgLink.poster_image.file);
        for (var k=0; k < seasons.length; k++) {
            seasonToHtml(seasons[k].name, ImgLink, seasons[k].link);
        }
                     
    } catch(err) {
        Log("Dplay.decode_season Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
    if (completeFun)
        completeFun();
};

Dplay.decodeChannels = function(data) {

    var oldId = (Dplay.anySubChannel()) ? Dplay.channels[Dplay.channel_idx].id : null;
    var Name;
    Dplay.channels = [];
    data = JSON.parse(data).data;

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
        Dplay.channelToHtml(Name, k, Dplay.fixThumb(data[k].logo_image.file));
    }
};

Dplay.channelToHtml = function(name, idx, thumb) {
    if (thumb)
        thumb = thumb.replace(/c_fill,/,"");
    toHtml({name:name,
            duration:"",
            is_live:false,
            is_channel:false,
            running:null,
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
    try {
        data = JSON.parse(data.responseText).data;
        Name = Dplay.determineEpisodeName(data);
        Title = (data.episode_number) ? "Avsnitt " + data.episode_number : Name;
        if (data.show)
            Title = data.show.title.trim() + " - " + Title;
	DetailsImgLink = Dplay.fixThumb(data.thumbnail_image.file, DETAILS_THUMB_FACTOR);
        AirDate = data.first_run.replace(/T([0-9]+:[0-9]+).+/, " $1");
        VideoLength = dataLengthToVideoLength(null, (data.duration)/1000);
	Description = data.description.trim();
        if (data.available_until) {
            AvailDate = data.available_until.replace(/T([0-9]+:[0-9]+).+/, " $1");;
        }
        Details.duration = VideoLength;
        Details.startTime = 0;

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
            start_time    : 0,
            duration      : VideoLength,
            description   : Description,
            not_available : false,
            thumb         : DetailsImgLink
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
        DetailsImgLink = Dplay.fixThumb(data.poster_image.file, DETAILS_THUMB_FACTOR);
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

Dplay.getPlayUrl = function(streamUrl) {
    var videoUrl = "https://secure.dplay.se/secure/api/v2/user/authorization/stream/" + streamUrl.match(/\/videos\/([0-9]+)/)[1] + "?stream_type=hls";
    var countryCode = JSON.parse(syncHttpRequest("http://geo.dplay.se/geo.js").data).countryCode;
    var cookie = '{"countryCode":"' + countryCode + '","expiry":' + (getCurrentDate().getTime() + 3600*1000) + '}';
    cookie = 'dsc-geo='+encodeURIComponent(cookie);

    requestUrl(videoUrl,
               function(status, data)
               {
                   if (Player.checkPlayUrlStillValid(streamUrl)) {
                       var srtUrl = null;
                       try {
                           srtUrl = JSON.parse(syncHttpRequest(streamUrl).data).data.subtitles.sv.srt; 
                       } catch(err) {
                           srtUrl = null;
                       }
                       Resolution.getCorrectStream(JSON.parse(data.responseText).hls, false, srtUrl, true);
                   }
               },
               {cookie:cookie}
              );
};

Dplay.fixThumb = function(thumb, factor) {
    height = (factor) ? Math.floor(factor*THUMB_HEIGHT) : THUMB_HEIGHT;
    width  = (factor) ? Math.floor(factor*THUMB_WIDTH)  : THUMB_WIDTH;
    if (thumb)
        thumb = "http://a3.res.cloudinary.com/dumrsasw1/image/upload/c_fill,h_" + height + ",w_" + width + "/" + thumb;
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
    if (!Dplay.anySubChannel())
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

Dplay.isItemOk = function(Name, data, genre) {
    if (!Dplay.isPlayable(Name, data)) {
        // alert(Name + ": Premium");
        return false;
    }
    if (!Dplay.isCorrectChannel(Name, data)) {
        // alert(Name + ": wrong channel");
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
                is_live:false,
                is_channel:false,
                running:null,
                starttime:null,
                link:Dplay.other_result[k].link,
                link_prefix:'<a href="details.html?ilink=',
                description:Dplay.other_result[k].description,
                thumb:Dplay.other_result[k].thumb
               });
    };
};