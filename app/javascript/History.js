var History =
{
};

History.savePosition = function(pos) {
    var tmp_channel = itemSelected && itemSelected.find(".ilink").attr("href").match(/tmp_channel_id=([^&]+)/);
    if (tmp_channel) {
        pos.name       = itemSelected.text();
        pos.channel_id = tmp_channel[1];
        alert("savePosition:" + JSON.stringify(pos))
    }
    return pos
}

History.checkPosition = function(pos) {
    if (pos.name) {
        if (itemSelected.text() != pos.name ||
            !itemSelected.find(".ilink").attr("href").match("tmp_channel_id=" + pos.channel_id)) {
            if (htmlSection) {
                htmlSection = getInitialSection();
                loadSection()
            }
            return {col:0, top:true, section:htmlSection}
        }
    }
    return pos
}

History.checkResume = function(location) {
    var show = location.match(/[?&]show_name=([^&]+)/);
    if (show) {
        show = decodeURIComponent(show[1])
        var meta = History.lookup(show);
        if (!location.match(/[?&]season=/) && meta.season)
            return History.findSeason(show, meta);
        else if (!location.match(/[?&]variant=/) && meta.variant)
            return History.findVariant(show, meta);
        else
            return History.findEpisode(show, meta);
            alert("Resuming episode (and season and name?):" + meta.episode)
    }
    return false
}

History.findSeason = function(show, meta) {
    alert("Resume Season " + meta.season);
    return History.findLinkPrefix(show, new RegExp("[?&]season=" + meta.season + "(&.+)?$"));
};

History.findVariant = function(show, meta) {
    alert("Resume Variant " + meta.variant + " season:" + meta.season);
    return History.findLinkPrefix(show, new RegExp("[?&]variant=" + meta.variant + "(&.+)?$"));
}

History.findLinkPrefix = function(show, regexp) {
    for (var i=0; i < items.length; i++) {
        if (items[i].link_prefix.match(regexp)) {
            var link = itemToLink(items[i], "show_name=" + encodeURIComponent(show)) + '"/>';
            window.setTimeout(function() {
                selectItemIndex(i);
                setLocation($(link).attr("href"));
                alert("Resumed " + regexp)
            }, 0);
            return true
        }
    }
    return false
};

History.findEpisode = function(show, meta) {
    alert("Resume Episode " + meta.episode + " season " + meta.season + " name " + meta.episode_name)
    var hits = []
    for (var i=0; meta.episode && i < items.length; i++) {
        if ((!meta.season || meta.season == items[i].season) &&
            meta.episode == items[i].episode) {
            hits.push(i)
        }
    }
    if (hits.length > 1) {
        var name_hits = [];
        for (var i=0; meta.episode_name && i < hits.length; i++) {
            if (items[hits[i]].name == meta.episode_name)
                name_hits.push(hits[i])
        }
        hits = name_hits;
    }
    else if (hits.length == 0) {
        for (var i=0; meta.episode_name && i < items.length; i++) {
            if (items[i].name == meta.episode_name)
                hits.push(i)
        }
    }
    if (hits.length == 1) {
        selectItemIndex(hits[0])
        myPos = Channel.savePosition({col     : columnCounter,
                                      top     : isTopRowSelected,
                                      section : htmlSection
                                     })
        alert("Resumed episode " + meta.episode)
    }
    return false
};

History.getHeaderPrefix = function(MainName) {
    return "";
}

History.getStartPage = function() {
    return "index.html?tmp_channel_clr=1&pos_by_item=1";
}

History.getUrl = function(tag, extra) {
    return History.getStartPage();
}

History.decodeMain = function(data, extra) {
    Shows = Config.read("History")
    for (var i=0; Shows && i < Shows.length; i++) {
        showToHtml(
            Shows[i].name,
            Shows[i].thumb,
            Shows[i].url,
            makeShowLinkPrefix("show_name=" + encodeURIComponent(Shows[i].name) + 
                               "&tmp_channel_id=" + Shows[i].channel_id)
        )
    }
    if (extra.cbComplete)
        extra.cbComplete();
}

History.keyRed = function() {
    return;
}

History.keyGreen = function() {
    return;
};

History.keyYellow = function() {
    return;
}

History.keyBlue = function() {
    var showName = myLocation.match(/[?&]show_name=([^&]+)/);
    var channelId = Channel.id();
    if (!showName && itemSelected) {
        showName = itemSelected.find(".ilink").attr("href").match(/[?&]show_name=([^&]+)/);
        channelId = itemSelected.find(".ilink").attr("href").match(/tmp_channel_id=([^&]+)/);
        if (channelId)
            channelId = channelId[1]
    }
    if (showName) {
        History.removeShow(decodeURIComponent(showName[1]), channelId)
        initChannel()
    }
};

History.getMainTitle = function() {
    return "Historik";
}

History.getAButtonText = function(language) {
    return "";
}

History.getBButtonText = function(language)
{
    return "";
};

History.getCButtonText = function(language) {
    return "";
}

History.getDButtonText = function(language) {
    if(language == 'English')
	return 'Remove';
    else
        return 'Ta bort';
}

History.addShow = function(details) {
    if (!details.parent_show)
        return
    var savedShows = History.removeShow(details.parent_show.name, Channel.id(), true);
    if (!savedShows)
        savedShows = []
    savedShows.unshift({channel_id   : Channel.id(), 
                        name         : details.parent_show.name,
                        thumb        : details.parent_show.thumb,
                        url          : details.parent_show.url,
                        season       : details.season,
                        variant      : details.variant,
                        episode      : details.episode,
                        episode_name : details.episode_name
                       })
    Config.save("History", savedShows.slice(0,30))
}

History.removeShow = function(showName, channelId, noSave) {

    var savedShows = Config.read("History")
    if (savedShows) {
        for (var i=0; i < savedShows.length; i++) {
            if (savedShows[i].channel_id == channelId &&
                savedShows[i].name == showName) {
                savedShows.splice(i, 1)
                break
            }
        }
    }
    if (noSave)
        return savedShows
    else
        Config.save("History", savedShows)
}

History.lookup = function(showName) {

    var savedShows = Config.read("History")
    if (savedShows) {
        for (var i=0; i < savedShows.length; i++) {
            if (savedShows[i].channel_id == Channel.id() &&
                savedShows[i].name == showName)
                return savedShows[i]
        }
    }
    return null
};

