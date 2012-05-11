dojo.declare( 'JBrowse.Model.TrackMetaData', null,
/**
 * @lends JBrowse.Model.TrackMetaData.prototype
 */
{
    /**
     * Data store for track metadata, supporting faceted
     * (parameterized) searching.  Keeps all of the track metadata,
     * and the indexes thereof, in memory.
     * @constructs
     * @param args.trackConfigs {Array} array of track configuration
     */
    constructor: function( args ) {
        // set up our facet name discrimination: what facets we will
        // actually provide search on
        var non_facet_attrs = ['conf'];
        this._filterFacet = function( facetName ) {
            var userfilter = args.filterFacets || function() {return true;};
            return userfilter(facetName)
                   && ! dojo.some( non_facet_attrs, function(a) { return a == facetName;});
        };

        // set up our onReady callbacks to fire once the data is
        // loaded
        if( ! dojo.isArray( args.onReady ) ){
            this.onReadyFuncs = args.onReady ? [ args.onReady ] : [];
        } else {
            this.onReadyFuncs = dojo.clone(args.onReady);
        }

        // interpret the track configurations as a metadata store
        this._indexItems(
            {
                store: this,
                items: dojo.map( args.trackConfigs, function(conf) {
                    var metarecord = dojo.clone( conf.metadata || {} );
                    metarecord.label = conf.label;
                    metarecord.key = conf.key;
                    metarecord.conf = conf;
                    if( conf.category )
                        metarecord.category = conf.category;
                    return metarecord;
                },this)
            }
        );

        // fetch and index all the items from each of the stores
        var stores_fetched_count = 0;
        if( ! args.metadataStores || ! args.metadataStores.length ) {
            // if we don't actually have any stores besides the track
            // confs, we're ready now.
            this._finishLoad();
        } else  {
            // index the track metadata from each of the stores

            var storeFetchFinished = dojo.hitch( this, function() {
                if( ++stores_fetched_count == args.metadataStores.length )
                    this._finishLoad();
            });
            dojo.forEach( args.metadataStores, function(store) {
                store.fetch({
                    scope: this,
                    onComplete: Util.debugHandler( this, function(items) {
                        // build our indexes
                        this._indexItems({ store: store, items: items, supplementalOnly: true });

                        // if this is the last store to be fetched, call
                        // our onReady callbacks
                        storeFetchFinished();
                    }),
                    onError: function(e) {
                        console.error(''+e);
                        storeFetchFinished();
                    },
                });
            },this);
        }
     },

    /**
     * Set the store's state to be ready (i.e. loaded), and calls all
     * our onReady callbacks.
     * @private
     */
    _finishLoad: function() {
        this.facets = this.facets.sort();
        this.ready = true;
        dojo.forEach( this.onReadyFuncs, function(f) {
                          f.call( this, this );
                      }, this );
        this.onReadyFuncs = [];
    },

    _indexItems: function( args ) {
        // get our (filtered) list of facets we will index for
        var store = args.store,
            items = args.items;

        var storeAttributes = {};

        // convert the items to a uniform format
        items = dojo.map( items, function( item ) {
                              var itemattrs = store.getAttributes(item);

                              //convert the item into a uniform data format of plain objects
                              var newitem = {};
                              dojo.forEach( itemattrs, function(attr) {
                                                var lcattr = attr.toLowerCase();
                                                storeAttributes[lcattr] = true;
                                                newitem[lcattr] = store.getValue(item,attr);
                                            });
                              return newitem;
                          },
                          this
                        );

        // merge them with any existing records, filtering out ones
        // that should be ignored if we were passed
        // 'supplementalOnly', and update the identity index
        this.identIndex = this.identIndex || {};
        items = (function() {
            var seenInThisStore = {};
            return dojo.map( items, function(item) {
                                 // merge the new item attributes with any existing
                                 // record for this item
                                 var ident = this.getIdentity(item);
                                 var existingItem = this.identIndex[ ident ];

                                 // skip this item if we have already
                                 // seen it from this store, or if we
                                 // are supplementalOnly and it
                                 // does not already exist
                                 if( seenInThisStore[ident] || args.supplementalOnly && !existingItem) {
                                     return null;
                                 }
                                 seenInThisStore[ident] = true;

                                 return this.identIndex[ ident ] = dojo.mixin( existingItem || {}, item );
                             },
                             this
                           );
        }).call(this);

        // filter out nulls
        items = dojo.filter( items, function(i) { return i;});

        // update our facet list to include any new attrs these
        // items have
        var new_facets = this._addFacets( dojof.keys( storeAttributes ) );

        // initialize indexes for any new facets
        this.facetIndexes = this.facetIndexes || { itemCount: 0, bucketCount: 0, byName: {} };
        dojo.forEach( new_facets, function(facet) {
            if( ! this.facetIndexes.byName[facet] ) {
                this.facetIndexes.bucketCount++;
                this.facetIndexes.byName[facet] = { itemCount: 0, bucketCount: 0, byValue: {} };
            }
        }, this);

        // now update the indexes with the new facets
        if( new_facets.length ) {
            var gotDataForItem = {};
            dojo.forEach( new_facets, function(f){ gotDataForItem[f] = {};});

            dojo.forEach( items, function( item ) {
                this.facetIndexes.itemCount++;
                dojo.forEach( new_facets, function( facet ) {
                    var value = this.getValue( item, facet, undefined );
                    if( typeof value == 'undefined' )
                        return;
                    gotDataForItem[facet][this.getIdentity(item)] = 1;
                    this._indexItem( facet, value, item );
                },this);
            }, this);

            // index the items that do not have data for this facet
            var noDataValue = '(no data)';
            dojo.forEach( new_facets, function(facet) {
                var gotSomeWithNoData = false;
                dojo.forEach( dojof.values( this.identIndex ), function(item) {
                    if( ! gotDataForItem[facet][this.getIdentity(item)] ) {
                        gotSomeWithNoData = true;
                        this._indexItem( facet, noDataValue, item );
                    }
                },this);
            },this);

            // calculate the rank of the facets: make an array of
            // facet names sorted by smallest average bucket size,
            // descending
            this.facetIndexes.facetRank = this.facets.sort(dojo.hitch(this,function(a,b){
                a = this.facetIndexes.byName[a];
                b = this.facetIndexes.byName[b];
                return b.itemCount/b.bucketCount - a.itemCount/a.bucketCount;
            }));
        }
    },

    /**
     * Add an item to the indexes for the given facet name and value.
     * @private
     */
    _indexItem: function( facet, value, item ) {
        var facetValues = this.facetIndexes.byName[facet];
        var bucket = facetValues.byValue[value];
        if( !bucket ) {
            bucket = facetValues.byValue[value] = { itemCount: 0, items: [] };
            facetValues.bucketCount++;
        }
        bucket.itemCount++;
        facetValues.itemCount++;
        bucket.items.push(item);
    },

    /**
     * Given an array of string facet names, add records for them,
     * initializing the necessary data structures.
     * @private
     * @returns {Array[String]} facet names that did not already exist
     */
    _addFacets: function( facetNames ) {
        var old_facets = this.facets || [];
        var seen = {};
        this.facets = dojo.filter(
            old_facets.concat( facetNames ),
            function(facetName) {
                var take = this._filterFacet(facetName) && !seen[facetName];
                seen[facetName] = true;
                return take;
            },
            this
        );
        return this.facets.slice( old_facets.length );
    },

    /**
     * Get an array of the text names of the facets that are defined
     * in this track metadata.
     * @param callback {Function} called as callback( [facet,facet,...] )
     */
    getFacets: function( callback ) {
        return this.facets;
    },

    /**
     * Get an Array of the distinct values for a given facet name.
     * @param facetName {String} the facet name
     * @returns {Array} distinct values for that facet
     */
    getFacetValues: function( facetName ) {
        var index = this.facetIndexes.byName[facetName];
        if( !index )
            return [];

        return dojof.keys( index.byValue );
    },

    /**
     * Add a callback to be called when this store is ready (i.e. loaded).
     */
    onReady: function( callback ) {
        if( this.ready ) {
            callback.call( this, this );
        }
        else {
            this.onReadyFuncs.push( callback );
        }
    },

    // dojo.data.api.Read support

    getValue: function( i, attr, defaultValue ) {
        var v = i[attr];
        return typeof v == 'undefined' ? defaultValue : v;
    },
    getValues: function( i, attr ) {
        var a = [ i[attr] ];
        return typeof a[0] == 'undefined' ? [] : a;
    },

    getAttributes: function(item)  {
        return dojof.keys( item );
    },

    hasAttribute: function(item,attr) {
        return item.hasOwnProperty(attr);
    },

    containsValue: function(item, attribute, value) {
        return item[attribute] == value;
    },

    isItem: function(item) {
        return typeof item == 'object' && typeof item.label == 'string';
    },

    isItemLoaded: function() {
        return true;
    },

    loadItem: function( args ) {
    },

    // used by the dojo.data.util.simpleFetch mixin to implement fetch()
    _fetchItems: function( keywordArgs, findCallback, errorCallback ) {
        if( ! this.ready ) {
            this.onReady( dojo.hitch( this, '_fetchItems', keywordArgs, findCallback, errorCallback ) );
            return;
        }

        var query = dojo.clone( keywordArgs.query || {} );
        // coerce query arguments to arrays if they are not already arrays
        dojo.forEach( dojof.keys( query ), function(qattr) {
            if( ! Array.isArray( query[qattr] ) ) {
                query[qattr] = [ query[qattr] ];
            }
        },this);

        var textFilter = query.text;
        delete query.text;

        var results;

        // if we don't actually have any facets specified in the
        // query, the results are just all the items
        if( ! dojo.some( dojof.values(query), function(q){ return q.length > 0;}) ) {
            results = dojof.values( this.identIndex );
        }
        else {
            // start with an initial set of items that have the desired
            // value for the most specific (smallest avg index bucket
            // size) facet that was specified
            results = (function() {
                           var highestRankedFacet,
                               queryValues = [],
                               index;
                           dojo.some( this.facetIndexes.facetRank, function(facetName) {
                                          if( query[facetName] ) {
                                              highestRankedFacet = facetName;
                                              queryValues = query[highestRankedFacet];
                                              index = this.facetIndexes.byName[highestRankedFacet];
                                              return queryValues.length > 0;
                                          }
                                          return false;
                                      },this);

                           delete query[highestRankedFacet];

                           var set = [];
                           dojo.forEach( queryValues, function(val) {
                              var bucket = index.byValue[val];
                              if( bucket )
                                  set.push.apply( set, bucket.items );
                           },this);
                           return set;
                       }).call(this);

            // and filter this starting set for the other facets
            dojo.forEach( dojof.keys(query), function(facetName) {
                              var desired_values = query[facetName] || [];
                              if( ! desired_values.length )
                                  return;
                              results = dojo.filter(results, function(item) {
                                                        var value = this.getValue(item,facetName);
                                                        return dojo.some( desired_values, function(desired) {
                                                                              return desired == value;
                                                                          },this);
                                                    },this);
                          },this);
        }

        // filter with the text filter, if we have it
	if( typeof textFilter != 'undefined' ) {
            var filter = this._compileTextFilter( textFilter );
            results = dojo.filter( results, function(item) {
                return dojo.some( this.facets, function(facetName) {
                           return filter( this.getValue( item, facetName ) );
                       },this);
            },this);
        }

        // and finally, hand them to the finding callback
        findCallback(results,keywordArgs);
    },

    /**
     * Compile a text search string into a function that tests whether
     * a given piece of text matches that search string.
     * @private
     */
    _compileTextFilter: function( textString ) {

        // parse out words and quoted words, and convert each into a regexp
        var rQuotedWord = /\s*["']([^"']+)["']\s*/g;
        var rWord = /(\S+)/g;
        var parseWord = function() {
            var word = rQuotedWord.exec( textString ) || rWord.exec( textString );
            if( word ) {
                word = word[1];
                var lastIndex = Math.max( rQuotedWord.lastIndex, rWord.lastIndex );
                rWord.lastIndex = rQuotedWord.lastIndex = lastIndex;
            }
            return word;
        };
        var wordREs = [];
        var currentWord;
        while( (currentWord = parseWord()) ) {
            // escape regex control chars, and convert glob-like chars to
            // their regex equivalents
            currentWord = dojo.regexp.escapeString( currentWord, '*?' )
                              .replace(/\*/g,'.+')
                              .replace(/ /g,'\\s+')
                              .replace(/\?/g,'.');
            wordREs.push( new RegExp(currentWord,'i') );
        }

        // return a function that returns true if all of the words
        // match the string, but in any order
        return function( text ) {
            return dojof.every( wordREs, function(re) { return re.test(text); } );
        };
    },

    getFeatures: function() {
        return {
	    'dojo.data.api.Read': true,
	    'dojo.data.api.Identity': true
	};
    },
    close: function() {},

    getLabel: function(i) {
        return this.getValue(i,'key',undefined);
    },
    getLabelAttributes: function(i) {
        return ['key'];
    },

    // dojo.data.api.Identity support
    getIdentityAttributes: function() {
        return ['label'];
    },
    getIdentity: function(i) {
        return this.getValue(i, 'label', undefined);
    },
    fetchItemByIdentity: function(id) {
        return this.identIndex[id];
    }
});
dojo.require('dojo.data.util.simpleFetch');
dojo.extend( JBrowse.Model.TrackMetaData, dojo.data.util.simpleFetch );