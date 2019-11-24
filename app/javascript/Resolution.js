var resButton = ["#resauto", "#res1", "#res2", "#res3", "#res4", "#res5", "#res6"];
var bwidths = ["Auto", "Min", 500000, 1500000, 3000000, 5000000, "Max"];

var Resolution =
{
   
};

Resolution.init = function()
{

    return true;
};

Resolution.displayRes = function(){
    var value = bwidths.indexOf(this.getTarget(false));
    $(resButton[value]).addClass('checked');
    value = bwidths.indexOf(this.getTarget(true));
    $(reslButton[value]).addClass('checked');
};

Resolution.getTarget = function(IsLive) {
    var res = (IsLive) ? Config.read("liveres") : Config.read("res");
    res = (res!=null && res!="") ? res : 0;
    return bwidths[res];
};

Resolution.getCorrectStream = function(videoUrl, srtUrl, extra) {
    if (!extra) extra  = {};
    if (!extra.cb) extra.cb = function() {Player.playVideo()};

    var prefix = videoUrl.replace(/[^\/]+(\?.+)?$/,"");
    var target = Resolution.getTarget(extra.isLive);
    var master = videoUrl;
    requestUrl(videoUrl,
               function(status, data)
	       {
                   if (data.responseText.length == 0) {
                       Log("No data, Status: " + status + " " + JSON.stringify(data))
                       target = "Auto"
                   } else {
                       var streams, is_hls = videoUrl.match(/\.m3u8/);
                       extra.cookies = data.getAllResponseHeaders().match(/Set-Cookie: ?.+$/igm);
                       for (var i=0; extra.cookies && i < extra.cookies.length; i++)
                           extra.cookies[i] = extra.cookies[i].replace(/.*Set-Cookie: ?/i, "")
                       if (is_hls) {
                           streams = Resolution.getHlsStreams(videoUrl, data, prefix)
                       } else if (videoUrl.match(/\.mpd/)) {
                           streams = Resolution.getHasStreams(videoUrl, data, prefix)
                       } else if (videoUrl.match(/\.ism/)) {
                           streams = Resolution.getIsmStreams(videoUrl, data, prefix)
                       }
                       extra.audio_idx = streams.audio_idx;
                       extra.subtitles_idx = streams.subtitles_idx;
                       extra.hls_subs = streams.hls_subs;
                   }
                   if (target != "Auto") {
                       streams = streams.streams;
                       streams.sort(function(a, b){
                           if (a.bandwidth > b.bandwidth)
                               return 1
                           else
                               return -1
                       });
                       var current = 0;
		       var currentId = 0;
                       if (target == "Max")
                           currentId = streams.length-1;
                       else if (target == "Min")
                           currentId = 0
                       else {
		           for (var i = 0; i < streams.length; i++) {
                               if (+target >= streams[i].bandwidth)
                                   currentId = i;
                               else 
                                   break
                           }
		       }
                       target = streams[currentId].bandwidth
                       if (!streams[currentId].url.match(/^http/))
                           streams[currentId].url = prefix + streams[currentId].url;

                       if (extra.useBitrates || !is_hls) {
                           videoUrl = videoUrl + "|STARTBITRATE=" + target +"|BITRATES=" + target + ":" + target
                       } else {
                           videoUrl = streams[currentId].url;
                           if (!videoUrl.match(/^http/))
                               videoUrl = prefix + videoUrl;
                       }
		       Log('current: ' + target);
                       // Log("current url: " + streams[currentId].url);
                       extra.bw = target;
	           }

                   if (target == "Auto")
                       // videoUrl = videoUrl + "|STARTBITRATE=AVERAGE";
                       videoUrl = videoUrl + "|STARTBITRATE=CHECK";

                   if (is_hls)
                       videoUrl = videoUrl + "|COMPONENT=HLS"
                   else if (videoUrl.match(/\.mpd/))
                       videoUrl = videoUrl + "|COMPONENT=HAS";
                   else if (videoUrl.match(/\.ism/)) {
                       videoUrl = videoUrl + "|COMPONENT=WMDRM";
                   }
                   Player.setVideoURL(master, videoUrl, srtUrl, extra);
                   extra.cb()
               },
               {headers:Channel.getHeaders()}
              );
};

Resolution.getHlsStreams = function (videoUrl, data, prefix) {
    // Log("M3U8 content: " + data.responseText);

    var subs = data.responseText.match(/^#.+TYPE=SUBTITLES.+URI="[^"]+.+$/mg);
    var anyResolution = data.responseText.match(/^#.+BANDWIDTH=[0-9]+.+RESOLUTION/mg);
    var bandwidths = data.responseText.match(/^#.+BANDWIDTH=[0-9]+(.+RESOLUTION)?/mg);
    var urls = data.responseText.match(/^([^#\r\n]+)$/mg);
    var streams = [];
    var subsStreams = [];

    for (var i = 0; i < bandwidths.length; i++) {
        // Ignore audio only streams
        if (anyResolution && !bandwidths[i].match(/RESOLUTION/)) {
            continue;
        }
        if (bandwidths[i].match(/EXT-X-I-FRAME-STREAM-INF/))
            // Some new stuff...
            break;
        streams.push({bandwidth: +bandwidths[i].replace(/.*BANDWIDTH=([0-9]+).*/,"$1"),
                      url: (urls[i].match(/http[s]?:/)) ? urls[i] : prefix + urls[i]
                     }
                    );
    }
    for (var i = 0; subs && i < subs.length; i++) {
        if (subs.length > 1 && !subs[i].match(/language[ ="]*sv/i)) {
            // Only keep Swedish subtitles
            continue;
        }
        subs[i] = subs[i].match(/URI="([^"]+)/)[1];
        subs[i] = (subs[i].match(/http[s]?:/)) ? subs[i] : prefix + subs[i];
        subsStreams.push(subs[i])
    }
    if (subsStreams.length == 0)
        subsStreams = null;
    return {streams:streams, hls_subs:subsStreams}
}

Resolution.getIsmStreams = function (videoUrl, data, prefix) {
    data = data.responseText.replace(/StreamIndex[	 ]*\r?\n/gm,"StreamIndex");
    // Log("ISM content: " + data);
    data = data.split(/StreamIndex.+="video"/)
    var language_streams = data[0].split(/<StreamIndex/i).slice(1);
    var subtitles = [];
    var languages = [];
    for (var i = 0; i < language_streams.length; i++) {
        if (language_streams[i].match(/audio/i)) {
            languages.push(language_streams[i])
        } else if (language_streams[i].match(/text/i)) {
            subtitles.push(language_streams[i])
        }
    }
    var swe_subtitles_idx = null;
    for (var i = 0; i < subtitles.length; i++) {
        if (subtitles[i].match(/swe/i)) {
            swe_subtitles_idx = i
            break;
        }
    }
    var swe_audio_idx = null;
    for (var i = 0; i < languages.length; i++) {
        if (languages[i].match(/swe/i)) {
            swe_audio_idx = i
            break;
        }
    }

    var streams    = [];
    var bandwidths = data[1].match(/Bitrate="([0-9]+)"/gm)

    for (var i = 0; i < bandwidths.length; i++) {
        streams.push({bandwidth: +bandwidths[i].match(/([0-9]+)/)[1],
                      url:videoUrl
                     }
                    );
    }

    return {streams:streams, audio_idx:swe_audio_idx, subtitles_idx:swe_subtitles_idx}
}

Resolution.getHasStreams = function (videoUrl, data, prefix) {
    data = data.responseText;
    data = (data.match(/contentType/)) ? data.split(/contentType/mg) : data.split(/mimeType/mg);
    for (var i = 0; i < data.length; i++) {
        if (data[i].match(/^[^=]?=.*video/i)) {
            data = data[i]
            break;
        }
    }
    var bandwidths = data.match(/bandwidth=[^0-9]?([0-9]+)/mg);
    var streams = [];

    for (var i = 0; i < bandwidths.length; i++) {
        streams.push({bandwidth: +bandwidths[i].replace(/.*bandwidth=[^0-9]?([0-9]+).*/,"$1"),
                      url:videoUrl
                     }
                    );
    }
    return {streams:streams};
}

Resolution.setRes = function(value)
{
    Config.save('res', value);
};

Resolution.setLiveRes = function(value)
{
    Config.save('liveres', value);
};

