var bwidths = ['Auto', 'Min', 500000, 1500000, 3000000, 5000000, 'Max'];

var Resolution = {

};

Resolution.init = function() {

    return true;
};

Resolution.displayRes = function(){
    var value = bwidths.indexOf(this.getTarget(false));
    $(resButton[value]).addClass('checked');
    value = bwidths.indexOf(this.getTarget(true));
    $(reslButton[value]).addClass('checked');
};

Resolution.getTarget = function(IsLive) {
    var res = (IsLive) ? Config.read('liveres') : Config.read('res');
    res = (res!=null && res!='') ? res : 0;
    return bwidths[res];
};

Resolution.getCorrectStream = function(videoUrl, srtUrl, extra) {
    if (!extra) extra  = {};
    if (!extra.cb) extra.cb = function() {Player.playVideo();};

    var prefix = getUrlPrefix(videoUrl);
    var target = Resolution.getTarget(extra.isLive);
    var master = videoUrl;
    requestUrl(videoUrl,
               null,
               {cbComplete:function(status, data) {
                   if (!data.responseText || data.responseText.length == 0) {
                       Log('No data, use Auto and hope for the best');
                       target = 'Auto';
                   } else {
                       var streams, is_hls = videoUrl.match(/\.m3u8/);
                       extra.cookies = data.getAllResponseHeaders().match(/Set-Cookie: ?.+$/igm);
                       for (var i=0; extra.cookies && i < extra.cookies.length; i++)
                           extra.cookies[i] = extra.cookies[i].replace(/.*Set-Cookie: ?/i, '');
                       if (is_hls) {
                           streams = Resolution.getHlsStreams(videoUrl, data, prefix);
                       } else if (videoUrl.match(/\.mpd/)) {
                           streams = Resolution.getHasStreams(videoUrl, data, prefix);
                       } else if (videoUrl.match(/\.ism/)) {
                           streams = Resolution.getIsmStreams(videoUrl, data, prefix);
                       }
                       extra.audio_idx = streams.audio_idx;
                       extra.subtitles_idx = streams.subtitles_idx;
                       extra.hls_subs = streams.hls_subs;
                   }
                   if (target != 'Auto') {
                       streams = streams.streams;
                       streams.sort(function(a, b){
                           if (a.bandwidth > b.bandwidth)
                               return 1;
                           else
                               return -1;
                       });
                       var current = 0;
		       var currentId = 0;
                       if (target == 'Max')
                           currentId = streams.length-1;
                       else if (target == 'Min')
                           currentId = 0;
                       else {
		           for (var j = 0; j < streams.length; j++) {
                               if (+target >= streams[j].bandwidth)
                                   currentId = j;
                               else 
                                   break;
                           }
		       }
                       target = streams[currentId].bandwidth;
                       if (!streams[currentId].url.match(/^http/))
                           streams[currentId].url = prefix + streams[currentId].url;

                       if (extra.useBitrates || !is_hls) {
                           videoUrl = videoUrl + '|STARTBITRATE=' + target +'|BITRATES=' + target + ':' + target;
                       } else {
                           videoUrl = streams[currentId].url;
                           if (!videoUrl.match(/^http/))
                               videoUrl = prefix + videoUrl;
                       }
		       Log('current: ' + target);
                       // Log('current url: ' + streams[currentId].url);
                       extra.bw = target;
	           }

                   if (target == 'Auto')
                       videoUrl = videoUrl + '|STARTBITRATE=AVERAGE';

                   if (is_hls)
                       videoUrl = videoUrl + '|COMPONENT=HLS';
                   else if (videoUrl.match(/\.mpd/))
                       videoUrl = videoUrl + '|COMPONENT=HAS';
                   else if (videoUrl.match(/\.ism/)) {
                       videoUrl = videoUrl + '|COMPONENT=WMDRM';
                   }
                   Player.setVideoURL(master, videoUrl, srtUrl, extra);
                   extra.cb();
               },
                headers:Channel.getHeaders(),
                no_cache:extra.no_cache
               }
              );
};

Resolution.getHlsStreams = function (videoUrl, data, prefix) {
    // Log('M3U8 content: ' + data.responseText);

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
        streams.push({bandwidth: +bandwidths[i].replace(/.*BANDWIDTH=([0-9]+).*/,'$1'),
                      url: (urls[i].match(/http[s]?:/)) ? urls[i] : prefix + urls[i]
                     }
                    );
    }
    for (var j = 0; subs && j < subs.length; j++) {
        if (subs.length > 1 && !subs[j].match(/language[ ="]*sv/i)) {
            // Only keep Swedish subtitles
            continue;
        }
        subs[j] = subs[j].match(/URI="([^"]+)/)[1];
        subs[j] = (subs[j].match(/http[s]?:/)) ? subs[j] : prefix + subs[j];
        subsStreams.push(subs[j]);
    }
    if (subsStreams.length == 0)
        subsStreams = null;
    return {streams:streams, hls_subs:subsStreams};
};

Resolution.getIsmStreams = function (videoUrl, data, prefix) {
    data = data.responseText.replace(/StreamIndex[	 ]*\r?\n/gm,'StreamIndex');
    // Log('ISM content: ' + data);
    data = data.split(/StreamIndex.+="video"/);
    var language_streams = data[0].split(/<StreamIndex/i).slice(1);
    var subtitles = [];
    var languages = [];
    for (var i = 0; i < language_streams.length; i++) {
        if (language_streams[i].match(/audio/i)) {
            languages.push(language_streams[i]);
        } else if (language_streams[i].match(/text/i)) {
            subtitles.push(language_streams[i]);
        }
    }
    var swe_subtitles_idx = null;
    for (var j = 0; j < subtitles.length; j++) {
        if (subtitles[j].match(/swe/i)) {
            swe_subtitles_idx = j;
            break;
        }
    }
    var swe_audio_idx = null;
    for (var k = 0; k < languages.length; k++) {
        if (languages[k].match(/swe/i)) {
            swe_audio_idx = k;
            break;
        }
    }

    var streams    = [];
    var bandwidths = data[1].match(/Bitrate="([0-9]+)"/gm);

    for (var l = 0; l < bandwidths.length; l++) {
        streams.push({bandwidth: +bandwidths[l].match(/([0-9]+)/)[1],
                      url:videoUrl
                     }
                    );
    }

    return {streams:streams, audio_idx:swe_audio_idx, subtitles_idx:swe_subtitles_idx};
};

Resolution.getHasStreams = function (videoUrl, data, prefix) {
    data = data.responseText;
    data = (data.match(/contentType/)) ? data.split(/contentType/mg) : data.split(/mimeType/mg);
    for (var i = 0; i < data.length; i++) {
        if (data[i].match(/^[^=]?=.*video/i)) {
            data = data[i];
            break;
        }
    }
    var bandwidths = data.match(/bandwidth=[^0-9]?([0-9]+)/mg);
    var streams = [];

    for (var j = 0; j < bandwidths.length; j++) {
        streams.push({bandwidth: +bandwidths[j].replace(/.*bandwidth=[^0-9]?([0-9]+).*/,'$1'),
                      url:videoUrl
                     }
                    );
    }
    return {streams:streams};
};

Resolution.setRes = function(value) {
    Config.save('res', value);
};

Resolution.setLiveRes = function(value) {
    Config.save('liveres', value);
};

