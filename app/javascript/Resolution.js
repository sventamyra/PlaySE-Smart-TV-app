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

Resolution.getCorrectStream = function(videoUrl, srtUrl, extra){
    Resolution.setStreamUrl(videoUrl, 
                            srtUrl, 
                            function() {Player.playVideo()},
                            extra
                           );
};

Resolution.setStreamUrl = function(videoUrl, srtUrl, callback, extra) {
        if (!extra) extra  = {};
        var prefix = videoUrl.replace(/[^\/]+(\?.+)?$/,"");
        var target = Resolution.getTarget(extra.isLive);
        var master = videoUrl;
        requestUrl(videoUrl,
                   function(status, data)
	           {
                       var streams, is_hls = videoUrl.match(/\.m3u8/);
                       if (is_hls) {
                           streams = Resolution.getHlsStreams(videoUrl, data)
                       } else if (videoUrl.match(/\.ism/)) {
                           streams = Resolution.getIsmStreams(videoUrl, data)
                       }
                       extra.cookies = streams.cookies;
                       extra.audio_idx = streams.audio_idx;
                       extra.hls_subs = streams.hls_subs;
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
                           // Log("Target url data:" + httpRequest(streams[currentId].url,{sync:true}).data.slice(0,600));
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
                       if (is_hls)
                           videoUrl = videoUrl + "|COMPONENT=HLS"
                       else if (videoUrl.match(/\.ism/)) {
                           if (target == "Auto")
                               videoUrl = videoUrl + "|STARTBITRATE=CHECK";
                           videoUrl = videoUrl + "|COMPONENT=WMDRM";
                       } else if (videoUrl.match(/\.mpd/)) {
                           videoUrl = videoUrl + "|COMPONENT=HAS";
                       }
		       Player.setVideoURL(master, videoUrl, srtUrl, extra);
		       callback();
                   }
                  );
};

Resolution.getHlsStreams = function (videoUrl, data) {
    // Log("M3U8 content: " + data.responseText);
    
    var subs = data.responseText.match(/^#.+TYPE=SUBTITLES.+URI="[^"]+.+$/mg);
    var anyResoution = data.responseText.match(/^#.+BANDWIDTH=[0-9]+.+RESOLUTION/mg);
    var bandwidths = data.responseText.match(/^#.+BANDWIDTH=[0-9]+(.+RESOLUTION)?/mg);
    var urls = data.responseText.match(/^([^#\r\n]+)$/mg);
    var streams = [];
    var subsStreams = [];
    var cookies = data.getAllResponseHeaders().match(/Set-Cookie:(.+)/gm);

    for (var i = 0; i < bandwidths.length; i++) {
        // Ignore audio only streams
        if (anyResoution && !bandwidths[i].match(/RESOLUTION/)) {
            continue;
        }
        streams.push({bandwidth: +bandwidths[i].replace(/.*BANDWIDTH=([0-9]+).*/,"$1"),
                      url:urls[i]
                     }
                    );
    }
    for (var i = 0; subs && i < subs.length; i++) {
        if (subs.length > 1 && !subs[i].match(/language[ ="]*sv/i)) {
            // Only keep Swedish subtitles
            continue;
        }
        subsStreams.push(subs[i].match(/URI="([^"]+)/)[1])
    }
    if (subsStreams.length == 0)
        subsStreams = null;
    return {streams:streams, cookies:cookies, hls_subs:subsStreams}
}

Resolution.getIsmStreams = function (videoUrl, data) {
    data = data.responseText.replace(/StreamIndex[	 ]*\r?\n/gm,"StreamIndex");
    // Log("ISM content: " + data);
    data = data.split(/StreamIndex.+="video"/)
    var languages = data[0].match(/Language="([^"]+)"/gm);
    var swe_audio_idx = null;
    for (var i = 1; languages && i < languages.length; i++) {
        if (languages[i].match(/swe/i)) {
            swe_audio_idx = i
            break;
        }
    }
    
    data = data[1];
    var bandwidths = data.match(/Bitrate="([0-9]+)"/gm)
    var streams    = [];
    for (var i = 0; i < bandwidths.length; i++) {
        streams.push({bandwidth: +bandwidths[i].match(/([0-9]+)/)[1],
                      url:videoUrl
                     }
                    );
    }
    return {streams:streams, audio_idx:swe_audio_idx}
}

Resolution.setRes = function(value)
{
    Config.save('res', value);
};

Resolution.setLiveRes = function(value)
{
    Config.save('liveres', value);
};

