---
title: vue 源码之 reative | effect
---
### vue source - reative | effect

对 vue 进行极简分析，重点是快速掌握整个响应式流程。其他数据结构和其他 API，大致都是根据极简流程，做一些扩展，进行特殊处理。 



极简分析中不分析的部分：

- Set, Map, Array 等数据结构
- shallowReactive, readonly, shallowReadonly 等 API



## 响应式核心 API - reative | effect

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



简化代码：

```ts
// 缓存对象
export const reactiveMap = new WeakMap()

// 调用响应式 API
export function reactive(target) {
  
  // 代理缓存中存在直接返回缓存中
  const existingProxy = reactiveMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  
    const proxy = new Proxy(
    target,
    mutableHandlers // 下面将主要简化这块内容
  )
    
  // 将代理进行缓存，下次进来直接返回代理
  proxyMap.set(target, proxy)
  return proxy
}
```







### mutableHandlers

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

#### get - 收集副作用

主要调用 createGetter 方法

```ts
const get = createGetter()
```



##### createGetter

像这种一个方法直接返回另外一个方法的，主要是为了固定参数

- 从对象上获取当前 key 的值 res
- 对 target[key] 的值进行跟踪，如果发生了改变，触发跟踪监听函数 track
- target[key] 是否还是一个对象，如果是继续进行 reactive。

```ts
function createGetter(isReadonly = false, shallow = false) {
  return function get(target: Target, key: string | symbol, receiver: object) {
     //...
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



整个 get 函数里面就两个重要的操作，第一个如果target[key]得到的是个对象(res)继续对得到的对象(res)进行 reactive，  第二个 ，将 target 对象下面的 key 和 副作用进行绑定，以便在对下次对 target 对象下面的 key 进行操作时，能找到响应的副作用函数，并触发它。



第一个操作很好理解，接下来我们看一下 **track 是如何将 target, key 和相关副作用进行绑定的**。



#### track - 将 target 对象下面的 key 和相关副作用进行绑定

**收集与 target 下面的 key 相关的 effect**

先声明一个简单仓库用来存储 target, key 和副作用 dep 的关系。下面源码中有一句注释解释的就很好。

```
// The main WeakMap that stores {target -> key -> dep} connections.
const targetMap = new WeakMap<any, KeyToDepMap>()
```



track 函数的主要就是构建一个数据结构，然后调用 trackEffects 函数。整体代码很好理解都不需要进行注释。



- shouldTrack, activeEffect，这两个标识主要表达的存在 effect 副作用函数，如果没有副作用函数，就不用进行关联，绑定。

- 先看一下结构: 

  - weakMap 的 key 是 target,  - **targetMap ** 
  - weakMap 的 value 是 Map 结构 
  - Map 的 key 是传进来的 key  - **depsMap**
  - Map 的 value 是 effect 的 Set 结构，可以存放多个 effect 副作用函数的 Set - **dep**

  

  ```js
  [ // WeakMap 结构
  	target: 
    			[	// Map 结构
    				key: [ effect1, effect2, ... ] // Set 结构 - 相当于去重的数组
  				]
  ]; 
  ```

- 构建完成 store 结构之后，执行 trackEffects



```ts
export function track(target: object, type: TrackOpTypes, key: unknown) {
	// 存在 effect
  if (shouldTrack && activeEffect) {
  
    let depsMap = targetMap.get(target)
    
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()))
    }
    
    let dep = depsMap.get(key)
    if (!dep) {
      depsMap.set(key, (dep = createDep()))
    }

    trackEffects(dep)
  }
}
```



有关 createDep 也很简单，主要 new 一个 Set，然后返回  

```ts
export const createDep = (effects?: ReactiveEffect[]): Dep => {
  const dep = new Set<ReactiveEffect>(effects) as Dep
  // ...
  return dep
}
```



接下来看 trackEffects



#### trackEffects

主要的功能就是将 effect 放入到 dep 中

代码中，在我们分析到**effect** 函数的时候，其中 activeEffect 可以暂时理解为一个副作用的函数

```ts
export function trackEffects(
  dep: Dep,
  debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
  let shouldTrack = false
  if (effectTrackDepth <= maxMarkerBits) {
    //...
  } else {
    // Full cleanup mode.
    shouldTrack = !dep.has(activeEffect!)
  }

  if (shouldTrack) {
    dep.add(activeEffect!)
    // 添加到 activeEffect 的 deps 中, 为了在 activeEffect 清除的时候，方便清除 dep
    activeEffect!.deps.push(dep)
  }
}
```



从 Get 这条收集副作用的线结束了，下面开始 Set 消费副作用的



#### Set - 消费副作用



- 从 target 上获取旧值和传入的新值触发 trigger

```ts
function createSetter(shallow = false) {
  return function set(
    target: object,
    key: string | symbol,
    value: unknown,
    receiver: object
  ): boolean {
    		// 旧值
        let oldValue = (target as any)[key]
  			//...
        // 新值
        const result = Reflect.set(target, key, value, receiver)
        
        trigger(target, TriggerOpTypes.SET, key, value, oldValue)
    	
    		return result;
  	}
  }
```



##### trigger - 找到相关 effect 副作用，然后触发副作用

- 找出相关的 副作用
- 触发多个副作用 triggerEffects

```ts
export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown,
  oldTarget?: Map<unknown, unknown> | Set<unknown>
) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    // never been tracked
    return
  }
  
  // 要处理其他情况，所以直接使用 deps。
  let deps: (Dep | undefined)[] = []
  
  // 确保触发的 key 存在，depsMap.get(key) 获取的时一个 Set 结构，然后将 Set 结构放入到 deps 中
  // [new Set([effect1, effect2])]
  if (key !== void 0) {
      deps.push(depsMap.get(key))
    }

  
  	// 获取一个存入多个 effect 的 Set 类型 
    if (deps.length === 1) {
      if (deps[0]) {
         //...
        	// 触发副作用
          triggerEffects(deps[0])
      }
    }
  	//...
}
```



##### triggerEffects - 触发多个 effect

- 将 dep 统一为数组类型
- 循环触发单个的 effect - triggerEffect

```ts
export function triggerEffects(
  dep: Dep | ReactiveEffect[],
  debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
  // 统一为数组类型，即使是 Set 类型（[...dep] 转为数组类型）
  const effects = isArray(dep) ? dep : [...dep]
  for (const effect of effects) {
      triggerEffect(effect, debuggerEventExtraInfo)
  }
}
```



##### triggerEffect - 触发单个 effect

- 执行 effect

```ts
function triggerEffect(
  effect: ReactiveEffect,
  debuggerEventExtraInfo?: DebuggerEventExtraInfo
) {
	// 执行 effect
	effect.run()
}
```



总结：Set 操作大致的流程主要就是找到 trigger 中收集来 effect 然后进行一一触发。其他 delete, has, ownkeys 操作基本上和 Set 的流程一致



简化 mutableHandlers 代码：

```ts
// 缓存
const targetMap = new WeakMap();

// 全局变量
export let activeEffect;

// --------------------- get ----------------------
// 设置缓存数据结构
function track(target,  key) {
  if(activeEffect) {
    // 从缓存中获取 key 与 dep 的 Map
    let depsMap = targetMap.get(target)
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()))
    }
    
    // 通过 key 获取收集来 effect
    let dep = depsMap.get(key)
    if (!dep) {
      depsMap.set(key, (dep = new Set()))
    }
    
    // 收集 effect 到 dep 中
    trackEffects(dep)
  }
}

// 将当前 effect 加入到 dep 中
function trackEffects(dep) {
  const shouldTrack = !dep.has(activeEffect);
  // 如果在 dep 中不存在就加入到 dep 中
  if (shouldTrack) {
    dep.add(activeEffect);
  }
}


// 收集绑定 effect
function get(target, key, receiver){
  // 从 target 对象上获取到值
  const res = Reflect.get(target, key, receiver)
  
  // 收集 effect, 将收集的 effect 绑定对应的 target 的 key
  track(target, key)
  
  // 如果得到依然是一个对象，继续进行 proxy 代理 
  if (isObject(res)) {
    return reactive(res)
  }
  
  return res;
}

// --------------------- set ----------------------
// 使用 Object.is 判断两个值是否同一个。
const hasChanged = (value, oldValue) => !Object.is(value, oldValue)

// 触发 effect
function set(target, key, value, receiver){
  // 老值
  let oldValue = target[key]
  
  // 新值
  const result = Reflect.set(target, key, value, receiver);
  
  // 将 target 下面 key 的收集来的 effect, 一一触发
  if(hasChanged(value, oldValue)){
      trigger(target, key, value, oldValue)
  }

  return result;
}

// 触发
function trigger(target, type, key, newValue, oldValue) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    return
  }
	
  // 基于源码依然这样准备数据结构 - 简化后其实可以不用这种方式
  let deps
  
  // key 不等于 undefined, 为什么使用 void 0 而不是使用 undefined, 因为 undefined 可以被赋值
  if (key !== void 0) {
     deps = depsMap.get(key)
  }
  
  if (deps) {
    triggerEffects(deps[0])
  }
}

// 触发多个 effect - 循环执行单个 effect
function triggerEffects(dep) {
  for (const effect of effects) {
     triggerEffect(effect)
  }
}

// 执行 effect
function triggerEffect(effect) {
  // 防止重复执行当前的 effect
  if (effect !== activeEffect){
    effect.run()
  }
}

// --------------------- mutableHandlers ----------------------
export const mutableHandlers = {
  get,
  set,
}
```



下面一起来看副作用 effect， 这在 vue 中也是一个重要的概念。与 reactive 搭配使用，共同构建了 vue 响应式。



我们使用 reactive 声明一个对象，声明的对象在 effect 副作用函数中使用（利用 get 将当前的 effect 收集起来），当改变对象中的某个 key 的值时，触发（执行）effect 副作用函数。



举个例子：

```
import { reactive, effect } from "vue"

const o = reactive({ data: 1 });

effect(() => {
	console.log(o.data)
})

setTimeout(() => {
	o.data = 2
}, 2000)
```



当 2 秒后，o.data 改变时，会执行 effect 中的副作用函数。

整个流程步骤：

- reactive - 使用 proxy 进行代理
- effect 中的函数，会先执行一遍，函数中调用 o.data， 读取 o 对象下面的 data 属性（也就是 o 下面 data 的 get 操作）
- 执行 get -> trace 将当前 effect 副作用函数和 o 对象下面的 data 属性进行绑定（缓存）。
- 2 秒后，执行 o 对象下面 data 属性的 set 操作（赋值操作）
- 找到缓存中 o 对象下面 data 属性相关的 effect 副作用函数
- 重新执行一遍。



##### effect - 收集副作用函数

- 主要给传入的副作用函数 fn 进行 ReactiveEffect 包装一下
- 将 fn 执行一遍

```ts
export function effect(
  fn: () => T,
  options?: ReactiveEffectOptions
){
  //...
  
  const _effect = new ReactiveEffect(fn)

  //...
  // 先执行一遍 fn，用于通过 get 操作收集当前副作用函数
  _effect.run()
  
  //...
}
```



##### ReactiveEffect - 副作用的包装类

- 主要 run 函数，用来执行 fn
- 将当前副作用实例赋值给全局变量 activeEffect，用于 track 收集

```ts
export class ReactiveEffect<T = any> {
	//...
  constructor(public fn: () => T) {}
  run() {
    //...
    try {
      //...
      // 将此实例赋值为全局变量 activeEffect
      activeEffect = this
      //...
      // 执行 fn, 将执行结果进行返回
      return this.fn()
    } finally {
      // 执行完毕将 activeEffect 进行还原 - 源码不是这样的
      activeEffect = void 0；
    }
    
    //...
  }
}
```



上面就是 effect 的主要代码了，其实也很简单，就是将 fn 包裹，然后赋值给 activeEffect



简化之后就是：

```js
class ReactiveEffect{
   constructor(fn) {
   		this.fn = fn;
   }
  run() {
    try {
      activeEffect = this;
    	return this.fn() 
    } finally {
      // 执行完毕将 activeEffect 进行还原 - 源码不是这样的
      activeEffect = void 0；
    }
  }
}

export function effect(fn){
	 const _effect = new ReactiveEffect(fn);
  _effect.run()
}
```

