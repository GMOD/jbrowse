define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/lang',
           'dojo/json',
           'JBrowse/Util/GFF3'
       ],
       function(
           declare,
           array,
           lang,
           JSON,
           GFF3
       ) {

return declare( null, {

    constructor: function( args ) {
        lang.mixin( this, {
                        filehandles: args.iterators,

                        // features that are ready to go out and be flushed
                        item_buffer : [],

                        // features that we have to keep on hand for now because they
                        // might be referenced by something else
                        under_construction_top_level : [],
                        // index of the above by ID
                        under_construction_by_id : {},

                        completed_references: {},

                        // features that reference something we have not seen yet
                        // structured as:
                        // {  'some_id' : {
                        //     'Parent' : [ orphans that have a Parent attr referencing it ],
                        //     'Derives_from' : [ orphans that have a Derives_from attr referencing it ],
                        // }
                        under_construction_orphans : {}
                    });
    },

    next_item: function() {

        // try to get more items if the buffer is empty
        if( ! this._buffered_items_count() )
            this._buffer_items();


        // return the next item if we have some
        if( this._buffered_items_count() )
            return this.item_buffer.shift();

        // if we were not able to get any more items, return nothing
        return undefined;
    },

    _buffer_item: function(i) {
        this.item_buffer.push(i);
    },

    _buffered_items_count: function() {
        return this.item_buffer.length;
    },

    /**
     * get and parse lines from the files(s) to add at least one item to
     * the buffer
     */
    _buffer_items: function() {

        var line;
        var match;
        while(( line = this._next_line() )) {
            if( /^\s*[^#\s>]/.test(line) ) { //< feature line, most common case
                var f = GFF3.parse_feature( line );
                this._buffer_feature( f );
            }
            // directive or comment
            else if(( match = /^\s*(\#+)(.*)/.exec( line ) )) {
                var hashsigns = match[1], contents = match[2];
                if( hashsigns.length == 3 ) { //< sync directive, all forward-references are resolved.
                    this._buffer_all_under_construction_features();
                }
                else if( hashsigns.length == 2 ) {
                    var directive = GFF3.parse_directive( line );
                    if( directive.directive == 'FASTA' ) {
                        this._buffer_all_under_construction_features();
                        this._buffer_item({ directive: 'FASTA', filehandle: this.filehandles.shift() });
                        //shift @{this.{filethings}};
                    } else {
                        this._buffer_item( directive );
                    }
                }
                else {
                    contents = contents.replace(/\s*/,'');
                    this._buffer_item({ comment: contents });
                }
            }
            else if( /^\s*$/.test( line ) ) {
                // blank line, do nothing
            }
            else if( /^\s*>/.test(line) ) {
                // implicit beginning of a FASTA section.  a very stupid
                // idea to include this in the format spec.  increases
                // implementation complexity by a lot.
                this._buffer_all_under_construction_features();
                this._buffer_item( this._handle_implicit_fasta_start( line ) );
            }
            else { // it's a parse error
                line = line.replace( /\r?\n?$/g, '' );
                throw "GFF3 parse error.  Cannot parse '"+line+"'.";
            }

            // return now if we were able to find some things to put in the
            // output buffer
            if( this._buffered_items_count() )
                return;
        }

        // if we are out of lines, buffer all under-construction features
        this._buffer_all_under_construction_features();
    },

    /**
     * take all under-construction features and put them in the
     * item_buffer to be output
     */
    _buffer_all_under_construction_features: function() {
        // since the under_construction_top_level buffer is likely to be
        // much larger than the item_buffer, we swap them and unshift the
        // existing buffer onto it to avoid a big copy.
        var old_buffer = this.item_buffer;
        this.item_buffer = this.under_construction_top_level;
        this.item_buffer.unshift.apply( this.item_buffer, old_buffer );
        old_buffer = undefined;

        this.under_construction_top_level = [];
        this.under_construction_by_id = {};
        this.completed_references = {};

        // if we have any orphans hanging around still, this is a
        // problem. die with a parse error
        for( var o in this.under_construction_orphans ) {
            for( var orphan in o ) {
                throw "parse error: orphans "+JSON.stringify( this.under_construction_orphans );
            }
        }
    },

    /**
     * get the next line from our file(s), returning nothing if we are out
     * of lines and files
     */
    _next_line: function() {
        // fast code path for reading a line from the first filehandle,
        var first_fh = this.filehandles[0] || function() {};
        return first_fh() || function() {
            // slower case where we are at the end, or need to change
            // filehandles
            var filehandles = this.filehandles;
            while ( filehandles.length ) {
                var line = filehandles[0]();
                if( line )
                    return line;
                filehandles.shift();
            }
            return undefined;
        }.call(this);
    },

    container_attributes: { Parent : 'child_features', Derives_from : 'derived_features' },

    // do the right thing with a newly-parsed feature line
    _buffer_feature: function( feature_line ) {
        feature_line.child_features = [];
        feature_line.derived_features = [];

        // NOTE: a feature is an arrayref of one or more feature lines.
        var ids     = feature_line.attributes.ID     || [];
        var parents = feature_line.attributes.Parent || [];
        var derives = feature_line.attributes.Derives_from || [];

        if( !ids.length && !parents.length && !derives.length ) {
            // if it has no IDs and does not refer to anything, we can just
            // output it
            this._buffer_item( feature_line );
            return;
        }

        var feature;
        array.forEach( ids, function( id ) {
            var existing;
            if(( existing = this.under_construction_by_id[id] )) {
                // another location of the same feature
                existing.push( feature_line );
                feature = existing;
            }
            else {
                // haven't seen it yet
                feature = [ feature_line ];
                if( ! parents.length && ! derives.length ) {
                    this.under_construction_top_level.push( feature );
                }
                this.under_construction_by_id[id] = feature;

                // see if we have anything buffered that refers to it
                this._resolve_references_to( feature, id );
            }
        },this);

        // try to resolve all its references
        this._resolve_references_from( feature || [ feature_line ], { Parent : parents, Derives_from : derives }, ids );
    },

    _resolve_references_to: function( feature, id ) {
        var references = this.under_construction_orphans[id];
        if( ! references )
            return;

        for( var attrname in references ) {
            var pname = container_attributes[attrname] || attrname.toLowerCase();
            array.forEach( feature, function( loc ) {
                loc[pname].push( references[attrname] );
                delete references[attrname];
            });
        }
    },
    _resolve_references_from: function( feature, references, ids ) {
        // go through our references
        //  if we have the feature under construction, put this feature in the right place
        //  otherwise, put this feature in the right slot in the orphans

        var pname;
        for( var attrname in references ) {
            array.forEach( references[attrname], function( to_id ) {
                var other_feature;
                if(( other_feature = this.under_construction_by_id[ to_id ] )) {
                    if( ! pname )
                        pname = this.container_attributes[attrname] || attrname.toLowerCase();
                    if( ! array.some( ids, function(i) { return this.completed_references[i+','+attrname+','+to_id]++; },this) ) {
                        array.forEach( other_feature, function( loc ) {
                            loc[pname].push( feature );
                        });
                    }
                }
                else {
                    (this.under_construction_orphans[to_id][attrname] = this.under_construction_orphans[to_id][attrname] || [] ).push( feature );
                }
            },this);
        }
    },

    _handle_implicit_fasta_start: function( line ) {
        // need to emulate pushing back the first line of the implicit
        // FASTA section
        var fh = this.filehandles.shift();
        return {
            directive : 'FASTA',
            filehandle : function() {
                if( line ) {
                    var l = line;
                    line = undefined;
                    return line;
                }
                return fh();
            }};
    }

});
});