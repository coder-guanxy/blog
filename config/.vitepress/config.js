module.exports = {
  title: 'GUANの博客',
  description: 'vitepress & guan blog & GUANの博客',
  lang: 'zh-CN',
  base: '/blog/',
  outDir: '../dist/',
  cacheDir: '../_cache/',
  srcDir: '../src',
  titleTemplate: ':title | GUANの博客',
  head: [['link', { rel: 'ico', type: 'image/ico', href: '/favicon.ico' }]],
  vite: {
    // publicDir: '../public'
    // build: {
    //   assetsDir: './src/public'
    // }
  },
  // stable difussion
  themeConfig: {
    // logo: '/favicon.ico',
    returnToTopLabel: '至顶',
    outline: {
      level: 2,
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
      '/blog/': generateSidebarBlogConfig()
    },
    editLink: {
      pattern: 'https://github.com/coder-guanxy/blog/tree/main/src/:path',
      text: '编辑此页'
    }
  }
};

function generateSidebarBlogConfig() {
  return [
    {
      text: '快速开始',
      items: [
        { text: '初始化', link: '/blog/init/' },
        { text: '配置简介', link: '/blog/config' }
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