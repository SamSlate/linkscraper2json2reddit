const fs = require('fs');
const path = require('path');

// create files for testing purposes
function createFiles(num) {
	// make some JSON
	let tempObj = [];
	for (let i = 0; i < 500; i++) {
		let temp = {};
		temp.a = Math.random();
		temp.b = Math.random();
		temp.c = Math.random();
		temp.d = Math.random();
		temp.e = Math.random();
		tempObj.push(temp);
	}
	let tempJSON = JSON.stringify(tempObj);
	for (let i = 0; i < num; i++) {
		fs.writeFileSync(path.join(__dirname, "jsonTemp", `file${i}.json`), tempJSON);
	}
}

// read files, modify them, save them
function readAndWrite(num, doneFn) {
    let doneCnt = 0;
    
    function checkDone() {
        if (doneCnt === num) {
            doneFn();
        }
    }
    
	for (let i = 0; i < num; i++) {
		let fname = path.join(__dirname, "jsonTemp", `file${i}.json`)
		let t1 = Date.now();
		fs.readFile(fname, function(err, data) {
			console.log(`read t = ${Math.round((Date.now() - t1))}`);
			if (err) {
				console.log('fs.readFile() error', err);
                ++doneCnt;
                checkDone();
			} else {
				// modify object and write it
				try {
					let obj = JSON.parse(data);
					for (let o of obj) {
						o.a++;
						o.b++;
						o.c++;
						o.d++;
						o.e++;
					}
					let t2 = Date.now();
					fs.writeFile(fname, JSON.stringify(obj), function(err) {
						console.log(`write t = ${Math.round((Date.now() - t2))}`);
                        if (err) {
                            console.log('fs.writeFile() error', err);
                        }
                        ++doneCnt;
                        checkDone();
					});
				} catch(e) {
					console.log('Error parsing JSON', e);
                    ++doneCnt;
                    checkDone();
				}
			}
		});
	}
}

let num = 100;
// create test files (sub-directory jsonTemp must already exist)
createFiles(num);

// read and write to each of those files
let t = Date.now();
readAndWrite(num, function() {
    console.log(`All done: t = ${Date.now() - t}`);
});