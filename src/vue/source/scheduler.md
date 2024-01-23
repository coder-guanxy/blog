# Scheduler 调度

在前面介绍[组件的挂载和更新](./processComponent.md#将-render-函数与-effect-结合-setuprendereffect)中 `setupRenderEffect` 函数中有使用 `queueJob` 函数。

下面我们就来介绍一下

调度分三种：
1. pre - 同步之前
2. 同步调度 - 
3. post - 下一个微任务执行 - mounted | updated

首先定义三个存储队列以及一些
```ts
// 任务队列
const queue: SchedulerJob[] = []
let flushIndex = 0

// 
const pendingPostFlushCbs: SchedulerJob[] = []
let activePostFlushCbs: SchedulerJob[] | null = null
let postFlushIndex = 0

// 微任务 - Promise.resolve
const resolvedPromise = /*#__PURE__*/ Promise.resolve() as Promise<any>

// 当前正在执行的 flush 任务
let currentFlushPromise: Promise<void> | null = null
```

## 任务加入到队列中 - queueJob

- 传入的任务，不在任务队列中
- 

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