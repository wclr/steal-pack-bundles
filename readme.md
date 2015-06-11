# StealJS Bundles And Assets Packer

> Takes steal.build result and packs in flat way, adds hashes for cache bust.


### API:

gulp usage example
```javascript

gulp.task('build', function (done) {
    stealTools.build({
        main: 'app',
        bundlesPath: '../public/assets',
        config: 'client/package.json!npm'
    }, {
        bundleSteal: true
    }).then(packBundles({
        debug: true,
        root: 'public', // where to build, relative to cwd
        bundlesPath: 'assets', //where to put packed files, relative to root
        removeBaseURL: true,
        shortHash: true,
        keepName: true,
        removeFirstDirInName: true,
        indexTemplate: 'client/index.dist.html'
    })).then(done)
})

```

### Tests
> npm install (to install dev dependencies)
> npm install mocha -g (mocha should be installed globally)
> npm test