const { Buffer } = cjsRequire('buffer')
/**
 * Wraps a XHRBlob or FileBlob in a new promise-based API (which is
 * the upcoming node fs.promises API) for use by newer code.
 */
class BlobFilehandleWrapper {
  constructor(oldStyleBlob) {
    this.blob = oldStyleBlob
  }

  async read(buffer, offset = 0, length, position) {
    const data = await this.blob.readBufferPromise(position, length)
    data.copy(buffer, offset)
    return { bytesRead: data.length, buffer }
  }

  async readFile() {
    return this.blob.fetchBufferPromise()
  }

  stat() {
    return this.blob.statPromise()
  }

  toString() {
    return (
      (this.blob.url
        ? this.blob.url
        : this.blob.blob
          ? this.blob.blob.name
          : undefined) || undefined
    )
  }
}

module.exports = BlobFilehandleWrapper
