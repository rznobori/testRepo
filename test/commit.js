function commit() {
	repo.saveAs("blob", "Hello World\n", function(err, blobHash){
	  console.log(err, blobHash);

	  repo.saveAs("tree", {
	    "greeting.txt": { mode: modes.file, hash: blobHash }
	  }, function(err, treeHash){
	    console.log(err, treeHash);

	    repo.saveAs("commit", {
	      author: {
	        name: "Tim Caswell",
	        email: "tim@creationix.com"
	      },
	      tree: treeHash,
	      message: "Test commit\n"
	    }, function(err, commitHash){
	      console.log(err, commitHash);
	      
			  console.dir(blobHash);
			  repo.loadAs("commit", commitHash, function(err, comittInfo){
			    console.log(comittInfo);
			  });
			  repo.loadAs("tree", treeHash, function(err, treeObject){
			    console.log(treeObject);
			  });
			  repo.loadAs("blob", blobHash, function(err, blobObject){
			    console.log(blobObject);
			  });

	      
	    });
	  });
	});

// UTF-8バイト配列を文字列に変換する
/*
	(function(arr) {
	    if (arr == null)
	        return null;
	    var result = "";
	    var i;
	    while (i = arr.shift()) {
	        if (i <= 0x7f) {
	            result += String.fromCharCode(i);
	        } else if (i <= 0xdf) {
	            var c = ((i&0x1f)<<6);
	            c += arr.shift()&0x3f;
	            result += String.fromCharCode(c);
	        } else if (i <= 0xe0) {
	            var c = ((arr.shift()&0x1f)<<6)|0x0800;
	            c += arr.shift()&0x3f;
	            result += String.fromCharCode(c);
	        } else {
	            var c = ((i&0x0f)<<12);
	            c += (arr.shift()&0x3f)<<6;
	            c += arr.shift() & 0x3f;
	            result += String.fromCharCode(c);
	        }
	    }
	    return result;
	})([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 10]);
*/

}