var Section =
{
    loaded: false
};

Section.onLoad = function(location, refresh)
{
    var locationUrl;
    switch (location)
    {
    case "LastChance.html":
        document.title = 'Sista Chansen'
        locationUrl    = 'http://www.svtplay.se/sista-chansen?sida=1'
        break;

    case "Latest.html":
        document.title = 'Senaste'
        locationUrl    = 'http://www.svtplay.se/senaste?sida=1'
        break

    case "LatestNews.html":
        document.title = 'Senaste Nyheter'
        locationUrl    = 'http://www.svtplay.se/nyheter?sida=1'
        break
    }

    if (!refresh) {
	Header.display(document.title);
    }
    if (!detailsOnTop) {
	this.loadXml(locationUrl, refresh);	
    }
};

Section.loadXml = function(locationUrl, refresh){

    requestUrl(locationUrl,
               function(status, data)
               {
                   if (locationUrl.indexOf("nyheter") != -1) {
                       data = data.responseText.split("<section class=\"play_js-tabs")[0];
                       data = "<section class" + data.split("<section class")[1];
                   } else {
                       data = data.responseText.split("div id=\"gridpage-content")[1];
                   }
                   Section.decode_data(data);
                   Log("itemCounter:" + itemCounter);
                   restorePosition();
               }
              );
};

Section.decode_recommended = function(data) {
    try {
        var html;
        var Titles;
        var Name;
        var Link;
        var Description;
        var Duration;
        var ImgLink;
        var starttime;
        recommendedLinks = [];
        data = data.split("</article>");
        data.pop();

        for (var k=0; k < data.length; k++) {
            data[k] = "<article" + data[k].split("<article")[1];
	    Titles = $(data[k]).find('span.play_carousel-caption__title-inner');
            var i = 0;
            Name = "";
            while (i < Titles.length) {
                Name = Name + " " + $(Titles[i]).text().trim();
                Name.trim();
                i = i+1;
            }
            Name = Name.replace(/Live just nu /, "").trim();
            Link = fixLink(data[k].match(/href="([^#][^#"]+)"/)[1]);
            Description = $(data[k]).find('span.play_carousel-caption__description').text();
	    ImgLink = fixLink($(data[k]).find('img').attr('data-imagename')).replace("_imax", "");
            ImgLink = ImgLink.replace("extralarge", "small");
	    if(Description.length > 55){
		Description = Description.substring(0, 52)+ "...";
	    }
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
            if (Link.indexOf("/video/") != -1 ) {
                recommendedLinks.push(Link.replace(/.+\/video\/([0-9]+).*/, "$1"));
	        html += '<a href="details.html?ilink=' + Link + '&history=' + document.title.replace(/\/$/,"") + '/' + encodeURIComponent(Name) +'/" class="ilink" data-length="' + Duration + '"><img src="' + ImgLink + '" width="240" height="135" alt="'+ Name + '" /></a>';
            } else
	        html += '<a href="showList.html?name=' + Link + '&history=' + document.title.replace(/\/$/,"") + '/' + encodeURIComponent(Name) + '/" class="ilink"><img src="' + ImgLink + '" width="240" height="135" alt="' + Name + '" /></a>';
            if (data[k].match(/play_graphics-live-top--visible/)) {
		html += '<span class="topoverlayred">LIVE</span>';
		// html += '<span class="bottomoverlayred">' + starttime + ' - ' + endtime + '</span>';
		html += '<span class="bottomoverlayred"></span>';
	    }
            data[k] = "";
	    html += '</div>';
	    html += '<div class="scroll-item-name">';
	    html +=	'<p><a href="#">' + Name + '</a></p>';
	    html += '<span class="item-date">' + Description + '</span>';
	    html += '</div>';
	    html += '</div>';
	    if(itemCounter % 2 == 0){
		$('#topRow').append($(html));
	    }
	    else{
		$('#bottomRow').append($(html));
	    }
	    html = null;
	    itemCounter++;
	}
        return recommendedLinks;
    } catch(err) {
        Log("decode_data Exception:" + err.message + " data[" + k + "]:" + data[k]);
    }
};

Section.decode_data = function(data, filter) {
    try {
        var html;
        var Name;
        var Duration;
        var IsLive;
        var IsLiveText;
        var running;
        var starttime;
        var Link;
        var LinkPrefx;
        var Description;
        var ImgLink;

        data = data.split("</article>");
        data.pop();

        for (var k=0; k < data.length; k++) {
            if (data[k].search(/data-broadcastended=\"true\"/i) > -1)
                // Show already ended
                continue;
            Name = data[k].match(/data-title="([^"]+)"/)[1].trim();
            Duration = data[k].match(/data-length="([^"]+)"/);
            Description = data[k].match(/data-description="([^"]+)"/);
            Link = fixLink(data[k].match(/href="([^#][^#"]+)"/)[1]);
            if (filter && filter.indexOf(Link.replace(/.+\/video\/([0-9]+).*/, "$1")) != -1)
                continue;
            ImgLink = data[k].match(/data-imagename="([^"]+)"/);
            IsLive = data[k].search(/svt_icon--live/) > -1;
            running = data[k].search(/play_graphics-live--inactive/) == -1;
            starttime = data[k].match(/alt="([^"]+)"/);
            Description = (!Description) ? "" : Description[1].trim();
            ImgLink = (!ImgLink) ? data[k].match(/src="([^"]+)"/)[1] : ImgLink[1];
            ImgLink = fixLink(ImgLink);
            starttime = (IsLive) ? starttime[1].replace(/([^:]+):.+/, "$1") : "";
            data[k] = "";
	    if (Description.length > 55){
		Description = Description.substring(0, 52)+ "...";
	    }
            LinkPrefx = '<a href="showList.html?name=';
            if (Link.search("/klipp/") != -1 || Link.search("/video/") != -1) {
                Duration = Duration[1];
                LinkPrefx = '<a href="details.html?ilink=';
            }
            else {
                Duration = 0;
            }
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

            IsLiveText = (IsLive) ? " is-live" : "";
	    html += '<div class="scroll-item-img">';
	    html += LinkPrefx + Link + '&history=' + document.title.replace(/\/$/,"") + '/' + encodeURIComponent(Name) + '/" class="ilink" data-length="' + Duration + '"' + IsLiveText + '><img src="' + ImgLink + '" width="240" height="135" alt="' + Name + '" /></a>';

	    if (IsLive && !running) {
		html += '<span class="topoverlay">LIVE</span>';
		// html += '<span class="bottomoverlay">' + starttime + ' - ' + endtime + '</span>';
		html += '<span class="bottomoverlay">' + starttime + '</span>';
	    }
	    else if (IsLive){
		html += '<span class="topoverlayred">LIVE</span>';
		// html += '<span class="bottomoverlayred">' + starttime + ' - ' + endtime + '</span>';
		html += '<span class="bottomoverlayred">' + starttime + '</span>';
	    }
	    html += '</div>';
	    html += '<div class="scroll-item-name">';
	    html +=	'<p><a href="#">' + Name + '</a></p>';
	    html += '<span class="item-date">' + Description + '</span>';
	    html += '</div>';
	    html += '</div>';
	    
	    if(itemCounter % 2 == 0){
		$('#topRow').append($(html));
	    }
	    else{
		$('#bottomRow').append($(html));
	    }
	    html = null;
	    itemCounter++;
	}
    } catch(err) {
        Log("Section.decode_data Exception:" + err.message + " data[" + k + "]:" + data[k]);
    }
};