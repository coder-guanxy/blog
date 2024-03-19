import {
  genVueSourceSideBarConfig,
  genVueRouterSideBarConfig,
  genBlogSideBarConfig,
  genViteSideBarConfig,
  genReactSourceSideBarConfig,
  genMicroFrontEndSideBarConfig
} from "./genSideBar"


module.exports = {
  title: 'GUANの博客',
  description: 'vitepress & guan blog & GUANの博客',
  lang: 'zh-CN',
  base: '/blog/',
  outDir: '../dist/',
  cacheDir: '../_cache/',
  srcDir: '../src',
  titleTemplate: ':title | GUANの博客',
  ignoreDeadLinks: true,// 最好加上，构建时会忽略md中的外链
  head: [['link', { rel: 'ico', type: 'image/ico', href: '/favicon.ico' }]],

  markdown: {
    lineNumbers: true,
    breaks: true,
  },
  vite: {
    define: {
      _APP_VERSION__: JSON.stringify('v1.0.0'),
    }
    // publicDir: '../public'
    // build: {
    //   assetsDir: '../public'
    // }
  },
  // stable difussion
  themeConfig: {
    // logo: '/favicon.ico',
    returnToTopLabel: '至顶',
    outline: {
      level: 'deep',
      label: 'GUANの博客'
    },
    // aside: 'left',
    lastUpdated: {
      text: '上次更新',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    },
    docFooter: {
      prev: '上一页',
      next: '下一页'
    },
    nav: navConfig(),
    sidebar: {
      '/react/source': genReactSourceSideBarConfig(),
      '/vue/source/': genVueSourceSideBarConfig(),
      '/vue/router/': genVueRouterSideBarConfig(),
      '/blog/': genBlogSideBarConfig(),
      "/tools/vite/": genViteSideBarConfig(),
      "/microFrontEnd/microApp": genMicroFrontEndSideBarConfig(),
    },
    editLink: {
      pattern: 'https://github.com/coder-guanxy/blog/tree/main/src/:path',
      text: '编辑此页'
    }
  }
};

// nav 配置
function navConfig() {
  return [
    { text: '导航', link: '/' },
    { text: '搭建博客', link: '/blog/init' },
    {
      text: 'Vue',
      items: [
        { text: 'Vue源码', link: '/vue/source/reactive-effect' },
        { text: 'Vue-Router', link: '/vue/router/createRouter' },
        { text: 'Pinia', link: '/vue/pinia' }
      ]
    },
    // {
    //   text: '前端工程',
    //   items: [
    //     { text: 'vite', link: '/tools/vite/guide' },
    //     // { text: 'webpack', link: '/tools/vite/webpack' },
    //     // { text: 'Babel', link: '/tools/vite/Babel' }
    //   ]
    // },
    {
      text: '微前端',
      items: [
        { text: '简介', link: '/microFrontEnd/index' },
        // { text: 'micro-app', link: '/microFrontEnd/microApp' },
        { text: 'micro-app 源码', link: '/microFrontEnd/microApp/sourceMicroApp' },
        // { text: '创建上下文实例', link: '/microFrontEnd/microApp/sourceCreateAppInstance' },
        // { text: '加载css, js源码', link: '/microFrontEnd/microApp/sourceLoadSourceCode' },
        // { text: '处理 css 源码', link: '/microFrontEnd/microApp/sourceScopedCSS' },
        { text: 'micro-app 常见问题', link: '/microFrontEnd/microApp/micro-app-question' },
      ]
    },
    // {
    //   text: 'React',
    //   items: [
    //     { text: 'React源码', link: '/react/source' },
    //     { text: 'React-Router', link: '/react/router' },
    //     { text: 'Redux', link: '/react/redux' }
    //   ]
    // },

  ];
}
