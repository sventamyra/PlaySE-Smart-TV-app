var TV4_DETAILS_IMG_SIZE="600x336";
var Tv4 =
{
    result:[],
    unavailableShows:[],
    updatingUnavailableShows:false
};

Tv4.fetchUnavailableShows = function() {
    if (Config.read("tv4DrmShows"))
        Config.remove("tv4DrmShows");
    var savedShows = Config.read("tv4UnavailableShows");
    var days = 24*3600*1000;
    var tsDiff = (savedShows) ? (getCurrentDate().getTime()-savedShows.ts)/days : null;
    if (savedShows && tsDiff < 7 && tsDiff >= 0) {
        Tv4.unavailableShows = savedShows.shows.split(";");
        Log("Found saved unavailable shows, Days:" + Math.floor(tsDiff) + " length:" + Tv4.unavailableShows.length);
    } else {
        Tv4.refreshdUnavailableShows();
    }
}

Tv4.refreshdUnavailableShows = function() {
    if (Tv4.updatingUnavailableShows)
        // Already updating
        return;
    Tv4.updatingUnavailableShows = true;
    httpRequest(Tv4.getUrl("allShows"),
                {cb:function(data) {
                    Tv4.unavailableShows = [];
                    data = JSON.parse(data);
                    var i = 0;
                    return Tv4.checkShows(i, data.results);
                },
                 no_log:true, 
                 not_random:true
                });
};

Tv4.checkShows = function(i, data) {
    if (i < data.length)
    {
        httpRequest(Tv4.getUrl("episodes") + data[i].nid,
                    {cb:function(episode) {
                        episode = JSON.parse(episode).results;
                        var anyViewable = false;
                        for (var k=0; k < episode.length; k++) {
                            if (Tv4.isViewable(episode[k])) {
                                anyViewable = true
                                break;
                            }
                        }
                        if (!anyViewable) {
                            Tv4.unavailableShows.push(data[i].nid)
                        }
                        return Tv4.checkShows(i+1, data);
                    },
                     no_log:true, 
                     not_random:true
                    });
    }
    else {
        Log("Saving unavailable shows, length:" + Tv4.unavailableShows.length);
        Config.save("tv4UnavailableShows", {ts:getCurrentDate().getTime(), shows:Tv4.unavailableShows.join(";")});
        Tv4.updatingUnavailableShows = false;
        data = null;
    }
}

Tv4.getUrl = function(name) {
    var type = "episode"
    var drm = (deviceYear > 2011) ? "" : "&is_drm_protected=false"
    switch (name)
    {
    case "main":
        Tv4.fetchUnavailableShows();
    case "PopularClips.html":
        if (name == "PopularClips.html") {
            document.title = 'Populära Klipp'; 
            type = "clip"
        }
        return 'http://webapi.tv4play.se/play/video_assets/most_viewed?page=1&is_live=false&platform=web&per_page=100&sort_order=desc&is_premium=false&type=' + type + drm;
        break;

    case "live":
        var startDate = getCurrentDate();
        var endDate   = getCurrentDate();
        endDate.setDate(startDate.getDate() + 4);
        return 'http://webapi.tv4play.se/play/video_assets?broadcast_from' + dateToString(startDate) + '&broadcast_to=' + dateToString(endDate) + '&is_live=true&platform=web&sort=broadcast_date_time&sort_order=asc&per_page=100'
        break;

    case "categories":
        return 'http://webapi.tv4play.se/play/categories'
        break;

    case "categoryDetail":
        return 'http://webapi.tv4play.se/play/programs?per_page=1000&page=1&is_premium=false&category='
        break;

    case "allShows":
        return 'http://webapi.tv4play.se/play/programs?per_page=1000&page=1&is_premium=false'
        break;

    case "clips":
        type = "clip"
    case "episodes":
        return 'http://webapi.tv4play.se/play/video_assets?is_live=false&page=1&per_page=250&platform=web&is_premium=false&type=' + type + drm + '&node_nids='
        break;

    case "Latest.html":
    case "LatestClips.html":
        if (name == "LatestClips.html") {
            document.title = 'Senaste Klipp'; 
            type = "clip"
        } else {
            document.title = 'Senaste';
        }
        var endDate = getCurrentDate();
        endDate.setDate(endDate.getDate() + 1)
        var startDate = getCurrentDate();
        startDate.setDate(startDate.getDate() - 7);
        return 'http://webapi.tv4play.se/play/video_assets?is_live=false&platform=web&is_premium=false&premium=false&sort=broadcast_date_time&sort_order=desc&per_page=100&broadcast_from=' + dateToString(startDate) + '&broadcast_to=' + dateToString(endDate) + '&type=' + type + drm;
        break;

    case "queryShow":
        return 'http://webapi.tv4play.se/play/programs?per_page=100&platform=web&is_premium=false&q='

    case "query":
        return 'http://webapi.tv4play.se/play/video_assets?is_live=false&per_page=200&is_premium=false&platform=web' + drm + '&q='

    default:
        return name;
        break;
    }
};

Tv4.search = function(query, completeFun) {

    requestUrl(Tv4.getUrl("queryShow") + query,
               function(status, data)
               {
                   Tv4.decode_shows(data.responseText, query);
                   data = null;
                   if (query.length > 1)
                       requestUrl(Tv4.getUrl("query") + query,
                                  function(status, data)
                                  {
                                      Tv4.decode(data.responseText, false, false, completeFun);
                                      data = null;
                                      if (completeFun)
                                          completeFun();
                                  }
                                 );
                   else if (completeFun)
                       completeFun();
               }
              )
};

Tv4.getHeaderPrefix = function() {
    return "Tv4";
}

Tv4.keyRed = function() {
    if ($("#a-button").text().match(/Pop.*lip/)) {
	setLocation('PopularClips.html');
    } else if ($("#a-button").text().match(/lip/)) {
	setLocation('LatestClips.html');
    } else if ($("#a-button").text().match(/Pop/)) {
	setLocation('index.html');
    } else {
	setLocation('Latest.html');
    }
}

Tv4.getAButtonText = function(language) {

    var loc = getIndexLocation();
    
    if (loc.match(/index\.html/)) {
        if(language == 'English'){
	    return 'Latest';
        } else {
	    return 'Senaste';
        }
    } else if (loc.match(/Latest\.html/)) {
        if(language == 'English'){
	    return 'Popular Clips';
        } else {
	    return 'Populära Klipp';
        }
    } else if (loc.match(/PopularClips\.html/)) {
        if(language == 'English'){
	    return 'Latest Clips';
        } else {
	    return 'Senaste Klipp';
        }
    } else {
        // Use Default
        return null;
    }
};

Tv4.getCButtonText = function (language) {
    if(language == 'English')
	return 'Live broadcasts';
    else
        return 'Livesändningar';
};

Tv4.decode = function(data, stripShow, isClip, completeFun) {
    try {
        var Name;
        var Duration;
        var IsLive;
        var IsLiveText;
        var IsRunning;
        var starttime;
        var Link;
        var Description;
        var ImgLink;
        var next = null;
        var AirDate;
        var Season=null;
        var Episode=null;

        Tv4.result = [];
        data = JSON.parse(data).results;

        for (var k=0; k < data.length; k++) {
            Name = data[k].title.trim();
            IsLive = data[k].is_live;
            if (!Tv4.isViewable(data[k], IsLive))
                // Premium/DRM
                continue;

            starttime = (IsLive) ? timeToDate(data[k].broadcast_date_time) : null;
            IsRunning = IsLive && starttime && (getCurrentDate() > starttime);

            if (stripShow) {
                Name = Name.replace(data[k].program.name,"").replace(/^[,. :\-]*/,"").trim();
                if (data[k].season)
                    Name = "Säsong " + data[k].season + " - " + Name;
                else
                    Name = Name.replace(/^./,Name[0].toUpperCase());
            }
            ImgLink = Tv4.fixThumb(data[k].image); 
            Duration = data[k].duration;
            Description = (data[k].description) ? data[k].description.trim() : "";
            Link = "http://webapi.tv4play.se/play/video_assets?id=" +  data[k].id;
            AirDate = data[k].broadcast_date_time;
            Season = (data[k].season) ? data[k].season : null;
            Episode = (data[k].episode) ? data[k].episode : null;
            Tv4.result.push({name:Name, 
                             season:Season,
                             episode:Episode,
                             link:Link, 
                             thumb:ImgLink, 
                             duration:Duration, 
                             description:Description,
                             airDate:AirDate,
                             link_prefix:'<a href="details.html?ilink=',
                             is_live:IsLive,
                             starttime:starttime,
                             is_running:IsRunning
                            }
                           );
        }
       
        if (stripShow) {
            Tv4.result.sort(function(a, b){
                if (!a.episode || !b.episode)
                    return Tv4.sortOnAirDate(a, b)

                if (a.season == b.season) {
                    if (a.episode == b.episode) {
                        return Tv4.sortOnAirDate(a, b)
                    } else if (!b.episode || +a.episode > +b.episode) {
                        return -1
                    } else {
                        return 1
                    }
                } else if (!b.season || +a.season > +b.season) {
                    return -1
                } else
                    return 1
            })
        };

        for (var k=0; k < Tv4.result.length; k++) {
            if (!Tv4.result[k].link_prefix) {
                showToHtml(Tv4.result[k].name,
                           Tv4.result[k].thumb,
                           Tv4.result[k].link
                          );
            } else {
                
                toHtml({name:Tv4.result[k].name,
                        duration:Tv4.result[k].duration,
                        is_live:Tv4.result[k].is_live,
                        is_channel:false,
                        is_running:Tv4.result[k].is_running,
                        starttime:Tv4.result[k].starttime,
                        link:Tv4.result[k].link,
                        link_prefix:Tv4.result[k].link_prefix,
                        description:Tv4.result[k].description,
                        thumb:Tv4.result[k].thumb
                       });
            }
	}
        if (stripShow && !isClip) {
            var clips_url;
            if (data.length > 0) {
                clips_url = Tv4.getUrl("clips") + data[0].program.nid;
            } else {
                clips_url = getLocation().replace(/.+(http.+)&history.+/, "$1")
                clips_url = clips_url.replace("episode", "clips")
            }
            var data = JSON.parse(httpRequest(clips_url+"&per_page=1", {sync:true}).data);
            if (data.total_hits > 0) {
                clipToHtml(Tv4.fixThumb(data.results[0].program.program_image),
                           clips_url
                          )
            }
        }
        data = null;
        Tv4.result = [];
    } catch(err) {
        Log("Tv4.decode Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
    if (completeFun)
        completeFun();
};

Tv4.sortOnAirDate = function(a,b) {
    if (a.airDate > b.airDate)
        return -1
    else
        return 1
}

Tv4.decodeCategories = function(data) {
    try {
        var Name;
	var Link;

        data = JSON.parse(data);

        for (var k=0; k < data.length; k++) {
            Name = data[k].name;
	    Link = Tv4.getUrl("categoryDetail") + data[k].nid;
            toHtml({name:Name,
                    link:Link,
                    link_prefix:'<a href="categoryDetail.html?category=',
                    thumb:null
                   });
	}
	data = null;
    } catch(err) {
        Log("Tv4.decodeCategories Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
};

Tv4.decode_shows = function(data, query, completeFun) {
    try {
        var Name;
        var Link;
        var ImgLink;
        var next = null;
        var checkSeasons=false;
        var json = null;
        var queryTest = (query && query.length == 1) ? new RegExp("^" + query, 'i') : null;

        Tv4.result = [];
        data = JSON.parse(data).results;
        for (var k=0; k < data.length; k++) {
            Name = data[k].name;
            if (queryTest && !queryTest.test(Name))
                continue;
            if (Tv4.unavailableShows.indexOf(data[k].nid) != -1)
                // Only drm/premium episodes
                continue;
            ImgLink = Tv4.fixThumb(data[k].program_image);
            Link = Tv4.getUrl("episodes") + data[k].nid
            Tv4.result.push({name:Name, link:Link, thumb:ImgLink});
        }
        data = null;

        if (!query || queryTest) {
            Tv4.result.sort(function(a, b) {
                if (a.name.toLowerCase() > b.name.toLowerCase())
                    return 1
                else
                    return -1
            });
        }

        for (var k=0; k < Tv4.result.length; k++) {
            showToHtml(Tv4.result[k].name,
                       Tv4.result[k].thumb,
                       Tv4.result[k].link
                      );
        }
        Tv4.result = [];
    } catch(err) {
        Log("Tv4.decode_shows Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
    if (completeFun)
        completeFun();
};

Tv4.getDetailsData = function(url, data) {

    if (url.match(/\?nids=/))
        return Tv4.getShowData(url,data);

    var Name="";
    var Title = Name;
    var DetailsImgLink="";
    var AirDate="";
    var VideoLength = "";
    var AvailDate=null;
    var Description="";
    var onlySweden="";
    var isChannel=false;
    var NotAvailable=false;
    var isLive=false;
    var Show=null;
    try {

        data = JSON.parse(data.responseText).results[0];

        Name = data.title;
        Title = Name;
	DetailsImgLink = Tv4.fixThumb(data.image, TV4_DETAILS_IMG_SIZE);
        Description  = (data.description) ? data.description.trim() : "";
        AirDate = timeToDate(data.broadcast_date_time);
        VideoLength = dataLengthToVideoLength(null, data.duration);
        isLive = data.is_live;
        AvailDate = data.availability.human.match(/\(([^)]+ dag[^) ]+)/);
        AvailDate = (AvailDate) ? AvailDate[1] : data.availability.availability_group_free + ' dagar'
        AvailDate = (AvailDate.match(/dagar$/)) ? AvailDate + " kvar" : AvailDate;
        if (data.expire_date_time)
            AvailDate = dateToString(timeToDate(data.expire_date_time),"-") + ' (' + AvailDate + ')';
        
        if (isLive) {
            NotAvailable = ((AirDate - getCurrentDate()) > 60*1000);
        } else {
            NotAvailable = false;
        }
        if (data.program && !data.program.is_premium && Tv4.unavailableShows.indexOf(data.program.nid) == -1) {
            Show = {name : data.program.name,
                    // Will fail if there's only clips...
                    url  : Tv4.getUrl("episodes") + data.program.nid
                   }
        }
    } catch(err) {
        Log("Tv4.getDetailsData Exception:" + err.message);
        Log("Name:" + Name);
        Log("AirDate:" + AirDate);
        Log("AvailDate:" + AvailDate);
        Log("VideoLength:" + VideoLength);
        Log("Description:" + Description);
        Log("NotAvailable:" + NotAvailable);
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
            not_available : NotAvailable,
            thumb         : DetailsImgLink,
            parent_show   : Show
    }
};

Tv4.getShowData = function(url, data) {
    var Name="";
    var Genre = [];
    var DetailsImgLink="";
    var Description="";

    try {

        data = JSON.parse(data.responseText)[0];
        Name = data.name;
        Description = data.description.trim();
	DetailsImgLink = Tv4.fixThumb(data.program_image, TV4_DETAILS_IMG_SIZE);
        for (var i=0; i < data.genres.length; i++) {
            Genre.push(data.genres[i])
        }
        Genre = Genre.join('/');
    } catch(err) {
        Log("Tv4.getShowData exception:" + err.message);
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

Tv4.getDetailsUrl = function(streamUrl) {
    if (streamUrl.match(/&node_nids=/))
        return 'http://webapi.tv4play.se/play/programs?nids=' + streamUrl.replace(/.+&node_nids=([^&]+).*/, "$1");
    else
        return streamUrl;
};

Tv4.getPlayUrl = function(streamUrl, isLive) {

    var reqUrl = streamUrl.replace(/.*\?id=([^&]+).*/, "http://prima.tv4play.se/api/web/asset/$1/play.json?protocol=hls3&videoFormat=mp4+ism+webvtt+livehls");

    requestUrl(reqUrl,
               function(status, data)
               {
                   if (Player.checkPlayUrlStillValid(streamUrl)) {
                       var stream=null, license=null, srtUrl=null;
                       data = JSON.parse(data.responseText).playback.items.item;
                       if (data.length == undefined)
                           data = [data]
                       for (var i = 0; i < data.length; i++) {
                           if (data[i].mediaFormat == "webvtt") {
                               srtUrl = data[i].url
                           } else if (!stream && data[i].mediaFormat == "ism") {
                               stream = data[i].url
                               for (var key in data[i].license) {
                                   if (key.match(/uri/)) {
                                       license = data[i].license[key];
                                       if (!license.match(/^http/))
                                           license = "https://prima.tv4play.se" + license
                                       break
                                   }
                               }
                           } else if (data[i].mediaFormat == "mp4" ||
                                      data[i].mediaFormat == "livehls") {
                               stream = data[i].url
                           }
                       }
                       if (!stream) {
                           $('.bottomoverlaybig').html('Not Available!');
                       } else {
                           Resolution.getCorrectStream(stream, srtUrl, {license:license});
                       }
                   }
               }
              );
}

Tv4.fixThumb = function(thumb, size) {
    if (!size) {
        size = THUMB_WIDTH + "x" + THUMB_HEIGHT;
    }
    return "https://img3.tv4cdn.se/?format=jpeg&quality=80&resize=" + size + "&retina=false&shape=cut&source=" + thumb;
};

Tv4.isViewable = function (data, is_live) {
    if (data.is_premium || (data.availability.availability_group_free == "0" || !data.availability.availability_group_free || (data.is_drm_protected && deviceYear < 2012)))
        return false;
    else {
        if (is_live) {
            // We want to see what's ahead...
            return true;
        } else {
            return getCurrentDate() > timeToDate(data.broadcast_date_time);
        }
    }
}

Tv4.requestNextPage = function(url, callback) {
    requestUrl(url,callback,callback);
}
