'use strict';
const fs = require('fs')
const fse = require('fs-extra')
const inquirer = require('inquirer');
const Command = require('@flashp-dev/command')
const log = require('@flashp-dev/log')

class InitCommand extends Command {
  init(){
    this.projectName = this._argv[0] || ''
    this.force = !!this._cmd.force
    log.verbose('projectName', this.projectName)
    log.verbose('force', this.force)
  }

  async exec(){
    try {
     await this.prepare()
    } catch (error) {
      log.error(error.message)
    }
  }

  async prepare(){
    const localPath = process.cwd()
    if (!this.isDirEmpty(localPath)) { //存在文件
      const answer = await inquirer.prompt({
        type: 'confirm',
        name:'ifContinue',
        default: false,
        message: '当前文件夹不为空，是否继续创建项目？'
      })
    if (answer.ifContinue) {
      //强制更新，清空当前目录
      const confirmAnswer = await inquirer.prompt({
        type: 'confirm',
        name:'confirmDelete',
        default: false,
        message: '是否确认清空当前目录下的文件？'
      })
      if (confirmAnswer.confirmDelete) {
        fse.emptyDirSync(localPath)
      }
    }
    }else{

    }
  }
  
  isDirEmpty(localPath){
    let fileList = fs.readdirSync(localPath)
    fileList = fileList.filter((file)=> (!file.startsWith('.') && ['node_modules'].indexOf(file) < 0))
    return !fileList || fileList.length <= 0
  }
}




module.exports = init;
module.exports.InitCommand = InitCommand;


function init(argv) {
  return new InitCommand(argv)
}