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

## microApp - 入口实例

先看一下 microApp 源码：

```
const microApp = new MicroApp()
```

由源码可知这是 MicroApp 的实例

## MicroApp - 构造函数

全局只有一个 microApp 实例，构造函数中只有一个 start 方法：

start 方法主要做了一些初始化的工作，比如：
- 检测非浏览器环境
- 只能执行一次
- 标签名称处理
- 初始化环境变量，将 window 对象上属性和方法进行重新命名
- 检测环境中是否已经含有 micro-app 标签
- 处理一些参数：样式隔离，js 沙箱，prefetch, globalAssets, plugins
- 主要是开始构建自定义元素 <micro-app xxx />

```js
export class MicroApp extends EventCenterForBaseApp implements MicroAppBaseType {
  tagName = 'micro-app' // 标签名称
  hasInit = false // 初始化标识，是否初始化过
  options: OptionsType = {} // 参数
  router: Router = router // 路由
  preFetch = preFetch // preFetch 预请求
  unmountApp = unmountApp // 卸载应用 - 不影响流程
  unmountAllApps = unmountAllApps // 卸载所有应用 - 不影响流程
  getActiveApps = getActiveApps // 获取当前在页面展示的应用 - 不影响流程
  getAllApps = getAllApps // 获取所有应用实例 - 不影响流程
  reload = reload // reload 重新加载- 不影响流程
  renderApp = renderApp // 渲染 app - 不影响流程
  getAppStatus = getAppStatus // 主应用加载状态
  start (options?: OptionsType): void { // 调用的开始函数
    if (!isBrowser || !window.customElements) {
      return logError('micro-app is not supported in this environment')
    }

    /**
     * TODO: 优化代码和逻辑
     *  1、同一个基座中initGlobalEnv不能被多次执行，否则会导致死循环
     *  2、判断逻辑是否放在initGlobalEnv中合适？--- 不合适
     */
    if (this.hasInit) {
      return logError('microApp.start executed repeatedly')
    }

    // 不允许多次初始化，相当于单例
    this.hasInit = true

    // 标签名称
    if (options?.tagName) {
      if (/^micro-app(-\S+)?/.test(options.tagName)) {
        this.tagName = options.tagName
      } else {
        return logError(`${options.tagName} is invalid tagName`)
      }
    }

    // 获取 window 对象上一些操作 dom 以及浏览器相关 api，并进行重命名。比如 window => rawWindow
    initGlobalEnv()

    // 检测当前自定义元素是否已经被定义过
    if (globalEnv.rawWindow.customElements.get(this.tagName)) {
      return logWarn(`element ${this.tagName} is already defined`)
    }


    // 处理传入的参数 - options
    if (isPlainObject<OptionsType>(options)) {
      this.options = options

      // 关闭样式隔离 - 默认 false
      options['disable-scopecss'] = options['disable-scopecss'] ?? options.disableScopecss
      // 关闭 js 沙箱 - 默认 false
      options['disable-sandbox'] = options['disable-sandbox'] ?? options.disableSandbox

      // load app assets when browser is idle
      // 预加载是指在子应用尚未渲染时提前加载静态资源，从而提升子应用的首次渲染速度。
      options.preFetchApps && preFetch(options.preFetchApps)

      // load global assets when browser is idle
      // 设置资源共享
      // 请求资源（css,js），将源码放入到 sourceHandler 中
      options.globalAssets && getGlobalAssets(options.globalAssets)


      // 过滤不合规则的插件
      if (isPlainObject(options.plugins)) {

        // 子应用插件
        const modules = options.plugins.modules
        if (isPlainObject(modules)) {
          for (const appName in modules) {
            // 循环所有子应用插件
            const formattedAppName = formatAppName(appName)

            // 删除无效的 appName
            // 比如：以数字为第一个字符的或者其他位非数字、英文字符、下划线、中划线的字符
            if (formattedAppName && appName !== formattedAppName) {
              modules[formattedAppName] = modules[appName]
              delete modules[appName]
            }
          }
        }
      }
    }

    // define customElement after init
    // 创建自定义元素
    defineElement(this.tagName)
  }
}
```

## defineElement - 定义自定义元素

有关 web component 的介绍：[web component](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_components#%E6%A6%82%E5%BF%B5%E5%92%8C%E4%BD%BF%E7%94%A8)

MSN 上关于[自定义元素](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_components/Using_custom_elements) 解释：
其中几个重要生命周期：

- connectedCallback()：每当元素添加到文档中时调用。规范建议开发人员尽可能在此回调中实现自定义元素的设定，而不是在构造函数中实现。
- disconnectedCallback()：每当元素从文档中移除时调用。
- adoptedCallback()：每当元素被移动到新文档中时调用。
- attributeChangedCallback()：在属性更改、添加、移除或替换时调用。有关此回调的更多详细信息，请参见响应属性变化。


响应属性变化：
- 一个名为 observedAttributes 的静态属性。这必须是一个包含元素需要变更通知的所有属性名称的数组。
- attributeChangedCallback() 生命周期回调的实现。

下面先看一下属性变化的情况：
由 observedAttributes 的返回值可知，这里只监控了 name 和 url 的两个属性更新
这两个属性也是整个自定义元素的核心属性


流程是先执行：
先创建将 name 和 url 属性添加自定义元素，将 name 和 url 属性分别赋值到 this.appName 和 this.appUrl
然后将自定义元素插入到文档中，执行 connectedCallback() 生命周期回调，
最终都是调用 this.handleConnected


```ts
export function defineElement(tagName: string): void {

  // 自定义元素构造函数
  class MicroAppElement extends getBaseHTMLElement() implements MicroAppElementType {
    // 必须是一个包含元素需要变更通知的所有属性名称的数组。
    static get observedAttributes (): string[] {
      return ['name', 'url']
    }

    // 在列在元素的 observedAttributes 属性中的属性被添加、修改、移除或替换时调用。
    // name 或者 url 属性变化时，调用 handleInitialNameAndUrl
    // this.appName 赋值， this.appUrl 赋值
    public attributeChangedCallback (attr: ObservedAttrName, _oldVal: string, newVal: string): void {
      
      // this.legalAttribute 判断属性是否合法 - 主要是判断是不是 newVal 字符串
      // 有新值
      if (
        this.legalAttribute(attr, newVal) &&
        // 旧值和新值不等
        this[attr === ObservedAttrName.NAME ? 'appName' : 'appUrl'] !== newVal
      ) {

        // url 更新
        if (
          attr === ObservedAttrName.URL && (
            // 第一次
            !this.appUrl ||
            // 未添加到文档中
            !this.connectStateMap.get(this.connectedCount) // TODO: 这里的逻辑可否再优化一下
          )
        ) {

          // 格式化名称 - 看是否是有效的字符串
          newVal = formatAppURL(newVal, this.appName)
          if (!newVal) {
            return logError(`Invalid attribute url ${newVal}`, this.appName)
          }

          // 赋值 this.appUrl
          this.appUrl = newVal

          // 调用初始化
          this.handleInitialNameAndUrl()

          // name 更新 - 判断条件如 url 更新
        } else if (
          attr === ObservedAttrName.NAME && (
            !this.appName ||
            !this.connectStateMap.get(this.connectedCount) // TODO: 这里的逻辑可否再优化一下
          )
        ) {

          // 格式化 name 值
          const formatNewName = formatAppName(newVal)

          if (!formatNewName) {
            return logError(`Invalid attribute name ${newVal}`, this.appName)
          }

          // TODO: 当micro-app还未插入文档中就修改name，逻辑可否再优化一下
          if (this.cacheData) {
            microApp.setData(formatNewName, this.cacheData)
            this.cacheData = null
          }

          // 赋值 this.appName 的值
          this.appName = formatNewName

          // 新值不符合格式要求的情况
          if (formatNewName !== newVal) {
            this.setAttribute('name', this.appName)
          }


          this.handleInitialNameAndUrl()

          // 第一次 isWaiting，非 name 和 url 属性初始化
        } else if (!this.isWaiting) {
          this.isWaiting = true
          defer(this.handleAttributeUpdate)
        }
      }
    }

    private handleInitialNameAndUrl(): void {
      
      // 如果已经插入到文档中执行 handleConnected 连接
      this.connectStateMap.get(this.connectedCount) && this.handleConnected()
    }
  }

// 定义自定义元素
  globalEnv.rawWindow.customElements.define(tagName, MicroAppElement)
}

```


## MicroAppElement - connectedCallback

-  生命周期 connectedCallback - 将元素添加到文档中时调用
  
主要功能：

- 将连接数缓存起来
- 执行 created 生命周期
- 然后调用 handleConnected 方法

```js

    // 每当元素添加到文档中时调用
    public connectedCallback(): void {
      // 连接数
      const cacheCount = ++this.connectedCount
      // 缓存连接数
      this.connectStateMap.set(cacheCount, true)
      /**
       * In some special scenes, such as vue's keep-alive, the micro-app will be inserted and deleted twice in an instant
       * So we execute the mount method async and record connectState to prevent repeated rendering
       */
      // 是否是有效的 app
      // 这里的 this.appName 和 this.appUrl 是在 attributeChangedCallback 中进行赋值的
      const effectiveApp = this.appName && this.appUrl

      // defer => Promise.reolve()
      // 下一个微任务
      defer(() => {
        if (this.connectStateMap.get(cacheCount)) {

          // 执行 created 生命周期函数
          // <micro-app>标签初始化后，加载资源前触发。
          dispatchLifecyclesEvent(
            this,
            this.appName,
            lifeCycles.CREATED,
          )
          /**
           * If insert micro-app element without name or url, and set them in next action like angular,
           * handleConnected will be executed twice, causing the app render repeatedly,
           * so we only execute handleConnected() if url and name exist when connectedCallback
           */

          // 如果插入之前，还没有 name 和 url 属性
          effectiveApp && this.handleConnected()
        }
      })
    }
```

## MicroAppElement - handleConnected

将自定义元素插入到 DOM 文档中，也是开始渲染微应用的地方。

- 先判断 name 和 url 属性是否已经被处理过
- 根据自定义元素上是否存在 shadowDOM 属性来开启 shadowDOM 模式，设定为自定义元素为影子更元素
- 如果有之前的 name 对应的实例，则视为更新，否则视为首次加载（主要看首次加载）
- 首次加载执行创建 app 实例的过程 - handleCreateApp

```ts
   private handleConnected(): void {
      // 保证 appName 和 appUrl 同时存在
      if (!this.appName || !this.appUrl) return

      // 看一下当前自定义 element 属性上是否存在 shadowDOM 属性
      // 将自定义元素设定为影子根元素
      if (this.getDisposeResult('shadowDOM') && !this.shadowRoot && isFunction(this.attachShadow)) {
        this.attachShadow({ mode: 'open' })
      }

      // ssr 相关 - 不看不影响查看流程代码
      this.updateSsrUrl(this.appUrl)

      // 已经存在当前实例 - 数据更新才会走这里
      if (appInstanceMap.has(this.appName)) {
        const oldApp = appInstanceMap.get(this.appName)!
        const oldAppUrl = oldApp.ssrUrl || oldApp.url
        const targetUrl = this.ssrUrl || this.appUrl
        /**
         * NOTE:
         * 1. keep-alive don't care about ssrUrl
         * 2. Even if the keep-alive app is pushed into the background, it is still active and cannot be replaced. Otherwise, it is difficult for developers to troubleshoot in case of conflict and  will leave developers at a loss
         * 3. When scopecss, useSandbox of prefetch app different from target app, delete prefetch app and create new one
         */
        if (
          oldApp.isHidden() &&
          oldApp.url === this.appUrl
        ) {
          // 开启 keepAlive 模式
          this.handleShowKeepAliveApp(oldApp)
        } else if (
          oldAppUrl === targetUrl && (
            oldApp.isUnmounted() ||
            (
              oldApp.isPrefetch &&
              this.sameCoreOptions(oldApp)
            )
          )
        ) {
          this.handleMount(oldApp)
        } else if (oldApp.isPrefetch || oldApp.isUnmounted()) {
          this.handleCreateApp()
        } else {
          logError(`app name conflict, an app named: ${this.appName} with url: ${oldAppUrl} is running`)
        }
      } else {

        // 第一次挂载新实例
        this.handleCreateApp()
      }
    }

```

## MicroAppElement - handleCreateApp 

创建 app 实例，也是微前端入口 - CreateApp 类

```ts
    // 创建子应用 app 实例
    private handleCreateApp(): void {
      // 创建应用实例 - 直接执行 CreateApp.Constructor 函数
      const createAppInstance = () => new CreateApp({
        name: this.appName,
        url: this.appUrl,
        container: this.shadowRoot ?? this,
        scopecss: this.useScopecss(),
        useSandbox: this.useSandbox(),
        inline: this.getDisposeResult('inline'),
        iframe: this.getDisposeResult('iframe'),
        ssrUrl: this.ssrUrl,
        routerMode: this.getMemoryRouterMode(),
      })

      /**
       * Actions for destroy old app
       * If oldApp exist, it must be 3 scenes:
       *  1. oldApp is unmounted app (url is is different)
       *  2. oldApp is prefetch, not prerender (url, scopecss, useSandbox, iframe is different)
       *  3. oldApp is prerender (url, scopecss, useSandbox, iframe is different)
       */
      const oldApp = appInstanceMap.get(this.appName)

      // 是否存在老的 app 实例，来判断是创建新实例还是卸载老实例
      if (oldApp) {
        // prerender 场景，预渲染接口
        if (oldApp.isPrerender) {
          // 卸载老实例
          this.unmount(true, createAppInstance)
        } else {
          oldApp.actionsForCompletelyDestroy()
          createAppInstance()
        }
      } else {

        // 创建 app 新实例
        createAppInstance()
      }
    }
```