---
title: vue 源码之 reative - array
---

# 有关数组的两端特殊的代码

### 有关数组的第一段特殊的代码：

以下几个方法有一个特点就是能够改变原数组：
- push
- pop
- shift
- unshift
- splice

```ts
  ;(['push', 'pop', 'shift', 'unshift', 'splice'] as const).forEach(key => {
    instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
      // 停止跟踪
      pauseTracking()
      const res = (toRaw(this) as any)[key].apply(this, args)
      resetTracking()
      // 开始跟踪
      return res
    }
  })
  ```
  这段代码大致是数组的 push, pop, shift, unshift, splice 都不进行跟踪，也就执行 track 操作。
 


  下面根据上面的需求写一个简易的 demo 来看一下为什么要这样做:

  ```js
    const get = (target, key, receiver) => {
        console.log("get start", key)
        const res = Reflect.get(target, key, receiver)
        console.log("get result", key)
        return res
    }

    const set = (target, key, value, receiver) => {
        console.log("set start", key, value)
        const res = Reflect.set(target, key, value, receiver)
        console.log("set start result", key, value)
        return res
    }
    let arr = []
    const proxy = new Proxy(arr, {get, set})
```

### 执行 push 操作

执行 `proxy.push(1)`

打印结果如下：
```js
    get start push
    get result push
    get start length
    get result length
    set start 0
    set start result 0 1
    set start length 1
    set start result length 1
    1
```

由上面的结果可知：
数组在执行 push 操作时
1. 先获取数组上的 push 属性
2. 再获取数组上的 length 属性
3. 把当前的 length - 1 作为 key 设置 value
4. 重新设置 length 属性

其他的方法 pop, shift, unshift, splice 也是类似，
执行方法时，会触发更新两次

一次是执行方法时
一次是 length 属性更新 - 由于执行方法会改变原数组的 length 属性，所以会触发 length 属性的更新。

只在 length 属性上进行跟踪，其他操作就不再跟踪了。



### 有关数组的第二段特殊代码：

```ts
  ;(['includes', 'indexOf', 'lastIndexOf'] as const).forEach(key => {
    instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
      const arr = toRaw(this) as any
      for (let i = 0, l = this.length; i < l; i++) {
        track(arr, TrackOpTypes.GET, i + '')
      }
      // 第一次执行，如果执行结果没找到，在原数组上查找，不会触发 proxy 方法
      const res = arr[key](...args)
      if (res === -1 || res === false) {
        // 重新找到，有可能数组中的 key，也是一个 proxy 所以才找不到的
        // 所以要 toRaw 一下，然后再找，再找是在原数组上找的。所以不会触发 proxy 方法
        return arr[key](...args.map(toRaw))
      } else {
        return res
      }
    }
  })
```

1. 当执行当前函数时，将每个数组上的 key 都进行跟踪（track）
2. 查找数组中某个索引
3. 如果找到就返回
4. 如果找不到就再次将该索引进行 toRaw ，再进行查找返回 - 主要防止索引是 reactive 的值

### 执行 includes 操作

执行 `proxy.includes(1)`

如果数组中不存在
打印结果如下：
```
get start includes
get result includes
get start length
get result length
false
```

如果数组中存在
打印结果如下：
```
get start includes
get result includes
get start length
get result length
get start 0
get result 0
true
```

在执行 includes,  indexOf, lastIndexOf 时，
1. 先获取 includes
2. 再获取 length
3. 最后再获取某个索引
