var LastChance =
{
    loaded: false
};

LastChance.onLoad = function(refresh)
{
    document.title = 'Sista Chansen'
    if (!refresh) {
	Header.display(document.title);
    }
    if (!detailsOnTop) {
	this.loadXml(refresh);	
    }
};

LastChance.loadXml = function(refresh){

    requestUrl('http://www.svtplay.se/sista-chansen?sida=1',
               function(status, data)
               {
                   data = data.responseText.split("div id=\"gridpage-content")[1];
                   data = data.split("</article>");
                   data.pop();
                   LastChance.decode_data(data);
                   Log("itemCounter:" + itemCounter);
                   restorePosition();
               }
              );
};

LastChance.decode_data = function(data) {
    try {
        var html; 
        var Name;
        var Link;
        var Description;
        var Duration;
        var ImgLink;
        var starttime;
        for (var k=0; k < data.length; k++) {
            Name = data[k].match(/data-title="([^"]+)"/)[1];
            Duration = data[k].match(/data-length="([^"]+)"/)[1];
            Link = fixLink(data[k].match(/href="([^#][^#"]+)"/)[1]);
            Description = data[k].match(/data-description="([^"]+)"/);
            Description = (!Description) ? "" : Description[1];
            ImgLink = fixLink(data[k].match(/data-imagename="([^"]+)"/)[1]);
            data[k] = "";

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
	    html += '<a href="details.html?ilink=' + Link + '&history=' + document.title + '/' + Name +'/" class="ilink" data-length="' + Duration + '"><img src="' + ImgLink + '" width="240" height="135" alt="'+ Name + '" /></a>';
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
        Log("LastChance decode_data Exception:" + err.message + " data[" + k + "]:" + data[k]);
    }
};