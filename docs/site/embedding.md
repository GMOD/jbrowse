---
id: embedding
title: Embedding JBrowse
---

## Embedding in an iframe

One way of embedding JBrowse just runs the full browser in an `iframe` element.
It's very simple and easy to get running.

```html
<html>
  <head>
    <title>Embedded JBrowse</title>
  </head>
  <body>
    <h1>Volvox JBrowse Embedded in an <code>iframe</code></h1>
    <div style="width: 600px; margin: 0 auto;">
      <iframe
        src="../../index.html?data=sample_data/json/volvox&tracklist=0&nav=0&overview=0&tracks=DNA%2CExampleFeatures%2CNameTest%2CMotifs%2CAlignments%2CGenes%2CReadingFrame%2CCDS%2CTranscript%2CClones%2CEST"
        style="border: 1px solid black"
        width="600"
        height="300"
      >
      </iframe>
    </div>
  </body>
</html>
```

Which ends up looking like this:

{@inject: iframe_embed_snip}

Note that the iframe's `src` attribute just points to the same JBrowse URL as
your browser would. However, it sets a few additional options in the URL to hide
some of the UI elements to give the view a more "embedded" feel: `tracklist=0`
hides the track list on the left side, `nav=0` hides the navigation bar (the
zoom buttons, search box, etc), and `overview=0` hides the overview scale bar.

## Embedding directly in a `div`

JBrowse 1.14.0 and higher supports a more flexible way of embedding JBrowse by
running it directly in a `div` inside another document.

Example code for this:

```html
<html>
  <head>
    <title>Embedded JBrowse</title>
    <style>
      body {
        background: blue;
        color: white;
      }

      .jbrowse {
        height: 300px;
        width: 600px;
        padding: 0;
        margin-left: 5em;
        border: 1px solid #ccc;
      }
    </style>
  </head>

  <body>
    <div style="padding: 0 1em; margin: 1em 0; border: 1px solid black">
      <h1>Volvox JBrowse Embedded in a <code>div</code></h1>
      <div
        class="jbrowse"
        id="GenomeBrowser"
        data-config='
        "baseUrl": "../",
        "dataRoot": "sample_data/json/volvox",
        "show_nav": false,
        "show_tracklist": false,
        "show_overview": false,
        "update_browser_title": false,
        "updateBrowserURL": false
      '
      >
        <div id="LoadingScreen" style="padding: 50px;">
          <h1>Loading...</h1>
        </div>
      </div>
    </div>
    <script
      type="text/javascript"
      src="../dist/main.bundle.js"
      charset="utf-8"
    ></script>
  </body>
</html>
```

which looks like this when run

{@inject: div_embed_snip}

The biggest gotcha with this embedding method is that the relative path from the
page where you embed JBrowse to the JBrowse `*.bundle.js` files must be `dist/`
if you want to use a "stock" build of JBrowse. A simple way to accomplish that
might be to configure a symlink in your site directory, for example by running
`ln -s ./path/to/jbrowse/dist/ .`, or by creating some kind of path alias in
your web server configuration.

For JBrowse 1.15.5 or higher, the other option is to clone JBrowse from GitHub
and run `setup.sh` with a nonstandard `JBROWSE_PUBLIC_PATH` environment variable
set, which will configure JBrowse to serve its bundles from a different path.
For example, if you had this site layout:

```text
site_root
  |- docs
      |-  index.html (runs embedded jbrowse)
  |- jbrowse (jbrowse installation)
```

you might run the following shell commands:

```sh
cd site_root
git clone --depth 50 https://github.com/GMOD/jbrowse.git
cd jbrowse
JBROWSE_PUBLIC_PATH=/jbrowse/dist/ ./setup.sh
```

Note the trailing slash on the value of JBROWSE_PUBLIC_PATH.

## Embedding in a `div` with dynamic configs

JBrowse also allows you to define your own config dynamically and create an
embedded JBrowse with that config. To do this, you first run `browser.bundle.js`
which makes available `window.Browser`. You can then us that with a config
object to create a JBrowse instace. This can be useful for, for example,
creating a JBrowse track from data you already have in memory via the FromConfig
store class.

This could look like this:

```html
<head>
  <title>Embedded JBrowse</title>
  <style>
    body {
      background: blue;
      color: white;
    }

    .jbrowse {
      height: 300px;
      width: 600px;
      padding: 0;
      margin-left: 5em;
      border: 1px solid #ccc;
    }
  </style>
</head>

<body>
  <div style="padding: 0 1em; margin: 1em 0; border: 1px solid black">
    <h1>Custom JBrowse Embedded in a <code>div</code></h1>
    <div class="jbrowse" id="GenomeBrowser">
      <div id="LoadingScreen" style="padding: 50px;">
        <h1>Loading...</h1>
      </div>
    </div>
  </div>

  <script
    type="text/javascript"
    src="../dist/browser.bundle.js"
    charset="utf-8"
  ></script>
  <script>
    var features = []
    // Add some features
    var config = {
      containerID: 'GenomeBrowser',
      baseUrl: '../',
      refSeqs: {
        url: 'https://s3.amazonaws.com/1000genomes/technical/reference/GRCh38_reference_genome/GRCh38_full_analysis_set_plus_decoy_hla.fa.fai',
      },
      tracks: [
        {
          key: 'GRCH38 Reference Sequence',
          label: 'GRCH38 Reference Sequence',
          urlTemplate:
            'https://s3.amazonaws.com/1000genomes/technical/reference/GRCh38_reference_genome/GRCh38_full_analysis_set_plus_decoy_hla.fa',
        },
        {
          key: 'MyTrack',
          label: 'MyTrack',
          storeClass: 'JBrowse/Store/SeqFeature/FromConfig',
          features: features,
          type: 'CanvasVariants',
        },
      ],
    }

    // Add to the config or tracks

    // Instantiate JBrowse
    window.addEventListener('load', () => {
      window.JBrowse = new window.Browser(config)
    })
  </script>
</body>
```
