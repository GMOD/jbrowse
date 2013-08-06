define( [
            'dojo/_base/declare',
            'dojo/_base/lang',
            'JBrowse/has',
            'JBrowse/Model/XHRBlob',
            'JBrowse/Store/SeqFeature',
            'JBrowse/Store/DeferredFeaturesMixin',
            './TwoBit/File'
        ],
        function(
            declare,
            lang,
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

        // called by getFeatures from the DeferredFeaturesMixin
        _getFeatures: function( query, callback, endCallback, errorCallback ) {
            this.twoBit.fetch( query, callback, endCallback, errorCallback );
        }

    });
});