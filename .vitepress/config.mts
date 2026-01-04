import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Rom Adams",
  description: "Anomylist",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Portfolio', link: '/docs/portfolio/index.md' }
    ],
    footer: {
      copyright: 'Copyright © 2019-present Rom Adams (né Romuald Vandepoel)'
    },    

    sidebar: [
      { text: 'Portfolio', link: '/docs/portfolio/index.md' },
      {
        text: 'Kubernetes',
        items: [

          // { text: 'unified eu sovereign cloud hub', link: '/docs/portfolio/foss/eufc/index.md' },
          { text: 'Kleidi', link: '/docs/portfolio/foss/kleidi/index.md' },
          { text: 'NFSv4 Home in Containers', link: '/docs/portfolio/ntap/k8svintageapp/index.md' },
          { text: 'NetApp Consoles for Openshift', link: '/docs/portfolio/ntap/trident/index.md' },
          { text: 'Generic',
            items: [
            { text: 'OpenShift Project', link: '/docs/portfolio/rdht/namespace/index.md' },
            { text: 'App Resources', link: '/docs/portfolio/rdht/appresources/index.md' },
            { text: 'Source to Image', link: '/docs/portfolio/rdht/s2i/index.md' },
            { text: 'Helm Charts', link: '/docs/portfolio/rdht/helm/index.md' },          
          ]
        }
        ]
      },
      {
        text: 'ML/AI',
        items: [
          { text: 'ABACC-RAG', link: '/docs/portfolio/foss/abacc/index.md' },
          { text: 'Dialup', link: '/docs/portfolio/foss/dialup/index.md' },         
          { text: 'Neo Deployment Strategies', link: ''}, 
          { text: 'Neo UI Framework', link: '/docs/portfolio/ntap/neo/index.md' },
          { text: 'Neo Fuse Framework', link: ''}, 

        ]
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/romdalf' },
      { icon: 'linkedin', link: 'https://www.linkedin.com/in/romdalf/' }
    ]
  }
})
