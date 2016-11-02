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
        if (target != "Auto" && videoUrl.match(/\.m3u8|\.ism/)) {
            requestUrl(videoUrl,
                       function(status, data)
	               {
                           var streams, is_hls = videoUrl.match(/\.m3u8/);
                           if (is_hls) {
                               streams = Resolution.getHlsStreams(videoUrl, data)
                           } else {
                               streams = Resolution.getIsmStreams(videoUrl, data)
                           }
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
                           // Log("Target url data:" + syncHttpRequest(streams[currentId].url).data.slice(0,600));
                           if (extra.useBitrates || !is_hls) {
                               videoUrl = videoUrl + "|STARTBITRATE=" + target +"|BITRATES=" + target + ":" + target
                           } else {
                               videoUrl = streams[currentId].url;
                               if (!videoUrl.match(/^http/))
                                   videoUrl = prefix + videoUrl;
                           }
		           Log('current: ' + target);
                           // Log("current url: " + streams[currentId].url);
                           if (is_hls)
                               videoUrl = videoUrl + "|COMPONENT=HLS"
                           else
                               videoUrl = videoUrl + "|COMPONENT=WMDRM"
		           Player.setVideoURL(master, videoUrl, srtUrl, {license:extra.license, bw:target});
		           callback();
	               }
                      );
        } else {
            if (videoUrl.match(/\.m3u8/))
                videoUrl = videoUrl + "|COMPONENT=HLS"
            else if (videoUrl.match(/\.ism/)) {
                videoUrl = videoUrl + "|STARTBITRATE=CHECK|COMPONENT=WMDRM"
            }
	    Player.setVideoURL(master, videoUrl, srtUrl, {license:extra.license});
	    callback();
	}
};

Resolution.getHlsStreams = function (videoUrl, data) {
    // Log("M3U8 content: " + data.responseText);
    var anyResoution = data.responseText.match(/^#.+BANDWIDTH=[0-9]+.+RESOLUTION/mg);
    var bandwidths = data.responseText.match(/^#.+BANDWIDTH=[0-9]+(.+RESOLUTION)?/mg);
    var urls = data.responseText.match(/^([^#\r\n]+)$/mg);
    var streams = [];

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
    return streams;
}

Resolution.getIsmStreams = function (videoUrl, data) {
    // Log("ISM content: " + data.responseText);
    data = data.responseText.split(/StreamIndex.+="video"/)[1];
    var bandwidths = data.match(/Bitrate="([0-9]+)"/gm)
    var streams    = [];
    for (var i = 0; i < bandwidths.length; i++) {
        streams.push({bandwidth: +bandwidths[i].match(/([0-9]+)/)[1],
                      url:videoUrl
                     }
                    );
    }
    return streams;
}

Resolution.setRes = function(value)
{
    Config.save('res', value);
};

Resolution.setLiveRes = function(value)
{
    Config.save('liveres', value);
};

