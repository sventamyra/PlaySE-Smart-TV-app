var PathHistory =
{

};

PathHistory.GetPath = function(){
    var url = myLocation;

	var parse;
	if (url.indexOf("&")>0)
	{
		parse = url.substring(url.indexOf("=") + 1 , url.length);
	 	parse = parse.substring(parse.indexOf("history=") + 8 , parse.length);
	 	document.title = parse.split("&")[0];
		var html = html = Header.insertTitle(Header.addPrefix(parse));
                Header.display('');
		$('.dropdown').html($(html));
	}
	
};