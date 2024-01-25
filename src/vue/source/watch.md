# watch

watch API 分为四种：

- watchEffect - 立即运行一个函数，同时响应式地追踪其依赖，并在依赖更改时重新执行。
- watchPostEffect - watchEffect() 使用 flush: 'post' 选项时的别名
- watchSyncEffect - watchEffect() 使用 flush: 'sync' 选项时的别名。
- watch - 侦听一个或多个响应式数据源，并在数据源变化时调用所给的回调函数。

详细请参照[文档说明](https://cn.vuejs.org/api/reactivity-core.html#watcheffect)


接下来我们分别看一下上面四种 API 的使用方法。

## watchEffect

- 调用了 doWatch

```ts
export function watchEffect(
  effect: WatchEffect,
  options?: WatchOptionsBase
): WatchStopHandle {
  return doWatch(effect, null, options)
}
```

## watchPostEffect

```ts
export function watchPostEffect(
  effect: WatchEffect,
  options?: DebuggerOptions
) {
  return doWatch(
    effect,
    null,
    { flush: 'post' }
  )
}
```

## watchSyncEffect

```ts
export function watchSyncEffect(
  effect: WatchEffect,
  options?: DebuggerOptions
) {
  return doWatch(
    effect,
    null,
    { flush: 'sync' }
  )
}
```

## watch

```ts
export function watch<T = any, Immediate extends Readonly<boolean> = false>(
  source: T | WatchSource<T>,
  cb: any,
  options?: WatchOptions<Immediate>
): WatchStopHandle {
  return doWatch(source as any, cb, options)
}
```

由上面源码来看出：
- 都最终调用的时 doWatch
- `watchPostEffect` 和 `watchSyncEffect` 相当于 `watchEffect` 的快捷写法
- watch 相当于 watchEffect 的完整写法

下面我们来看一下 doWatch 的实现。


## doWatch
参数：
- source：要观察的对象 | 
- cb：观察对象发生改变之后要执行的回调函数
- flush：不同的执行时机 sync - 同步 post - 同步之后 pre - 同步之前
- onTrack | onTrigger => 跟踪和触发依赖项的回调函数
- deep：深度
- immediate：立即执行

主要做的事情：
第一步：先统一 source 格式 (ref | reactive | array | function 统一为 getter 函数)
第二步：构建 scheduler 
第三步：构建一个 effect 将 getter 和 scheduler 传入
第四步：执行 effect.run 也就是执行 getter 函数

```ts
function doWatch(
  source: WatchSource | WatchSource[] | WatchEffect | object,
  cb: WatchCallback | null,
  { immediate, deep, flush, onTrack, onTrigger }: WatchOptions = EMPTY_OBJ
): WatchStopHandle {

  // 获取当前实例
  const instance =
    getCurrentScope() === currentInstance?.scope ? currentInstance : null
  // const instance = currentInstance
  let getter: () => any
  let forceTrigger = false
  let isMultiSource = false

  //----------- 将 source 构建为 getter -----------
  // - source - 观察的值
  //  1. ref - 观察的值是 ref
  //  2. reactive - 观察的值是 reactive
  //  3. array - 观察的值是数组
  //  4. function - 观察的值是函数
  if (isRef(source)) {
    getter = () => source.value
    forceTrigger = isShallow(source)
  } else if (isReactive(source)) {
    getter = () => source
    // 深度获取
    deep = true
  } else if (isArray(source)) {
    // 多观察对象
    isMultiSource = true
    forceTrigger = source.some(s => isReactive(s) || isShallow(s))

    // 多个观察对象分别处理
    getter = () =>
      source.map(s => {
        if (isRef(s)) {
          return s.value
        } else if (isReactive(s)) {
          return traverse(s)
        } else if (isFunction(s)) {
          return callWithErrorHandling(s, instance, ErrorCodes.WATCH_GETTER)
        }
      })
  // source 为函数
  } else if (isFunction(source)) {

    // 有回调的情况
    if (cb) {
      // 直接执行 source
      getter = () =>
        callWithErrorHandling(source, instance, ErrorCodes.WATCH_GETTER)
    } else {
      // 无回调的情况
      // no cb -> simple effect
      getter = () => {
        if (instance && instance.isUnmounted) {
          return
        }
        if (cleanup) {
          cleanup()
        }
        return callWithAsyncErrorHandling(
          source,
          instance,
          ErrorCodes.WATCH_CALLBACK,
          [onCleanup]
        )
      }
    }
  } else {
    getter = NOOP
  }

  // 如果 deep 为 true 并且存在 cb 
  if (cb && deep) {
    const baseGetter = getter
    // 循环获取值
    getter = () => traverse(baseGetter())
  }

  let cleanup: () => void

  // 构建一个清除函数，
  let onCleanup: OnCleanup = (fn: () => void) => {
    cleanup = effect.onStop = () => {

      // 执行清理函数
      callWithErrorHandling(fn, instance, ErrorCodes.WATCH_CLEANUP)
    }
  }

  // 保留上一个值 INITIAL_WATCHER_VALUE => {}
  let oldValue: any = isMultiSource
    ? new Array((source as []).length).fill(INITIAL_WATCHER_VALUE)
    : INITIAL_WATCHER_VALUE

  //----------- 构建 scheduler - job -----------
  // - job 任务
  //  1. 当前 effect 不是活跃的 effect 直接返回不执行
  //  2. 有 cb
  //    - 先执行 effect.run 获取 newValue
  //    - 然后根据 deep，forceTrigger，hasChanged
  //    - 有标识并且有 cleanup 执行 cleanup 清理函数
  //    - 执行 cb ，cb 的实参 newValue, oldValue, onCleanup（清理函数，观察中的值有变化时，先执行清理函数）
  //    - 将 newValue 赋值到 oldValue
  //  3. 无 cb，直接执行 effect.run 方法
  const job: SchedulerJob = () => {
    if (!effect.active) {
      return
    }

    // 有回调
    if (cb) {
      // watch(source, cb)
      // 执行 getter 获取新值
      const newValue = effect.run()
      if (
        deep ||
        forceTrigger ||
        (isMultiSource
          ? (newValue as any[]).some((v, i) =>
              hasChanged(v, (oldValue as any[])[i])
            )
          : hasChanged(newValue, oldValue))
      ) {
        // cleanup before running cb again
        // 如果新旧值不一致
        if (cleanup) {
          cleanup()
        }

        // 执行 callback
        callWithAsyncErrorHandling(cb, instance, ErrorCodes.WATCH_CALLBACK, [
          newValue,
          // pass undefined as the old value when it's changed for the first time
          oldValue === INITIAL_WATCHER_VALUE
            ? undefined
            : isMultiSource && oldValue[0] === INITIAL_WATCHER_VALUE
            ? []
            : oldValue,
          onCleanup
        ])

        // 下次更新时，新值就是旧值
        oldValue = newValue
      }
    } else {
      // 执行 effect.run，也就是执行 getter
      effect.run()
    }
  }

  job.allowRecurse = !!cb


  // - scheduler - 调度方法分三种
  // 1. 同步 - 同步直接执行
  // 2. post - 下一个微任务执行
  // 3. pre - 同步之后先执行 pre 再执行 post
  let scheduler: EffectScheduler
  // 同步
  if (flush === 'sync') {
    scheduler = job as any // the scheduler function gets called directly
  } else if (flush === 'post') {
    // 将其加入到 post 渲染队列中
    scheduler = () => queuePostRenderEffect(job, instance && instance.suspense)
  } else {
    // default: 'pre' 
    // 加入到 queueJob 队列中
    job.pre = true
    if (instance) job.id = instance.uid
    scheduler = () => queueJob(job)
  }


  // 创建一个 effect
  // 当执行 effect.run 时，执行的是 getter，getter 会执行 reactive | ref 的获取，将 effect 与 target 的属性关联
  // 当 target 的属性发生变化时，触发 setter，setter 会执行 trigger 方法，将 scheduler 加入 queue 中
  const effect = new ReactiveEffect(getter, scheduler)

  // initial run
  // 初始执行
  if (cb) {
    // 立即执行
    if (immediate) {
      job()
    } else {
      // 先执行一下 getter
      oldValue = effect.run()
    }
  } else if (flush === 'post') {
    // 将 effect.run 加入到 post 队列中
    queuePostRenderEffect(
      effect.run.bind(effect),
      instance && instance.suspense
    )
  } else {

    // 如果没有 cb 则直接执行
    effect.run()
  }


  // 停止观察函数
  const unwatch = () => {
    // 停止 effect
    effect.stop()
    if (instance && instance.scope) {
      remove(instance.scope.effects!, effect)
    }
  }

  // 返回停止观察的函数，包含一个 stop 方法
  return unwatch
}

```

## 深度递归获取 value - traverse

seen - 使用来去重的，避免重复递归

- 如果是 ref - 继续获取 value.value
- 如果是数组 - 遍历数组，递归调用 traverse
- 如果是 Set 或 Map - 遍历数组，递归调用 traverse
- 如果是对象继续递归traverse
- 否则直接返回

```ts
function traverse(value: unknown, seen?: Set<unknown>) {
  if (!isObject(value) || (value as any)[ReactiveFlags.SKIP]) {
    return value
  }
  seen = seen || new Set()
  if (seen.has(value)) {
    return value
  }
  seen.add(value)
  // 
  if (isRef(value)) {
    traverse(value.value, seen)
  } else if (isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      traverse(value[i], seen)
    }
  } else if (isSet(value) || isMap(value)) {
    value.forEach((v: any) => {
      traverse(v, seen)
    })
  } else if (isPlainObject(value)) {
    for (const key in value) {
      traverse((value as any)[key], seen)
    }
  }
  return value
}

```

