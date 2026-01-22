const React = require('react')

const CompLibrary = require('../../core/CompLibrary.js')
const Container = CompLibrary.Container
const GridBlock = CompLibrary.GridBlock

const siteConfig = require(process.cwd() + '/siteConfig.js')

function docUrl(doc, language) {
  return siteConfig.baseUrl + 'docs/' + (language ? language + '/' : '') + doc
}

class Help extends React.Component {
  render() {
    let language = this.props.language || ''
    const supportLinks = [
      {
        content: `Learn more using the [documentation on this site.](/docs/installation.html)`,
        title: 'Browse Docs',
      },
      {
        content:
          'Ask questions about the documentation and project. Join our gitter.im channel at <a href="https://gitter.im/GMOD/jbrowse">GMOD/jbrowse</a>',
        title: 'Join the community',
      },
      {
        content:
          "Find out what's new with this project on the release announcements <a href='http://jbrowse.org/blog'>blog</a> or follow our github",
        title: 'Stay up to date',
      },
    ]

    return (
      <div className="docMainWrapper wrapper">
        <Container className="mainContainer documentContainer postContainer">
          <div className="post">
            <header className="postHeader">
              <h1>Need help?</h1>
            </header>
            <p>This project is maintained by a dedicated group of people.</p>
            <GridBlock contents={supportLinks} layout="threeColumn" />
          </div>
        </Container>
      </div>
    )
  }
}

module.exports = Help
