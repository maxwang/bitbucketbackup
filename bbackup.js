var username = 'mwang@1080agile.com',
    password = 'sms20151120',
    bbusername = 'mwang2015',
    baseUrl = 'https://api.bitbucket.org/2.0/repositories/',
    backupFolder = 'C:\\temp\\backup\\';

var exec = require('child_process').exec;
var Client = require('node-rest-client').Client;
var moment = require('moment');
var fs = require('fs-extra');
var fsSimple = require('fs');
var path = require('path');
var archiver = require('archiver');

// configure basic http auth for every request 
var options_auth = { user: username, password: password };
var client = new Client(options_auth);

function BackupRepository(bbRepository) {
    
    var cloneUrl = bbRepository.links.clone[0].href,
        atPosition = cloneUrl.indexOf("@"),
        rightNow = new Date(),
        res = rightNow.toISOString().slice(0,10).replace(/-/g,""),
        res2 = moment().format('YYYYMMDD'),
        archive = archiver('zip'),
        bbfolder= bbRepository.full_name.replace("/", "_"),
        command ="git clone " + cloneUrl.substr(0, atPosition) + ":"  + password + cloneUrl.substr(atPosition) + " " + backupFolder + res + "\\" +bbfolder;
    
    exec(command, (error, stdout, stderr) => {
        
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        
        console.log(`stdout: ${stdout}`);
        console.log(`stderr: ${stderr}`);

        var zipFileName = backupFolder + res + "\\" + bbfolder + ".zip",
            zipFile = fsSimple.createWriteStream(zipFileName);
        
        console.log('zip to:' + zipFileName);

        zipFile.on('close', function() {
            console.log(archive.pointer() + ' total bytes');
            console.log('archiver has been finalized and the output file descriptor has closed.');
            fs.removeSync(backupFolder + res + "\\" + bbfolder);
        });

        archive.on('error', function(err) {
            throw err;
        });

        archive.pipe(zipFile);

        archive.bulk([
        { expand: true, cwd: backupFolder + res + '\\'+bbfolder, src: ['**'] }
        ]);

        archive.finalize();

    });
}

function ReadRepositories(url) {
    client.get(url, function(data, response) {
        var repositories = data.values;
        for(var i=0, loopCount = repositories.length; i < loopCount; i++) {
            BackupRepository(repositories[i]);
        }
        if(data.next) {
            ReadRepositories(data.next);
        }
    });
}

function RemoveOldBackupFolders(srcpath) {
        
    return fs.readdirSync(srcpath).filter(function(file) {
        var filePath = path.join(srcpath, file),
            fsStat = fs.statSync(filePath),
            today = moment(),
            fsTime = moment(fsStat.mtime),
            diff = today.diff(fsTime, 'days');
            
        if(fsStat.isDirectory() && diff > 6) {
            console.log('start deleting ' + filePath);
            fs.removeSync(filePath);
        }
    });
}

// ReadRepositories(baseUrl + bbusername);
ReadRepositories(baseUrl + "?role=member");

RemoveOldBackupFolders(backupFolder);