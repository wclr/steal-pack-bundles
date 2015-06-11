var packBundles = require('./index')
var fs = require('fs-extra')
var stealTools = require('steal-tools')
var expect = require('chai').expect

console.log('here')

describe('Build and pack with steal bundled', function(){

    this.timeout(20000);

    var packedFiles

    before(function(done){

        fs.emptyDirSync('test/build');

        stealTools.build({
            config: 'test/package.json!npm',
            main: "app",
            bundlesPath: __dirname + '/build/bundles',
            bundle: [
                'app',
                'detached-module'
            ]
        }, {
            bundleSteal: true
        }).then(packBundles({
            debug: true,
            root: 'build', // relative to cwd
            bundlesPath: 'bundles', //relative to root
            shortHash: true,
            keepName: true,
            removeFirstDirInName: true
            //indexTemplate: 'web/index.dist.html'
        })).then(function(){

            fs.readdir('build/bundles', function(err, files){
                packedFiles = files
                console.log('result', files)
                done()
            })
        })
    })

    it('should clean up dir', function(){
        expect(packedFiles.indexOf('app.js')).be.equal(-1)
    })

});