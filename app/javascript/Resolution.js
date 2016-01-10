var resButton = ["#resauto", "#res1", "#res2", "#res3", "#res4", "#res5"];
var bwidths = ["Auto", "Min", 500000, 1500000, 3000000, "Max"];
var lbwidths = ["Min", 500000, 1500000, 3000000, "Max"];

var Resolution =
{
   
};

Resolution.init = function()
{

    return true;
};



Resolution.displayRes = function(){
	var value = this.checkRes();
	$(resButton[value]).addClass('checked');
	value = this.checkLiveRes();
	$(reslButton[value]).addClass('checked');
};

Resolution.getTarget = function(IsLive){
    if (IsLive)
        return lbwidths[Resolution.checkLiveRes()];
    else
        return bwidths[Resolution.checkRes()];
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
		           var bandwidths = data.responseText.match(/^#.+BANDWIDTH=([0-9]+)/mg);
                           var urls = data.responseText.match(/^([^#\r\n]+)$/mg);
                           var streams = [];
		           for (var i = 0; i < bandwidths.length; i++) {
                               bandwidths[i]=bandwidths[i].replace(/.*BANDWIDTH=/,"");
                               streams.push({bandwidth:+bandwidths[i], url:urls[i]});
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
		           Log('current: ' + target);
                           // Log("current url: " + streams[currentId].url);
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
		           Player.setVideoURL(videoUrl + "|COMPONENT=HLS", srtUrl, target);
		           Player.playVideo();
	               },
                       // Something failed - try with "master file" anyhow.
                       function(status, data) {
                           if (videoUrl.match(/\.m3u8/)) {
                               videoUrl = videoUrl + "|STARTBITRATE=" + target +"|BITRATES=" + target + ":" + target;
                               Player.setVideoURL(videoUrl + "|COMPONENT=HLS", srtUrl, target);
		               Player.playVideo();
                           }
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

Resolution.checkRes = function()
{
var res=Config.read("res");
var defa = 5;
if (res!=null && res!="")
  {
  return res;
  }
else 
  {
	return defa;
  }
};

Resolution.setRes = function(value)
{
    setCookie('res', value, 1000);
};

Resolution.checkLiveRes = function()
{
var res=Config.read("liveres");
var defa = 4;
if (res!=null && res!="")
  {
  return res;
  }
else 
  {
	return defa;
  }
};

Resolution.setLiveRes = function(value)
{
	setCookie('liveres', value, 1000);
};

