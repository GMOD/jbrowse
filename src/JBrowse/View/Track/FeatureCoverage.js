define( ['dojo/_base/declare',
         'dojo/_base/array',
         'JBrowse/View/Track/Wiggle/XYPlot',
         'JBrowse/Util',
         'JBrowse/Store/SeqFeature/Coverage'
        ],
        function( declare, array, WiggleXYPlot, Util, CoverageStore ) {


return declare( WiggleXYPlot,
{

    constructor: function( args ) {
        this.store = new CoverageStore( { store: this.store, browser: this.browser });
    },

    _defaultConfig: function() {
        return Util.deepUpdate(
            dojo.clone( this.inherited(arguments) ),
            {
                autoscale: 'local'
            }
        );
    },


    _trackMenuOptions: function() {
        var thisB = this;
        var displayOptions = [];


        displayOptions.push({
            label: 'View alignments',
            onClick: function(event) {
                thisB.config.type = 'JBrowse/View/Track/Alignments2'
                thisB.config._oldSnpCoverageHeight = thisB.config.style.height
                thisB.config.style.height = thisB.config._oldAlignmentsHeight
                thisB.browser.publish('/jbrowse/v1/v/tracks/replace', [thisB.config]);
            }
        });

        return Promise.all([ this.inherited(arguments), displayOptions ])
            .then( function( options ) {
                       var o = options.shift();
                       options.unshift({ type: 'dijit/MenuSeparator' } );
                       return o.concat.apply( o, options );
                   });
    }
});
});
