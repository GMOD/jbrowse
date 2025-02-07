const { Plugin: Embed } = require('remarkable-embed')

// Our custom remarkable plugin factory.
const createVariableInjectionPlugin = variables => {
  // `let` binding used to initialize the `Embed` plugin only once for efficiency.
  // See `if` statement below.
  let initializedPlugin

  const embed = new Embed()
  embed.register({
    // Call the render method to process the corresponding variable with
    // the passed Remarkable instance.
    // -> the Markdown markup in the variable will be converted to HTML.
    inject: key => initializedPlugin.render(variables[key]),
  })

  return (md, options) => {
    if (!initializedPlugin) {
      initializedPlugin = {
        render: md.render.bind(md),
        hook: embed.hook(md, options),
      }
    }

    return initializedPlugin.hook
  }
}

const v = {
  version: '1.16.11',
}
const siteVariables = {
  version: v.version,
  setup_snip: [
    `    curl -L -O https://github.com/GMOD/jbrowse/releases/download/${v.version}-release/JBrowse-${v.version}.zip`,
    `    unzip JBrowse-${v.version}.zip`,
    `    sudo mv JBrowse-${v.version} /var/www/html/jbrowse`,
    '    cd /var/www/html',
    '    sudo chown `whoami` jbrowse',
    '    cd jbrowse',
    '    ./setup.sh',
  ].join('\n'),
  setup_alt: [
    `    git clone https://github.com/gmod/jbrowse`,
    `    cd jbrowse`,
    `    git checkout ${v.version}-release # or version of your choice`,
    `    ./setup.sh`,
    `    npm run start # starts a express.js dev server on port 8082, alternatively move the entire jbrowse dir to /var/www/html as above`,
  ].join('\n'),
  download_snip: `https://github.com/GMOD/jbrowse/archive/${v.version}-release.tar.gz`,
  fasta_download_snip: [
    '    mkdir data',
    `    curl -L https://jbrowse.org/code/JBrowse-${v.version}/docs/tutorial/data_files/volvox.fa > data/volvox.fa`,
  ].join('\n'),
  gff3_download_snip: `   curl -L https://jbrowse.org/code/JBrowse-${v.version}/docs/tutorial/data_files/volvox.gff3 > data/volvox.gff3`,
  bam_download_snip: `    curl -L https://jbrowse.org/code/JBrowse-${v.version}/docs/tutorial/data_files/volvox-sorted.bam > data/volvox-sorted.bam`,
  iframe_embed_snip: [
    '<div style="padding: 0 1em; margin: 1em 0; border: 1px solid black">',
    '  <h1>Volvox JBrowse Embedded in an <code>iframe</code></h1>',
    '  <div style="width: 600px; margin: 0 auto;">',
    '    <iframe',
    `      src="https://jbrowse.org/code/JBrowse-${v.version}/?data=sample_data/json/volvox&tracklist=0&nav=0&overview=0&tracks=DNA%2CExampleFeatures%2CNameTest%2CMotifs%2CAlignments%2CGenes%2CReadingFrame%2CCDS%2CTranscript%2CClones%2CEST"`,
    '      style="border: 1px solid black"',
    '      width="600"',
    '      height="300"',
    '    >',
    '    </iframe>',
    '  </div>',
    '</div>',
  ].join('\n'),
  div_embed_snip: [
    '<div style="padding: 0 1em; margin: 1em 0; border: 1px solid black; background: blue; color: white">',
    '  <h1>Volvox JBrowse Embedded in a <code>div</code></h1>',
    '  <div',
    '    class="jbrowse"',
    '    id="GenomeBrowser"',
    "    data-config='",
    `      "baseUrl": "../code/JBrowse-${v.version}/",`,
    '      "dataRoot": "sample_data/json/volvox",',
    '      "show_nav": false,',
    '      "show_tracklist": false,',
    '      "show_overview": false,',
    '      "update_browser_title": false,',
    '      "updateBrowserURL": false',
    "    '",
    '    style="height: 300px;width: 600px;padding: 0;margin-left: 5em;border: 1px solid #ccc"',
    '  >',
    '    <div id="LoadingScreen" style="padding: 50px;">',
    '      <h1>Loading...</h1>',
    '      <p>If this does not load, try viewing this page with <a href="http://jbrowse.org/docs/embedding.html">HTTP instead of HTTPS</a></p>',
    '    </div>',
    '  </div>',
    '</div>',
    `<script type="text/javascript" src="../code/JBrowse-${v.version}/dist/main.bundle.js" charset="utf-8"></script>`,
  ].join('\n'),
}

const siteConfig = {
  title: 'JBrowse',
  tagline: 'A fast, embeddable genome browser built with HTML5 and JavaScript',
  url: 'https://jbrowse.org',
  baseUrl: '/',
  projectName: 'jbrowse',
  organizationName: 'GMOD',
  customDocsPath: 'docs/site',

  headerLinks: [
    { blog: true, label: 'Blog' },
    { doc: 'installation', label: 'Documentation' },
    { page: 'demos', label: 'Demos' },
    { page: 'developers', label: 'Developers' },
    { page: 'contact', label: 'Contact' },
    { page: 'references', label: 'References' },
    { page: 'help', label: 'Help' },
  ],

  footerIcon: 'img/jbrowse.png',
  favicon: 'img/favicon.ico',

  /* colors for website */
  colors: {
    primaryColor: 'black',
    secondaryColor: 'green',
  },
  markdownPlugins: [createVariableInjectionPlugin(siteVariables)],

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
  latestVersion: siteVariables.version,
}

module.exports = siteConfig
