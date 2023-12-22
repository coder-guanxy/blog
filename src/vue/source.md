---
title: vue 源码
---
### vue source

## 核心 API

### reactive 

主要调用 `createReactiveObject` ，让 `createReactiveObject` 固定一些参数。


```ts
// 缓存对象
export const reactiveMap = new WeakMap<Target, any>()

export function reactive(target: object) {
  // ...
  return createReactiveObject(
    target, // 传入的参数 reactive(target)
    false, // 是否是只读的
    mutableHandlers, // 基础代理方法对象
    mutableCollectionHandlers, // 集合代理方法对象
    reactiveMap // 缓存对象
  )
}
```

#### createReactiveObject - 创建响应式对象

主要调用 proxy 方法，直接代理 target，并绑定代理方法。

- 第一：target 非对象直接返回 target
- 第二：从缓存中查找之前是否代理过，代理过就返回之前的代理
- 第三：proxy 代理
- 第四：target 和 proxy 映射缓存

```ts

function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<Target, any>
) {

  //...
  // 如果已经被代理过的直接返回代理过的数据
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }

  // 特殊类型检查 getTargetType
  // Object | Array => TargetType.COMMON 
  // Map | Set | WeakMap | WeakSet => TargetType.COLLECTION
  // 其他 => TargetType.INVALID
  // 非可代理对象直接返回，比如 number, string...
  const targetType = getTargetType(target)
  if (targetType === TargetType.INVALID) {
    return target
  }

  // 使用 proxy 进行代理 target
  // Object | Array 代理方法对象为 baseHandlers
  // Map | Set | WeakMap | WeakSet 代理方法对象为 collectionHandlers
  const proxy = new Proxy(
    target,
    targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
  )

  // 将代理进行缓存，下次进来直接返回代理
  proxyMap.set(target, proxy)
  return proxy
}
```



reactive 基本上就是相当于调用 Proxy 代理。主要的处理逻辑在 `mutableHandlers` 和 `collectionHandlers`



#### mutableHandlers

首先看 mutableHandlers 都代理（拦截）了哪些操作。

例子的前提 `let a = {b: 1}; `

- get - 拦截获取操作 ， 比如: ` a.b 就是获取 a对象下面的b属性`
- set -  拦截设置操作  ，比如：`a.b = 2` 就是 a对象下面的b属性重新赋值
- deleteProperty - 拦截删除操作， 比如: `delete a.b` 就是删除 a 对象下面的b属性
- has - 拦截是否存在操作，比如：`if(b in a){}` in 操作，是否存在某个属性
- ownkeys - 拦截 `keys` 获取操作  
  - `Object.getOwnPropertyNames()`
  - `Object.getOwnPropertySymbols()`
  - `Object.keys()`
  - `for...in`循环

```ts
export const mutableHandlers: ProxyHandler<object> = {
  get,
  set,
  deleteProperty,
  has,
  ownKeys
}
```

基本上覆盖了对数据的增删改查；

接下来我们分别看一下这几个代理方法。

#### get

主要调用 createGetter 方法

```ts
const get = createGetter()



    const targetIsArray = isArray(target)
```



##### createGetter

像这种一个方法直接返回另外一个方法的，主要是为了固定参数

- 数组特殊处理
- 

```ts
function createGetter(isReadonly = false, shallow = false) {
  return function get(target: Target, key: string | symbol, receiver: object) {
     //...
		 //
     const targetIsArray = isArray(target)
    //  特殊情况：
    // 1. 如果 target 是数组，并且取用特殊的 key 
    // (indexof, lastIndexof, includes, push, pop, shift, unshift, splice)
    // 2. 特殊的 key (hasOwnProperty)
    if (!isReadonly) {
      if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
        return Reflect.get(arrayInstrumentations, key, receiver)
      }
      if (key === 'hasOwnProperty') {
        return hasOwnProperty
      }
    } 
    
    	// 从 target 对象上获取到值
    	const res = Reflect.get(target, key, receiver)
      
      // 对 target 的 key 进行跟踪
      track(target, TrackOpTypes.GET, key)
    
     // 如果得到依然是一个对象，继续进行 proxy 代理 
    if (isObject(res)) {
      // Convert returned value into a proxy as well. we do the isObject check
      // here to avoid invalid value warning. Also need to lazy access readonly
      // and reactive here to avoid circular dependency.
      return isReadonly ? readonly(res) : reactive(res)
    }

    return res
  }
}
```



