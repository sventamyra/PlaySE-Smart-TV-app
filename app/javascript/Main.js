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
                   Log("itemCounter:" + itemCounter);
                   if (!restorePosition() && !refresh)
                       $("#content-scroll").show();
               },
               function(status, data) {
                   if (!refresh)
                       $("#content-scroll").show();
               }
              );
};