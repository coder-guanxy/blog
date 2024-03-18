# CreateApp - 开启处理资源和路由

创建 app 实例，也就是主要的逻辑放在此实例中

```ts
    // 创建应用实例 - 直接执行 CreateApp.Constructor 函数
    const createAppInstance = () => new CreateApp({
        name: this.appName, // name 属性
        url: this.appUrl, // url 属性
        container: this.shadowRoot ?? this,
        scopecss: this.useScopecss(), // 不存在 disable-scopecss, disableScopecss 属性或者 shadowDOM
        useSandbox: this.useSandbox(), // 不存在 disable-sandbox, disableSandbox 属性
        inline: this.getDisposeResult('inline'), // 存在 inline 属性
        iframe: this.getDisposeResult('iframe'), // 存在 iframe 属性
        ssrUrl: this.ssrUrl, // ssr 相关 - 暂不了解
        routerMode: this.getMemoryRouterMode(), // 存在路由模式相关属性
    })

```


## CreateApp 类

构造函数
- 主要参数赋值，
- 加载源码, 将 link 和 script 中的资源处理到 this.source 属性中
- 创建沙箱

```ts
export default class CreateApp implements AppInterface {
  constructor ({
    name,
    url,
    container, // micro-app 实例或者是 shadowDOM 影子根，看是否开启 shadowDOM 模式
    scopecss, // 样式隔离
    useSandbox, // 是否开启沙箱
    inline,  // 是否将 script 资源嵌入到 script 标签中，有助于调试
    iframe, // iframe 模式
    ssrUrl,
    isPrefetch, // 是否有 prefetch 属性, 预先拉取
    prefetchLevel, // fetch 等级
    routerMode, // 路由模式
  }: CreateAppParam) {
    // 将当前实例缓存到 appInstanceMap 中
    // 当 name 或者 url 发生改变时，找到当前实例，执行其中的卸载方法
    appInstanceMap.set(name, this)
    // init actions
    this.name = name // name 应用名称
    this.url = url // 资源链接
    this.useSandbox = useSandbox // 是否开启沙箱
    this.scopecss = this.useSandbox && scopecss // css 样式隔离
    // exec before getInlineModeState

    // 是否是 iframe 沙箱
    this.iframe = iframe ?? false

    // 开启inline后，被提取的js会作为script标签插入应用中运行，在开发环境中更方便调试。
    this.inline = this.getInlineModeState(inline)
    /**
     * NOTE:
     *  1. Navigate after micro-app created, before mount
     */
    this.routerMode = routerMode || DEFAULT_ROUTER_MODE

    // not exist when prefetch 👇
    this.container = container ?? null
    this.ssrUrl = ssrUrl ?? ''

    // exist only prefetch 👇
    this.isPrefetch = isPrefetch ?? false
    this.isPrerender = prefetchLevel === 3 // 默认等级 3
    this.prefetchLevel = prefetchLevel

    // 源码保存位置
    this.source = { html: null, links: new Set(), scripts: new Set() }

    // 加载源码
    this.loadSourceCode()

    // 创建沙箱
    this.createSandbox()
  }
}
```


## loadSourceCode - 加载源码（script, link）

主要 HTMLLoader 的单例模式，执行 run 方法

```ts
  // Load resources
  public loadSourceCode(): void {
    // 设置 app 状态 =》 当前为 loading 状态
    this.setAppState(appStates.LOADING)

    // HTMLLoader 单例模式，直接 run 方法
    HTMLLoader.getInstance().run(this, extractSourceDom)
  }
```

## createSandbox - 创建 iframe 沙箱和 with 沙箱

根据不同的配置创建不同的沙箱

```ts
  // 创建 iframe 沙箱和 with 沙箱
  private createSandbox (): void {
    if (this.useSandbox && !this.sandBox) {
      this.sandBox = this.iframe ? new IframeSandbox(this.name, this.url) : new WithSandBox(this.name, this.url)
    }
  }
```

接下来会用两篇分别介绍![如何处理源码](./sourceLoadSourceCode.md)和![创建沙箱](./sourceCreateSandbox.md)