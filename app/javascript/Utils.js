var seqNo = 0;
var systemOffset = 0;
var isTopRowSelected = true;
var columnCounter = 0;
var itemCounter = 0;
var myLocation = "index.html";
var myRefreshLocation = null;
var myHistory = [];
var myPos = null;
var loadingTimer = 0;
var detailsOnTop = false;

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
    var exdate=getDate();
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
setLocation = function(location, oldPos)
{
    if (location == myLocation)
        return;
    if (oldPos == undefined) {
        myPos = null;
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

    case "LastChance":
        LastChance.onLoad(Refresh);
        break;

    case "Latest":
        Latest.onLoad(Refresh);
        break;

    default:
        Log("Unknown loaction!!!!" + NewLocation);
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

getDate = function() {
    try {
        var pluginTime = document.getElementById("pluginTime").GetEpochTime();
        if (pluginTime && pluginTime > 0)
            return new Date(pluginTime*1000);
    } catch(err) {
        // Log("pluginTime failed:" + err);
    }
    return new Date();
}

setSystemOffset = function() {
    var timeXhr = new XMLHttpRequest();
    timeXhr.onreadystatechange = function () {
        if (timeXhr.readyState == 4) {
            var timeMatch = timeXhr.responseText.match(/class=h1>([0-9]+):([0-9]+):([0-9]+)</)
            var actualSeconds = timeMatch[1]*3600 + timeMatch[2]*60 + timeMatch[3]*1;
            var now = getDate();
            var nowSecs = now.getHours()*3600 + now.getMinutes()*60 + now.getSeconds();
            systemOffset = Math.round((actualSeconds-nowSecs)/3600);
            Log("System Offset hours:" + systemOffset);
            timeXhr.destroy();
            timeXhr = null;
        }
    };
    timeXhr.open("GET", "http://www.timeanddate.com/worldclock/sweden/stockholm");
    timeXhr.send();
};

getInternalOffset = function () {
    var pluginNow = getDate();
    // var pluginNowSecs = pluginNow.getHours()*3600 + pluginNow.getMinutes()*60 + pluginNow.getSeconds();
    var internalNow = new Date() ;
    // var internalNowSecs = internalNow.getHours()*3600 + internalNow.getMinutes()*60 + internalNow.getSeconds();
    // Log("pluginNow:" + pluginNow);
    // Log("internalNow:" + internalNow);
    // Log("internalOffset (minutes):" + Math.round((pluginNow-internalNow)/60/1000));
    // Round to minutes
    return Math.round((pluginNow-internalNow)/60/1000)*60*1000
    
}

tsToClock = function (ts)
{
    var time = new Date(+ts + (systemOffset*3600*1000) + getInternalOffset());
    // Log("ts:" + ts + " time:" + time);
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

requestUrl = function(url, cbSucces, cbError, cbComplete) {

    var requestedLocation = {loc:myLocation, refLoc:myRefreshLocation};
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
            error: function(XMLHttpRequest, textStatus, errorThrown)
            {
                if (isRequestStillValid(requestedLocation)) {

                    this.tryCount++;
          	    if (textStatus == 'timeout' && this.tryCount <= this.retryLimit) {
                        //try again
                        return $.ajax(this);
                    } else {
        	        Log('Failure:' + this.url + " status:" + textStatus + " error:" + errorThrown);
        	        ConnectionError.show();
                        callUrlCallBack(requestedLocation, cbError, status, errorThrown);
        	    }
                }
            },
            complete: function(xhr, status)
            {
                callUrlCallBack(requestedLocation, cbComplete, status, xhr);
            }
        }
    );
};

callUrlCallBack = function(requestedLocation,cb,status,xhr) {
    if (cb && isRequestStillValid(requestedLocation))
        cb(status, xhr);
    else if (cb)
        Log("url skipped:" + requestedLocation.loc + " " + requestedLocation.refLoc + " Now:" + myLocation + " " +  myRefreshLocation);
};

isRequestStillValid = function (request) {
    return (request.loc == myLocation && request.refLoc == myRefreshLocation);x
}

Log = function (msg) 
{
    // var logXhr = new XMLHttpRequest();
    // logXhr.onreadystatechange = function () {
    //     if (logXhr.readyState == 4) {
    //         logXhr.destroy();
    //         logXhr = null;
    //     }
    // };
    // logXhr.open("GET", "http://<LOGSERVER>/log?msg='[PlaySE] " + seqNo++ % 10 + " : " + msg + "'");
    // logXhr.send();
    alert(msg);
};
