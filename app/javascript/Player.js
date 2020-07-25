var skipTime = 0;
var skipTimeInProgress = false;
var osdTimer; 
var clockTimer; 
var skipTimer; 
var detailsTimer;
var delayedPlayTimer = 0;
var fpPlugin;
var ccTime = 0;
var resumeTime = 0;
var bufferCompleteCount = 0;
var videoBw = null;
var lastPos = 0;
var resumeJump = null;
var videoUrl;
var videoData = {};
var detailsUrl;
var requestedUrl = null;
var backgroundLoading = false;
var startup = false;
var retries = 0;
var SEPARATOR = '&nbsp;&nbsp;&nbsp;&nbsp;';
var useSef=true;
var screenSaverTimer=null;
var Player = {
    plugin : null,
    pluginPlayer:0,
    PLUGIN_AVPLAYER:0,
    PLUGIN_VIDEOJS:1,
    pluginToggled:false,

    state : -1,
    skipState : -1,
    srtState : -1,
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

    bw:'',

    repeat:0,
    REPEAT_OFF:0,
    REPEAT_BACK:1,
    REPEAT_ALL:2,
    REPEAT_ONE:3,

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

Player.OnEvent = function(EventType, param1, param2) {
    Log('Player.OnEvent ' + EventType + '(' + param1 + ', ' + param2 + ')');
    switch (EventType) {
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
    case 'PLAYER_MSG_RESOLUTION_CHANGED':
    case 'PLAYER_MSG_BITRATE_CHANGE':
        Player.OnStreamInfoReady(true);
        break;
    case 18: // 'BITRATE_CHANGED'
        // Ignore BW since it seems it reacts on new data instead of buffered data. 
        // I.e. it's updated before resolution... 
        break;
    case 19: // 'SUBTITLE'
        Subtitles.set(param1.replace(/< *\/br>/g, '<br />').replace(/<br \/>$/, ''));
        break;
    case 100: // LICENSE_FAILURE?'
        Player.OnRenderError('DRM License failed');
        break;
        //'19' : 'SUBTITLE'
    default:
        Log('SefPlayer event ' + EventType + '(' + param1 + ', ' + param2 + ')');
        break;
    }
};

Player.setFrontPanelTime = function (hours, mins, secs) {
    try {
        if (Player.state == Player.PLAYING)
            // Log('Setting frontPanelTime');
            fpPlugin.DisplayVFD_Time(hours, mins, secs);
    }
    catch (err) {
        // Log('setFrontPanelTime failed' + err);
    }

};

Player.setFrontPanelText = function (text) {
    try {
        fpPlugin.DisplayVFD_Show(text);
    }
    catch (err) {
        // Log('setFrontPanelText failed:' + err);
    }
};

Player.remove = function() {
    if (Player.plugin) {
        Player.plugin.remove();
        Player.plugin = null;
    }
    Player.disableScreenSaver();
    Player.storeResumeInfo();
};

Player.setFullscreen = function() {
    // Player.plugin.setFullscreen();
};

Player.setVideoURL = function(master, url, srtUrl, extra) {

    Player.checkCorrectPlugin(extra.use_vjs);

    if (!extra) extra = {};
    videoData = {srt_url:srtUrl, hls_subs:extra.hls_subs};

    if (extra.bw) {
        this.bw = ' ' + Player.BwToString(extra.bw);
    } else {
        this.bw = '';
    }
    videoData.key = {url:master.replace(/\|.+/, '').replace(/\?.+/,'')};
    var myTitle = itemSelected.find('.ilink').attr('href').match(/[?&](mytitle[^&]+)/);
    if (myTitle) {
        myTitle = myTitle[1];
        videoData.key.id = myTitle.replace(/mytitle=/,'');
    } else {
        // Happens when Show Info is missing.
        Log('No myTitle in link!!');
        myTitle = escape($('.topoverlaybig').html().replace(/[^:]+: /, ''));
        myTitle = 'mytitle=' + myTitle;
    }

    videoUrl                = url;
    videoData.component     = videoUrl.match(/\|COMPONENT=([^|]+)/);
    videoData.component     = videoData.component && videoData.component[1];
    videoData.bitrates      = videoUrl.replace(/\|COMPONENT=[^|]+/,'').replace(/^[^|]+\|?/,'');
    videoData.url           = videoUrl.replace(/\|.+/,'');
    videoData.audio_idx     = extra.audio_idx;
    videoData.subtitles_idx = extra.subtitles_idx;
    videoData.use_offset    = extra.use_offset;
    videoData.license       = extra.license;
    videoData.custom_data   = extra.customdata;
    Log('VIDEO URL: ' + videoUrl);
};

Player.setDuration = function(duration) {
    if (duration*1 == duration) {
        this.sourceDuration = duration * 1000;
    } else if (duration.length > 0) {
        if (duration.match(/^[0-9]+$/)) {
            this.sourceDuration = duration;
        }
        var h = this.GetDigits('h', duration);
        var m = this.GetDigits('min', duration);
        var s = this.GetDigits('sek', duration);
        // Log('decoded duration ' + h + ':' + m + ':' + s);
        this.sourceDuration = (h*3600 + m*60 + s*1) * 1000;
    }
    else {
        this.sourceDuration = 0;
    }
    // Log('Player.sourceDuration: ' + this.sourceDuration);
};

Player.setNowPlaying = function (Name) {
    var nowPlaying = 'Now playing';
    if(Language.getisSwedish()) {
        nowPlaying = 'Nu visas';
    }
    $('.topoverlaybig').html(nowPlaying+': ' + Name);
};

Player.GetDigits = function(type, data) {

    var regexp1 = new RegExp('^(\\d+) ' + type + '.*');
    var regexp2 = new RegExp('^.*\\D+(\\d+) ' + type + '.*');
    if (data.search(regexp1) != -1)
        return data.replace(regexp1, '$1');
    else if (data.search(regexp2) != -1)
        return data.replace(regexp2, '$1');
    else
        return '0';
};

Player.getHlsVersion = function(url, callback) {
    var prefix = getUrlPrefix(url);
    httpRequest(url,
                {cb:function(status, data) {
                    var hls_version = data.match(/^#.*EXT-X-VERSION:\s*([0-9]+)/m);
                    if (hls_version)
                        hls_version = +hls_version[1];
                    else if (data.match(/^([^#].+\.m3u8.*$)/m)) {
                        url = data.match(/^([^#].+\.m3u8.*$)/m)[1];
                        if (!url.match(/^http/))
                            url = prefix + url;
                        return Player.getHlsVersion(url, callback);
                    }
                    else
                        hls_version = null;
                    callback(hls_version);
                },
                 timeout:2000
                });
};

Player.playVideo = function() {
    // Check requestedUrl to avoid race when Playback has been aborted.
    if (videoUrl == null || requestedUrl == null) {
    // if (videoUrl == null) {
        Log('No videos to play');
    } else {
        Player.plugin.load(videoData);
        // Player.setFrontPanelText(Player.FRONT_DISPLAY_PLAY);
        Player.disableScreenSaver();

        resumeTime = this.getStoredResumeTime();

        delayedPlayTimer = 0;
        if (resumeTime) {
            $('.bottomoverlaybig').html('Press ENTER to resume');
            // Give some extra seconds to resume
            window.clearTimeout(delayedPlayTimer);
            delayedPlayTimer = window.setTimeout(function() {
                                                     delayedPlayTimer = -1;
                                                     Player.playIfReady();
                                                 }, 
                                                 2000
                                                );
        }
        // Fetch subtitles before playback.
        // Seems http requests interfer with start of playback
        Player.srtState = 1;
        Channel.fetchSubtitles(
            videoData.srt_url,
            videoData.hls_subs,
            requestedUrl,
            function() {
                Player.srtState = -1;
                Player.playIfReady();
            }
        );
        this.state = this.PLAYING;
    }
};

Player.playIfReady = function() {
    if (Player.srtState == -1) {
        if (startup && startup != true) {
            // Resuming
            window.clearTimeout(delayedPlayTimer);
            // Can resume have been chosen after delayedPlayTimer expired?
            Player.startPlayback(startup);
        } else if (!delayedPlayTimer || delayedPlayTimer == -1) {
            Player.startPlayback();
        }
    }
};

Player.togglePause = function() {
    if (this.state === this.PAUSED) {
        Player.resumeVideo();
    } else {
        Player.pauseVideo();
    }
};

Player.pauseVideo = function() {
	window.clearTimeout(osdTimer);
	this.showControls();
	var pp;
	if(Language.getisSwedish()){
		pp='Pausad';
	}else{
		pp='Pause';
	}
	$('.bottomoverlaybig').html(pp);

    Subtitles.pause();
    Player.enableScreenSaver();
    this.state = this.PAUSED;
    // Player.setFrontPanelText(Player.FRONT_DISPLAY_PAUSE);
    Player.plugin.pause();
};

Player.stopVideo = function(keep_playing) {
    this.state = this.STOPPED;
    requestedUrl = null;
    startup = false;
    Subtitles.stop();
    Player.storeResumeInfo();
    $('#video-container').hide();
    document.getElementById('srtId').innerHTML='';
    $('#srtId').hide();
    Player.hideVideoBackground();
    window.clearTimeout(delayedPlayTimer);
    loadingStop();
    // Player.setFrontPanelText(Player.FRONT_DISPLAY_STOP);
    Player.enableScreenSaver();
    window.clearTimeout(detailsTimer);
    window.clearTimeout(skipTimer);
    this.skipState = -1;
    this.srtState = -1;
    if (Player.plugin)
        Player.plugin.stop();
    if (this.stopCallback) {
        this.stopCallback(keep_playing);
    }
};

Player.resumeVideo = function() {
    Player.disableScreenSaver();
    // Player.setFrontPanelText(Player.FRONT_DISPLAY_PLAY);
    this.state = this.PLAYING;
    Player.plugin.resume();
    this.hideDetailedInfo();
};

Player.reloadVideo = function(time) {
    retries = retries+1;
    if (time)
        ccTime = time;
    lastPos = Math.floor((ccTime-Player.offset) / 1000.0);
    Player.disableScreenSaver();
    // Player.setFrontPanelText(Player.FRONT_DISPLAY_PLAY);
    Player.plugin.reload(videoData, Player.isLive, lastPos);
    Log('video reloaded url: ' + videoUrl + ' pos: ' + lastPos + ' org time:' + time + ' ccTime:' + ccTime);
    this.state = this.PLAYING;
};

Player.skipInVideo = function() {
    if (startup) {
        // Can't skip yet...
        skipTimer = -1;
        Log('skipInVideo during startup');
        return null;
    }
    window.clearTimeout(osdTimer);
    try{
        Log('skip to: ' + +skipTime);
        Player.plugin.skip(+skipTime);
        skipTimeInProgress = skipTime;
        loadingStart();
    } catch (err) {
        Log('skipInVideo failed:' + err);
    }
};

Player.skipForward = function(time) {
    document.getElementById('srtId').innerHTML=''; //hide while jumping
    var duration = this.GetDuration();
    if(this.skipState == -1) {
        if (((+ccTime + time) > +duration) && (+ccTime <= +duration)) {
            return this.showInfo(true);
        }
        skipTime = ccTime;
    }
    else if (((+skipTime + time) > +duration) && (+ccTime <= +duration)) {
        return -1;
    }
    window.clearTimeout(skipTimer);
    this.showControls();
    skipTime = +skipTime + time;
    this.skipState = this.FORWARD;
    // Log('forward skipTime: ' + skipTime);
    this.updateSeekBar(skipTime);
    skipTimer = window.setTimeout(this.skipInVideo, 2000);
};

Player.skipForwardVideo = function() {
    this.skipForward(10*1000);
};

Player.skipLongForwardVideo = function(longMinutes) {
    this.skipForward(longMinutes*60*1000);
};

Player.skipBackward = function(time) {
    document.getElementById('srtId').innerHTML=''; //hide subs while jumping
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

Player.skipBackwardVideo = function() {
    this.skipBackward(10*1000);
};

Player.skipLongBackwardVideo = function(longMinutes) {
    this.skipBackward(longMinutes*60*1000);
};

// Global functions called directly by the player 

Player.SetBufferingText = function(percent) {
    var buff = (Language.getisSwedish()) ? 'Buffrar' : 'Buffering';
    buff = (percent) ?  buff + ': ' + percent + '%' : buff;
    $('.bottomoverlaybig').html(buff);
};

Player.OnBufferingStart = function() {
    Log('OnBufferingStart');
    loadingStart();
    this.showControls();
    if ($('.bottomoverlaybig').html().match(/Press ENTER/)) {
        // No Resume
        resumeTime = 0;
    }
    Player.SetBufferingText();
};

Player.OnBufferingProgress = function(percent) {
    Log('OnBufferingProgress: ' + percent + '%');
    // Ignore if received without onBufferingStart. Seems sometimes 
    // it's received after onBufferingComplete.
    if (!Player.infoActive)
        return;
    this.showControls();
    Player.SetBufferingText(percent);
};

Player.OnBufferingComplete = function() {
    Log('OnBufferingComplete');
    $('.bottomoverlaybig').html('');
    retries = 0;
    if (startup && (!useSef || tizen))
        Player.OnRenderingStart();
    else if (startup && startup != true && bufferCompleteCount == 0) {
        // Resuming - wait for next buffering complete
        bufferCompleteCount = bufferCompleteCount + 1;
        return;
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

Player.OnRenderingStart = function() {
    Log('OnRenderingStart');
    if (skipTime && skipTimer == -1)
        skipTimer = window.setTimeout(this.skipInVideo, 0);
    else if (resumeJump) {
        // Dead code
        Log('resumeJump:' + resumeJump);
        Player.plugin.skip(resumeJump*1000);
    }
    resumeJump = null;

    History.addShow(Details.fetchedDetails);
};

Player.OnRenderingComplete = function() {
    Log('OnRenderingComplete');
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
    var resumeList = Config.read('resumeList');
    if (!resumeList)
        return [];
    return resumeList;
};

Player.removeResumeInfo = function(key) {
    var resumeList = Player.getResumeList();
    var oldLength = resumeList.length;
    for (var i = 0; i < resumeList.length; i++) {
        if ((key.id && resumeList[i].id==key.id) || resumeList[i].url==key.url) {
            resumeList.splice(i, 1);
            return resumeList;
        }
    }
    return resumeList;
};

Player.storeResumeInfo = function() {
    if (videoData.key && resumeTime > 20 && !Player.isLive) {
        Log('Player.storeResumeInfo, resumeTime:' + resumeTime + ' duration:' + Player.GetDuration() + ' videoData.key:' + JSON.stringify(videoData.key) + ' !Player.isLive:' + !Player.isLive);
        var percentage = Math.floor(100*resumeTime/(Player.GetDuration()/1000));
        // Update history with resumeTime
        History.addShow(Details.fetchedDetails, percentage);
        var resumeList = Player.removeResumeInfo(videoData.key);
        if (percentage < 97) {
            resumeList.unshift({id:videoData.key.id, url:videoData.key.url, time:resumeTime});
            resumeList = resumeList.slice(0,30);
        }
        Config.save('resumeList', resumeList);
        resumeTime = 0;
    }
};

Player.getStoredResumeTime = function() {
    if (!Player.isLive && videoData.key) {
        var resumeList = Player.getResumeList();
        for (var i = 0; i < resumeList.length; i++) {
            if ((videoData.key.id && resumeList[i].id==videoData.key.id) ||
                resumeList[i].url == videoData.key.url) {
                return resumeList[i].time;
            }
        }
    }
    return null;
};

Player.showControls = function(){

    window.clearTimeout(osdTimer);
    if (Player.infoActive)
        return;

    Player.infoActive = true;
    // Restore Top OSD in case of 'Auto 2011'
    this.setTopOSDText();
    $('.topoverlayresolution').show();
    $('.video-wrapper').show();				
    $('.video-footer').show();
    this.setClock();
  // Log('show controls');
};

Player.setClock = function() {
    window.clearTimeout(clockTimer);
    clockTimer = setClock($('.topoverlayclock'), Player.setClock);
};

Player.playbackStarted = function() {
    Player.OnRenderingStart();
    Log('Player.playbackStarted');
    $('#video-container').show();
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
    $('.bottomoverlaybig').html('');
    Player.infoActive = false;
    // Log('hide controls');
};

Player.showDetailedInfo = function(){
    if (Player.detailsActive)
        return;
    // Log('showDetailedInfo');
    Player.detailsActive = true;
    Player.setDetailsData(Details.fetchedDetails);
    $('.details-wrapper').show();
    Player.showControls();
    $('.topoverlaybig').hide();
};

Player.setDetailsData = function(details) {
    $('.detailstitle').html(details.title);
    var extra = '';
    if (details.air_date)
        extra = 'Sändes ' + dateToHuman(details.air_date).toLowerCase() + SEPARATOR;
    if (details.avail_date)
        extra = extra + 'Tillgänglig till ' + dateToHuman(details.avail_date).toLowerCase();
    if (extra != '')
        extra = '<br><br>' + extra;
    $('.detailsdescription').html(details.description + extra);
};

Player.keyReturn = function() {
    if (ccTime!=0 && (Player.detailsActive || Player.infoActive))
        Player.hideDetailedInfo();
    else
	Player.stopVideo();
};

Player.keyEnter = function() {
    if ($('.bottomoverlaybig').html().match(/Press ENTER/)) {
        $('.bottomoverlaybig').html('Resuming');
        startup = resumeTime-10;
        Player.playIfReady();
    } else if(!$('.bottomoverlaybig').html().match(/Resuming/)) {
        Player.togglePause();
    }
};

Player.hideDetailedInfo = function(){
    // Log('hideDetailedInfo');
    if (Player.detailsActive) {
        Player.detailsActive = false;
        Player.helpActive = false;
        $('.detailstitle').html('');
        $('.detailsdescription').html(''); 
        $('.details-wrapper').hide();
        $('.topoverlaybig').show();
    }
    Player.hideControls();
};

Player.GetResolution = function() {
    return Player.plugin.getResolution();
};
Player.SetCurTime = function(time) {
        if (this.state == this.STOPPED)
            return;
	if(startup) {
            if (startup != true && (time/1000 < (startup-5))) {
                Log('SetCurTime waiting for resume, time:' + time + ' startup:' + startup);
                // resuming - wait
                return;
            }
            Player.playbackStarted();
	    startup = false;
            if (videoData.use_offset) {
                Player.refreshDetailsTimer();
                if (+Player.startTime != 0) {
                    Player.updateOffset(Player.startTime);
                }
            }
            Player.setResolution(Player.GetResolution());
	} else
            resumeTime = +time/1000;
	ccTime = +time + Player.offset;
	if(this.skipState == -1){
	    this.updateSeekBar(ccTime);
	}

	if (this.state != this.PAUSED) { // because on 2010 device the device triggers this function even if video is paused
	    Subtitles.setCur(ccTime);
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

Player.updateSeekBar = function(time) {
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
    // Player.setFrontPanelTime(hours, mins, secs);
    var progress = Math.floor(time/Player.GetDuration()*100);
    if (progress > 100)
        progress = 100;
    $('.progressfull').css('width', progress + '%');
    // Display.setTime(time);
    this.setTotalTime();
    
}; 

Player.BwToString = function(bw) {
    if (!bw)
        return null;
    if (Number(bw) >= 1000000) {
        return (Number(bw)/1000000).toFixed(1) + ' mbps';
    } else
        return Math.round(Number(bw)/1000) + ' kbps';
};

Player.OnStreamInfoReady = function(forced) {
    try{
    Log('OnStreamInfoReady, forced:' + forced);
    var oldTopOsd = $('.topoverlayresolution').html();
    var resolution = Player.GetResolution();
    videoBw = Player.plugin.getBandwith();
    if (this.bw && videoBw && this.bw != (' ' + Player.BwToString(videoBw)))
        Log('videoBw difference:' + Player.BwToString(videoBw) + this.bw);
    this.setResolution(resolution);
    Player.pluginDuration = Player.plugin.getDuration();
    this.setTotalTime();
    Player.updateTopOSD(oldTopOsd);
    // if (videoData.audio_idx)
    //     Log('SetStreamID Audio: ' + videoData.audio_idx + ' res: ' + webapis.avplay.setSelectTrack('AUDIO',videoData.audio_idx));
    // if (Subtitles.exists()) {
    //     // Log('StartSubtitle res: ' + Player.plugin.Execute('StartSubtitle', videoData.url.replace(/\|.+$/, '')));
    //     var totalTrackInfo = webapis.avplay.getTotalTrackInfo();
    //     Log('totalTrackInfo:' + JSON.stringify(totalTrackInfo));
    //     var numberOfSubtitles = 0;
    //     for (var i=0; i < totalTrackInfo.length; i++) {
    //         if (totalTrackInfo.type == 'TEXT')
    //             numberOfSubtitles = numberOfSubtitles++;
    //     }
    //     Log('Number of Subtitles:' + numberOfSubtitles);
    //     if (videoData.subtitles_idx != null && subtitles.length == 0)
    //         Log('SetStreamID Subtitles: ' + videoData.subtitles_idx + ' res: ' + webapis.avplay.setSelectTrack('TEXT',videoData.subtitles_idx));
    // }
    } catch(err) {
        Log('OnStreamInfoReady error:' + err);
    }
};

Player.setTotalTime = function() {
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

Player.showInfo = function(force) {
    if (!Player.infoActive || force) {
	this.showControls();
        Player.refreshOsdTimer(5000);
    }
    else {
        this.hideControls();
    }

};

Player.showDetails = function() {
    if (!Details.fetchedDetails || Details.fetchedDetails.name == '') {
        // See if update may help...
        Details.fetchData(detailsUrl);
        Player.showInfo();
    } else if (Player.helpActive || !Player.detailsActive) {
        // reset if help is active.
        Player.helpActive = false;
        Player.detailsActive = false;
	this.showDetailedInfo();
        window.clearTimeout(osdTimer);
    } else {
        // Update in case of channel where details may change
        if (videoData.use_offset)
            Details.fetchData(detailsUrl, true);
        this.hideDetailedInfo();
    }
};

Player.showHelp = function () {
    if (Player.helpActive) {
        this.hideDetailedInfo();
    } else {
        this.showDetailedInfo();
        $('.detailstitle').html('HELP');
        $('.detailsdescription').html(Player.GetHelpText());
        window.clearTimeout(osdTimer);
        Player.helpActive = true;
    }
};

Player.OnConnectionFailed = function() {
    Log('OnConnectionFailed');
    Player.OnNetworkDisconnected('Connection Failed!');
    // Player.checkHls(function(){Player.OnNetworkDisconnected('Connection Failed!');}, 'OnConnectionFailed');
};

Player.OnNetworkDisconnected = function(text) {
    if (!text) {
        Log('OnNetworkDisconnected'); 
        text = 'Network Error!';
    }
    // Avoid reload loop in case constant failure in the end....
    if (!startup && (Player.GetDuration()-ccTime) < 500)
        Player.OnRenderingComplete();
    else
        Player.retryVideo(text);
};

Player.retryVideo = function (text, max) {
    if (!max)
        max = 1;

    if (retries < max ) {
        // Check if we should reload or not.
        loadingStart();
        $.ajax({type: 'GET',
	        // url: 'http://188.40.102.5/recommended.ashx',
                url: 'http://www.svtplay.se',
	        timeout: 5000,
	        success: function(data, status, xhr) {
                    var time = (resumeTime) ? (resumeTime-10)*1000 : null;
		    Log('Success:' + this.url + ' resumeTime:' + time);
                    $('.bottomoverlaybig').html('Re-connecting'); 
                    Player.showControls();
                    Channel.refreshPlayUrl(function(){Player.reloadVideo(time);});
	        },
	        error: function(XMLHttpRequest, textStatus, errorThrown) {
		    Log('Failure:' + this.url);
                    Player.PlaybackFailed(text);
	        }
	       });
    } else {
        Player.PlaybackFailed(text);
    }

};

Player.OnStreamNotFound = function() {
    Player.PlaybackFailed('OnStreamNotFound');
};

Player.OnRenderError = function(number) {
    // Avoid reload loop in case constant failure in the end....
    if (!startup && (Player.GetDuration()-ccTime) < 500)
        Player.OnRenderingComplete();
    else {
        Log('Player.OnRenderError:' + number);
        var text = 'Can\'t play this. Error: ' + number;
        Player.PlaybackFailed(text);
        // Player.checkHls(function(){Player.PlaybackFailed(text);}, text);
    }
};

Player.checkHls = function(OtherCalback, text) {
    // Seems stop before OnBufferingStart gives e.g. OnRenderError
    // Can also happen in case 'resume' is chosen too late...
    if (Player.state != Player.STOPPED && delayedPlayTimer != -1) {
        if (videoData.component=='HLS' && !videoUrl.match(/\/downgradehls\//)) {
            var thisVideoUrl = videoUrl;
            Player.getHlsVersion(videoUrl.replace(/\|.+/,''),
                                 function(hls_version) {
                                     if (hls_version && hls_version > 3) {
                                         var text = 'HLS Version ' + hls_version + ' unsupported.';
                                         Player.PlaybackFailed(text);
                                     } else {
                                         OtherCalback();
                                     }
                                 }
                                );
        } else {
            OtherCalback();
        }
    }
};

Player.OnAuthenticationFailed = function() {
    Player.PlaybackFailed('OnAuthenticationFailed');
};

Player.PlaybackFailed = function(text) {
    Log('Player.PlaybackFailed:' + text);
    $('.bottomoverlaybig').html(text);
    if (!Channel.tryAltPlayUrl(videoUrl,
                               function(){
                                   Log('Trying alternative');
                                   $('.bottomoverlaybig').html('Trying alternative stream');
                                   if (startup && startup != true) {
                                       var altResumeTime = Player.getStoredResumeTime();
                                       if (altResumeTime && altResumeTime != resumeTime) {
                                           resumeTime = altResumeTime;
                                           startup = resumeTime-10;
                                       }
                                       Player.reloadVideo(startup*1000);
                                   } else
                                       Player.reloadVideo();
                               }
                              )) {
        loadingStop();
        Player.showControls();
        Player.enableScreenSaver();
    }
};

Player.GetDuration = function() {
    if (!this.sourceDuration && 
        Details.fetchedDetails && 
        Details.fetchedDetails.duration
       )
        Player.setDuration(Details.fetchedDetails.duration);

    var duration = this.sourceDuration;
    if (Player.plugin && !Player.pluginDuration ) {
        Player.pluginDuration = Player.plugin.getDuration();
        duration = Player.pluginDuration - Player.durationOffset;
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
    // During 'AUTO Bandwith' resolution can change which isn't reported to 2011 devices.
    return (deviceYear == 2011 && Player.bw == '');
};

Player.setTopOSDText = function(init_text) {
    var resolution_text = init_text;
    if (Player.IsAutoBwUsedFor2011()) {
        resolution_text = '';
    } else if (resolution_text == undefined) {
        resolution_text = $('.topoverlayresolution').html().replace(/^([^)]+\)(.*bps)?)*.*/, '$1');
    }
    resolution_text = resolution_text + this.getAspectModeText() + this.getRepeatText();
    $('.topoverlayresolution').html(resolution_text.replace(/^(&nbsp;)+/,''));
};

Player.updateTopOSD = function(oldTopOsd) {
    Player.setTopOSDText();
    if (!oldTopOsd || (oldTopOsd != $('.topoverlayresolution').html())) {
        if ($('.topoverlayresolution').is(':hidden')) {
            $('.topoverlayresolution').show();
            Player.refreshOsdTimer(3000);
        }
    }
};

Player.toggleAspectRatio = function() {

    Player.plugin.toggleAspectRatio();
    this.setAspectRatio(Player.GetResolution());
    // Update OSD
    this.updateTopOSD();
    if (this.IsAutoBwUsedFor2011())
        $('.topoverlayresolution').html('ASPECT unsupported when AUTO BW');
};

Player.setResolution = function (resolution) {

    if (resolution.width  > 0 && resolution.height > 0) {
        var aspect = resolution.width / resolution.height;
        if (aspect == 16/9) {
            aspect = '16:9';
        } else if (aspect == 4/3) {
            aspect = '4:3';
        }
        else {
            aspect = aspect.toFixed(2) + ':1';
        }
        // Only use given bw in case of 'Auto-mode'
        var bw = (this.bw || !videoBw) ? this.bw : ' ' + Player.BwToString(videoBw);
        Player.setTopOSDText(resolution.width + 'x' + resolution.height + ' (' + aspect + ')' + bw);
        this.setAspectRatio(resolution);
    } else {
        this.setFullscreen();
        Log('Missing resolution: ' + resolution.width + 'x' + resolution.height);
    }
};

Player.setAspectRatio = function(resolution) {

    Player.plugin.setAspectRatio(resolution);
    return;

    var aspect = resolution.width/resolution.height;
    // During 'AUTO Bandwith' resolution can change which doesn't seem to be
    // reported to 2011 devices. So then Crop Area would be all wrong.
    if (resolution.width > 0 && resolution.height > 0 && !Player.IsAutoBwUsedFor2011()) {
        if (Player.aspectMode === Player.ASPECT_H_FIT && aspect > 4/3) {
            var cropOffset = Math.floor((GetMaxVideoWidth() - (4/3*GetMaxVideoHeight()))/2);
            var cropX      = Math.round(resolution.width/GetMaxVideoWidth()*cropOffset);
            var cropWidth  = resolution.width-(2*cropX);
            Player.plugin.Execute('SetCropArea', cropX, 0, cropWidth, resolution.height);
        } else if (Player.aspectMode === Player.ASPECT_H_FIT) {
            Player.setFullscreen();
        } else {
            resolution.aspect = aspect;
            if (Player.aspectMode === Player.ASPECT_ZOOM) {
                Player.zoom(resolution);
            } else {
                // Player.plugin.Execute('SetCropArea', 0, 0, resolution.width, resolution.height);
                Player.scaleDisplay(resolution);
            }
        }
        // Re-pause
        if (this.state === this.PAUSED) {
            webapis.avplay.pause();
        }
    }
};

Player.scaleDisplay = function (resolution) {
    var factor = (resolution.aspect >= 16/9) ?
        // Wider than high - 'extend/limit' based on width
        GetMaxVideoWidth()/resolution.width :
        // Higher than wide - 'extend/limit' based on height
        GetMaxVideoHeight()/resolution.height;

    var width  = Math.min(GetMaxVideoWidth(),  resolution.width*factor);
    var height = Math.min(GetMaxVideoHeight(), resolution.height*factor);

    var x = Math.floor((GetMaxVideoWidth()-width)/2);
    var y = Math.floor((GetMaxVideoHeight()-height)/2);
    // Log('scaleDisplay:'+x+','+y+','+width+','+height + ' resolution:' + JSON.stringify(resolution));
    webapis.avplay.setDisplayRect(x, y, Math.floor(width), Math.floor(height));
};

Player.zoom = function(resolution) {

    var zoomFactor = Player.getZoomFactor();
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
    // Log('SetCropArea:'+cropX+','+cropY+','+cropWidth+','+cropHeight+' resolution:'+JSON.stringify(resolution) + ' zoom:' + (Player.getZoomFactor()*100).toFixed(1) + '%');
    Player.plugin.Execute('SetCropArea', Math.round(cropX), Math.round(cropY), Math.round(cropWidth), Math.round(cropHeight));
};

Player.getAspectModeText = function() {
    var text = Player.plugin.getAspectModeText();
    if (text == '')
        return text;
    else
        return SEPARATOR + text;
};

Player.getRepeatText = function() {
    if (this.repeat === Player.REPEAT_OFF) {
        return '';
    } else if (this.repeat === Player.REPEAT_ONE) {
        return SEPARATOR + 'Repeat ONE';
    } else if (this.repeat === Player.REPEAT_ALL) {
        return SEPARATOR + 'Repeat ALL';
    } else if (this.repeat === Player.REPEAT_BACK) {
        return SEPARATOR + 'Repeat BACKWARDS';
    }
};

Player.getZoomFactor = function () {
    var savedValue = Config.read('zoomFactor');
    if (savedValue != null) {
        return Number(savedValue);
    } else {
        return 0.125;
    }
};

Player.saveZoomFactor = function (value) {
    Config.save('zoomFactor', value);
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
};

Player.decreaseZoom = function() {

    Player.zoomFactor = Player.zoomFactor - 0.01;
    if (Player.zoomFactor < 0)
        Player.zoomFactor = 0;
    Player.zoom(Player.zoomFactor);
    Player.updateTopOSD();
};

Player.createPlugin = function(PluginToUse) {

    if (Player.plugin && Player.pluginPlayer!=PluginToUse)
        Player.plugin.remove();

    Player.pluginPlayer = PluginToUse;
    if (Player.pluginPlayer == Player.PLUGIN_AVPLAYER)
        Player.plugin = AvPlayer;
    else
        Player.plugin = VideoJsPlayer;
    Player.plugin.create();
};

Player.togglePlugin = function() {
    Player.pluginToggled = true;
    Player.remove();
    this.pluginPlayer = (this.pluginPlayer+1) % (Player.PLUGIN_VIDEOJS+1);
    Log('Plugin toggled, plugin:' + Player.pluginPlayer);
};

Player.checkCorrectPlugin = function(UseVjs) {
    if (Player.pluginToggled)
        return;

    var PluginToUse = (UseVjs) ? Player.PLUGIN_VIDEOJS : Player.PLUGIN_AVPLAYER;
    if (Player.pluginPlayer != PluginToUse) {
        Player.createPlugin(PluginToUse)
    }
};

Player.startPlayer = function(url, isLive, startTime) {
    var oldKeyHandleID = Buttons.getKeyHandleID();
    var background     = itemSelected.find('.ilink').attr('data-background');

    Buttons.setKeyHandleID(2);

    startup = true;
    retries = 0;
    window.clearTimeout(detailsTimer);
    Player.startTime = startTime;
    Player.isLive = isLive;
    Player.offset = 0;
    Player.durationOffset = 0;
    Player.pluginDuration = 0;

    videoUrl = '';
    ccTime = 0;
    lastPos = 0;
    videoBw = null;
    videoData = {};
    resumeJump = null;
    bufferCompleteCount = 0;
    Player.skipState = -1;
    Player.srtState = -1;
    skipTime = 0;
    skipTimeInProgress = false;
    skipTimer = null;
    this.hideDetailedInfo();
    if (Player.plugin)
        Player.plugin.stop();
    Player.createPlugin(Player.pluginPlayer);
    Player.setTopOSDText('');
    $('.currentTime').text('');
    $('.totalTime').text('');
    $('.progressfull').css('width', 0);
    Player.setVideoBackground(background);
    if (!$('.bottomoverlaybig').html().match(/Trying alternative/))
        $('.bottomoverlaybig').html('');
    Player.stopCallback = function(keep_playing) {
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
};

Player.setVideoBackground = function(img) {

    Player.hideVideoBackground();
    var complete = function() {
        Player.showControls();
        if (!$('.bottomoverlaybig').html().match(/error/i))
            // Avoid in case of internal errors.
            loadingStart();
        $('#outer').hide();
    };
    if (img) {
        alert('Background:' + img);
        $('.video-background').html('<img class="image" src="' + img  + '"/>');
        backgroundLoading = true;
        window.setTimeout(function () {
            if (backgroundLoading)
                complete();
        }, 300);
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
        complete();
};

Player.hideVideoBackground = function() {
    backgroundLoading = false;
    $('.video-background').hide();
    $('.video-background').html('');
};

Player.refreshStartData = function(details) {
    if (videoData.use_offset && details && details.start_time != 0 && details.start_time != Player.startTime) {
        Log('refreshStartData, new start:' + details.start_time + ' old start:' + Player.startTime);
        Player.setNowPlaying(details.title);
        Player.pluginDuration = Player.plugin.getDuration();
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
        Log('New startTime:' + startTime + ' old:' + Player.startTime + ' diff:' + diff_mins + ' offset:' + Player.offset + ' durationOffset:' + Player.durationOffset);

        Player.offset = Player.offset - (diff_mins*60*1000);
        Player.durationOffset = Player.durationOffset + (diff_mins*60*1000);
        Log('New offset:' + Player.offset + ' new durationOffset:' + Player.durationOffset);
    } else {
        var now = getCurrentDate();
        var now_secs = (now.getHours()*3600) + (now.getMinutes()*60) + now.getSeconds();

        if ((start_mins*60) > now_secs)
            // Time passed midnight
            now_secs = now_secs + (24*3600);
        Player.offset = (now_secs - (start_mins*60))*1000;
    }
    Player.startTime = startTime;
};

Player.startTimeToMinutes = function (startTime) {
    if (!startTime)
        return 0;
    var start_mins = startTime.match(/([0-9]+)[:.]/)[1]*60;
    return (start_mins + startTime.match(/[:.]([0-9]+)/)[1]*1);
};

Player.checkPlayUrlStillValid = function(gurl) {
    if (requestedUrl != gurl) {
        Log('gurl skipped:' + gurl + ' requestedUrl:' + requestedUrl);
        return false;
    }
    return true;
};

Player.refreshOsdTimer = function(value) {
    window.clearTimeout(osdTimer);
    if (!Player.detailsActive)
        osdTimer = window.setTimeout(this.hideControls, value);
};

Player.refreshDetailsTimer = function() {
    window.clearTimeout(detailsTimer);
    detailsTimer = window.setTimeout(function () {
        Details.fetchData(detailsUrl, true);
        Player.refreshDetailsTimer();
    }, 1*60*1000);
};

Player.enableScreenSaver = function() {
    $('.screensaver').hide();
    window.clearTimeout(screenSaverTimer);
    screenSaverTimer =
        window.setTimeout(
            function() {
                $('.screensaver').show();
                webapis.appcommon.setScreenSaver(webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_ON);
            },
            5*60*1000
        );
};

Player.restartScreenSaver = function() {
    var wasActive = $('.screensaver').is(':visible');
    // Only restart if enabled
    if (screenSaverTimer)
        Player.enableScreenSaver();
    return wasActive;
};

Player.disableScreenSaver = function() {
    $('.screensaver').hide();
    window.clearTimeout(screenSaverTimer);
    screenSaverTimer = null;
    webapis.appcommon.setScreenSaver(webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_OFF);
};

Player.internalError = function(err) {
    if (startup && !videoUrl)
        // Error during stream fetching?
        Player.PlaybackFailed('Internal Error:' + err);
};

function GetMaxVideoWidth() {
    return MAX_WIDTH;
}

function GetMaxVideoHeight() {
    return MAX_HEIGHT;
}

Player.GetHelpText = function() {
    var help = '<table style="margin-bottom:80px;width:100%;border-collapse:collapse;margin-left:auto;margin-right:auto;">';
    help = InsertHelpRow(help, 'INFO', 'Details');
    help = InsertHelpRow(help, 'RED', 'Repeat');
    help = InsertHelpRow(help, 'YELLOW', 'Subtitles');
    help = InsertHelpRow(help, 'BLUE', 'Aspect');
    help = InsertHelpRow(help, 'UP/DOWN', 'Subtitles Position');
    help = InsertHelpRow(help, '2/8', 'Subtitles Size');
    help = InsertHelpRow(help, '4/6', 'Subtitles Distance (if background is used)');
    return help + '</table>';
};

function InsertHelpRow(Html, Key, Text) {
    var style =' style="padding:8px;border: 3px solid white;"';
    return Html+'<tr><td'+style+'>'+Key+'</td><td'+style+'>'+Text+'</td></tr>';
}

Player.startPlayback = function(time) {
    Player.plugin.play(Player.isLive, time);
};
