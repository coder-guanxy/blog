# createApp - Vue 入口

下面是 vue 一个应用简单 demo:
::: code-group

```js [index.js]
// 引入 vue 入口
import { createApp } from "vue";

// 引入根组件
import App from "./App.vue";

// 根据 App 组件创建一个 vue 应用实例
const app = createApp(App);

// 将 App 组件挂载到 DOM(#app) 元素上，从而渲染出整个应用
app.mount("#app");
```

```js [App.vue]
<template>
    <div>hello world</div>
</template>
```

```html [index.html]
<!DOCTYPE html>
<html lang="en">
<head>      
    <meta charset="UTF-8">
    <title>Vue 3</title>
</head>
<body>
    <div id="app"></div>
</body>
</html>
```

:::

有上述 demo 可以看出，Vue 应用的入口是 createApp 函数。
下面我们以 createApp 为切入点来看看 vue 的整个渲染流程。

先看一下 createApp 的 TS 类型：

```ts
function createApp(rootComponent: Component, rootProps?: object): App
```

第一个参数是根组件。第二参数可选，它是要传递给根组件的 props。

上面是[文档的说明](https://cn.vuejs.org/api/application.html#createapp)

下面看一下 createApp 的源码：
## createApp 

主要做了两件事：
1. ensureRenderer - 主要固定 dom 操作（增删改查），将其作为参数传入
2. app.mount 为通用 mount, 主要将根组件挂载到 container 上

```ts
export const createApp = ((...args) => {
  const app = ensureRenderer().createApp(...args)

  //...
  return app
}) as CreateAppFunction<Element>
```


