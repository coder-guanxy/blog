export const genVueRouterSideBarConfig = () => {
    return [
        {
          text: 'vue-router源码解析',
          items: [
            { text: '安装入口', link: '/vue/router/createRouter' },
            { text: '创建匹配器', link: '/vue/router/createRouterMatcher' },
            { text: 'path转token', link: '/vue/router/pathTotoken' },
            { text: 'token与其解析器', link: '/vue/router/tokensToParser' },
            { text: 'history和hash模式', link: '/vue/router/h5' },
            { text: '编程导航流程', link: '/vue/router/push' },
            { text: '导航守卫', link: '/vue/router/navigate' },
          ]
        }
      ]
}