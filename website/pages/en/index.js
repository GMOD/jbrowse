const React = require('react')

const CompLibrary = require('../../core/CompLibrary.js')
const MarkdownBlock = CompLibrary.MarkdownBlock /* Used to read markdown */
const Container = CompLibrary.Container
const GridBlock = CompLibrary.GridBlock

const siteConfig = require(process.cwd() + '/siteConfig.js')

function imgUrl(img) {
  return siteConfig.baseUrl + 'img/' + img
}

function docUrl(doc) {
  return siteConfig.baseUrl + 'docs/' + doc
}

function pageUrl(page) {
  return siteConfig.baseUrl + page
}

const FeatureCallout = props => (
  <div className="paddingBottom" style={{ textAlign: 'left' }}>
    <h2>Features:</h2>
    <ul>
      <li>
        Fast, smooth scrolling and zooming. Explore your genome with
        unparalleled speed.
      </li>
      <li>
        Scales easily to multi-gigabase genomes and deep-coverage sequencing.
      </li>
      <li>
        Quickly open and view data files on your computer without uploading them
        to any server.
      </li>
      <li>
        Supports GFF3, BED, FASTA, Wiggle, BigWig, BAM, CRAM, VCF (with either
        .tbi or .idx index), REST, and more. BAM, BigBed, BigWig, and VCF data
        are displayed directly from chunks of the compressed binary files, no
        conversion needed.
      </li>
      <li>
        Includes an optional “faceted” track selector (
        <a
          href={`https://jbrowse.org/code/JBrowse-${siteConfig.latestVersion}/index.html?data=sample_data/json/modencode`}
        >
          see demo
        </a>
        ) suitable for large installations with thousands of tracks.
      </li>
      <li>
        Very light server resource requirements. In fact, JBrowse has no
        back-end server code, it just reads chunks of files directly over HTTP
        using{' '}
        <a href="https://developer.mozilla.org/en-US/docs/Web/HTTP/Range_requests">
          byte-range requests
        </a>
        . You can serve huge datasets from a single low-cost cloud instance.
      </li>
      <li>
        JBrowse Desktop runs as a stand-alone app on Windows, Mac OS, and Linux.
      </li>
      <li>
        Highly extensible plugin architecture, with a{' '}
        <a href="https://gmod.github.io/jbrowse-registry">
          large registry of plugins
        </a>
        .
      </li>
    </ul>
  </div>
)

const BrowserCompat = props => (
  <div className="paddingBottom" style={{ textAlign: 'left' }}>
    <h2>Browser Compatibility</h2>
    <p>
      The latest release of JBrowse is tested to work with the following web
      browsers:
    </p>
    <ul>
      <li>Mozilla Firefox (10 and later)</li>
      <li>Google Chrome (17 and later)</li>
      <li>Apple Safari (9 and later)</li>
      <li>Microsoft Internet Explorer (11 and later)</li>
    </ul>
    <p>
      Server-side code, which is used only to pre-generate static data files (no
      CGI), requires only BioPerl and a few other CPAN modules. The result is a
      cross-platform AJAX genome browser that is easy to install, embed and
      customize.
    </p>
    <p>
      JBrowse is a <a href="http://gmod.org">GMOD</a> project.
    </p>
  </div>
)

const ExtraInfo = props => (
  <div className="paddingBottom" style={{ textAlign: 'left' }}>
    <h2>Funding</h2>
    <p>
      JBrowse development is funded by the{' '}
      <a href="http://genome.gov/">NHGRI</a>.
    </p>

    <h2>Citing JBrowse</h2>
    <p>
      If you use JBrowse in a project that you publish, please cite the most
      recent JBrowse paper listed on the{' '}
      <a href="references.html">References</a> page
    </p>

    <h2>License</h2>
    <p>
      JBrowse is released under the GNU LGPL or the Artistic License, see the
      JBrowse{' '}
      <a
        href={`https://jbrowse.org/code/JBrowse-${siteConfig.latestVersion}/LICENSE`}
      >
        LICENSE
      </a>{' '}
      file.
    </p>
  </div>
)

const HeaderInfo = props => (
  <div className="paddingBottom" style={{ textAlign: 'left' }}>
    <h1>The JBrowse Genome Browser</h1>
    <p>
      JBrowse is a fast, scalable genome browser built completely with
      JavaScript and HTML5. It can run on your desktop, or be embedded in your
      website.
    </p>

    <b>
      <a href="blog/">
        Download latest release – JBrowse {siteConfig.latestVersion}
      </a>
    </b>
  </div>
)

class Index extends React.Component {
  render() {
    let language = this.props.language || ''
    return (
      <Container className="mainContainer documentContainer postContainer">
        <div className="flexContainer" style={{ display: 'flex' }}>
          <div>
            <HeaderInfo />
            <iframe
              width="100%"
              height="600"
              src={`https://jbrowse.org/code/JBrowse-${siteConfig.latestVersion}/?loc=ctgA%3A9892..32101&tracks=DNA%2CTranscript%2Cvolvox_microarray_bw_density%2Cvolvox_microarray_bw_xyplot%2Cvolvox-sorted-vcf%2Cvolvox-sorted_bam_coverage%2Cvolvox-sorted_bam&data=sample_data%2Fjson%2Fvolvox&tracklist=0`}
            ></iframe>
            <div className="mainContainer">
              <FeatureCallout />
              <BrowserCompat />
              <ExtraInfo />
            </div>
          </div>
          <div style={{ margin: 20 }}>
            <a
              className="twitter-timeline"
              data-width="300"
              data-height="500"
              href="https://twitter.com/JBrowseGossip?ref_src=twsrc%5Etfw"
            >
              Tweets by JBrowseGossip
            </a>
            <script
              async
              src="https://platform.twitter.com/widgets.js"
              charSet="utf-8"
            ></script>
          </div>
        </div>
      </Container>
    )
  }
}

module.exports = Index
