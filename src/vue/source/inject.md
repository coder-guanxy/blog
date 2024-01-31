# provide | inject

也就是一个提供 provides 一个对象，另一个从对象中取出值

## provide

```ts
export function provide<T>(key: InjectionKey<T> | string | number, value: T) {
  if (!currentInstance) {
    // 开发环境：如果不存在就抛出错误
    if (__DEV__) {
      warn(`provide() can only be used inside setup().`)
    }
  } else {
    // 取出当前的 provides
    let provides = currentInstance.provides

    // 找出父的节点的 provides
    // 如果没有父节点，那么当前的 provides 就是 root provides
    // 因为 root provides 是全局的，所以不需要原型链
    // 如果有父节点，那么当前的 provides 就是父节点的 provides 的一个副本
    // 这样在当前节点注入时，就可以通过原型链找到父节点的 provides    
    const parentProvides =
      currentInstance.parent && currentInstance.parent.provides

    // root provides
    if (parentProvides === provides) {
      provides = currentInstance.provides = Object.create(parentProvides)
    }
    // 提供一个对象
    provides[key as string] = value
  }
}
```



## inject

```ts
export function inject(
  key: InjectionKey<any> | string,
  defaultValue?: unknown,
  treatDefaultAsFactory = false
) {
  // 当前实例对象
  const instance = currentInstance || currentRenderingInstance

  // 也支持 app 级别的 provides => app.runWithContext
  if (instance || currentApp) {
    // #2400
    // to support `app.use` plugins,
    // fallback to appContext's `provides` if the instance is at root
    const provides = instance
      ? instance.parent == null
      // instance.parent 为 null => app
        ? instance.vnode.appContext && instance.vnode.appContext.provides
        // 否则找出当前实例的父节点的 provides
        : instance.parent.provides


      : currentApp!._context.provides

    // 如果 provides 存在并且传入的 key 也在 provides 中直接取出返回
    if (provides && (key as string | symbol) in provides) {
      // TS doesn't allow symbol as index type
      return provides[key as string]

    // 
    } else if (arguments.length > 1) {
      // 默认值是一个函数
      return treatDefaultAsFactory && isFunction(defaultValue)
        ? defaultValue.call(instance && instance.proxy)
        // 默认值
        : defaultValue
    } 
  }
}

```