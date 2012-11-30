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
    },

    addLocalFiles: function( fileList ) {
        var seenFile = {};
        var allRes = [].concat( this._resources||[] );
        array.forEach( fileList, function(f) {
            allRes.unshift( { file: f });
        },this);
        this._resources = array.filter( allRes, function( res ) {
            var key = res.file && res.file.name || res.url;
            if( seenFile[key] ) {
                return false;
            }
            seenFile[key] = true;
            return true;
        }).reverse();

        this._updateView();
        this.onChange();
    },

    _updateView: function() {
        var container = this.domNode;
        dom.empty( container );

        dom.create('h3', { innerHTML: 'Files and URLs' }, container );

        if( (this._resources||[]).length ) {
            var table = dom.create('table',{}, container );

            // render rows in the resource table for each resource in our
            // list
            array.forEach( this._resources, function( res, i){
               var tr = dom.create('tr', {}, table );

               var name = res.url || res.file.name;

               // make a selector for the resource's type
               var typeSelect = new Select({
                    id: id+'_type',
                    options: [
                        { label: '<span class="ghosted">file type?</span>', value: null     },
                        { label: "GFF3",   value: "gff3"   },
                        { label: "BigWig", value: "bigwig" },
                        { label: "BAM",    value: "bam"    },
                        { label: "BAI",    value: "bai"    }
                    ],
                    value: this.guessType( name )
                });
                typeSelect.placeAt( dojo.create('td',{},tr) );
                res.type = typeSelect;

                dojo.create( 'td', {
                  innerHTML: '<span class="dijitIcon'+(res.file ? 'File' : 'Link')+'"></span>'
                },tr);
                dojo.create('td',{ innerHTML: name },tr);
                dojo.create('td',{
                  innerHTML: '<span class="jbrowseIconDelete"></span>',
                  onclick: function() { alert('baleeted'); }
                }, tr);
            }, this);
        }
        else {
            dom.create('div', { className: 'emptyMessage',
                                innerHTML: 'Add files or URLs to begin.'
                              },
                       container);
        }
    },

    addURLs: function( urls ) {
    },

    guessType: function( name ) {
        return ( this._rememberedTypes||{} )[name] || (
                /\.bam$/i.test( name )          ? 'bam'    :
                /\.bai$/i.test( name )          ? 'bai'    :
                /\.gff3?$/i.test( name )        ? 'gff3'   :
                /\.(bw|bigwig)$/i.test( name )  ? 'bigwig' :
                                                  null
        );
    }

});
});
