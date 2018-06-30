var skipTime = 0;
var skipTimeInProgress = false;
var osdTimer; 
var clockTimer; 
var skipTimer; 
var detailsTimer;
var delayedPlayTimer = 0;
var pluginAPI = new Common.API.Plugin();
var fpPlugin;
var ccTime = 0;
var resumeTime = 0;
var bufferCompleteCount = 0;
var videoBw = null;
var lastPos = 0;
var resumeJump = null;
var videoUrl;
var videoData = {};
var masterUrl;
var detailsUrl;
var requestedUrl = null;
var backgroundLoading = false;
var startup = true;
var smute = 0;
var hlsSubsState = null;
var subtitles = [];
var subtitlesEnabled = false;
var lastSetSubtitleTime = 0;
var currentSubtitle = -1;
var clrSubtitleTimer = 0;
var subtitleStatusPrinted = false;
var retries = 0;
var SEPARATOR = "&nbsp;&nbsp;&nbsp;&nbsp;"
var useSef=true;

var Player =
{
    plugin : null,
    state : -1,
    skipState : -1,
    stopCallback : null,    /* Callback function to be set by client */
    originalSource : null,
    sourceDuration: 0,
    pluginDuration: 0,
    infoActive:false,
    detailsActive:false,
    helpActive:false,
    isLive:false,
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

Player.togglePlayer = function() {
    Log("Player.togglePlayer()")
    Player.deinit();
    Player.plugin = null;
    useSef = !useSef;
}

Player.init = function()
{
    var success = true;
    this.state = this.STOPPED;
    if (this.plugin)
        return success;

    if (deviceYear > 2010 && useSef) {
        Log("Using sef");
        this.plugin = document.getElementById("pluginSef");
        Log("Player Open:" + this.plugin.Open('Player', '1.112', 'Player'));
        this.plugin.OnEvent = Player.OnEvent;
    } else {
        Log("Not using sef");
        this.plugin = document.getElementById("pluginPlayer");
        this.plugin.Execute = function(Name){
            var args=[];
            if (Name == "StartPlayback") {
                Name = "ResumePlay";
                args.push(videoUrl)
            }
            Name = "Player.plugin." + Name
            if (eval(Name)) {
                for (var i=1; i < arguments.length; i++) {
                    if (typeof(arguments[i]) === 'string') {
                        args.push('"' + arguments[i]+'"');
                    } else
                        args.push(arguments[i])
                };
                args.join(",")
                Name = Name  + "(" + args + ");";
                // alert(Name);
                return eval(Name)
            } else
                alert("ignoring: " + Name)
        };
        this.plugin.OnCurrentPlayTime = 'Player.SetCurTime';
        this.plugin.OnStreamInfoReady = 'Player.OnStreamInfoReady';
        this.plugin.OnBufferingStart = 'Player.OnBufferingStart';
        this.plugin.OnBufferingProgress = 'Player.OnBufferingProgress';
        this.plugin.OnBufferingComplete = 'Player.OnBufferingComplete';           
        this.plugin.OnRenderingComplete  = 'Player.OnRenderingComplete'; 
        this.plugin.OnNetworkDisconnected = 'Player.OnNetworkDisconnected';
        this.plugin.OnConnectionFailed = 'Player.OnConnectionFailed';
        this.plugin.OnStreamNotFound   = 'Player.OnStreamNotFound';
        this.plugin.OnRenderError      = 'Player.OnRenderError';
        this.plugin.OnAuthenticationFailed = 'Player.OnAuthenticationFailed';
    }
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
    return success;
};

Player.OnEvent = function(EventType, param1, param2) {
    switch (EventType) 
    {
    case 1: //OnConnectionFailed();
        Player.OnConnectionFailed();
        break;
    case 2: //OnAuthenticationFailed();
        Player.OnAuthenticationFailed();
    case 3: //OnStreamNotFound();
        Player.OnStreamNotFound();
        break;
    case 4: //OnNetworkDisconnected();
        Player.OnNetworkDisconnected();
        break;
    case 6: //OnRenderError();
        Player.OnRenderError(param1);
        break;
    case 7: //OnRenderingStart();
        Player.OnRenderingStart();
        break;
    case 8: //OnRenderingComplete();
        Player.OnRenderingComplete();
        break;
    case 9: //OnStreamInfoReady();
        Player.OnStreamInfoReady();
        break;
    case 11: //OnBufferingStart();
        Player.OnBufferingStart();
        break;
    case 12: //OnBufferingComplete();
        Player.OnBufferingComplete();
        break;
    case 13: //OnBufferingProgress();
        Player.OnBufferingProgress(param1);
        break;
    case 14: //SetCurTime(param1);
        Player.SetCurTime(param1);
        break;
        //'15' : 'AD_START',
        //'16' : 'AD_END',
    case 17: // 'RESOLUTION_CHANGED'
        Player.OnStreamInfoReady(true);
        Player.updateTopOSD();
        break;
    case 18: // 'BITRATE_CHANGED'
        // Ignore BW since it seems it reacts on new data instead of buffered data. 
        // I.e. it's updated before resolution... 
        break;
    case 19: // 'SUBTITLE'
        if (subtitlesEnabled)
            Player.setSubtitleText(param1.replace(/< *\/br>/g, "<br />").replace(/<br \/>$/, ""))
        break;
    case 100: // LICENSE_FAILURE?'
        Player.OnRenderError("DRM License failed");
        break;
        //'19' : 'SUBTITLE'
    default:
        Log("SefPlayer event " + EventType + "(" + param1 + ", " + param2 + ")");
        break;
    }
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
        if (Player.plugin)
            Player.plugin.Execute("Stop");
        Player.disableScreenSaver();
        Player.storeResumeInfo();
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
	//Player.plugin.Execute("SetDisplayArea", 0, 0, GetMaxVideoWidth(), GetMaxVideoHeight());
    Log("SetDisplayArea:" + Player.plugin.Execute("SetDisplayArea", 0, 0, 1, 1) + " 1x1");
    
};

Player.setFullscreen = function()
{
    Log("SetDisplayArea:" + Player.plugin.Execute("SetDisplayArea", 0, 0, GetMaxVideoWidth(), GetMaxVideoHeight()) + " " + GetMaxVideoWidth() + "x" +  GetMaxVideoHeight());
};

Player.setVideoURL = function(master, url, srtUrl, extra)
{
    videoData = {};
    if (!extra) extra  = {};

    masterUrl = master;

    if (extra.bw) {
        this.bw = " " + Player.BwToString(extra.bw);
    } else {
        this.bw = "";
    }
    videoUrl = url;
    videoData.url           = videoUrl;
    videoData.audio_idx     = extra.audio_idx;
    videoData.subtitles_idx = extra.subtitles_idx;

    if (deviceYear >= 2011 && videoUrl.match(/=WMDRM/)) {
        Player.plugin.Execute("InitPlayer", videoUrl);
        if (extra.license) {
            if (extra.customdata) {
                videoData.customdata = extra.customdata;
                Log("CustomData:" + extra.customdata, true);
                Player.plugin.Execute("SetPlayerProperty", 3, extra.customdata, extra.customdata.length);
            }
            Log("LICENSE URL: " + extra.license, true)
            videoData.license = extra.license;
            Player.plugin.Execute("SetPlayerProperty", 4, extra.license, extra.license.length);
        }
    }
    Log("VIDEO URL: " + videoUrl, true);
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

Player.getHlsVersion = function(url, callback) 
{
    var prefix = url.replace(/[^\/]+(\?.+)?$/,"");
    httpRequest(url, 
                {cb:function(status, data) {
                    var hls_version = data.match(/^#.*EXT-X-VERSION:\s*([0-9]+)/m)
                    if (hls_version)
                        hls_version = +hls_version[1]
                    else if (data.match(/^([^#].+\.m3u8.*$)/m)) {
                        url = data.match(/^([^#].+\.m3u8.*$)/m)[1]
                        if (!url.match(/^http/))
                            url = prefix + url;
                        return Player.getHlsVersion(url, callback)
                    }
                    else 
                        hls_version = null
                    callback(hls_version)
                },
                 timeout:2000
                })
};

Player.playVideo = function()
{
    // Check requestedUrl to avoid race when Playback has been aborted.
    if (videoUrl == null || requestedUrl == null)
    // if (videoUrl == null)
    {
        Log("No videos to play");
    }
    else
    {
        Player.plugin.Execute("Stop");
        Player.setFrontPanelText(Player.FRONT_DISPLAY_PLAY);
        Player.disableScreenSaver();
        this.setWindow();

        // Player.plugin.Execute("SetInitialBuffer", 640*1024);
        // Player.plugin.Execute("SetPendingBuffer", 640*1024);
        // Player.plugin.Execute("SetTotalBufferSize", 640*1024);        
        startup = true;
        if(Audio.plugin.GetUserMute() == 1){
                $('.muteoverlay').show();
        	smute = 1;
        }
        else{
            $('.muteoverlay').hide();
            smute = 0;
        }

        resumeTime = this.getStoredResumeTime();

        delayedPlayTimer = 0;
        if (resumeTime) {
            $('.bottomoverlaybig').html("Press ENTER to resume");
            // Give some extra seconds to resume
            window.clearTimeout(delayedPlayTimer);
            delayedPlayTimer = window.setTimeout(function() 
                                                 {
                                                     delayedPlayTimer = -1;
                                                     Player.plugin.Execute("Play", videoUrl);
                                                 }, 
                                                 2000
                                                );
        } else {
            Player.plugin.Execute("Play", videoUrl);
        }
        this.state = this.PLAYING;

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
    if (this.state === this.PAUSED) {
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
    Player.plugin.Execute("Pause");
};

Player.stopVideo = function(keep_playing)
{
    this.state = this.STOPPED;
    requestedUrl = null;
    hlsSubsState = null;
    Player.storeResumeInfo();
    widgetAPI.putInnerHTML(document.getElementById("srtId"), "");
    $("#srtId").hide();
    Player.hideVideoBackground();
    window.clearTimeout(delayedPlayTimer);
    loadingStop();
    Player.setFrontPanelText(Player.FRONT_DISPLAY_STOP);
    Player.enableScreenSaver();
    window.clearTimeout(detailsTimer);
    window.clearTimeout(skipTimer);
    this.skipState = -1;
    Player.plugin.Execute("Stop");
    if (this.stopCallback)
    {
        this.stopCallback(keep_playing);
    }
};

Player.resumeVideo = function()
{
    Player.disableScreenSaver();
    Player.setFrontPanelText(Player.FRONT_DISPLAY_PLAY);
	//Player.plugin.Execute("ResumePlay", vurl, time);
    if (this.state == this.PLAYING)
        Player.plugin.Execute("SetPlaybackSpeed", 1);
    this.state = this.PLAYING;
    Player.plugin.Execute("Resume");
    this.hideDetailedInfo();
};

Player.reloadVideo = function(time)
{
    retries = retries+1;
    Player.plugin.Execute("Stop");
    Player.plugin.Execute("InitPlayer", videoData.url);
    if (videoData.customdata)
        Player.plugin.Execute("SetPlayerProperty", 3, videoData.customdata, videoData.customdata.length);
    if (videoData.license)
        Player.plugin.Execute("SetPlayerProperty", 4, videoData.license, videoData.license.length);
    if (time)
        ccTime = time;
    lastPos = Math.floor((ccTime-Player.offset) / 1000.0);
    Player.disableScreenSaver();
    Player.setFrontPanelText(Player.FRONT_DISPLAY_PLAY);
    Log("video reloaded result:" + Player.resumePlayback(lastPos) + " url: " + videoUrl + " pos: " + lastPos + " org time:" + time + " ccTime:" + ccTime);
    this.state = this.PLAYING;
};

Player.skipInVideo = function()
{
    if (startup) {
        // Can't skip yet...
        skipTimer = null;
        return null;
    }
    window.clearTimeout(osdTimer);
    var timediff = +skipTime - +ccTime;
    timediff = timediff / 1000;
    if(timediff > 0) {
        Log("forward jump: " + timediff, true);
    	Player.plugin.Execute("JumpForward", timediff);
    }
    else if(timediff < 0){
    	timediff = 0 - timediff;
    	Log("backward jump: " + timediff, true);
    	Player.plugin.Execute("JumpBackward", timediff);
    }
    skipTimeInProgress = skipTime;
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

Player.SetBufferingText = function(percent) {
    var buff = (Language.getisSwedish()) ? 'Buffrar' : 'Buffering';
    $('.bottomoverlaybig').html(buff + ': ' + percent + '%');
}

Player.OnBufferingStart = function()
{
    Log("OnBufferingStart");
    loadingStart();
    currentSubtitle = 0;
    subtitlesEnabled = this.getSubtitlesEnabled();
    this.setSubtitleProperties();
    this.showControls();
    if ($('.bottomoverlaybig').html().match(/Press ENTER/)) {
        // No Resume
        resumeTime = 0
    }
    Player.SetBufferingText(0);
};

Player.OnBufferingProgress = function(percent)
{
    Log("OnBufferingProgress");
    // Ignore if received without onBufferingStart. Seems sometimes 
    // it's received after onBufferingComplete.
    if (!Player.infoActive)
        return
    this.showControls();
    Player.SetBufferingText(percent);
    Player.refreshDetailsTimer();
};

Player.OnBufferingComplete = function()
{
    Log("OnBufferingComplete");
    $('.bottomoverlaybig').html("");
    retries = 0;
    if (!useSef)
        Player.OnRenderingStart();
    if (startup && startup != true && bufferCompleteCount == 0) {
        // Resuming - wait for next buffering complete
        bufferCompleteCount = bufferCompleteCount + 1;
        return
    }
    // Only reset in case no additional skip is in progess
    if (skipTime == skipTimeInProgress) {
        this.skipState = -1; 
        skipTime = 0;
        skipTimeInProgress = false;
    }
    if (this.skipState == -1) {
        loadingStop();
        this.hideControls();

        if ($('.video-background').is(':visible'))
            Player.playbackStarted();
    }
};

Player.OnRenderingStart = function()
{
    Log("OnRenderingStart");
    if (resumeJump) {
        Log("jump:"+Player.plugin.Execute("JumpForward", resumeJump)+" resumeJump:" + resumeJump);
        resumeJump = null;
    }
    if (Details.fetchedDetails && Details.fetchedDetails.parent_show)
        History.addShow(Details.fetchedDetails);
};

Player.OnRenderingComplete = function()
{
    Log("OnRenderingComplete");
    Player.storeResumeInfo();
    var keepPlaying = false;
    if (Player.repeat == Player.REPEAT_ONE) {
        keepPlaying = true;
        Player.stopVideo(keepPlaying);
        keepPlaying = (Buttons.playItem() != -1);
    } else if (Player.repeat == Player.REPEAT_ALL) {
        // playNextItem will stop video if there's a next
        keepPlaying = (Buttons.playNextItem(1) != -1);
    } else if (Player.repeat == Player.REPEAT_BACK) {
        // playNextItem will stop video if there's a next
        keepPlaying = (Buttons.playNextItem(-1) != -1);
    }
    // Check if we need to stop. E.g. no repeat or repeat reached the end.
    if (!keepPlaying)
        Player.stopVideo(keepPlaying);
};

Player.getResumeList = function() {
    var resumeList = Config.read("resumeList");
    if (!resumeList)
        return []
    return resumeList
}

Player.removeResumeInfo = function(url) {
    var resumeList = Player.getResumeList()
    for (var i = 0; i < resumeList.length; i++) {
        if (resumeList[i].url == url) {
            resumeList.splice(i, 1)
            return resumeList
        }
    }
    return resumeList
}

Player.storeResumeInfo = function() {
    if (masterUrl && resumeTime > 20 && !Player.isLive) {
        Log("Player.storeResumeInfo, resumeTime:" + resumeTime + " duration:" + Player.GetDuration() + " masterUrl:" + masterUrl + " !Player.isLive:" + !Player.isLive);

        var masterKey  = masterUrl.replace(/\|.+/, "").replace(/\?.+/,"");
        var resumeList = Player.removeResumeInfo(masterKey);
        if (resumeTime < (0.97*Player.GetDuration()/1000)) {
            resumeList.unshift({url:masterKey, time:resumeTime});
            resumeList = resumeList.slice(0,20);
        }
        Config.save("resumeList", resumeList);
        resumeTime = 0;
    }
}

Player.getStoredResumeTime = function() {
    if (!Player.isLive) {
        var master = masterUrl.replace(/\|.+/, "").replace(/\?.+/,"");
        var resumeList = Player.getResumeList();
        for (var i = 0; i < resumeList.length; i++) {
            if (resumeList[i].url == master) {
                return resumeList[i].time;
            }
        }
    }
    return null
}

Player.showControls = function(){

    window.clearTimeout(osdTimer);
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

Player.playbackStarted = function() {
    // Log("Player.playbackStarted")
    Player.hideVideoBackground();
    loadingStop();
    this.hideControls();
};

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
    var extra = "";
    if (details.air_date)
        extra = "Sändes " + dateToHuman(details.air_date).toLowerCase() + SEPARATOR;
    if (details.avail_date)
        extra = extra + "Tillgänglig till " + dateToHuman(details.avail_date).toLowerCase();
    if (extra != "")
        extra = "<br><br>" + extra
    $('.detailsdescription').html(details.description + extra);
};

Player.keyReturn = function() {
    if (ccTime!=0 && (Player.detailsActive || Player.infoActive))
        Player.hideDetailedInfo();
    else
	Player.stopVideo();
};

Player.startPlayback = function(time) {
    window.clearTimeout(delayedPlayTimer);
    // Stop in case delayedPlayTimer already expired...
    Player.plugin.Execute("Stop");
    if (!videoUrl.match(/=WMDRM/))
        Player.plugin.Execute("InitPlayer", videoUrl);
    Player.resumePlayback(time);
};

Player.keyEnter = function()
{
    if ($('.bottomoverlaybig').html().match(/Press ENTER/)) {
        $('.bottomoverlaybig').html("Resuming");
        startup = resumeTime-10;
        Player.startPlayback(startup);
    } else if(!$('.bottomoverlaybig').html().match(/Resuming/)) {
        Player.togglePause();
    }
};

Player.resumePlayback = function(time) {
    // Seems Auto and at least HLS has issues with resume...
    if ("Auto" == Resolution.getTarget(Player.isLive) && videoUrl.match("=HLS")) {
        Player.plugin.Execute("Play", videoUrl);
        resumeJump = time;
    } else {
        Player.plugin.Execute("StartPlayback", time);
    }
}

Player.hideDetailedInfo = function(){
    // Log("hideDetailedInfo");
    if (Player.detailsActive) {
        Player.detailsActive = false;
        Player.helpActive = false;
        $('.detailstitle').html("");
        $('.detailsdescription').html(""); 
        $('.details-wrapper').hide();
        $('.topoverlaybig').show();
    }
    Player.hideControls();
};

Player.GetResolution = function() {
    var res = Player.plugin.Execute("GetVideoResolution").split("|");
    return {width:Number(res[0]),height: Number(res[1])}
}
Player.SetCurTime = function(time)
{
        if (this.state == this.STOPPED)
            return;
	if(startup) {
            if (startup != true && (time/1000 < (startup-5))) {
                Log("SetCurTime waiting for resume, time:" + time + " startup:" + startup)
                // resuming - wait
                return
            }
            Player.playbackStarted();
	    startup = false;
            // work-around for samsung bug. Mute sound first after the player started.
	    Audio.setCurrentMode(smute);
            if (Player.isLive && +Player.startTime != 0 && +time < 30000) {
                Player.updateOffset(Player.startTime);
            }
            Player.setResolution(Player.GetResolution());
            if (!skipTimer && skipTime)
                window.setTimeout(this.skipInVideo, 0);
	} else
            resumeTime = +time/1000;
	ccTime = +time + Player.offset;
	if(this.skipState == -1){
	    this.updateSeekBar(ccTime);
	}

	if (this.state != this.PAUSED) { // because on 2010 device the device triggers this function even if video is paused
	    this.setCurSubtitle(ccTime);
        }
        Player.refreshStartData(Details.fetchedDetails);
        // Seem onStreamInfoReady isn't invoked in case new stream in playlist is chosen.
        // Ignore to check BW since it seems it reacts on new data instead of buffered data. 
        // I.e. it's updated before resolution... 
        // if (Player.GetResolution().width != videoWidth) {
        //     Player.OnStreamInfoReady(true);
        //     Player.updateTopOSD()
        // }
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
    var progress = Math.floor(time/Player.GetDuration()*100);
    if (progress > 100)
        progress = 100;
    $('.progressfull').css("width", progress + "%");
    // Display.setTime(time);
    this.setTotalTime();
    
}; 

Player.BwToString = function(bw) {
    if (!bw)
        return null;
    if (Number(bw) >= 1000000) {
        return (Number(bw)/1000000).toFixed(1) + " mbps";
    } else
        return Math.round(Number(bw)/1000) + " kbps";
}

Player.OnStreamInfoReady = function(forced)
{
    Log("OnStreamInfoReady, forced:" + forced);
    var resolution = Player.GetResolution();
    videoBw = Player.plugin.Execute("GetCurrentBitrates");
    if (this.bw && videoBw && this.bw != (" " + Player.BwToString(videoBw)))
        Log("videoBw difference:" + Player.BwToString(videoBw) + this.bw);
    this.setResolution(resolution);
    Player.pluginDuration = Player.plugin.Execute("GetDuration");
    this.setTotalTime();
    if (videoData.audio_idx)
        Log("SetStreamID Audio: " + videoData.audio_idx + " res: " + Player.plugin.Execute("SetStreamID", 1, videoData.audio_idx));
    if (videoData.subtitles_idx >= 0) {
        Log("StartSubtitle res: " + Player.plugin.Execute("StartSubtitle", videoData.url.replace(/\|.+$/, "")));
        Log("Number of Subtitles:" + Player.plugin.Execute('GetTotalNumOfStreamID',5));
        Log("SetStreamID Subtitles: " + videoData.subtitles_idx + " res: " + Player.plugin.Execute("SetStreamID", 5, videoData.subtitles_idx));
    }
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
    } else if (Player.helpActive || !Player.detailsActive) {
        // reset if help is active.
        Player.helpActive = false;
        Player.detailsActive = false;
	this.showDetailedInfo();
        window.clearTimeout(osdTimer);
    } else {
        // Update in case of channel where details may change
        Details.fetchData(detailsUrl, true)
        this.hideDetailedInfo();
    }
};

Player.showHelp = function () {
    if (Player.helpActive) {
        this.hideDetailedInfo();
    } else {
        this.showDetailedInfo();
        $('.detailstitle').html("HELP");
        $('.detailsdescription').html(Player.GetHelpText());
        window.clearTimeout(osdTimer);
        Player.helpActive = true;
    }
}

Player.OnConnectionFailed = function()
{
    Log("OnConnectionFailed"); 
    Player.checkHls(function(){Player.OnNetworkDisconnected("Connection Failed!")});
};

Player.OnNetworkDisconnected = function(text)
{
    if (!text) {
        Log("OnNetworkDisconnected"); 
        text = "Network Error!";
    }
    Player.retryVideo(text)
};

Player.retryVideo = function (text, max) {
    if (!max)
        max = 1

    if (retries < max ) {
        // Check if we should reload or not.
        loadingStart();
        $.ajax({type: 'GET',
	        // url: 'http://188.40.102.5/recommended.ashx',
                url: 'http://www.svtplay.se',
	        timeout: 5000,
	        success: function(data, status, xhr)
	        {
                    var time = (resumeTime) ? (resumeTime-10)*1000 : null;
		    Log('Success:' + this.url + " resumeTime:" + time);
                    $('.bottomoverlaybig').html("Re-connecting"); 
                    Player.showControls();
                    Channel.refreshPlayUrl(function(){Player.reloadVideo(time)});
	        },
	        error: function(XMLHttpRequest, textStatus, errorThrown)
	        {
		    Log('Failure:' + this.url);
                    Player.PlaybackFailed(text);
	        }
	       });
    } else {
        Player.PlaybackFailed(text);
    }

};

Player.OnStreamNotFound = function()
{
    Player.PlaybackFailed('OnStreamNotFound');
};

Player.OnRenderError = function(number)
{
    Log("Player.OnRenderError:" + number);
    var text = "Can't play this. Error: " + number;
    Player.checkHls(function(){Player.PlaybackFailed(text)})
};

Player.checkHls = function(OtherCalback) {
    // Seems stop before OnBufferingStart gives e.g. OnRenderError
    // Can also happen in case "resume" is chosen too late...
    if (Player.state != Player.STOPPED && delayedPlayTimer != -1) {
        if(videoUrl.indexOf("=HLS") != -1 && videoUrl.indexOf(":10666/") == -1) {
            var thisVideoUrl = videoUrl;
            Player.getHlsVersion(videoUrl.replace(/\|.+/,""), 
                                 function(hls_version) {
                                     if (hls_version && hls_version > 3) {
                                         var text = 'HLS Version ' + hls_version + ' unsupported.';
                                         Player.PlaybackFailed(text);
                                     } else {
                                         OtherCalback();
                                     }
                                 }
                                )
        } else {
            OtherCalback();
        }
    }
};

Player.OnAuthenticationFailed = function()
{
    Player.PlaybackFailed('OnAuthenticationFailed');
};

Player.PlaybackFailed = function(text)
{
    Log("Player.PlaybackFailed");
    Log(text); 
    loadingStop();
    Player.showControls();
    Player.enableScreenSaver();
    $('.bottomoverlaybig').html(text);
    Channel.tryAltPlayUrl(videoUrl, 
                          function(){
                              Log("Trying alternative");
                              $('.bottomoverlaybig').html("Trying alternative stream");
                              Player.reloadVideo()
                          }
                         );
};

Player.GetDuration = function()
{
    if (!this.sourceDuration && 
        Details.fetchedDetails && 
        Details.fetchedDetails.duration
       )
        Player.setDuration(Details.fetchedDetails.duration);

    var duration = this.sourceDuration;
    if (Player.plugin && !Player.pluginDuration ) {
        Player.pluginDuration = Player.plugin.Execute("GetDuration");
        duration = Player.pluginDuration - Player.durationOffset
    }

    if (this.sourceDuration > duration)
        duration = this.sourceDuration;

    if (ccTime > duration) 
        duration = ccTime;

    return duration;
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
    if ($('.topoverlayresolution').is(':hidden')) {
        $('.topoverlayresolution').show();
        Player.refreshOsdTimer(3000);
    }
};

Player.toggleAspectRatio = function() {

    if (!this.IsAutoBwUsedFor2011()) {
        this.aspectMode = (this.aspectMode+1) % (Player.ASPECT_ZOOM+1)
    }
    else 
    {
        this.aspectMode = Player.ASPECT_NORMAL;
    }
    this.setAspectRatio(Player.GetResolution());
    // Update OSD
    this.updateTopOSD()
    if (this.IsAutoBwUsedFor2011())
        $('.topoverlayresolution').html("ASPECT unsupported when AUTO BW");
};

Player.setResolution = function (resolution) {

    if (resolution.width  > 0 && resolution.height > 0) {
        var aspect = resolution.width / resolution.height;
        if (aspect == 16/9) {
            aspect = "16:9";
        } else if (aspect == 4/3) {
            aspect = "4:3";
        }
        else {
            aspect = aspect.toFixed(2) + ":1";
        }
        // Only use given bw in case of "Auto-mode"
        var bw = (this.bw || !videoBw) ? this.bw : " " + Player.BwToString(videoBw);
        Player.setTopOSDText(resolution.width + "x" + resolution.height + " (" + aspect + ")" + bw);
        this.setAspectRatio(resolution);
    } else {
        this.setFullscreen();
        Log("Missing resolution: " + resolution.width + "x" + resolution.height);
    }
};

Player.setAspectRatio = function(resolution) {

    var aspect = resolution.width/resolution.height;
    // During "AUTO Bandwith" resolution can change which doesn't seem to be
    // reported to 2011 devices. So then Crop Area would be all wrong.
    if (resolution.width > 0 && resolution.height > 0 && !Player.IsAutoBwUsedFor2011()) {
        if (Player.aspectMode === Player.ASPECT_H_FIT && aspect > 4/3)
        {
            var cropOffset = Math.floor((GetMaxVideoWidth() - (4/3*GetMaxVideoHeight()))/2);
            var cropX      = Math.round(resolution.width/GetMaxVideoWidth()*cropOffset);
            var cropWidth  = resolution.width-(2*cropX);
            Player.plugin.Execute("SetCropArea", cropX, 0, cropWidth, resolution.height);
        } else if (Player.aspectMode === Player.ASPECT_H_FIT) {
            Player.setFullscreen();
        } else {
            resolution.aspect = aspect;
            if (Player.aspectMode === Player.ASPECT_ZOOM) {
                Player.zoom(resolution);
            } else {
                Player.plugin.Execute("SetCropArea", 0, 0, resolution.width, resolution.height);
                Player.scaleDisplay(resolution);
            }
        }
        // Re-pause
        if (this.state === this.PAUSED) {
            Player.plugin.Execute("Pause");
        }
    }
};

Player.scaleDisplay = function (resolution) {
    var factor = (resolution.aspect >= 16/9) ? 
        // Wider than high - "extend/limit" based on width
        GetMaxVideoWidth()/resolution.width : 
        // Wider than high - "extend/limit" based on height
        GetMaxVideoHeight()/resolution.height;
        
    var width  = Math.min(GetMaxVideoWidth(),  resolution.width*factor);
    var height = Math.min(GetMaxVideoHeight(), resolution.height*factor);
    
    var x = Math.floor((GetMaxVideoWidth()-width)/2);
    var y = Math.floor((GetMaxVideoHeight()-height)/2);
    // Log("scaleDisplay:"+x+","+y+","+width+","+height + " resolution:" + JSON.stringify(resolution));
    Player.plugin.Execute("SetDisplayArea", x, y, Math.floor(width), Math.floor(height));
};

Player.zoom = function(resolution) {

    var zoomFactor = Player.getZoomFactor()
    var cropY      = resolution.height*zoomFactor;
    var cropHeight = resolution.height-(2*cropY);
    var cropX      = 0;

    if (resolution.width/cropHeight > 16/9 && zoomFactor > 0) {
        // Must start cropping also in width
        cropX = (resolution.width-(16/9*cropHeight))/2;
    }
    var cropWidth = resolution.width-(2*cropX);

    if (resolution.aspect < 16/9) {
        Player.scaleDisplay({width:cropWidth, height:cropHeight, aspect:cropWidth/cropHeight});
    }
    // Log("SetCropArea:"+cropX+","+cropY+","+cropWidth+","+cropHeight+" resolution:"+JSON.stringify(resolution) + " zoom:" + (Player.getZoomFactor()*100).toFixed(1) + "%");
    Player.plugin.Execute("SetCropArea", Math.round(cropX), Math.round(cropY), Math.round(cropWidth), Math.round(cropHeight));
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
        Player.setAspectRatio(Player.GetResolution());

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
    var oldKeyHandleID = Buttons.getKeyHandleID();
    var background     = itemSelected.find('.ilink').attr("data-background");

    Buttons.setKeyHandleID(2);

    retries = 0;
    window.clearTimeout(detailsTimer);
    Player.startTime = startTime;
    Player.isLive = isLive;
    Player.offset = 0;
    Player.durationOffset = 0;
    Player.pluginDuration = 0;

    videoUrl = "";
    subtitles = [];
    ccTime = 0;
    lastPos = 0;
    videoBw = null;
    videoData = {};
    resumeJump = null;
    bufferCompleteCount = 0;
    Player.skipState = -1;
    skipTime = 0;
    skipTimeInProgress = false;
    this.hideDetailedInfo();
    Player.setTopOSDText("");
    $('.currentTime').text("");
    $('.totalTime').text("");
    $('.progressfull').css("width", 0);
    Player.setVideoBackground(background);
    if (!$('.bottomoverlaybig').html().match(/Trying alternative/))
        $('.bottomoverlaybig').html('');
    if ( Player.init() && Audio.init())
    {

	Player.stopCallback = function(keep_playing)
	{
            if (!keep_playing) {
	        $('#outer').show();
                Player.hideDetailedInfo();
            }
	    Buttons.setKeyHandleID(oldKeyHandleID);
	};
        requestedUrl = url;
        Channel.getPlayUrl(url, isLive);
        Details.fetchData(url);
        detailsUrl = url;
    } else
        Log("INIT FAILED!!!!!");
};

Player.setVideoBackground = function(img) {

    Player.hideVideoBackground();
    complete = function() {
        Player.showControls();
        loadingStart();
        $('#outer').hide();
    };
    if (img) {
        alert("Background:" + img);
        $('.video-background').html('<img class="image" src="' + img  + '"/>')
        backgroundLoading = true;
        window.setTimeout(function () {
            if (backgroundLoading)
                complete();
        }, 300)
        loadImage(img,
                  function() {
                      if (backgroundLoading) {
                          $('.video-background').show();
                          complete();
                          backgroundLoading = false;
                      }
                  },
                  1000
                 );
    } else
        complete()
};

Player.hideVideoBackground = function() {
    backgroundLoading = false;
    $('.video-background').hide();
    $('.video-background').html("");
}

Player.refreshStartData = function(details) {
    if (Player.isLive && details && details.start_time != 0 && details.start_time != Player.startTime) {
        Log("refreshStartData, new start:" + details.start_time + " old start:" + Player.startTime);
        Player.setNowPlaying(details.title);
        Player.pluginDuration = Player.plugin.Execute("GetDuration");
        Player.setDuration(details.duration);
        Player.updateOffset(details.start_time);
        Player.setDetailsData(details);
    } else if (!Player.sourceDuration && details.duration)
        Player.setDuration(details.duration);
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
}

Player.startTimeToMinutes = function (startTime) {
    if (!startTime)
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

// Subtitles support
Player.hasSubtitles = function() {
    return (subtitles.length > 0 || videoData.subtitles_idx >=0)
}
Player.toggleSubtitles = function () {

    if (subtitleStatusPrinted) {
        if (subtitlesEnabled && Player.hasSubtitles()) {
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
    if (subtitlesEnabled && Player.hasSubtitles()) {
        this.setSubtitleText("Subtitles On", 2500);
    } else if (!subtitlesEnabled && Player.hasSubtitles()) {
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

Player.fetchSubtitles = function (srtUrls, hlsSubs, usedRequestedUrl, extra) {
    var anyFailed = false;
    var offset = -1;
    var delta  = 0;
    if (srtUrls && srtUrls.list) {
        srtUrls = srtUrls.list
    } else if (srtUrls) {
        srtUrls = [srtUrls]
    }
    if (!extra) extra = {};
    if (extra.offset)
        offset = extra.offset;
    httpLoop(srtUrls,
             function(url, data, status, totalData) {
                 if (!Player.checkPlayUrlStillValid(usedRequestedUrl))
                     return -1;

                 if (status != 200)
                     anyFailed = true;
                 else if (data) {
                     if (url.match(/\.(web)?vtt/)) {
                         data   = Player.parseVttSubtitles(data, offset, delta, extra)
                         offset = data.offset;
                         delta  = data.delta;
                         data   = data.data;
                     }
                     data = data + "\n\n";

                     if (hlsSubsState) {
                         if (!Player.updateHlsSubsState(data, offset, usedRequestedUrl, extra))
                             return -1;
                     }
                     // alert(data)
                     return data
                 }
                 return ""
             },
             function(srtData) {
                 if (Player.checkPlayUrlStillValid(usedRequestedUrl)) {
                     if (anyFailed && hlsSubs) {
                         Player.fetchHlsSubtitles(hlsSubs, usedRequestedUrl, extra)
                     } else {
                         if (!hlsSubsState && srtData != "")
                             Player.parseSubtitle(srtData);
                         if (hlsSubsState) {
                             extra.done = true;
                             Player.updateHlsSubsState(null, offset, usedRequestedUrl, extra)
                         }
                         if (extra.cb) extra.cb();
                     }
                 }
             },
             {headers:Channel.getHeaders(),
              max : extra.max
             }
            );
};

Player.parseVttSubtitles = function(data, offset, delta, extra) {
    var newOffset = data.match(/TIMESTAMP-MAP=MPEGTS:([0-9]+)/)
    if (newOffset) {
        newOffset = newOffset[1]
        if (offset != -1)
            delta = delta + (newOffset - offset)/90000;
        offset = newOffset;
    }
    data = data.slice(data.search(/^[0-9]/m));
    data = data.replace(/^([0-9]+:[0-9]+\.[0-9]+ -->)/mg,"00:$1").replace(/--> ([0-9]+:[0-9]+\.[0-9]+)/mg,"--> 00:$1");
    if (!data.match(/^[0-9]+[	 ]*(\r)?\n[0-9]+:/m))
        data = data.replace(/(^[0-9:.]+ --> [0-9:.]+)/mg, "0\n$1")
    if (delta > 0)
        data = Player.addVttOffset(data, delta)
    return {data:data, offset:offset, delta:delta}
};

Player.addVttOffset = function (data, delta) {
    var timeStamps = data.match(/([0-9]+:[0-9]+:[0-9]+\.[0-9]+)/mg);
    var ts, s;
    for (var i=0; timeStamps && i < timeStamps.length; i++) {
        ts = timeStamps[i].split(/[:.]/);
        s  = +ts[0]*3600 + +ts[1]*60 + +ts[2] + delta;
        ts[0] = Math.floor(s/3600);
        s = s - ts[0]*3600;
        ts[1] = Math.floor(s/60);
        ts[2] = s - ts[1]*60;
        for (var k=0; k < 3; k++)
            if (ts[k] < 10)
                ts[k] = "0" + ts[k]
        ts = ts[0] + ":" + ts[1] + ":" + ts[2] + "." + ts[3];
        data = data.replace(timeStamps[i],ts)
    }
    return data
}

Player.updateHlsSubsState = function(data, offset, usedRequestedUrl, extra) {
    // Resume isn't considered at the moment...
    var time = (skipTimeInProgress) ? skipTimeInProgress : ccTime;

    if (extra.done) {
        hlsSubsState.running = false;
        // Log("HLS subtitles back to standby start:" + hlsSubsState.start + " current:" + hlsSubsState.current + " end:" + hlsSubsState.end + " offset:" + hlsSubsState.offset + " time:" + time);
        return true
    }

    Player.parseSubtitle(data, hlsSubsState.offset != -1);
    if (hlsSubsState.offset == -1) {
        hlsSubsState.offset = offset;
    }
    hlsSubsState.current = hlsSubsState.current + hlsSubsState.duration;

    if (skipTime || time > hlsSubsState.end || time < hlsSubsState.start) {
        Log("HLS subtitles aborted  start:" + hlsSubsState.start + " current:" + hlsSubsState.current + " end:" + hlsSubsState.end + " offset:" + hlsSubsState.offset + " time:" + time);
        hlsSubsState.end     = hlsSubsState.current;
        hlsSubsState.running = false;
        return false
    }
    return true
};

Player.checkHlsSubtitles = function(extra) {
    if (!hlsSubsState ||
        skipTime ||
        hlsSubsState.running ||
        (ccTime >= hlsSubsState.start && hlsSubsState.end > (ccTime+(10*1000))))
        return

    var segments = Math.round(10*1000/hlsSubsState.duration) + 1;
    var urlIndex;


    if (hlsSubsState.end == 0 || ccTime > hlsSubsState.end || ccTime < hlsSubsState.start) {
        urlIndex = Math.floor(ccTime/hlsSubsState.duration);
        // Log("checkHlsSubtitles - new period start:" + hlsSubsState.start + " current:" + hlsSubsState.current + " end:" + hlsSubsState.end + " offset:" + hlsSubsState.offset + " time:" + ccTime);
        hlsSubsState.start   = urlIndex*hlsSubsState.duration;
        hlsSubsState.current = hlsSubsState.start;
        hlsSubsState.end     = hlsSubsState.start;
    } else {
        urlIndex = Math.floor(hlsSubsState.end/hlsSubsState.duration);
        // Log("checkHlsSubtitles - prolong period start:" + hlsSubsState.start + " current:" + hlsSubsState.current + " end:" + hlsSubsState.end + " offset:" + hlsSubsState.offset + " time:" + ccTime);
    }
    if ((urlIndex+segments) > hlsSubsState.urls.length)
        segments = hlsSubsState.urls.length-1-urlIndex;
    if (segments < 1)
        return;

    hlsSubsState.end = hlsSubsState.end + (segments*hlsSubsState.duration);
    hlsSubsState.running = true;
    if (!extra) extra = {};
    extra.offset = hlsSubsState.offset;
    // Log("Fecthing " + segments + " hls segments starting from " + urlIndex + " start:" + hlsSubsState.start + " current:" + hlsSubsState.current + " end:" + hlsSubsState.end + " offset:" + hlsSubsState.offset + " time:" + ccTime);
    Player.fetchSubtitles({list:hlsSubsState.urls.slice(urlIndex, urlIndex+segments)},
                          null,
                          hlsSubsState.req_url,
                          extra
                         );
};

Player.fetchHlsSubtitles = function (hlsSubs, usedRequestedUrl, extra) {
    var duration = 0;
    httpLoop(hlsSubs,
             function(url, data) {
                 duration = data.match(/EXT-X-TARGETDURATION: *([0-9]+)/);
                 if (duration) {
                     duration = (+duration[1])*1000;
                 }

                 var urls = data.match(/^([^#].+)$/mg)
                 var prefix  = url.replace(/[^\/]+(\?.+)?$/,"");
                 if (urls) {
                     for (var i=0; i < urls.length; i++) {
                         if (!urls[i].match(/http[s]?:/))
                             urls[i] = prefix + urls[i]
                     }
                     return urls.join(" ") + " "
                 }
                 else
                     return ""
             },
             function (urls) {
                 urls = urls.trim().split(" ");
                 if (Player.checkPlayUrlStillValid(usedRequestedUrl)) {
                     // Doesn't necessarily work in case of multiple hlsSubs...
                     hlsSubsState = {urls      : urls,
                                     duration  : duration,
                                     req_url   : usedRequestedUrl,
                                     offset    : -1,
                                     start     : 0,
                                     current   : 0,
                                     end       : 0,
                                     running   : false
                                    };
                     Log("Starting main HLS subtitle fetching")
                     Player.checkHlsSubtitles(extra)
                 }
             },
             {headers:Channel.getHeaders()}
            );
};

Player.parseSubtitle = function (data, append) {
    try {
        if (!append) subtitles = [];
        var srtContent = this.strip(data.replace(/\r\n|\r|\n/g, '\n').replace(/\n\n*/g,"\n").replace(/(^([0-9]+\n)?[0-9:.,]+ --> [0-9:.,]+)(.+)?\n/mg,'\n$1\n').replace(/<\/*[0-9]+>/g, ""));
        srtContent = srtContent.split('\n\n');
        for (var i = 0; i < srtContent.length; i++) {
            this.parseSrtRecord(srtContent[i]);
        }
        subtitles.sort(function(a, b){return a.start-b.start})
        this.mergeSubtitles()
        // for (var i = 0; !append && i < 10 && i < subtitles.length; i++) {
        //     alert("start:" + subtitles[i].start + " stop:" + subtitles[i].stop + " text:" + subtitles[i].text);
        //     // Log("srtContent[" + i + "]:" + srtContent[i]);
        // }
    } catch (err) {
        Log("parseSubtitle failed:" + err);
    }
};

Player.mergeSubtitles = function() {
    if (subtitles.length) {
        var tmpSubtitles = subtitles;
        subtitles = []
        for (var i = 0; i < tmpSubtitles.length; i++) {
            if (tmpSubtitles[i+1] && tmpSubtitles[i].text == tmpSubtitles[i+1].text)
                tmpSubtitles[i+1].start = tmpSubtitles[i].start
            else
                subtitles.push(tmpSubtitles[i])
        }
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
    try {
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
    } catch (err) {
        Log("parseSrtRecord failed: " + err)
    }
};

Player.setCurSubtitle = function (time) {
    try {
        Player.checkHlsSubtitles();
        if (subtitlesEnabled && Player.state != Player.STOPPED) {
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
        if (timeout >= 0)
            this.refreshClrSubtitleTimer(timeout+100);
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
            Details.fetchData(detailsUrl, true);
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
    if (subBack) {
        if (deviceYear >= 2014)
            $("#srtId").css("background-color", "rgba(0, 0, 0, 0.7)");
        else
            $("#srtId").css("background-color", "rgba(0, 0, 0, 0.5)");
    } else {
        $("#srtId").css("background-color", "");
    }
};

Player.enableScreenSaver = function() {
    pluginAPI.setOnScreenSaver(5*60);
};

Player.disableScreenSaver = function() {
    pluginAPI.setOffScreenSaver();
};

GetMaxVideoWidth = function() {
    // Seems 1280x720 doesn't really work for HD variants either...
    // if (deviceYear > 2011) 
    //     return MAX_WIDTH;
    return 960;
};

GetMaxVideoHeight = function() {
    // Seems 1280x720 doesn't really work for HD variants either...
    // if (deviceYear > 2011) 
    //     return MAX_HEIGHT;
    return 540;
};

Player.GetHelpText = function() {
    var help = '<table style="margin-bottom:40px;width:100%;border-collapse:collapse;margin-left:auto;margin-right:auto;">'
    help = InsertHelpRow(help, "INFO", "Details");
    help = InsertHelpRow(help, "RED", "Repeat");
    help = InsertHelpRow(help, "YELLOW", "Subtitles");
    help = InsertHelpRow(help, "BLUE", "Aspect");
    help = InsertHelpRow(help, "UP/DOWN", "Subtitles Position/Zoom Level");
    help = InsertHelpRow(help, "2/8", "Subtitles Size");
    help = InsertHelpRow(help, "4/6", "Subtitles Distance (if background is used)");
    return help + "</table>";
}

InsertHelpRow = function(Html, Key, Text) {
    var style =' style="padding:4px;border: 1px solid white;"'
    return Html+'<tr><td'+style+'>'+Key+'</td><td'+style+'>'+Text+"</td></tr>";
}

