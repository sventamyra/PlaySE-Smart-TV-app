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

Resolution.getCorrectStream = function(videoUrl, isLive, srtUrl, useBitrates){
	// alert('target: ' + target + " videoUrl:" + videoUrl  + " isLive:" + isLive + " srtUrl:" + srtUrl);
        var prefix = videoUrl.replace(/[^\/]+$/,"");
        var target = Resolution.getTarget(isLive);
        if (target != "Auto" && videoUrl.match(/\.m3u8/)) {
            requestUrl(videoUrl,
                       function(status, data)
	               {
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
                           if (useBitrates) {
                               videoUrl = videoUrl + "|STARTBITRATE=" + target +"|BITRATES=" + target + ":" + target
                           } else {
                               videoUrl = streams[currentId].url;
                               if (!videoUrl.match(/^http/))
                                   videoUrl = prefix + videoUrl;
                           }
		           Log('current: ' + target);
                           // Log("current url: " + streams[currentId].url);
		           Player.setVideoURL(videoUrl + "|COMPONENT=HLS", srtUrl, target);
		           Player.playVideo();
	               }
                      );
        } else {
            if (videoUrl.match(/\.m3u8/))
	        Player.setVideoURL(videoUrl + "|COMPONENT=HLS", srtUrl);
            else
	        Player.setVideoURL(videoUrl, srtUrl);
	    Player.playVideo();
	}
};

Resolution.setRes = function(value)
{
    Config.save('res', value);
};

Resolution.setLiveRes = function(value)
{
    Config.save('liveres', value);
};

