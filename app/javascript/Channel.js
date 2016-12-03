var Channel =
{
    impl:Svt
};

Channel.set = function(newChannel) {
    if (newChannel == "svt") {
        newChannel = Svt
    } else if (newChannel == "viasat") {
        newChannel = Viasat
    } else if (newChannel == "tv4") {
        newChannel = Tv4
    } else if (newChannel == "dplay") {
        newChannel = Dplay
    }
    this.impl = newChannel
}

Channel.getHeaderPrefix = function() {
    return this.impl.getHeaderPrefix()
}

Channel.getHeaders = function() {
    if (this.impl.getHeaders)
        return this.impl.getHeaders()
    else
        return null
}

Channel.getDetailsUrl = function(name) {
    return this.impl.getDetailsUrl(name)
}

Channel.getDetailsData = function(url, data) {
    return this.impl.getDetailsData(url, data)
}

Channel.getPlayUrl = function(url, isLive) {
    this.impl.getPlayUrl(url, isLive)
}

Channel.refreshPlayUrl = function(cbComplete) {
    if (this.impl.refreshPlayUrl)
        this.impl.refreshPlayUrl(cbComplete);
    else
        cbComplete()
}

Channel.fetchSubtitles = function(srtUrl, hlsSubs) {
    if (srtUrl && srtUrl != "") {
        if (this.impl.fetchSubtitles)
            this.impl.fetchSubtitles(srtUrl, hlsSubs)
        else
            Player.fetchSubtitles(srtUrl, hlsSubs)
    } else if (hlsSubs)
        Player.fetchHlsSubtitles(hlsSubs)
}

Channel.keyRed = function() {
    if (this.impl.keyRed)
        this.impl.keyRed()
    else
        setLocation('index.html');
}

Channel.keyGreen = function() {
    if (this.impl.keyGreen)
        this.impl.keyGreen()
    else
        setLocation('categories.html');
}

Channel.getAButtonText = function(language) {
    var text = null;

    if (this.impl.getAButtonText)
        text =  this.impl.getAButtonText(language)

    if (text == null) {
        if(language == 'English'){
	    return 'Popular';
        } else {
	    return 'Populärt';
        }
    }
    return text;
}

Channel.getBButtonText = function(language)
{
    var text = null;
    if (this.impl.getBButtonText)
        text = this.impl.getBButtonText(language)

    if (text == null) {
        if(language == 'English')
            return 'Categories';
        else
            return 'Kategorier';
    } else if (text == 0)
        // keep text
        return $("#b-button").text()
    return text;
};

Channel.getCButtonText = function(language) {
    if (this.impl.getCButtonText)
        return this.impl.getCButtonText(language)

    if(language == 'English')
	return 'Channels & live broadcasts';
    else
        return 'Kanaler & livesändningar';
}
