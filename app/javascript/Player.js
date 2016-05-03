var buff;
var skipTime = 0;
var osdTimer; 
var clockTimer; 
var skipTimer; 
var detailsTimer;
var pluginAPI = new Common.API.Plugin();
var fpPlugin;
var ccTime = 0;
var videoWidth = null;
var lastPos = 0;
var videoUrl;
var detailsUrl;
var requestedUrl;
var startup = true;
var smute = 0;
var subtitles = [];
var subtitlesEnabled = false;
var lastSetSubtitleTime = 0;
var currentSubtitle = -1;
var clrSubtitleTimer = 0;
var subtitleStatusPrinted = false;
var reloaded = false;
var SEPARATOR = "&nbsp;&nbsp;&nbsp;&nbsp;"
var SVT_ALT_API_URL= "http://www.svt.se/videoplayer-api/video/"

var Player =
{
    plugin : null,
    state : -1,
    skipState : -1,
    stopCallback : null,    /* Callback function to be set by client */
    originalSource : null,
    sourceDuration: 0,
    infoActive:false,
    detailsActive:false,
    startTime: null,
    offset:0,
    durationOffset:0,

    bw:"",

    repeat:0,
    REPEAT_OFF:0,
    REPEAT_BACK:1,
    REPEAT_ALL:2,
    REPEAT_ONE:3,

    aspectMode: 0,
    ASPECT_NORMAL : 0,
    ASPECT_H_FIT : 1,
    ASPECT_ZOOM : 2,
    
    STOPPED : 0,
    PLAYING : 1,
    PAUSED : 2,  
    FORWARD : 3,
    REWIND : 4,

    // BD-Player Front Display
    FRONT_DISPLAY_PLAY:  100,
    FRONT_DISPLAY_STOP:  101,
    FRONT_DISPLAY_PAUSE: 102
};

Player.init = function()
{
    var success = true;
    
    this.state = this.STOPPED;
    this.plugin = document.getElementById("pluginPlayer");
    fpPlugin = document.getElementById("pluginFrontPanel");
    
    if (!this.plugin)
    {
         success = false;
    }
    else
    {
        var mwPlugin = document.getElementById("pluginObjectTVMW");
        
        if (!mwPlugin)
        {
            success = false;
        }
        else
        {
            /* Save current TV Source */
            this.originalSource = mwPlugin.GetSource();
            
            /* Set TV source to media player plugin */
            mwPlugin.SetMediaSource();
        }
    }
    
  //  this.setWindow();
    
    this.plugin.OnCurrentPlayTime = 'Player.setCurTime';
    this.plugin.OnStreamInfoReady = 'Player.onStreamInfoReady';
    this.plugin.OnBufferingStart = 'Player.onBufferingStart';
    this.plugin.OnBufferingProgress = 'Player.onBufferingProgress';
    this.plugin.OnBufferingComplete = 'Player.onBufferingComplete';           
    this.plugin.OnRenderingComplete  = 'Player.onRenderingComplete'; 
    this.plugin.OnNetworkDisconnected = 'Player.OnNetworkDisconnected';
    this.plugin.OnConnectionFailed = 'Player.OnNetworkDisconnected';
    return success;
};

Player.setFrontPanelTime = function (hours, mins, secs) {
    try {
        if (Player.state == Player.PLAYING)
            // Log("Setting frontPanelTime");
            fpPlugin.DisplayVFD_Time(hours, mins, secs);
    }
    catch (err) {
        // Log("setFrontPanelTime failed" + err);
    }

};

Player.setFrontPanelText = function (text) {
    try {
        fpPlugin.DisplayVFD_Show(text);
    }
    catch (err) {
        // Log("setFrontPanelText failed:" + err);
    }
};

Player.deinit = function()
{
        if (this.plugin)
            Player.plugin.Stop();
        Player.disableScreenSaver();
        var mwPlugin = document.getElementById("pluginObjectTVMW");
        
        if (mwPlugin && (this.originalSource != null) )
        {
            /* Restore original TV source before closing the widget */
            mwPlugin.SetSource(this.originalSource);
            Log("Restore source to " + this.originalSource);
        }
};

Player.setWindow = function()
{
	//this.plugin.SetDisplayArea(0, 0, GetMaxVideoWidth(), GetMaxVideoHeight());
    this.plugin.SetDisplayArea(0, 0, 1, 1);
};

Player.setFullscreen = function()
{
    this.plugin.SetDisplayArea(0, 0, GetMaxVideoWidth(), GetMaxVideoHeight());
};

Player.setVideoURL = function(url, srtUrl, bw)
{

    if (srtUrl && srtUrl != "") {
        this.fetchSubtitle(srtUrl);
    }

    if (bw && +bw >= 1000000) {
        this.bw = " " + (+bw/1000000).toFixed(1) + " mbps";
    } else if (bw) {
        this.bw = " " + Math.round(+bw/1000) + " kbps";
    } else
        this.bw = "";

    videoUrl = url;
    Log("VIDEO URL: " + videoUrl);
};

Player.setDuration = function(duration)
{
    if (duration*1 == duration) {
        this.sourceDuration = duration * 1000;
    } else if (duration.length > 0) {
        if (duration.match(/^[0-9]+$/)) {
            this.sourceDuration = duration
        }
        var h = this.GetDigits("h", duration);
        var m = this.GetDigits("min", duration);
        var s = this.GetDigits("sek", duration);
        // Log("decoded duration " + h + ":" + m + ":" + s);
        this.sourceDuration = (h*3600 + m*60 + s*1) * 1000;
    }
    else
    {
        this.sourceDuration = 0;
    }
    // Log("Player.sourceDuration: " + this.sourceDuration);
};

Player.setNowPlaying = function (Name) {
    var nowPlaying = 'Now playing';
    if(Language.getisSwedish()) {
        nowPlaying = 'Nu visas';
    }
    $('.topoverlaybig').html(nowPlaying+': ' + Name);
};

Player.GetDigits = function(type, data)
{

    var regexp1 = new RegExp("^(\\d+) " + type + ".*");
    var regexp2 = new RegExp("^.*\\D+(\\d+) " + type + ".*");
    if (data.search(regexp1) != -1)
        return data.replace(regexp1, "$1");
    else if (data.search(regexp2) != -1)
        return data.replace(regexp2, "$1");
    else
        return "0"
};

Player.getHlsVersion = function(url) 
{
    var prefix = url.replace(/[^\/]+(\?.+)?$/,"");
    var data = syncHttpRequest(url).data;
    var hls_version = data.match(/^#.*EXT-X-VERSION:\s*([0-9]+)/m)
    if (hls_version)
        return +hls_version[1]
    else if (data.match(/^([^#].+\.m3u8.*$)/m)) {
        url = data.match(/^([^#].+\.m3u8.*$)/m)[1]
        if (!url.match(/^http/))
            url = prefix + url;
        return Player.getHlsVersion(url)
    }
    return null
};

Player.playVideo = function()
{
    if (videoUrl == null)
    {
        Log("No videos to play");
    }
    else
    {
        this.plugin.Stop();
        Player.setFrontPanelText(Player.FRONT_DISPLAY_PLAY);
        Player.disableScreenSaver();
        this.state = this.PLAYING;
        if (channel == "svt" && videoUrl.indexOf("=HLS") != -1) {
            var hls_version = Player.getHlsVersion(videoUrl.replace(/\|.+/,""));
            if (hls_version && hls_version > 3) {
                // Unsupported 
                $('.bottomoverlaybig').html('HLS Version ' + hls_version + ' unsupported.');
            }
        }
        this.setWindow();
        
        this.plugin.SetInitialBuffer(640*1024);
        this.plugin.SetPendingBuffer(640*1024);
        startup = true;
        if(Audio.plugin.GetUserMute() == 1){
                $('.muteoverlay').show();
        	smute = 1;
        }
        else{
            $('.muteoverlay').hide();
            smute = 0;
        }
        this.plugin.Play( videoUrl );
        // work-around for samsung bug. Video player start playing with sound independent of the value of GetUserMute() 
        // GetUserMute() will continue to have the value of 1 even though sound is playing
        // so I set SetUserMute(0) to get everything synced up again with what is really happening
        // once video has started to play I set it to the value that it should be.
        Audio.plugin.SetUserMute(0);
       // Audio.showMute();
    }
};

Player.togglePause = function()
{
    if (this.state === this.PAUSED) 
    {
        Player.resumeVideo();
    } else {
        Player.pauseVideo();
    }
};

Player.pauseVideo = function()
{
	window.clearTimeout(osdTimer);
	this.showControls();
	var pp;
	if(Language.getisSwedish()){
		pp='Pausad';
	}else{
		pp='Pause';
	}
	$('.bottomoverlaybig').html(pp);

    window.clearTimeout(clrSubtitleTimer);
    Player.enableScreenSaver();
    this.state = this.PAUSED;
    Player.setFrontPanelText(Player.FRONT_DISPLAY_PAUSE);
    this.plugin.Pause();
};

Player.stopVideo = function()
{
        loadingStop();
        widgetAPI.putInnerHTML(document.getElementById("srtId"), "");
        $("#srtId").hide();
        this.plugin.Stop();
        Player.setFrontPanelText(Player.FRONT_DISPLAY_STOP);
        Player.enableScreenSaver();
        window.clearTimeout(detailsTimer);
        if (this.stopCallback)
        {
            this.stopCallback();
        }
};

Player.stopVideoNoCallback = function()
{
    if (this.state != this.STOPPED)
    {
        Player.setFrontPanelText(Player.FRONT_DISPLAY_STOP);
        this.plugin.Stop();
    }
    else
    {
        Log("Ignoring stop request, not in correct state");
    }
};

Player.resumeVideo = function()
{
    Player.disableScreenSaver();
    Player.setFrontPanelText(Player.FRONT_DISPLAY_PLAY);
	//this.plugin.ResumePlay(vurl, time);
    this.state = this.PLAYING;
    this.plugin.Resume();
    this.hideDetailedInfo();
};

Player.reloadVideo = function(time)
{
    $('.bottomoverlaybig').html('Reloading!');
    reloaded = true;
	this.plugin.Stop();
        if (time)
            ccTime = time;
        lastPos = Math.floor((ccTime-Player.offset) / 1000.0);
        Player.disableScreenSaver();
        Player.setFrontPanelText(Player.FRONT_DISPLAY_PLAY);
	this.plugin.ResumePlay(videoUrl, lastPos);
	Log("video reloaded. url = " + videoUrl + " pos " + lastPos );
    this.state = this.PLAYING;
	this.hideDetailedInfo();
};

Player.skipInVideo = function()
{
    window.clearTimeout(osdTimer);
    Player.skipState = -1;
    var timediff = +skipTime - +ccTime;
    timediff = timediff / 1000;
    if(timediff > 0) {
    	Player.plugin.JumpForward(timediff);
    	Log("forward jump: " + timediff);
    }
    else if(timediff < 0){
    	timediff = 0 - timediff;
    	Player.plugin.JumpBackward(timediff);
    }
    Player.refreshOsdTimer(5000);
};

Player.skipForward = function(time)
{
    widgetAPI.putInnerHTML(document.getElementById("srtId"), ""); //hide while jumping
    var duration = this.GetDuration();
    if(this.skipState == -1)
    {
        if (((+ccTime + time) > +duration) && (+ccTime <= +duration))
        {
            return this.showInfo(true);
        }
        skipTime = ccTime;
    }
    else if (((+skipTime + time) > +duration) && (+ccTime <= +duration))
    {
        return -1
    }
    window.clearTimeout(skipTimer);
    this.showControls();
    skipTime = +skipTime + time;
    this.skipState = this.FORWARD;
    // Log("forward skipTime: " + skipTime);
    this.updateSeekBar(skipTime);
    skipTimer = window.setTimeout(this.skipInVideo, 2000);
};

Player.skipForwardVideo = function()
{
    this.skipForward(10*1000);
};

Player.skipLongForwardVideo = function(longMinutes)
{
    this.skipForward(longMinutes*60*1000);
};

Player.skipBackward = function(time)
{
    widgetAPI.putInnerHTML(document.getElementById("srtId"), ""); //hide subs while jumping
    window.clearTimeout(skipTimer);
    this.showControls();
    if(this.skipState == -1){
	skipTime = ccTime;
    }
    skipTime = +skipTime - time;
    if(+skipTime < Player.offset){
	skipTime = Player.offset;
    }
    this.skipState = this.REWIND;
    this.updateSeekBar(skipTime);
    skipTimer = window.setTimeout(this.skipInVideo, 2000);
};

Player.skipBackwardVideo = function()
{
    this.skipBackward(10*1000);
};

Player.skipLongBackwardVideo = function(longMinutes)
{
    this.skipBackward(longMinutes*60*1000);
};

Player.getState = function()
{
    return this.state;
};

// Global functions called directly by the player 

Player.onBufferingStart = function()
{
    Log("onBufferingStart");
    loadingStart();
    currentSubtitle = 0;
    subtitlesEnabled = this.getSubtitlesEnabled();
    this.setSubtitleProperties();
    this.showControls();
	if(Language.getisSwedish()){
	buff='Buffrar';
	}else{
	buff='Buffering';
	}
	$('.bottomoverlaybig').html(buff+': 0%');
};

Player.onBufferingProgress = function(percent)
{
    Log("onBufferingProgress");
    // Ignore if received without onBufferingStart. Seems sometimes 
    // it's received after onBufferingComplete.
    if (!Player.infoActive)
        return
    if(Language.getisSwedish()){
	buff='Buffrar';
    }else{
	buff='Buffering';
    }
    this.showControls();
    $('.bottomoverlaybig').html(buff+': ' + percent + '%');
    Player.refreshDetailsTimer();
};

Player.onBufferingComplete = function()
{
    Log("onBufferingComplete");
        loadingStop();
        reloaded = false;
	if(Language.getisSwedish()){
	buff='Buffrar';
	}else{
	buff='Buffering';
	}
	this.hideControls();
	this.setFullscreen();
//	this.setWindow();
   //$('.loader').css("display", "none");
};

Player.onRenderingComplete = function()
{
    Log("onRenderingComplete");
	Player.stopVideo();
        if (Player.repeat == Player.REPEAT_ONE) {
            Buttons.playItem();
        } else if (Player.repeat == Player.REPEAT_ALL) {
            Buttons.playNextItem(1);
        } else if (Player.repeat == Player.REPEAT_BACK) {
            Buttons.playNextItem(-1);
        }
};

Player.showControls = function(){

    if (Player.infoActive)
        return

    Player.infoActive = true;
    // Restore Top OSD in case of "Auto 2011"
    this.setTopOSDText();
    $('.topoverlayresolution').show();
    $('.video-wrapper').show();				
    $('.video-footer').show();
    this.setClock();
  // Log("show controls");
};

Player.setClock = function() {
    window.clearTimeout(clockTimer);
    clockTimer = setClock($('.topoverlayclock'), Player.setClock);
}

Player.hideControls = function(){
    if (Player.detailsActive)
        return;
    window.clearTimeout(osdTimer);
    window.clearTimeout(clockTimer);
    $('.topoverlayresolution').hide();
    $('.video-wrapper').hide();				
    $('.video-footer').hide();
    $('.bottomoverlaybig').html("");
    Player.infoActive = false;
    // Log("hide controls");
};

Player.showDetailedInfo = function(){
    if (Player.detailsActive)
        return;
    // Log("showDetailedInfo");
    Player.detailsActive = true;
    Player.setDetailsData(Details.fetchedDetails);
    $('.details-wrapper').show();
    Player.showControls();
    $('.topoverlaybig').hide();
};

Player.setDetailsData = function(details) {
    $('.detailstitle').html(details.title);
    $('.detailsdescription').html(details.description); 
};

Player.returnKey = function() {
    if (ccTime!=0 && (Player.detailsActive || Player.infoActive))
        Player.hideDetailedInfo();
    else
	Player.stopVideo();
};

Player.hideDetailedInfo = function(){
    // Log("hideDetailedInfo");
    if (Player.detailsActive) {
        Player.detailsActive = false;
        $('.detailstitle').html("");
        $('.detailsdescription').html(""); 
        $('.details-wrapper').hide();
        $('.topoverlaybig').show();
    }
    Player.hideControls();
};

Player.setCurTime = function(time)
{
	// work-around for samsung bug. Mute sound first after the player started.
	if(startup){
		startup = false;
		Audio.setCurrentMode(smute);
	}
	ccTime = +time + Player.offset;
	if(this.skipState == -1){
	    this.updateSeekBar(ccTime);
	}
	if (this.state != this.PAUSED) { // because on 2010 device the device triggers this function even if video is paused
	    this.setCurSubtitle(ccTime);
        }
        Player.refreshStartData(Details.fetchedDetails);
        // Seem onStreamInfoReady isn't invoked in case new stream in playlist is chosen.
        if (this.plugin.GetVideoWidth() != videoWidth) {
            Player.onStreamInfoReady();
            Player.updateTopOSD()
        }
};

Player.updateSeekBar = function(time){
	var tsecs = time / 1000;
	var secs  = Math.floor(tsecs % 60);
	var mins  = Math.floor(tsecs / 60);
        var hours = Math.floor(mins / 60);
	var smins;
	var ssecs;

        mins  = Math.floor(mins % 60);

	if(mins < 10){
		smins = '0' + mins;
	}
	else{
		smins = mins;
	}
	if(secs < 10){
		ssecs = '0' + secs;
	}
	else{
		ssecs = secs;
	}
	
	$('.currentTime').text(hours + ':' + smins + ':' + ssecs);
        Player.setFrontPanelTime(hours, mins, secs);
	
        var progressFactor = time / Player.GetDuration();
        if (progressFactor > 1)
            progressFactor = 1;
	var progress = Math.floor(MAX_WIDTH * progressFactor);
	$('.progressfull').css("width", progress);
   // Display.setTime(time);
   this.setTotalTime();
	
}; 

Player.onStreamInfoReady = function()
{
    videoWidth = this.plugin.GetVideoWidth();
    this.setTotalTime();
    this.setResolution(videoWidth, this.plugin.GetVideoHeight());
};

Player.setTotalTime = function()
{
	var tsecs = this.GetDuration() / 1000;
	var secs  = Math.floor(tsecs % 60);
	var mins  = Math.floor(tsecs / 60);
        var hours = Math.floor(mins / 60);
	var smins;
	var ssecs;

        mins = Math.floor(mins % 60);
	if(mins < 10){
		smins = '0' + mins;
	}
	else{
		smins = mins;
	}
	if(secs < 10){
		ssecs = '0' + secs;
	}
	else{
		ssecs = secs;
	}
	
	$('.totalTime').text(hours + ':' + smins + ':' + ssecs);
    //Display.setTotalTime(Player.GetDuration());
};

Player.showInfo = function(force)
{
    if (!Player.infoActive || force) {
	this.showControls();
        Player.refreshOsdTimer(5000);
    }
    else
    {
        this.hideControls();
    }

};

Player.showDetails = function()
{
    if (!Details.fetchedDetails || Details.fetchedDetails.name == "") {
        // See if update may help...
        Details.fetchData(detailsUrl)
        Player.showInfo();
    } else if (!Player.detailsActive) {
	this.showDetailedInfo();
        window.clearTimeout(osdTimer);
    } else {
        // Update in case of channel where details may change
        Details.fetchData(detailsUrl)
        this.hideDetailedInfo();
    }
};

Player.OnNetworkDisconnected = function()
{
        loadingStop();
	Player.showControls();
        Player.enableScreenSaver();
	$('.bottomoverlaybig').html('Network Error!');
	// just to test the network so that we know when to resume
	 $.ajax(
			    {
			        type: 'GET',
			        // url: 'http://188.40.102.5/recommended.ashx',
                                url: 'http://www.svtplay.se/populara?sida=1',
					timeout: 10000,
			        success: function(data, status, xhr)
			        {
                                    if (xhr.responseText.split("</article>").length > 1)
                                    {
			        	Log('Success:' + this.url);
                                        if (!reloaded) {
                                            if (channel == "dplay")
                                                Dplay.refreshPlayUrl(function(){Player.reloadVideo()});
                                            else
                                                Player.reloadVideo();
                                        }
			            } else {
			        	Log('Failure');
			        	$.ajax(this);
			            }
			        },
			        error: function(XMLHttpRequest, textStatus, errorThrown)
			        {
			        		Log('Failure');
			        		$.ajax(this);
         
			        }
			    });
};

Player.GetDuration = function()
{
    var duration = this.plugin.GetDuration() - Player.durationOffset;

    if (duration > this.sourceDuration)
        return duration;
    else
        return this.sourceDuration;
};

Player.toggleRepeat = function() {

    this.repeat = (this.repeat+1) % (Player.REPEAT_ONE+1);
    this.updateTopOSD();
};

Player.IsAutoBwUsedFor2011 = function() {
    // During "AUTO Bandwith" resolution can change which isn't reported to 2011 devices.
    return (deviceYear == 2011 && Player.bw == "")
}

Player.setTopOSDText = function(init_text) {
    var resolution_text = init_text;
    if (Player.IsAutoBwUsedFor2011()) {
        resolution_text = ""
    } else if (resolution_text == undefined) {
        resolution_text = $('.topoverlayresolution').html().replace(/^([^)]+\)(.*bps)?)*.*/, "$1");
    }
    resolution_text = resolution_text + this.getAspectModeText() + this.getRepeatText();
    $('.topoverlayresolution').html(resolution_text.replace(/^(&nbsp;)+/,""));
};

Player.updateTopOSD = function() {
    Player.setTopOSDText();
    $('.topoverlayresolution').show();
    Player.refreshOsdTimer(3000);
};

Player.toggleAspectRatio = function() {

    if (!this.IsAutoBwUsedFor2011()) {
        this.aspectMode = (this.aspectMode+1) % (Player.ASPECT_ZOOM+1)
    }
    else 
    {
        this.aspectMode = Player.ASPECT_NORMAL;
    }
    this.setAspectRatio(this.plugin.GetVideoWidth(), this.plugin.GetVideoHeight());
    // Update OSD
    this.updateTopOSD()
    if (this.IsAutoBwUsedFor2011())
        $('.topoverlayresolution').html("ASPECT unsupported when AUTO BW");
};

Player.setResolution = function (videoWidth, videoHeight) {

    if (videoWidth  > 0 && videoHeight > 0) {
        var aspect = videoWidth / videoHeight;
        if (aspect == 16/9) {
            aspect = "16:9";
        } else if (aspect == 4/3) {
            aspect = "4:3";
        }
        else {
            aspect = aspect.toFixed(2) + ":1";
        }
        Player.setTopOSDText(videoWidth + "x" + videoHeight + " (" + aspect + ")" + this.bw);
        this.setAspectRatio(videoWidth, videoHeight);
    }
};

Player.setAspectRatio = function(videoWidth, videoHeight) {

    // During "AUTO Bandwith" resolution can change which doesn't seem to be
    // reported to 2011 devices. So then Crop Area would be all wrong.
    if (videoWidth > 0 && videoHeight > 0 && !Player.IsAutoBwUsedFor2011()) {
        if (Player.aspectMode === Player.ASPECT_H_FIT && videoWidth/videoHeight > 4/3)
        {
            var cropOffset = Math.floor((GetMaxVideoWidth() - (4/3*GetMaxVideoHeight()))/2);
            var cropX      = Math.round(videoWidth/GetMaxVideoWidth()*cropOffset);
            var cropWidth  = videoWidth-(2*cropX);
            this.plugin.SetCropArea(cropX, 0, cropWidth, videoHeight);
        } else if (Player.aspectMode === Player.ASPECT_ZOOM) {
            var zoomFactor = Player.getZoomFactor()
            var cropY      = Math.round(videoHeight*zoomFactor);
            var cropHeight = videoHeight-(2*cropY);
            var cropX      = 0;
            if (videoWidth/cropHeight > 16/9 && zoomFactor > 0) {
                cropX      = Math.round((videoWidth-(16/9*cropHeight))/2);
            }
            var cropWidth  = videoWidth-(2*cropX);
            this.plugin.SetCropArea(cropX, cropY, cropWidth, cropHeight);
        }
        else
        {
            this.plugin.SetCropArea(0, 0, videoWidth, videoHeight);
        }
        // Re-pause
        if (this.state === this.PAUSED) {
            this.plugin.Pause();
        }
    }
};

Player.getAspectModeText = function()
{
    if (this.aspectMode === Player.ASPECT_H_FIT) {
        return SEPARATOR + "H-FIT";
    } else if (this.aspectMode === Player.ASPECT_ZOOM) {
        return SEPARATOR + "ZOOM " + (Player.getZoomFactor()*100).toFixed(1) + "%";
    }
    else 
        return "";
};

Player.getRepeatText = function()
{
    if (this.repeat === Player.REPEAT_OFF) {
        return "";
    } else if (this.repeat === Player.REPEAT_ONE) {
        return SEPARATOR + "Repeat ONE";
    } else if (this.repeat === Player.REPEAT_ALL) {
        return SEPARATOR + "Repeat ALL";
    } else if (this.repeat === Player.REPEAT_BACK) {
        return SEPARATOR + "Repeat BACKWARDS";
    }
};

Player.getZoomFactor = function () {
    var savedValue = Config.read("zoomFactor");
    if (savedValue != null) {
        return Number(savedValue);
    } else {
        return 0.125;
    }
};

Player.saveZoomFactor = function (value) {
    Config.save("zoomFactor", value);
};

Player.changeZoom = function(increase) {

    var oldZoomFactor = Player.getZoomFactor();
    if (increase)
        Player.saveZoomFactor(oldZoomFactor + 0.01);
    else if (oldZoomFactor >= 0.005)
        Player.saveZoomFactor(oldZoomFactor - 0.005);

    if (oldZoomFactor != Player.getZoomFactor())
        Player.setAspectRatio(this.plugin.GetVideoWidth(), this.plugin.GetVideoHeight());

    Player.updateTopOSD();
}

Player.decreaseZoom = function() {

    Player.zoomFactor = Player.zoomFactor - 0.01;
    if (Player.zoomFactor < 0)
        Player.zoomFactor = 0;
    Player.zoom(Player.zoomFactor);
    Player.updateTopOSD();
}

Player.startPlayer = function(url, isLive, startTime)
{
    reloaded = false;
    loadingStart();
    window.clearTimeout(detailsTimer);
    Player.startTime = 0;
    Player.offset = 0;
    Player.durationOffset = 0;
    if(Language.getisSwedish()){
	buff='Buffrar';
    }else{
	buff='Buffering';
    }

    if (isLive && +startTime != 0) {
        Player.updateOffset(startTime);
    }
    Player.startTime = startTime;
    
    subtitles = [];
    ccTime = 0;
    lastPos = 0;
    videoWidth = null;
    Player.setTopOSDText("");
    $('.currentTime').text("");
    $('.totalTime').text("");
    $('.progressfull').css("width", 0);

    $('#outer').hide();
    this.hideDetailedInfo();
    this.showControls();
    $('.bottomoverlaybig').html(buff+': 0%');
    
    var oldKeyHandleID = Buttons.getKeyHandleID();
    Buttons.setKeyHandleID(2);
    
    if ( Player.init() && Audio.init())
    {
	
	Player.stopCallback = function()
	{
	    $('#outer').show();
            Player.hideDetailedInfo();
	    Buttons.setKeyHandleID(oldKeyHandleID);
	    /* Return to windowed mode when video is stopped
	       (by choice or when it reaches the end) */
	    //   Main.setWindowMode();
	};
        if (this.GetPlayUrl(url, isLive) != -1) {
            Details.fetchData(url);
            detailsUrl = url;
        }
    } else
        Log("INIT FAILED!!!!!");
};

Player.refreshStartData = function(details) {
    if (details && details.start_time != 0 && details.start_time != Player.startTime) {
        Log("refreshStartData, new start" + details.start_time);
        Player.setNowPlaying(details.title);
        Player.setDuration(details.duration);
        Player.updateOffset(details.start_time);
        Player.setDetailsData(details);
    }
};
    
Player.updateOffset = function (startTime) {
    var start_mins     = Player.startTimeToMinutes(startTime);
    var old_start_mins = Player.startTimeToMinutes(Player.startTime);
    var diff_mins      = 0;
    if (old_start_mins != 0) {
        diff_mins = start_mins - old_start_mins;
        if (old_start_mins > start_mins)
            // Time passed midnight
            diff_mins = diff_mins + 24*60;
    }
    if (diff_mins > 0) {
        Log("New startTime:" + startTime + " old:" + Player.startTime + " diff:" + diff_mins + " offset:" + Player.offset + " durationOffset:" + Player.durationOffset);

        Player.offset = Player.offset - (diff_mins*60*1000);
        Player.durationOffset = Player.durationOffset + (diff_mins*60*1000);
        Log("New offset:" + Player.offset + " new durationOffset:" + Player.durationOffset);
    } else {
        var now = getCurrentDate();
        var now_secs = (now.getHours()*3600) + (now.getMinutes()*60) + now.getSeconds();

        if ((start_mins*60) > now_secs)
            // Time passed midnight
            now_secs = now_secs + (24*3600);
        Player.offset = (now_secs - (start_mins*60))*1000;
    }
    Player.startTime = startTime;
        // Log("startTime:" + startTime + " start_mins:" + start_mins + " now_mins:" + now_mins + " Player.offset:" + Player.offset);
}

Player.startTimeToMinutes = function (startTime) {
    if (startTime == 0)
        return 0
    var start_mins = startTime.match(/([0-9]+)[:.]/)[1]*60;
    return (start_mins + startTime.match(/[:.]([0-9]+)/)[1]*1);
};

Player.checkPlayUrlStillValid = function(gurl) {
    if (requestedUrl != gurl) {
        Log("gurl skipped:" + gurl + " requestedUrl:" + requestedUrl);
        return false;
    }
    return true;
};

Player.GetPlayUrl = function(gurl, isLive, altUrl) {
    gurl = Svt.fixLink(gurl);
    // Log("gurl:" + gurl);
    requestedUrl = gurl;
    if (channel == "viasat") {
        Viasat.getPlayUrl(gurl, isLive);
    } else if (channel == "tv4") {
        Tv4.getPlayUrl(gurl, isLive);
    } else if (channel == "dplay") {
        Dplay.getPlayUrl(gurl, isLive);
    } else {

        var stream_url, url_param = '?output=json';

        if (gurl.indexOf('?') != -1)
            url_param = '&output=json'; 
        var stream_url = gurl;
        if (gurl.indexOf("/kanaler/") == -1)
            stream_url = (altUrl) ? altUrl : gurl+url_param;

        requestUrl(stream_url,
                   function(status, data)
                   {
                       if (Player.checkPlayUrlStillValid(gurl)) {
                           var videoReferences, subtitleReferences, srtUrl = null;
                           if (gurl.indexOf("/kanaler/") != -1) {
                               data = Svt.decodeJson(data).context.dispatcher.stores.ScheduleStore;
		               for (var i = 0; i < data.channels.length; i++) {
                                   if (data.channels[i].title == data.activeChannelId) {
                                       data = data.channels[i];
                                       // No subtitles
                                       data.disabled = true;
                                       data.subtitleReferences = []
                                       break;
                                   }
                               }
                           } else {
                               data = JSON.parse(data.responseText);
                           }
                           
                           if (data.video)
                               videoReferences = data.video.videoReferences
                           else
                               videoReferences = data.videoReferences;

		           for (var i = 0; i < videoReferences.length; i++) {
		               Log("videoReferences:" + videoReferences[i].url);
		               videoUrl = videoReferences[i].url;
		               if(videoUrl.indexOf('.m3u8') >= 0){
			           break;
		               }
		           }
                           if (data.video)
                               subtitleReferences = data.video.subtitleReferences
                           else
                               subtitleReferences = data.subtitleReferences;

                           for (var i = 0; i < subtitleReferences.length; i++) {
		               Log("subtitleReferences:" + subtitleReferences[i].url);
                               if (subtitleReferences[i].url.indexOf(".m3u8") != -1)
                                   continue
		               srtUrl = subtitleReferences[i].url;
                               if (srtUrl.length > 0){
			           break;
		               }
		           }
                           if (!altUrl && !srtUrl && !data.disabled && data.context.programVersionId) {
                               // Try alternative url
                               altUrl = SVT_ALT_API_URL + data.context.programVersionId;
                               return Player.GetPlayUrl(gurl, isLive, altUrl);
                           }

		           if(videoUrl.indexOf('.m3u8') >= 0){
		               Resolution.getCorrectStream(videoUrl, isLive, srtUrl);
		           }
                           else{
		               gurl = gurl + '?type=embed';
		               Log(gurl);
		               widgetAPI.runSearchWidget('29_fullbrowser', gurl);
		               // //	$('#outer').css("display", "none");
		               // //	$('.video-wrapper').css("display", "none");
		               
		               // //	$('.video-footer').css("display", "none");

		               // //	$('#flash-content').css("display", "block");
		               // //	$('#iframe').attr('src', gurl);
		           }
	               }
                   }
                  );
    };
    return 0
};

// Subtitles support
Player.toggleSubtitles = function () {

    if (subtitleStatusPrinted) {
        if (subtitlesEnabled && subtitles.length > 0) {
            if (this.getSubtitleBackground()) {
                // Toggle background
                this.setSubtitleBackground(false)
            } else {
                this.setSubtitleBackground(true)
                subtitlesEnabled = false;
            }
        } else {
            subtitlesEnabled = true;
        }
        Config.save("subEnabled",subtitlesEnabled*1);
    } else {
        // Only show status the first time
        subtitleStatusPrinted = true;
    }

    if (!subtitlesEnabled || $("#srtId").html() == "" || $("#srtId").html().match(/Subtitle/i)) {
        this.printSubtitleStatus();
    }
};

Player.printSubtitleStatus = function () {
    if (subtitlesEnabled && subtitles.length > 0) {
        this.setSubtitleText("Subtitles On", 2500);
    } else if (!subtitlesEnabled && subtitles.length > 0) {
        this.setSubtitleText("Subtitles Off", 2500);
    } else {
        this.setSubtitleText("Subtitles not available", 2500);
    }
};

Player.getSubtitlesEnabled = function () {
    var savedValue = Config.read("subEnabled");
    if (savedValue) {
        return savedValue == "1";
    } else {
        return false;
    }
};

Player.fetchSubtitle = function (srtUrl) {
    if (channel == "viasat")
        return Viasat.fetchSubtitle(srtUrl)
    else if (channel == "tv4")
        return Tv4.fetchSubtitle(srtUrl)

    asyncHttpRequest(srtUrl,
                     function(data) {
                         Player.parseSubtitle(data);
                     }
                    );
};

Player.parseSubtitle = function (data) {
    try {
        subtitles = [];
        var srtContent = this.strip(data.replace(/\r\n|\r|\n/g, '\n').replace(/(^[0-9:.]+ --> [0-9:.]+) .+$/mg,'$1').replace(/<\/*[0-9]+>/g, ""));
        srtContent     = srtContent.split('\n\n');
        for (var i = 0; i < srtContent.length; i++) {
            this.parseSrtRecord(srtContent[i]);
        }
        // for (var i = 0; i < 10 && i < subtitles.length; i++) {
        //     Log("start:" + subtitles[i].start + " stop:" + subtitles[i].stop + " text:" + subtitles[i].text);
        //     // Log("srtContent[" + i + "]:" + srtContent[i]);
        //     this.parseSrtRecord(srtContent[i]);
        // }
    } catch (err) {
        Log("parseSubtitle failed:" + err);
    }
};

Player.strip = function (s) {
    return s.replace(/^\s+|\s+$/g, "");
};

Player.srtTimeToMS = function (srtTime) {
    var ts = srtTime.replace(',', '.').match('([0-9]+):([0-9]+):([0-9.]+)');
    return Math.round((ts[1]*3600 + ts[2]*60 + ts[3]*1)*1000);
};

Player.parseSrtRecord = function (srtRecord) {
    srtRecord = srtRecord.split("\n");
    var start = srtRecord[1].match(/([^ 	]+)[ 	]+-->[ 	]+/)[1];
    var stop  = srtRecord[1].match(/[ 	]+-->[ 	]+([^ 	]+)/)[1];
    subtitles.push(
        {
            start: this.srtTimeToMS(start),
            stop:  this.srtTimeToMS(stop),
            text:  srtRecord.slice(2).join("<br />").replace(/<br \/>$/, "")
        }
    );
};

Player.setCurSubtitle = function (time) {
    try {
        if (subtitlesEnabled && this.state != this.STOPPED) {
            var now = Number(time);
            if (now === lastSetSubtitleTime) {
                // Seems we get multiple callback for same time...
                now += 500;
            }
            lastSetSubtitleTime = now;

            for (var i = currentSubtitle; i < subtitles.length; i++) {
                var thisStart = subtitles[i].start;
                var thisStop  = subtitles[i].stop;
                // Log("i:" + i + " start:" + thisStart + " stop:" + thisStop + " now:" + now);
                if ((thisStart <= now) && (now < thisStop)) {
                    // This Sub should be shown (if not already shown...)
                    if (currentSubtitle != i || currentSubtitle === 0) {
                        this.setSubtitleText(subtitles[i].text, thisStop-now);
                        currentSubtitle = i;
                    }
                    break;
                } else if (now > subtitles[currentSubtitle].stop) {
                    // Current sub is done.
                    // Log("Clearing srt due to end");
                    this.clearSrtUnlessConfiguring();
                }
                if (subtitles[i+1] && subtitles[i+1].start > now) {
                    // Next isn't ready yet - we're done.
                    break;
                }
            }
        } else {
            this.clearSrtUnlessConfiguring();
        }
    } catch (err) {
        Log("setCurSubtitle failed: " + err);
    }
};

Player.clearSrtUnlessConfiguring = function () {
    if (!$("#srtId").html().match(/Subtitle/i)) {
        widgetAPI.putInnerHTML(document.getElementById("srtId"), "");
    }
};

Player.setSubtitleText = function (text, timeout) {
    try {
        if (!text.match(/<br \/>/g)) {
            // If only one liner we want it at bottom
            text  = "<br />" + text;
        }
        this.refreshClrSubtitleTimer(timeout+100)
        $("#srtId").html(text);
        // Log("Showing sub:" + text);
    } catch (err) {
        Log("setSubtitleText failed:" + err);
    }
};

Player.refreshClrSubtitleTimer = function(timeout) {
    window.clearTimeout(clrSubtitleTimer);
    clrSubtitleTimer = window.setTimeout(function () {
        // Log("Clearing srt due to timer");
        $("#srtId").html("");
    }, timeout)
};

Player.refreshOsdTimer = function(value) {
    window.clearTimeout(osdTimer);
    if (!Player.detailsActive)
        osdTimer = window.setTimeout(this.hideControls, value);
};

Player.refreshDetailsTimer = function() {
    window.clearTimeout(detailsTimer); 
    if (detailsUrl.indexOf("/kanaler/") > -1) {
        detailsTimer = window.setTimeout(function () {
            Details.fetchData(detailsUrl);
            Player.refreshDetailsTimer();
        }, 1*60*1000);
    }
};

Player.getSubtitleSize = function () {
    var savedValue = Config.read("subSize");
    if (savedValue) {
        return Number(savedValue);
    } else {
        return 30;
    }
};

Player.getSubtitlePos = function () {
    var savedValue = Config.read("subPos");
    if (savedValue) {
        return Number(savedValue);
    } else {
        return 420;
    }
};

Player.getSubtitleLineHeight = function () {
    var savedValue = Config.read("subHeight");
    if (savedValue) {
        return Number(savedValue);
    } else {
        return 100;
    }
};

Player.getSubtitleBackground = function () {
    var savedValue = Config.read("subBack");
    if (savedValue != null) {
        return savedValue;
    } else {
        return true;
    }
};

Player.setSubtitleBackground = function (value) {
    Config.save("subBack", value); 
    this.setSubtitleProperties();
};

Player.saveSubtitleSize = function (value) {
    Config.save("subSize", value); 
};

Player.saveSubtitlePos = function (value) {
    Config.save("subPos", value);
};

Player.saveSubtitleLineHeight = function (value) {
    Config.save("subHeight", value);
};

Player.moveSubtitles = function (moveUp) {
    if (!subtitlesEnabled) return;
    var oldValue = this.getSubtitlePos();
    var newValue = (moveUp) ? oldValue-2 : oldValue+2;
    Log("moveSubtitles new:" + newValue);
    if (newValue > 300 && newValue < 550) {
        $("#srtId").css("top", newValue); // write value to CSS
        this.saveSubtitlePos(newValue);
        this.showTestSubtitle();
    }
};

Player.sizeSubtitles = function(increase) {
    if (!subtitlesEnabled) return;
    var oldValue = this.getSubtitleSize();
    var newValue = (increase) ? oldValue+1 : oldValue-1;
    Log("sizeSubtitles new:" + newValue);
    if (newValue > 15 && newValue < 51) {
        $("#srtId").css("font-size", newValue); // write value to CSS
        this.saveSubtitleSize(newValue);
        this.showTestSubtitle();
    }
};

Player.separateSubtitles = function(increase) {
    if (!subtitlesEnabled) return;
    var oldValue = this.getSubtitleLineHeight();
    var newValue = (increase) ? oldValue+1 : oldValue-1;
    Log("separateSubtitles new:" + newValue);
    if (newValue >= 100 && newValue < 200) {
        if (newValue == 100) {
            $("#srtId").css("line-height", ""); // write value to CSS
        } else {
            $("#srtId").css("line-height", newValue + "%"); // write value to CSS
        }
        this.saveSubtitleLineHeight(newValue);
        this.showTestSubtitle();
    }
};

Player.showTestSubtitle = function () {
    this.hideDetailedInfo();
    var testText = "Test subtitle<br />Test subtitle";
    if ($("#srtId").html() == "" || $("#srtId").html() == testText) 
    {
        this.setSubtitleText(testText, 2500);
    }
}

Player.setSubtitleProperties = function() {
    $("#srtId").show();
    $("#srtId").css("font-size", this.getSubtitleSize());
    $("#srtId").css("top", this.getSubtitlePos());
    var subBack = this.getSubtitleBackground();
    var lineHeight = this.getSubtitleLineHeight();
    if (lineHeight > 100 && subBack)
        $("#srtId").css("line-height", lineHeight + "%");
    else
        $("#srtId").css("line-height", "");
    if (subBack)
        $("#srtId").css("background-color", "rgba(0, 0, 0, 0.5)");
    else
        $("#srtId").css("background-color", "");
};

Player.enableScreenSaver = function() {
    pluginAPI.setOnScreenSaver(5*60);
};

Player.disableScreenSaver = function() {
    pluginAPI.setOffScreenSaver();
};

GetMaxVideoWidth = function() {
    if (deviceYear > 2011) 
        return MAX_WIDTH;
    return 960;
};

GetMaxVideoHeight = function() {
    if (deviceYear > 2011) 
        return MAX_HEIGHT;
    return 540;
};
