var MAX_WIDTH   = 1920;
var MAX_HEIGHT  = 1080;
var LINE_LENGTH = 45;
var THUMB_WIDTH = 480;
var THUMB_HEIGHT = 270;
var DETAILS_THUMB_FACTOR = 1200/THUMB_WIDTH;
var BACKGROUND_THUMB_FACTOR = MAX_WIDTH/THUMB_WIDTH;
var recommendedLinks = [];
var isEmulator = false;
var deviceYear  = null;
var Main = {
    loaded         : false,
    clockTimer     : null
};

Main.onLoad = function(refresh) {
    Config.init();
    Channel.init();
    Language.fixAButton();
    if (!refresh) {
        document.title = Channel.getMainTitle();
	Header.display(document.title);
    }
    if (!this.loaded) {
        // Cache Viasat since slow
        httpRequest(Viasat.getMainUrl());
        $('#page-cover').hide();
        var model = webapis.productinfo.getRealModel();
        isEmulator = (model === 'VALENCIA' || model === 'SDK' || !model);
        deviceYear = getDeviceYear();
        if (deviceYear > 2011)
            LINE_LENGTH = 36;
        Log('Model:' + model +  ' DeviceYear:' + deviceYear + ' IsEmulator:' + isEmulator + ' application:' + tizen.application.getCurrentApplication().appInfo.name + ' Cookies:' + document.cookie + ' version:' + webapis.productinfo.getSmartTVServerVersion() + ' firmware:' + webapis.productinfo.getFirmware() + ' tizen version:' + tizen.systeminfo.getCapabilities().platformVersion);
        loadingStart();
        Main.setClock();
        checkDateFormat();
        Footer.display();
        this.loaded = true;
	Search.init();
	Language.init();
	ConnectionError.init();
	Language.setLang();
	Resolution.displayRes();
        Player.enableScreenSaver();
        setOffsets();
        fixCss();
	this.loadXml(refresh);	
	// Enable key event processing
	Buttons.enableKeys();
    } else if (!detailsOnTop) {
	this.loadXml(refresh);	
    }
};

Main.onUnload = function() {
	Player.deinit();
};

Main.setClock = function() {
    window.clearTimeout(Main.clockTimer);
    Main.clockTimer = setClock($('#footer-clock'), Main.setClock);
};

Main.loadXml = function(refresh){
    $('#content-scroll').hide();
    Channel.login(
        function() {
            var url = Channel.getUrl('main', {refresh:refresh});
            var cbComplete = function(status){loadFinished(status, refresh);};
            requestUrl(url,
                       function(status, data) {
                           Channel.decodeMain(data, 
                                              {url:url, 
                                               refresh:refresh,
                                               cbComplete:function(){cbComplete(status);}
                                              });
                           data = null;
                       },
                       {cbError:function(status){cbComplete(status);},
                        headers:Channel.getHeaders()
                       });
        }
    );
};
