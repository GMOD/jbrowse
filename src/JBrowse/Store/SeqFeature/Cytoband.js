define( [
            'dojo/_base/declare',
            'JBrowse/Model/SimpleFeature',
            './Cytoband/Parser'
        ],
        function(
            declare,
            SimpleFeature,
            Parser
        ) {

return declare(null,

{
    constructor: function( args ) {
        this.data = args.blob;
        this.features = [];
        this._loadFeatures();
    },

    _loadFeatures: function() {
        var parser = new Parser();
        parser.parseFile(this.data);
    },
});
});
