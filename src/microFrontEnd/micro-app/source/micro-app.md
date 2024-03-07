# micro-app 入口

## 使用 Demo

::: code-group

```js
// 主应用 index.js
import microApp from '@micro-zoe/micro-app'

microApp.start()

```

```js
export function MyPage () {
  return (
    <div>
      <h1>子应用👇</h1>
      // name：应用名称, url：应用地址
      <micro-app name='my-app' url='http://localhost:3000/'></micro-app>
    </div>
  )
}

```

:::

## microApp

先看一下 microApp 源码：

```
const microApp = new MicroApp()
```

由源码可知这是 MicroApp 的实例



