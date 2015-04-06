var seqNo = 0;
var systemOffset = 0;
var isTopRowSelected = true;
var columnCounter = 0;
var itemCounter = 0;
var myLocation = "index.html";
var myHistory = [];
var myPos = null;

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
    var exdate=new Date();
    exdate.setDate(exdate.getDate() + exdays);
    var c_value=escape(value) + ((exdays==null) ? "" : "; expires="+exdate.toUTCString());
    document.cookie=cName + "=" + c_value;
};

String.prototype.trim = function () {
    return this.replace(/^\s*/, "").replace(/\s*$/, "");
};

// Methods for "restoring" item position during "history.back"
setLocation = function(location, oldPos)
{
    if (location == myLocation)
        return;
    else if (!oldPos) {
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
    } else {
        myPos = oldPos;
    }
    itemSelected = null;
    itemCounter = 0;
    columnCounter = 0;
    isTopRowSelected = true;
    myLocation = location;
    Buttons.setKeyHandleID(0); // default
    resetHtml(oldPos);

    switch (myLocation.match(/([a-zA-Z]+)\.html/)[1])
    {
    case "index":
        Main.onLoad();
        break;

    case "live":
        live.onLoad();
        break;

    case "categories":
        Categories.onLoad();
        break;

    case "categoryDetail":
        categoryDetail.onLoad();
        break;

    case "showList":
        showList.onLoad();
        break;

    case "SearchList":
        SearchList.onLoad();
        break;

    case "details":
        Details.onLoad();
        break;

    default:
        Log("Unknown loaction!!!!" + location);
    }
    
    // window.location = location;
};

resetHtml = function(oldPos)
{
    // Delete and hide details
    $(".content").hide();
    $('#projdetails').html("");
    // Delete and show list
    $('#topRow').html("");
    $('#bottomRow').html("");
    $('.content-holder').css("marginLeft", "0");
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

setSystemOffset = function() {
    var timeXhr = new XMLHttpRequest();
    timeXhr.onreadystatechange = function () {
        if (timeXhr.readyState == 4) {
            var timeMatch = timeXhr.responseText.match(/class=h1>([0-9]+):([0-9]+):([0-9]+)</)
            var actualSeconds = timeMatch[1]*3600 + timeMatch[2]*60 + timeMatch[3]*1;
            var now = new Date();
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

tsToClock = function (ts)
{
    var time = new Date(+ts + (systemOffset*3600*1000));
    var hour = time.getHours();
    var minutes = time.getMinutes();
    if (hour < 10) hour = "0" + hour;
    if (minutes < 10) minutes = "0" + minutes;
    return hour + ":" + minutes;
};

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
