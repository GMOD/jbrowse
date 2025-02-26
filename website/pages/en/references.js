const React = require('react')

const CompLibrary = require('../../core/CompLibrary.js')
const MarkdownBlock = CompLibrary.MarkdownBlock /* Used to read markdown */
const Container = CompLibrary.Container
const GridBlock = CompLibrary.GridBlock

const siteConfig = require(process.cwd() + '/siteConfig.js')

class Index extends React.Component {
  render() {
    let language = this.props.language || ''

    return (
      <Container className="mainContainer documentContainer postContainer">
        <h3>Publications</h3>
        <ul>
          <li>
            Buels R <i>et al</i>.{' '}
            <a href="https://www.ncbi.nlm.nih.gov/pubmed/27072794">
              JBrowse: a dynamic web platform for genome visualization and
              analysis.
            </a>
            <em>Genome Biology</em> <strong>(2016).</strong>
          </li>
          <li>
            Lee E <i>et al</i>. 
            <a href="https://www.ncbi.nlm.nih.gov/pubmed/24000942">
              Web Apollo: a web-based genomic annotation editing platform.
            </a>
            <em>Genome Biology.</em> <strong>(2013).</strong>
          </li>
          <li>
            Skinner ME, Holmes IH.{' '}
            <a href="http://www.ncbi.nlm.nih.gov/pubmed/21154710">
              {' '}
              Setting up the JBrowse genome browser.
            </a>{' '}
            <em>Curr Protoc Bioinformatics.</em> <strong>(2010).</strong>
          </li>
          <li>
            Skinner ME, Uzilov AV, Stein LD, Mungall CJ, Holmes IH.{' '}
            <a href="http://www.ncbi.nlm.nih.gov/pubmed/19570905">
              JBrowse: A next-generation genome browser.
            </a>
            <em>Genome Res.</em> <strong>(2009).</strong>
          </li>
        </ul>
        <h3>Presentations</h3>
        <ul>
          <li>GMOD Meeting (Jan 2014)</li>
          <li>PAG XXII (Jan 2014)</li>
          <li>BioIT World (Apr 2013)</li>
          <li>PAG XXI (Jan 2013)</li>
          <li>GMOD Summer School (Aug 2012)</li>
          <li>GMOD Community Meeting (Apr 2012)</li>
          <li>
            <a
              title="download slides PDF"
              href="http://gmod.org/mediawiki/images/e/ed/Rbuels_jbrowse_pag2012.pdf"
            >
              PAG XX (Jan 2012) slides
            </a>
          </li>
          <li>
            <a href="http://jbrowse.org/info/ABRF_2010/ABRF 2010b.pdf">
              ABRF 2010 (Mar 2010) slides
            </a>
          </li>
          <li>
            <a href="http://jbrowse.org/info/PAG18/pag18.pdf">
              PAG XVIII (Jan 2010) slides
            </a>
          </li>
          <li>
            <a href="http://jbrowse.org/info/GMOD_Aug_2009/Aug2009JBrowse.pdf">
              GMOD Meeting (Aug 2009) slides
            </a>
          </li>
          <li>
            <a href="http://jbrowse.org/info/GMOD_Jan_2009/Jan2009JBrowse.pdf">
              GMOD Meeting (Jan 2009) slides
            </a>
          </li>
          <li>
            <a href="http://jbrowse.org/info/GMOD_Jul_2008/GBrowse3GMOD2008.pdf">
              GMOD Meeting (Jul 2008) slides
            </a>
          </li>
          <li>
            <a href="http://jbrowse.org/info/BOSC_2007/slides.html">
              BOSC 2007 slides
            </a>
            ,{' '}
            <a href="http://jbrowse.org/info/BOSC_2007/">
              HTML-rendering browser demo
            </a>
          </li>
        </ul>
      </Container>
    )
  }
}

module.exports = Index
