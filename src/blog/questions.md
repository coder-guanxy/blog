# 遇到的问题

## 1. 引入图片

### 问题描述

配置 public 在 dev 环境可以展示， build 的时候找不到该图片

#### 例子

比如在 `main.jpg` 图片放到 `src/public/blog` 下面 `src/blog/index.md` 引用 `main.jpg` => `![main](main.jpg)` 在 dev 环境下可以使用，但是打包会报错，找不到 main.jpg

### 解决方法

相对引入 `![main](../public/blog/main.jpg)`

### 问题描述

更改端口号

### 解决方案：

```json{3}
{
    "scripts": {
         "docs:dev": "vitepress dev config --port 3006",
    }
}
```
