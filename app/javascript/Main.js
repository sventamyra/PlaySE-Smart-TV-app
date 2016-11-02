var widgetAPI = new Common.API.Widget();
var pluginAPI = new Common.API.Plugin();
var MAX_WIDTH   = 960;
var MAX_HEIGHT  = 540;
var LINE_LENGTH = 45;
var THUMB_WIDTH = 240;
var THUMB_HEIGHT = 135;
var recommendedLinks = [];
var isEmulator = false;
var deviceYear  = null;
var Main =
{
    loaded         : false,
    clockTimer     : null,
    keepAliveTimer : null
};

Main.onLoad = function(refresh)
{
    Config.init();
    Language.fixAButton();
    document.title = "Populärt";
    if (channel == "dplay")
        document.title = 'Rekommenderat';
    if (!refresh)
	Header.display(document.title);
    if (!this.loaded) {
        $("#page-cover").hide();
        var model = document.getElementById("pluginObjectDEVICE").GetRealModel();
        isEmulator = (model === "VALENCIA" || model === "SDK" | !model);
        deviceYear = getDeviceYear();
        if (deviceYear > 2011)
            LINE_LENGTH = 36;
        Log("Model:" + model +  " DeviceYear:" + deviceYear + " IsEmulator:" + isEmulator + " curWidget:" + curWidget.name + " Cookies:" + document.cookie);
        loadingStart();
        Main.setClock();
        Main.startKeepAlive();
        checkDateFormat();
        this.loaded = true;
	Audio.init();
	Audio.showMuteFooter();
	Search.init();
	Language.init();
	ConnectionError.init();
	widgetAPI.sendReadyEvent();
        pluginAPI.registIMEKey();
	Language.setLang();
	Resolution.displayRes();
        setOffsets();
        fixCss();
	this.loadXml(refresh);	
	// Enable key event processing
	Buttons.enableKeys();
    } else if (!detailsOnTop) {
	this.loadXml(refresh);	
    }
};

Main.onUnload = function()
{
	Player.deinit();
};

Main.setClock = function() {
    window.clearTimeout(Main.clockTimer);
    Main.clockTimer = setClock($('#footer-clock'), Main.setClock);
}

Main.startKeepAlive = function() {
    if (deviceYear == 2013) {
        Main.requestRandomUrl();
    }
}

Main.requestRandomUrl = function() {
    window.clearTimeout(Main.keepAliveTimer);
    if (myUrls.length > 0) {
        // Log("Main.requestRandomUrl")
        asyncHttpRequest(myUrls[Math.floor(Math.random()*myUrls.length)], null, true);
    }
    Main.keepAliveTimer = window.setTimeout(Main.requestRandomUrl, 30*1000);
};


Main.loadXml = function(refresh){
    $("#content-scroll").hide();
    switch (channel) {
    case "svt":
        Main.loadSvt(refresh);
        break;
    case "viasat":
        Main.loadViasat(refresh);
        break;
    case "tv4":
        Main.loadTv4(refresh);
        break;
    case "dplay":
        Main.loadDplay(refresh);
        break;
    }
};

Main.loadSvt = function(refresh) {
    requestUrl('http://www.svtplay.se',
               function(status, data)
               {
                   recommendedLinks = Svt.decode_recommended(data, {addSections:true});
               },
               {cbComplete:function(xhr, status){Main.loadSvtPopular(refresh)}}
              );
};

Main.loadSvtPopular = function(refresh){
    requestUrl(Svt.sections[0].url,
               function(status, data)
               {
                   Svt.decode_section(data, recommendedLinks);
               },
               {callLoadFinished:true,
                refresh:refresh
               }
              );
};

Main.loadViasat = function(refresh) {
    var newChannel = getLocation(refresh).match(/viasat_channel=([0-9]+|reset)/);
    newChannel = (newChannel && newChannel.length > 0) ? newChannel[1] : null;
    if (newChannel && !refresh)
        myHistory = [];
    requestUrl(Viasat.getUrl("main", newChannel),
               function(status, data)
               {
                   Viasat.decode(data.responseText);
               },
               {callLoadFinished:true,
                refresh:refresh
               }
              );
};

Main.loadTv4 = function(refresh) {
    requestUrl(Tv4.getUrl("main"),
               function(status, data)
               {
                   Tv4.decode(data.responseText);
               },
               {callLoadFinished:true,
                refresh:refresh
               }
              );
};

Main.loadDplay = function(refresh) {
    var newChannel = getLocation(refresh).match(/dplay_channel=([0-9]+|reset)/);
    newChannel = (newChannel && newChannel.length > 0) ? newChannel[1] : null;
    if (newChannel && !refresh)
        myHistory = [];
    var url = Dplay.getUrl("main", newChannel);
    requestUrl(url,
               function(status, data)
               {
                   Dplay.decode(data.responseText, {tag:"main",url:url}, false);
               },
               {callLoadFinished:true,
                refresh:refresh
               }
              );
};
