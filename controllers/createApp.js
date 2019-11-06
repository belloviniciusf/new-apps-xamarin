module.exports = function (app) {
    let _ = require('lodash'),   
        fs = require('fs'),      
        exec = require('child_process').execFile,
        nodeGit = require('nodegit'),            
        plist = require('plist'),  
        rimraf = require("rimraf"),          
        parser = require('fast-xml-parser'),
        defaultOptions = {
          attributeNamePrefix : "@_",
          attrNodeName: "@", //default is false
          textNodeName : "#text",
          ignoreAttributes : true,
          cdataTagName: "__cdata", //default is false
          cdataPositionChar: "\\c",
          format: false,
          indentBy: "  ",
          supressEmptyNode: false,
        },
        parserXml = new parser.j2xParser(defaultOptions),
        slugify = require('slugify'),            
        controller = {};    

    controller.createNewApp = async function (req, res) {                
        if (_.isEmpty(req.body.name)) return res.status(500).json({msg: `not requirements fields`});
        
        var appName = req.body.name;
        var identifier = slugify(_.lowerCase(req.body.name));            
        await cloneBranch();                                     
        await uploadImages(req.files);                                                
        // await parseInfoPlist(appName, identifier);
        // await parseIosCsproj(identifier);
        // await parseAndroidManifest(appName, identifier);
        // await modifyImages();        
        // await createImages();
        // await createBranchAndPush(identifier);
        // await removeTemporaryDirAndImages();
        res.send("Finished!");      
    };

    async function uploadImages(files) {
      return new Promise((resolve, reject) => {
          files.forEach((file) => {
            fs.writeFile(`./tmp/TitleClose/PackageBuildFiles/${file.originalname}`, file.buffer, (err) => {
              if (err) return reject(`error in save image ${err}`);              
              console.log(`image ${file.originalname} saved`);
            });
            resolve();
          });
      });
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
                  .then(() => {
                    console.log(`finish create branch and push`);
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
        let iOSPath = "./tmp/TitleClose/TitleClose.iOS/TitleClose.iOS.csproj";        
        const xmlData = fs.readFileSync(iOSPath).toString();
        var parsed = parser.parse(xmlData);                                              
        parsed.Project.PropertyGroup.forEach((propertyGroup) => {
            if (propertyGroup.IpaPackageName) {
                propertyGroup.IpaPackageName = `com.titleclose.${identifier}`;                    
            }
        });                          
        var xml = parserXml.parse(parsed);
        fs.writeFile(iOSPath, xml, function(err, data) {
            if (err) return reject({err: err, msg: `error in parse ios csproj`});                
            console.log('updated ios csproj!');
            resolve();                
          });                  
      });       
    };

    async function parseAndroidManifest(name, identifier){
      return new Promise((resolve, reject) => {        
        let androidPath = "./tmp/TitleClose/TitleClose.Droid/Properties/AndroidManifest.xml";
        const xmlData = fs.readFileSync(androidPath).toString();                
        var json = parser.parse(xmlData);                                              
        let manifest = json.manifest;
        manifest.package = `com.titleclose.${identifier}`;
        manifest.application['android:label'] = name;
        manifest['android:versionCode'] = "1";
        json.manifest = manifest;            
        var xml = parserXml.parse(json);
        fs.writeFile(androidPath, xml, function(err, data) {
            if (err) return reject({err, msg: `error in parse android manifest`});                
            console.log('updated androidmanifest!');
            resolve();
          });        
      });        
    }

    async function createImages(){
      return new Promise((resolve, reject) => {
        exec("./MobileTemplateBuilder.exe", function(err, data) {  
          if (err) return reject(`error in create images ${err}`);
          console.log(`succesfully create images ${data.toString()}`);                       
          resolve();                  
        });  
      });      
    }

    async function removeTemporaryDirAndImages(){      
      return new Promise((resolve) => {
        rimraf("./tmp/*", function (){
          rimraf("./images/*", function (){
            console.log("remove tmp images"); 
            resolve();
          });
        });        
      })
      
    }

    return controller;
};
