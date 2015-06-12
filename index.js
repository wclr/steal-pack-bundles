var path = require('path')
var fs = require('fs-extra')

var hashName = function(fileName, data, options){
    var crypto = require('crypto')

    var hash = crypto.createHash('md5').update(data).digest('hex'),
        ext = path.extname(fileName)
    if (options.shortHash){
        hash = hash.substring(0, 8)
    }
    if (options.keepName){
        var sep = typeof keepName == 'string' ? options.keepName : '-'
        return path.basename(fileName, ext) + sep + hash + ext
    } else {
        return hash + ext
    }
}

var packUrlAsset = function(url, srcDir, destDir, options){

    if(/^data:/.test(url)){
        return url
    }

    if (options.debug){
        console.log('packUrlAsset', url, srcDir, destDir)
    }

    var absolute = false

    if (url[0] == '/') {
        absolute = true
        url = url.slice(1)
    }

    //resolve file path relative to assets dest ??

    var base = absolute ? path.resolve(options.base, options.assetsBase || '') : srcDir

    var filePath = path.resolve(base, url)
    //console.log('packUrlAssets', url, absolute, base, filePath)

    // for handling assets like somefont.eot?#iefix
    var fileNameAppendix = filePath.match(/[?#]+.*$/) || ''
    if (fileNameAppendix){
        fileNameAppendix = fileNameAppendix[0]
        filePath = filePath.substring(0, filePath.length - fileNameAppendix.length)
    }

    if (!fs.existsSync(filePath)){
        console.warn('packCssAssets file', filePath, 'does not exist')
        return
    }

    options.packedAssets = options.packedAssets || {}

    var putFilePath = options.packedAssets[filePath],
        assetDestDir = options.bundlesDir

    if (!putFilePath){
        var data = fs.readFileSync(filePath),
            fileName = path.basename(filePath)

        if (options.hash || options.shortHash){
            fileName = hashName(fileName, data, options)
        }

        // join or resolve?
        putFilePath = path.resolve(assetDestDir, fileName)

        fs.outputFileSync(putFilePath, data)

        options.packedAssets[filePath] = putFilePath
    }

    var rootPath = absolute ? path.join(options.base, options.root) : destDir,
        cutIndex = rootPath.length + (absolute ? 0 : 1),
        newUrl = putFilePath.substring(cutIndex).replace(/\\/g, '/') + fileNameAppendix

    return newUrl
}

var packIndex = function(bundles, options){

    if (!options.indexTemplate) return

    var templatePath = path.resolve(options.base, options.indexTemplate)

    if (!fs.existsSync(templatePath)){
        console.error('indexTemplate at', templatePath, 'does not exist')
        return
    }

    var template = fs.readFileSync(templatePath, options.indexEcoding || 'utf-8'),
        destPath = path.resolve(options.base, options.root, options.indexDest || 'index.html')

    var indexData = template.replace(/(href|src)=("|')([^"']+)/ig, function(orgUrl, attr, quote, url){
        url = url.trim()

        if (url.indexOf('http') === 0){
            return orgUrl
        }

        if (attr == 'src' && url.match(/bundles\/main/)){
            var main = bundles[0]

            var mainBundleUrl = options.bundlesPath + '/' + main.fileName,
                bundlesPath = '.'

            if (url[0] == '/'){
                mainBundleUrl = '/' + mainBundleUrl
            }

            return [
                attr, '=', quote, mainBundleUrl,
                bundlesPath ? (quote + ' bundles-path=' + quote + bundlesPath) : ''
            ].join('')

        }

        var templateDir = path.dirname(templatePath)
        var destDir = path.dirname(destPath)
        var newUrl = packUrlAsset(url, templateDir, destDir, options)

        return newUrl ? [attr, '=', quote, newUrl].join('') : orgUrl
    })


    var main = bundles[0]

    indexData = indexData.replace(/<!-- steal-pack-bundles -->/,
        ['<script src="', '/' + options.bundlesPath + '/' +
            (options.packedSteal || main.fileName), '"',
            options.packedSteal
                ?  ' data-main="' + main.fileName.replace(/\.js$/, '') + '"'
                : '',
            ' data-bundles-path="."></script>'].join('')
    )

    fs.outputFileSync(destPath, indexData)
}

var packCssAssets = function(source, srcDir, options){

    return source.replace(/url\([^)]*?\)/ig, function(orgUrl){

        // steal still fucks up with windows paths
        orgUrl = orgUrl.replace(/\\/, '/')

        var url = orgUrl.substring(4, orgUrl.length - 1).replace(/["']/g, '').trim()

        if (url.indexOf('data:') === 0){
            return orgUrl
        }

        var newUrl = packUrlAsset(url, srcDir, options.bundlesDir, options)

        return newUrl ? 'url(' + newUrl + ')' : orgUrl
    })
}

var makePackBundles = function(options){
    return function(bundles){
        return new Promise(function(resolve){
            // timeout to ensure built bundles free before removal
            //setTimeout(function(){
            packBundles(bundles, options)
            resolve(bundles)
            //}, 100)
        })
    }
}
var _packBundles = function(bundles, options){

    var main = bundles[0]
    var putDir = options.bundlesDir

    main.source = main.source.replace(/System\.paths\["bundles\/.*?\n/g, '')

    if (options.removeBaseURL){
        main.source = main.source.replace(/baseURL:"[^"]+",?/g, '')
    }

    var saveBundle = function(bundle){

        var isJs = bundle.buildType == 'js'

        var fileName = bundle.name.slice('bundles/'.length).replace(/![^\.\s]*$/, '') + (isJs ? '.js' : '')

        var bundleDir = path.dirname(fileName)
        fileName = path.basename(fileName)

        if (options.debug){
            console.log('packBundles bundle', bundle.name, bundleDir, fileName)
        }

        if (bundleDir !== '.'){
            var bundleDirParts = bundleDir.split('/')
            if (options.removeFirstDirInName){
                bundleDirParts.shift()
            }
            bundleDirParts.push(fileName)
            fileName = bundleDirParts.join('-')
        }

        if (options.hash || options.shortHash){
            fileName = hashName(fileName, bundle.source, options)
        }

        var filePath = path.join(putDir, fileName)

        if (options.debug){
            console.log('save bundle', bundle.name, filePath)
        }

        fs.outputFileSync(filePath, bundle.source)

        bundle.newName = 'bundles/' + (isJs ? fileName.replace(/\.js$/, '') : fileName + '!')
        bundle.fileName = fileName
        bundle.filePath = filePath

        return bundle.newName
    }

    bundles.forEach(function(bundle, i){

        bundle.orginalDir = path.resolve(putDir, path.dirname(bundle.name.slice('bundles/'.length)))

        // skip main bundle
        if (i === 0) return

        if (bundle.buildType == 'css'){
            bundle.source = packCssAssets(bundle.source, bundle.orginalDir, options)
        }
        var newName = saveBundle(bundle)
        main.source = main.source.replace(bundle.name, newName)
    })

    if (options.packedSteal && main.name !== main.newName){
        var mainName = main.name.slice('bundles/'.length)
        main.source += "System.import('package.json!npm').then(function() {System.import('" + mainName+ "');});" }

    saveBundle(main)

    packIndex(bundles, options)

}

var packSteal = function(options){
    var paths = ['node_modules/steal-tools/node_modules/steal/steal.production.js', 'node_modules/steal/steal.production.js']

    if (typeof options.packSteal == 'string'){
        paths.unshift(options.packSteal)
    }

    paths.every(function(p){
        if (fs.existsSync(p)){
            var data = fs.readFileSync(p)
            var name = hashName (p, data, options)
            fs.outputFileSync(options.bundlesDir + '/' + name, data)
            options.packedSteal = name
            return false
        }
    })
}

var packBundles = function(bundles, options) {

    if (typeof options == 'undefined') {
        return makePackBundles(bundles)
    } else {

        bundles = bundles.bundles || bundles // bug
        bundles.forEach(function(bundle) {
            bundle.source = bundle.source.code || bundle.source
        })

        options = (options instanceof Array) ? options : new Array(options)

        options.forEach(function(opts) {

            opts.base = opts.base || process.cwd()

            var putDir = opts.bundlesDir = path.resolve(opts.base, opts.root, opts.bundlesPath)

            if (opts.emptyDir){
                fs.emptyDirSync(putDir)
            }

            if (opts.packSteal){
                packSteal(opts)
            }

            _packBundles(bundles, opts)

        })
    }
}


module.exports = packBundles