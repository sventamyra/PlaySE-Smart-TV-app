var Channel =
{
    impl:null
};

Channel.init = function() {
    if (!Channel.impl)
        Channel.impl = Svt;
};

Channel.set = function(newChannel) {
    if (this.impl != newChannel || Channel.isSubChannelSet()) {
        this.impl = newChannel;
        Channel.resetSubChannel()
        return true;
    } else {
        return false;
    }
}

Channel.isSubChannelSet = function() {
    if (this.impl.isSubChannelSet)
        return this.impl.isSubChannelSet()
    return false
}

Channel.resetSubChannel = function() {
    if (this.impl.resetSubChannel)
        this.impl.resetSubChannel()
}

Channel.getName = function() {
    return this.getHeaderPrefix(true).toLowerCase()
}

Channel.getHeaderPrefix = function(MainName) {
    return this.impl.getHeaderPrefix(MainName)
}

Channel.getHeaders = function() {
    if (this.impl.getHeaders)
        return this.impl.getHeaders()
    else
        return null
}

Channel.getUrl = function(tag, extra) {
    return this.impl.getUrl(tag, extra);
}

Channel.login = function(callback) {
    if (this.impl.login)
        this.impl.login(callback);
    else
        callback()
}

Channel.isLoggedIn = function() {
    if (this.impl.isLoggedIn)
        return this.impl.isLoggedIn();
    else
        return true;
}

Channel.decodeMain = function(data, extra) {
    this.impl.decodeMain(data, extra);
}

Channel.decodeSection = function(data, extra) {
    this.impl.decodeSection(data, extra);
}

Channel.decodeCategories = function(data, extra) {
    this.impl.decodeCategories(data, extra);
}

Channel.decodeCategoryDetail = function(data, extra) {
    this.impl.decodeCategoryDetail(data, extra);
}

Channel.decodeLive = function(data, extra) {
    this.impl.decodeLive(data, extra);
}

Channel.decodeShowList = function(data, extra) {
    this.impl.decodeShowList(data, extra);
}

Channel.decodeSearchList = function(data, extra) {
    this.impl.decodeSearchList(data, extra);
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
    if (Channel.isLoggedIn()) {
        if (this.impl.keyRed)
            this.impl.keyRed()
        else
            setLocation('index.html');
    }
}

Channel.keyGreen = function() {
    if (Channel.isLoggedIn()) {
        if (this.impl.keyGreen)
            this.impl.keyGreen()
        else
            setLocation('categories.html');
    }
};

Channel.keyYellow = function() {
    if (Channel.isLoggedIn()) {
        if (this.impl.keyYellow)
            this.impl.keyYellow()
        else
            setLocation('live.html');
    }
}

Channel.keyBlue = function() {
    if (Channel.isLoggedIn()) {
        if (this.impl.keyBlue)
            this.impl.keyBlue()
        else {
            Language.hide();
            Search.imeShow()
        };
    }
};

Channel.getMainTitle = function() {
    if (this.impl.getMainTitle)
        return this.impl.getMainTitle();
    else
        return "Populärt";
}

Channel.getSectionTitle = function(location) {
    if (this.impl.getSectionTitle)
        return this.impl.getSectionTitle(location);
    else
        return document.title;
}

Channel.getCategoryTitle = function()
{
    if (this.impl.getCategoryTitle)
        return this.impl.getCategoryTitle();
    else
        return "Kategorier";
};

// TODO  - is very similar to button text - re-use?
Channel.getLiveTitle = function() {
    if (this.impl.getLiveTitle)
        return this.impl.getLiveTitle();
    else
        return 'Kanaler & livesändningar';
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

    if (text === null) {
        if(language == 'English')
            return 'Categories';
        else
            return 'Kategorier';
    } else if (text === 0)
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
