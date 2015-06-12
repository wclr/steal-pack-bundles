var packBundles = require('./index')
var fs = require('fs-extra')
var stealTools = require('steal-tools')
var expect = require('chai').expect

describe('Build and pack with steal bundled', function(){

    this.timeout(20000);

    var packedFiles

    before(function(done){

        stealTools.build({
            config: 'test/package.json!npm', // test is baseURL
            main: "app/app",
            bundlesPath: '../public/built',
            //bundlesPath: __dirname + '/build/bundles',
            bundle: [
                'detached-module',
                'components/detached-component'
            ]
        }, {
            //bundleSteal: true,
            minify: false
        }).then(packBundles({
            root: 'public', // relative to cwd
            emptyDir: true,
            bundlesPath: 'assets', //relative to root
            shortHash: true,
            keepName: true,
            //removeFirstDirInName: true,
            packSteal: true,
            indexTemplate: 'test/index.dist.html'
        })).then(function(){

            fs.readdir('public/assets', function(err, files){
                //console.log('result', files)
                packedFiles = files
                done()
            })
        })
    })

    it('should clean up dir', function(){
        expect(packedFiles.length).be.equal(5)
    })


});