var Categories =
{

};

Categories.onLoad = function(refresh)
{
    document.title = "Kategorier";
    if (channel == "viasat")
        Viasat.updateCategoryTitle();
    else if (channel == "kanal5")
        Kanal5.updateCategoryTitle();

    if (!refresh) {
	Header.display(document.title);
    }
    if (!detailsOnTop)
	this.loadXml(refresh);
};

Categories.onUnload = function()
{

};

Categories.loadXml = function(refresh) {
    $("#content-scroll").hide();
    switch (channel) {
    case "svt":
        Categories.loadSvt(refresh);
        break;
    case "viasat":
        Categories.loadViasat(refresh);
        break;
    case "kanal5":
        Categories.loadKanal5(refresh);
        break;
    }
};

Categories.loadSvt = function(refresh) {
    requestUrl('http://www.svtplay.se/program',
               true,
               refresh,
               function(status, data)
               {
                   data = data.responseText.split("<section class=\"play_alphabetic-group")[1];
                   
                   $(data).find('a').filter(function() {
                       return $(this).attr('class') == "play_category-grid__link";
                   }).each(function(){
                       var $video = $(this); 
                       var Name = $($video.find('span')[0]).text().trim();
		       var Link = fixLink($video.attr('href'));
		       //Log(Link);
		       //var Description = $video.find('Description').text();
	               var ImgLink  = $video.find('img').attr('data-imagename');
                       if (!ImgLink) ImgLink = $video.find('img').attr('src');
                       ImgLink = fixLink(ImgLink);
                       showToHtml(Name,
                                  ImgLink,
                                  Link,
                                  '<a href="categoryDetail.html?category='
                                 );
	               $tmpData = $video = null;
                   });
                   data = null;
               }
              );
};

Categories.setNextLocation = function()
{
    setLocation(Viasat.getNextCategory());
};

Categories.loadViasat = function(refresh) {
    url = Viasat.getUrl("categories")
    Viasat.toggleBButton();
    requestUrl(url,
               false,
               null,
               function(status, data)
               {
                   Viasat.decodeCategories(data.responseText, url, function(){loadFinished(status, refresh)});
                   data = null;
               },
               function(status, data) {
                   loadFinished(status, refresh);
               }
              );
};

Categories.loadKanal5 = function(refresh) {
    Kanal5.getAllShows(function(){loadFinished("success", refresh)});
};
//window.location = 'categoryDetail.html?category=' + ilink + '&history=Kategorier/' + iname +'/';


