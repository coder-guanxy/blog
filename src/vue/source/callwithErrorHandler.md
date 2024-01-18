# 错误处理

不管是处理点击事件还是生命周期函数，只要是开发者传入的回调函数，都有可能抛出异常。
有关这块的处理，值得我们再开发中借鉴

执行函数分为两块
- 执行同步函数
- 执行异步函数

## 同步函数处理 - callWithErrorHandling

函数调用在 try...catch 里面，catch 到 error 使用 handleError 执行 

参数：
 - fn - 要执行的函数
 - instance - 组件实例
 - type - 错误类型 - 开发模式下报错会更详细
 - args - 传入 fn 的参数

```ts
export function callWithErrorHandling(
  fn: Function, // 要执行的函数
  instance: ComponentInternalInstance | null, // 组件实例
  type: ErrorTypes, // 错误类型 - 开发模式下报错会更详细
  args?: unknown[] // 传入 fn 的参数
) {
  let res
  try {
    // 执行传入的函数
    res = args ? fn(...args) : fn()
  } catch (err) {
    // 错误处理
    handleError(err, instance, type)
  }

  // 返回处理结果
  return res
}
```

## 异步函数处理 - callWithAsyncErrorHandling

- fn 为函数时
  - 传入 fn 先调用 `callWithErrorHandling` 执行，
  - 返回结果如果是 Promise，则使用 `res.catch` 进行拦截，进而使用 `handleError` 处理错误
- fn 为数组时
  - 循环并且递归调用当前函数 `callWithAsyncErrorHandling`
  - 将执行结果放入数组中并返回

参数：
 - fn - 要执行的函数
 - instance - 组件实例
 - type - 错误类型 - 开发模式下报错会更详细
 - args - 传入 fn 的参数
  
```ts
export function callWithAsyncErrorHandling(
  fn: Function | Function[],
  instance: ComponentInternalInstance | null,
  type: ErrorTypes,
  args?: unknown[]
): any[] {

  // 为函数
  if (isFunction(fn)) {
    // 调用同步执行函数
    const res = callWithErrorHandling(fn, instance, type, args)

    // 返回结果如果是 Promise 对象，则需要处理 Promise 对象抛出的错误
    if (res && isPromise(res)) {
      res.catch(err => {
        handleError(err, instance, type)
      })
    }
    return res
  }

  // 为函数数组，调用自身
  const values = []
  for (let i = 0; i < fn.length; i++) {
    values.push(callWithAsyncErrorHandling(fn[i], instance, type, args))
  }
  return values
}
```


## 错误处理 - handleError

整个过程：
- 查看父级组件有没有声明错误处理函数 - errorCapturedHooks
- 如果没有继续向上查找，直到找到根组件
- 如果根组件也没有，则使用全局错误处理函数 - config.errorHandler
- 最后使用 Vue 默认的错误处理函数 - console.error


参数：
- err - catch 的错误信息
- instance - 组件实例
- type - 错误类型 - 开发模式下报错会更详细
- throwInDev - 在开发模式下是否抛出错误


```ts
export function handleError(
  err: unknown,
  instance: ComponentInternalInstance | null,
  type: ErrorTypes,
  throwInDev = true
) {

  // 组件虚拟 DOM
  const contextVNode = instance ? instance.vnode : null

  // 当前组件实例
  if (instance) {
    // 当前组件父组件
    let cur = instance.parent
    // the exposed instance is the render proxy to keep it consistent with 2.x
    const exposedInstance = instance.proxy

    // 错误信息类型
    const errorInfo = __DEV__ ? ErrorTypeStrings[type] : type

    // 组件错误处理，向上冒泡
    while (cur) {
      // 开发者在组件中声明的错误处理的钩子函数
      const errorCapturedHooks = cur.ec

      // 循环执行该钩子函数
      if (errorCapturedHooks) {
        for (let i = 0; i < errorCapturedHooks.length; i++) {
          if (
            errorCapturedHooks[i](err, exposedInstance, errorInfo) === false
          ) {
            return
          }
        }
      }

      // 如果父组件没有声明错误处理函数，继续向上查找，直到找到根组件上
      cur = cur.parent
    }

    // 应用级别的处理 - 如果组件级别都没有处理，则需要应用级别的错误处理函数
    // 如果用户 app 中有 errorHandler 
    const appErrorHandler = instance.appContext.config.errorHandler

    // 在应用 App 上声明的错误处理函数
    if (appErrorHandler) {
      callWithErrorHandling(
        appErrorHandler,
        null,
        ErrorCodes.APP_ERROR_HANDLER,
        [err, exposedInstance, errorInfo]
      )
      return
    }
  }

  // 打印错误
  logError(err, type, contextVNode, throwInDev)
}

```


## 打印错误 - logError

开发模式下打印错误信息
- warn 打印
- 是否抛出错误，中断应用继续执行
  - 中断 - throw
  - 不中断 - console.error

生产模式下打印错误信息
- console.error


参数：
- err - catch 的错误信息
- instance - 组件实例
- type - 错误类型 - 开发模式下报错会更详细
- throwInDev - 在开发模式下是否抛出错误

```ts
function logError(
  err: unknown,
  type: ErrorTypes,
  contextVNode: VNode | null,
  throwInDev = true
) {

  // 开发模式下打印错误信息
  if (__DEV__) {
    const info = ErrorTypeStrings[type]

    // 添加到警告上下文
    if (contextVNode) {
      pushWarningContext(contextVNode)
    }

    // 警告 - 使用警告上下文
    warn(`Unhandled error${info ? ` during execution of ${info}` : ``}`)

    // 抛出警告上下文
    if (contextVNode) {
      popWarningContext()
    }
    // 是否抛出错误
    if (throwInDev) {
      throw err
    } else if (!__TEST__) {
      console.error(err)
    }
  } else {
    // 生产环境下打印错误信息
    console.error(err)
  }
}
```