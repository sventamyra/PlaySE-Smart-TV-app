var resButton = ["#resauto", "#res1", "#res2", "#res3", "#res4", "#res5"];
var bwidths = [0, 400000, 700000, 1200000, 2000000, 4000000];
var lbwidths = [400000, 700000, 1200000, 2000000, 4000000];
var target = 1200000;
var livetarget = 1200000;


var Resolution =
{
   
};

Resolution.init = function()
{

    return true;
};



Resolution.displayRes = function(){
	var value = this.checkRes();
	alert(resButton[value]);
	$(resButton[value]).addClass('checked');
	target = bwidths[value];
	value = this.checkLiveRes();
	alert(reslButton[value]);
	$(reslButton[value]).addClass('checked');
	livetarget = lbwidths[value];
};

Resolution.getTarget = function(){
	return target;
	
};

Resolution.getCorrectStream = function(videoUrl, isLive, srtUrl){
	// alert('target: ' + target + " videoUrl:" + videoUrl);
        var prefix = videoUrl.replace(/[^\/]+$/,"");
        if (target > 0 && videoUrl.match(/\.m3u8/)){
		$.support.cors = true;
		 $.ajax(
	   {
	       type: 'GET',
	       url: videoUrl,
	       timeout: 15000,
	       success: function(data, status, xhr)
	       {
                   // alert(xhr.responseText);
		   var bandwidths = xhr.responseText.match(/^#.+BANDWIDTH=([0-9]+)/mg);
                   var urls = xhr.responseText.match(/^([^#]+)$/mg);

		   var ij = 0;
		   var current = 0;
		   var currentId = 0;
		   for (ij = 0; ij < bandwidths.length; ij++) {
                       bandwidths[ij]=bandwidths[ij].replace(/.*BANDWIDTH=/,"");
		       if(isLive == 0){
			   if(+bandwidths[ij] <= +target){
			       // alert(bandwidths[ij]);
			       if(+bandwidths[ij] > +current){
				   // alert(bandwidths[ij]);
				   current = bandwidths[ij];
				   currentId = ij;
			       }
			   }
		       }
		       else{
			   if(+bandwidths[ij] <= +livetarget){
			       // alert(bandwidths[ij]);
			       if(+bandwidths[ij] > +current){
				   // alert(bandwidths[ij]);
				   current = bandwidths[ij];
				   currentId = ij;
			       }
			   }
		       }
		   }
		   Log('current: ' + current);
                   videoUrl = urls[currentId]
                   if (!videoUrl.match(/^http/))
                       videoUrl = prefix + videoUrl;
		   Player.setVideoURL(videoUrl + "|COMPONENT=HLS", srtUrl);
		   Player.playVideo();
		   
	       }
	   });
	}
	else{
            if (videoUrl.match(/\.m3u8/))
	        Player.setVideoURL(videoUrl + "|COMPONENT=HLS", srtUrl);
            else
	        Player.setVideoURL(videoUrl, srtUrl);
	    Player.playVideo();
	}

};

Resolution.checkRes = function()
{
var res=getCookie("res");
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
	target = bwidths[value];
};

Resolution.checkLiveRes = function()
{
var res=getCookie("liveres");
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
	target = bwidths[value];
};

