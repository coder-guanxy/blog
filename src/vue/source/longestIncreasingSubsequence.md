# 最长递增子序列

```ts
function getSequence(arr: number[]): number[] {
  // 数组的索引（index）代表new，数组中的值（value）代表 old
  // p - arr 的克隆
  const p = arr.slice()
  // result - 初始化数组，存的是 new 新的值
  const result = [0]
  let i, j, u, v, c
  const len = arr.length

  // 循环源数组
  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {

      // result 中最大的那个数
      j = result[result.length - 1]
      // 如果当前的 value 大于 result 中的最大的那个值
      // p 中保存则要替换的新的索引
      // 将最大的值的索引推入到 result 中

      // 找到最大的 push 到 result 中
      if (arr[j] < arrI) {
        p[i] = j
        result.push(i)
        continue
      }

      // 使用二分法将 result 找到最符合 arrI 的位置
      u = 0
      v = result.length - 1
      while (u < v) {
        c = (u + v) >> 1
        if (arr[result[c]] < arrI) {
          u = c + 1
        } else {
          v = c
        }
      }

      // 
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }
        result[u] = i
      }
    }
  }

  // p 只是存储最新位置的数字，然后将位置置换为数字
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }
  return result
}

```



```js
function getSequence(arr) {
  // 数组的索引（index）代表new，数组中的值（value）代表 old
  // p - arr 的克隆
  const p = arr.slice()
  // result - 初始化数组，存的是 new 新的值
  const result = [0]
  let i, j, u, v, c
  const len = arr.length

  // 循环源数组
  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    if (arrI !== 0) {

      // result 中最大的那个数
      j = result[result.length - 1]
      // 如果当前的 value 大于 result 中的最大的那个值
      // p 中保存则要替换的新的索引
      // 将最大的值的索引推入到 result 中

      // 找到最大的 push 到 result 中
      if (arr[j] < arrI) {
        p[i] = j
        result.push(i)
        console.log(`--------------${i} start------------------`)
        console.log("result: ",  [...result])
        console.log("p: ",  [...p])
        console.log(`--------------${i} end------------------`)
        continue
      }

      // 使用二分法将 result 找到最符合 arrI 的位置
      u = 0
      v = result.length - 1
      while (u < v) {
        c = (u + v) >> 1
        if (arr[result[c]] < arrI) {
          u = c + 1
        } else {
          v = c
        }
      }
      console.log(`--------------${i} start------------------`)
      console.log("u: ", u)
      console.log("result: ", result.slice())
      console.log(`--------------${i} start------------------`)

      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1]
        }
        result[u] = i
      }
    }
  }

  // p 只是存储最新位置的数字，然后将位置置换为数字
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v]
  }
  return result
}

getSequence([1, 3, 2, 5, 4])
```