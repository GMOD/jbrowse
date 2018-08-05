

const siteConfig = {
  title: 'JBrowse',
  tagline: 'A fast, embeddable genome browser built with HTML5 and JavaScript',
  url: 'https://jbrowse.org',
  baseUrl: '/documentation/',
  projectName: 'jbrowse',
  organizationName: 'GMOD',
  customDocsPath: 'docs/site',

  headerLinks: [
    {blog: true, label: 'Blog'},
    {doc: 'configuration_guide', label: 'Documentation'},
    {page: 'demos', label: 'Demos'},
    {page: 'developers', label: 'Developers'},
    {page: 'contact', label: 'Contact'},
    {page: 'references', label: 'References'},
    {page: 'help', label: 'Help'}
  ],

  footerIcon: 'img/jbrowse.png',
  favicon: 'img/favicon.png',

  /* colors for website */
  colors: {
    primaryColor: 'black',
    secondaryColor: 'green',
  },


  copyright:
    'Copyright © ' +
    new Date().getFullYear() +
    ' Evolutionary Software Foundation',

  highlight: {
    // Highlight.js theme to use for syntax highlighting in code blocks
    theme: 'default',
  },

  /* On page navigation for the current documentation page */
  onPageNav: 'separate',
  scripts: ['https://buttons.github.io/buttons.js'],
  blogSidebarCount: 'ALL',
  latestVersion: '1.15.0'
};

module.exports = siteConfig;
