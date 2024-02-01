---
title: vue-router
---
# createRouter

先看一下如何使用：
[官网示例](https://router.vuejs.org/zh/guide/#JavaScript)

```js
// 1. 定义路由组件.
// 也可以从其他文件导入
const Home = { template: '<div>Home</div>' }
const About = { template: '<div>About</div>' }

// 2. 定义一些路由
// 每个路由都需要映射到一个组件。
// 我们后面再讨论嵌套路由。
const routes = [
  { path: '/', component: Home },
  { path: '/about', component: About },
]

// 3. 创建路由实例并传递 `routes` 配置
// 你可以在这里输入更多的配置，但我们在这里
// 暂时保持简单
const router = VueRouter.createRouter({
  // 4. 内部提供了 history 模式的实现。为了简单起见，我们在这里使用 hash 模式。
  history: VueRouter.createWebHashHistory(),
  routes, // `routes: routes` 的缩写
})

// 5. 创建并挂载根实例
const app = Vue.createApp({})
//确保 _use_ 路由实例使
//整个应用支持路由。
app.use(router)

app.mount('#app')

// 现在，应用已经启动了！
```

其中涉及到路由的有两个函数：

- createRouter
- createWebHashHistory | createWebHashHistory | createMemoryHistory

createWebHashHistory - 浏览器 history 模式
createWebHashHistory - 浏览器 hash 模式
createMemoryHistory - 内存模式（适用于 SSR,以及其他不依赖浏览器的平台）


createRouter 函数有将近 1000 行的代码：
我下面先以插件的方式挂载到 app 上，然后编程式操作的顺序来看

## 框架
先看一下`createRouter`大致的框架

```ts
export function createRouter(options: RouterOptions): Router {
  //...
  const router: Router = {
    //...
  }
  return router
}
```

createRouter 源码的返回中包含了很多路由相关的信息和方法：

```ts
const router: Router = {
  // 当前路由
  currentRoute,
  listening: true,

  // 对路由操作（添加 | 删除 | 是否存在 | 获取）
  addRoute,
  removeRoute,
  hasRoute,
  getRoutes,
  resolve,
  options,

  // 几种路由操作
  push,
  replace,
  go,
  back: () => go(-1),
  forward: () => go(1),

  // 全局前置守卫
  beforeEach: beforeGuards.add,
  // 全局解析守卫
  beforeResolve: beforeResolveGuards.add,
  // 全局后置钩子
  afterEach: afterGuards.add,

  // 路由错误监听
  onError: errorListeners.add,
  isReady,

  // 配合 app.use 使用
  install(app: App) {
      //...
  },
}
```

## 安装

其中示例中有 `app.use(router)` 看一下其中主要的内容

- 将 RouterLink | RouterView 组件添加到全局组件中
- 将 router 挂载到全局属性上，方便使用 `this.$router`
- 注册全局变量 routerKey | routeLocationKey | routerViewLocationKey
- 扩展卸载操作

```ts
//...
install(app: App) {
  const router = this
  // 将 RouterLink | RouterView 组件添加到全局组件中
  app.component('RouterLink', RouterLink)
  app.component('RouterView', RouterView)

  // 方便 this.$router 使用
  app.config.globalProperties.$router = router
  Object.defineProperty(app.config.globalProperties, '$route', {
    enumerable: true,
    get: () => unref(currentRoute),
  })

  // 多个 apps 初始化
  if (
    isBrowser &&
    !started &&
    currentRoute.value === START_LOCATION_NORMALIZED
  ) {
    // see above
    started = true
    push(routerHistory.location).catch(err => {
      if (__DEV__) warn('Unexpected error when starting the router:', err)
    })
  }

  // 代理此对象，获取操作直接去 currentRoute.value
  const reactiveRoute = {} as RouteLocationNormalizedLoaded
  for (const key in START_LOCATION_NORMALIZED) {
    Object.defineProperty(reactiveRoute, key, {
      get: () => currentRoute.value[key as keyof RouteLocationNormalized],
      enumerable: true,
    })
  }

  // 注册全局变量 routerKey | routeLocationKey | routerViewLocationKey
  // 所有的路由信息
  app.provide(routerKey, router)
  // 浅响应式的 currentRoute.value 的代理
  app.provide(routeLocationKey, shallowReactive(reactiveRoute))
  // 当前路由信息
  app.provide(routerViewLocationKey, currentRoute)

  // 保存原始的卸载操作
  const unmountApp = app.unmount

  // 添加到 installedApps 中
  installedApps.add(app)

  // 扩展原有的卸载操作
  app.unmount = function () {
    // 从安装 app 的仓库中删除此 app
    installedApps.delete(app)
    // the router is not attached to an app anymore
    if (installedApps.size < 1) {
      // 初始化当前数据
      pendingLocation = START_LOCATION_NORMALIZED

      // 移除监听
      removeHistoryListener && removeHistoryListener()
      removeHistoryListener = null

      // 初始化当前路由
      currentRoute.value = START_LOCATION_NORMALIZED
      started = false
      ready = false
    }

    // 调用原始的卸载操作
    unmountApp()
  }
},
//...
```

## 初始化

最后来看`createRoute` 初始化都做了哪些动作

参数：
- history：不同的模式 createWebHashHistory | createWebHashHistory | createMemoryHistory
- routes： 开发者的应用路由配置
- scrollBehavior：滚动
- parseQuery：自定义 URL 中 query 的解析函数
- stringifyQuery： 自定义将 query 转为 string 的函数
- linkActiveClass：自定义 RouterLink 中的当前激活的 class（默认：router-link-exact-active）
- linkExactActiveClass：自定义 RouterLink 中的不激活的 class（默认：router-link-inactive）

前三个参数比较常用其他不太常用

- 处理一下传入的参数
- 初始化全局的三个守卫钩子
- 初始化当前路由，正在执行的当前路由
- 挂载一些方法到 router 对象上

```ts
export function createRouter(options: RouterOptions): Router {
  // 创建一个 Matcher 匹配器，下一章会详细介绍
  const matcher = createRouterMatcher(options.routes, options)

  // 解析 query 的方法，支持自定义
  const parseQuery = options.parseQuery || originalParseQuery

  // 将 query 转为字符串的方法，支持自定义
  const stringifyQuery = options.stringifyQuery || originalStringifyQuery

  // 底层调用方法 - 浏览器的 history 还是 hash 亦或是内存模式
  const routerHistory = options.history

  // 三个全局守卫钩子 - 先不分析
  const beforeGuards = useCallbacks<NavigationGuardWithThis<undefined>>()
  const beforeResolveGuards = useCallbacks<NavigationGuardWithThis<undefined>>()
  const afterGuards = useCallbacks<NavigationHookAfter>()

  // 初始化当前响应式路由对象
  const currentRoute = shallowRef<RouteLocationNormalizedLoaded>(
    START_LOCATION_NORMALIZED
  )

  // 正在使用的 location
  let pendingLocation: RouteLocation = START_LOCATION_NORMALIZED

  // 滚动为手动模式
  if (isBrowser && options.scrollBehavior && 'scrollRestoration' in history) {
    history.scrollRestoration = 'manual'
  }

  // 循环对每个 value 进行处理，第二个参数作为处理方法
  const normalizeParams = applyToParams.bind(
    null,
    paramValue => '' + paramValue
  )

  // 循环对每个 value 进行处理 - encodeParam
  const encodeParams = applyToParams.bind(null, encodeParam)

  // 循环对每个 value 进行处理 - decode
  const decodeParams: (params: RouteParams | undefined) => RouteParams =
    applyToParams.bind(null, decode)


  // 下面的都是一些函数，可以在使用时再看
  // addRoute, removeRoute, hasRoute, resolve
  // locationAsObject checkCanceledNavigation handleRedirectRecord 
  // checkCanceledNavigationAndReject runWithContext triggerAfterEach
  // setupListeners triggerError isReady handleScroll runGuardQueue
  // 调用方法流程
  // [push replace go] -> pushWithRedirect -> navigate -> finalizeNavigation
  //...

  const router: Router = {
    //...
  }
  return router
}
```

初始化其中最重要的是 `createRouterMatcher` 创建一个 Matcher 对象，它用于匹配路由，并返回一个 `Router` 对象。

