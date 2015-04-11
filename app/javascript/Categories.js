var Categories =
{

};

Categories.onLoad = function()
{
	Header.display('Kategorier');
	this.loadXml();
};

Categories.onUnload = function()
{

};


Categories.loadXml = function(){
    $.support.cors = true;
    $.ajax(
        {
            type: 'GET',
            url: 'http://www.svtplay.se/program',
            tryCount : 0,
            retryLimit : 3,
	    timeout: 15000,
            success: function(data, status, xhr)
            {
                var html;
                Log('Success:' + this.url);
                // Log("xhr.responseText:"+ xhr.responseText.length);
                // Log("xhr.responseText:"+ xhr.responseText.split("<section class=\"play_alphabetic-group")[1].length);
                data = xhr.responseText.split("<section class=\"play_alphabetic-group")[1];
                xhr.destroy();
                xhr = null;
                
                $(data).find('a').filter(function() {
                    return $(this).attr('class') == "play_category-grid__link";
                }).each(function(){
                    var $video = $(this); 
                    var Name = $($video.find('span')[0]).text().trim();
		    var Link = "http://www.svtplay.se"+$video.attr('href');
		    //Log(Link);
		    //var Description = $video.find('Description').text();
	            var ImgLink  = $video.find('img').attr('data-imagename');
                    if (!ImgLink) ImgLink = $video.find('img').attr('src');
                    if (ImgLink.match(/^\/\//))
                        ImgLink = "http:"+ImgLink;
                    else
		        ImgLink  = "http://www.svtplay.se"+ImgLink;
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
		    html += '<a href="categoryDetail.html?category=' + Link + '&history=Kategorier/' + Name +'/" class="ilink"><img src="' + ImgLink + '" width="240" height="135" alt="' + Name + '" /></a>';
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
	            $tmpData = $video = html = null;
		    itemCounter++;
		    //
                });
                data = null;
                restorePosition();
            },
            error: function(XMLHttpRequest, textStatus, errorThrown)
            {
          	if (textStatus == 'timeout') {
                    this.tryCount++;
                    if (this.tryCount <= this.retryLimit) {
                        //try again
                        $.ajax(this);
                        return;
                    }            
                    return;
                }
        	else{
        	    Log('Failure');
        	    ConnectionError.show();
        	}
                
            }
        });

};
//window.location = 'categoryDetail.html?category=' + ilink + '&history=Kategorier/' + iname +'/';


