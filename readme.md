# StealJS Bundles And Assets Packer

> Takes steal.build result and packs all files including images from css, adds hashes to files for cache bust.
> Useful for different distribution scenarios that require fully packed apps: Web/CDN, Mobile, Chrome Apps, etc.

### Example:
       
   

```javascript

var stealTools = require('steal-tools')
var packBundles = require('steal-pack-bundles')

gulp.task('build', function (done) {
    stealTools.build({
        config: 'app/package.json!npm' // baseURL is now "client"
        main: 'app', // relative to baseURL
        bundlesPath: '../public/assets', // relative to baseURL, where files will be output
    }, {
        bundleSteal: true
    }).then(packBundles({
        root: 'public', // location (relative to cwd), where to built files, this folder is supposed to be public root of http server. 
        packedDir: 'assets', // where to put packed files, relative to root 
        // bundlesPath: the same as packedDir
        shortHash: true, // adds short (8 symbols) hashes
        keepName: true, // keeps original names in place (if `false` there will be only hashes)
        baseUrl: "/some", // will set this value to baseURL of steal, deafult is "/", empty string will not set baseURL at all
        removeFirstDirInName: true, // will shorten result files names 
        indexTemplate: 'index.dist.html' // path to index.html template (relative to cwd), handles template and puts it to {root}/index.html
        indexDest: 'some/other.html' // alternative ath and name of index.html (relative to root), 
    })).then(done)
})

```

### Tests
> npm install (to install dev dependencies)

> npm install mocha -g (mocha should be installed globally)

> npm test

Test will build and pack test application to `packed` folder. 

to test built application, start web server that will serve root directory

> harp server

access:

`http://localhost:9000` - page with links to all links

`http://localhost:9000/app/index.html` - dev app

`http://localhost:9000/packed/index.html` - packed app without steal bundled
`http://localhost:9000/packed/index_bundled.html` - packed app with steal bundled

`http://localhost:9000/built/index.html` - steal built app without steal bundled
`http://localhost:9000/built/index_bundled.html` - steal built app with steal bundled
