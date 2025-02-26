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
        <h3>Latest release</h3>
        <ul>
          <li>
            <a
              title="Volvox example data"
              href={`https://jbrowse.org/code/JBrowse-${siteConfig.latestVersion}/?data=sample_data/json/volvox&loc=ctgA%3A9900..32510&amp;tracks=DNA%2CTranscript%2Cvolvox-sorted-vcf%2Cvolvox-sorted_bam%2Cvolvox_microarray_bw_xyplot%2Cvolvox_microarray_bw_density&amp;data=sample_data%2Fjson%2Fvolvox&amp;highlight=`}
              target="_blank"
            >
              <i>Volvox mythicus</i> example/test data
            </a>
             - the latest JBrowse release, showing the primary test data set
            used in development.  Includes demonstrations of all major JBrowse
            track types, including direct display of BAM alignments and
            coverage, direct display of BigWig data, and more.  This data is
            made up for demonstration purposes.
          </li>
          <li>
            <a
              title='view faceted track selector demo - hit "Select tracks" on the left'
              href={`https://jbrowse.org/code/JBrowse-${siteConfig.latestVersion}/index.html?data=sample_data/json/modencode`}
              target="_blank"
            >
              Faceted track selection demo
            </a>
             - running in the latest JBrowse release with over 1,800 tracks.
             Based on a snapshot of the modENCODE track metadata taken from 
            <a href="http://data.modencode.org" target="_blank">
              http://data.modencode.org
            </a>
            .  Note that the actual track data and reference sequences in this
            track selection demo are just made-up test data.
          </li>
          <li>
            <a
              href="http://jbrowse.org/code/JBrowse-1.12.5/compat_121.html?data=/genomes/ucsc_hg19"
              target="_blank"
            >
              Human hg19 genes
            </a>{' '}
            - a demonstration of a large dataset.  From UCSC Genome Database - 
            <a href="https://genome.ucsc.edu" target="_blank">
              https://genome.ucsc.edu
            </a>
          </li>
          <li>
            <a
              title="D. melanogaster JBrowse"
              href={`https://jbrowse.org/code/JBrowse-${siteConfig.latestVersion}/?data=%2Fgenomes%2Fflybase-dmel-5.52-genes&amp;loc=2L%3A10283901..10390066&amp;tracks=DNA%2CGenes`}
              target="_blank"
            >
              <em>Drosophila melanogaster</em> genes
            </a>{' '}
            - from FlyBase release 5.52.  Good demonstration of JBrowse 1.12.0
            canvas-based gene glyphs.
          </li>
        </ul>
        <h3>Older instances</h3>
        <ul>
          <li>
            <a href="http://jbrowse.org/genomes/tomato/?loc=SL2.40ch10%3A30019461..30040900&amp;tracks=DNA%2Crnaseq%2Cgenes">
              <em>Solanum lycopersicum</em> (tomato)
            </a>{' '}
            - running in JBrowse 1.5.0, including a BigWig track showing RNA-Seq
            coverage
          </li>
          <li>
            <em>
              <a href="http://jbrowse.org/genomes/dmel/">
                Drosophila melanogaster
              </a>
            </em>{' '}
            genome running in JBrowse 1.2.0
          </li>
          <li>
            <a href="http://jbrowse.org/ucsc/hg19/touch.html?loc=chr1:208,056,300..208,073,080&amp;tracks=DNA,knownGene,ccdsGene,snp131,pgWatson,simpleRepeat">
              <em>Homo sapiens</em>
            </a>{' '}
            — hg19 sequence and several annotation tracks from UCSC
            (touchscreen-enabled for iPad) running in JBrowse 1.1.0
          </li>
        </ul>
        <h3>Movies</h3>
        <ul>
          <li>
            <a href="http://www.youtube.com/watch?v=-X03_f158m0">
              JBrowse on a desktop Mac with a touchscreen display
            </a>
          </li>
          <li>
            <a href="http://www.youtube.com/watch?v=FMVtxTt6KCg">
              JBrowse on the iPad
            </a>
          </li>
        </ul>
      </Container>
    )
  }
}

module.exports = Index
