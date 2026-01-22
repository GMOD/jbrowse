const React = require('react')

class Footer extends React.Component {
  docUrl(doc, language) {
    const baseUrl = this.props.config.baseUrl
    return baseUrl + 'docs/' + (language ? language + '/' : '') + doc
  }

  pageUrl(doc, language) {
    const baseUrl = this.props.config.baseUrl
    return baseUrl + (language ? language + '/' : '') + doc
  }

  render() {
    const currentYear = new Date().getFullYear()
    return (
      <footer className="nav-footer" id="footer">
        <section className="sitemap">
          <div>
            <h5>Docs</h5>
            <a href={this.props.config.baseUrl + 'blog'}>Blog</a>
            <a href={this.docUrl('tutorial.html')}>Getting Started</a>
          </div>
          <div>
            <h5>Community</h5>
            <a href="https://gitter.im/GMOD/jbrowse">Project Chat</a>
            <a
              href="https://twitter.com/JBrowseGossip"
              target="_blank"
              rel="noreferrer noopener"
            >
              Twitter
            </a>
            <a href="https://jbrowse.org/jb2/">Looking for JBrowse 2?</a>
          </div>
          <div>
            <h5>More</h5>
            <a href="https://github.com/GMOD/jbrowse">GitHub</a>
            <a
              className="github-button"
              href="https://github.com/GMOD/jbrowse"
              data-icon="octicon-star"
              data-count-href="/GMOD/jbrowse/stargazers"
              data-show-count={true}
              data-count-aria-label="# stargazers on GitHub"
              aria-label="Star this project on GitHub"
            >
              Star
            </a>
          </div>
        </section>

        <section className="copyright">{this.props.config.copyright}</section>
      </footer>
    )
  }
}

module.exports = Footer
