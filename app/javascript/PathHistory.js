var PathHistory = {};

PathHistory.GetPath = function() {

    var parse = getUrlParam(myLocation, 'history', true);
    if (parse) {
	document.title = parse;
	var html = Header.insertTitle(Header.addPrefix(parse));
        Header.display('');
	$('.dropdown').html($(html));
    }
};
