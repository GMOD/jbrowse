define( ['dojo/_base/declare',
         'dojo/_base/array',
         'dojo/dom-construct',
         'dijit/form/Select'
        ],
        function( declare, array, dom, Select ) {

return declare( null, {

    constructor: function( args ) {
        this.dialog = args.dialog;
        this.domNode = dom.create( 'div', { className: 'resourceList' } );
        this._updateView();
    },

    clearLocalFiles: function() {
        this._resources = array.filter( this._resources || [], function(res) {
            return ! res.file;
        });
        this._notifyChange();
    },

    _notifyChange: function() {
        this.onChange( array.map( this._resources || [], function( res ) {
            var r = {};
            if( res.file )
                r.file = res.file;
            if( res.url )
                r.url = res.url;
            r.type = res.type.get('value');
            return r;
        }));
    },

    _addResources: function( resources ) {
        var seenFile = {};
        var allRes = ( this._resources||[] ).concat( resources );
        this._resources = array.filter( allRes.reverse(), function( res ) {
            var key = res.file && res.file.name || res.url;
            if( seenFile[key] ) {
                return false;
            }
            seenFile[key] = true;
            return true;
        }).reverse();

        this._updateView();
        this._notifyChange();
    },

    addLocalFiles: function( fileList ) {
        this._addResources( array.map( fileList, function(file) {
            return { file: file };
        }));
    },

    clearURLs: function() {
        this._resources = array.filter( this._resources || [], function(res) {
            return ! res.url;
        });
        this._notifyChange();
    },
    addURLs: function( urls ) {
        this._addResources( array.map( urls, function(u) {
            return { url: u };
        }));
    },

    // old-style handler stub
    onChange: function() { },

    _updateView: function() {
        var container = this.domNode;
        dom.empty( container );

        dom.create('h3', { innerHTML: 'Files and URLs' }, container );

        if( (this._resources||[]).length ) {
            var table = dom.create('table',{}, container );

            // render rows in the resource table for each resource in our
            // list
            array.forEach( this._resources, function( res, i){
               var that = this;
               var tr = dom.create('tr', {}, table );
               var name = res.url || res.file.name;

               // make a selector for the resource's type
               var typeSelect = new Select({
                    options: [
                        { label: '<span class="ghosted">file type?</span>', value: null     },
                        { label: "GFF3",        value: "gff3"   },
                        { label: "GTF",         value: "gtf"    },
                        { label: "BigWig",      value: "bigwig" },
                        { label: "BAM",         value: "bam"    },
                        { label: "BAM index",   value: "bai"    },
                        { label: "FASTA",       value: "fasta"  },
                        { label: "FASTA index", value: "fai"    },
                        { label: "VCF+bgzip",   value: "vcf.gz" },
                        { label: "Tabix index", value: "tbi"    }
                    ],
                    value: this.guessType( name ),
                    onChange: function() {
                        that._rememberedTypes = that._rememberedTypes||{};
                        that._rememberedTypes[name] = this.get('value');
                        that._notifyChange();
                    }
                });
                typeSelect.placeAt( dojo.create('td',{ width: '4%'},tr) );
                res.type = typeSelect;

                dojo.create( 'td', {
                  width: '1%',
                  innerHTML: '<div class="'+(res.file ? 'dijitIconFile' : 'jbrowseIconLink')+'"></div>'
                },tr);
                dojo.create('td',{ innerHTML: name },tr);
                dojo.create('td',{
                  width: '1%',
                  innerHTML: '<div class="dijitIconDelete"></div>',
                  onclick: function(e) {
                      e.preventDefault && e.preventDefault();
                      that.deleteResource( res );
                  }
                }, tr);
            }, this);
        }
        else {
            dom.create('div', { className: 'emptyMessage',
                                innerHTML: 'Add files and URLs using the controls above.'
                              },
                       container);
        }

        // little elements used to show pipeline-like connections between the controls
        dom.create( 'div', { className: 'connector', innerHTML: '&nbsp;'}, container );
    },

    deleteResource: function( resource ) {
        this._resources = array.filter( this._resources || [], function(res) {
            return res !== resource;
        });
        this._updateView();
        this._notifyChange();
    },

    guessType: function( name ) {
        return ( this._rememberedTypes||{} )[name] || (
                /\.bam$/i.test( name )          ? 'bam'    :
                /\.bai$/i.test( name )          ? 'bai'    :
                /\.gff3?$/i.test( name )        ? 'gff3'   :
                /\.gtf?$/i.test( name )         ? 'gtf'    :
                /\.(bw|bigwig)$/i.test( name )  ? 'bigwig' :
                /\.(fa|fasta)$/i.test( name )   ? 'fasta'  :
                /\.fai$/i.test( name )          ? 'fai'    :
                /\.vcf\.gz$/i.test( name )      ? 'vcf.gz' :
                /\.tbi$/i.test( name )          ? 'tbi'    :
                                                  null
        );
    }

});
});
