'use strict';
const path = require('path');
const npminstall = require('npminstall')
const pkgDir = require('pkg-dir').sync
const fse = require('fs-extra')
const pathExists = require('path-exists').sync
const { isObject } = require('@flashp-dev/utils')
const formatPath = require('@flashp-dev/format-path')
const { getDefaultRegistry, getNpmLatestVersion } = require('@flashp-dev/get-npm-info');
const { log } = require('../../../utils/log/lib');
class Package {
    constructor(options) {

     if (!options || !isObject(options)) {
            throw new Error('Package的options参数不能为空')
    }
      this.targetPath = options.targetPath

      this.packageName = options.packageName

      this.packageVersion = options.packageVersion

      this.storeDir = options.storeDir
    }

    async prepare() {
        if (this.storeDir && !pathExists(this.storeDir)) {
            fse.mkdirpSync(this.storeDir)
        }
        if (this.packageVersion === 'latest') {
            this.packageVersion = await getNpmLatestVersion(this.packageName)
        }
    }
    //判断当前package 是否存在
    async exists(){
        if (this.storeDir) {
            await this.prepare()
            return pathExists(this.cacaheFilePath)
        }else {
             return pathExists(this.targetPath)
        }
    }

    //安装package
    async install() {
      await this.prepare()
       return npminstall({
            root: this.targetPath,
            storeDir: this.storeDir,
            registry: getDefaultRegistry(),
            pkgs:[
                {
                    name: this.packageName,
                    version: this.packageVersion
                }
            ]
        })
    }

    //更新package
    async update() {
        await this.prepare()
        const lastestPackageVersion = await getNpmLatestVersion(this.packageName)
        const latestFilePath = this.getSpecificCacheFilePath(lastestPackageVersion)
       if (!pathExists(latestFilePath)) {
        await npminstall({
            root: this.targetPath,
            storeDir: this.storeDir,
            registry: getDefaultRegistry(),
            pkgs:[
                {
                    name: this.packageName,
                    version: lastestPackageVersion
                }
            ]
        })
       }
       this.packageVersion = lastestPackageVersion
    }

    getRootFilePath() {
        function _getRootFilePath(targetPath) {
            const dir = pkgDir(targetPath)
            if (dir) {
                const pkgFile = require(path.join(dir, 'package.json'))
                if(pkgFile && pkgFile.main){
                    return formatPath(path.resolve(dir, pkgFile.main)) 
                }
            }
    
            return null
        }
      if (this.storeDir) {
        return _getRootFilePath(this.cacaheFilePath)
      }else{
       return  _getRootFilePath(this.targetPath)
      }
    }

    // .store/@imooc-cli+init@1.0.1/node_modules/@imooc-cli/init
    //.store/flashp-dev-template-vue3@1.0.0/node_modules/flashp-dev-template-vue3
    get cacaheFilePath() {
        if (this.packageName.indexOf('/') !== -1) {
            return path.resolve(this.storeDir, `.store/${this.packageName.split('/').shift()}+${this.packageName.split('/').pop()}@${this.packageVersion}/node_modules/${this.packageName}`)
        }else{
            return path.resolve(this.storeDir, `.store/${this.packageName}@${this.packageVersion}/node_modules/${this.packageName}`)
        }
    }

    getSpecificCacheFilePath(packageVersion) {
     if (packageVersion.indexOf('/') !== -1) {
        return path.resolve(this.storeDir, `.store/${this.packageName.split('/').shift()}+${this.packageName.split('/').pop()}@${packageVersion}/node_modules/${this.packageName}`)
     }else{
        return path.resolve(this.storeDir, `.store/${this.packageName.split('/').shift()}@${packageVersion}/node_modules/${this.packageName}`)
     }
    }
}


module.exports = Package;