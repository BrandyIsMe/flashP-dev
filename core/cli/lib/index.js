'use strict';

module.exports = core;
const path = require('path');
const semver = require('semver');
const colors = require('colors/safe');
const userHome = require('user-home');
const pathExists = require('path-exists');
const commander = require('commander')
// const argv = require('minimist')(process.argv.slice(2))
const pkg = require('../package.json')
const log = require('@flashp-dev/log')
const exec = require('@flashp-dev/exec')
const constant = require('./constant')
const { getNpmSemverVersion } = require('@flashp-dev/get-npm-info')
const program = new commander.Command()

async function core() {
  try {
    await prepare()
  } catch (error) {
    if (process.env.LOG_LEVEL === 'verbose') {
        log.error(error.message)
    }
  }
}

function chcekPkgVersion() {
    log.notice('cli', pkg.version)
}

function checkRoot() {
    const rootCheck = require('root-check')
    rootCheck()
}

async function checkUserHome() {
    if (!userHome || ! await pathExists(userHome)) {
        throw new Error(colors.red('当前登录用户主目录不存在'))
    }
}

// function checkArgs() {
//     if (argv.debug) {
//         process.env.LOG_LEVEL = 'verbose'
//     }else {
//         process.env.LOG_LEVEL = 'info'
//     }

//    log.level =  process.env.LOG_LEVEL
// }

async function  checkEnv () {
    const dotEnv = require('dotenv')
    const dotEnvPath = path.resolve(userHome, '.env')
    if (await pathExists(dotEnvPath)) {
     dotEnv.config({
            path: dotEnvPath
        })
    }
     creteDefaultConfig()
}

function creteDefaultConfig() {
    if (process.env.CLI_HOME) {
        process.env.CLI_HOME_PATH = path.join(userHome, process.env.CLI_HOME)
    }else {
        process.env.CLI_HOME_PATH = path.join(userHome, constant.DEFAULT_CLI_HOME)
    }
}

async function checkGlobeUpdate() {
    const currentVersion = pkg.version
    const npmName = pkg.name
     const lastVersion = await getNpmSemverVersion(npmName, currentVersion)
     if (lastVersion && semver.gt(lastVersion, currentVersion)) {
        log.warn(colors.yellow(`请手动更新${npmName},当前版本:${currentVersion},最新版本:${lastVersion},更新命令:npm install -g ${npmName}`))
     }
}

function registerCommand() {
program
    .name(Object.keys(pkg.bin)[0])
    .usage('<command> [options]')
    .version(pkg.version)
    .option('-d, --debug', '是否开启调试模式',false)
    .option('-tp, --targetPath <targetPath>', '是否指定本地调试文件路径')

program
    .command('init [projectName]')
    .option('-f, --force', '是否强制初始化')
    .action(exec)

program.on('option:debug', function(){
    if (program.opts().debug) {
        process.env.LOG_LEVEL = 'verbose'
    }else{
        process.env.LOG_LEVEL = 'info'
    }
    log.level =  process.env.LOG_LEVEL
})

// 监听targetPath
program.on('option:targetPath', function(){
    const targetPath = program.opts().targetPath
    if (targetPath) {
        process.env.CLI_TARGET_PATH = targetPath
    }
})

//监听未知命令
program.on('command:*', function (obj) {
    const availableCommands = program.commands.map(cmd => cmd.name())
    console.log(colors.red('未知命令' ,obj[0]));
    console.log(colors.green('可用命令为:' ,availableCommands.join(',')));
})
program.parse(process.argv)

if (program.args && program.args.length < 1) {
    program.outputHelp()
}
}

async function prepare() {
    chcekPkgVersion()
    checkRoot()
    await checkUserHome()
    // checkArgs()
    checkEnv()
    await checkGlobeUpdate()
    registerCommand()
}