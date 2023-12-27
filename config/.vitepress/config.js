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
      '/react/source': sidebarConfig(),
      '/blog/': generateSidebarBlogConfig(),
      "/tools/vite/": generateSidebarViteConfig()
    },
    editLink: {
      pattern: 'https://github.com/coder-guanxy/blog/tree/main/src/:path',
      text: '编辑此页'
    }
  }
};

function generateSidebarViteConfig() {
  return [
    {
      text: 'vite',
      items: [
        { text: '简介', link: '/tools/vite/guide' },
        { text: '整体流程', link: '/tools/vite/process' },
        { text: 'cli', link: '/tools/vite/cli' },
        { text: '开发流程', link: '/tools/vite/dev' },
        { text: 'HMR流程', link: '/tools/vite/hmr' },
        { text: '打包流程', link: '/tools/vite/prod' },
      ]
    }
  ]
}

function generateSidebarBlogConfig() {
  return [
    {
      text: '快速开始',
      items: [
        { text: '初始化', link: '/blog/init' },
        { text: '配置简介', link: '/blog/config' },
        { text: '部署', link: '/blog/deploy' },
        { text: '问题', link: '/blog/questions' }
      ]
    }
  ];
}

function generateSidebarVueSouceConfig() {
  return [
    {
      text: '快速开始',
      items: [
        { text: '初始化', link: '/vue/souce/effect' },
        { text: '配置简介', link: '/blog/config' },
        { text: '部署', link: '/blog/deploy' },
        { text: '问题', link: '/blog/questions' }
      ]
    }
  ];
}


// sidebar 配置
function sidebarConfig() {
  return [
    {
      text: 'Guide',
      items: [
        { text: 'Introduction', link: '/introduction' },
        { text: 'Getting Started', link: '/getting-started' }
      ]
    }
  ];
}

// nav 配置
function navConfig() {
  return [
    { text: '导航', link: '/' },
    { text: '搭建博客', link: '/blog/init' },
    {
      text: '前端工程',
      items: [
        { text: 'vite', link: '/tools/vite/guide' },
        // { text: 'webpack', link: '/tools/vite/webpack' },
        // { text: 'Babel', link: '/tools/vite/Babel' }
      ]
    },
    {
      text: 'React',
      items: [
        { text: 'React源码', link: '/react/source' },
        { text: 'React-Router', link: '/react/router' },
        { text: 'Redux', link: '/react/redux' }
      ]
    },
    {
      text: 'Vue',
      items: [
        { text: 'Vue源码', link: '/vue/source' },
        { text: 'Vue-Router', link: '/vue/router' },
        { text: 'Pinia', link: '/vue/pinia' }
      ]
    }
  ];
}
