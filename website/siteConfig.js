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

const v = {
    "version": "1.16.2"
};
const siteVariables = {
    "version": v.version,
    "setup_snip": [
        `    curl -O https://github.com/GMOD/jbrowse/releases/download/${v.version}-release/JBrowse-${v.version}.zip`,
        `    unzip JBrowse-${v.version}.zip`,
        `    sudo mv JBrowse-${v.version} /var/www/html/jbrowse`,
        '    cd /var/www/html',
        '    sudo chown `whoami` jbrowse',
        '    cd jbrowse',
        '    ./setup.sh # don\'t do sudo ./setup.sh'
    ].join('\n'),
    "download_snip": `https://github.com/GMOD/jbrowse/archive/${v.version}-release.tar.gz`
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
  favicon: 'img/favicon.ico',

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
  latestVersion: siteVariables.version
};

module.exports = siteConfig;
