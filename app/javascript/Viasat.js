var VIASAT_DETAILS_IMG_SIZE="600x338";
var Viasat =
{
    channel_idx:null,
    channels:[],
    shows:[],
    result:[]
};

Viasat.anySubChannel = function() {
    return Viasat.channel_idx != null;
}

Viasat.resetSubChannel = function() {
    Viasat.channel_idx = null;
    Viasat.shows = [];
}

Viasat.getUrl = function(name, new_channel) {
    var url;
    if (new_channel != undefined && Viasat.channel_idx != new_channel) {
        Viasat.resetSubChannel();
        if (new_channel != "reset")
            Viasat.channel_idx = new_channel;
        // Force new channel name
        Header.display(document.title);
    }
    switch (name)
    {
    case "main":
        url = 'http://playapi.mtgx.tv/v3/sections?sections=videos.popular&device=mobile&premium=open&country=se';
        break;

    case "channels":
        return 'http://playapi.mtgx.tv/v3/channels?country=se'
        break;

    case "categories":
        switch (Viasat.getCategoryIndex().current) {
        case 0:
            url = 'http://playapi.mtgx.tv/v3/categories?device=mobile&premium=open&country=se&order=name'
            break;
        case 1:
            url = 'http://playapi.mtgx.tv/v3/collections?device=mobile&premium=open&country=se'
            break;
        case 2:
            return Viasat.getAllShowsUrl();
            break;
        }
        break;

    case "Latest.html":
        document.title = 'Senaste';
        url = 'http://playapi.mtgx.tv/v3/sections?sections=videos.latest&device=mobile&premium=open&country=se'
        break;

    case "LatestClips.html":
        document.title = 'Senaste Klipp';
        url = 'http://playapi.mtgx.tv/v3/sections?sections=videos.latest_clips&device=mobile&premium=open&country=se'
        break;
    default:
        url = name.replace("https:", "http:");
        break;
    }
    return Viasat.addChannel(url)
};

Viasat.getAllShowsUrl = function() {
    return Viasat.addChannel('http://playapi.mtgx.tv/v3/formats?device=mobile&premium=open&country=se');
}

Viasat.addChannel = function(url) {
    if (Viasat.anySubChannel())
        return url + "&channel=" + Viasat.channels[Viasat.channel_idx].id;
    return url;
};

Viasat.fetchAllShows = function(completeFun) {
    if (Viasat.shows.length == 0) {
        var AllShowsUrl = Viasat.getAllShowsUrl();
        requestUrl(AllShowsUrl,
                   function(status, data)
                   {
                       Viasat.decode_shows(data.responseText,AllShowsUrl,true, true,completeFun)
                   });
    } else if (completeFun)
        completeFun()
    
}

Viasat.search = function(query, completeFun) {
    Viasat.fetchAllShows(function() 
                         {
                             Viasat.decode_shows(null, query, true, false, completeFun);
                         }
                        );
}

Viasat.getNextCategory = function() {
    if (Viasat.channel_idx == null)
        return getNextIndexLocation(2);
    else
        return getNextIndexLocation(2, 1);
}

Viasat.getCategoryIndex = function () {
    if (Viasat.channel_idx == null)
        return getIndex(2);
    else
        return getIndex(2, 1);
};

Viasat.updateCategoryTitle = function() {
    switch (Viasat.getCategoryIndex().current) {
    case 0:
        document.title = "Kategorier";
        break;
    case 1:
        document.title = "Utvalt";
        break;
    case 2:
        document.title = "Alla Program";
        break;
    }
};

Viasat.getHeaderPrefix = function() {
    if (Viasat.anySubChannel())
        return Viasat.channels[Viasat.channel_idx].name;
    return "Viasat";
}

Viasat.keyRed = function() {
    if ($("#a-button").text().indexOf("Pop") != -1) {
	setLocation('index.html');
    } else if ($("#a-button").text().indexOf("lip") != -1) {
	setLocation('LatestClips.html');
    } else {
	setLocation('Latest.html');
    }
}

Viasat.keyGreen = function() {
    if ($("#b-button").text().indexOf("ateg") != -1)
	setLocation('categories.html');
    else
        setLocation(Viasat.getNextCategory())
}

Viasat.getAButtonText = function(language) 
{
    var loc = getIndexLocation();
    if (loc.match(/index\.html/)){
        if(language == 'English'){
	    return 'Latest';
        } else {
	    return 'Senaste';
        }
    } else if (loc.match(/Latest\.html/)) {
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

Viasat.getBButtonText = function(language) {
    if (getIndexLocation().match(/categories\.html/)) {
        switch (Viasat.getCategoryIndex().next) {
        case 0:
            // Use Default
            return null;
        case 1:
            if (language == "Swedish")
                return "Utvalt";
            else
                return "Collections";
            break
        case 2:
            if (language == "Swedish")
                return "Alla Program";
            else
                return "All Shows";
            break;
        }
    } else
        return null
};

Viasat.getCButtonText = function (language) {
    if(language == 'English')
	return 'Channels';
    else
        return 'Kanaler';
};

Viasat.decode = function(data, url, stripShow, completeFun, isClip, isNext) {
    try {
        var Name;
        var Duration;
        var Link;
        var Description;
        var ImgLink;
        var next = null;
        var clipsUrl = null;
        var seasonUrl = null;
        var AirDate;
        var Episode=null;
        var Show=null;

        if (!isNext)
            Viasat.result = [];

        if (url && url.match(/\/seasons/)) {
            return Viasat.decode_shows(data, url, false, false, completeFun);
        }

        data = JSON.parse(data);
        if (data._links && data._links.next)
            next = data._links.next.href
        else 
            next = null;

        if (stripShow && !isClip && data._links && data._links.self) {
            clipsUrl = data._links.self.href.replace("type=program", "type=clip").replace(/&page=[^&]+/,"");
        }

        if (data._embedded.sections)
            data = data._embedded.sections[0]._embedded.videos;
        else if (data._embedded.videos)
            data = data._embedded.videos;
        else
            data = data._embedded.items;

        for (var k=0; k < data.length; k++) {
            Name = data[k].title.trim();
            Show = data[k].format_title.trim();
            if (stripShow && Show != Name) {
                Name = Name.replace(Show,"").replace(/^[,. :\-]*/,"").replace(/[,. :\-]+$/,"").trim();
                Name = Name.replace(/^./,Name[0].toUpperCase());
                Name = Name.replace(/^([Ss][0-9]+)?[Ee][0]*([0-9]+)$/,"Avsnitt $2")
            }
            ImgLink = Viasat.fixThumb(data[k]._links.image.href);
            if (!data[k]._links.stream) {
                Viasat.result.push({name:Name, link:data[k]._links.seasons.href, thumb:ImgLink});
                continue;
            }
            Duration = data[k].duration;
            Description = (data[k].summary) ? data[k].summary.trim() : "";
            Link = data[k]._links.stream.href;

            AirDate = Viasat.getAirDate(data[k]);
            if (data[k].format_position) {
                Episode = data[k].format_position.episode
            } else {
                Episode = undefined
            }
            if (clipsUrl && !seasonUrl && data[k]._links.season)
                seasonUrl = data[k]._links.season.href;
            Viasat.result.push({name:Name, 
                                episode:Episode,
                                link:Link, 
                                thumb:ImgLink, 
                                duration:Duration, 
                                description:Description,
                                airDate:AirDate,
                                link_prefix:'<a href="details.html?ilink='
                               }
                              );
        }
        if (next) {
            data = null;
            return Viasat.requestNextPage(next, function(status, nextData) {
                Viasat.decode(nextData.responseText, url, stripShow, completeFun, isClip, true);
            });
        }
        
        if (stripShow) {
            Viasat.result.sort(function(a, b){
                if (a.episode == b.episode) {
                    if (a.airDate > b.airDate)
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

        for (var k=0; k < Viasat.result.length; k++) {
            if (!Viasat.result[k].link_prefix) {
                showToHtml(Viasat.result[k].name,
                           Viasat.result[k].thumb,
                           Viasat.result[k].link
                          );
            } else {
                
                toHtml({name:Viasat.result[k].name,
                        duration:Viasat.result[k].duration,
                        is_live:false,
                        is_channel:false,
                        is_running:null,
                        link:Viasat.result[k].link,
                        link_prefix:Viasat.result[k].link_prefix,
                        description:Viasat.result[k].description,
                        thumb:Viasat.result[k].thumb
                       });
            }
	}
        if (clipsUrl) {
            data = JSON.parse(httpRequest(clipsUrl,{sync:true}).data);
            var clipsThumb = null;
            if (data.count.total_items > 0) {
                if (seasonUrl) {
                    data = JSON.parse(httpRequest(seasonUrl,{sync:true}).data);
                    if (data._links && data._links.image)
                        clipsThumb = Viasat.fixThumb(data._links.image.href); 
                }
                clipToHtml(clipsThumb, clipsUrl);
            }
        };
        data = null;
        Viasat.result = [];
    } catch(err) {
        Log("Viasat.decode Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
    if (completeFun)
        completeFun();
};

Viasat.getAirDate = function(data) {
    try {
        return timeToDate(data.broadcasts[0].air_at);
    } catch (err) {
        return timeToDate(data.publish_at);
    }
}

Viasat.decodeChannels = function(data) {

    try {
        var result = [];
        var oldId = (Viasat.anySubChannel()) ? Viasat.channels[Viasat.channel_idx].id : null;

        data = JSON.parse(data);
        data = data._embedded.channels
        Viasat.channels = [];

        for (var k=0; k < data.length; k++) {
            Viasat.channels.push({name:data[k].name.trim(), 
                                  id:data[k].id,
                                  thumb:Viasat.fixThumb(data[k].image)
                                 });
        }
        Viasat.channels.sort(function(a, b){
            var NumberA = a.name.replace(/[^0-9]*/g, "");
            var NumberB = b.name.replace(/[^0-9]*/g, "");
            if (NumberA.length > 0 && NumberB.length > 0) {
                return +NumberA - +NumberB
            } else if (NumberA.length > 0) {
                return -1
            } else if (NumberB.length > 0) {
                return 1 
            } else if (a.name.toLowerCase() < b.name.toLowerCase()) {
                return -1
            } else {
                return 1
            }
        });
        
        for (var k=0; k < Viasat.channels.length; k++) {
            if (oldId != null) {
                if (itemCounter == 0)
                    Viasat.channelToHtml("Viasat", "reset");
                if (Viasat.channels[k].id == oldId) {
                    Viasat.channel_idx = k;
                    continue;
                }
            }
            Viasat.channelToHtml(Viasat.channels[k].name, 
                                 k,
                                 Viasat.channels[k].thumb
                                );
        }
        data = html = result = null;
    } catch(err) {
        Log("Viasat.decodeChannels Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
};

Viasat.channelToHtml = function(name, idx, thumb) {
    toHtml({name:name,
            duration:"",
            is_live:false,
            is_channel:false,
            is_running:null,
            link:idx,
            link_prefix:'<a href="index.html?viasat_channel=',
            description:"",
            thumb:thumb
           });
};

Viasat.decodeCategories = function(data, url, completeFun) {
    try {
        var Name;
	var Link;
	var ImgLink;

        if (!url.match(/(categories|collections)/))
            return Viasat.decode_shows(data,url,true,false,completeFun);

        data = JSON.parse(data);
        if (data._embedded.categories)
            data = data._embedded.categories;
        else 
            data = data._embedded.collections;

        for (var k=0; k < data.length; k++) {

            if (data[k].name) {
                Name = data[k].name;
	        Link = data[k]._links.formats.href
                if (!Link.match(/device=mobile/))
                    Link = Link + "&device=mobile";
            } else {
                Name = data[k].title;
	        Link = data[k]._links.self.href
            }
            if (Viasat.anySubChannel()) {
                if (JSON.parse(httpRequest(Viasat.addChannel(Link),{sync:true}).data).count.total_items == 0)
                    continue;
            }
	    ImgLink  = Viasat.fixThumb(data[k]._links.image.href);

            toHtml({name:Name,
                    link:Link,
                    link_prefix:'<a href="categoryDetail.html?category=',
                    thumb:ImgLink,
                    largeThumb:Viasat.fixThumb(ImgLink, VIASAT_DETAILS_IMG_SIZE)
                   });
	}
	data = null;
    } catch(err) {
        Log("Viasat.decodeCategories Exception:" + err.message + " data[" + k + "]:" + JSON.stringify(data[k]));
    }
    if (completeFun)
        completeFun();
};

Viasat.decode_shows = function(data, url, allShows, skipHtml, completeFun, isNext) {
    try {
        var Name;
        var Link;
        var ImgLink;
        var next = null;
        var checkSeasons=false;
        var LinkPrefix = '<a href="showList.html?name='
        var query = null;
        var json = null;
        if (!isNext)
            Viasat.result = [];

        if (!allShows || (allShows && Viasat.shows.length == 0)) {
            json = JSON.parse(data);
            if (json._links && json._links.next)
                next = json._links.next.href
            else 
                next = null;

            if (json._embedded.formats)
                json = json._embedded.formats;
            else if (json._embedded.seasons) {
                json = json._embedded.seasons;
                checkSeasons = true;
            } else {
                if (json._embedded.items[0].type && json._embedded.items[0].type == "program") {
                    return Viasat.decode(data,url,false,completeFun);
                }
                json = json._embedded.items;
            }

            for (var k=0; k < json.length; k++) {
                Name = json[k].title;
                if (json[k]._links.videos && 
                    (!json[k]._links.seasons ||
                     (json[k].latest_video && 
                      json[k].latest_video.format_position && 
                      !json[k].latest_video.format_position.is_episodic &&
                      json[k]._links.videos)
                    )
                   ) {
                    Link = json[k]._links.videos.href + "&type=program"; 
                } else if (json[k]._links.seasons)
	            Link = json[k]._links.seasons.href;
                if (json[k]._links.image) {
                    ImgLink = Viasat.fixThumb(json[k]._links.image.href);
                } else {
                    ImgLink = null;
                }
                if (checkSeasons) {
                    if (JSON.parse(httpRequest(Link,{sync:true}).data).count.total_items == 0)
                        continue;
                    LinkPrefix = '<a href="showList.html?season=1' + encodeURIComponent(Name) + '&name=';
                }

                Viasat.result.push({name:Name, link:Link, thumb:ImgLink, link_prefix:LinkPrefix});
            }
            json = null;
            if (next) {
                data = null;
                return Viasat.requestNextPage(next, function(status, nextData) {
                    Viasat.decode_shows(nextData.responseText, url, allShows, skipHtml, completeFun,true);
                });
            }

            Viasat.result.sort(function(a, b) {
                var name_a = (checkSeasons) ? Number(a.name.replace(/[^0-9]+/, "")) : a.name.toLowerCase();
                var name_b = (checkSeasons) ? Number(b.name.replace(/[^0-9]+/, "")) : b.name.toLowerCase();
                return (name_a > name_b) ? 1 : -1;
            });
            if (allShows)
                Viasat.shows = Viasat.result;
        } else if (allShows) {
            Viasat.result = Viasat.shows;
            if (data == null) {
                if (url.length == 1)
                    query = new RegExp("^" + url, 'i');
                else
                    query = new RegExp(url, 'i');
            }
        }
        data = null;
        if (skipHtml) {
            Viasat.result = [];
            if (completeFun)
                completeFun();
            return
        };

        if (url && url.match(/\/seasons/)) {
            if (Viasat.result.length == 1) {
                callTheOnlySeason(Viasat.result[0].name, Viasat.result[0].link);
                Viasat.result = [];
                return;
            }
            Viasat.result.reverse();
        }

        for (var k=0; k < Viasat.result.length; k++) {
            // Check if searching
            if (query && !query.test(Viasat.result[k].name))
                continue;

            showToHtml(Viasat.result[k].name,
                       Viasat.result[k].thumb,
                       Viasat.result[k].link,
                       Viasat.result[k].link_prefix
                      );
        }
        Viasat.result = [];
    } catch(err) {
        if (json)
            Log("Viasat.decode_shows Exception:" + err.message + " json[" + k + "]:" + JSON.stringify(json[k]));
        else 
            Log("Viasat.decode_shows Exception:" + err.message);
    }
    if (completeFun)
        completeFun();
};

Viasat.getDetailsData = function(url, data) {

    if (url.match(/(\/formats\/|\?format=)/))
        return Viasat.getShowData(url,data);

    var Name="";
    var Title = Name;
    var DetailsImgLink="";
    var AirDate="";
    var VideoLength = "";
    var AvailDate=null;
    var Description="";
    var Show=null;
    try {

        data = JSON.parse(data.responseText);

        Name = data.title;
        Title = Name;
	DetailsImgLink = Viasat.fixThumb(data._links.image.href, VIASAT_DETAILS_IMG_SIZE);
        AirDate = Viasat.getAirDate(data);
        if (data.unpublish_at || data.premium.time_left.days) {
            if (data.unpublish_at) {
                AvailDate = timeToDate(data.unpublish_at);
            } else if (data.premium.time_left.days) {
                var AvailDate = getCurrentDate();
                AvailDate.setDate(AvailDate.getDate() + data.premium.time_left.days);
                // AvailDate = dateToString(myDate,"-");
            }
            if (data.premium.time_left.days) {
                AvailDate = dateToFullString(AvailDate)
                AvailDate = AvailDate + " (" + data.premium.time_left.days + " dagar kvar)";
            }
        }
        VideoLength = dataLengthToVideoLength(null, data.duration);
        if (!data.summary.match(data.description))
	    Description = (data.description + ". " + data.summary).replace(/\.\./g,".");
        else
	    Description = data.summary;

        if (data._embedded && data._embedded.format) {
            Show = {name : data._embedded.format.title,
                    url  : data._embedded.format._links.seasons.href.replace("https", "http")
                   }
        }
    } catch(err) {
        Log("Viasat.getDetailsData Exception:" + err.message);
        Log("Name:" + Name);
        Log("AirDate:" + AirDate);
        Log("AvailDate:" + AvailDate);
        Log("VideoLength:" + VideoLength);
        Log("Description:" + Description);
        Log("DetailsImgLink:" + DetailsImgLink);
    }
    data = null;
    return {name          : Name,
            title         : Title,
            is_live       : false,
            air_date      : AirDate,
            avail_date    : AvailDate,
            start_time    : 0,
            duration      : VideoLength,
            description   : Description,
            not_available : false,
            thumb         : DetailsImgLink,
            parent_show   : Show
    }
};

Viasat.getShowData = function(url, data) {

    var Name="";
    var DetailsImgLink="";

    try {

        data = JSON.parse(data.responseText);

        Name = data.title;
	DetailsImgLink = Viasat.fixThumb(data._links.image.href, VIASAT_DETAILS_IMG_SIZE);

    } catch(err) {
        Log("Viasat.getShowData exception:" + err.message);
        Log("Name:" + Name);
        Log("DetailsImgLink:" + DetailsImgLink);
    }
    data = null;
    return {show          : true,
            name          : Name,
            description   : "",
            genre         : "",
            thumb         : DetailsImgLink
           };
    
};

Viasat.getDetailsUrl = function(streamUrl) {
    return streamUrl.replace(/\/stream/, "").replace(/(seasons|videos)\?format=([0-9]+).*/, "formats/$2");
};

Viasat.getPlayUrl = function(orgStreamUrl) {
    var streamUrl = orgStreamUrl.replace(/videos\/([0-9]+)/, "videos/stream/$1");

    requestUrl(streamUrl,
               function(status, data)
               {
                   if (Player.checkPlayUrlStillValid(orgStreamUrl)) {
                       var stream
                       data = JSON.parse(data.responseText);
                       if (data.streams.hls)
                           stream = data.streams.hls;
                       else if (data.streams.high)
                           stream = data.streams.high;
                       else
                           stream = data.streams.medium;
                       data = JSON.parse(httpRequest(Viasat.getDetailsUrl(streamUrl),{sync:true}).data)
                       var srtUrls=[];
                       if (data.sami_path) srtUrls.push(data.sami_path); 
                       if (data.subtitles_for_hearing_impaired) srtUrls.push(data.subtitles_for_hearing_impaired);
                       Resolution.getCorrectStream(stream, {list:srtUrls});
                   }
               });
}

Viasat.fixThumb = function(thumb, size) {
    if (!thumb)
        return thumb;
        
    if (!size)
        size = THUMB_WIDTH + "x" + THUMB_HEIGHT;
    return thumb.replace(/(({size})|([0-9]+x[0-9]+))/, size);
}

Viasat.fetchSubtitles = function (subUrls, hlsSubs) {
    if (hlsSubs && hlsSubs.length > subUrls.list.length) {
        return Player.fetchHlsSubtitles(hlsSubs);
    } else if (subUrls.list.length == 0) {
        return;
    } else if (subUrls.list[0].match(/\.(web)?vtt/)) {
        return Player.fetchSubtitles(subUrls, hlsSubs)
    }
    var anyFailed = false
    httpLoop(subUrls.list,
             function(url, data, status) {
                 if (status != 200) {
                     Log("Viasat.fetchSubtitles sub failed: " + status);
                     data = ""
                     anyFailed = true;
                     return ""
                 } else {
                     return data
                 }
             },
             function(data) {
                 if (data.length > 0)
                     Viasat.parseSubtitles(data);
                 if (anyFailed && hlsSubs)
                     Player.fetchHlsSubtitles(hlsSubs)
             }
            );
};

Viasat.parseSubtitles = function (data) {

    var start,stop,text;
    data = data.split("SpotNumber");
    data.shift()
    subtitles = [];
    for (var i=0; i<data.length; i++) {
        
        start = data[i].match(/TimeIn="([^"]+)/)[1];
        stop  = data[i].match(/TimeOut="([^"]+)/)[1];
        text  = data[i].match(/[0-9]">(.+)<\/Text/mg);
        for (var j=0; j<text.length; j++) {
            text[j] = text[j].match(/[0-9]">(.+)<\/Text/)[1];
        }
        subtitles.push(
            {
                start: Player.srtTimeToMS(start.replace(/:([0-9]+)$/,",$1")),
                stop:  Player.srtTimeToMS(stop.replace(/:([0-9]+)$/,",$1")),
                text:  text.join("<br />").replace(/<br \/>$/g, "").replace(/([^.?!\-] )I([a-\xf6]+)/g, "$1l$2").replace(/([a-\xf6]+)I/g, "$1l")
            }
        )
    }
    subtitles.sort(function(a, b){return a.start - b.start});
    // for (var i = 0; i < 10 && i < subtitles.length; i++) {
    //     alert("start:" + subtitles[i].start + " stop:" + subtitles[i].stop + " text:" + subtitles[i].text);
    // }
};

Viasat.requestNextPage = function(url, callback) {
    requestUrl(url,callback,callback);
}
