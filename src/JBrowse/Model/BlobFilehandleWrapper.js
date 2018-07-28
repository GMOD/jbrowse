const { Buffer } = cjsRequire('buffer')

/**
 * Wraps a XHRBlob or FileBlob in a new promise-based API (which is
 * the upcoming node fs.promises API) for use by newer code.
 */
class BlobFilehandleWrapper {
    constructor(oldStyleBlob) {
        this.blob = oldStyleBlob
    }

    read(buffer, offset = 0, length, position) {
        return new Promise((resolve,reject) => {
            this.blob.read(
                position,
                length,
                dataArrayBuffer => {
                    const data = Buffer.from(dataArrayBuffer)
                    data.copy(buffer, offset)
                    resolve()
                },
                reject,
            )
        })
    }

    readFile() {
        return new Promise((resolve, reject) => {
            this.blob.fetch( dataArrayBuffer => {
                resolve(Buffer.from(dataArrayBuffer))
            }, reject)
        })
    }

    stat() {
        return new Promise((resolve, reject) => {
            this.blob.stat(resolve, reject)
        })
    }

    toString() {
        return ( this.blob.url  ? this.blob.url :
                 this.blob.blob ? this.blob.blob.name : undefined ) || undefined;
    }
}

module.exports = BlobFilehandleWrapper
