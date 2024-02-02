# 编程路由 - push


编程式最终调用的是 `pushWithRedirect`，由下面源码可知，`replace` 方法只是 `push` 方法简写方式：

```ts
// 跳转至 pushWithRedirect
function push(to: RouteLocationRaw) {
  return pushWithRedirect(to)
}

// 跳转至 pushWithRedirect
function replace(to: RouteLocationRaw) {
  return push(assign(locationAsObject(to), { replace: true }))
}
```

来看一下 pushWithRedirect 函数

主要步骤：
1. 解析 to 地址，找到匹配的 matcher
2. 看是不是替换路由，处理替换路由
3. 是否跳转到当前页面路由
4. 正常跳转，调用 `navigate`
5. 

参数：
- to - 跳转的路由对象
- redirectedFrom - 当前路由对象 - 跳转来源

```ts
  function pushWithRedirect(
    to: RouteLocationRaw | RouteLocation,
    redirectedFrom?: RouteLocation
  ): Promise<NavigationFailure | void | undefined> {

    // 解析 to 地址, 找到匹配的 matcher 
    // { fullPath, path, query, hash, redirectedFrom, href, component, ... }
    const targetLocation: RouteLocation = (pendingLocation = resolve(to))
    const from = currentRoute.value
    const data: HistoryState | undefined = (to as RouteLocationOptions).state
    const force: boolean | undefined = (to as RouteLocationOptions).force
    // 是不是替换路由
    const replace = (to as RouteLocationOptions).replace === true

    // 如果是替换路由， 直接重新进行跳转
    const shouldRedirect = handleRedirectRecord(targetLocation)

    if (shouldRedirect)
      return pushWithRedirect(
        assign(locationAsObject(shouldRedirect), {
          state:
            typeof shouldRedirect === 'object'
              ? assign({}, data, shouldRedirect.state)
              : data,
          force,
          replace,
        }),
        redirectedFrom || targetLocation
      )

    const toLocation = targetLocation as RouteLocationNormalized

    toLocation.redirectedFrom = redirectedFrom
    let failure: NavigationFailure | void | undefined

    // 与当前相同的路由，跳转到当前路由
    if (!force && isSameRouteLocation(stringifyQuery, from, targetLocation)) {
      failure = createRouterError<NavigationFailure>(
        ErrorTypes.NAVIGATION_DUPLICATED,
        { to: toLocation, from }
      )
      // trigger scroll to allow scrolling to the same anchor
      handleScroll(
        from,
        from,
        // this is a push, the only way for it to be triggered from a
        // history.listen is with a redirect, which makes it become a push
        true,
        // This cannot be the first navigation because the initial location
        // cannot be manually navigated to
        false
      )
    }

    // 最终的调用
    // 如果当前路由跳转当前路由使用 Promise.resolve(failure）
    // 否则使用 navigate(toLocation, from)
    // navigate 调用各种导航守卫的钩子 - 
    // finalizeNavigation 最终的调用
    return (failure ? Promise.resolve(failure) : navigate(toLocation, from))
      .catch((error: NavigationFailure | NavigationRedirectError) =>
        isNavigationFailure(error)
          ? // 调用失败，直接抛出错误
            isNavigationFailure(error, ErrorTypes.NAVIGATION_GUARD_REDIRECT)
            ? error
            : markAsReady(error)
          : triggerError(error, toLocation, from)
      )
      .then((failure: NavigationFailure | NavigationRedirectError | void) => {
        if (failure) {

          // 
          if (
            isNavigationFailure(failure, ErrorTypes.NAVIGATION_GUARD_REDIRECT)
          ) {
            return pushWithRedirect(
              assign(
                {
                  replace,
                },
                locationAsObject(failure.to),
                {
                  state:
                    typeof failure.to === 'object'
                      ? assign({}, data, failure.to.state)
                      : data,
                  force,
                }
              ),
              redirectedFrom || toLocation
            )
          }
        } else {
          // 调用最终函数
          failure = finalizeNavigation(
            toLocation as RouteLocationNormalizedLoaded,
            from,
            true,
            replace,
            data
          )
        }
        triggerAfterEach(
          toLocation as RouteLocationNormalizedLoaded,
          from,
          failure
        )
        return failure
      })
  }
```


## 解析 to 地址 - resolve

先只看传入 rawLocation 为 string 的情况，捋顺流程：


```ts
function resolve(
  rawLocation: Readonly<RouteLocationRaw>,
  currentLocation?: RouteLocationNormalizedLoaded
): RouteLocation & { href: string } {
  // 拷贝一份 location
  currentLocation = assign({}, currentLocation || currentRoute.value)

  // 如果传入的时字符串
  if (typeof rawLocation === 'string') {

    // 解析字符串
    //  - 解析 query
    //  - 解析 hash
    //  - {fullPath, path, query, hash}
    const locationNormalized = parseURL(
      parseQuery,
      rawLocation,
      currentLocation.path
    )

    // 调用 matcher 匹配路由，下面我们来看路由解析
    // 返回匹配的路由 {name, path, params, matched, meta}
    // matched 中有 component - 路由组件
    const matchedRoute = matcher.resolve(
      { path: locationNormalized.path },
      currentLocation
    )

    // 调用比如 history 原始的 createHref 方法，创建 href
    const href = routerHistory.createHref(locationNormalized.fullPath)

    // 返回匹配的路由，并添加 params, hash, redirectedFrom, href
    return assign(locationNormalized, matchedRoute, {
      params: decodeParams(matchedRoute.params),
      hash: decode(locationNormalized.hash),
      redirectedFrom: undefined,
      href,
    })
  }
}

```

下面看一下 matcher.resolve 方法：

分三种情况
- 直接使用 name，通过 name 直接获取 matcher
- 直接使用 path，通过正则获取 matcher
- 没有 name 也没有 path，匹配当前的路由

```ts
  function resolve(
    location: Readonly<MatcherLocationRaw>,
    currentLocation: Readonly<MatcherLocation>
  ): MatcherLocation {

    // 先声明初始化参数
    let matcher: RouteRecordMatcher | undefined
    let params: PathParams = {}
    let path: MatcherLocation['path']
    let name: MatcherLocation['name']

    // 如果 to 中使用的 name 属性跳转
    if ('name' in location && location.name) {

      // 通过 name 找到响应的 matcher
      matcher = matcherMap.get(location.name)

      if (!matcher)
        throw createRouterError<MatcherError>(ErrorTypes.MATCHER_NOT_FOUND, {
          location,
        })

      name = matcher.record.name

      // 获取 params 参数
      params = assign(
        paramsFromLocation(
          currentLocation.params,
          matcher.keys.filter(k => !k.optional).map(k => k.name)
        ),
        location.params &&
          paramsFromLocation(
            location.params,
            matcher.keys.map(k => k.name)
          )
      )
      // 通过参数将其转为字符串路径
      path = matcher.stringify(params)
    } else if (location.path != null) {
      // path 存在
      path = location.path


      // 通过构建的正则匹配要跳转的 matcher
      matcher = matchers.find(m => m.re.test(path))

      if (matcher) {
        params = matcher.parse(path)!
        name = matcher.record.name
      }
    } else {
      // 匹配当前的路由
      matcher = currentLocation.name
        ? matcherMap.get(currentLocation.name)
        : matchers.find(m => m.re.test(currentLocation.path))

      if (!matcher)
        throw createRouterError<MatcherError>(ErrorTypes.MATCHER_NOT_FOUND, {
          location,
          currentLocation,
        })
      name = matcher.record.name
      // since we are navigating to the same location, we don't need to pick the
      // params like when `name` is provided
      params = assign({}, currentLocation.params, location.params)
      path = matcher.stringify(params)
    }

    const matched: MatcherLocation['matched'] = []
    let parentMatcher: RouteRecordMatcher | undefined = matcher
    while (parentMatcher) {
      // reversed order so parents are at the beginning

      matched.unshift(parentMatcher.record)
      parentMatcher = parentMatcher.parent
    }

    // 返回对象
    return {
      name,
      path,
      params,
      matched,
      meta: mergeMetaFields(matched),
    }
  }

```


## navigate - 