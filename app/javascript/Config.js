var Config = {
    data     : null,
    fileName : curWidget.id + "_config.db",
    version  : 3
};

Config.init = function() {
    if (this.data)
        // Already done
        return
    this.data = {items:{}};
    // Save storage
    this.data.saveFile = function() {
	if (typeof JSON == 'object') {
	    // var $this = this.id;
            var fileSysObj = new FileSystem();
	    var fileObj = fileSysObj.openCommonFile(Config.fileName, "w");
	    fileObj.writeAll(JSON.stringify(this.items));
	    fileSysObj.closeCommonFile(fileObj);
	};
    };

    this.data.saveItem = function(key, value) {
	this.items[key] = value;
	this.saveFile(true);
	return this.items[key];
    };

    this.data.getItem = function(key) {
	return this.items[key];
    };

    this.data.deleteItem = function(key) {
        delete this.items[key];
	this.saveFile(true);
        return null;
    };

    this.data.deleteAll = function() {
        var fileSysObj = new FileSystem();
	var fileObj = fileSysObj.openCommonFile(Config.fileName, "w");
	fileObj.writeAll("{}");
        fileSysObj.closeCommonFile(fileObj);
        Config.initData();
    };

    this.initData = function() {
        this.data.items = {};
        var fileSysObj = new FileSystem();
        var fileObj = fileSysObj.openCommonFile(this.fileName, "r+");
        if (fileObj !== null) {
	    try {
	        this.data.items = JSON.parse(fileObj.readAll());
                // Log("Found config data:" + JSON.stringify(this.data.items));
	    } catch(err) {
                Log("Failed to read config:" + err);
	    }
        } else {
	    fileObj = fileSysObj.openCommonFile(this.fileName, "w");
	    fileObj.writeAll("{}");
        }
        fileSysObj.closeCommonFile(fileObj);
    };

    this.upgrade = function() {
        var old_version = this.read("version");
        if (!old_version || old_version < this.version) {
            Log("Upgrade from version:" + old_version);
            if (!old_version || old_version == 1) {
                var cookies = ['language','res','liveres','subEnabled','subSize','subPos','subHeight','subBack'];
                if (old_version == 1)
                    // A mistake was done in version 1
                    cookies = ['res','liveres'];
                for (var i=0; i < cookies.length; i++)
                    cookieToConfig(cookies[i]);
                deleteAllCookies();
            }
            if (!old_version || old_version < 3) {
                var liveres = Config.read("liveres");
                if (liveres != null)
                    Config.save("liveres", +liveres+1);
                if (+Config.read("liveres") == 5)
                    Config.save("liveres", 6)
                if (+Config.read("res") == 5)
                    Config.save("res", 6)
            }
        } else if (old_version == this.version) {
            Log("Same version " + old_version);
        } else if (old_version > this.version) {
            Log("Downgrade from " + old_version);
            this.data.deleteAll();
        }
        this.save("version", this.version);
    }

    this.test = function() {
        try {
            if (!this.read("version")) {
                throw "Configuration not supported";
            }
	} catch(err) {
            Log("Failed to test config:" + err);
            throw "Configuration test failed";
	}
    };

    // This was meaningless since file isn't placed in the dir...
    // var fileSysObj = new FileSystem();
    // var commonDir = fileSysObj.isValidCommonPath(curWidget.id);
    // if(!commonDir) {
    //     fileSysObj.createCommonDir(curWidget.id);
    // }
    this.initData();
    this.upgrade();
    this.test();
};

Config.read = function(key) {
    if (this.data.getItem(key))
        return JSON.parse(this.data.getItem(key));
    return null;
}

Config.save = function(key, value) {
    return this.data.saveItem(key, JSON.stringify(value));
}

Config.remove = function(key) {
    return this.data.deleteItem(key);
}

cookieToConfig = function(name) {
    var value = getCookie(name);
    if (value) {
        Config.save(name, value);
        // Log("Cookie for " + name + " moved:" + Config.read(name));
    }
}
