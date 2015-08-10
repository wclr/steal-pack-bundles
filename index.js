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

    if(/^data:/.test(url) || /^https?:\/\//.test(url)){
        return url
    }

    var absolute = false

    if (url[0] == '/') {
        absolute = true
        url = url.slice(1)
    }

    var base = absolute ? path.resolve(options.base, options.assetsBase || '') : srcDir

    if (options.debug){
        console.log('packUrlAsset', 'url', url, 'srcDir', srcDir, 'destDir',  destDir, 'base', base)
    }

    var filePath = path.resolve(base, url)

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
        assetDestDir = options.packedDir

    var rootPath = absolute ? path.join(options.base, options.root) : destDir

    if (!putFilePath){
        var data = fs.readFileSync(filePath),
            fileName = path.basename(filePath)

        if (options.hash || options.shortHash){
            fileName = hashName(fileName, data, options)
        }

        // join or resolve?
        putFilePath = path.resolve(assetDestDir, fileName)

        console.log('Saving asset:', path.relative(rootPath, putFilePath))
        fs.outputFileSync(putFilePath, data)

        options.packedAssets[filePath] = putFilePath
    }

    var cutIndex = rootPath.length + (absolute ? 0 : 1),
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
        destPath = path.resolve(options.base, options.root, options.indexDest || 'index.html'),
        templateDir = path.dirname(templatePath)

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


        var destDir = path.dirname(destPath)
        var newUrl = packUrlAsset(url, templateDir, destDir, options)

        return newUrl ? [attr, '=', quote, newUrl].join('') : orgUrl
    })


    var main = bundles[0]

    indexData = indexData.replace(/<!--\s?steal-pack-bundles\s?-->/,
        ['<script src="', '/' + options.bundlesPath + '/' +
            (options.packedSteal || main.fileName), '"',
            options.packedSteal
                ?  ' data-main="' + main.fileName.replace(/\.js$/, '') + '"'
                : '',
            ' data-bundles-path="."></script>'].join('')
    )

    indexData = indexData.replace(/<!--\s?content:(.*?)\s?-->/g, function(whole, url){
        var filePath = path.resolve(templateDir, url)

        console.log('replace content', filePath)
        if (fs.existsSync(filePath)){
            return fs.readFileSync(filePath, 'utf-8')
        } else {
            console.warn('No file for content replacement:', filePath)
        }
        return whole
    })

    console.log('Saving index:', options.indexDest || 'index.html')
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

        var newUrl = packUrlAsset(url, srcDir, options.packedDir, options)

        return newUrl ? 'url(' + newUrl + ')' : orgUrl
    })
}

var makePackBundles = function(options){
    return function(buildResult){
        return new Promise(function(resolve){
            packBundles(buildResult, options)
            resolve(buildResult)
        })
    }
}
var _packBundles = function(bundles, options){

    var main = bundles[0]
    var putDir = options.packedDir

    // remove default bundles path
    main.source = main.source.replace(/System\.paths\["bundles\/.*?\n/g, '')

    if (options.removeBaseURL){
        main.source = main.source.replace(/baseURL:"[^"]+",?/g, '')
    }

    var saveBundle = function(bundle){

        var isJs = bundle.buildType == 'js'

        var fileName = bundle.name.slice('bundles/'.length).replace(/![^\.\s]*$/, '') + (isJs ? '.js' : '')

        var bundleDir = path.dirname(fileName)
        fileName = path.basename(fileName)

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
        console.log('Saving bundle:', bundle.name, '-->', fileName)

        var filePath = path.join(putDir, fileName)


        fs.outputFileSync(filePath, bundle.source)

        bundle.newName = 'bundles/' + (isJs ? fileName.replace(/\.js$/, '') : fileName + '!')
        bundle.fileName = fileName
        bundle.filePath = filePath

        return bundle.newName
    }

    bundles.forEach(function(bundle, i){

        var bundleRelativeDir = path.dirname(bundle.name.slice('bundles/'.length)),
            originalDir = path.resolve(options.builtDir || putDir, bundleRelativeDir)

        // skip main bundle
        if (i === 0) return

        if (bundle.buildType == 'css'){
            bundle.source = packCssAssets(bundle.source, originalDir, options)
        }
        var newName = saveBundle(bundle)
        main.source = main.source.replace('"' + bundle.name + '"', '"' + newName + '"')
    })

    if (options.packedSteal && main.name !== main.newName){
        var mainName = main.name.slice('bundles/'.length)
        //main.source += "System.import('package.json!npm').then(function() {System.import('" + mainName+ "');});"
        main.source += "\nsteal.import('" + mainName+ "');"
        //main.source = main.source.replace(new RegExp("define\\('"  + mainName.replace('/', '\\/') +  "'"), "define('" + main.newName + "'")
    }

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
            fs.outputFileSync(options.packedDir + '/' + name, data)
            options.packedSteal = name
            return false
        }
    })
}

var packBundles = function(buildResult, options) {

    if (typeof options == 'undefined') {
        return makePackBundles(buildResult)
    } else {

        console.log('Steal Pack Bundles started...')

        var bundles = buildResult.bundles || buildResult // steal bug
        bundles.forEach(function(bundle) {
            bundle.source = bundle.source.code || bundle.source
        })

        var loader = buildResult.loader

        // TODOL: replace bundlesPath API with packedDir
        options.bundlesPath = options.bundlesPath || options.packedDir

        if (loader){
            options.builtDir = options.builtDir
                || path.join( loader.baseURL.replace('file:', ''), loader.bundlesPath)
        }

        options.base = path.resolve(options.base || '')

        var packedDir = options.packedDir = path.resolve(options.base, options.root, options.bundlesPath)

        console.log('Packing assets to', packedDir)

        if (options.emptyDir){
            console.log('Cleaning directory')
            fs.emptyDirSync(packedDir)
        }

        if (!options.packSteal){
            // TODO: replace with correct detection if steal is bundled
            var stealIndex = bundles[0].source.indexOf('steal =')
            options.packSteal = !(stealIndex > 0 && stealIndex < 100)
        }

        if (options.packSteal){
            packSteal(options)
        }

        _packBundles(bundles, options)
    }
}

module.exports = packBundles