var widgetAPI = new Common.API.Widget();
var pluginAPI = new Common.API.Plugin();
var recommendedLinks = [];
var Main =
{
    loaded: false
};

Main.onLoad = function(refresh)
{
    Language.fixAButton();
    document.title = "Populärt";
    if (!refresh)
	Header.display(document.title);
    if (!this.loaded) {
        $("#page-cover").hide();
        loadingStart();
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


Main.loadXml = function(refresh){
    $("#content-scroll").hide();
    switch (channel) {
    case "svt":
        Main.loadSvt(refresh);
        break;
    case "viasat":
        Main.loadViasat(refresh);
        break;
    case "kanal5":
        Main.loadKanal5(refresh);
        break;
    }
};

Main.getLocation = function (refresh)
{
    if (refresh)
        return myRefreshLocation;
    return myLocation;
};
    
Main.loadSvt = function(refresh) {
    requestUrl('http://www.svtplay.se',
               function(status, data)
               {
                   data = data.responseText.split("<section class=\"play_js-hovered-list play_videolist-group")[0];
                   recommendedLinks = Section.decode_recommended(data);
               },
               null,
               function(xhr, status)
               {
                   Main.loadPopular(refresh);
               }
              );
};

Main.loadPopular = function(refresh){
    requestUrl('http://www.svtplay.se/populara?sida=1',
               function(status, data)
               {
                   data = data.responseText.split("div id=\"gridpage-content")[1];
                   Section.decode_data(data, recommendedLinks);
               },
               null,
               null,
               true,
               refresh
              );
};

Main.loadViasat = function(refresh) {
    var newChannel = this.getLocation(refresh).match(/viasat_channel=([0-9]+|reset)/);
    newChannel = (newChannel && newChannel.length > 0) ? newChannel[1] : null;
    if (newChannel)
        myHistory = [];
    requestUrl(Viasat.getUrl("main", newChannel),
               function(status, data)
               {
                   Viasat.decode(data.responseText);
               },
               null,
               null,
               true,
               refresh
              );
};

Main.loadKanal5 = function(refresh) {
    var newChannel = this.getLocation(refresh).match(/kanal5_channel=([0-9]+|reset)/);
    newChannel = (newChannel && newChannel.length > 0) ? newChannel[1] : null;
    if (newChannel)
        myHistory = [];
    var url = Kanal5.getUrl("main", newChannel);
    requestUrl(url,
               function(status, data)
               {
                   Kanal5.decode(data.responseText, {tag:"main",url:url}, false,
                                 function() {loadFinished(status, refresh)});
               }
              );
};
