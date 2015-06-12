# StealJS Bundles And Assets Packer

> Takes steal.build result and packs in flat way, adds hashes for cache bust.

> StealJS is great tool but is has some o


### API:

Suppose you have the following structure
```
/client - folder of your client code
     /app.js - main application file
/pubclic - folder where you want to build your app
```

gulp usage example
```javascript


gulp.task('build', function (done) {
    stealTools.build({
        config: 'client/package.json!npm' // baseURL is now "client"
        main: 'app', // relative to baseURL
        bundlesPath: '../public/assets', // relative to baseURL
    }, {
        bundleSteal: true
    }).then(packBundles({
        debug: true,
        root: 'public', // where to build, relative to cwd
        bundlesPath: 'assets', //where to put packed files, relative to root
        
        shortHash: true,
        keepName: true,
        removeFirstDirInName: true, // pack bundles flattens bunild file structure by adding for example "components-" prefix, so you can remove first dir name
        indexTemplate: 'client/index.dist.html' // handles template puts to root/index.html
    })).then(done)
})

```

### Options
removeBaseURL - removes baseURL from source

### index.html template

### Tests
> npm install (to install dev dependencies)
> npm install mocha -g (mocha should be installed globally)
> npm test
