export const genVueSourceSideBarConfig = () => {
    return [
        {
          text: 'vue源码解析',
          items: [
            { text: '响应式核心简介', link: '/vue/source/reactive-effect' },
            { text: '应用入口', link: '/vue/source/createApp' },
            { text: '组件的挂载和更新', link: '/vue/source/processComponent' },
            { text: '元素更新', link: '/vue/source/processElement' },
            { text: 'Diff算法', link: '/vue/source/diff' },
            { text: '最长递增子序列', link: '/vue/source/longestIncreasingSubsequence' },
            { text: '传入函数执行处理', link: '/vue/source/callwithErrorHandler' },
            { text: 'Scheduler和nextTick', link: '/vue/source/scheduler' },
            { text: '虚拟DOM', link: '/vue/source/vnode' },
            { text: '计算属性原理', link: '/vue/source/computed' },
            { text: 'watch', link: '/vue/source/watch' },
            { text: 'reactvie-array', link: '/vue/source/reactive-array' },
          ]
        }
      ]
}