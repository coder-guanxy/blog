# 前端架构师 - 基础建设与架构设计思想



## 工作中接触到的“好项目”

前端工程化基建和架构设计定义：

1. 从 0 到 1 打造应用的基础设施
2. 确定应用的工程化方案
3. 实现应用构建和发布的流程
4. 设计应用中的公共方法和底层架构



前端业务价值（前端团队的技术能力）

- 团队作战并未单打独斗，那么如何设计工作流程，打造一个众人皆赞的项目根基？
- 项目依赖纷繁复杂，如何做好依赖管理和公共库管理？
- 如何深入理解框架，真正做到精通框架和准确拿捏技术选型？
- 从最基本的网络请求库说起，如何设计一个稳定灵活的多端 fetch 库？
- 如何借助 Low Code 或 No Code 技术，实现越来越智能的应用搭建方案？
- 如何统一中后台项目架构，提升跨业务线的产研效率？
- 如何开发设计一套适合业务的组件库，封装分层样式，最大限度做到复用，提升开发效率？
- 如何设计跨端方案，"Write Once , Run Everywhere" 是否真的可行？
- 如何处理各种模块化规范，以及精确做到代码拆分？
- 如何区分开发边界，比如前端如何更好地利用 Node.js 方案开疆扩土？



## 第一部分 - 前端工程化管理工具



### 安装机制及企业级部署私服原理

#### npm 安装机制与背后思想

有两种安装方式：项目安装和全局安装

Npm 优先安装依赖包到当前项目目录，使得不同应用项目的依赖各成体系。

优点：减轻包作者的 API 兼容性压力

缺点：同一个依赖包可能在电脑上被多次安装



![npm 安装过程](../public/frontEndArchitrct/npm-install.jpg)



1. 执行 `npm install` 命令之后，首先检查 config，获取 npm 配置，优先级由上向下
   1. 项目级别的 .npmrc
   2. 用户级的 .npmrc
   3. 全局的 .npmrc
   4. npm 内置的 .npmrc
2. 然后检查项目有无 package-lock.json 文件（简称 lock 文件）
   - 有 lock 文件，则检查 lock 文件和 package.json 文件版本是否一致
     - 一致，直接使用 lock 文件中的信息，从缓存中或网络资源中加载依赖
     - 不一致，则按照 package.json 文件安装
   - 无 lock 文件，则根据 package.json 文件递归构建依赖树，然后按照构建好的依赖树下载完整的依赖资源，在下载时会检查是否有相关缓存。
     - 有缓存，则从缓存中解压到 node_modules 中
     - 没有缓存，则先从 npm 远程仓库下载资源，检查包的完整性，并将其添加到缓存，同时解压到 node_modules 中
3. 最后生成 package-lock.json 文件



##### node_modules 扁平化

构建依赖树时，当前依赖项目无论是直接依赖还是子依赖的依赖，都遵循扁平化的原则优先将其放置在 node_modules 根目录下。在这个过程中，遇到相同的模块应先判断已放置在依赖树中的模块版本是否符合对新模块版本要求，如果符合就跳过，不符合则在当前模块的 node_modules 下放置该模块



缺点：其造成幽灵依赖的问题，即可以引用某个依赖，这个依赖并没有出现在 package.json 中



#### npm 缓存机制

1. 当 `npm install` 执行时，会现将依赖下载到缓存中，再将其解压到项目的 node_modules 下
2. 在每次安装资源时，根据 package-lock.json 中存储的 integrity, version, name 信息生成的唯一的 key 对应的缓存记录。如果有缓存，就会找到 tar  包的 hash 值，根据 hash 值找到缓存的 tar 包，并再次将对应的二进制文件解压到相应的项目 node_modules 下，省去网络下载时间



#### npm init

npm init 命令其实就是调用 Shell 脚本输出一个初始化的 package.json 文件



#### npm link

npm link 本质就是软连接

- 为目标 npm 模块创建软链接，将其链接全局模块安装路径下
- 为目标 npm 模块的可执行 bin 文件创建软链接，将其链接到全局 node 命令安装路径 `/usr/local/bin` 下



##### 场景：

假设正在开发项目 project1, 其中有一个包 package1, 对应 npm 模块包的名字 npm-package1, 我们在 package 1 中加入新功能 feature A

先在 package1 目录中执行 npm link 命令，这样 npm link 通过链接目录和可执行文件，可实现 npm 包命令的全局可执行。然后在 project1 中创建链接，执行 npm link npm-package1 命令，这时 npm 就会去 `/usr/local/lib/node_modules/` 路径下寻找是否有 npm-package1 这个包，如果有就建立软连接

调试结束后可以执行 npm unlink 命令以取消关联



#### npx 的作用

npx 在执行模块时会优先安装依赖，但是在安装成功后便删除此依赖。

```bash
> npm install ceate-react-app --save-dev
> ./node_modules/.bin/ceate-react-app cra-project

> npm uninstall create-react-app
```

上面可以简化为

```bash
> npx ceate-react-app cra-project
```



#### npm 多源镜像和企业级的部署私服原理



##### 切换多个镜像

现在 install 

```json
{
  //...
  	"scripts": {
      "preinstall": "node ./bin/preinstall.js"
    }
  //...
}
```



```js
require("child_process").exec("npm config set registry https:xxx")
```



##### 部署私有 npm 镜像

社区 3 中工具：

- nexus
- verdaccio
- cnpm



Nexus 工作在客户端和外部 npm 之间，并通过 Group Repository 合并 npm 仓库及私有仓库，这样就起了代理的转发作用



## CI环境下 npm 优化



### npm ci

- Npm ci 要求项目中必须存在 package-lock.json 或 npm-shrinkwrap.json 文件
- npm ci 完全根据 package-lock.json 文件安装依赖，这样可以保证开发团队成员使用版本一致的依赖
- 因为根据 package-lock.json 文件安装，因此安装过程中，不需要求解依赖满足问题及构造依赖树，安装过程更加迅速
- npm ci 在执行安装时会先删除项目中现有的 node_modules 目录，重新安装
- npm ci 只能一次性安装项目中所有的包，无法安装单个依赖包
- 如果 package-lock.json 文件和 package.json 文件冲突，那么执行 npm ci 命令会报错
- 执行 npm ci 永远不会改变 package.json 文件和 package-lock.json 文件内容

基于此，在 CI 环境下使用 npm ci 代替 npm install



### 为什么需要 lockfiles

Package-lock.json 文件作用是锁定依赖安装结构，目的是保证在任意机器上执行 npm install 命令时都会得到相同的 node_modules 安装结果。



为什么单一的 package.json 不能确定唯一的依赖树

- 不同版本 npm 的安装依赖策略和算法不同
- npm install 将根据 package,json 文件中的 semver-range version 更新依赖，某些依赖项自上次安装以来，可能已发布了新版本



### 要不要将 lockfiles 提交到仓库

这需要看项目定位：

- 开发应用 - 建议将 package-lock.json 文件提交到代码版本仓库，这样可以保证项目成员，运维部署成员或 CI 系统，在执行 npm install 后能得到完全一致的依赖安装内容
- 开发供外部使用的库 - 在不使用 package-lock.json 文件的情况下，可以复用主项目已经加载过的包，避免依赖重复，可减小体积
  - 如果开发的库依赖了一个具有精确版本号的模块，那么提交 lockfiles 到仓库可能会造成同一个依赖的不同版本都被下载的情况。作为库的开发者，如果帧的有使用某个特定版本依赖的需要，一个更好的方式是定义 peerDependencies 内容

推荐做法：将 package-lock.json 提交到代码库中，执行 npm publish 发布库的时候，lockfiles 会被忽略而不会被直接发布出去。



### package.json 和 package-lock.json

- 如果项目中只有 package.json 文件，执行 npm install 之后，会根据 package.json 生成一个 package-lock.json
- 如果项目存在 package.json 和 package-lock.json ，同时两者版本兼容，则npm install会根据 package-lock.json 下载
- 如果两者同时存在，则两者版本不兼容，执行 npm install 时，package-lock.json 文件会自动更新版本，与 package.json 文件的 semver-range 版本兼容



### Package.json 中的 xxxDependencies

- dependencies - 项目依赖
- devDependencies - 开发依赖
- peerDependencies - 同版本依赖
- bundledDependencies - 捆绑依赖
- optionalDependencies - 可选依赖



并不是只有 dependencies 下的模块才会被打包，而 devDependencies 下的模块一定不会被打包，实际上，模块是否作为依赖被打包，完全取决于项目是否引入了该模块。



dependencies 和 devDependencies 在业务中更多起到规范作用





