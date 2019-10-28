module.exports = function (app) {
    let _ = require('lodash'),   
        fs = require('fs'),      
        exec = require('child_process').execFile,
        nodeGit = require('nodegit'),            
        plist = require('plist'),    
        slugify = require('slugify'),            
        controller = {};    

    controller.createNewApp = async function (req, res) {
      if (_.isEmpty(req.body.name)) return res.status(500).json({msg: `not requirements fields`});
      
      var appName = req.body.name;
      var identifier = slugify(_.lowerCase(req.body.name));                  
      await cloneBranch();                                                                       
      // await parseInfoPlist(appName, identifier);
      // await parseIosCsproj(identifier);
      // await parseAndroidManifest(appName, identifier);
      // await createImages();
      await createBranchAndPush(identifier);
      res.send("Finished!");
    };

    async function createBranchAndPush(identifier) {
        try {                                    
            let oid;
                                            
            nodeGit.Repository.open('./tmp')
              .then((repo) => {          
                return repo.getHeadCommit()
                  .then(function(commit) {                                                        
                    return repo.createBranch(
                      identifier,
                      commit,
                      0)
                  })
                  .then(() => {              
                    return repo.checkoutBranch(identifier);                    
                  })                        
                  .then(() => {
                    return repo.refreshIndex();
                  })
                  .then((index) => {
                    return index.addAll('.').then(() => { return index.write()}).then(() => { return index.writeTree()});
                  })
                  .then((oidResult) => {
                    oid = oidResult;
                    return nodeGit.Reference.nameToId(repo, "HEAD");
                  })
                  .then((head) => {
                    return repo.getCommit(head);
                  })
                  .then((parent) => {            
                    var author = nodeGit.Signature.now("Vinícius Belló",
                      "bello.viniciusf@gmail.com");
                    var committer = nodeGit.Signature.now("Vinícius Belló",
                      "bello.viniciusf@gmail.com");              
                    return repo.createCommit("HEAD", author, committer, "first commit", oid, [parent]);              
                  })
                  .then(() => {                         
                    nodeGit.Remote.lookup(repo, "origin")
                      .then((remote) => {
                        return remote.push([`refs/heads/${identifier}:refs/heads/${identifier}`],
                        {
                          callbacks: {
                            credentials: function(url, userName) {
                              return nodeGit.Cred.sshKeyFromAgent(userName);
                            }
                          }
                        })
                      })
                      .catch((err) => {
                        console.log(`error in push branch ${err}`);
                      })                                
              })
              .catch((err) => {
                console.log(`error in open repository ${err}`);
              })        
            })                          
        } catch (error) {
            throw error;
        }        
    };

    async function cloneBranch(){
      try {        
          const USER = 'viniciusbello';
          const PASS = 'carteira3030';
          const REPO = "bitbucket.org/viniciusbello/new-big-titleclose-mobile.git"                      
          const remote = `https://${USER}:${PASS}@${REPO}`;          
        
          await nodeGit.Clone(remote, './tmp')
            .then(() => {                
              console.log(`succesfully clone branch`);
              return;
            })
            .catch((err) => {
              console.log(`failed ${err}`);
            });                                                
      } catch (error) {
        throw error;
      }
    };

    async function parseInfoPlist(name, identifier){
      return new Promise((resolve, reject) => {
        var plistObj = plist.parse(fs.readFileSync('./tmp/TitleClose/TitleClose.iOS/Info.plist', 'utf8'));
        plistObj['CFDisplayName'] = name;
        plistObj['CFBundleDisplayName'] = name;        
        plistObj['CFBundleIdentifier'] = `com.titleclose.${identifier}`;
        var result = plist.build(plistObj);
        fs.writeFile('./tmp/TitleClose/TitleClose.iOS/Info.plist', result, (err) => {
            if (err) return reject({err: err, msg: `error in parse infoplist`});
            console.log(`updated infoplist`);
            resolve();
        })                 
      })
    };

    async function parseIosCsproj(identifier){
      return new Promise((resolve, reject) => {
        var parser = require('xml2json');
        let iOSPath = "./tmp/TitleClose/TitleClose.iOS/TitleClose.iOS.csproj";
        fs.readFile(iOSPath, function(err, data) {
            var json = JSON.parse(parser.toJson(data, {reversible: true}));
            json.Project.PropertyGroup.forEach((propertyGroup) => {
                if (propertyGroup.IpaPackageName) {
                    propertyGroup.IpaPackageName = `com.titleclose.${identifier}`;                    
                }
            });  
            var stringified = JSON.stringify(json);
            var xml = parser.toXml(stringified);
            fs.writeFile(iOSPath, xml, function(err, data) {
                if (err) return reject({err: err, msg: `error in parse ios csproj`});                
                console.log('updated ios csproj!');
                resolve();                
              });          
        });
      });       
    };

    async function parseAndroidManifest(name, identifier){
      return new Promise((resolve, reject) => {
        var parser = require('xml2json');
        let androidPath = "./tmp/TitleClose/TitleClose.Droid/Properties/AndroidManifest.xml";
        fs.readFile(androidPath, function(err, data) {
            var json = JSON.parse(parser.toJson(data, {reversible: true}));
            let manifest = json.manifest;
            manifest.package = `com.titleclose.${identifier}`;
            manifest.application['android:label'] = name;
            manifest['android:versionCode'] = "1";
            json.manifest = manifest;
            var stringified = JSON.stringify(json);
            var xml = parser.toXml(stringified);
            fs.writeFile(androidPath, xml, function(err, data) {
                if (err) return reject({err, msg: `error in parse android manifest`});                
                console.log('updated androidmanifest!');
                resolve();
              });
        });
      });        
    }

    async function createImages(){
      exec("./MobileTemplateBuilder.exe", function(err, data) {  
        if (err) console.log(`error in create images ${err}`);
        console.log(data.toString());                       
        return;
      });  
    }

    return controller;
};