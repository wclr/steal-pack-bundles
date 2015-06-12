# StealJS Bundles And Assets Packer

> Takes steal.build result and packs in flat way, adds hashes for cache bust.


Packing everything to one separate folder can be useful in different scenarios, for example: 
    - if you want to separate strictly development code/assets (like images, fonts) from production ready (so you don't want to build bundles in the same folder where dev code is located)
    - if you are uploading assets to cdn 
    - you are packing it for mobile application


Pack Bundles addresses the following problems/lacks of StealJS:

1) There is definitely a certain lack of configuration flexibility in paths/bundlePath conventions. 
2) There is no way to add hashes to bundles for cache busting.
3) StealJS (steal-tools) does not handle any other assets aside from imported (statically or via `System.import`).  


### How it works and how to configure:

Assume you have the following structure
```
/client - folder of your client code
     /app.js - main application file
     /package.json - client app package.json
     /index.dist.html - template for production build
/public - folder where from you want to serve you production application
```

1) configure steal build task
  - as normal point to config file (package.json)
  - add `main` 
  - add other option like `bundle`
  - add bundlesPath - where steal.build will output built result (relative to "baseURL") - we actually don't need this files at all as we use in memory bundles result for packing, so this files should be deleted after build, 
  or we can put it in destination pack folder, so it will be emptied before pack.   
  
2) configure packBundles
        
How packBundles words:   
   - takes steal.build in-memory result (http://stealjs.com/docs/steal-tools.BuildResult.html)
   - adds hashes to bundles/assets names based of file content
        - set if you need hashes on files (`hash` or `shortHash` to `true`)
        - if you want to keep friendly name set `keepName` to `true`   
   - parses the source of main bundle and replaces path configuration for bundles
        - removes standard `System.paths["bundles/*.css"]` and `System.paths["bundles/*"]`
        - replaces with correct paths to load packed files
   - finds urls in CSS assets and puts it together with bundles replacing urls with new correct ones.
      
   - puts everything in `root` as destination folder 
        - set `bundlesPath` to put bundles and assets in `root/bundlesPath`
   - packs steal.production.js if needed using `packSteal` option 
   - handles `indexTemplate` index.html production template and puts result to `root`
        - finds assets urls in index template assets and puts it together with other packed bundles/assets
        - adds correct script tag to load packed app replacing `<!-- steal-pack-bundles -->` comment
          
   

```javascript

var stealTools = require('steal-tools')
var packBundles = require('steal-pack-bundles')

gulp.task('build', function (done) {
    stealTools.build({
        config: 'client/package.json!npm' // baseURL is now "client"
        main: 'app', // relative to baseURL
        bundlesPath: '../public/assets', // relative to baseURL, where files will be output
    }, {
        bundleSteal: true
    }).then(packBundles({
        root: 'public', //  relative to cwd, where to built files, this folder is supposed to be root of serving server / 
        bundlesPath: 'assets', //where to put packed files, relative to root        
        shortHash: true, // addes short (8 symbols) hashes
        keepName: true, // keeps original names in place
        removeFirstDirInName: true, // pack bundles flattens built file structure by adding for example "components-" prefix, so you can remove first dir name
        indexTemplate: 'client/index.dist.html' // path to index.html template, relative to cwd, handles template and puts it to root/index.html
    })).then(done)
})

```

### Tests
> npm install (to install dev dependencies)

> npm install mocha -g (mocha should be installed globally)

> npm test

to test built start web server that will server public directory