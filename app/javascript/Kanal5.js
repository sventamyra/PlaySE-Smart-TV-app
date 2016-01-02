var Kanal5 =
{
    channel_idx:null,
    channels:[{name:"Kanal 5", prefix:"kanal5"}, 
              {name:"Kanal 9", prefix:"kanal9"},
              {name:"Kanal 11", prefix:"kanal11"}
             ],
    current_idx:0,
    all_shows:[],
    all_show_names:[],
    show_names:[],
    episodes:[],
    show_result:[],
    other_result:[]
};

Kanal5.resetSubChannel = function() {
    Kanal5.channel_idx = null;
    Kanal5.all_shows = [];
    Kanal5.all_show_names = [];
    Kanal5.reset();
}

Kanal5.anySubChannel = function() {
    return Kanal5.channel_idx != null;
}

Kanal5.reset = function() {
    Kanal5.show_names = [];
    Kanal5.episodes = [];
    Kanal5.show_result = [];
    Kanal5.other_result = [];
    Kanal5.current_idx = 0;
}

Kanal5.getUrl = function(name, new_channel) {
    if (new_channel != undefined && Kanal5.channel_idx != new_channel) {
        Kanal5.resetSubChannel();
        if (new_channel != "reset")
            Kanal5.channel_idx = new_channel;
        // Force new channel name
        Header.display(document.title);
    }
    var url;

    switch (name)
    {
    case "main":
        return Kanal5.makeApiUrl('getMobileStartContent?format=IPHONE');
        break;

    case "Latest.html":
        document.title = 'Senaste';
        return Kanal5.makeApiUrl('getMobileStartContent?format=IPHONE');
        break;

    case "channels":
        return 'http://playapi.mtgx.tv/v3/channels?country=se'
        break;

    case "allShows":
        return Kanal5.getAllShowsUrl();
        break;
    default:
        url = name;
        break;
    }
    return Kanal5.addChannel(url)
};

Kanal5.getNextUrl = function(url) {
    if (!Kanal5.channel_idx && ++Kanal5.current_idx < Kanal5.channels.length) {
        return url.replace(/.+kanal[0-9]+play\.se\//, Kanal5.getPrefix(Kanal5.current_idx));
    }
    return null
}

Kanal5.getAllShowsUrl = function() {
    return Kanal5.makeApiUrl('getMobileFindProgramsContent?format=IPHONE');
}

Kanal5.getAllShows = function(completeFun) {
    Kanal5.reset();
    if (Kanal5.all_shows.length == 0) {
        url = Kanal5.getAllShowsUrl();
        requestUrl(url,
                   function(status, data)
                   {
                       Kanal5.decode(data.responseText, {tag:"allShows",url:url}, false, completeFun);
                       data = null;
                   }
                  );
    } else {
        Kanal5.show_result = Kanal5.all_shows
        Kanal5.resultToHtml();
        if (completeFun)
            completeFun();
    }
};

Kanal5.makeApiUrl = function(suffix) {
    if (suffix.match(/^play/))
        return Kanal5.getPrefix(Kanal5.channel_idx) + suffix;
    return Kanal5.getPrefix(Kanal5.channel_idx) + 'api/' + suffix;
};

Kanal5.getPrefix = function(channel_idx) {
    var Name = channel;
    if (channel_idx)
        Name = Kanal5.channels[channel_idx].prefix;
    return 'http://www.' + Name + 'play.se/'
};

Kanal5.addChannel = function(url) {
    if (Kanal5.anySubChannel())
        return url + "&channel=" + Kanal5.channels[Kanal5.channel_idx].id;
    return url;
};

Kanal5.search = function(query, completeFun, isNext, url) {
    if (!isNext) {
        Kanal5.reset()
        url = Kanal5.makeApiUrl('publicSearch?query=' + query);
    }
    var next = Kanal5.getNextUrl(url)
    // Search result for shows also contains "unplayable" shows, so first fetch all shows and we filter from that.
    if (Kanal5.all_show_names.length == 0)
    {
        Kanal5.getAllShows(function() 
                           {
                               Kanal5.reset();
                               $('#topRow').html("");
                               $('#bottomRow').html("");
                               Kanal5.search(query, completeFun, true, url)
                           }
                          );
    } else {
        if (query.length > 1) {
            requestUrl(url,
                       function(status, data)
                       {
                           data = JSON.parse(data.responseText);
                           Kanal5.decode_show(data.programs, query, !next);
                           if (query.length > 1)
                               Kanal5.decode_search_hits(data.videos);
                           data = null;
                       },
                       null,
                       function(status, data)
                       {
                           if (next)
                               return Kanal5.search(query, completeFun, true, next);
                           Kanal5.finishSearch(completeFun)
                       }
                      );
        } else {
            var queryReqexp = (query && query.length == 1) ? new RegExp("^" + query, 'i') : null;
            Kanal5.show_result = [];
            for (var k=0; k < Kanal5.all_shows.length; k++) {
                if (!queryReqexp.test(Kanal5.all_shows[k].name))
                    continue;
                Kanal5.show_result.push(Kanal5.all_shows[k]);
            }
            Kanal5.finishSearch(completeFun)
        }
    }
};

Kanal5.finishSearch = function (completeFun) {
    Kanal5.resultToHtml();
    if (completeFun)
        completeFun();
};

Kanal5.getCurrentLocation = function() {
    var myNewLocation = myLocation;
    if (detailsOnTop)
        myNewLocation = getOldLocation();
    return myNewLocation;
}

Kanal5.updateCategoryTitle = function() {
    document.title = "Alla Program";
};

Kanal5.getHeaderPrefix = function() {
    if (!Kanal5.channel_idx)
        return "Kanal 5-9-11";
    else {
        return Kanal5.channels[Kanal5.channel_idx].name;
    }
};

Kanal5.fixAButton = function(language) {
    if ((myRefreshLocation && (myRefreshLocation.indexOf("index.html")) != -1) || myLocation.indexOf("index.html") != -1) {
        if(language == 'English'){
	    $("#a-button").text('Latest');
        } else {
	    $("#a-button").text('Senaste');
        }
    } else {
        if(language == 'English'){
	    $("#a-button").text('Popular');
        } else {
	    $("#a-button").text('Populärt');
        }
    }
};

Kanal5.getBButtonText = function(language) {

    if (language == "Swedish")
        $("#b-button").text("Alla Program");
    else
        $("#b-button").text("All Shows");
};

Kanal5.getCButtonText = function (language) {
    if(language == 'English')
	return 'Channels';
    else
        return 'Kanaler';
};

Kanal5.decode_search_hits = function(data) {
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
            
            if (data[k].premium || data[k].widevineRequired)
                continue;
            if (Kanal5.show_names.indexOf(data[k].programName.trim()) != -1)
                continue;
            if (Kanal5.episodes.indexOf(data[k].id) != -1)
                continue;
            Kanal5.episodes.push(data[k].id);
            Name = data[k].programName.trim() + " - " + data[k].name.trim();;
            Description = data[k].description.trim();
            Duration = (data[k].videoLength)/1000;
            ImgLink = Kanal5.fixThumb(data[k].image);
            AirDate = data[k].date;
            Link = Kanal5.makeApiUrl('getVideo?videoId=' + data[k].id + "&format=IPHONE");
            Kanal5.other_result.push({name:Name, 
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
        Log("Kanal5.decode_search_hits Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
};

Kanal5.decode = function(data, target, stripShow, completeFun, isNext) {
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
        var sortNewest=false;

        if (!isNext) {
            Kanal5.reset()
        }

        if (target.url.match(/\/getMobileProgramContent/)) {
            return Kanal5.decode_season(data,completeFun);
        }
        data = JSON.parse(data);

        next = Kanal5.getNextUrl(target.url);
        if (data.programsWithTemperatures) {
            Kanal5.decode_show(data.programsWithTemperatures, null, !next, target.tag=="allShows");
        } else if (target.tag == "main") {
            Kanal5.decode_show(data.hottestPrograms);
        } else {
            if (data.newEpisodeVideos) {
                sortNewest = true;
                data = data.newEpisodeVideos;
            } else {
                stripShow = true;
                data = data.episodes;
            }
            for (var k=0; k < data.length; k++) {
                if (data[k].premium || data[k].widevineRequired)
                    continue;
                if (Kanal5.episodes.indexOf(data[k].id) != -1)
                    continue;
                Kanal5.episodes.push(data[k].id);
                Name = data[k].episodeText.trim();;
                Description = data[k].title.trim();
                if (!stripShow) {
                    Name = data[k].program.name.trim() + " - " + Name;
                }
                Duration = (data[k].length)/1000;
                ImgLink = Kanal5.fixThumb(data[k].posterUrl);
                AirDate = data[k].shownOnTvDateTimestamp;
                Link = Kanal5.makeApiUrl('getVideo?videoId=' + data[k].id + "&format=IPHONE");
                Episode = data[k].episodeNumber
                Kanal5.other_result.push({name:Name, 
                                          episode:Episode,
                                          link:Link, 
                                          thumb:ImgLink, 
                                          duration:Duration, 
                                          description:Description,
                                          airDate:AirDate,
                                          isFollowUp:data[k].type.match(/FOLLOWUP/)
                                         }
                                        );
            }
        }
        data = null;

       
        if (stripShow) {
            Kanal5.other_result.sort(function(a, b){
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
        } else if (next) {
            return Kanal5.requestNextPage(next, function(status, nextData) {
                Kanal5.decode(nextData.responseText, {tag:target.tag,url:next}, stripShow, completeFun, true);
            });
        } else if (sortNewest) {
            Kanal5.other_result.sort(function(a, b){
                if (a.airDate > b.airDate)
                    return -1
                else 
                    return 1
            })
        };
        Kanal5.resultToHtml();
    } catch(err) {
        Log("Kanal5.decode Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
    if (completeFun)
        completeFun();
};

Kanal5.decode_show = function(data, query, sort, allShows) {
    try {
        var Link;
        var ImgLink;
        var showData;
        var Name;
        var queryReqexp = (query && query.length == 1) ? new RegExp("^" + query, 'i') : null;

        for (var k=0; k < data.length; k++) {
            showData = data[k];
            if (showData.program)
                showData = showData.program;
            if (showData.premium || showData.playableMobileEpisodesCount == 0 || showData.playableEpisodesCount == 0)
                continue
            Link = Kanal5.makeApiUrl('getMobileProgramContent?programId=' + showData.id);
            ImgLink = showData.photoWithLogoUrl;
            if (!ImgLink)
                ImgLink = showData.photoUrl;
            if (!ImgLink)
                ImgLink = showData.image;
            ImgLink = Kanal5.fixThumb(ImgLink);
            Name = showData.name.trim();
            if (Kanal5.show_names.indexOf(Name) != -1)
                continue;
            if (queryReqexp && !queryReqexp.test(Name))
                continue;
            if (query && Kanal5.all_show_names.indexOf(Name) == -1)
                // Not playable...
                continue;
            Kanal5.show_names.push(Name);
            Kanal5.show_result.push({name:Name, thumb:ImgLink, link:Link});
        }

        if (sort) {
            Kanal5.show_result.sort(function(a, b) {
                if (a.name.toLowerCase() < b.name.toLowerCase()) {
                    return -1;
                } else {
                    return 1;
                }
            })
        };
        if (allShows) {
            Kanal5.all_show_names = Kanal5.show_names;
            Kanal5.all_shows      = Kanal5.show_result;
        }
        data = null;
    } catch(err) {
        Log("Kanal5.decode_show Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
};

Kanal5.decode_season = function(data, completeFun) {
    try {
        var Name;
        var Link;
        var ImgLink;
        var seasons;

        data = JSON.parse(data);
        data = data.program;
        if (data.seasonNumbersWithContent) {
            for (var k=0; k < data.seasonNumbersWithContent.length; k++) {
                Link = Kanal5.makeApiUrl('getMobileSeasonContent?programId=' + data.id + '&seasonNumber=' + data.seasonNumbersWithContent[k] + '&format=IPHONE');
                Name = "Säsong " + data.seasonNumbersWithContent[k];

                if (data.seasonNumbersWithContent.length == 1) {
                    replaceLocation('showList.html?name=' + Link + '&history=' + getHistory(Name));
                    return;
                }
                ImgLink = data.photoWithLogoUrl;
                if (!ImgLink)
                    ImgLink = data.photoUrl;
                ImgLink = Kanal5.fixThumb(ImgLink);
                seasonToHtml(Name, ImgLink, Link);
            }
        }
        data = null;
    } catch(err) {
        Log("Kanal5.decode_season Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
    if (completeFun)
        completeFun();
};

Kanal5.decodeChannels = function() {

    for (var k=0; k < Kanal5.channels.length; k++) {
        if (Kanal5.channel_idx != null) {
            if (k == 0)
                Kanal5.channelToHtml("Kanal 5-9-11", "reset");
            if (k == Kanal5.channel_idx) {
                continue;
            }
        }
        Kanal5.channelToHtml(Kanal5.channels[k].name, k);
    }
};

Kanal5.channelToHtml = function(name, idx) {
    toHtml({name:name,
            duration:"",
            is_live:false,
            is_channel:false,
            running:null,
            starttime:null,
            link:idx,
            link_prefix:'<a href="index.html?kanal5_channel=',
            description:"",
            thumb:""
           });
};

Kanal5.getDetailsData = function(url, data) {

    if (url.match(/\/getMobileProgramContent/))
        return Kanal5.getShowData(url,data);

    var Name="";
    var Title = Name;
    var DetailsImgLink="";
    var AirDate="";
    var AvailDate=null;
    var VideoLength = "";
    var Description="";
    try {

        data = JSON.parse(data.responseText);

        Name = data.title.trim();
        Title = (data.program.name + " - " + data.episodeText).trim();
	DetailsImgLink = data.posterUrl;
        AirDate = data.shownOnTvTime;
        VideoLength = dataLengthToVideoLength(null, (data.length)/1000);
	Description = data.description.trim();
        if (data.playableUntilTimestamp) {
            AvailDate = new Date(+data.playableUntilTimestamp);
            AvailDate = dateToString(AvailDate,"-");
        }
        Details.duration = VideoLength;
        Details.startTime = 0;

    } catch(err) {
        Log("Kanal5.getDetailsData Exception:" + err.message);
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

Kanal5.getShowData = function(url, data) {
    var Name="";
    var DetailsImgLink="";
    var Description="";

    try {

        data = JSON.parse(data.responseText).program;
        Name = data.name;
	DetailsImgLink = data.photoUrl+"=s600";
        Description = data.description.trim();

    } catch(err) {
        Log("Kanal5.getShowData exception:" + err.message);
        Log("Name:" + Name);
        Log("Description:" + Description);
        Log("DetailsImgLink:" + DetailsImgLink);
    }
    data = null;
    return {show          : true,
            name          : Name,
            description   : Description,
            genre         : "",
            thumb         : DetailsImgLink
           };
};

Kanal5.getDetailsUrl = function(streamUrl) {
    return streamUrl
};

Kanal5.getPlayUrl = function(streamUrl) {
    requestUrl(streamUrl,
               function(status, data)
               {
                   if (Player.checkPlayUrlStillValid(streamUrl)) {
                       var srtUrl = null;
                       
                       data = JSON.parse(data.responseText);
                       if (data.hasSubtitle)
                           srtUrl = streamUrl.replace(/api\/.+videoId=([0-9]+).*/,"api/subtitles/$1")
                       Resolution.getCorrectStream(data.streams[0].source, false, srtUrl);
                   }
               });
}

Kanal5.fetchSubtitle = function (srtUrl) {
    asyncHttpRequest(srtUrl,
                     function(data) {
                         Kanal5.parseSubtitles(JSON.parse(data));
                     }
                    );
};

Kanal5.parseSubtitles = function (data) {

    subtitles = [];
    for (var i=0; i<data.length; i++) {
        subtitles.push(
            {
                start: data[i].startMillis,
                stop:  data[i].endMillis,
                text:  data[i].text.replace(/\r?\n/, "<br />").replace(/<br \/>$/, "")
            }
        )
    };
    // for (var i = 0; i < 10 && i < subtitles.length; i++) {
    //     alert("start:" + subtitles[i].start + " stop:" + subtitles[i].stop + " text:" + subtitles[i].text);
    // };
};

Kanal5.requestNextPage = function(url, callback) {
    requestUrl(url,callback,callback);
}

Kanal5.fixThumb = function(thumb) {
    if (thumb)
        thumb = thumb + "=s" + THUMB_WIDTH;
    return thumb
}


Kanal5.resultToHtml = function() {
    for (var k=0; k < Kanal5.show_result.length; k++) {
        showToHtml(Kanal5.show_result[k].name, 
                   Kanal5.show_result[k].thumb, 
                   Kanal5.show_result[k].link);
    };
    Kanal5.show_result = [];
    for (var k=0; k < Kanal5.other_result.length; k++) {
        toHtml({name:Kanal5.other_result[k].name,
                duration:Kanal5.other_result[k].duration,
                is_live:false,
                is_channel:false,
                running:null,
                starttime:null,
                link:Kanal5.other_result[k].link,
                link_prefix:'<a href="details.html?ilink=',
                description:Kanal5.other_result[k].description,
                thumb:Kanal5.other_result[k].thumb
               });
    };
};