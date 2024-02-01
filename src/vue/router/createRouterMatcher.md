# createRouterMatcher

也算是一个比较重要的方法了，它主要用来创建一个 Matcher 匹配器，用来匹配路由

回顾一下 createRouter 中使用

```ts
// 创建一个 Matcher 匹配器，下一章会详细介绍
const matcher = createRouterMatcher(options.routes, options)
```

参数：
- routes: 开发者路由配置
- globalOptions: 全局路由配置

初始化：
- 声明一下 matchers 仓库
- 创建一个(name 对应 matcher) matcherMap 仓库
- 合并全局配置
- 循环routes 为每个 route 执行 addRoute

```ts
export function createRouterMatcher(
  routes: Readonly<RouteRecordRaw[]>,
  globalOptions: PathParserOptions
): RouterMatcher {

  // 声明一下 matchers 仓库
  const matchers: RouteRecordMatcher[] = []

  // 创建一个(name 对应 matcher) matcherMap 仓库 - name -> matcher
  const matcherMap = new Map<RouteRecordName, RouteRecordMatcher>()

  // 合并全局配置
  globalOptions = mergeOptions(
    { strict: false, end: true, sensitive: false } as PathParserOptions,
    globalOptions
  )

  // 下面是一些方法
  // getRecordMatcher， addRoute，removeRoute，getRoutes，insertMatcher
  // resolve
  //...
  
  // 为配置的每个 route 执行 addRoute 
  routes.forEach(route => addRoute(route))

  return { addRoute, resolve, removeRoute, getRoutes, getRecordMatcher }
}
```

下面是 addRoute 方法

## 添加路由到 matchers 仓库

参数：
- record：开发者路由配置
- parent：父级的 matcher
- originalRecord：暂不知道是什么

```ts
  function addRoute(
    record: RouteRecordRaw,
    parent?: RouteRecordMatcher,
    originalRecord?: RouteRecordMatcher
  ) {
    const isRootAdd = !originalRecord

    // 返回一个标准化对象-下面有介绍
    const mainNormalizedRecord = normalizeRouteRecord(record)

    // 暂不考虑 别名
    mainNormalizedRecord.aliasOf = originalRecord && originalRecord.record

    // 合并全局的 options 和 route 路由
    const options: PathParserOptions = mergeOptions(globalOptions, record)

    // 标准化记录数组
    const normalizedRecords: (typeof mainNormalizedRecord)[] = [
      mainNormalizedRecord,
    ]

    // 如果有别名，对于别名的处理
    // push 到 normalizedRecords 中
    if ('alias' in record) {
      //...
    }

    // 声明 matcher 和 originalMatcher
    let matcher: RouteRecordMatcher
    let originalMatcher: RouteRecordMatcher | undefined

    // 循环每个 record
    for (const normalizedRecord of normalizedRecords) {
      const { path } = normalizedRecord

      // 父级存在并且当前是相对路由
      // parent => "/user"
      // children => "list" => "/user/list"
      if (parent && path[0] !== '/') {
        const parentPath = parent.record.path

        // 父级最后一个位判断
        const connectingSlash =
          parentPath[parentPath.length - 1] === '/' ? '' : '/'
        
        // 完整路径 - 父级路径 + 当前路径
        normalizedRecord.path =
          parent.record.path + (path && connectingSlash + path)
      }

      // 创建一个 matcher - 重要的函数
      matcher = createRouteRecordMatcher(normalizedRecord, parent, options)

      // 如果有子级（children 属性），继续递归调用 addRoute
      if (mainNormalizedRecord.children) {
        const children = mainNormalizedRecord.children

        // 循环每个子级路由，然后把当前的 matcher 作为 parent，递归调用 addRoute
        for (let i = 0; i < children.length; i++) {
          addRoute(
            children[i],
            matcher,
            originalRecord && originalRecord.children[i]
          )
        }
      }

      // 判断当前路由是否需要插入到 matcher 中
      if (
        (matcher.record.components &&
          Object.keys(matcher.record.components).length) ||
        matcher.record.name ||
        matcher.record.redirect
      ) {
        insertMatcher(matcher)
      }

    // 判断当前路由是否需要插入到 matcher 中
    return originalMatcher
      ? () => {
          removeRoute(originalMatcher!)
        }
      : noop
    }
  }

```


### 变准化 route 对象 - normalizeRouteRecord

只是返回一个对象

```ts
export function normalizeRouteRecord(
  record: RouteRecordRaw
): RouteRecordNormalized {
  return {
    path: record.path, // 路径
    redirect: record.redirect, // 重定向配置
    name: record.name, // 路由命名
    meta: record.meta || {}, // 路由携带的元信息
    aliasOf: undefined, // 别名
    beforeEnter: record.beforeEnter, // 路由前置守卫
    props: normalizeRecordProps(record), // 将 props 传递给路由组件
    children: record.children || [], // 子路由
    instances: {},
    leaveGuards: new Set(), // 离开守卫
    updateGuards: new Set(), // 更新守卫
    enterCallbacks: {}, // 进入守卫
    components:         // 路由对应组件
      'components' in record
        ? record.components || null
        : record.component && { default: record.component },
  }
}

```

## createRouteRecordMatcher

tokenizePath 函数是一个状态机，将一个字符串分解为不同的 token： 返回一个 token 数组
 会将 `path = "/user/:username"` 转化为
```json
  [
    {type: TokenType.Static, value: "user"}, 
    {type: TokenizerState.Param, value: "username"}
  ]
```

```ts
export function createRouteRecordMatcher(
  record: Readonly<RouteRecord>,
  parent: RouteRecordMatcher | undefined,
  options?: PathParserOptions
): RouteRecordMatcher {
  // tokenizePath 函数将 patch 进行 AST 解析 tokenizePath - > 返回一个 token 数组
  // path = "/user/:username"
  // tokenizePath => [
  //  { type: TokenType.Static, value: "user"}, 
  //  {type: TokenizerState.Param, value: "username"}]

  //  /:orderId -> 仅匹配数字 { path: '/:orderId(\\d+)' },
  // tokenizePath => [
  //  {type: TokenizerState.Param, value: "orderId"}, 
  //  {type: TokenizerState.ParamRegExp, customRe: "\\d+"}, 
  //  {type: TokenizerState.ParamRegExpEnd, customRe: "\\d+"}, 
  //  ]
  const parser = tokensToParser(tokenizePath(record.path), options)

  // 合并为一个 matcher 匹配器
  const matcher: RouteRecordMatcher = assign(parser, {
    record,
    parent,
    // these needs to be populated by the parent
    children: [],
    alias: [],
  })


  // 暂不考虑 aliases 的处理
  if (parent) {
    if (!matcher.record.aliasOf === !parent.record.aliasOf)
      parent.children.push(matcher)
  }

  return matcher
}

```