# 快速搭建 Blog

## 安装 vitepress 的先决条件：

- Node.js 版本要高于 18

## 步骤

第一步：选择一个你中的开发目录然后创建一个文件夹 `learnBlog` 并进入到该文件夹中

```bash

 mkdir learnBlog && cd learnBlog

```

第二步：生成 package.json 文件

```bash

npm init-y

```

第三步：安装 vitepress 依赖

```bash

npm installvitepress-D

```

第四步：使用 npx 创建 vitepress 目录

```bash

npx vitepressinit


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
6. 是否 `vitepress npm script`添加到 package.json 中

![初始化](./init.jpg 'vitepress 初始化')

也可以合并所有的命令

```bash

 mkdir learnBlog && cd learnBlog && npm init-y && npm installvitepress-D && npx vitepressinit

```

第五步：最后执行 `npm run docs:dev`

第六步：在浏览器中打开这个地址 `http://localhost:5174/`

此时已经成功构建一个简单的 Blog

## 快速创建过程中配置

上述步骤完成之后得到下面的目录结构：

```
.
├─ docs
│  ├─ .vitepress
│  │  └─ config.js // 配置文件
│  ├─ api-examples.md // api-examples 路由下的内容
│  ├─ markdown-examples.md // markdown-examples 路由下的内容
│  └─ index.md // 首页内容
└─ package.json

```

配置文件加命名（默认 docs）：

```
◇  Where should VitePress initialize the config?
│  ./docs
```

网站的 title：
更改 `docs/.vitepress/config.js` 文件下面的 `title` 属性

```
◇ Site title:
│ My Awesome Project
```

网站描述：
更改 `docs/.vitepress/config.js` 文件下面的 `description` 属性

```
◇ Site description:
│ A VitePress Site
```

选择主题：

```
◆ Theme:
│ ● Default Theme (Out of the box, good-looking docs)
│ ○ Default Theme + Customization
│ ○ Custom Theme
```

<!-- <script setup>
    const data = useData()
    console.log('data: ', data);
</script> -->

也可直接参照官网的[快速开始](https://vitepress.dev/guide/getting-started)
