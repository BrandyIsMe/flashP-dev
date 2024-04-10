'use strict';

module.exports = exec;
const path = require('path');
const cp = require('child_process')
const Package = require('@flashp-dev/package')
const log = require('@flashp-dev/log')
const Settings = {
    init:"@flashp-dev/init"
}
const CACHE_DIR = 'dependencies'
let pkg;


async function exec() {
    let targetPath = process.env.CLI_TARGET_PATH
    let storeDir = ''
    const homePath = process.env.CLI_HOME_PATH
    const comObj = arguments[arguments.length - 1]
    const cmdName = comObj.name()
    const packageName = Settings[cmdName]
    const packageVersion = 'latest'
    if (!targetPath) {
        targetPath = path.resolve(homePath, CACHE_DIR)
        storeDir  = path.resolve(targetPath, 'node_modules')
        pkg =  new Package({
            targetPath,
            packageName,
            packageVersion,
            storeDir
        })

        if (await pkg.exists()) {
            //更新package
            pkg.update()
        }else{
            //安装package
           await pkg.install()
        }
    }else{
        pkg = new Package({
            targetPath,
            packageName,
            packageVersion,
        })
   }

   const rootFile = pkg.getRootFilePath()
   if (rootFile) {
       try {
        const argv =  Array.from(arguments)
        const cmd = argv[argv.length - 1]
        cmd.force = cmd.opts().force
        cmd.debug = cmd.parent.opts().debug
        const o = Object.create(null)
        Object.keys(cmd).forEach(key=>{
            if (cmd.hasOwnProperty(key) && !key.startsWith('_')  && key !== 'parent') {
                o[key] = cmd[key]
            }
        })
        argv[argv.length - 1] = o
        const code = `require('${rootFile}').call(null, ${JSON.stringify(argv)})`;
        const child = spawn('node', ['-e', code],{
            cwd:process.cwd(),
            stdio: 'inherit',
        })

        child.on('error',(e) => {
            log.error(e.message)
            process.exit(1)
        })

        child.on('exit',(e) => {
            log.verbose('成功' + e)
            process.exit(e)
        })
        
       } catch (error) {
        log.error(error.message)
       }
   }
}


function spawn(command, args, options) {
    const win32 = process.platform === 'win32' 

    const cmd = win32 ? 'cmd' : command

    const cmdArgs = win32 ? ['/c'].concat(command, args) : args


    return cp.spawn(cmd, cmdArgs, options || {})
}
