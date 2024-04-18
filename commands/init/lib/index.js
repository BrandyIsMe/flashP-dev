"use strict";
const fs = require("fs");
const path = require("path");
const fse = require("fs-extra");
const inquirer = require("inquirer");
const semver = require("semver");
const userHome = require("user-home");
const Command = require("@flashp-dev/command");
const log = require("@flashp-dev/log");
const Package = require("@flashp-dev/package");
const { spinnerStart, execAysnc } = require("@flashp-dev/utils");
const getProjectTemplate = require("./getProjectTemplate");
const TYPE_PROJECT = "project";
const TYPE_COMPONENT = "component";
const TEMPLATE_TYPE_NORMAL = "normal";
const TEMPLATE_TYPE_CUSTOM = "custom";
const WHITE_CMD_LIST = ["npm", "cnpm"];
class InitCommand extends Command {
  init() {
    this.projectName = this._argv[0] || "";
    this.force = !!this._cmd.force;
    log.verbose("projectName", this.projectName);
    log.verbose("force", this.force);
  }

  async exec() {
    try {
      const projectInfo = await this.prepare();
      if (projectInfo) {
        log.verbose("projectInfo", projectInfo);
        this.projectInfo = projectInfo;
        await this.downloadTemplate();
        //安装模版
        await this.installTemplate();
      }
    } catch (error) {
      log.error(error.message);
    }
  }

  async prepare() {
    const template = await getProjectTemplate();
    if (!template || template.length === 0) {
      throw new Error("项目模板不存在");
    }
    log.verbose("template", template);
    this.template = template;
    const localPath = process.cwd();
    let answer = null;
    if (!this.isDirEmpty(localPath)) {
      //存在文件
      if (!this.force) {
        answer = await inquirer.prompt({
          type: "confirm",
          name: "ifContinue",
          default: false,
          message: "当前文件夹不为空，是否继续创建项目？",
        });

        if (!answer?.ifContinue) return;
      }
      if (answer?.ifContinue || this.force) {
        //强制更新，清空当前目录
        const confirmAnswer = await inquirer.prompt({
          type: "confirm",
          name: "confirmDelete",
          default: false,
          message: "是否确认清空当前目录下的文件？",
        });
        if (confirmAnswer.confirmDelete) {
          fse.emptyDirSync(localPath);
        }

        if (!confirmAnswer.confirmDelete) return;
      }
    }

    return this.getProjectInfo();
  }
  async getProjectInfo() {
    function isValidName(value) {
      return /^[a-zA-Z]+([-][a-zA-Z][a-zA-Z0-9]*|[_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])$/.test(
        value
      )
    }
    let projectInfo = {};
    let isProjectNameValid = false
    if (isValidName(this.projectName)) {
      isProjectNameValid = true;
      projectInfo.projectName = this.projectName;
    }
    const { type } = await inquirer.prompt({
      type: "list",
      name: "type",
      message: "请选择初始化类型",
      default: TYPE_PROJECT,
      choices: [
        {
          name: "项目",
          value: TYPE_PROJECT,
        },
        {
          name: "组件",
          value: TYPE_COMPONENT,
        },
      ],
    });
    this.template = this.template.filter(template => template.tag.includes(type))
    const title = type === TYPE_PROJECT ? '项目': '组件'
    const projectNamePrompt = {
      type: "input",
      name: "projectName",
      message: `请输入${title}名称`,
      default: "",
      validate(value) {
        const done = this.async();
        setTimeout(() => {
          if (!isValidName(value)) {
            return done(`请输入合法${title}名称`);
          }

          return done(null, true);
        }, 0);
        return;
      },
      // filter(value){
      //   return value
      // }
    }

    const projectPrompt = [
      isProjectNameValid ? null  : projectNamePrompt,
      {
        type: "input",
        name: "projectVersion",
        message: `请输入${title}版本名称`,
        default: "1.0.0",
        validate(value) {
          const done = this.async();
          setTimeout(() => {
            if (!semver.valid(value)) {
              return done("请输入正确的版本号");
            }

            return done(null, true);
          });
        },
        filter(value) {
          return semver.valid(value);
        },
      },
      {
        type: "list",
        name: "projectTemplate",
        message: `请输入${title}模版`,
        choices: this.createTemplateChoice(),
      },
    ].filter(Boolean)
    
    if (type === TYPE_PROJECT) {
      const result = await inquirer.prompt(projectPrompt);
      projectInfo = { ...projectInfo,type, ...result,};
    } else if (type === TYPE_COMPONENT) {
      const decriptionPrompt = {
        type: "input",
        name: "componentDescription",
        message: "请输入组件描述信息",
        default: "",
        validate(value) {
          const done = this.async();
          setTimeout(() => {
            if (!value) {
              return done("请输入组件描述信息");
            }

            return done(null, true);
          });
        },
      }
      projectPrompt.push(decriptionPrompt)
      const result = await inquirer.prompt(projectPrompt);
      projectInfo = { ...projectInfo,type, ...result,};
    }
    if (projectInfo.projectName) {
      projectInfo.className = require("kebab-case")(
        projectInfo.projectName
      ).replace(/^-/, "");
    }
    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion
    }

    if (projectInfo.componentDescription) {
      projectInfo.description = projectInfo.componentDescription
    }
    
    return projectInfo;
  }
  isDirEmpty(localPath) {
    let fileList = fs.readdirSync(localPath);
    fileList = fileList.filter(
      (file) => !file.startsWith(".") && ["node_modules"].indexOf(file) < 0
    );
    return !fileList || fileList.length <= 0;
  }

  async downloadTemplate() {
    const { projectTemplate } = this.projectInfo;
    const templateInfo = this.template.find((item) => {
      return item.npmNmae === projectTemplate;
    });
    this.templateInfo = templateInfo;
    const targetPath = path.resolve(userHome, ".flshp-dev", "template");
    const storePath = path.resolve(
      userHome,
      ".flshp-dev",
      "template",
      "node_modules"
    );
    const { npmNmae, version } = templateInfo;
    const templateNpm = new Package({
      targetPath,
      packageName: npmNmae,
      packageVersion: version,
      storeDir: storePath,
    });

    if (!(await templateNpm.exists())) {
      const spinner = spinnerStart();
      try {
        await templateNpm.install();
      } catch (error) {
        throw error;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success("模版下载成功");
          this.templateNpm = templateNpm;
        }
      }
    } else {
      const spinner = spinnerStart();
      try {
        await templateNpm.update();
      } catch (error) {
        throw error;
      } finally {
        spinner.stop(true);
        if (await templateNpm.exists()) {
          log.success("模版更新成功");
          this.templateNpm = templateNpm;
        }
      }
    }
  }

  createTemplateChoice() {
    return this.template.map((item) => ({
      value: item.npmNmae,
      name: item.name,
    }));
  }

  async installTemplate() {
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL;
      }

      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        await this.instalNoramlTemplate();
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        await this.installCustomTemplate();
      } else {
        throw new Error("项目模版类型不正确");
      }
    } else {
      throw new Error("项目模版信息不存在");
    }
  }

  async instalNoramlTemplate() {
    let spinner = spinnerStart();
    try {
      const templatePath = path.resolve(
        this.templateNpm.cacaheFilePath,
        "template"
      );
      const targetPath = process.cwd();
      fse.ensureDirSync(templatePath);
      fse.emptyDirSync(targetPath);
      fse.copySync(templatePath, targetPath);
    } catch (error) {
      throw error;
    } finally {
      spinner.stop(true);
      log.success("模版安装成功");
    }
    const templateIgnore = this.templateInfo.ignore || []
    const ignore = ["node_modules/**",'index.html', ...templateIgnore];
    await this.ejsRender(ignore);

    let { installCommand, startCommand } = this.templateInfo;

    const installResult = await this.execCommand(installCommand);

    if (installResult !== 0) {
      throw new Error("依赖安装失败");
    }

    await this.execCommand(startCommand);
  }

  async ejsRender(ignore) {
    const dir =  process.cwd()
    const projectInfo = this.projectInfo
    return new Promise((reslove, reject) => {
      require('glob')(
        "**",
        {
          cwd: dir,
          ignore,
          nodir: true,
        },
        (err, files) => {
          if (err) {
            reject(err);
          }
          Promise.all(files.map(file =>{
            const filepath = path.join(dir, file)
            return new Promise((resolve1, reject1) => {
              require('ejs').renderFile(filepath, projectInfo, {},(err, res) => {
                if (err) {
                  reject1(err);
                }
                fse.writeFileSync(filepath, res)
                resolve1(res);
              })
            })
          })).then(()=>{
            reslove();
          }).catch(err => reject(err));
        }
      );
    });
  }

  async execCommand(command) {
    let result;
    if (command) {
      command = command.split(" ");
      const cmd = this.checkCommand(command[0]);
      if (cmd) {
        const args = command.slice(1);
        result = await execAysnc(cmd, args, {
          stdio: "inherit",
          cmd: process.cwd(),
        });
      } else {
        throw new Error("命令不合法!!!! 命令:" + command);
      }
    }
    return result;
  }

  async installCustomTemplate() {
    if (this.templateNpm.exists()) {
      const rootFile = this.templateNpm.getRootFilePath()
      const templatePath = path.resolve(this.templateNpm.cacaheFilePath, 'template')
      const options = {
        ...this.templateInfo,
        ...this.projectInfo,
        targetPath:process.cwd(),
        sourcePath: templatePath
      }
      if (fs.existsSync(rootFile)) {
        const code = `require('${rootFile}')(${JSON.stringify(options)})`
        await execAysnc('node', ['-e', code],{
          stdio: "inherit",
          cmd: process.cwd(),
        })
      }else{
        throw new Error("自定义模板入口文件不存在")
      }
    }
  }

  checkCommand(cmd) {
    if (WHITE_CMD_LIST.includes(cmd)) {
      return cmd;
    }

    return null;
  }
}

module.exports = init;
module.exports.InitCommand = InitCommand;

function init(argv) {
  return new InitCommand(argv);
}
