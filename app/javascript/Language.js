var timeout;
var oldKeyHandle;
var isSwedish=true;
var Language =
{
   
};

Language.init = function()
{
	var html = '<div class="language-content">';
	html += '<ul>';
	html += '<li class="title stitle"><a href="#">Language / Språk:</a></li>';
	html += '<li id="english" class="unselected"><a href="#">English</a></li>';
	html += '<li id="swedish" class="checked unselected"><a href="#">Svenska</a></li>';
	html += '</ul>';
	html += '</div>';
	html += '<div class="res-content">';
	html += '<ul>';
	html += '<li class="title"><a href="#">Bandwith / Bandbredd:</a></li>';
	html += '<li id="resauto" class="unselected"><a href="#">Auto</a></li>';
	html += '<li id="res1" class="unselected"><a href="#">Min</a></li>';
	html += '<li id="res2" class="unselected"><a href="#">0.5Mbps</a></li>';
	html += '<li id="res3" class="unselected"><a href="#">1.5Mbps</a></li>';
	html += '<li id="res4" class="unselected"><a href="#">3Mbps</a></li>';
	html += '<li id="res5" class="unselected"><a href="#">5Mbps</a></li>';
	html += '<li id="res6" class="unselected"><a href="#">Max</a></li>';
	html += '</ul>';
	html += '</div>';
	html += '<div class="res-live-content">';
	html += '<ul>';
	html += '<li class="title"><a href="#">Bandwith / Bandbredd (Live):</a></li>';
	html += '<li id="reslauto" class="unselected"><a href="#">Auto</a></li>';
	html += '<li id="resl1" class="unselected"><a href="#">Min</a></li>';
	html += '<li id="resl2" class="unselected"><a href="#">0.5Mbps</a></li>';
	html += '<li id="resl3" class="unselected"><a href="#">1.5Mbps</a></li>';
	html += '<li id="resl4" class="unselected"><a href="#">3Mbps</a></li>';
	html += '<li id="resl5" class="unselected"><a href="#">5Mbps</a></li>';
	html += '<li id="resl6" class="unselected"><a href="#">Max</a></li>';
	html += '</ul>';
	html += '</div>';
	$(".slider-language").html(html);
    return true;
};

Language.getisSwedish=function(){
return isSwedish;
};

Language.setLang = function(value){
        if (!value)
            value = this.checkLanguage();
	var src="url(images/name.png)";
        this.fixAButton(value);
        this.fixBButton(value);
        this.fixCButton(value);
	if(value == 'English'){
		$('#english').addClass('checked');
		$('#swedish').removeClass('checked');

		src="url(images/name-english.png)";
		$("#d-button").text('Search');
		isSwedish=false;
		
	}else {

		$('#swedish').addClass('checked');
		$('#english').removeClass('checked');
		$("#d-button").text('Sök');		
		isSwedish=true;
	}
	
	$('#companyName').css('background-image', src );
	
	if($("#aired").length > 0)
		this.setDetailLang();
	else if($("#shown_now").length > 0){
		this.setKanalerLang();
	}

};


Language.setDetailLang=function(){
	var value = this.checkLanguage();
	if(value == 'English'){
	
		$("#aired").text("Aired: ");		
		$("#available").text("Available to: ");		
		$("#duration").text("Duration: ");
		$("#playButton").text("Play");	
		$("#notStartedButton").text("Not started");	
		$("#backButton").text("Return");
		$("#enterShowButton").text("Enter Show");
		
	}else {
		$("#aired").text("Sändes: ");
		$("#available").text("Tillgänglig till: ");
		$("#duration").text("Längd: ");
		$("#playButton").text("Spela upp");
		$("#notStartedButton").text("Ej Startat");
		$("#backButton").text("Tillbaka");
		$("#enterShowButton").text("Till Programmet");
	}
};

Language.setKanalerLang=function(){
	var value = this.checkLanguage();
	if(value == 'English'){
	
		$("#shown_now").text("Shown now: ");
		$("#begins").text("Begins: ");
		$("#duration").text("Duration: ");
		$("#playButton").text("Play");
		$("#backButton").text("Return");
		
	}else {
		$("#shown_now").text("Visas nu: ");
		$("#begins").text("Börjar: ");
		$("#duration").text("Längd: ");
		$("#playButton").text("Spela upp");
		$("#backButton").text("Tillbaka");
	}
};

Language.show = function()
{
	
	if(Buttons.getKeyHandleID() != 6){
		oldKeyHandle = Buttons.getKeyHandleID();
		Buttons.setKeyHandleID(6);
	}
	else{
		Buttons.setKeyHandleID(oldKeyHandle);
	}
    slideToggle($(".slider-language"), 500, function() {});
};

Language.hide = function()
{
	
	if(Buttons.getKeyHandleID() == 6){
	    Buttons.setKeyHandleID(oldKeyHandle);
            slideToggle($(".slider-language"), 500, function() {})
	}
	

};

Language.checkLanguage = function()
{
var language=Config.read("language");
if (language!=null && language!="")
  {
  return language;
  }
else 
  {
	return 'Swedish';
  }
};

Language.setLanguage = function(value)
{
	Config.save('language', value);
};

Language.fixAButton = function(language) {
    if (!language)
        language = this.checkLanguage();

    if (channel == "svt") {
        if ((myRefreshLocation && (myRefreshLocation.indexOf("index.html")) != -1) || myLocation.indexOf("index.html") != -1) {
            if(language == 'English'){
	        $("#a-button").text('Last Chance');
            } else {
	        $("#a-button").text('Sista Chansen');
            }
        } else if((myRefreshLocation && (myRefreshLocation.indexOf("LastChance.html")) != -1) || myLocation.indexOf("LastChance.html") != -1) {
            if(language == 'English'){
	        $("#a-button").text('Latest');
            } else {
	        $("#a-button").text('Senaste');
            }
        } else if((myRefreshLocation && (myRefreshLocation.indexOf("Latest.html")) != -1) || myLocation.indexOf("Latest.html") != -1) {
            if(language == 'English'){
	        $("#a-button").text('Latest News');
            } else {
	        $("#a-button").text('Senaste Nyheter');
            }
        } else {
            if(language == 'English'){
	        $("#a-button").text('Popular');
            } else {
	        $("#a-button").text('Populärt');
            }

        }
    } else if (channel == "viasat") {
        Viasat.fixAButton(language);
    } else if (channel == "tv4") {
        Tv4.fixAButton(language);
    } else if (channel == "dplay") {
        Dplay.fixAButton(language);
    }
};

Language.fixBButton = function(language)
{
    $("#b-button").text(this.getBButtonText(language))
};

Language.getBButtonText = function(language)
{
    if (!language)
        language = this.checkLanguage();

    if(language == 'English')
        return 'Categories';
    else
        return 'Kategorier';
};

Language.isBButtonChanged = function()
{
    return $("#b-button").text() != this.getBButtonText();
};

Language.fixCButton = function(language)
{
    $("#c-button").text(this.getCButtonText(language))
};

Language.getCButtonText = function(language)
{
    if (!language)
        language = this.checkLanguage();

    if (channel == "svt") {
        if(language == 'English')
	    return 'Channels & live broadcasts';
        else
            return 'Kanaler & livesändningar';
    } else if (channel == "viasat") {
        return Viasat.getCButtonText(language);
    } else if (channel == "tv4") {
        return Tv4.getCButtonText(language);
    } else if (channel == "dplay") {
        return Dplay.getCButtonText(language);
    }
};
