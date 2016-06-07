define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/lang',
            'dojo/Deferred',
            'dojo/promise/all',
            'JBrowse/has',
            'JBrowse/Model/XHRBlob',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Store/DeferredFeaturesMixin',
            './TwoBit/File'
        ],
        function(
            declare,
            array,
            lang,
            Deferred,
            all,
            has,
            XHRBlob,
            SeqFeatureStore,
            DeferredFeaturesMixin,
            TwoBitFile
        ) {

    return declare([ SeqFeatureStore, DeferredFeaturesMixin], {

        /**
         * Data backend for reading feature data directly from a
         * web-accessible .2bit file.
         *
         * @constructs
         */
        constructor: function( args ) {
            
            var blob = args.blob || new XHRBlob( this.resolveUrl( args.urlTemplate || 'data.2bit' ) );
            
            this.twoBit = new TwoBitFile({
                data: blob,
                store: this
            });
            
            if( ! has( 'typed-arrays' ) ) {
                this._failAllDeferred( 'This web browser lacks support for JavaScript typed arrays.' );
                return;
            }

            this.twoBit.init({
                success: lang.hitch(this, function() {
                    this._deferred.features.resolve({success: true });
                }),
                failure: lang.hitch(this, '_failAllDeferred')
            });
        },


        /**
         * Interrogate whether a store has data for a given reference
         * sequence.  Calls the given callback with either true or false.
         *
         * Implemented as a binary interrogation because some stores are
         * smart enough to regularize reference sequence names, while
         * others are not.
         */
        hasRefSeq: function( seqName, callback, errorCallback ) {
            var thisB = this;
            seqName = thisB.browser.regularizeReferenceName( seqName );
            this._deferred.features.then( function() {
                callback( seqName in thisB.twoBit.chrToIndex );
            }, errorCallback );
        },
        getRefSeqs: function( featCallback, errorCallback ) {
            var thisB = this;
            this._deferred.features.then(
                function() {
                    var keys = Object.keys(thisB.twoBit.chrToIndex);
                    var ret = [];
                    var promises = array.map(keys, function(name) {
                        var def = new Deferred();
                        thisB.twoBit._readSequenceHeader(name, function(ret) {
                            def.resolve({
                                name: name,
                                length: ret.dnaSize,
                                end: ret.dnaSize,
                                start: 0
                            });
                        },
                        function(err) {
                            def.reject(err);
                        });
                        return def;
                    });
                    console.log(promises);

                    all(promises).then(function(refseqs) {
                        console.log(refseqs);
                        featCallback(refseqs);
                    }, function(err) {
                        errorCallback(err);
                    });
                },
                errorCallback
            );
        },

        // called by getFeatures from the DeferredFeaturesMixin
        _getFeatures: function( query, callback, endCallback, errorCallback ) {
            this.twoBit.fetch( query, callback, endCallback, errorCallback );
        }

    });
});
