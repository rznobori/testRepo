function getCommitInfo ()
{
	// ------------------------------------------------------------
	// サポート状況チェック
	// ------------------------------------------------------------
	if(!window.File){
		alert("File クラスに対応していません。");
		return;
	}
	if(!window.FileReader){
		alert("FileReader クラスに対応していません。");
		return;
	}
	if(!localStorage){
		alert("LocalStorage クラスに対応していません。");
		return;
	}

	// 使用者名とE-Mailをauthorオブジェクトに格納
	var author = { name: sessionStorage.getItem("_author"), email: sessionStorage.getItem("_email")};
	// コミットメッセージの取得
	try{
		var commitMessage = document.getElementById("commit_msg").value;
	} catch(e) {
		var commitMessage = "no comment."
	}
	
	return {author: author, commitMessage: commitMessage};
}

function getRemoteRepoInfo ()
{
	var remoteUser = sessionStorage.getItem("_githubUserName");
	var remoteRepo = sessionStorage.getItem("_githubRepo");
	console.log({remoteUser, remoteRepo});
	// リモートリポジトリ指定
	var githubRepo = github.getRepo(remoteUser, remoteRepo);
	
	return githubRepo;
}

/*
* コミットを行う
* fileListFromGitCommit: コミットを行うファイルリスト
*/
function gitCommit (fileListFromGitCommit, fileObjList=undefined)
{
	// 戻り値 commitInfo{author, commitMessage}オブジェクト
	var commitInfo = getCommitInfo();

	// コミット情報の作成
    repo.saveAs("commit", 
	{
		author:
		{
			name: commitInfo.author.name,
			email: commitInfo.author.email
		},
		tree: [],
		message: commitInfo.commitMessage
	}, function(err, commitHash)
	{
		// commitHashを保存
		repo.loadAs("commit", commitHash, function(err, commitObject)
		{
			// コミット情報に今回コミットするTreeリストを追加
			var treeHashList = [];
			treeHashList = store.get("_trees") || [];
			commitObject.tree = treeHashList;

			// コミットツリーの生成
			var commitTree = store.get("_commitTree") || [];
			commitTree.push(commitHash);
			store.set("_commitTree", commitTree);

			// 親コミットを登録する
			commitObject.parents.push(store.get("_refs/heads/master"));

			// コミット情報をJSON形式でストレージへ保存
			commitObject.files = store.get("_repoFiles");
			//store.set(commitHash, commitObject);
			setValue(commitHash, commitObject);

			// 前回コミットハッシュを保存する
			localStorage.setItem("_beforeCommit", localStorage.getItem("_refs/heads/master"));

			// 最新コミットハッシュを保存する
			localStorage.setItem("_refs/heads/master", commitHash);

			// ファイルの最終コミットを保存する
			// 今回コミットするファイル数
			var fileListFromGitCommitLen = fileListFromGitCommit.length;
			for(var i = 0; i < fileListFromGitCommitLen; i++)
			{
				(function(n)
				{
					var commitFileName = fileListFromGitCommit[n];
					var commitFile = JSON.parse( sessionStorage.getItem(commitFileName) );
					try {
						commitFile.commitTree.push(commitHash);
					} catch (e) {
						if (fileObjList)
						{
							for(var k=0; k < fileObjList.length; k++)
							{
								(function(m)
								{
									var objKeyList = Object.keys(fileObjList[k]);
									var sKey = objKeyList.indexOf(commitFileName);
									if(sKey != -1)
									{
										commitFile = fileObjList[m][commitFileName];
										commitFile.commitTree.push(commitHash);
									}
								})(k);
							}
						} else {
							sessionStorage.removeItem(commitFileName);
							console.log({ commitFileName: commitFileName, commitFile: commitFile, commitHash: commitHash });
							alert("コミットに失敗しました。[1]");
							return;
						}
					}
					//store.set(commitFileName, commitFile);
					setValue(commitFileName, commitFile);
					sessionStorage.removeItem(commitFileName);
				})(i);
			}
			sessionStorage.removeItem(commitHash);
		});
	});
}
//END function gitCommit


/**
** ファイルをローカルリポジトリへコミットする
**
**/
function fileCommit()
{
	
	// ファイルリストを取得
	var fileList = document.getElementById("file_list_input").files;

	// ファイルが選択されていない場合処理中止
	if(!(fileList )) return;

	readFiles(fileList);

	setTimeout(function()
	{
		alert("コミット完了");
		window.location.reload();
	}, 3000);
	/**
	** ファイルを読み込みLocalStorageにコミットする
	** tree情報とblob情報をファイルごとに作成する
	**
	**/
	function readFiles(fileList)
	{
		var trees =[]; // 今回生成されるtreeHashをすべて持たせる
		// ファイル名リスト
		var commitFiles = [];
		var fileObjList = [];
		var len = fileList.length;	// 選択されたファイル数

		for(var i = 0; i < len; i++)
		{
			// for文の中でコールバック処理を入れる場合処理を無名関数にするなど工夫が必要
			(function(n)
			{
			    setTimeout(function()
			    {
					var file = fileList[n];
					if(!file) return;
					// FileReader オブジェクトを生成
					var file_reader = new FileReader();
			
					file_reader.addEventListener("load",function(e)
					{
						var fileResult = file_reader.result;	// ファイルコンテンツ
						var fileName = file.name;				// ファイル名
						// ファイル名をリストに追加
						commitFiles.push(fileName);

						if(file.type.indexOf("image") == 0
						|| file.type.indexOf("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") == 0
						|| file.type.indexOf("application/pdf") == 0)
						{
							//fileResult = Base64.btoa(fileResult);
							fileResult = fileResult;
						} else {
							//fileResult = Base64.encode(fileResult);
							fileResult = fileResult;
						}

						// treeオブジェクトとblobHashの発行
						repo.saveAs("blob", fileResult, function(err, blobHash)
						{
							// blobを保存
							//localStorage.setItem(blobHash, fileResult);
							setValue(blobHash, fileResult);

							// 今回コミット分のファイル名をすべて保存
							var repoFiles = store.get("_repoFiles") || [];
							var oldRepoFiles = store.get("_repoFiles") || [];
							if (repoFiles.indexOf(fileName) == -1) {
								repoFiles.push(fileName);
								store.set("_repoFiles", repoFiles);
							}

							// treeHashの発行
							//TODO modeは自動で判別させる
							repo.saveAs("tree",
							hash(fileName, { mode: modes.file, hash: blobHash}),
							function (err, treeHash)
							{
								// treeHashを保存
								repo.loadAs("tree", treeHash, function(err, treeObject)
								{
									// ファイルの拡張子を保存する
									treeObject[fileName].extension = getExtension(fileName);
									//store.set(treeHash, treeObject);
									setValue(treeHash, treeObject);
									trees.push(treeHash);
									store.set("_trees", trees);

									// ファイルオブジェクトにblobとtreeのハッシュを保存
									// 初めてコミットするファイルかどうかを判断
									var fileObj;
									if (oldRepoFiles.indexOf(fileName) != -1)
									{
										getValue(fileName);
										setTimeout(function()
										{
											fileObj = JSON.parse( sessionStorage.getItem(fileName) );
											//console.log({ fileObj: fileObj, blob: blobHash, tree: treeHash });
											fileObj.blob = blobHash;
											fileObj.tree = treeHash;
											
											setValue(fileName, fileObj);
											//sessionStorage.setItem(fileName, JSON.stringify(fileObj));
											fileObjList.push(hash(fileName, fileObj));

										}, 1000);

									} else {
										fileObj = 
										{
											blob: blobHash,
											tree: treeHash,
											commitTree: []
										};
										
										setValue(fileName, fileObj);
										//sessionStorage.setItem(fileName, JSON.stringify(fileObj));
										fileObjList.push(hash(fileName, fileObj));

									}
								});
							});
						});

					});

					if(file.type.indexOf("image") == 0
					|| file.type.indexOf("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") == 0
					|| file.type.indexOf("application/pdf") == 0)
					{
						// 読み込みを開始する
						file_reader.readAsBinaryString(file);
					} else if(file.type.indexOf("text") == 0 || file.type == ("application/javascript")) {
						// ファイルの読込を開始する
						file_reader.readAsText(file);
					} else {
						// TODO サポートされていないファイルは弾くかテキストとして読み込む
						file_reader.readAsText(file);
					}
				}, 1000);
			})(i);
		} // for
		
		setTimeout(function()
		{
			gitCommit (commitFiles, fileObjList);
		}, 3000);
		
	}
}
//END function fileCommit

/* 
* 登録されているgitHubからリポジトリをクローンする
*
*/
function remoteRepoClone()
{
	// ※実行前にローカルリポジトリを全消去する
	//store.clear();

	var githubRepo = getRemoteRepoInfo();

	//コミット情報作成時必要な今回追加するファイルリスト
	var fileNameList = [];
	var fileObjList = [];

	// 取得したツリー情報ごとにファイル情報を紐づけて取得

		// リモートリポジトリのツリー情報を取得
		githubRepo.getTree('master?recursive=true', function(err, tree)
		{
			var remoteRepoTreeInfo = tree;
			var trees = [];
			
			var len = remoteRepoTreeInfo.length;
			for (var i = 0; i < len; i++)
			{
				(function(n) {
					// tree情報の整形
					var path = remoteRepoTreeInfo[n].path;

					// blob情報を整形
					githubRepo.contents('master', path, function(err, data)
					{
						// Errorの場合
						if (err) { console.log(err); }

						// ディレクトリツリーはスキップする
						if(Object.prototype.toString.call(data) !== '[object Array]')
						{
							// コミットファイルリスト作成
							fileNameList.push(path);

							// ファイルの中身を取得
							var fileContent = data.content;
							
							repo.saveAs("blob", fileContent, function(err, blobHash)
							{
								// blobを保存
								//localStorage.setItem(blobHash, fileContent);
								setValue(blobHash, fileContent);

								// 今回コミット分のファイル名をすべて保存
								var repoFiles = store.get("_repoFiles") || [];
								var oldRepoFiles = store.get("_repoFiles") || [];
								if (repoFiles.indexOf(path) == -1)
								{
									repoFiles.push(path);
									store.set("_repoFiles", repoFiles);
								}

								//TODO modeは自動で判別させる
								repo.saveAs("tree",
								hash(path, { mode: remoteRepoTreeInfo[n].mode, hash: blobHash }),
								function (err, treeHash)
								{
									// treeHashを保存
									repo.loadAs("tree", treeHash, function(err, treeObject)
									{
										// ファイルの拡張子を保存する
										treeObject[path].extension = getExtension(path);
										
										//store.set(treeHash, treeObject);
										setValue(treeHash, treeObject);
										trees.push(treeHash);
										store.set("_trees", trees);
										
										// ファイルオブジェクトにblobとtreeのハッシュを保存
										// 初めてコミットするファイルかどうかを判断
										var fileObj;
										if (oldRepoFiles.indexOf(path) != -1)
										{
											getValue(path);
											setTimeout(function()
											{
												fileObj = JSON.parse( sessionStorage.getItem(path) );
												fileObj.blob = blobHash;
												fileObj.tree = treeHash;
												
												setValue(path, fileObj);
												fileObjList.push(hash(path, fileObj));

											}, 1000);

										} else {
											fileObj = 
											{
												blob: blobHash,
												tree: treeHash,
												commitTree: []
											};
											
											setValue(path, fileObj);
											fileObjList.push(hash(path, fileObj));

										}
										
										sessionStorage.removeItem(blobHash);
										sessionStorage.removeItem(path);
										
									});
									
								});

							});
						}
					});
				})(i);
			}
				setTimeout(function()
	{
		gitCommit (fileNameList, fileObjList);
		alert("コミット完了");
		//window.location.reload();

	}, 15000);
		});


}
//END function remoteRepoClone

/* 
* 作業環境（デバイス）のファイルをリモートリポジトリへプッシュする
*
*/
function filePushFromDeviceToRemote()
{
	var remotebranch = document.getElementById("remote_branch").value || "master";
	var remoteDir = document.getElementById("remote_dir").value;
	var fileList = document.getElementById("file_list_input").files;

	if(!(fileList)) return;

	// 戻り値 commitInfo{author, commitMessage}オブジェクト
	var commitInfo = getCommitInfo();

	// ※実行前にローカルリポジトリを全消去する
	//store.clear();

	var githubRepo = getRemoteRepoInfo();

	// リモートリポジトリのツリー情報を取得
	var remoteRepoTreeInfo;
	githubRepo.getTree('master?recursive=true', function(err, tree)
	{
		remoteRepoTreeInfo = tree;
	});

	var options =
	{
		author: commitInfo.author,
		committer: commitInfo.author,
		encode: true // Whether to base64 encode the file. (default: true)
	}

	pushExecution(fileList, options, remotebranch, remotebranch, remoteRepoTreeInfo, commitInfo, githubRepo);
	setTimeout(function()
	{
		alert("プッシュ完了");
	}, 5000);

	function pushExecution(fileList, options, remotebranch, remotebranch, remoteRepoTreeInfo, commitInfo, githubRepo)
	{
		// 実処理の実行
		var count = 0;
		var len = fileList.length;
		// githubで衝突が起こるため1処理ごとに間隔を空けて実行
		(function act() {
		    if (count < len) {
		        setTimeout(act, 1000);
		    }
		    
			// i番目の File オブジェクトを取得
			var file = fileList[count];
			if(!file) return;
			var fileReader = new FileReader();
			fileReader.addEventListener("load",function(e)
			{
				var fileResult = fileReader.result;	// ファイルコンテンツ
				var fileName = file.name;				// ファイル名
	
				// リモートへPUSH(実際処理はファイル新規作成または上書き)
				if (remoteDir)
				{
					githubRepo.write(remotebranch, remoteDir+ "/" +fileName, fileResult, commitInfo.commitMessage, options);
				} else
				{
					githubRepo.write(remotebranch, fileName, fileResult, commitInfo.commitMessage, options);
				}
			});
	
			// 読み込みを開始する
			if(file.type.indexOf("image") == 0)
			{
				fileReader.readAsBinaryString(file);
			} else {
				fileReader.readAsText(file);
			}
	
			console.log("push comp");
		    count += 1;
		})();
	}
	//End function pushExecution.
}

/* 
* ローカルリポジトリのファイルをリモートリポジトリへプッシュする
*
*/
function filePushFromLocalToRemote()
{
	var remoteDir = document.getElementById("remote_dir").value;
	var remoteBranch = document.getElementById("remote_branch").value || "master";
	var fileNameList = JSON.parse(sessionStorage.getItem("_fileNameList"));

	if(!(fileNameList)) return;

	// 戻り値 commitInfo{author, commitMessage}オブジェクト
	var commitInfo = getCommitInfo();

	// ※実行前にローカルリポジトリを全消去する
	//store.clear();

	var githubRepo = getRemoteRepoInfo();

	// リモートリポジトリのツリー情報を取得
	var remoteRepoTreeInfo;
	githubRepo.getTree('master?recursive=true', function(err, tree)
	{
		remoteRepoTreeInfo = tree;
	});

	var options =
	{
		author: commitInfo.author,
		committer: commitInfo.author,
		encode: true // Whether to base64 encode the file. (default: true)
	}

	pushExecution(fileNameList, remoteDir, options, remoteBranch, remoteRepoTreeInfo, commitInfo, githubRepo);
	setTimeout(function()
	{
		alert("プッシュ完了");
	}, 5000);

	function pushExecution(fileNameList, remoteDir, options, remoteBranch, remoteRepoTreeInfo, commitInfo, githubRepo)
	{
		// githubで衝突が起こるため1処理ごとに間隔を空けて実行
		var count = 0;
		var len = fileNameList.length - 1;
		(function act() {
		    if (count < len) {
		        setTimeout(act, 1000);
		    }

			var fileName = fileNameList[count];
			console.log(fileName);
			getValue(fileName);
			setTimeout( function(){
				var blobHash = JSON.parse( sessionStorage.getItem(fileName) ).blob;
				getValue(blobHash);
				setTimeout( function(){
					var fileResult = JSON.parse(sessionStorage.getItem(blobHash));	// ファイルコンテンツ

					// リモートへPUSH(実際処理はファイル新規作成または上書き)
					githubRepo.write(remoteBranch, remoteDir +"/"+ fileName, fileResult, commitInfo.commitMessage, options);

					console.log("push comp");
				    console.log(count);
				    count += 1;

				    sessionStorage.removeItem(fileName);
				    sessionStorage.removeItem(blobHash);
				},500);
			},500);
		})();
	}
	//End function pushExecution.

}


/* 
* リモートリポジトリのファイルをローカルリポジトリへプルする（ダウンロード）
*
*/
function filePull()
{
	//TODO 複数ファイルpull対応後はこっち var fileList = document.getElementById("input_file_list").value;
	var filePath = document.getElementById("input_file_list").value;

	// ファイルパスが入力されたか
	if(!(filePath)) return;

	// 戻り値 github API
	var githubRepo = getRemoteRepoInfo();

	//TODO dirを指定すればdir内すべてのファイルを取得したい
	githubRepo.contents('master', filePath, function(err, file)
	{
		if(!file) return;

		//console.log(file);
		readFile(file);

		//var fileList = new Array(file);
		//console.log(fileList.length);
		/**
		** ファイルを読み込みLocalStorageにコミットする
		**
		**/
		function readFile(file)
		{
			var trees =[]; // 今回生成されるtreeHashをすべて持たせる
			var commitFiles = [];
			//tree情報とblob情報をファイルごとに作成する
		    setTimeout(function()
		    {
				// FileReader オブジェクトを生成
					var fileResult = file.content;	// ファイルコンテンツ
					var fileName = file.path;		// ファイル名
	
					// 最新コミットHash設定用
					commitFiles.push(fileName);
	
					// treeオブジェクトとblobHashの発行
					repo.saveAs("blob", fileResult, function(err, blobHash)
					{
						//localStorage.setItem(blobHash, fileResult);
						setValue(blobHash, fileResult);
	
						// 今回コミット分のファイル名をすべて保存
						var repoFiles = store.get("_repoFiles") || [];
						var oldRepoFiles = store.get("_repoFiles") || [];
						if (repoFiles.indexOf(fileName) < 0) {
							repoFiles.push(fileName);
							store.set("_repoFiles", repoFiles);
						}
	
						//TODO modeは自動で判別させる
						repo.saveAs("tree",
						hash(fileName, { mode: modes.file, hash: blobHash }),
						function (err, treeHash)
						{
							// treeHashを保存
							repo.loadAs("tree", treeHash, function(err, treeObject)
							{
								// ファイルの拡張子を保存する
								treeObject[fileName].extension = getExtension(fileName);
								
								//store.set(treeHash, treeObject);
								setValue(treeHash, treeObject);

								trees.push(treeHash);
								store.set("_trees", trees);
								
								// ファイルオブジェクトにblobとtreeのハッシュを保存
								var fileObj;
								if (oldRepoFiles.indexOf(fileName) != -1)
								{
									getValue(fileName);
									setTimeout(function()
									{
										fileObj = JSON.parse( sessionStorage.getItem(fileName) );
										//console.log({ fileObj: fileObj, blob: blobHash, tree: treeHash });
										fileObj.blob = blobHash;
										fileObj.tree = treeHash;
										
										setValue(fileName, fileObj);
										sessionStorage.setItem(fileName, JSON.stringify(fileObj));

									}, 1000);

								} else {
									fileObj = 
									{
										blob: blobHash,
										tree: treeHash,
										commitTree: []
									};
									
									setValue(fileName, fileObj);
									sessionStorage.setItem(fileName, JSON.stringify(fileObj));

								}
								store.set(fileName, fileObj);
								
								
							});
						});
					});
			}, 1000);
	
			gitCommit(new Array(file));
	
			// pull完了後ページを更新
			setTimeout(function()
			{
				alert("リモートファイル "+ filePath +" をPULLしました。ページを更新します");
				//window.location.reload();
			}, 3000);
		}

	});
}


/* 
* ファイルの状態を指定したリビジョン（コミットID）に戻す
*
*/
function fileRevert()
{
	// 戻り値 [autohr{name, email}, commitMessage]
	var commitInfo = getCommitInfo();

	// 変更を行うファイル名
	// var revertFileName = document.getElementById("file_list_input").files;
	var revertFileName = document.getElementById("revert_file_name").value;

	// 指定リビジョン（コミットID）
	var revision = document.getElementById("file_revert_commit_id").value;

	// ファイル存在チェック
	getValue(revertFileName);
	if (sessionStorage.getItem(revertFileName) === undefined)
	{
		alert("指定されたファイルは存在しません");
		return;
	}
	// リビジョン存在チェック
	getValue(revision);
	if (sessionStorage.getItem(revision) === undefined)
	{
		alert("指定されたリビジョンは存在しません");
		return;
	}

	// 指定されたリビジョンのコミット情報を取得
	getValue(revision);
	var revisionInfo = JSON.parse( sessionStorage.getItem(revision) );

	// 取得したコミット情報から、変更するファイルのツリー情報を取得する
	// return　Object{ hash: ツリーハッシュ, tree: ツリー情報 }
	var fileTreeInfo = getFileTreeInfo(revertFileName, revisionInfo);
console.log(fileTreeInfo);
	// コミット情報が取得出来なかった場合、指定から直近のリビジョンを探す
	if (fileTreeInfo === false)
	{
		// コミットツリーを指定されたリビジョンのひとつ前までの長さに加工
		var repoCommitTreeList = store.get("_commitTree");
		var aKey = repoCommitTreeList.lastIndexOf(revision);
		if (aKey == 0)
		{
			repoCommitTreeList = [revision];
		} else if (aKey === -1) {
			alert("指定コミットIDにそのファイルは存在しません");
			return;
		} else {
			repoCommitTreeList = repoCommitTreeList.slice(0, aKey);
			repoCommitTreeList = repoCommitTreeList.reverse();
		}

		// ファイルのコミットツリーを最新順にする
		getValue(revertFileName);
		var file = JSON.parse( sessionStorage.getItem(revertFileName) );
		var fileCommitTreeList = file.commitTree;
		fileCommitTreeList = fileCommitTreeList.reverse();

		// 指定から直近のリビジョンの検索
		var fileCommitTreeListLen = fileCommitTreeList.length;
		for (var k = 0; k < fileCommitTreeListLen; k++)
		{
			var tempCommitHash = repoCommitTreeList[k];
			if (fileCommitTreeList.lastIndexOf(tempCommitHash) !== -1)
			{
				getValue(tempCommitHash);
				revisionInfo = JSON.parse( sessionStorage.getItem(tempCommitHash) );
				fileTreeInfo = getFileTreeInfo(revertFileName, revisionInfo);
				break;
			}
		}
		if (fileTreeInfo === false)
		{
			alert("指定されたリビジョンは存在しません");
			return;
		}
	}

	// ファイルを指定リビジョンの状態に変更する
	// ファイル名:blobを保存
	getValue(revertFileName);
	var fileInfo = JSON.parse( sessionStorage.getItem(revertFileName) );
	console.log(fileInfo);
	fileInfo.blob = fileTreeInfo.tree[revertFileName].hash;	// blobHash
	fileInfo.tree = fileTreeInfo.hash;
	console.log(fileInfo);
	//store.set(revertFileName, fileInfo);
	setValue(revertFileName, fileInfo);

	// コミット
	console.log("Create stert commitInfo.");
    repo.saveAs("commit", 
	{
		author:
		{
			name: commitInfo.author.name,
			email: commitInfo.author.email
		},
		tree: JSON.stringify([fileTreeInfo.hash]),
		message: commitInfo.commitMessage
	}, function(err, commitHash)
	{
		// commitHashを保存
		repo.loadAs("commit", commitHash, function(err, commitObject)
		{
			// コミットツリーの生成
			var commitTree = store.get("_commitTree") || [];
			commitTree.push(commitHash);
			store.set("_commitTree", commitTree);

			// 親コミットを登録する
			commitObject.parents.push(store.get("_refs/heads/master"));

			// コミット情報をJSON形式でストレージへ保存
			commitObject.files = store.get("_repoFiles");
			//store.set(commitHash, commitObject);
			setValue(commitHash, commitObject);

			// 前回コミットハッシュを保存する（Resetなどで使用）
			localStorage.setItem("_beforeCommit", localStorage.getItem("_refs/heads/master"));

			// 最新コミットハッシュを保存する
			localStorage.setItem("_refs/heads/master", commitHash);

			// ファイルの最終コミットを保存する
			getValue(revertFileName);
			var commitFile = JSON.parse( sessionStorage.getItem(revertFileName) );
			commitFile.commitTree.push(commitHash);
			//store.set(revertFileName, commitFile);
			setValue(revertFileName, commitFile);

			console.log("Create end commitInfo.");
			alert(revertFileName +"を"+ revision +"へrevertしました。");
			
			//window.location.reload();
		}); //END: repo.loadAs("commit")
	});

	/*  指定リビジョンの指定ファイルのツリー情報を取得
	 **
	 */
	function getFileTreeInfo(revertFileName, revisionInfo)
	{
		// treeListはそのまま取得すると文字列として取得するのでJSON.parseで配列オブジェクト化する
		var treeList = revisionInfo.tree;
		var treeListLen = treeList.length;
	
		for(var i = 0; i < treeListLen; i++)
		{
			// treeHashから紐付くtree情報を取得しファイル名が一致するtree情報を返す
			var treeHash = treeList[i];
	
			getValue(treeHash);
			var tree = JSON.parse( sessionStorage.getItem(treeHash) );
	
			if (tree[revertFileName])
			{
				return { hash: treeHash, tree: tree };
			}
		}
		return false;
	};

}


/* 
* ファイルの状態を指定したリビジョン（コミットID）に戻す
*
*/
function repoRevert()
{
	// リビジョン（コミットID）
	var revision = document.getElementById("repo_revert_commit_id").value;

	// 戻り値 [autohr{name, email}, commitMessage]
	var commitInfo = getCommitInfo();

	// リビジョン存在チェック
	if (store.get(revision) === undefined)
	{
		alert("指定されたリビジョンは存在しません");
		return;
	}

	// リポジトリファイルリスト取得
	var repoFiles = store.get(revision).files;

	// コミットに必要な情報を作成する
	var existFileList = [];
	var notExistFileList = [];
	var repoFilesLen = repoFiles.length;
	for (var i = 0; i < repoFilesLen; i++)
	{
		var revisionInfo = store.get(revision);
		var revertFileName = repoFiles[i];
		var treeList = [];
		
		// 取得したコミット情報から、変更するファイルのツリー情報を取得する
		// return　Object{ hash: ツリーハッシュ, tree: ツリー情報 }
		var fileTreeInfo = getFileTreeInfo(revertFileName, revisionInfo);

		// コミット情報が取得出来なかった場合、指定から直近のリビジョンを探す
		if (fileTreeInfo === false) {
			// コミットツリーを指定されたリビジョンのひとつ前までの長さに加工
			var repoCommitTreeList = store.get("_commitTree");
			var aKey = repoCommitTreeList.lastIndexOf(revision);
			repoCommitTreeList = repoCommitTreeList.slice(0, aKey);
			repoCommitTreeList = repoCommitTreeList.reverse();
			
			// 指定されたリビジョンにファイルが存在しないもしくはリポジトリに指定コミットがない場合
			if (repoCommitTreeList.length == 0 || aKey === -1)
			{
				// 存在しないファイルのリストを作成
				notExistFileList.push(revertFileName);
				continue;
			}

			// ファイルのコミットツリーを最新順にする
			var file = store.get(revertFileName);
			var fileCommitTreeList = file.commitTree;
			fileCommitTreeList = fileCommitTreeList.reverse();

			// 指定から直近のリビジョンの検索
			var fileCommitTreeListLen = fileCommitTreeList.length;
			for (var k = 0; k < fileCommitTreeListLen; k++)
			{
				var tempCommitHash = repoCommitTreeList[k];
				if (fileCommitTreeList.lastIndexOf(tempCommitHash) !== -1)
				{
					revisionInfo = store.get(tempCommitHash);
					fileTreeInfo = getFileTreeInfo(revertFileName, revisionInfo);
					break;
				}
			}
			
			// 
			if (fileTreeInfo === false)
			{
				// 存在しないファイルのリストを作成
				notExistFileList.push(revertFileName);
				continue;
			}
		}
		existFileList.push(fileTreeInfo);
		
	}
	console.log(existFileList);
	console.log(notExistFileList);

	// コミット必要情報の作成とファイル
	var tempRepoFiles = repoFiles;
	var treeHashList = [];
	var fileInfoList = [];
	var existFileListLen = existFileList.length;
	for (var j = 0; j < existFileListLen; j++)
	{
		// コミット情報に付与するツリーリスト
		treeHashList.push(existFileList[j].hash);
		
		// ファイル更新用オブジェクト配列
		var tempFileName = Object.keys(existFileList[j].tree)[0];
		var tempFileInfo =
		{
			name: tempFileName,
			blob: existFileList[j].tree[tempFileName].hash,
			tree: existFileList[j].hash
		}
		fileInfoList.push(tempFileInfo);
		
		// リポジトリファイルリストの作成
		if (tempRepoFiles.indexOf(tempFileName) < 0) {
			tempRepoFiles.push(tempFileName);
		}
	}


	// コミット情報の作成
	console.log("Create stert commitInfo.");
    repo.saveAs("commit", 
	{
		author:
		{
			name: commitInfo.author.name,
			email: commitInfo.author.email
		},
		tree: JSON.stringify(treeHashList),
		message: commitInfo.commitMessage
	}, function(err, commitHash)
	{
		// commitHashを保存
		repo.loadAs("commit", commitHash, function(err, commitObject)
		{
			// コミットツリーの生成
			var commitTree = store.get("_commitTree") || [];
			commitTree.push(commitHash);
			store.set("_commitTree", commitTree);

			// 親コミットを登録する
			commitObject.parents.push(store.get("_refs/heads/master"));
			
			// 指定コミットより以前に存在しないファイルの削除
			var notExistFileListLen = notExistFileList.length;
			for (var y = 0; y < notExistFileListLen; y++)
			{
				var notFileName = notExistFileList[y];
				var repoFileKey = repoFiles.lastIndexOf(notFileName);
				tempRepoFiles.splice(repoFileKey, 1);
			}
			store.set("__repoFiles", tempRepoFiles);

			// コミット情報をJSON形式でストレージへ保存
			commitObject.files = store.get("_repoFiles");
			store.set(commitHash, commitObject);

			// 前回コミットハッシュを保存する（Resetなどで使用）
			localStorage.setItem("_beforeCommit", localStorage.getItem("_refs/heads/master"));

			// 最新コミットハッシュを保存する
			localStorage.setItem("_refs/heads/master", commitHash);

			// ファイルの状態を更新する
			var fileInfoListLen = fileInfoList.length;
			for (var x = 0; x < fileInfoListLen; x++)
			{
				var commitFile = store.get(fileInfoList[x].name);
				commitFile.commitTree.push(commitHash);
				commitFile.blob = fileInfoList[x].blob;
				commitFile.tree = fileInfoList[x].tree;
				store.set(fileInfoList[x].name, commitFile);
			}

			console.log("Create end commitInfo.");
			alert("リポジトリを"+ revision +"へrevertしました。");
			window.location.reload();
		}); //END: repo.loadAs("commit")
	});

	/*  指定リビジョンの指定ファイルのツリー情報を取得
	 **
	 */
	function getFileTreeInfo(revertFileName, revisionInfo)
	{
		// treeListはそのまま取得すると文字列として取得するのでJSON.parseで配列オブジェクト化する
		var treeList = JSON.parse(revisionInfo.tree);
	
		var treeListLen = treeList.length;
	
		for(var i = 0; i < treeListLen; i++)
		{
			// treeHashから紐付くtree情報を取得しファイル名が一致するtree情報を返す
			var treeHash = treeList[i];
	
			var tree = store.get(treeHash);
	
			if (tree[revertFileName])
			{
				return { hash: treeHash, tree: tree };
			}
		}
		return false;
	};

}


/* 
* ローカルリポジトリのファイルを削除（復旧可能な論理削除）する
*
*/
function fileRemove() {

	var fileNameList = JSON.parse( sessionStorage.getItem("_fileNameList") );
	if (fileNameList.length == 0) return;

	readFiles(fileNameList);

	setTimeout(function()
	{
		alert("コミット完了　ページを更新します");
		//window.location.reload();
	}, 3000);


	/**
	** ファイルを読み込みLocalStorageにコミットする
	** tree情報とblob情報をファイルごとに作成する
	**
	**/
	function readFiles(fileNameList)
	{
		// 戻り値 [author{name, email}, commitMessage]
		var commitInfo = getCommitInfo();

		var trees =[]; // 今回生成されるtreeHashをすべて持たせる
		var commitFiles = [];
		var repoFiles = store.get("_repoFiles");
		// 選択されたファイルを順に削除していく
		for (var k = 0; k < fileNameList.length; k++)
		{
			var aKey = repoFiles.lastIndexOf(fileNameList[k]);
			// 削除
			repoFiles.splice(aKey, 1);
		}

		store.set("_repoFiles", repoFiles);
		
		// treeとblob情報の生成が終わるまで処理開始を待つ
		console.log("Create start commitInfo.");
	    setTimeout(function()
	    {

			// コミット情報の作成
		    repo.saveAs("commit",
		    {
				author:
				{
					name: commitInfo.author.name,
					email: commitInfo.author.email
				},
				tree: [],
				message: commitInfo.commitMessage
			}, function(err, commitHash)
			{
				// commitHashを保存
				repo.loadAs("commit", commitHash, function(err, commitObject)
				{
					// コミットツリーの生成
					var commitTree = store.get("_commitTree") || [];
					commitTree.push(commitHash);
					store.set("_commitTree", commitTree);

					// 親コミットを登録する
					commitObject.parents.push(store.get("_refs/heads/master"));

					// コミット情報をJSON形式でストレージへ保存
					commitObject.files = store.get("_repoFiles");
					store.set(commitHash, commitObject);

					// 前回コミットハッシュを保存する（Resetなどで使用）
					localStorage.setItem("_beforeCommit", localStorage.getItem("_refs/heads/master"));

					// 最新コミットハッシュを保存する
					localStorage.setItem("_refs/heads/master", commitHash);

				}); //END: repo.loadAs("commit")
			});
			console.log("Create end commitInfo.");
		}, 2000);
	}
}


/* 
* 直前のコミットを取り消す（リセット）
*
*/
function beforeReset()
{
	// 取り消すコミット
	var resetCommitHash = localStorage.getItem("_refs/heads/master");
	var resetCommit = store.get(resetCommitHash);
	var resetCommitTreeHashList = JSON.parse(resetCommit.tree); // Treeリスト
	var resetCommitBlobObjList = createBlobHashList(resetCommitTreeHashList); // Blobリスト
	var resetCommitBlobHashList = resetCommitBlobObjList.blobHashList;
	var resetCommitFileNameList = resetCommitBlobObjList.fileNameList;
	
	// このコミットに更新する
	var beforeCommitHash = localStorage.getItem("_beforeCommit");
	if (beforeCommitHash != null)
	{
		var beforeUndefindeFlag = true;
		var beforeCommit = store.get(beforeCommitHash);
		var beforeCommitTreeHashList = resetCommitTreeHashList;
	}
	
	// リポジトリパラメータ
	var commitTree = store.get("_commitTree");
	var refsHeadsMaster = store.get("_refs/heads/master");
	var beforeCommit = store.get("_beforeCommit");
	var trees = store.get("_trees");
	var repoFiles = store.get("_repoFiles");

	// Treeの削除
	var daleteTreeList = [];
	var treeHashListLen = resetCommitTreeHashList.length;
	for (var i = 0; i < treeHashListLen; i++)
	{
		if(typeof(beforeCommitTreeHashList) != "undefined")
		{
			if(beforeUndefindeFlag == true
			|| beforeCommitTreeHashList.lastIndexOf(resetCommitTreeHashList[i]) === -1)
			{
				store.remove(resetCommitTreeHashList[i]);
			}
		}
	}

	// ファイル個別のコミットツリー更新
	var fileNameListLen = resetCommitFileNameList.length;
	for (var k = 0; k < fileNameListLen; k++)
	{
		var resetFileName = resetCommitFileNameList[k];
		var file = store.get(resetFileName);

		// ファイルのコミットツリーから指定コミットを削除
		file.commitTree.pop();

		// file.blob, file.treeの更新
		// コミットツリーが無くなった場合ファイルそのものを削除
		var cKey = file.commitTree.length;
		if (cKey == 0)
		{
			store.remove(resetFileName);
			var repoFileKey = repoFiles.lastIndexOf(resetFileName);
			repoFiles.splice(repoFileKey, 1);
			store.set("_repoFiles", repoFiles);
		} else {
			var commitInfo = store.get(file.commitTree[cKey]);
			var treeInfo = getFileTreeInfo(resetFileName, commitInfo);
			file.blob = treeInfo.tree[resetFileName].hash;
			file.hash = treeInfo.hash;
			store.set(resetFileName, file);
		}

	}

	// リポジトリパラメータの更新
	commitTree.pop();
	store.set("_commitTree", commitTree);

	var cKey = commitTree.length - 1;
	if (cKey == -1)
	{
		localStorage.setItem("_refs/heads/master", "");
		store.set("_trees", "");
		store.set("_beforeCommit", "");
	} else {
		localStorage.setItem("_refs/heads/master", commitTree[cKey]);
		var commitInfoOfTreeList = JSON.parse(store.get(commitTree[cKey]).tree);
		store.set("_trees", commitInfoOfTreeList);
		localStorage.setItem("_beforeCommit", beforeCommitHash);
	}

	// Commitの削除
	store.remove(resetCommitHash);

	setTimeout(function()
    {
		alert("リセット完了");
	}, 3000);

	/*
	** コミットに紐づくBlobリストを作成する
	*/
	function createBlobHashList (treeHashList) {
		var blobHashList = [];
		var fileNameList = [];
		var len = treeHashList.length;
		for (var i = 0; i < len; i++)
		{
			var tree = store.get(treeHashList[i]);
			var fileName = Object.keys(tree)[0];
			
			fileNameList.push(fileName);
			blobHashList.push(tree[fileName].hash);
		}
		return { blobHashList: blobHashList, fileNameList: fileNameList };
	}

	/*
	** 指定リビジョンの指定ファイルのツリー情報を取得（reset用）
	*/
	function getFileTreeInfo(resetFileName, commitInfo)
	{
		// treeListはそのまま取得すると文字列として取得するのでJSON.parseで配列オブジェクト化する
		var treeList = JSON.parse(commitInfo.tree);
		console.log(treeList);
		var treeListLen = treeList.length;
		for(var i = 0; i < treeListLen; i++)
		{
			// treeHashから紐付くtree情報を取得しファイル名が一致するtree情報を返す
			var treeHash = treeList[i];
			var tree = store.get(treeHash);
			if (tree[resetFileName])
			{
				return { hash: treeHash, tree: tree };
			}
		}
		return false;
	};
}


/*
*  最新コミットから指定コミットまで取り消す（リセット）
*
*/
function scopeReset()
{
	var revision = document.getElementById("commitId").value;
	var repoHead = localStorage.getItem("_refs/heads/master");
	var repoCommitTreeList = store.get("_commitTree");
	var aKey = repoCommitTreeList.lastIndexOf(revision);
	var bKey = repoCommitTreeList.lastIndexOf(repoHead);
	repoCommitTreeList = repoCommitTreeList.slice(aKey, bKey+1);
	repoCommitTreeList = repoCommitTreeList.reverse();
	
	var repoCommitTreeListLen = repoCommitTreeList.length;
	for(var n = 0; n < repoCommitTreeListLen; n++)
	{
		// 取り消すコミット
		var resetCommitHash = repoCommitTreeList[n];
		console.log("取り消すコミットID：" + resetCommitHash);
		var resetCommit = store.get(resetCommitHash);
		var resetCommitTreeHashList = JSON.parse(resetCommit.tree); // Treeリスト
		var resetCommitBlobObjList = createBlobHashList(resetCommitTreeHashList); // Blobリスト
		var resetCommitBlobHashList = resetCommitBlobObjList.blobHashList;
		var resetCommitFileNameList = resetCommitBlobObjList.fileNameList;

		// このコミットに更新する
		var beforeCommitHash = localStorage.getItem("_beforeCommit");
		if (beforeCommitHash != null)
		{
			var beforeUndefindeFlag = true;
			var beforeCommit = store.get(beforeCommitHash);
			var beforeCommitTreeHashList = resetCommitTreeHashList;
		}

		// Treeの削除
		var daleteTreeList = [];
		var treeHashListLen = resetCommitTreeHashList.length;
		for (var i = 0; i < treeHashListLen; i++)
		{
			if(typeof(beforeCommitTreeHashList) != "undefined")
			{
				if(beforeUndefindeFlag == true
				|| beforeCommitTreeHashList.lastIndexOf(resetCommitTreeHashList[i]) === -1)
				{
					store.remove(resetCommitTreeHashList[i]);
				}
			}
		}

		// リポジトリパラメータ
		var commitTree = store.get("_commitTree");
		var refsHeadsMaster = store.get("_refs/heads/master");
		var beforeCommit = store.get("_beforeCommit");
		var trees = store.get("_trees");
		var repoFiles = store.get("_repoFiles");

		// ファイル個別のコミットツリー更新
		var fileNameListLen = resetCommitFileNameList.length;
		for (var k = 0; k < fileNameListLen; k++)
		{
			var resetFileName = resetCommitFileNameList[k];
			console.log(resetFileName);
			var file = store.get(resetFileName);
			console.log(file);
			// ファイルのコミットツリーから指定コミットを削除
			file.commitTree.pop();
			
			// blobの更新
			// コミットツリーが無くなった場合ファイルそのものを削除
			var cKey = file.commitTree.length;
			if (cKey == 0)
			{
				store.remove(resetFileName);
				var repoFileKey = repoFiles.lastIndexOf(resetFileName);
				repoFiles.splice(repoFileKey, 1);
				store.set("_repoFiles", repoFiles);
			} else {
				var commitInfo = store.get(file.commitTree[cKey]);
				console.log(commitInfo);
				var treeInfo = getFileTreeInfo(resetFileName, commitInfo);
				file.blob = treeInfo.tree[resetFileName].hash;
				store.set(resetFileName, file);
			}
		}

		// リポジトリパラメータの更新
		commitTree.pop();
		store.set("_commitTree", commitTree);

		var cKey = commitTree.length - 1;
		if (cKey == -1)
		{
			
			localStorage.setItem("_refs/heads/master", "");
			store.set("_trees", "");
			store.set("_beforeCommit", "");
		} else {
			localStorage.setItem("_refs/heads/master", commitTree[cKey]);
			var commitInfoOfTreeList = JSON.parse(store.get(commitTree[cKey]).tree);
			store.set("_trees", commitInfoOfTreeList);
			localStorage.setItem("_beforeCommit", beforeCommitHash);
		}

		// Commitの削除
		store.remove(resetCommitHash);

	}

	setTimeout(function()
    {
		alert("リセット完了");
	}, 3000);

	/*
	** コミットに紐づくBlobリストを作成する
	*/
	function createBlobHashList (treeHashList) {
		var blobHashList = [];
		var fileNameList = [];
		var len = treeHashList.length;
		for (var j = 0; j < len; j++)
		{
			var tree = store.get(treeHashList[j]);
			var fileName = Object.keys(tree)[0];
			
			fileNameList.push(fileName);
			blobHashList.push(tree[fileName].hash);
		}
		return { blobHashList: blobHashList, fileNameList: fileNameList };
	}

	/*
	** 指定リビジョンの指定ファイルのツリー情報を取得（reset用）
	*/
	function getFileTreeInfo(resetFileName, commitInfo)
	{
		// treeListはそのまま取得すると文字列として取得するのでJSON.parseで配列オブジェクト化する
		var treeList = JSON.parse(commitInfo.tree);
		console.log(treeList);
		var treeListLen = treeList.length;
		for(var i = 0; i < treeListLen; i++)
		{
			// treeHashから紐付くtree情報を取得しファイル名が一致するtree情報を返す
			var treeHash = treeList[i];
			var tree = store.get(treeHash);
			if (tree[resetFileName])
			{
				return { hash: treeHash, tree: tree };
			}
		}
		return false;
	};

}


/*
* オブジェクトのハッシュ（キー）に変数を指定する関数
*
*/
function hash(key, value)
{
  var h = {};
  h[key] = value;
  return h;
}


/*
* ファイル名から拡張子を取得する
* 拡張子がないファイルは未対応
*/
function getExtension(fileName) {
	var ret;
	if (!fileName) return ret;
	var fileTypes = fileName.split(".");
	var len = fileTypes.length;
	if (len === 0) return ret;
	ret = fileTypes[len - 1];
	return ret;
}

/*
* コミットログを表示する
*/
function getGitLogDisp() {
	var commitTree = store.get("_commitTree") || [];
	
	var len = commitTree.length;
	for (var i = 0; i < len; i++){
		var commit = commitTree[i];
		getValue(commit)
		var commitInfo = JSON.parse(sessionStorage.getItem(commit));
	
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
} //END gitLogDisp()


function getFileListDisp()
{
	// 画面表示時sessionのfileNameListを初期化
	sessionStorage.removeItem("_fileNameList");
	var fileList = store.get("_repoFiles");
	
	if (fileList != null)
	{
		fileList.sort();
		console.dir(fileList);
	
		document.write("<form id='form_test' action='' method='post'>");
		//document.write("<input type='checkbox' onClick='saveFileName(fileList)'>すべて<br>");
		var len = fileList.length;
		for (var i = 0; i < len; i++)
		{
			// リンク押下でファイルの中身表示（現状テキストファイルのみ対応）
			var fileName = fileList[i];
			var file = store.get(fileName);
			content = Base64.decode(localStorage.getItem(file.blob));
			var blob = new Blob([content], {type: "text/plain;charset=UTF-8"});
		
			// ブラウザ判定
			if(window.navigator.msSaveBlob)
			{
		
				// TODO IEの場合の処理
		
			} else {
				// IE以外
				var href;
				href = URL.createObjectURL(blob);
				
				// 画像の場合（ファイルの拡張子を取得しhref変数に追加）
				var fileExtension = store.get(file.tree)[fileName].extension;
				switch(fileExtension)
				{
					case "jepg":
					case "jpg":
					case "png":
					case "gif":
					case "bmp":
						href = "data:image/" + fileExtension +";base64," + localStorage.getItem(file.blob);
						break;
				}
			}
		
			document.write("<input type='checkbox' id=file_check_"+ i +" value='"+ fileList[i] +"' onClick='saveFileName(this)'>");
			document.write("<a href='"+ href +"' target='_blank'>");
			document.write(fileList[i]);
			document.write("</a>");
			document.write(" - <a href='" + href + "' target='_blank' download='" + fileList[i] +"'>Download</a>");
			document.write("<br>");
		}
		
		document.write("</form>");

		function saveFileName(obj)
		{
			//var checkId = obj.id;
			var fileName = obj.value;
			var fileNameList = JSON.parse(sessionStorage.getItem("_fileNameList")) || [];
			var key = fileNameList.indexOf(fileName);
			if (key == -1)
			{
				fileNameList.push(fileName);
			} else {
				fileNameList.splice(key, 1);
			}
			sessionStorage.setItem("_fileNameList", JSON.stringify(fileNameList));
		}

	}
	
}