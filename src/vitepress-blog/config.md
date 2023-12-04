# 快速搭建博客 - 配置

先放上[官网配置](https://vitepress.dev/reference/site-config)

## 项目配置

在讲配置之前，先找到 `config/.vitepress/config.{mts|js} ` 文件，接下来所有的配置都是修改这个文件。这里的 config 目录就是之前的配置目录，如果是用 ts 的话，后缀是`.mts`，否则后缀是`.js`。

### title

title 的配置有两种：一种是直接配置 title, 另一种是配置 titleTemplate。

#### title 配置

直接配置 title

```js
export default defineConfig({
  //...
  title: 'learn blog'
  //...
});
```

不管是更改 title 还是 titleTemplate，都是更新页面和浏览器 Tab 上的文本

#### titleTemplate 配置

### description

description

## 主题配置

主题配置

```js
export default defineConfig({
  //...
  vue: {},
  vite: {},
  markdown: {}
  //...
});
```

### 有关 vite, vue 和 Markdown 配置

```js{3-5}
export default defineConfig({
  //...
  vue: {},
  vite: {},
  markdown: {}
  //...
});
```
