# 元素更新

不管组件更新怎么花里胡哨，到最后都是要落到元素更新上。

有个问题 defer patching value 不知道为啥

下面我们看一下元素更新

## 元素更新入口 - processElement

通过是否存在老节点来判断是走 mountElement 还是 patchElement

参数：
- n1 - 老节点
- n2 - 新节点
- container - 父节点
- anchor - 下一个兄弟节点
- parentComponent - 组件实例
- parentSuspense - 父级Suspense组件实例
- isSVG - 是否是SVG
- slotScopeIds - 插槽作用域
- optimized - 是否有优化标识（在 patch 中有）

```ts
  const processElement = (
    n1: VNode | null,
    n2: VNode,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
    slotScopeIds: string[] | null,
    optimized: boolean
  ) => {
    isSVG = isSVG || (n2.type as string) === 'svg'
    // n1 老节点
    if (n1 == null) {
      // 挂载元素
      mountElement(
        n2,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized
      )
    } else {
      // 更新元素  
      patchElement(
        n1,
        n2,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized
      )
    }
  }

```



## 挂载元素 - mountElement

1. 创建元素节点
2. 子节点
   - 文本 - 直接处理
   - 数组 - mountChildren
3. 处理 props
4. 将生成的元素节点添加到父节点


```ts
  const mountElement = (
    vnode: VNode,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
    slotScopeIds: string[] | null,
    optimized: boolean
  ) => {
    let el: RendererElement
    let vnodeHook: VNodeHook | undefined | null
    const { type, props, shapeFlag, transition, dirs } = vnode

    // 创建元素节点 - 如果浏览器平台调用的是 createElement
    el = vnode.el = hostCreateElement(
      vnode.type as string,
      isSVG,
      props && props.is,
      props
    )

    // 子节点为文本节点
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // DOM API - el.textContent = text
      hostSetElementText(el, vnode.children as string)

    // 子节点为数组
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(
        vnode.children as VNodeArrayChildren,
        el,
        null,
        parentComponent,
        parentSuspense,
        isSVG && type !== 'foreignObject',
        slotScopeIds,
        optimized
      )
    }

    //...

    // 处理 props
    if (props) {
      for (const key in props) {
        if (key !== 'value' && !isReservedProp(key)) {
        
         // 调用平台 API，处理 props
          hostPatchProp(
            el,
            key,
            null,
            props[key],
            isSVG,
            vnode.children as VNode[],
            parentComponent,
            parentSuspense,
            unmountChildren
          )
        }
      }

      // value 特殊处理
      if ('value' in props) {
        hostPatchProp(el, 'value', null, props.value)
      }
    }

    //...
    // 将生成的节点插入到容器中
    hostInsert(el, container, anchor)
  }

```


### 初次渲染子节点 - mountChildren

循环节点进行 patch

```ts
  const mountChildren: MountChildrenFn = (
    children,
    container,
    anchor,
    parentComponent,
    parentSuspense,
    isSVG,
    slotScopeIds,
    optimized,
    start = 0
  ) => {
    for (let i = start; i < children.length; i++) {
      const child = (children[i] = optimized

        // 挂载节点或者 v-memo 指令直接使用 child 否则 克隆 child
        ? cloneIfMounted(children[i] as VNode)
        // 整理子节点的类型 ShapeFlags 
        // 赋值到 vnode.children，
        // 并且将子类型（ShapeFlags）合并到 vnode.shapeFlag 
        : normalizeVNode(children[i]))

      // 重新调用 patch 挂载子节点
      patch(
        null,
        child,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized
      )
    }
  }
```

## 更新元素 - patchElement

更新元素的内容有点多

先处理子节点
再处理自身的 props

中间有三个函数
- patchBlockChildren - 动态块状节点
- patchChildren - 正常节点更新
- patchProps - 更新 props

对 `PatchFlags.FULL_PROPS` 的理解可以从单元测试案例来理解

1. `<div v-bind="foo" />`
2. `<div :[foo]="bar" />`
3. `<div id="foo" v-bind="bar" :class="cls" />`


```ts
  const patchElement = (
    n1: VNode,
    n2: VNode,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
    slotScopeIds: string[] | null,
    optimized: boolean
  ) => {
    const el = (n2.el = n1.el!)
    let { patchFlag, dynamicChildren, dirs } = n2
    
    // 所有属性都是动态的 - FULL_PROPS
    patchFlag |= n1.patchFlag & PatchFlags.FULL_PROPS
    // 声明新旧 props
    const oldProps = n1.props || EMPTY_OBJ
    const newProps = n2.props || EMPTY_OBJ

    let vnodeHook: VNodeHook | undefined | null

    // v-if 或 v-for 动态节点会将子内容放到父的 dynamicChildren 中
    // 只更新动态节点
    if (dynamicChildren) {
      patchBlockChildren(
        n1.dynamicChildren!,
        dynamicChildren,
        el,
        parentComponent,
        parentSuspense,
        areChildrenSVG,
        slotScopeIds
      )
    } else if (!optimized) {
      // 全量更新 - diff 更新入口
      patchChildren(
        n1,
        n2,
        el,
        null,
        parentComponent,
        parentSuspense,
        areChildrenSVG,
        slotScopeIds,
        false
      )
    }

    // 有更新
    if (patchFlag > 0) {

      // props 全量更新
      if (patchFlag & PatchFlags.FULL_PROPS) {
        // element props contain dynamic keys, full diff needed
        patchProps(
          el,
          n2,
          oldProps,
          newProps,
          parentComponent,
          parentSuspense,
          isSVG
        )
      } else {
        // props 中特殊处理 class
        if (patchFlag & PatchFlags.CLASS) {
          if (oldProps.class !== newProps.class) {
            hostPatchProp(el, 'class', null, newProps.class, isSVG)
          }
        }

        // props 中特殊处理 style
        if (patchFlag & PatchFlags.STYLE) {
          hostPatchProp(el, 'style', oldProps.style, newProps.style, isSVG)
        }

        // props 正常处理
        if (patchFlag & PatchFlags.PROPS) {
          // 动态 props
          const propsToUpdate = n2.dynamicProps!
          for (let i = 0; i < propsToUpdate.length; i++) {
            const key = propsToUpdate[i]
            const prev = oldProps[key]
            const next = newProps[key]
            // 每次 value 都进行更新或者新旧 props 不同
            if (next !== prev || key === 'value') {
              hostPatchProp(
                el,
                key,
                prev,
                next,
                isSVG,
                n1.children as VNode[],
                parentComponent,
                parentSuspense,
                unmountChildren
              )
            }
          }
        }
      }


      // 如果是新节点内容文本节点
      if (patchFlag & PatchFlags.TEXT) {
        if (n1.children !== n2.children) {
          // DOM API - el.textContent = text
          hostSetElementText(el, n2.children as string)
        }
      }
    } else if (!optimized && dynamicChildren == null) {
      // 没有优化，全量更新 props
      patchProps(
        el,
        n2,
        oldProps,
        newProps,
        parentComponent,
        parentSuspense,
        isSVG
      )
    }
  }
```


### 更新 props - patchProps

处理新旧不同 props
1. oldProps 中存在，newProps 中不存在，则删除
2. 循环 newProps，非 value 属性，则更新， value 延迟更新（为什么要延迟）
3. value 属性特殊处理 - 每次都更新

```ts
  const patchProps = (
    el: RendererElement,
    vnode: VNode,
    oldProps: Data,
    newProps: Data,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean
  ) => {
    // 更新 props
    if (oldProps !== newProps) {
      if (oldProps !== EMPTY_OBJ) {
        for (const key in oldProps) {
          // 如果是保留的属性，或者是 ref 或者 onVnodeBeforeMount 等关键词，则不处理
          // oldProps 中存在，newProps 中不存在，则删除
          if (!isReservedProp(key) && !(key in newProps)) {
            hostPatchProp(
              el,
              key,
              oldProps[key],
              null,
              isSVG,
              vnode.children as VNode[],
              parentComponent,
              parentSuspense,
              unmountChildren
            )
          }
        }
      }
      for (const key in newProps) {
        // empty string is not valid prop
        if (isReservedProp(key)) continue
        const next = newProps[key]
        const prev = oldProps[key]
        // 非 value，并且新旧不同更新
        if (next !== prev && key !== 'value') {
          hostPatchProp(
            el,
            key,
            prev,
            next,
            isSVG,
            vnode.children as VNode[],
            parentComponent,
            parentSuspense,
            unmountChildren
          )
        }
      }

      // value 单独处理，每次都要更新
      if ('value' in newProps) {
        hostPatchProp(el, 'value', oldProps.value, newProps.value)
      }
    }
  }
```


### 处理 dynamicChildren - patchBlockChildren

- 循环 dynamicChildren 数组
  -  获取 container （要挂载的真实 DOM 节点）
-  执行 patch, patch 动态子节点 child

```ts
 const patchBlockChildren: PatchBlockChildrenFn = (
    oldChildren,
    newChildren,
    fallbackContainer,
    parentComponent,
    parentSuspense,
    isSVG,
    slotScopeIds
  ) => {
    for (let i = 0; i < newChildren.length; i++) {
      const oldVNode = oldChildren[i]
      const newVNode = newChildren[i]
      // 容器 - 真实节点
      const container =
        oldVNode.el &&
        // - Fragment 和 oldVNode.el
        (oldVNode.type === Fragment ||
          // - old 和 new 不同
          !isSameVNodeType(oldVNode, newVNode) ||
          // - 自定义组件或 TELEPORT 组件
          oldVNode.shapeFlag & (ShapeFlags.COMPONENT | ShapeFlags.TELEPORT))
          // 当前为组件，找其父节点
          ? hostParentNode(oldVNode.el)!
          : // 父节点
            fallbackContainer

      // patch 子节点
      patch(
        oldVNode,
        newVNode,
        container,
        null,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        true
      )
    }
  }
```

### 更新子节点 - patchChildren

新老节点存在三种状态： null, Text, Array
1. 根据 patchFlag 标记
   - KEYED_FRAGMENT - patchKeyedChildren（子节点为数组并且有 key ）
   - UNKEYED_FRAGMENT - patchUnkeyedChildren（子节点为数组但是没有 key）
2. 根据 shapeFlag 标记（简化当前 VNode 为 new, 上一个 VNode 为 old）
   - 新的为文本并且老的为数组，卸载老的子节点 - unmountChildren
   - 新的为文本并且老的为文本，将新的文本设置到 element 上 - SetElementText
   - 老的为数组并且新的数组，比对更新 patchKeyedChildren
   - 老的为数组并且新的为 null, 卸载老的子节点 - unmountChildren
   - 老的为文本并且新的为数组，删除老的文本（SetElementText 为空），加载新的数组子节点 - mountChildren

```ts
const patchChildren: PatchChildrenFn = (
  n1,
  n2,
  container,
  anchor,
  parentComponent,
  parentSuspense,
  isSVG,
  slotScopeIds,
  optimized = false
) => {
  const c1 = n1 && n1.children
  const prevShapeFlag = n1 ? n1.shapeFlag : 0
  const c2 = n2.children

  // 更新标识 - patchFlag，类型标识 - shapeFlag
  const { patchFlag, shapeFlag } = n2

  // 有更新 v-for 更新
  if (patchFlag > 0) {
    // 有 key 的数组
    if (patchFlag & PatchFlags.KEYED_FRAGMENT) {
        // 更新有 key 的子节点
        patchKeyedChildren(
          c1 as VNode[],
          c2 as VNodeArrayChildren,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          isSVG,
          slotScopeIds,
          optimized
        )
        return
    } else if (patchFlag & PatchFlags.UNKEYED_FRAGMENT) {
        // 没有 key
        patchUnkeyedChildren(
          c1 as VNode[],
          c2 as VNodeArrayChildren,
          container,
          anchor,
          parentComponent,
          parentSuspense,
          isSVG,
          slotScopeIds,
          optimized
        )
        return
      } 
   }


   // 新节点是 text 类型
   if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // oldVNode 是数组
      // 卸载所有的 oldVNode
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        unmountChildren(c1 as VNode[], parentComponent, parentSuspense)
      }

      // 更新文本节点
      if (c2 !== c1) {
        hostSetElementText(container, c2 as string)
      }
    } else {
      // oldVNode 是数组
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // newVNode 也是数组
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          patchKeyedChildren(
            c1 as VNode[],
            c2 as VNodeArrayChildren,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            isSVG,
            slotScopeIds,
            optimized
          )
        } else {
          // 没有新节点，卸载老节点
          unmountChildren(c1 as VNode[], parentComponent, parentSuspense, true)
        }
      } else {
        // oldVNode 是文本节点
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(container, '')
        }

        // 挂载新节点
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(
            c2 as VNodeArrayChildren,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            isSVG,
            slotScopeIds,
            optimized
          )
        }
      }
    }
}

```

### 更新没有 key 的子节点 - patchUnkeyedChildren

由于没有 key, 在做对比时从上到下逐个对比。
1. 以新旧节点最小长度的循环，按照顺序进行对比
2. 老的 VNode 长度大于新的 VNode 卸载所有老的 VNode
3. 否则挂载所有新的 VNode


```ts
 const patchUnkeyedChildren = (
    c1: VNode[],
    c2: VNodeArrayChildren,
    container: RendererElement,
    anchor: RendererNode | null,
    parentComponent: ComponentInternalInstance | null,
    parentSuspense: SuspenseBoundary | null,
    isSVG: boolean,
    slotScopeIds: string[] | null,
    optimized: boolean
  ) => {
    c1 = c1 || EMPTY_ARR
    c2 = c2 || EMPTY_ARR
    const oldLength = c1.length
    const newLength = c2.length

    // 找到 oldVNode 和 newVNode 最短长度
    const commonLength = Math.min(oldLength, newLength)
    let i
    // 循环公共长度
    for (i = 0; i < commonLength; i++) {
      const nextChild = (c2[i] = optimized
        ? cloneIfMounted(c2[i] as VNode)
        : normalizeVNode(c2[i]))
      
      // 由于没有 key，则新旧逐一对比
      patch(
        c1[i],
        nextChild,
        container,
        null,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized
      )
    }

    // 卸载多余的老的节点
    if (oldLength > newLength) {
      unmountChildren(
        c1,
        parentComponent,
        parentSuspense,
        true,
        false,
        commonLength
      )
    } else {
      // 挂载多个新的节点
      mountChildren(
        c2,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        isSVG,
        slotScopeIds,
        optimized,
        commonLength
      )
    }
  }
```

有关 patchKeyedChildren 的详细内容，请参考[Diff算法](diff.md)