# 问题补充

其实也说不上问题补充，只是自己看文档的没那么仔细，导致的问题

## 1. 在使用 creact-react-app 脚手架进行创建的项目，引入 public-path.js 更改静态资源路径时，发现打包后的静态资源路径不对，导致图片加载不出来。

### 解决方法：

将 public-path.js 引入放入到最顶上，也就是整个项目的最开始引入。`import "./public-path";` 放在第一行

官方文档将[最顶部](https://micro-zoe.github.io/micro-app/docs.html#/zh-cn/static-source?id=publicpath)还加粗了。