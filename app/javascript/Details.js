var currentTime = 0;
var countd=0;
var downCounter;

var Details = {
    duration:null,
    isLive:false,
    startTime:0,
    fetchedDetails:null
};

Details.init = function() {
    Details.isLive = false;
    Details.duration = null;
    Details.startTime = 0;
};

Details.onLoad = function() {
    $('.slider-body').hide();
    $('.content').show();
    Buttons.setKeyHandleID(1);
    Details.refresh(false);
};

Details.onUnload = function() {
	Player.deinit();
};

Details.refresh = function (isBackground) {
    Details.init();
    Header.display('');
    PathHistory.GetPath();
    this.loadXml(isBackground);
};

Details.getUrl=function(detailsUrl){
    var url;
    if (!detailsUrl)
        url = myLocation;
    else
        url = detailsUrl;
    var parse;
    var name=url;
    if (url.match(/category=/)) {
        name = url.match(/category=(.+)&catThumb=/)[1];
    }
    else if (url.match(/[?&](ilink|name)=/)) {
        name = url.match(/[?&](ilink|name)=(.+)&history=/)[2];
    }
    checkSetTmpChannel(url);
    return Channel.getDetailsUrl(name);
};

Details.loadXml = function(isBackground) {
    $('#projdetails').html('');
    if (myLocation.match(/categoryDetail\.html/)) {
        var catThumb = myLocation.match(/catThumb=([^&]+)/);
        if (catThumb) catThumb = catThumb[1];
        Details.toHtml({category    : true,
                        link        : this.getUrl(),
                        description : '',
                        name        : decodeURIComponent(myLocation.match(/catName=([^&]+)/)[1]),
                        thumb       : decodeURIComponent(catThumb)
                       });
        window.setTimeout(loadingStop, 0);
        return;
    }
    var url = this.getUrl();
    requestUrl(url,
               function(status, data) {
                   var html;
                   var programData = Details.getData(url, data);
                   Details.fetchedDetails = programData;
                   if (!isBackground) {
		       Language.setDetailLang();
                       Player.setNowPlaying(programData.name);
                       loadingStop();
                   }
                   Details.toHtml(programData);
               },
               {cbError:function(textStatus, data, errorThrown) {
                   if (!isBackground) {
                       loadingStop();
                   }},
                headers:Channel.getHeaders(),
                no_cache:Details.noCache()
               }
              );
};

Details.toHtml = function (programData) {
    loadImage(programData.thumb, function() {
        var extra = null;
	var html = '<h1>'+programData.name+'</h1>';
        if (programData.show) {
	    html+='<div class="project-meta"><a id="genre" type="text"></a><a>'+programData.genre+'</a></div>';
        } else if (!programData.category) {
            // Ignore extra if inside show/category
            if (getOldLocation() && !getOldLocation().match(/showList\.html/) &&
                programData.parent_show && !programData.parent_show.is_category) {
                extra = {loc: makeShowLink(programData.parent_show.name,
                                           programData.parent_show.url
                                          ),
                         name: 'Till Programmet'
                        };
            } else if (getOldLocation() && !getOldLocation().match(/categoryDetail\.html/) &&
                       !getOldLocation().match(/showList\.html/) && programData.parent_show &&
                       programData.parent_show.is_category) {
                extra = {loc: makeCategoryLink(programData.parent_show.name,
                                               programData.parent_show.large_thumb,
                                               programData.parent_show.url
                                              ),
                         name: 'Till Kategorin'
                        };
            }
            if (programData.air_date)
	        html+='<div class="project-meta border"><a id="aired" type="text">Sändes: </a><a>'+dateToHuman(programData.air_date)+'</a></div>';
            if (programData.avail_date)
		html+='<div class="project-meta border"><a id="available" type="text">Tillgänglig till: </a><a>'+dateToHuman(programData.avail_date)+'</a></div>';
            if (programData.duration)
		html+='<div class="project-meta"><a id="duration" type="text">Längd: </a><a>'+programData.duration+'</a></div>';
            else 
                html+='<div class="project-meta"><a id="duration" type="text"></a><a>'+programData.duration+'</a></div>';
        }
	html+='<div class="project-desc">'+programData.description+'</div>';
	html+='</div>';
	html+='<div class="bottom-buttons">';
        if (programData.category) {
            html+='<a href="#" id="enterShowButton" class="link-button selected">Till Kategorin</a>';
        }
        else if (programData.show) {
            var title = getUrlParam(myLocation,'title') || 'Programmet';
            html+='<a href="#" id="enterShowButton" class="link-button selected">Till ' + title + '</a>';
        } else if (programData.not_available) {
            html+='<a href="#" id="notStartedButton" class="link-button">Ej Startat</a>';
        } else {
            html+='<a href="#" id="playButton" class="link-button selected">Spela upp</a>';
        }
        if (extra) {
            html+=extra.loc+'" id="extraButton" class="link-button';
            if (programData.not_available)
                html+=' selected';
            html+='" style="margin-top:6px;">'+extra.name+'</a>';
        }
        html+=' </div>';
	html+=' </div>';

        html+='</div>';
        html+='<div class="detailsImgContainer"><img class="image" src="'+programData.thumb+'" alt="Image" /></div>';
        // Add 'header' elements last to determine max-height
        var max_height = (extra) ? '678px' : '743px';
        html='<div class="project-meta-frame" style="max-height:' +max_height+';overflow:hidden">'+html;
	html = '<div class="project-name">' + html;
        html = '<div class="project-text">' + html;
        $('#projdetails').html(html);
	html = null;
        if (!detailsOnTop)
            fetchPriorLocation();
    }, 1000);
};

Details.noCache = function() {
   return itemSelected &&
        (itemSelected.find('.ilink').attr('is-live') != null ||
         itemSelected.find('.ilink').attr('not-yet-available') != null);
};

Details.fetchData = function(detailsUrl, refresh) {
    Details.init();
    if (!refresh)
        Details.fetchedDetails = null;
    detailsUrl = this.getUrl(detailsUrl);
    httpRequest(detailsUrl,
                {cb: function(status, data) {
                    Details.fetchedDetails = Details.getData(detailsUrl,{responseText:data});
                },
                 headers:Channel.getHeaders(),
                 no_cache:Details.noCache()
                });
};

Details.getData = function(url, data) {
    data = Channel.getDetailsData(url,data);

    if (data.description && data.description.length > 0)
        data.description = data.description.replace(/\\\"/g, '"');
    if (!data.show) {
        data.start_time   = dateToClock(data.start_time);
        Details.duration  = data.duration;
        Details.isLive    = data.is_live;
        Details.startTime = data.start_time;
    }
    return data;
};

Details.startPlayer = function() {
    Player.setDuration(Details.duration);
    // Log('isLive:' + isLive + ' startTime:' + Details.startTime);
    Player.startPlayer(this.getUrl(), Details.isLive, this.startTime);
};

function dataLengthToVideoLength($video, duration) {
    var VideoLength = '';
    if (!duration && $video) {
        duration = $video.find('a').attr('data-length');
    }
    if (!duration)
        return VideoLength;

    var hours = Math.floor(duration/3600);
    if (hours > 0) {
        VideoLength = hours + ' h ';
        duration = duration - (hours*3600);
    }
    var minutes = Math.floor(duration/60);
    if (minutes > 0) {
        VideoLength = VideoLength + minutes + ' min ';
        duration = duration - (minutes*60);
    }
    var seconds = Math.round(duration - (hours*3600) - (minutes*60));
    if (seconds > 0) {
        VideoLength = VideoLength + seconds + ' sek';
    }
    return VideoLength;
}
