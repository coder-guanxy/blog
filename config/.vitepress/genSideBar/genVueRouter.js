export const genVueRouterSideBarConfig = () => {
    return [
        {
          text: 'vue-router源码解析',
          items: [
            { text: '安装入口', link: '/vue/router/createRouter' },
            { text: '创建匹配器', link: '/vue/router/createRouterMatcher' },
            { text: 'path转token', link: '/vue/router/pathTotoken' },
            { text: 'token与其解析器', link: '/vue/router/tokensToParser' },
          ]
        }
      ]
}