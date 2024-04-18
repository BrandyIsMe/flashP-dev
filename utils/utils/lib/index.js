'use strict';


function isObject(params) {
    return Object.prototype.toString.call(params) === '[object Object]'
}


function spinnerStart() {
    const { Spinner } = require('cli-spinner');
    const spinner = new Spinner("loading... %s");
    spinner.setSpinnerString('|/-\\');
    spinner.start();
    return spinner;
}

function spawn(command, args, options) {
    const win32 = process.platform === 'win32' 

    const cmd = win32 ? 'cmd' : command

    const cmdArgs = win32 ? ['/c'].concat(command, args) : args


    return require('child_process').spawn(cmd, cmdArgs, options || {})
}

function execAysnc(command, args, options) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, options)

        child.on('error', (err) => {
            reject(err)
        })

        child.on('exit', (code) => {
            resolve(code)
        })
    })
}


module.exports = {
    isObject,
    spinnerStart,
    spawn,
    execAysnc
};
