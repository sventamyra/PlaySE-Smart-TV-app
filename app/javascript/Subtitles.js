var hlsSubsState = null;
var subtitles = [];
var subtitlesEnabled = false;
var lastSetSubtitleTime = 0;
var currentSubtitle = 0;
var clrSubtitleTimer = 0;
var subtitleStatusPrinted = false;

var Subtitles = {
};

Subtitles.init = function() {
    Subtitles.setProperties();
    hlsSubsState = null;
    subtitles = [];
    currentSubtitle = 0;
    var savedValue = Config.read('subEnabled');
    if (savedValue) {
        subtitlesEnabled = (savedValue == '1');
    } else {
        subtitlesEnabled = false;
    }

};

Subtitles.stop = function() {
    hlsSubsState = null;
};

Subtitles.exists = function() {
    return (subtitles.length > 0 || videoData.subtitles_idx >=0);
};
Subtitles.toggle = function () {

    if (subtitleStatusPrinted) {
        if (subtitlesEnabled && Subtitles.exists()) {
            if (this.getBackground()) {
                // Toggle background
                this.setBackground(false);
            } else {
                this.setBackground(true);
                subtitlesEnabled = false;
            }
        } else {
            subtitlesEnabled = true;
        }
        Config.save('subEnabled',subtitlesEnabled*1);
    } else {
        // Only show status the first time
        subtitleStatusPrinted = true;
    }

    if (!subtitlesEnabled || $('#srtId').html() == '' || $('#srtId').html().match(/Subtitle/i)) {
        Subtitles.printStatus();
    }
};

Subtitles.printStatus = function () {
    if (subtitlesEnabled && Subtitles.exists()) {
        this.set('Subtitles On', 2500);
    } else if (!subtitlesEnabled && Subtitles.exists()) {
        this.set('Subtitles Off', 2500);
    } else {
        this.set('Subtitles not available', 2500);
    }
};

Subtitles.fetch = function (srtUrls, hlsSubs, usedRequestedUrl, extra) {
    var anyFailed = false;
    var offset = -1;
    var delta  = 0;
    if (srtUrls && srtUrls.list) {
        srtUrls = srtUrls.list;
    } else if (srtUrls) {
        srtUrls = [srtUrls];
    }
    if (!extra) extra = {};
    if (extra.offset || extra.offset==0)
        offset = extra.offset;
    httpLoop(srtUrls,
             function(url, data, status, totalData) {
                 if (!Player.checkPlayUrlStillValid(usedRequestedUrl))
                     return -1;

                 if (status != 200)
                     anyFailed = true;
                 else if (data) {
                     if (url.match(/\.(web)?vtt/) || data.match(/(WEB)?VTT/)) {
                         data   = Subtitles.parseVtt(data, offset, delta);
                         offset = data.offset;
                         delta  = data.delta;
                         data   = data.data;
                     }
                     data = data + '\n\n';

                     if (hlsSubsState) {
                         if (!Subtitles.updateHlsState(data, offset, usedRequestedUrl, extra)) {
                             if (extra.cb) extra.cb();
                             return -1;
                         }
                     }
                     // alert(data)
                     return data;
                 }
                 return '';
             },
             function(srtData) {
                 if (Player.checkPlayUrlStillValid(usedRequestedUrl)) {
                     if (anyFailed && hlsSubs) {
                         Subtitles.fetchHls(hlsSubs, usedRequestedUrl, extra);
                     } else {
                         if (!hlsSubsState && srtData != '')
                             Subtitles.parse(srtData);
                         if (hlsSubsState) {
                             extra.done = true;
                             Subtitles.updateHlsState(null, offset, usedRequestedUrl, extra);
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

Subtitles.parseVtt = function(data, offset, delta) {
    var newOffset = data.match(/TIMESTAMP-MAP=MPEGTS:([0-9]+)/);
    if (newOffset) {
        newOffset = +newOffset[1];
        if (offset != -1)
            delta = delta + Math.round((newOffset - offset)/90000);
        offset = newOffset;
    } else if (offset == -1)
        offset = 0;

    data = data.slice(data.search(/^[0-9]/m));
    data = data.replace(/^([0-9]+:[0-9]+\.[0-9]+ -->)/mg,'00:$1').replace(/--> ([0-9]+:[0-9]+\.[0-9]+)/mg,'--> 00:$1');
    if (!data.match(/^[0-9]+[	 ]*(\r)?\n[0-9]+:/m))
        data = data.replace(/(^[0-9:.]+ --> [0-9:.]+)/mg, '0\n$1');
    if (delta > 0)
        data = Subtitles.addVttOffset(data, delta);
    return {data:data, offset:offset, delta:delta};
};

Subtitles.addVttOffset = function (data, delta) {
    var timeStamps = data.match(/([0-9]+:[0-9]+:[0-9]+\.[0-9]+)/mg);
    // Must add offset in reverse to avoid replacing an already updated ts.
    if (timeStamps) timeStamps = timeStamps.reverse();
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
                ts[k] = '0' + ts[k];
        ts = ts[0] + ':' + ts[1] + ':' + ts[2] + '.' + ts[3];
        data = data.replace(timeStamps[i],ts);
    }
    return data;
};

Subtitles.updateHlsState = function(data, offset, usedRequestedUrl, extra) {
    // Resume isn't considered at the moment...
    var time = (skipTimeInProgress) ? skipTimeInProgress : ccTime;

    if (extra.done) {
        // Log('HLS subtitles back to standby start:' + hlsSubsState.start + ' current:' + hlsSubsState.current + ' end:' + hlsSubsState.end + ' offset:' + hlsSubsState.offset + ' time:' + time + 'latets offset:' + offset);
        hlsSubsState.running = false;
        if (offset && hlsSubsState.end > ((offset/90)+hlsSubsState.duration+hlsSubsState.adjust)) {
            // Assymetric duration seems to be used - we need to adjust.
            hlsSubsState.adjust = hlsSubsState.end-((offset/90)+hlsSubsState.duration);
            Log('HLS seems to need an adjustement:' + hlsSubsState.adjust);
        }
        return true;
    }

    Subtitles.parse(data, hlsSubsState.offset != -1);
    if (hlsSubsState.offset == -1) {
        hlsSubsState.offset = offset;
    }
    hlsSubsState.current = hlsSubsState.current + hlsSubsState.duration;

    if (skipTime ||
        (startup && startup != true) ||
        time > hlsSubsState.end ||
        time < hlsSubsState.start
       ) {
        hlsSubsState.end     = hlsSubsState.current;
        hlsSubsState.running = false;
        Log('HLS subtitles aborted  start:' + hlsSubsState.start + ' current:' + hlsSubsState.current + ' end:' + hlsSubsState.end + ' offset:' + hlsSubsState.offset + ' time:' + time + ' skipTime:' + skipTime + ' startup:' + startup);
        return false;
    }
    return true;
};

Subtitles.checkHls = function(extra) {

    if ((!hlsSubsState ||
         skipTime ||
         (startup && startup != true) ||
         hlsSubsState.running ||
         // Keep one minute ahead
         (ccTime >= hlsSubsState.start && hlsSubsState.end > (ccTime+(60*1000)+hlsSubsState.adjust))
         // Must always fetch at least the first part to get the initial offset
        ) && (!hlsSubsState || hlsSubsState.offset !=-1))
        return false;

    // Fetch 10 seconds each time.
    var segments = Math.round(10*1000/hlsSubsState.duration) + 1;
    var urlIndex;
    if (!extra) extra = {};

    if (hlsSubsState.end == 0 || ccTime > hlsSubsState.end || ccTime < hlsSubsState.start) {
        urlIndex = Math.floor(ccTime/hlsSubsState.duration);
        // Log('checkHlsSubtitles - new period start. OldState:' + hlsSubsState.start + ' current:' + hlsSubsState.current + ' end:' + hlsSubsState.end + ' offset:' + hlsSubsState.offset + ' time:' + ccTime);
        hlsSubsState.start   = urlIndex*hlsSubsState.duration;
        hlsSubsState.current = hlsSubsState.start;
        hlsSubsState.end     = hlsSubsState.start;
        hlsSubsState.adjust  = 0;
    } else {
        urlIndex = Math.floor(hlsSubsState.end/hlsSubsState.duration);
        // Log('checkHlsSubtitles - prolong period start:' + hlsSubsState.start + ' current:' + hlsSubsState.current + ' end:' + hlsSubsState.end + ' adjust:' + hlsSubsState.adjust + ' offset:' + hlsSubsState.offset + ' time:' + ccTime);
    }
    if ((urlIndex+segments) > hlsSubsState.urls.length)
        segments = hlsSubsState.urls.length-urlIndex;
    if (segments < 1) {
        // We probably reached the end, i.e. no more subtitles.
        // Prolong end to avoid lots of loggings
        hlsSubsState.end += 60*1000;
        return false;
    }

    hlsSubsState.end = hlsSubsState.end + (segments*hlsSubsState.duration);
    hlsSubsState.running = true;
    extra.offset = hlsSubsState.offset;
    // Log('Fetching ' + segments + ' hls segments starting from ' + urlIndex + ' New state-> start:' + hlsSubsState.start + ' current:' + hlsSubsState.current + ' end:' + hlsSubsState.end + ' adjust:' + hlsSubsState.adjust + ' offset:' + hlsSubsState.offset + ' time:' + ccTime);
    Subtitles.fetch({list:hlsSubsState.urls.slice(urlIndex, urlIndex+segments)},
                    null,
                    hlsSubsState.req_url,
                    extra
                   );
    return true;
};

Subtitles.fetchHls = function (hlsSubs, usedRequestedUrl, extra) {
    var duration = 0;
    httpLoop(hlsSubs,
             function(url, data) {
                 duration = data.match(/EXT-X-TARGETDURATION: *([0-9]+)/);
                 if (duration) {
                     duration = (+duration[1])*1000;
                 }

                 var urls = data.match(/^([^#].+)$/mg);
                 if (urls) {
                     var prefix = getUrlPrefix(url);
                     for (var i=0; i < urls.length; i++) {
                         if (!urls[i].match(/http[s]?:/))
                             urls[i] = prefix + urls[i];
                     }
                     return urls.join(' ') + ' ';
                 }
                 else
                     return '';
             },
             function (urls) {
                 urls = urls.trim().split(' ');
                 if (urls.length > 0 && Player.checkPlayUrlStillValid(usedRequestedUrl)) {
                     // Doesn't necessarily work in case of multiple hlsSubs...
                     hlsSubsState = {urls      : urls,
                                     duration  : duration,
                                     req_url   : usedRequestedUrl,
                                     offset    : -1,
                                     adjust    : 0,
                                     start     : 0,
                                     current   : 0,
                                     end       : 0,
                                     running   : false
                                    };
                     Log('Starting main HLS subtitle fetching');
                     Subtitles.checkHls(extra);
                 }
             },
             {headers:Channel.getHeaders()}
            );
};

Subtitles.parse = function (data, append) {
    try {
        if (!append) subtitles = [];
        var srtContent = this.strip(data.replace(/\r\n|\r|\n/g, '\n').replace(/\n\n*/g,'\n').replace(/(^([0-9]+\n)?[0-9:.,]+ --> [0-9:.,]+)(.+)?\n/mg,'\n$1\n').replace(/<\/*[0-9]+>/g, '')).replace(/<c\.([^>]+)/mg,'<font color="$1"').replace(/<\/c(\.[^>]+)?>/mg,'</font>');
        srtContent = srtContent.split('\n\n');
        for (var i = 0; i < srtContent.length; i++) {
            this.parseSrtRecord(srtContent[i]);
        }
        subtitles.sort(function(a, b){return a.start-b.start;});
        this.merge();
        for (var j = 0; !append && j < 10 && j < subtitles.length; j++) {
            alert('start:' + subtitles[j].start + ' stop:' + subtitles[j].stop + ' text:' + subtitles[j].text);
            // Log('srtContent[' + j + ']:' + srtContent[j]);
        }
    } catch (err) {
        Log('parseSubtitle failed:' + err);
    }
};

Subtitles.merge = function() {
    if (subtitles.length) {
        var tmpSubtitles = subtitles;
        subtitles = [];
        for (var i = 0; i < tmpSubtitles.length; i++) {
            if (tmpSubtitles[i+1] && tmpSubtitles[i+1].text.startsWith(tmpSubtitles[i].text))
                tmpSubtitles[i+1].start = tmpSubtitles[i].start;
            else
                subtitles.push(tmpSubtitles[i]);
        }
    }
};

Subtitles.strip = function (s) {
    return s.replace(/^\s+|\s+$/g, '');
};

Subtitles.srtTimeToMS = function (srtTime) {
    var ts = srtTime.replace(',', '.').match('([0-9]+):([0-9]+):([0-9.]+)');
    return Math.round((ts[1]*3600 + ts[2]*60 + ts[3]*1)*1000);
};

Subtitles.parseSrtRecord = function (srtRecord) {
    try {
        srtRecord = srtRecord.split('\n');
        if (srtRecord.length > 1) {
            var start = srtRecord[1].match(/([^ 	]+)[ 	]+-->[ 	]+/)[1];
            var stop  = srtRecord[1].match(/[ 	]+-->[ 	]+([^ 	]+)/)[1];
            subtitles.push( {
                    start: this.srtTimeToMS(start),
                    stop:  this.srtTimeToMS(stop),
                    text:  srtRecord.slice(2).join('<br />').replace(/<br \/>$/, '')
                }
            );
        }
    } catch (err) {
        Log('parseSrtRecord failed: ' + err);
    }
};

Subtitles.setCur = function (time) {
    try {
        Subtitles.checkHls();
        if (subtitlesEnabled && Player.state != Player.STOPPED) {
            var now = Number(time);
            if (now === lastSetSubtitleTime) {
                // Seems we get multiple callback for same time...
                now += 500;
            } else if (now < lastSetSubtitleTime) {
                // jumped back
                currentSubtitle = 0;
            }
            lastSetSubtitleTime = now;

            for (var i = currentSubtitle; i < subtitles.length; i++) {
                var thisStart = subtitles[i].start;
                var thisStop  = subtitles[i].stop;
                // Log('i:' + i + ' start:' + thisStart + ' stop:' + thisStop + ' now:' + now);
                if ((thisStart <= now) && (now < thisStop)) {
                    // This Sub should be shown (if not already shown...)
                    if (currentSubtitle != i || currentSubtitle === 0) {
                        this.set(subtitles[i].text, thisStop-now);
                        currentSubtitle = i;
                    }
                    break;
                } else if (now > subtitles[currentSubtitle].stop) {
                    // Current sub is done.
                    // Log('Clearing srt due to end');
                    this.clearUnlessConfiguring();
                }
                if (subtitles[i+1] && subtitles[i+1].start > now) {
                    // Next isn't ready yet - we're done.
                    break;
                }
            }
        } else {
            this.clearUnlessConfiguring();
        }
    } catch (err) {
        Log('setCurSubtitle failed: ' + err);
    }
};

Subtitles.clearUnlessConfiguring = function () {
    if (!$('#srtId').html().match(/Subtitle/i)) {
        document.getElementById('srtId').innerHTML='';
    }
};

Subtitles.set = function (text, timeout) {
    if (!subtitlesEnabled) return;
    try {
        if (!text.match(/<br ?\/>/g)) {
            // If only one liner we want it at bottom
            text  = '<br />' + text;
        }
        if (timeout > 0 || timeout===0)
            this.refreshClearTimer(timeout+100);
        $('#srtId').html(text);
        // Log('Showing sub:' + text);
    } catch (err) {
        Log('set failed:' + err);
    }
};

Subtitles.refreshClearTimer = function(timeout) {
    window.clearTimeout(clrSubtitleTimer);
    clrSubtitleTimer = window.setTimeout(function () {
        // Log('Clearing srt due to timer');
        $('#srtId').html('');
    }, timeout);
};

Subtitles.pause = function() {
    window.clearTimeout(clrSubtitleTimer);
};

Subtitles.getSize = function () {
    var savedValue = Config.read('subSize');
    if (savedValue) {
        return Number(savedValue);
    } else {
        return 60;
    }
};

Subtitles.getPos = function () {
    var savedValue = Config.read('subPos');
    if (savedValue) {
        return Number(savedValue);
    } else {
        return 840;
    }
};

Subtitles.getLineHeight = function () {
    var savedValue = Config.read('subHeight');
    if (savedValue) {
        return Number(savedValue);
    } else {
        return 100;
    }
};

Subtitles.getBackground = function () {
    var savedValue = Config.read('subBack');
    if (savedValue != null) {
        return savedValue;
    } else {
        return true;
    }
};

Subtitles.setBackground = function (value) {
    Config.save('subBack', value); 
    this.setProperties();
};

Subtitles.saveSize = function (value) {
    Config.save('subSize', value); 
};

Subtitles.savePos = function (value) {
    Config.save('subPos', value);
};

Subtitles.saveLineHeight = function (value) {
    Config.save('subHeight', value);
};

Subtitles.move = function (moveUp) {
    if (!subtitlesEnabled) return;
    var oldValue = this.getPos();
    var newValue = (moveUp) ? oldValue-2 : oldValue+2;
    if (newValue > 600 && newValue < 1100) {
        $('#srtId').css('top', newValue); // write value to CSS
        this.savePos(newValue);
        this.showTest();
    }
};

Subtitles.size = function(increase) {
    if (!subtitlesEnabled) return;
    var oldValue = this.getSize();
    var newValue = (increase) ? oldValue+1 : oldValue-1;
    if (newValue > 30 && newValue < 102) {
        $('#srtId').css('font-size', newValue); // write value to CSS
        this.saveSize(newValue);
        this.showTest();
    }
};

Subtitles.separate = function(increase) {
    if (!subtitlesEnabled) return;
    var oldValue = this.getLineHeight();
    var newValue = (increase) ? oldValue+1 : oldValue-1;
    if (newValue >= 100 && newValue < 200) {
        if (newValue == 100) {
            $('#srtId').css('line-height', ''); // write value to CSS
        } else {
            $('#srtId').css('line-height', newValue + '%'); // write value to CSS
        }
        this.saveLineHeight(newValue);
        this.showTest();
    }
};

Subtitles.showTest = function () {
    Player.hideDetailedInfo();
    var testText = 'Test subtitle<br />Test subtitle';
    if ($('#srtId').html() == '' || $('#srtId').html() == testText) {
        this.set(testText, 2500);
    }
};

Subtitles.setProperties = function() {
    $('#srtId').show();
    $('#srtId').css('font-size', this.getSize());
    $('#srtId').css('top', this.getPos());
    var subBack = this.getBackground();
    var lineHeight = this.getLineHeight();
    if (lineHeight > 100 && subBack)
        $('#srtId').css('line-height', lineHeight + '%');
    else
        $('#srtId').css('line-height', '');
    if (subBack) {
        if (deviceYear >= 2014)
            $('#srtId').css('background-color', 'rgba(0, 0, 0, 0.7)');
        else
            $('#srtId').css('background-color', 'rgba(0, 0, 0, 0.5)');
    } else {
        $('#srtId').css('background-color', '');
    }
};
