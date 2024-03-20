export const genMicroFrontEndSideBarConfig = () => {
    return [
        {
          text: '微前端源码简介',
          items: [
            { text: '源码入口', link: '/microFrontEnd/microApp/sourceMicroApp' },
            { text: '创建上下文实例', link: '/microFrontEnd/microApp/sourceCreateAppInstance' },
            { text: '加载css, js源码', link: '/microFrontEnd/microApp/sourceLoadSourceCode' },
            { text: '处理 css 源码', link: '/microFrontEnd/microApp/sourceScopedCSS' },
            { text: 'iframe 沙箱和虚拟路由', link: '/microFrontEnd/microApp/sourceCreateSandbox' },
          ]
        }
      ];
}