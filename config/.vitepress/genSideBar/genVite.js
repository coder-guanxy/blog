export const genViteSideBarConfig = () => {
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