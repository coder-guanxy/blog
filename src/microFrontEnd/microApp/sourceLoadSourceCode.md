# loadSourceCode 加载源码

HTMLLoader 是一个单例模式的类。
调用静态方法 getInstance 获取实例。
不管调用多少次都是同一个实例

```ts
export class HTMLLoader implements IHTMLLoader {
  private static instance: HTMLLoader;

  // 单例模式
  public static getInstance (): HTMLLoader {
    if (!this.instance) {
      this.instance = new HTMLLoader()
    }
    return this.instance
  }

  //...
}
```

## run - 开始解析的方法

1. 如果是 prefetch 相关提前加载是 .js 为后缀的 js 文件使用 `Promise.resolve(`<micro-app-head><script src='${htmlUrl}'></script></micro-app-head><micro-app-body></micro-app-body>`)` 方式
2. 如果是正常的 url 是加载 html 文件，使用 `fetch(htmlUrl)` 方式
3. 将远程的资源拉回到本地之后，将 head 和 body 标签改为 micro-app-head，micro-app-body
4. successCb 其实是 extractSourceDom 函数，提取 出 script 标签，link 标签

```ts
  // 直接执行
  public run (app: AppInterface, successCb: CallableFunction): void {
    const appName = app.name
    const htmlUrl = app.ssrUrl || app.url

    // 请求 js 或 css 源码资源
    const htmlPromise = htmlUrl.includes('.js')
      // 当 script 标签同步加载完毕，执行下一个微任务 - prefetch 时使用
      ? Promise.resolve(`<micro-app-head><script src='${htmlUrl}'></script></micro-app-head><micro-app-body></micro-app-body>`)
      // 自定义 fetch 或者 window.fetch
      : fetchSource(htmlUrl, appName, { cache: 'no-cache' })
    
    htmlPromise.then((htmlStr: string) => {
      if (!htmlStr) {
        const msg = 'html is empty, please check in detail'
        app.onerror(new Error(msg))
        return logError(msg, appName)
      }

      // 将 head，body 标签改为 micro-app-head，micro-app-body
      htmlStr = this.formatHTML(htmlUrl, htmlStr, appName)

      // 执行成功回调
      successCb(htmlStr, app)
    }).catch((e) => {
      logError(`Failed to fetch data from ${app.url}, micro-app stop rendering`, appName, e)
      app.onLoadError(e)
    })
  }

```

## formatHTML

将 head 和 body 标签改为 micro-app-head，micro-app-body

```ts

  // 格式化 html 转换 head 和 body 标签
  private formatHTML(htmlUrl: string, htmlStr: string, appName: string) {
    // 执行 html 处理插件
    return this.processHtml(htmlUrl, htmlStr, appName, microApp.options.plugins)
      .replace(/<head[^>]*>[\s\S]*?<\/head>/i, (match) => {
        return match
          .replace(/<head/i, '<micro-app-head')
          .replace(/<\/head>/i, '</micro-app-head>')
      })
      .replace(/<body[^>]*>[\s\S]*?<\/body>/i, (match) => {
        return match
          .replace(/<body/i, '<micro-app-body')
          .replace(/<\/body>/i, '</micro-app-body>')
      })
  }
```

## extractSourceDom - 提取 DOM 中的 link 和 script 标签

利用 window 自带的 DOM 解析器，将 html 解析为 DOM 树
从 DOM 树中获取 micro-app-head 标签内容
从 DOM 树中获取 micro-app-body 标签内容

flatChildren 主要的处理逻辑

```ts
export function extractSourceDom(htmlStr: string, app: AppInterface): void {
  // window自带的 DOM 解析器 - DOMParser 
  const wrapElement = app.parseHtmlString(htmlStr)
  
  // micro-app-head 标签内容
  const microAppHead = globalEnv.rawElementQuerySelector.call(wrapElement, 'micro-app-head')
  // micro-app-body 标签内容
  const microAppBody = globalEnv.rawElementQuerySelector.call(wrapElement, 'micro-app-body')

  // 如果任意一个不存在就抛出错误
  if (!microAppHead || !microAppBody) {
    const msg = `element ${microAppHead ? 'body' : 'head'} is missing`
    app.onerror(new Error(msg))
    return logError(msg, app.name)
  }

  // fiber 任务
  const fiberStyleTasks: fiberTasks = app.isPrefetch || app.fiber ? [] : null


  // 主要的处理逻辑
  flatChildren(wrapElement, app, microAppHead, fiberStyleTasks)

  /**
   * Style and link are parallel, because it takes a lot of time for link to request resources. During this period, style processing can be performed to improve efficiency.
   */
  const fiberStyleResult = serialExecFiberTasks(fiberStyleTasks)

  if (app.source.links.size) {
    // 请求 link  标签内容，然后将其作为 style 标签解析后放入到原位置
    // 请求完成之后，在使用 scopedCSS ，为样式选择器添加作用域 micro-app[name=[app.name]] xxx {}
    fetchLinksFromHtml(wrapElement, app, microAppHead, fiberStyleResult)
  } else if (fiberStyleResult) {
    // 如果是 style 标签，处理完成之后执行 onLoad
    fiberStyleResult.then(() => app.onLoad({ html: wrapElement }))
  } else {
    // 没有 link 和 style 任意一个标签，执行 onLoad
    app.onLoad({ html: wrapElement })
  }

  // 下载远程 script 标签中的
  if (app.source.scripts.size) {
    fetchScriptsFromHtml(wrapElement, app)
  } else {
    app.onLoad({ html: wrapElement })
  }
}

```

## flatChildren - 拉平子元素

1. 循环 html 下的子元素，然后递归调用 flatChildren 方法，直到子元素为空。
2. 循环解析 link, script, style 标签，然后将其放入到 fiberStyleTasks 数组中。

解析 link 标签
- 存在 exclude 属性或者 excludeChecker 插件处理完成之后，添加注释节点
- 不存在 ignore 属性或者 ignoreChecker 插件处理完成之后，使用 extractLinkFromHtml 提取 link 信息
- 存在 ignore 或者 ignoreChecker 插件并且存在 href 处理完成之后，仅设置 href 

解析 style 标签
- 存在 exclude 属性添加注释
- 使用 scopedCSS 解析

解析 scripts 标签
- extractScriptElement

解析 img 标签
- 将 src 的资源链接，添加子应用的 host，然后设置到 img 标签上


```ts
function flatChildren (
  parent: HTMLElement,
  app: AppInterface,
  microAppHead: Element,
  fiberStyleTasks: fiberTasks,
): void {
  const children = Array.from(parent.children)

  // 递归拉平子节点
  children.length && children.forEach((child) => {
    flatChildren(child as HTMLElement, app, microAppHead, fiberStyleTasks)
  })
  
 for (const dom of children) {
    // <link /> 标签
    if (isLinkElement(dom)) {
      // excludeChecker 插件: 如果函数返回 `true` 则忽略 script 和 link 标签的创建
      if (dom.hasAttribute('exclude') || checkExcludeUrl(dom.getAttribute('href'), app.name)) {
        // 如果返回 true，则创建注释节点
        parent.replaceChild(document.createComment('link element with exclude attribute ignored by micro-app'), dom)

        // 没有忽略属性
      } else if (!(dom.hasAttribute('ignore') || checkIgnoreUrl(dom.getAttribute('href'), app.name))) {
        // 提取 link 信息到 sourceCenter 仓库中，然后删除该 link 标签
        extractLinkFromHtml(dom, parent, app)

        // 设置 href 
      } else if (dom.hasAttribute('href')) {
        globalEnv.rawSetAttribute.call(dom, 'href', CompletionPath(dom.getAttribute('href')!, app.url))
      }

    // <style /> 标签
    } else if (isStyleElement(dom)) {
      // exclude 属性添加注释
      if (dom.hasAttribute('exclude')) {
        parent.replaceChild(document.createComment('style element with exclude attribute ignored by micro-app'), dom)

        // 处理 style 标签
      } else if (app.scopecss && !dom.hasAttribute('ignore')) {
        injectFiberTask(fiberStyleTasks, () => scopedCSS(dom, app))
      }

    // <script /> 标签（内联 | 外链）
    } else if (isScriptElement(dom)) {
      // 提取 script 标签信息放入到 sourceCenter.script 中，然后将标签替换为注释标签
      extractScriptElement(dom, parent, app)

    // <img /> 标签
    } else if (isImageElement(dom) && dom.hasAttribute('src')) {
      globalEnv.rawSetAttribute.call(dom, 'src', CompletionPath(dom.getAttribute('src')!, app.url))
    }
  }
}

```

## extractLinkFromHtml - 提取 link 标签内容

sourceCenter 存储数据格式
```js
{
  link: {
    setInfo(address, info){ linkList.set(address, info) },
    getInfo(){ },
    hasInfo(){ },
    deleteInfo(){ },
  },
  script: {
    setInfo(address, info){ script.set(address, info) },
    getInfo(){ },
    hasInfo(){ },
    deleteInfo(){ },
    deleteInlineInfo(){ },
  }
}


linkList = {
 code: "",
 appSpace: {
   [app.name]: {
     attrs: {href: "xxx", ref: "stylesheet"}
   }
 }
}
```

解析 link 标签： - 暂不考虑 prefetch, 只看主流程
- stylesheet 属性表示一个外部加载样式表
- 拼接完整的 href, 放入到 sourceCenter 的 link 属性中
- 将相关信息存储到 sourceCenter 中
- 非动态链接，将 link 节点替换为注释节点


```ts
// 提取 link 信息到一个 sourceCenter 仓库中，然后删除该标签
export function extractLinkFromHtml (
  link: HTMLLinkElement,
  parent: Node | null,
  app: AppInterface,
  isDynamic = false,
): any {
  const rel = link.getAttribute('rel')
  let href = link.getAttribute('href')
  let replaceComment: Comment | null = null

  // stylesheet 表示一个外部加载样式表
  if (rel === 'stylesheet' && href) {
    href = CompletionPath(href, app.url)

    // 查看是否已经存在，存在则直接返回
    let linkInfo = sourceCenter.link.getInfo(href)
    const appSpaceData = {
      attrs: getAttributes(link),
    }

    // linkInfo 存在，则合并 appSpaceData
    if (!linkInfo) {
      linkInfo = {
        code: '',
        appSpace: {
          [app.name]: appSpaceData,
        }
      }
    } else {
      linkInfo.appSpace[app.name] = linkInfo.appSpace[app.name] || appSpaceData
    }

    sourceCenter.link.setInfo(href, linkInfo)

    // 非动态链接
    if (!isDynamic) {
      // 放入到全局资源中
      app.source.links.add(href)

      // 填充 placeholder 属性
      replaceComment = document.createComment(`link element with href=${href} move to micro-app-head as style element`)
      linkInfo.appSpace[app.name].placeholder = replaceComment
    } else {
      return { address: href, linkInfo }
    }

    // 如果是预加载
  } else if (rel && ['prefetch', 'preload', 'prerender', 'modulepreload'].includes(rel)) {
    // preload prefetch prerender ....
    if (isDynamic) {
      replaceComment = document.createComment(`link element with rel=${rel}${href ? ' & href=' + href : ''} removed by micro-app`)
    } else {
      parent?.removeChild(link)
    }

    // 有 href 链接 - dns-prefetch 提前将 href 解析为 ip 地址
  } else if (href) {
    // dns-prefetch preconnect modulepreload search ....
    globalEnv.rawSetAttribute.call(link, 'href', CompletionPath(href, app.url))
  }

  // 静态的 link 标签提取出 link 标签的属性之后，在 DOM 树中删除该 link DOM
  if (isDynamic) {
    return { replaceComment }
  } else if (replaceComment) {
    // 替换 link 标签为 replaceComment 注释标签 
    return parent?.replaceChild(replaceComment, link)
  }
}
```
