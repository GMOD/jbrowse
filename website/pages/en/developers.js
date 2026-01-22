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
      <div>
        <Container className="mainContainer documentContainer postContainer">
          <h3>Source Code and Downloads</h3>
          <ul>
            <li>
              <a href="http://github.com/GMOD/jbrowse/">
                JBrowse GitHub repository
              </a>
            </li>
            <li>
              <a href="https://github.com/GMOD/jbrowse/releases">
                Latest release
              </a>{' '}
              downloads
            </li>
          </ul>

          <h3>Issue Tracker</h3>
          <p>
            <a href="http://github.com/GMOD/jbrowse/issues">
              JBrowse issue tracker on GitHub
            </a>
          </p>

          <h3>Development Roadmap</h3>
          <p>
            The course of JBrowse development is set by the GitHub issues and
            the release milestones they are assigned to.
          </p>
          <p>
            View the{' '}
            <a
              title="JBrowse Development Milestones"
              href="https://github.com/GMOD/jbrowse/milestones"
            >
              GitHub development milestones
            </a>{' '}
            page to explore what new features are planned for each release.
          </p>

          <h3>Documentation</h3>
          <ul>
            <li>
              <a href="/docs/installation.html">Main documentation page</a>
            </li>
            <li>
              <a href="/docs/tutorial.html">Quick start tutorial</a>
            </li>
          </ul>
          <h3>Gitter chatroom</h3>
          <p>
            Daily chat for coordination and Q&A occurs in the{' '}
            <a href="https://gitter.im/GMOD/jbrowse">Gitter</a> channel.
          </p>

          <h3>Legal</h3>
          <p>
            JBrowse is a trademark of the{' '}
            <a href="http://biowiki.org/EvolutionarySoftwareFoundation">
              Evolutionary Software Foundation
            </a>
            . Permission to use this trademark should be solicited by email to{' '}
            <em>ihholmes at gmail dot com</em> and will typically be granted for
            activities that do not compromise the role of the ESF as primary
            custodians of the JBrowse software and name. (For example,
            mentioning that your company offers JBrowse customization or
            consultancy will almost certainly be OK; selling a software package
            as "JBrowse Plus", or similar, may be problematic.)
          </p>

          <p>
            The JBrowse source code is copyright of the{' '}
            <a href="http://biowiki.org/EvolutionarySoftwareFoundation">
              Evolutionary Software Foundation
            </a>
            .
          </p>
        </Container>
      </div>
    )
  }
}

module.exports = Index
