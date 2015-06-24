var categoryDetail =
{
    tabs: [],
    tab_index: 0
};

categoryDetail.onLoad = function(refresh)
{
    var location = categoryDetail.getLocation(refresh);
    if (location.indexOf("&tab_index=") == -1) {
        categoryDetail.tabs = [];
        categoryDetail.tab_index = 0;
    } else {
        categoryDetail.tab_index = +location.match(/&tab_index=([0-9]+)/)[1];
    }

    if (!detailsOnTop)
	this.loadXml(this.Geturl(refresh));
    if (!refresh)
	PathHistory.GetPath();
//	widgetAPI.sendReadyEvent();
};

categoryDetail.getLocation = function (refresh)
{
    if (refresh)
        return myRefreshLocation;
    return myLocation;
};

categoryDetail.setNextLocation = function()
{
    var myNewLocation = myLocation;
    if (detailsOnTop)
        myNewLocation = getOldLocation();

    myNewLocation = myNewLocation.replace(/([^\/]+\/&tab_index=[0-9]+)*$/, this.getNextName());
    setLocation(myNewLocation + "/&tab_index=" + this.getNextTabIndex());
};

categoryDetail.getNextName = function()
{
    return categoryDetail.tabs[this.getNextTabIndex()].name;
};

categoryDetail.getCategoryName = function()
{
    return decodeURIComponent(document.title.match(/[^\/]+\/([^\/]+)/)[1]);
};

categoryDetail.getNextTabIndex = function()
{
    if ((categoryDetail.tab_index+1) >= categoryDetail.tabs.length)
        return 0;
    else
        return categoryDetail.tab_index+1;
};

categoryDetail.onUnload = function()
{

};
// categoryDetail.html?category=/barn&history=Kategorier/Barn
categoryDetail.Geturl=function(refresh){
    var url;
    if (!refresh && categoryDetail.tabs.length > categoryDetail.tab_index) {
        url = categoryDetail.tabs[categoryDetail.tab_index].href;
        if (url.indexOf(myLocation.match(/\?category=(http:[^&]+)/)[1]) != -1)
            return url
    }
    url = categoryDetail.getLocation(refresh);
    var parse;
    var name="";
    if (url.indexOf("category=")>0)
    {
		// parse = url.substring(url.indexOf("=")+13,url.length);
		parse = url.substring(url.indexOf("=")+1,url.length);
		if (url.indexOf("&")>0)
		{
			name = parse.substring(0,parse.indexOf("&"));
			
		}
		else{
			name = parse;
		}
	}
    return name.replace("tvcategories\/", "");
};

categoryDetail.loadXml = function(url){

    if (categoryDetail.tabs.length > categoryDetail.tab_index &&
        url == categoryDetail.tabs[categoryDetail.tab_index].href) {
        categoryDetail.fixBButton();
    };

    requestUrl(url,
               function(status, data)
               {
                   data = data.responseText.split("ul class=\"play_category__tab");
                   tabs = data[1].split("li class=\"play_category__tab-list-item");
                   var tab = null;
                   var newTab;
                   var recommendedLinks = [];
                   categoryDetail.tabs = [];
                   // Create/Update TABs list
                   // Add also "latest list" to tabs
                   if (data[0].match(/section class=[^>]+play_category__latest-list/)) {
                       categoryDetail.tabs.push(
                           {
                               name: $($(data[0]).find("h1.play_videolist-section-header__header")[0]).text().trim(),
                               key: 'special-list',
                               href: url
                           }
                       );
                   }
                   // Tabs
                   for (var i=1; i<tabs.length; i++) {
                       var tab = "li class=\"play_category__tab-list-item" + tabs[i].split("</li>")[0] + "</li>";
                       newTab = {
                           name: $(tab).text().trim(),
                           key: $(tab).attr('aria-controls'),
                           href: fixLink($(tab).attr('href'))
                       };
                       if (newTab.key === "playJs-alphabetic-list")
                           categoryDetail.tabs.unshift(newTab);
                       else
                           categoryDetail.tabs.push(newTab);
                   }
                   if (url != categoryDetail.tabs[categoryDetail.tab_index].href) {
                       if (categoryDetail.tab_index != 0) {
                           // This is old data - we're out of sync - update
                           return categoryDetail.loadXml(categoryDetail.tabs[categoryDetail.tab_index].href);
                       } else if ($(tabs[1]).attr('aria-controls') != "playJs-alphabetic-list") {
                           // Default isn't A-Ö -> shows are missing
                           return categoryDetail.loadXml(categoryDetail.tabs[0].href);
                       }
                   }
                   categoryDetail.fixBButton();
                   itemCounter = 0;
                   if (categoryDetail.tabs[categoryDetail.tab_index].key == "special-list") {
                       
                       data = data[0].split(" play_category__latest-list")[1];
                       Section.decode_data(data);
                   } else {
                       // Add recommended to popular
                       if (categoryDetail.tabs[categoryDetail.tab_index].key == "playJs-popular-videos" &&
                           data[0].match(/section id=\"recommended-videos/)) {
                           recommendedLinks = Section.decode_recommended(data[0]);
                       }
                       data = data[1].split("div id=\"" + categoryDetail.tabs[categoryDetail.tab_index].key)[1];
                       data = data.split("role=\"tabpanel")[1];
                       // Log("articles:"+ data.length);
                       if (categoryDetail.tab_index == 0)
                           categoryDetail.decode_data(data);
                       else
                           Section.decode_data(data, recommendedLinks);
                   }
                   Log("itemCounter:" + itemCounter);
                   restorePosition();
               }
              );
};


categoryDetail.decode_data = function (categoryData) {

    try {
        var html;
        var Name;
        var Link;
        var ImgLink;

        categoryData = categoryData.split("</article>");
        categoryData.pop();

        for (var k=0; k < categoryData.length; k++) {
            categoryData[k] = "<article" + categoryData[k].split("<article")[1];
            Name = categoryData[k].match(/data-title="([^"]+)"/)[1];
            Link = fixLink(categoryData[k].match(/href="([^"]+)"/)[1]);
            // Log(Link);
            ImgLink = categoryData[k].match(/data-imagename="([^"]+)"/);
            if (!ImgLink) {
                ImgLink = categoryData[k].match(/src="([^"]+)"/)[1];
            } else {
                ImgLink = ImgLink[1];
            }
            ImgLink = fixLink(ImgLink);
            categoryData[k] = "";

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
	    html += '<div class="scroll-item-img">';
	    html += '<a href="showList.html?name=' + Link + '&history=' + document.title + encodeURIComponent(Name) + '/" class="ilink"><img src="' + ImgLink + '" width="240" height="135" alt="' + Name + '" /></a>';
	    html += '</div>';
	    html += '<div class="scroll-item-name">';
	    html +=	'<p><a href="#">' + Name + '</a></p>';
	    //html += '<span class="item-date">' + Description + '</span>';
	    html += '</div>';
	    html += '</div>';
	    if(itemCounter % 2 == 0){
		$('#topRow').append($(html));
	    }
	    else{
		$('#bottomRow').append($(html));
	    }
	    itemCounter++;
        }
    } catch(err) {
        Log("decode_data Exception:" + err.message + " data[" + k + "]:" + categoryData[k]);
    }
};

categoryDetail.fixBButton = function()
{
    if ((categoryDetail.tab_index+1) >= categoryDetail.tabs.length)
        Language.fixBButton();
    else
        $("#b-button").text(this.getCategoryName() + '-' + this.getNextName());
};
//window.location = 'showList.html?name=' + ilink + '&history=' + historyPath + iname + '/';
