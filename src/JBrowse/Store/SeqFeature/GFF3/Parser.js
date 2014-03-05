define([
           'dojo/_base/declare',
           'dojo/_base/array',
           'dojo/_base/lang',
           'dojo/json',
           'JBrowse/Util/GFF3', 'JBrowse/Store/SeqFeature/VCFTabix/Parser', 'JBrowse/Store/SeqFeature/VCFTabix/LazyFeature'
       ],
       function(
           declare,
           array,
           lang,
           JSON,
           GFF3,VCFTabix,LazyFeature
       ) {

return declare( VCFTabix, {

    constructor: function( args ) {
        lang.mixin( this, {
                        featureCallback:   args.featureCallback || function() {},
                        endCallback:       args.endCallback || function() {},
                        commentCallback:   args.commentCallback || function() {},
                        errorCallback:     args.errorCallback || function(e) { console.error(e); },
                        directiveCallback: args.directiveCallback || function() {},

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
                        under_construction_orphans : {},

                        // if this is true, the parser ignores the
                        // rest of the lines in the file.  currently
                        // set when the file switches over to FASTA
                        eof: false
                    });
    },

    lineToFeature: function( line ) {
        var fields = line.fields;

        for( var i=0; i<fields.length; i++ )
            if( fields[i] == '.' )
                fields[i] = null;

        var featureData = {
            start:  line.start,
            end:    line.end,
            seq_id: line.ref
        };

        var f = new LazyFeature({
            id: fields.slice( 0, 9 ).join('/'),
            data: featureData,
            fields: fields,
            parser: this
        });

        return f;
    },

    addLine: function( line ) {
        var match;
        if( this.eof ) {
            // do nothing
        } else if( /^\s*[^#\s>]/.test(line) ) { //< feature line, most common case
            var f = GFF3.parse_feature_tabix( line );
            this._buffer_feature( f );
            return f;
        }
        // directive or comment
        else if(( match = /^\s*(\#+)(.*)/.exec( line ) )) {
            var hashsigns = match[1], contents = match[2];
            if( hashsigns.length == 3 ) { //< sync directive, all forward-references are resolved.
                this._return_all_under_construction_features();
            }
            else if( hashsigns.length == 2 ) {
                var directive = GFF3.parse_directive( line );
                if( directive.directive == 'FASTA' ) {
                    this._return_all_under_construction_features();
                    this.eof = true;
                } else {
                    this._return_item( directive );
                }
            }
            else {
                contents = contents.replace(/\s*/,'');
                this._return_item({ comment: contents });
            }
        }
        else if( /^\s*$/.test( line ) ) {
            // blank line, do nothing
        }
        else if( /^\s*>/.test(line) ) {
            // implicit beginning of a FASTA section.  just stop
            // parsing, since we don't currently handle sequences
            this._return_all_under_construction_features();
            this.eof = true;
        }
        else { // it's a parse error
            line = line.replace( /\r?\n?$/g, '' );
            throw "GFF3 parse error.  Cannot parse '"+line+"'.";
        }
    },

    _return_item: function(i) {
        if( i[0] )
            this.featureCallback( i );
        else if( i.directive )
            this.directiveCallback( i );
        else if( i.comment )
            this.commentCallback( i );
    },

    finish: function() {
        this._return_all_under_construction_features();
        this.endCallback();
    },

    /**
     * return all under-construction features, called when we know
     * there will be no additional data to attach to them
     */
    _return_all_under_construction_features: function() {
        // since the under_construction_top_level buffer is likely to be
        // much larger than the item_buffer, we swap them and unshift the
        // existing buffer onto it to avoid a big copy.
        array.forEach( this.under_construction_top_level,
                       this._return_item,
                       this );

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
            this._return_item([ feature_line ]);
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
                    ( this.under_construction_orphans[to_id][attrname] = this.under_construction_orphans[to_id][attrname] || [] )
                        .push( feature );
                }
            },this);
        }
    }
});
});
