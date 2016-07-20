function fileRevert()
{
	// 変更を行うファイル名
	var revertFileName = document.getElementById("revert_file").value;
	// 指定リビジョン（コミットID）
	var revision = document.getElementById("file_revert_commit_id").value;
	// コミット必要情報
	var element_msg = document.getElementById("file_revert_msg").value || "revert --"+ revertFileName +" ["+ revision +"]";
	var element_author = "revert_author";
	var element_email = "revert@xxx.com";

	// ファイル存在チェック
	if (store.get(revertFileName) === undefined)
	{
		alert("指定されたファイルは存在しません");
		return;
	}
	// リビジョン存在チェック
	if (store.get(revision) === undefined)
	{
		alert("指定されたリビジョンは存在しません");
		return;
	}

	// 指定されたリビジョンのコミット情報を取得
	var commitInfo = store.get(revision);
	// 取得したコミット情報から、変更するファイルのツリー情報を取得する
	// return　Object{ hash: ツリーハッシュ, tree: ツリー情報 }
	var fileTreeInfo = getFileTreeInfo(revertFileName, commitInfo);
	// コミット情報が取得出来なかった場合、指定から直近のリビジョンを探す
	if (fileTreeInfo === false) {
		// コミットツリーを指定されたリビジョンのひとつ前までの長さに加工
		var repoCommitTreeList = store.get("__commitTree");
		var aKey = repoCommitTreeList.lastIndexOf(revision);
		repoCommitTreeList = repoCommitTreeList.slice(0, aKey);
		repoCommitTreeList = repoCommitTreeList.reverse();

		// 指定されたリビジョンにファイルが存在しないもしくはリポジトリに指定コミットがない場合
		if (repoCommitTreeList.length == 0 || aKey === -1)
		{
			alert("指定コミットIDにそのファイルは存在しません");
			return;
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
				commitInfo = store.get(tempCommitHash);
				fileTreeInfo = getFileTreeInfo(revertFileName, commitInfo);
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
	var fileInfo = store.get(revertFileName);
	fileInfo.blob = fileTreeInfo.tree[revertFileName].hash;	// blobHash
	fileInfo.tree = fileTreeInfo.hash;
	store.set(revertFileName, fileInfo);

	// コミット情報の作成
	console.log("Create stert commitInfo.");
    repo.saveAs("commit", 
	{
		author:
		{
			name: element_author,
			email: element_email
		},
		tree: JSON.stringify([fileTreeInfo.hash]),
		message: element_msg
	}, function(err, commitHash)
	{
		// commitHashを保存
		repo.loadAs("commit", commitHash, function(err, commitObject)
		{
			// コミットツリーの生成
			var commitTree = store.get("__commitTree") || [];
			commitTree.push(commitHash);
			store.set("__commitTree", commitTree);

			// 親コミットを登録する
			commitObject.parents.push(store.get("__refs/heads/master"));

			// コミット情報をJSON形式でストレージへ保存
			commitObject.files = store.get("__repoFiles");
			store.set(commitHash, commitObject);

			// 前回コミットハッシュを保存する（Resetなどで使用）
			localStorage.setItem("__beforeCommit", localStorage.getItem("__refs/heads/master"));

			// 最新コミットハッシュを保存する
			localStorage.setItem("__refs/heads/master", commitHash);

			// ファイルの最終コミットを保存する
			var commitFile = store.get(revertFileName);
			commitFile.commitTree.push(commitHash);
			store.set(revertFileName, commitFile);

			console.log("Create end commitInfo.");
			alert(revertFileName +"を"+ revision +"へrevertしました。");
			window.location.reload();
		}); //END: repo.loadAs("commit")
	});

	/*  指定リビジョンの指定ファイルのツリー情報を取得
	 **
	 */
	function getFileTreeInfo(revertFileName, commitInfo)
	{
		// treeListはそのまま取得すると文字列として取得するのでJSON.parseで配列オブジェクト化する
		var treeList = JSON.parse(commitInfo.tree);
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