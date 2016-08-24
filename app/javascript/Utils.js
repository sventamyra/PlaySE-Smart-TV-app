var channel = "svt";
var seqNo = 0;
var clockOffset = 0;
var setClockOffsetTimer = null;
var checkOffsetTimer = null;
var checkOffsetCounter = 0;
var dateOffset = 0;
var setDateOffsetTimer = null;
var isTopRowSelected = true;
var columnCounter = 0;
var itemCounter = 0;
var myLocation = "index.html";
var myRefreshLocation = null;
var myHistory = [];
var myUrls    = [];
var myPos = null;
var loadingTimer = 0;
var detailsOnTop = false;
var dateFormat = 0;

setChannel = function(newChannel) {
    if (channel != newChannel || 
        ((channel == 'viasat' && Viasat.anySubChannel()) ||
         (channel == 'dplay' && Dplay.anySubChannel())
        )
       )
    {
        channel = newChannel;
        Viasat.resetSubChannel();
        Dplay.resetSubChannel();
        myLocation = null;
        setLocation('index.html', undefined);
        myHistory = []; 
        Language.setLang();
    }
}

getDeviceYear = function() {
    var pluginNNavi = document.getElementById("pluginObjectNNavi");
    var firmwareVersion = pluginNNavi.GetFirmware();

    if (firmwareVersion === "") {
        // emulator
        return 666;
    }

    // Log("JTDEBUG getDeviceYear: " + Number(firmwareVersion.substr(10, 4)))
    return Number(firmwareVersion.substr(10, 4));
};

deleteAllCookies = function (name) {
    var cookies = document.cookie.match(/([^; ]+=[^; ]+)/g);
    if (name) {
        var regexp = new RegExp("(\\b" + name + "\\b=[^; ]+)", "g");
        cookies = document.cookie.match(regexp);
    }
    for (var i=0; cookies && i<cookies.length; i++)
    {
        deleteCookie(cookies[i]);
    }
    if (cookies)
        Log("All cookies deleted (name=" + name + "): " + document.cookie);
    // else
    //     Log("No cookies to delete (name=" + name + "): " + document.cookie);
};

deleteCookie = function(cookie) {
    // Log("Deleting " + cookie + " from " + document.cookie);
    document.cookie = cookie  + "; expires=Thu, 01 Jan 1970 00:00:01 GMT";
    // Log("Done " + document.cookie);
}

getCookie = function (name) {
    var regexp = new RegExp("\\b" + name + "\\b=([^; ]+)");
    var cookie = document.cookie.match(regexp);
    if (cookie)
        return unescape(cookie[1])
    else
        return null
};

setCookie = function(cName,value,exdays)
{
    value = escape(value) + "; path=/; domain=127.0.0.1";
    var exdate=getCurrentDate();
    exdate.setDate(exdate.getDate() + exdays);
    var c_value = value + ((exdays==null) ? "" : "; expires="+exdate.toUTCString());
    // Log("Setting " + cName + "=" + c_value);
    document.cookie=cName + "=" + c_value;
};

addCookiePath = function(cookie, url) {
    return cookie + "; path=/; domain=" + url.match(/https?:\/\/([^:\/]+)/)[1];
};

String.prototype.trim = function () {
    return this.replace(/^\s*/, "").replace(/\s*$/, "");
};

loadingStart = function() {
    if (isEmulator) return;
    try {
        if (loadingTimer == 0) {
            loadingTimer = window.setTimeout(function () {
                $('#loading').sfLoading('show');
            }, 500);
        }
    } catch(err) {
        return;
    }
};

loadingStop = function() {
    try {
        clearTimeout(loadingTimer);
        loadingTimer = 0;
        $('#loading').sfLoading('hide');  
    } catch(err) {
        return;
    }
};

refreshLocation = function(entry)
{
    myRefreshLocation = entry.loc;
    Language.fixAButton();
    dispatch(myRefreshLocation, true);
};

// Methods for "restoring" item position during "history.back"
replaceLocation = function(newlocation) {
    setLocation(newlocation, undefined, true);
};

setLocation = function(location, oldPos, skipHistory)
{
    if (location == myLocation)
        return;
    if (oldPos == undefined) {
        myPos = null;
        if (!skipHistory) {
            myHistory.push(
                {
                    loc: myLocation,
                    pos: 
                    {
                        col: columnCounter,
                        top: isTopRowSelected
                    }
                }
            );
        }
        detailsOnTop = false;
    } else {
        myPos = oldPos;
    }

    var isDetails = location.match(/details.html/);
    myLocation = location;
    myRefreshLocation = null;
    Buttons.setKeyHandleID(0); // default

    if (isDetails) {
        if (oldPos == undefined) {
            detailsOnTop = true;
        } else {
            detailsOnTop = false;
        }
    } else {
        Language.fixAButton();
        if ((channel == "svt" && !location.match(/categoryDetail.html/) && !location.match(/categories.html/)) ||
            ((channel == "viasat" || channel == "dplay") && !location.match(/categories.html/)))
            Language.fixBButton();
    }
    if ((isDetails && !detailsOnTop) || !detailsOnTop)
    {
        itemSelected = null;
        itemCounter = 0;
        columnCounter = 0;
        isTopRowSelected = true;
    }
    resetHtml(oldPos, isDetails);
    loadingStart();
    dispatch(myLocation);

    if (detailsOnTop && oldPos) {
        restorePosition();
        detailsOnTop = false;
    }
    // window.location = location;
};

dispatch = function(NewLocation, Refresh) {

    if (!Refresh && $(".slider-error").is(':visible'))
        ConnectionError.show(true);

    switch (NewLocation.match(/([a-zA-Z]+)\.html/)[1])
    {
    case "details":
        Details.onLoad(Refresh);
        break;

    case "index":
        Main.onLoad(Refresh);
        break;

    case "live":
        live.onLoad(Refresh);
        break;

    case "categories":
        Categories.onLoad(Refresh);
        break;

    case "categoryDetail":
        categoryDetail.onLoad(Refresh);
        break;

    case "showList":
        showList.onLoad(Refresh);
        break;

    case "SearchList":
        SearchList.onLoad(Refresh);
        break;

    default:
        Section.onLoad(NewLocation, Refresh);
        break;
    }
};

resetHtml = function(oldPos, isDetails)
{
    // Delete and hide details
    $(".content").hide();
    $('#projdetails').html("");
    // Delete and show list
    if ((isDetails && !detailsOnTop) || !detailsOnTop) {
        $('#topRow').html("");
        $('#bottomRow').html("");
        $('.content-holder').css("marginLeft", "0");
    }
    $(".slider-body").show();
    if (oldPos)
        $("#content-scroll").hide();
    else
        $("#content-scroll").show();
};

goBack = function(location)
{
    if (myHistory.length > 0) {
        oldLocation = myHistory.pop(),
        setLocation(oldLocation.loc, oldLocation.pos);
    }
    // history.go(-1);
};

restorePosition = function() 
{
    if (myPos) {
        setPosition(myPos);
    }
    if (myRefreshLocation) {
        detailsOnTop = true;
    } else {
        loadingStop();
    }
    return myPos;
};

fetchPriorLocation = function() 
{
    refreshLocation(myHistory[myHistory.length-1]);
};

getLocation = function (refresh)
{
    if (refresh)
        return myRefreshLocation;
    return myLocation;
};

getPriorLocation = function () {
    if (myHistory.length > 0)
        return myHistory[myHistory.length-1].loc;
    else 
        return "";
};

getIndexLocation = function() {
    var myNewLocation = (myRefreshLocation) ? myRefreshLocation : myLocation;
    if (myNewLocation.match(/details.html/))
        myNewLocation = getOldLocation();
    return myNewLocation;
}

getOldLocation = function() {
    if (myHistory.length > 0)
        return myHistory[myHistory.length-1].loc
    else
        return null
};

getIndex = function(MaxIndex, IndexToSkip) {
    var thisLocation = getIndexLocation();
    var anyIndex = thisLocation.match(/\?tab_index=([0-9]+)/);
    var nextIndex;
    if (!anyIndex) {
        currentIndex = 0;
    } else {
        currentIndex = +anyIndex[1];
        anyIndex     = true;
    }
    var nextIndex = (currentIndex == MaxIndex) ? 0 : currentIndex+1;
    if (IndexToSkip && nextIndex==IndexToSkip)
       nextIndex = nextIndex+1;
    return {current:currentIndex, next:nextIndex, any:anyIndex}
};

getNextIndexLocation = function(MaxIndex, IndexToSkip) {
    var thisLocation = getIndexLocation();
    var NextIndex = getIndex(MaxIndex, IndexToSkip).next;
    if (NextIndex == 0) {
        return thisLocation.replace(/\?tab_index=[0-9]+/, "")
    } else {
        return thisLocation.replace(/\.html(\?tab_index=[0-9]+)?/, ".html?tab_index=" + NextIndex)
    }
};

setPosition = function(pos)
{
    if (itemCounter == 0) {
        Log("setPosition without items?");
        return;
    }
    if (itemSelected) {
        itemSelected.removeClass('selected');
    } else {
        $('.topitem').eq(0).removeClass('selected');
    }
    if (pos.top) itemSelected = $('.topitem').eq(pos.col).addClass('selected');
    else         itemSelected = $('.bottomitem').eq(pos.col).addClass('selected');
    columnCounter    = pos.col;
    isTopRowSelected = pos.top;
    // Log("Position set to "  + columnCounter + " " + isTopRowSelected);
    Buttons.sscroll();
};

getCurrentDate = function() {
    try {
        var pluginTime = document.getElementById("pluginTime").GetEpochTime();
        if (pluginTime && pluginTime > 0) {
            return new Date(pluginTime*1000 + clockOffset);
        }
    } catch(err) {
        // Log("pluginTime failed:" + err);
    }
    return new Date();
}

setOffsets = function() {
    // Retry once a minute in case of failure
    window.clearTimeout(setClockOffsetTimer);
    setClockOffsetTimer = window.setTimeout(setOffsets, 60*1000);
    asyncHttpRequest("http://www.timeanddate.com/worldclock/sweden/stockholm", 
                     function(data) {
                         var timeMatch = data.match(/class=h1>([0-9]+):([0-9]+):([0-9]+)</)
                         var actualSeconds = timeMatch[1]*3600 + timeMatch[2]*60 + timeMatch[3]*1;
                         var actualDay = +data.match(/id=ctdat>[^0-9]+([0-9]+)/)[1];
                         var oldClockOffset = clockOffset;
                         clockOffset = 0;
                         var now = getCurrentDate();
                         var nowSeconds = now.getHours()*3600 + now.getMinutes()*60 + now.getSeconds();
                         var nowDay = now.getDate();
                         if (actualDay != nowDay) {
                             if (actualDay > nowDay || actualDay == 1) {
                                 // Add 24 hours to actual
                                 actualSeconds = actualSeconds + 24*3600;
                             } else {
                                 // Add 24 hours to now
                                 nowSeconds = nowSeconds + 24*3600
                             }
                         }
                         var newClockOffset = Math.round((actualSeconds-nowSeconds)/3600)*3600*1000;
                         // Log("Clock Offset hours:" + newClockOffset/3600/1000 + " actualDay:" + actualDay + " nowDay:" + nowDay + " timeMatch:" + timeMatch[0] + " now:" + now);
                         if (checkOffsetTimer == null || checkOffsetCounter > 0) {
                             if (checkOffsetTimer == null) {
                                 checkOffsetCounter = 5;
                             } else {
                                 checkOffsetCounter = checkOffsetCounter - 1;
                             }
                             if (newClockOffset != oldClockOffset && checkOffsetTimer != null) {
                                 Log("Clock Offset was changed!!!");
                             } else {
                                 checkOffsetTimer = window.setTimeout(setOffsets, 10*1000);
                             }
                         }
                         clockOffset = newClockOffset;
	                 window.clearTimeout(setClockOffsetTimer);
                     },
                     true
                    );
    setDateOffset();
};

setDateOffset = function () {
    // Retry once a minute in case of failure
    window.clearTimeout(setDateOffsetTimer);
    setDateOffsetTimer = window.setTimeout(setDateOffset, 60*1000);
    asyncHttpRequest("http://www.svtplay.se/kanaler",
                     function(data)
                     {
                         dateOffset = 0;
                         data = Svt.decodeJson({responseText:data}).context.dispatcher.stores.ScheduleStore.channels[0];
                         data = data.schedule[0].broadcastStartTime;
                         var actualData = data.match(/([0-9\-]+)T([0-9]+).([0-9]+)/);
                         var actualSeconds = actualData[2]*3600 + actualData[3]*60;
                         var actualDateString = actualData[1].replace(/-/g, "")
                         var tsDate = timeToDate(data)
                         var tsSeconds = tsDate.getHours()*3600 + tsDate.getMinutes()*60 + tsDate.getSeconds();
                         var tsDateString = dateToString(tsDate);
                         if (actualDateString > tsDateString) {
                             // Add 24 hours to actual
                             actualSeconds = actualSeconds + 24*3600;
                         } else if (tsDateString > actualDateString) {
                             // Add 24 hours to ts
                             tsSeconds = tsSeconds + 24*3600
                         }
                         dateOffset = Math.round((actualSeconds-tsSeconds)/3600)*3600*1000;
                         // Log("dateOffset (hours):" + dateOffset/3600/1000 + " actualDate:" + actualDateString + " tsDate:" + tsDateString + " tsDate:" + tsDate + " data:" + data + " starttime:" + actualData[0]);
	                 window.clearTimeout(setDateOffsetTimer);
                     },
                     true
                    )
};

checkDateFormat = function() {
    if (isNaN(new Date("2016 07 25 22:00:00 +0200")))
        dateFormat = 1;
    else
        dateFormat = 0;
    alert("dateFormat:" + dateFormat);
}

timeToDate = function(timeString) {
    if (dateFormat == 1)
        timeString = timeString.replace(/-/g,"/").replace("T", " ").replace(/\+([0-9]+):([0-9]+)/,"+$1$2").replace("Z", "+0000")
    else
        timeString = timeString.replace(/-/g," ").replace("T", " ").replace(/\+/," +").replace("Z", " +00:00")
    var date = new Date(timeString);
    return new Date(date.getTime() + dateOffset);
}

dateToHuman = function (date) {
    if (date && (date instanceof Date)) {
        var days_diff = new Date(dateToString(date," "))-new Date(dateToString(getCurrentDate()," "));
        days_diff = days_diff/1000/3600/24;
        if (days_diff == -1)
            date = ((Language.getisSwedish()) ? "Igår " : "Yesterday ") + dateToClock(date);
        else if (days_diff == 0)
            date = dateToClock(date)
        else if (days_diff == 1)
            date = ((Language.getisSwedish()) ? "Imorgon " : "Tomorrow ") + dateToClock(date)
        else
            date = dateToFullString(date);
    } else if (date == undefined)
        return "";
    return date
}

dateToFullString = function (Date) {
    return dateToString(Date,"-") + " " + dateToClock(Date);
}

dateToString = function (Date,separator) {
    var Day = Date.getDate()
    Day = Day < 10 ?  "0" + Day : "" + Day;
    var Month = Date.getMonth()+1;
    Month = Month < 10 ?  "0" + Month : "" + Month;
    if (separator)
        return Date.getFullYear() + separator + Month + separator + Day;
    else
        return Date.getFullYear() + Month + Day;
}

dateToClock = function(Date) {
    return msToClock(Date.getTime());
}

getClock = function() 
{
    return msToClock(getCurrentDate().getTime());
}

msToClock = function (ts)
{
    var time = new Date(+ts);
    var hour = time.getHours();
    var minutes = time.getMinutes();
    if (hour < 10) hour = "0" + hour;
    if (minutes < 10) minutes = "0" + minutes;
    return hour + ":" + minutes;
};

requestUrl = function(url, cbSucces, extra) {
    if (!extra) extra = {};
        
    var requestedLocation = {url:url, loc:myLocation, refLoc:myRefreshLocation, channel:channel};
    addToMyUrls(url);
    if (extra.cookie) {
        
        extra.cookie = addCookiePath(extra.cookie, url);
        Log("Adding " + extra.cookie + " to " + document.cookie);
        document.cookie = extra.cookie;
        // Log("Added " + document.cookie);
    }
    $.support.cors = true;
    $.ajax(
        {
            type: 'GET',
            url: url,
            tryCount : 0,
            retryLimit : 3,
	    timeout: 15000,
            beforeSend: function (request)
            {
                if (deviceYear == 2014 && extra.cookie) {
                    extra.cookie = extra.cookie.replace(/ *;.*/,"")
                    Log("Sending " + extra.cookie + " in Headers.");
                    request.setRequestHeader("Cookie", extra.cookie)
                }
            },
            success: function(data, status, xhr)
            {
                Log('Success:' + this.url);
                data = null;
                callUrlCallBack(requestedLocation, cbSucces, status, xhr)
                xhr.destroy();
                xhr = null;
                if (extra.cookie)
                    deleteCookie(extra.cookie);
            },
            error: function(xhr, textStatus, errorThrown)
            {
                if (isRequestStillValid(requestedLocation)) {
        	    Log('Failure:' + this.url + " status:" + xhr.status + " " + textStatus + " error:" + errorThrown + " Headers:" + xhr.getAllResponseHeaders());
                    this.tryCount++;
          	    if ((textStatus == 'timeout' || xhr.status == 1015) && 
                        this.tryCount <= this.retryLimit) {
                        //try again
                        return $.ajax(this);
                    } else {
        	        ConnectionError.show();
                        callUrlCallBack(requestedLocation, extra.cbError, textStatus, errorThrown);
        	    }
                }
                if (extra.cookie)
                    deleteCookie(extra.cookie)
            },
            complete: function(xhr, status)
            {
                callUrlCallBack(requestedLocation, extra.cbComplete, status, xhr);
                if (extra.callLoadFinished && isRequestStillValid(requestedLocation))
                    loadFinished(status, extra.refresh);
            }
        }
    );
};

callUrlCallBack = function(requestedLocation,cb,status,xhr) {
    if (cb && isRequestStillValid(requestedLocation)) {
        cb(status, xhr);
    } else if (cb)
        Log("Url skipped: " + requestedLocation.url + " Skipped:" + requestedLocation.loc + " " + requestedLocation.refLoc + " " + requestedLocation.channel + " New:" + myLocation + " " +  myRefreshLocation);
};

isRequestStillValid = function (request) {
    return (request.loc == myLocation && request.refLoc == myRefreshLocation && request.channel==channel);
}

syncHttpRequest = function(url) {
    addToMyUrls(url);
    var xhr = new XMLHttpRequest();
    var success, status, data, location = null;
    xhr.open("GET", url, false);
    xhr.send();
    success = (xhr.status === 200)
    status = xhr.status;
    if (success) {
        Log('Success:' + url);
        data = xhr.responseText;
    } else if (status === 302) {
        location = xhr.getResponseHeader('location');
    } else {
        Log('Failure:' + url + " status:" + status);
    }

    xhr.destroy();
    xhr = null;
    return {data:data, success:success, status:status, location:location}
};

asyncHttpRequest = function(url, callback, noLog, timeout) {
    addToMyUrls(url);
    var xhr = new XMLHttpRequest();
    var timer = null;
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            window.clearTimeout(timer);
            // if (xhr.status === 200)
            if (!noLog) {
                if (xhr.status === 200)
                    Log('Success:' + url);
                else
                    Log('asyncHttpRequest:' + url + " status:" + xhr.status);
            }
            if (callback) {
                callback(xhr.responseText, xhr.status);
            }
            xhr.destroy();
            xhr = null;
        }
    }
    xhr.open("GET", url);
    if (timeout) {
        timer = window.setTimeout(function() {
            xhr.abort();
            Log('Timeout:' + url);
            if (callback)
                callback(null, "timeout");
        }, timeout);
    }
    xhr.send();
};

getHistory = function(Name) {
    var Prefix = document.title;
    if (myRefreshLocation && myRefreshLocation.match(/.+&history=/)) {
        Prefix = myRefreshLocation.replace(/.+&history=/, "");
    }
    return Prefix.replace(/\/$/,"") + '/' + encodeURIComponent(Name) + '/';
}

loadFinished = function(status, refresh) {
    fixCss();
    if (status == "success") {
        Log("itemCounter:" + itemCounter);
        if (!restorePosition() && !refresh)
            $("#content-scroll").show();
    } else {
        if (!refresh)
            $("#content-scroll").show();
    }
}

fixCss = function() {
    if (deviceYear >= 2014) {
        $('#footer-clock').css({"bottom":"16px"});
        $('.confirmExit').css({"padding":"6px 10px"});
    } else if (deviceYear > 2011) {
        $('.confirmExit').css({"padding":"10px", "padding-bottom":"5px"});
    };
};

seasonToHtml = function(Name, Thumb, Link, Season) {
    showToHtml(Name, 
               Thumb, 
               Link, 
               makeSeasonLinkPrefix(Name, Season)
              );
};

makeSeasonLinkPrefix = function(Name, Season) {
    LinkPrefix = '<a href="showList.html?'
    if (!Season)
        Season="1";
    return LinkPrefix + 'season=' + Season + "&title=" + encodeURIComponent(Name) + "&name="
}

// Replace Current Location with the only Season existing
callTheOnlySeason = function(Name, Link) {
    LinkPrefix = makeSeasonLinkPrefix(Name, "0")
    replaceLocation(LinkPrefix + Link + "&history=" + getHistory(Name));
}

clipToHtml = function(Thumb, Link) {
    showToHtml("Klipp", Thumb, Link, '<a href="showList.html?clips=1&title=Klipp&name=');
};

showToHtml = function(Name, Thumb, Link, LinkPrefix) {
    if (!LinkPrefix)
        LinkPrefix = '<a href="showList.html?name='

    toHtml({name: Name,
            link: Link,
            link_prefix: LinkPrefix,
            thumb: Thumb,
            description: "",
            duration:"",
            is_live:false,
            is_channel:false,
            is_running:null,
            starttime:null
           });
};

makeShowLink = function(Name, Url) {
    return makeLink("showList.html?name=", Name, Url);
}

makeLink = function(LinkPrefix, Name, Url) {
    return LinkPrefix + Url + '&history=' + getHistory(Name);
}

toHtml = function(Item) {

    var html;
    var IsLiveText;

    if(itemCounter % 2 == 0){
	if(itemCounter > 0){
	    html = '<div class="scroll-content-item topitem">';
	}
	else{
	    html = '<div class="scroll-content-item selected topitem">';
	}
    }
    else{
	html = '<div class="scroll-content-item bottomitem">';
    }
    if (Item.is_live || Item.is_channel) {
        IsLiveText = (Item.is_running) ? " is-live" : " not-yet-available";
    } else {
        IsLiveText = "";
    }
    if (Item.link_prefix.match(/categoryDetail\.html/)) {
        Item.link = Item.link + "&catThumb=" + encodeURIComponent(Item.largeThumb);
        Item.link = Item.link + "&catName=" + encodeURIComponent(Item.name);
    }
    html += '<div class="scroll-item-img">';
    html += makeLink(Item.link_prefix,Item.name,Item.link) + '" class="ilink" data-length="' + Item.duration + '"' + IsLiveText + '><img src="' + Item.thumb + '" width="' + THUMB_WIDTH + '" height="' + THUMB_HEIGHT + '" alt="' + Item.name + '" /></a>';

    Item.starttime = dateToHuman(Item.starttime);
    if (Item.is_live && !Item.is_running) {
	html += '<span class="topoverlay">LIVE</span>';
	html += '<span class="bottomoverlay">' + Item.starttime + '</span>';
    }
    else if (Item.is_live){
	html += '<span class="topoverlayred">LIVE</span>';
	html += '<span class="bottomoverlayred">' + Item.starttime + '</span>';
    }
    html += '</div>';
    Item.name = Item.name.trim();
    html += '<div class="scroll-item-name">';
    html +=	'<p><a href="#">' + Item.name + '</a></p>';
    Item.description = (Item.description) ? Item.description.trim() : "";
    html += '<span class="item-date"';
    if (Item.name.length > 2*LINE_LENGTH)
        Item.description = "";
    else if (Item.name.length > LINE_LENGTH)
        html += ' style=" max-height:11px;"';
    html += '>' + Item.description + '</span>';
    html += '</div>';
    html += '</div>';
    
    if(itemCounter % 2 == 0){
	$('#topRow').append($(html));
    }
    else{
	$('#bottomRow').append($(html));
    }
    html = null;
    itemCounter++;
};

setClock = function(id, callback) {
    var time = getCurrentDate();
    id.html(msToClock(time.getTime()));
    return window.setTimeout(callback, (60-time.getSeconds())*1000);
}

slideToggle = function(id, timer, callback) {
    if (deviceYear < 2011) {
        if (id.is(':visible'))
            id.hide();
        else
            id.show();
        if (callback) {
            window.setTimeout(callback, timer);
        }
    } else
        id.slideToggle(timer, callback);
}

addToMyUrls = function(url) {
    if (myUrls.indexOf(url) == -1 && url.indexOf("/log?msg") == -1) {
        myUrls.push(url);
        myUrls = myUrls.slice(0,10);
    }
};

Log = function (msg) 
{
    // asyncHttpRequest("http://<LOGSERVER>/log?msg='[" + curWidget.name + "] " + seqNo++ % 10 + " : " + msg + "'", null, true);
    // alert(msg);
};
