const { TabixIndexedFile } = cjsRequire('@gmod/tabix')

// this is basically just an adaptor to @gmod/tabix TabixIndexedFile now
define([
           'dojo/_base/declare',
           'JBrowse/Errors',
           'JBrowse/Model/BlobFilehandleWrapper'
       ],
       function(
           declare,
           Errors,
           BlobFilehandleWrapper,
       ) {

return declare( null, {

    constructor: function( args ) {
        this.browser = args.browser;

        this.data = new TabixIndexedFile({
            filehandle: new BlobFilehandleWrapper(args.file),
            tbiFilehandle: args.tbi && new BlobFilehandleWrapper(args.tbi),
            csiFilehandle: args.csi && new BlobFilehandleWrapper(args.csi),
            chunkSizeLimit: args.chunkSizeLimit || 2000000,
            renameRefSeqs: n => this.browser.regularizeReferenceName(n)
        })
    },

    getMetadata() {
        return this.data.getMetadata()
    },

    getHeader() {
        return this.data.getHeaderBuffer()
    },

    featureCount(ref) {
        const regularizeReferenceName = this.browser.regularizeReferenceName(ref)
        return this.data.lineCount(regularizeReferenceName);
    },

    getLines( ref, min, max, itemCallback, finishCallback, errorCallback ) {
        this.data.getMetadata()
        .then( metadata => {
            const regularizeReferenceName = this.browser.regularizeReferenceName(ref)
            return this.data.getLines(regularizeReferenceName, min, max, (line, fileOffset) => {
                itemCallback(this.parseLine(metadata, line, fileOffset))
            })
        })
        .then(finishCallback, error => {
            if (errorCallback) {
                if (error.message && error.message.indexOf('Too much data') >= 0) {
                    error = new Errors.DataOverflow(error.message)
                }
                errorCallback(error)
            } else
                console.error(error)
        })
    },

    parseLine({columnNumbers}, line, fileOffset) {
        const fields = line.split("\t")
        if (!(fileOffset >= 0)) {
            throw new Error(`invalid tabix file offset ${fileOffset}`)
        }
        return { // note: index column numbers are 1-based
            ref: fields[columnNumbers.ref - 1],
            _regularizedRef: this.browser.regularizeReferenceName(fields[columnNumbers.ref - 1]),
            start: parseInt(fields[columnNumbers.start - 1]),
            end: parseInt(fields[columnNumbers.end - 1]),
            fields,
            fileOffset,
        }
    }

});
});
