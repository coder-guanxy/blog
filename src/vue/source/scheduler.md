# Scheduler 调度

在前面介绍[组件的挂载和更新](./processComponent.md#将-render-函数与-effect-结合-setuprendereffect)中 `setupRenderEffect` 函数中有使用 `queueJob` 函数。

下面我们就来介绍一下

调度分三种：
1. pre - 同步之前
2. 正常任务调度 - 下一个微任务执行
3. post - 正常任务调度执行之后 - (mounted | updated)

首先定义三个存储队列以及一些
```ts
// 任务队列
const queue: SchedulerJob[] = []
let flushIndex = 0

// post 任务队列
const pendingPostFlushCbs: SchedulerJob[] = []

// 活动的 post 任务队列
let activePostFlushCbs: SchedulerJob[] | null = null

// post 任务队列的指针
let postFlushIndex = 0

// 微任务 - Promise.resolve
const resolvedPromise = /*#__PURE__*/ Promise.resolve() as Promise<any>

// 当前正在执行的 flush 任务， 为 nextTick 准备的
let currentFlushPromise: Promise<void> | null = null
```

## 任务加入到队列中 - queueJob

- 传入的任务，不在任务队列中

```ts
export function queueJob(job: SchedulerJob) {
  // 队列长度为 0
  // 或者当前任务不在队列中
  if (
    !queue.length ||
    !queue.includes(
      job,
      // 如果当前正在执行任务，则从下一个 flushIndex 开始查找
      isFlushing && job.allowRecurse ? flushIndex + 1 : flushIndex
    )
  ) {

    // 
    if (job.id == null) {
      // 加入到队列中
      queue.push(job)
    } else {
      // 找到当前的 id，并插入到之后
      queue.splice(findInsertionIndex(job.id), 0, job)
    }

    // 开始调用队列函数
    queueFlush()
  }
}
```
## 加入 post 队列

- 加入到 pendingPostFlushCbs 队列中
- 开始调用 queueFlush 函数

```ts
export function queuePostFlushCb(cb: SchedulerJobs) {
  // 首先看加入队列的 callback 是不是数组
  if (!isArray(cb)) {

    // 正在执行的队列中不存在此回调函数
    if (
      !activePostFlushCbs ||
      !activePostFlushCbs.includes(
        cb,
        cb.allowRecurse ? postFlushIndex + 1 : postFlushIndex
      )
    ) {

      // 加入到队列中
      pendingPostFlushCbs.push(cb)
    }
  } else {
    // 完成后的生命周期，比如 updated, mounted
    pendingPostFlushCbs.push(...cb)
  }

  // 执行正常上面调用
  queueFlush()
}
```


## 开始调度队列任务 - queueFlush

不管是 queuePostFlushCb 还是 queueJob 队列加入后都是直接都要用 queueFlush 函数

- 下一个微任务开始调度
- 主要调度 flushJobs

```ts
function queueFlush() {
  if (!isFlushing && !isFlushPending) {
    // 正在调度中标识更改
    isFlushPending = true
    // 下一个微任务开始调度
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}
```

### 调度任务 - flushJobs

使用 [callWithErrorHandling](./callwithErrorHandler.html#同步函数处理-callwitherrorhandling) 进行调用

- 先执行队列中的任务，然后在调用 post 队列中任务

```ts
function flushJobs(seen?: CountMap) {
  // 开始调度阶段标识改变
  isFlushPending = false

  // 执行阶段
  isFlushing = true

  // 队列排序 
  queue.sort(comparator)

  try {

    // 循环队列中的
    for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
      const job = queue[flushIndex]

      // active 标识： effect 中有此标识表示可以执行
      if (job && job.active !== false) {
        // 开始调度
        callWithErrorHandling(job, null, ErrorCodes.SCHEDULER)
      }
    }
  } finally {

    // 队列清空，甭管是否有错误出现都要清空
    flushIndex = 0
    queue.length = 0

    // 开始执行 post 队列
    flushPostFlushCbs(seen)

    // 正在执行的标识更改
    isFlushing = false

    // 当前任务置空
    currentFlushPromise = null
    // some postFlushCb queued jobs!
    // keep flushing until it drains.
    // queue 中，在执行 flushPostFlushCbs 中，又加入到 queue 或 pendingPostFlushCbs 中
    if (queue.length || pendingPostFlushCbs.length) {
      flushJobs(seen)
    }
  }
}
```
### 排序 - comparator

如果任务 id 相同则有 pre 则优先有 pre 标识的

```ts
// 获取任务 id
const getId = (job: SchedulerJob): number =>
  job.id == null ? Infinity : job.id

// 比较 job.id，如果没有 id, 返回 NaN
const comparator = (a: SchedulerJob, b: SchedulerJob): number => {
  const diff = getId(a) - getId(b)
  if (diff === 0) {
    if (a.pre && !b.pre) return -1
    if (b.pre && !a.pre) return 1
  }
  return diff
}
```

## 调用 post 队列 - flushPostFlushCbs

- 循环执行活动 post 队列

```ts
export function flushPostFlushCbs(seen?: CountMap) {
  // post 队列中有任务
  if (pendingPostFlushCbs.length) {

    // 排重一下任务队列
    const deduped = [...new Set(pendingPostFlushCbs)]
    pendingPostFlushCbs.length = 0

    // #1947 already has active queue, nested flushPostFlushCbs call
    // 如果当前正在执行 flushPostFlushCbs，再次执行 flushPostFlushCbs，
    // 加入到正在执行的队列中
    if (activePostFlushCbs) {
      activePostFlushCbs.push(...deduped)
      return
    }

    // 赋值为活动的队列
    activePostFlushCbs = deduped

    // 排序活动队列
    activePostFlushCbs.sort((a, b) => getId(a) - getId(b))

    // 循环执行活动队列
    for (
      postFlushIndex = 0;
      postFlushIndex < activePostFlushCbs.length;
      postFlushIndex++
    ) {
      activePostFlushCbs[postFlushIndex]()
    }

    // 清空 post 活动队列
    activePostFlushCbs = null
    postFlushIndex = 0
  }
}
```


## 非联动调用的 pre 队列 - flushPreFlushCbs

- 也是加入到队列中
-  Suspense 组件更新时执行 `updateComponentPreRender` 
- 和应用刚开始 `render` 渲染的时候

- 执行队列中任务（含有 pre 标识）执行，并删除队列中该任务

这个函数在循环时会使用 splice 删除某个任务，会造成数组塌陷问题，然后使用 i-- 进行补偿，值得借鉴。

```ts
export function flushPreFlushCbs(
  seen?: CountMap,
  // if currently flushing, skip the current job itself
  i = isFlushing ? flushIndex + 1 : 0
) {
  
  // 如果有 pre 标识，执行并在队列中
  for (; i < queue.length; i++) {
    const cb = queue[i]
    if (cb && cb.pre) {
      queue.splice(i, 1)
      i--
      cb()
    }
  }
}

```

# nextTick

内容很简单就是 `Promise.resolve().then(fn)` 下一个微任务执行 `fn`

- 如果有任务 currentFlushPromise 会被赋值与任务队列的执行的 Promise，
- 如果没有任务就执行 Promise.then 之后执行

```ts
export function nextTick<T = void>(
  this: T,
  fn?: (this: T) => void
): Promise<void> {
  // 等待执行任务完毕之后再继续执行 nextTick
  // currentFlushPromise 会在 queueFlush 中赋值
  const p = currentFlushPromise || resolvedPromise
  return fn ? p.then(this ? fn.bind(this) : fn) : p
}
```