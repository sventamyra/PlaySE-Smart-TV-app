var Categories =
{

};

Categories.onLoad = function(refresh)
{
    if (!refresh)
	Header.display('Kategorier');
    if (!detailsOnTop)
	this.loadXml(refresh);
};

Categories.onUnload = function()
{

};


Categories.loadXml = function(refresh) {
    requestUrl('http://www.svtplay.se/program',
               function(status, data)
               {
                   var html;
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
		       html += '<a href="categoryDetail.html?category=' + Link + '&history=Kategorier/' + encodeURIComponent(Name) +'/" class="ilink"><img src="' + ImgLink + '" width="240" height="135" alt="' + Name + '" /></a>';
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
               });

};
//window.location = 'categoryDetail.html?category=' + ilink + '&history=Kategorier/' + iname +'/';


