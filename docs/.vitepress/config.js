module.exports = {
  title: 'GUANの博客',
  description: 'vitepress & guan blog & GUANの博客',
  base: '/blog/',
  titleTemplate: ':title | GUANの博客',
  head: [['link', { rel: 'ico', type: 'image/ico', href: '/favicon.ico' }]],
  // stable difussion
  themeConfig: {
    // logo: '/favicon.ico',
    outline: {
      level: 1,
      label: 'GUANの博客'
    },
    aside: 'left',
    lastUpdated: {
      text: '最后更改时间',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short'
      }
    },
    docFooter: {
      prev: 'Pagina prior',
      next: 'Proxima pagina'
    },
    nav: [
      { text: '导航', link: '/' },
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
    ]
  }
};
