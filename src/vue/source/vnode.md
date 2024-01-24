# 虚拟 DOM

虚拟 DOM 就是使用 js 对象的方式来表示真实 DOM 的部分信息。

```html
<div>
    content
</div>
```
可以写作：

```js
h("div", "content")
```

## 暴露给开发者的虚拟 DOM 语法糖 - h

更灵活的创建虚拟 DOM 的方式：

h 函数时 createVNode 的语法糖，最终会调用 createVNode

参数：
- type: 标签名 | 组件
- propsOrChildren: 属性或子节点 - 可选
- children: 子节点 - 可选

如果有两个参数：
- 第二个参数 `propsOrChildren` 可以是属性对象，也可以是子节点，通过判断 `propsOrChildren` 是否为对象，来判断是属性还是子节点
  - 如果是对象并且不是数组，则看其是不是虚拟 DOM 节点，如果是，则将该节点作为子节点
  - 如果是对象并且不是数组并且不是虚拟 DOM 节点，则将该对象作为属性
  - 如果是数组或者其他（string, number等）作为虚拟 DOM 节点  

如果有三个或三个以上的参数：
- 第一个 type，第二个 props 确定
- 第三个及之后的参数都是子节点

```ts
function h(type: any, propsOrChildren?: any, children?: any): VNode {
  const l = arguments.length
  // 只有两个参数
  if (l === 2) {
    if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
      // single vnode without props
      // 只有两个参数，第二个参数为虚拟 DOM
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren])
      }

      // 第二个参数为 props
      return createVNode(type, propsOrChildren)
    } else {
      // 是数组，第二个参数为虚拟 DOM
      return createVNode(type, null, propsOrChildren)
    }
  } else {
    // 传入参数要大于三个
    if (l > 3) {
      // 第三个参数开始都是子节点
      children = Array.prototype.slice.call(arguments, 2)
    } else if (l === 3 && isVNode(children)) {
      // 第三个参数为子节点
      children = [children]
    }

    // 创建虚拟 DOM
    return createVNode(type, propsOrChildren, children)
  }
}
```

两个参数常用写法：

```ts
// DOM <div>content</div>
h("div", "content")

// 组件 <CustomiComponent>content</CustomiComponent>
h(CustomiComponent, "content")

// DOM <div class="custom"></div>
h("div", {class: "custom"})
```

三个及以上参数常用写法：

```ts
// DOM <div>content</div>
h("div", null, "content")

// DOM <div>content1content2</div>
h("div", null, "content1", "content2")

// DOM <div class="custom">content1content2</div>
h("div", {class: "custom"}, "content1", "content2")
```

下面我们来看 createVNode 函数

## 创建虚拟节点 - createVNode

处理下面这些情况：
- class 组件
- 注释节点
- 属性
- 虚拟节点的类型

```ts
export const createVNode =  _createVNode

export const Text = Symbol.for('v-txt')
export const Comment = Symbol.for('v-cmt')
export const Static = Symbol.for('v-stc')

function _createVNode(
  type: VNodeTypes | ClassComponent | typeof NULL_DYNAMIC_COMPONENT,
  props: (Data & VNodeProps) | null = null,
  children: unknown = null,
  patchFlag: number = 0,
  dynamicProps: string[] | null = null,
  isBlockNode = false
): VNode {
  if (!type || type === NULL_DYNAMIC_COMPONENT) {
    type = Comment
  }

  // class 组件 - 判断条件（函数并且有__vccOpts属性）
  if (isClassComponent(type)) {
    type = type.__vccOpts
  }

  // 属性
  if (props) {
    // 如果 props 是代理就 extends({}, props) 否则直接返回 props
    props = guardReactiveProps(props)!
    let { class: klass, style } = props

    // class 属性
    if (klass && !isString(klass)) {
    // normalizeClass - 对 class 为 string | array | object 时转为 string
      props.class = normalizeClass(klass)
    }

    // style 属性 
    if (isObject(style)) {
      if (isProxy(style) && !isArray(style)) {
        style = extend({}, style)
      }
    // normalizeStyle - 对 style 为 string | array | object 时转为 string
      props.style = normalizeStyle(style)
    }
  }

  // 虚拟节点的类型
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT // element 类型
    : __FEATURE_SUSPENSE__ && isSuspense(type)
    ? ShapeFlags.SUSPENSE // Suspense 组件
    : isTeleport(type) 
    ? ShapeFlags.TELEPORT // Teleport 组件
    : isObject(type)
    ? ShapeFlags.STATEFUL_COMPONENT // 有状态的组件
    : isFunction(type)
    ? ShapeFlags.FUNCTIONAL_COMPONENT // 函数式组件
    : 0

  // 创建虚拟 DOM 节点
  return createBaseVNode(
    type,
    props,
    children,
    patchFlag,
    dynamicProps,
    shapeFlag,
    isBlockNode,
    true
  )
}

```

## 最终创建虚拟 DOM 的方法

参数：
- type - 类型（组件为组件本身，DOM 为 string）
- props - 属性
- children - 子节点
- patchFlag - 
- dynamicProps - 动态属性
- shapeFlag - 组件或者DOM 的标识
- isBlockNode - block 标识

```ts
function createBaseVNode(
  type: VNodeTypes | ClassComponent | typeof NULL_DYNAMIC_COMPONENT,
  props: (Data & VNodeProps) | null = null,
  children: unknown = null,
  patchFlag = 0,
  dynamicProps: string[] | null = null,
  shapeFlag = type === Fragment ? 0 : ShapeFlags.ELEMENT,
  isBlockNode = false,
  needFullChildrenNormalization = false
) {

 // 虚拟节点对象
 const vnode = {
    __v_isVNode: true, // 虚拟节点标识，用来判断是不是 VNode，有一个函数
    __v_skip: true, // reactive 跳过标识，reactive 遇到会跳过
    type, // 组件
    props, // 属性
    key: props && normalizeKey(props), // key
    ref: props && normalizeRef(props), // ref
    scopeId: currentScopeId, // 作用域 ID - 暂用不到
    slotScopeIds: null,
    children, // 子节点
    component: null,
    suspense: null, 
    ssContent: null,
    ssFallback: null,
    dirs: null,
    transition: null,
    el: null, // 对应真实节点
    anchor: null, // 插入定位节点
    target: null,
    targetAnchor: null,
    staticCount: 0,
    shapeFlag, // 类型标识
    patchFlag, // 更新标识
    dynamicProps, // 动态属性
    dynamicChildren: null, // 动态子节点
    appContext: null, // app 上下文
    ctx: currentRenderingInstance // 实例
  } as VNode

  // createVNode 传入为 true
  if (needFullChildrenNormalization) {
    // 获取 children 的 shapeFlag 合并到当前虚拟节点的 shapeFlag 上
    normalizeChildren(vnode, children)

    // 如果是 Suspense 组件
    if (__FEATURE_SUSPENSE__ && shapeFlag & ShapeFlags.SUSPENSE) {
      ;(type as typeof SuspenseImpl).normalize(vnode)
    }

  } else if (children) {
    // 走不到这里
    vnode.shapeFlag |= isString(children)
      ? ShapeFlags.TEXT_CHILDREN
      : ShapeFlags.ARRAY_CHILDREN
  }

  return vnode
}
```