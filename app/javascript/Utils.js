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
var myPos = null;
var loadingTimer = 0;
var detailsOnTop = false;

setChannel = function(newChannel) {
    if (channel != newChannel || 
        ((channel == 'viasat' && Viasat.anySubChannel()) ||
         (channel == 'kanal5' && Kanal5.anySubChannel())
        )
       )
    {
        channel = newChannel;
        Viasat.resetSubChannel();
        Kanal5.resetSubChannel();
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
        return 2011;
    }

    // Log("JTDEBUG getDeviceYear: " + Number(firmwareVersion.substr(10, 4)))
    return Number(firmwareVersion.substr(10, 4));
};

getCookie = function (cName) {
    var i,x,y,ARRcookies=document.cookie.split(";");
    for (i=0;i<ARRcookies.length;i++)
    {
        x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
        y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
        x=x.replace(/^\s+|\s+$/g,"");
        if (x==cName)
        {
            return unescape(y);
        }
    }
    return null;
};

setCookie = function(cName,value,exdays)
{
    var exdate=getCurrentDate();
    exdate.setDate(exdate.getDate() + exdays);
    var c_value=escape(value) + ((exdays==null) ? "" : "; expires="+exdate.toUTCString());
    document.cookie=cName + "=" + c_value;
};

String.prototype.trim = function () {
    return this.replace(/^\s*/, "").replace(/\s*$/, "");
};

loadingStart = function() {
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
}
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
        if ((channel == "svt" && !location.match(/categoryDetail.html/)) ||
            (channel == "viasat" && !location.match(/categories.html/)))
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

getOldLocation = function() {
    if (myHistory.length > 0)
        return myHistory[myHistory.length-1].loc
    else
        return null
};

setPosition = function(pos)
{
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
        if (pluginTime && pluginTime > 0)
            return new Date(pluginTime*1000 + clockOffset);
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
                         data = data.split("<div class=\"play_js-schedule__entry")[1];
                         var actualData = $(data).find('time').attr('datetime').match(/([0-9\-]+)T([0-9]+).([0-9]+)/);
                         var actualSeconds = actualData[2]*3600 + actualData[3]*60;
                         var actualDateString = actualData[1].replace(/-/g, "")
                         var tsDate = new Date(+data.match(/data-starttime=\"([0-9]+)/)[1]);           
                         var tsSeconds = tsDate.getHours()*3600 + tsDate.getMinutes()*60 + tsDate.getSeconds();
                         var tsDateString = dateToString(tsDate);
                         if (actualDateString > tsDateString) {
                             // Add 24 hours to actual
                             actualSeconds = actualSeconds + 24*3600;
                         } else if (tsDateString > actualDateString) {
                             // Add 24 hours to ts
                             tsSeconds = tsSeconds + 24*3600
                         }
                         var newDateOffset = Math.round((actualSeconds-tsSeconds)/3600)*3600*1000;
                         // Log("dateOffset (hours):" + newDateOffset/3600/1000 + " actualDate:" + actualDateString + " tsDate:" + tsDateString + " tsDate:" + tsDate + " ts:" + data.match(/data-starttime=\"([0-9]+)/)[1] + " starttime:" + actualData[0]);
                         dateOffset = newDateOffset;
	                 window.clearTimeout(setDateOffsetTimer);
                     },
                     true
                    )
};

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

tsToClock = function (ts)
{
    return msToClock(+ts + dateOffset);
};

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

fixLink = function (ImgLink) 
{
    if (ImgLink.match(/^\/\//)) {
        return "http:" + ImgLink;
    } else if (!ImgLink.match("https*:")) {
        if (!ImgLink.match(/^\//))
            ImgLink = "/" + ImgLink;
        return "http://www.svtplay.se" + ImgLink
    } else {
        return ImgLink
    }
};

requestUrl = function(url, cbSucces, cbError, cbComplete, callLoadFinished, refresh) {

    var requestedLocation = {url:url, loc:myLocation, refLoc:myRefreshLocation, channel:channel};
    $.support.cors = true;
    $.ajax(
        {
            type: 'GET',
            url: url,
            tryCount : 0,
            retryLimit : 3,
	    timeout: 15000,
            success: function(data, status, xhr)
            {
                Log('Success:' + this.url);
                data = null;
                callUrlCallBack(requestedLocation, cbSucces, status, xhr)
                xhr.destroy();
                xhr = null;
            },
            error: function(xhr, textStatus, errorThrown)
            {
                if (isRequestStillValid(requestedLocation)) {

                    this.tryCount++;
          	    if ((textStatus == 'timeout' || xhr.status == 1015) && 
                        this.tryCount <= this.retryLimit) 
                    {
                        //try again
                        return $.ajax(this);
                    } else {
        	        Log('Failure:' + this.url + " status:" + xhr.status + " " + textStatus + " error:" + errorThrown);
        	        ConnectionError.show();
                        callUrlCallBack(requestedLocation, cbError, textStatus, errorThrown);
        	    }
                }
            },
            complete: function(xhr, status)
            {
                callUrlCallBack(requestedLocation, cbComplete, status, xhr);
                if (callLoadFinished && isRequestStillValid(requestedLocation))
                    loadFinished(status, refresh);
            }
        }
    );
};

callUrlCallBack = function(requestedLocation,cb,status,xhr) {
    if (cb && isRequestStillValid(requestedLocation))
        cb(status, xhr);
    else if (cb)
        Log("url: " + requestedLocation.url + " skipped:" + requestedLocation.loc + " " + requestedLocation.refLoc + " " + requestedLocation.channel + " Now:" + myLocation + " " +  myRefreshLocation);
};

isRequestStillValid = function (request) {
    return (request.loc == myLocation && request.refLoc == myRefreshLocation && request.channel==channel);
}

syncHttpRequest = function(url) {
    var xhr = new XMLHttpRequest();
    var success, status, data = null;
    xhr.open("GET", url, false);
    xhr.send();
    success = (xhr.status === 200)
    status = xhr.status;
    if (success) {
        Log('Success:' + url);
        data = xhr.responseText;
    } else {
        Log('Failure:' + url + " status:" + status);
    }

    xhr.destroy();
    xhr = null;
    return {data:data, success:success, status:status}
};

asyncHttpRequest = function(url, callback, noLog) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            // if (xhr.status === 200)
            if (!noLog)
                Log('Success:' + url);
            if (callback) {
                callback(xhr.responseText);
            }
            xhr.destroy();
            xhr = null;
        }
    }
    xhr.open("GET", url);
    xhr.send();
};

getHistory = function(Name) {
    var Prefix = document.title;
    if (myRefreshLocation)
        Prefix = myRefreshLocation.replace(/.+&history=/, "");
    return Prefix.replace(/\/$/,"") + '/' + encodeURIComponent(Name) + '/';
}

loadFinished = function(status, refresh) {

    if (status == "success") {
        Log("itemCounter:" + itemCounter);
        if (!restorePosition() && !refresh)
            $("#content-scroll").show();
    } else {
        if (!refresh)
            $("#content-scroll").show();
    }
}

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
            running:null,
            starttime:null
           });
};

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

    IsLiveText = (Item.is_live || Item.is_channel) ? " is-live" : "";
    html += '<div class="scroll-item-img">';
    html += Item.link_prefix + Item.link + '&history=' + getHistory(Item.name) + '" class="ilink" data-length="' + Item.duration + '"' + IsLiveText + '><img src="' + Item.thumb + '" width="240" height="135" alt="' + Item.name + '" /></a>';

    if (Item.is_live && !Item.running) {
	html += '<span class="topoverlay">LIVE</span>';
	// html += '<span class="bottomoverlay">' + Item.starttime + ' - ' + endtime + '</span>';
	html += '<span class="bottomoverlay">' + Item.starttime + '</span>';
    }
    else if (Item.is_live){
	html += '<span class="topoverlayred">LIVE</span>';
	// html += '<span class="bottomoverlayred">' + Item.starttime + ' - ' + endtime + '</span>';
	html += '<span class="bottomoverlayred">' + Item.starttime + '</span>';
    }
    html += '</div>';
    html += '<div class="scroll-item-name">';
    html +=	'<p><a href="#">' + Item.name + '</a></p>';
    var MaxLen = (Item.name.length > 45) ? 45 : 90;
        if (Item.description.length > MaxLen){
		Item.description = Item.description.substring(0, MaxLen-3)+ "...";
    }
    html += '<span class="item-date">' + Item.description + '</span>';
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


Log = function (msg) 
{
    // asyncHttpRequest("http://<LOGSERVER>/log?msg='[PlaySE] " + seqNo++ % 10 + " : " + msg + "'", null, true);
    // alert(msg);
};
