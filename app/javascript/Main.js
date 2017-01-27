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
    Channel.init();
    Language.fixAButton();
    
    if (!refresh) {
        document.title = Channel.getMainTitle();
	Header.display(document.title);
    }
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
        // if (deviceYear == 2013)
        //     Main.startKeepAlive();
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
    Main.requestRandomUrl();
}

Main.toggleKeepAlive = function() {
    Log("Player.toggleKeepAlive()")
    if (Main.keepAliveTimer) {
        window.clearTimeout(Main.keepAliveTimer);
        Main.keepAliveTimer = null;
    } else {
        Main.startKeepAlive()
    }
}


Main.requestRandomUrl = function() {
    window.clearTimeout(Main.keepAliveTimer);
    if (myUrls.length > 0) {
        // Log("Main.requestRandomUrl")
        var item = myUrls[Math.floor(Math.random()*myUrls.length)]
        item.extra.not_random = true;
        httpRequest(item.url, item.extra);
    }
    Main.keepAliveTimer = window.setTimeout(Main.requestRandomUrl, 30*1000);
};


Main.loadXml = function(refresh){
    $("#content-scroll").hide();
    Channel.login(
        function() {
            var url = Channel.getUrl("main", {refresh:refresh});
            var cbComplete = function(status){loadFinished(status, refresh)};
            requestUrl(url,
                       function(status, data)
                       {
                           Channel.decodeMain(data, 
                                              {url:url, 
                                               refresh:refresh,
                                               cbComplete:function(){cbComplete(status)}
                                              });
                           data = null;
                       },
                       {cbError:function(status){cbComplete(status)},
                        headers:Channel.getHeaders()
                       });
        }
    )
};
