// コミットツリーの取得
var commitTree = store.get("__commitTree") || [];

var len = commitTree.length;
for (var i = 0; i < len; i++){
	var commit = commitTree[i];
	var commitInfo = store.get(commit);

	// UNIX TIMEを表示用に変換
	var ux = commitInfo.author.date.seconds;
	var d = new Date( ux * 1000 );

	var year = d.getFullYear();
	var month = d.getMonth() + 1;
	var day   = d.getDate();
	var hour  = ( d.getHours()   < 10 ) ? '0' + d.getHours()   : d.getHours();
	var min   = ( d.getMinutes() < 10 ) ? '0' + d.getMinutes() : d.getMinutes();
	var sec   = ( d.getSeconds() < 10 ) ? '0' + d.getSeconds() : d.getSeconds();

	document.write("<hr><div>");
	document.write("<p>");
	document.write("commit: " + commit + "<br>");
	document.write("parents: " + commitInfo.parents[0] + "<br>");
	document.write("Author: "
		+ commitInfo.author.name
		+ " &lt;"
		+ commitInfo.author.email
		+ "&gt;"
		+ "<br>"
	);
	document.write("Date: "
		+ year + "年"
		+ month + "月"
		+ day + "日"
		+ hour + ":"
		+ min + ":"
		+ sec
	);
	document.write("</p>");
	document.write("<p>" + commitInfo.message + "</p>");
	document.write("</div>");
}