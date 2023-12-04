---
editLink: false
outline: { label: '123' }
---

#### 遇到的问题

1. 初始化项目
2. 调整配置参数
   - 标题
   - 更新时间
   - ico - 找一个图片，转为 ico 格式，然后将其放入到
   - on this page - outline
   - public -config
3. 部署问题
   - 更改 pnpm 安装
4. 怎么使 vue 插入到 md 中
5. 怎么更改 layout -
6. 在更改 缓存文件位置之后，再次更改配置文件，需要重新启动才能正常展示，否则为空白页面，初步怀疑是缓存文件没有删除
7. 配置 public 在 dev 环境可以展示， build 的时候找不到该图片
   - 比如在 `main.jpg` 图片放到 `src/public/blog` 下面 `src/blog/index.md` 引用 `main.jpg` => `![main](main.jpg)` 在 dev 环境下可以使用，但是打包会报错，找不到 main.jpg
   - 解决办法： 相对引入 `![main](../public/blog/main.jpg)`
   - 引入时，使用相对引用 - 相对当前位置引用

## 快速搭建 Blog

安装 vitepress 的先决条件：

- Node.js 版本要高于 18

第一步：选择一个你中的开发目录然后创建一个文件夹 `learnBlog` 并进入到该文件夹中

```bash
 mkdir learnBlog && cd learnBlog
```

第二步：生成 package.json 文件

```bash
npm init -y
```

第三步：安装 vitepress 依赖

```bash
npm install vitepress -D
```

第四步：使用 npx 创建 vitepress 目录

```bash
npx vitepress init

```

执行上面的命令之后会在在 Terminal 中询问：

1. 在哪里初始化配置
2. 网站标题
3. 网站描述
4. 最后选择主题
   - 默认主题
   - 默认主题 + 自定义
   - 自定义主题
5. 配置文件和主题文件是否使用 Typescript
6. 是否`vitepress npm script`添加到 package.json 中

["初始化图片"](./init.jpg)

也可以合并所有的命令

```bash
 mkdir learnBlog && cd learnBlog && npm init -y && npm install vitepress -D && npx vitepress init
```

第五步：最后执行 `npm run docs:dev`

第六步：在浏览器中打开这个地址`http://localhost:5174/`

此时已经成功构建一个简单的 Blog

当选择之后
我这里直接使用了默认主题 + 自定义

也可直接参照官网的[快速开始](https://vitepress.dev/guide/getting-started)

## 根据

## 简单介绍常用的几个 vitepress 配置

```

```
