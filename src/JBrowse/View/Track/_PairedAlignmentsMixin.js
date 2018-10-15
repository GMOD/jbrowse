/**
 * Mixin with methods used for displaying alignments and their mismatches.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/lang',
           'dojo/when',
           'JBrowse/Util',
           'JBrowse/Store/SeqFeature/_MismatchesMixin',
           'JBrowse/View/Track/_AlignmentsMixin'
        ],
        function(
            declare,
            array,
            lang,
            when,
            Util,
            AlignmentsMixin
        ) {

return declare(AlignmentsMixin, {

    /**
     * Make a default feature detail page for the given feature.
     * @returns {HTMLElement} feature detail page HTML
     */
    defaultFeatureDetail(track, f, div ) {
        if(f.pairedFeature()) {
            var container = dojo.create('div', {
                className: 'detail feature-detail feature-detail-'+track.name.replace(/\s+/g,'_').toLowerCase(),
                style: { width: '1000px' }
            });
            dojo.place('<div><h1>Paired read details</h1></div><br />', container)
            var flexContainer = dojo.create('div', {
                className: 'detail feature-detail feature-detail-'+track.name.replace(/\s+/g,'_').toLowerCase(),
                style: {
                    display: 'flex',
                    'flex-direction': 'row'
                }
            }, container);
            var c1 = dojo.create('div', { className: 'detail feature-detail' }, flexContainer);
            var c2 = dojo.create('div', { className: 'detail feature-detail' }, flexContainer);
            var ret = this.inherited(arguments, [track, f.f1, c1])
            var ret2 = this.inherited(arguments, [track, f.f2, c2])
            dojo.place(ret, c1)
            dojo.place(ret2, c2)
            return container;
        } else {
            return this.inherited(arguments)
        }
        // var fmt = dojo.hitch( this, function( name, value, feature ) {
        //     name = Util.ucFirst( name.replace(/_/g,' ') );
        //     return this.renderDetailField(container, name, value, feature);
        // });
        // fmt( 'Name', f.get('name'), f );
        // fmt( 'Type', f.get('type'), f );
        // fmt( 'Score', f.get('score'), f );
        // fmt( 'Description', f.get('note'), f );
        // fmt(
        //     'Position',
        //     Util.assembleLocString({ start: f.get('start'),
        //                              end: f.get('end'),
        //                              ref: this.refSeq.name })
        //     + ({'1':' (+)', '-1': ' (-)', 0: ' (no strand)' }[f.get('strand')] || ''),
        //     f
        // );


        // if( f.get('seq') ) {
        //     fmt('Sequence and Quality', this._renderSeqQual( f ), f );
        // }

        // var renameTags = { length_on_ref: 'seq_length_on_ref' };
        // var additionalTags = array.filter(
        //     f.tags(), function(t) {
        //         return ! {name:1,score:1,start:1,end:1,strand:1,note:1,subfeatures:1,type:1,cram_read_features:1}[t.toLowerCase()];
        //     }
        // )
        // .map( function(tagName) {
        //     return [
        //         renameTags[tagName] || tagName,
        //         f.get(tagName)
        //     ]
        // })
        // .sort( function(a,b) { return a[0].localeCompare(b[0]) })

        // dojo.forEach( additionalTags, function(t) {
        //     fmt( t[0], t[1], f );
        // });

        // // genotypes in a separate section
        // if(this.config.renderAlignment || this.config.renderPrettyAlignment) {
        //     this._renderTable( container, track, f, div );
        // }

        // return container;
    }

});
});
