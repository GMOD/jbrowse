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
        <h2>Contact</h2>
        <h3>Feature requests & bug reporting</h3>
        <p>
          JBrowse feature/bug tickets are handled by the{' '}
          <a href="https://github.com/GMOD/jbrowse">GitHub issue tracker</a>.
        </p>
        <h3>Mailing list</h3>
        <a href="https://sourceforge.net/p/gmod/mailman/gmod-ajax/">
          gmod-ajax @ Sourceforge
        </a>
        <p>Send a message to gmod-ajax@lists.sourceforge.net with questions</p>{' '}
        or{' '}
        <a href="https://sourceforge.net/projects/gmod/lists/gmod-ajax">
          subscribe
        </a>
        <h3>Chat</h3>
        <a href="https://gitter.im/GMOD/jbrowse">Gitter</a>
      </Container>
    )
  }
}

module.exports = Index
