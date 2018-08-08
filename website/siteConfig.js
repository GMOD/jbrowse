const {Plugin: Embed} = require('remarkable-embed');

// Our custom remarkable plugin factory.
const createVariableInjectionPlugin = variables => {
  // `let` binding used to initialize the `Embed` plugin only once for efficiency.
  // See `if` statement below.
  let initializedPlugin;

  const embed = new Embed();
  embed.register({
    // Call the render method to process the corresponding variable with
    // the passed Remarkable instance.
    // -> the Markdown markup in the variable will be converted to HTML.
    inject: key => initializedPlugin.render(variables[key])
  });

  return (md, options) => {
    if (!initializedPlugin) {
      initializedPlugin = {
        render: md.render.bind(md),
        hook: embed.hook(md, options)
      };
    }

    return initializedPlugin.hook;
  };
};

const siteVariables = {
  version: '1.15.1',
};


const siteConfig = {
  title: 'JBrowse',
  tagline: 'A fast, embeddable genome browser built with HTML5 and JavaScript',
  url: 'https://jbrowse.org',
  baseUrl: '/',
  projectName: 'jbrowse',
  organizationName: 'GMOD',
  customDocsPath: 'docs/site',

  headerLinks: [
    {blog: true, label: 'Blog'},
    {doc: 'installation', label: 'Documentation'},
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
  markdownPlugins: [
    createVariableInjectionPlugin(siteVariables)
  ],

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
