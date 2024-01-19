# nextTick

内容很简单就是 `Promise.resolve().then(fn)` 下一个微任务执行 `fn`

```ts
const resolvedPromise = /*#__PURE__*/ Promise.resolve() as Promise<any>

let currentFlushPromise: Promise<void> | null = null

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

```ts
function queueFlush() {
  if (!isFlushing && !isFlushPending) {
    isFlushPending = true

    // 等待执行任务完毕之后再继续执行 nextTick
    currentFlushPromise = resolvedPromise.then(flushJobs)
  }
}
```