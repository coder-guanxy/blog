# 问题补充

其实也说不上问题补充，只是自己看文档的没那么仔细，导致的问题

## 1. 在使用 creact-react-app 脚手架进行创建的项目，引入 public-path.js 更改静态资源路径时，发现打包后的静态资源路径不对，导致图片加载不出来。

### 解决方法：

将 public-path.js 引入放入到最顶上，也就是整个项目的最开始引入。`import "./public-path";` 放在第一行

官方文档将[最顶部](https://micro-zoe.github.io/micro-app/docs.html#/zh-cn/static-source?id=publicpath)还加粗了。


## 在之前做项目的时候也使用过 iframe，也遇到过 iframe 加载两次的问题

这次在看源码时，看到 

codeGeex 的回答：

在浏览器中，iframe文档将在iframe初始之后重新创建的原因可能有以下几点：

1. iframe的src属性被修改：当iframe的src属性被修改后，浏览器会重新加载iframe的内容，这可能导致iframe文档在iframe初始之后重新创建。

解决方法：在修改iframe的src属性后，确保在加载新内容之前删除旧的iframe内容，以避免重新创建文档。


2. iframe的contentWindow或contentDocument属性被修改：当iframe的contentWindow或contentDocument属性被修改后，浏览器可能会认为iframe的内容已经改变，从而重新加载iframe的内容。
   
解决方法：在修改iframe的contentWindow或contentDocument属性后，确保在加载新内容之前删除旧的iframe内容，以避免重新创建文档。

3. 跨域问题：如果iframe的内容来自不同的域，浏览器可能会阻止加载内容，从而导致重新创建文档。
   
解决方法：确保iframe的内容和父页面来自同一域，或者使用CORS（跨域资源共享）来允许跨域访问。

4. 浏览器缓存问题：浏览器可能会缓存旧的iframe内容，导致在加载新内容时出现错误。
解决方法：尝试清除浏览器缓存，或者在加载新内容时使用不同的URL，以避免浏览器缓存旧的内容。