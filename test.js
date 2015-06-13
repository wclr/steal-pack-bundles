var packBundles = require('./index')
var fs = require('fs-extra')
var stealTools = require('steal-tools')
var expect = require('chai').expect

describe('Build and pack with steal bundled', function(){

    this.timeout(20000);



    describe('With no steal bundled', function(){

        var packedFiles

        fs.deleteSync('packed/index.html')
        fs.emptyDirSync('built/bundles')

        before(function(done){

            stealTools.build({
                config: 'app/package.json!npm', // test is baseURL
                main: "web/web",
                bundlesPath: '../built/bundles',
                bundle: [
                    'detached-module',
                    'components/detached-component'
                ]
            }, {
                //bundleSteal: true,
                minify: false,
                quiet: true
            }).then(packBundles({
                root: '', // relative to cwd
                emptyDir: true,
                packedDir: 'packed/assets', //relative to root
                shortHash: true,
                keepName: true,
                removeFirstDirInName: true,
                indexTemplate: 'app/index.dist.html',
                indexDest: 'packed/index.html'
            })).then(function(){

                fs.readdir('packed/assets', function(err, files){
                    //console.log('result', files)
                    packedFiles = files
                    done()
                })
            })
        })

        it('should have correct packed files amount', function(){
            expect(packedFiles.length).be.equal(6)
        })

        it('index exists', function(){
            expect(fs.existsSync('packed/index.html')).be.true
        })

    })

    describe('With steal bundled, no hashes', function(){

        var packedFiles

        fs.deleteSync('packed/index_bundled.html')
        fs.emptyDirSync('built/bundles_bundled')

        before(function(done){

            stealTools.build({
                config: 'app/package.json!npm', // test is baseURL
                main: "web/web",
                bundlesPath: '../built/bundles_bundled',
                bundle: [
                    'detached-module',
                    'components/detached-component'
                ]
            }, {
                bundleSteal: true,
                minify: false,
                quiet: true
            }).then(packBundles({
                root: '', // relative to cwd
                //debug: true,
                emptyDir: true,
                packedDir: 'packed/assets_bundled', //relative to root
                keepName: true,
                removeFirstDirInName: false,
                indexTemplate: 'app/index.dist.html',
                indexDest: 'packed/index_bundled.html'
            })).then(function(){

                fs.readdir('packed/assets_bundled', function(err, files){
                    packedFiles = files
                    done()
                })
            })
        })

        it('have correct packed files amount', function(){
            expect(packedFiles.length).be.equal(5)
        })

        it('index exists', function(){
            expect(fs.existsSync('packed/index_bundled.html')).be.true
        })

    })

});

