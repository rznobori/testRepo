function filePush() {

	var element_file = document.getElementById("input_10_file");
	var element_msg = document.getElementById("push_msg").value || "No input commit message.";
	var element_author = document.getElementById("push_author").value || "tester";
	var element_email = document.getElementById("push_email").value || "temp@xxx.com";
	var element_branch = document.getElementById("push_branch").value || "master";
	var remoteUser = document.getElementById("remote_user").value;
	var remoteRepo = document.getElementById("remote_repo").value;
	var remoteDir = document.getElementById("remote_dir").value;

	var githubRepo = github.getRepo(store.get(remoteUser), store.get(remoteRepo));

	// ------------------------------------------------------------
	// サポート状況
	if(!window.File){
		alert("File クラスに対応していません。");
		return;
	}
	if(!window.FileReader){
		alert("FileReader クラスに対応していません。");
		return;
	}
	// ------------------------------------------------------------

	if(!(element_file.value)) return;

	var file_list = element_file.files;

	if(!file_list) return;

	var options = {
	  author: {name: element_author, email: element_email},
	  committer: {name: element_author, email: element_email},
	  encode: true // Whether to base64 encode the file. (default: true)
	}

	var len = file_list.length;
	for(var i = 0; i < len; i++)
	{
		(function(n)
		{
			// i番目の File オブジェクトを取得
			var file = file_list[n];
			if(!file) return;
			var file_reader = new FileReader();

			file_reader.addEventListener("load",function(e)
			{
				var fileResult = file_reader.result;	// ファイルコンテンツ
				var fileName = file.name;				// ファイル名
console.log(remoteDir + fileName);
				// リモートへPUSH(実際処理はファイル新規作成または上書き)
				githubRepo.write(element_branch, remoteDir + fileName, fileResult, element_msg, options);
				
			});

			// 読み込みを開始する
			if(file.type.indexOf("image") == 0)
			{
				file_reader.readAsBinaryString(file);
			} else {
				file_reader.readAsText(file);
			}
		})(i);
	}
	console.log("push comp");

}