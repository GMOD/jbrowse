/**
 * Mixin that provides generic functions for displaying nested data.
 */
define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/query',
           'dojo/dom-construct',
           'dojo/dom-class',
           'dojo/store/Memory',
           'dgrid/OnDemandGrid',
           'dgrid/extensions/DijitRegistry',
           'JBrowse/Util'
       ],
       function(
           declare,
           lang,
           array,
           query,
           domConstruct,
           domClass,
           MemoryStore,
           DGrid,
           DGridDijitRegistry,
           Util
       ) {

// make a DGrid that registers itself as a dijit widget
var Grid = declare([DGrid,DGridDijitRegistry]);

return declare( null, {

    renderDetailField: function( parentElement, title, val, class_ ) {
        if( val === null || val === undefined )
            return '';

        // if this object has a 'fmtDetailFooField' function, delegate to that
        var fieldSpecificFormatter;
        if(( fieldSpecificFormatter = this['fmtDetail'+Util.ucFirst(title)+'Field'] ))
            return fieldSpecificFormatter.apply( this, arguments );

        // otherwise, use default formatting

        class_ = class_ || title.replace(/\W/g,'_').toLowerCase();

        // special case for values that include metadata about their
        // meaning, which are formed like { values: [], meta:
        // {description: }.  break it out, putting the meta description in a `title`
        // attr on the field name so that it shows on mouseover, and
        // using the values as the new field value.
        var fieldMeta;
        if( typeof val == 'object' && ('values' in val) ) {
            fieldMeta = (val.meta||{}).description;
            // join the description if it is an array
            if( lang.isArray( fieldMeta ) )
                fieldMeta = fieldMeta.join(', ');

            val = val.values;
        }

        var titleAttr = fieldMeta ? ' title="'+fieldMeta+'"' : '';
        var fieldContainer = domConstruct.create(
            'div',
            { className: 'field_container',
              innerHTML: '<h2 class="field '+class_+'"'+titleAttr+'>'+title+'</h2>'
            }, parentElement );
        var valueContainer = domConstruct.create(
            'div',
            { className: 'value_container '
                         + class_
            }, fieldContainer );

        var count = this.renderDetailValue( valueContainer, title, val, class_);
        if( typeof count == 'number' && count > 4 ) {
            query( 'h2', fieldContainer )[0].innerHTML = title + ' ('+count+')';
        }

        return fieldContainer;
    },

    renderDetailValue: function( parent, title, val, class_ ) {
        var thisB = this;

        // if this object has a 'fmtDetailFooValue' function, delegate to that
        var fieldSpecificFormatter;
        if(( fieldSpecificFormatter = this['fmtDetail'+Util.ucFirst(title)+'Value'] ))
            return fieldSpecificFormatter.apply( this, arguments );

        // otherwise, use default formatting

        var valType = typeof val;
        if( typeof val.toHTML == 'function' )
            val = val.toHTML();
        if( valType == 'boolean' )
            val = val ? 'yes' : 'no';
        else if( valType == 'undefined' || val === null )
            return 0;
        else if( lang.isArray( val ) ) {
            var vals = array.map( val, function(v) {
                       return this.renderDetailValue( parent, title, v, class_ );
                   }, this );
            if( vals.length > 10 )
                domClass.add( parent, 'big' );
            return vals.length;
        } else if( valType == 'object' ) {
            var keys = Util.dojof.keys( val ).sort();
            var count = keys.length;
            if( count > 5 ) {
                this.renderDetailValueGrid(
                    parent,
                    title,
                    // iterator
                    function() {
                        if( ! keys.length )
                            return null;
                        var k = keys.shift();
                        var value = val[k];

                        var item = { id: k };

                        if( typeof value == 'object' ) {
                            for( var field in value ) {
                                item[field] = thisB._valToString( value[field] );
                            }
                        }
                        else {
                            item.value = value;
                        }

                        return item;
                    },
                    // descriptions object
                    (function() {
                         if( ! keys.length )
                             return {};

                         var subValue = val[keys[0]];
                         var descriptions = {};
                         for( var k in subValue ) {
                             descriptions[k] = subValue[k].meta && subValue[k].meta.description || null;
                         }
                         return descriptions;
                     })()
                );
                return count;
            }
            else {
                array.forEach( keys, function( k ) {
                                   return this.renderDetailField( parent, k, val[k], class_ );
                               }, this );
                return keys.length;
            }
        }

        domConstruct.create('div', { className: 'value '+class_, innerHTML: val }, parent );
        return 1;
    },

    renderDetailValueGrid: function( parent, title, iterator, descriptions ) {
        var thisB = this;
        var rows = [];
        var item;
        while(( item = iterator() ))
            rows.push( item );

        if( ! rows.length )
            return document.createElement('span');

        var columns = [];
        for( var field in rows[0] ) {
            (function(field) {
                var column = {
                    label: { id: 'Name'}[field] || Util.ucFirst( field ),
                    field: field
                };
                column.renderHeaderCell = function( contentNode ) {
                    if( descriptions[field] )
                        contentNode.title = descriptions[field];
                    contentNode.appendChild( document.createTextNode( column.label || column.field));
                };
                columns.push( column );
            })(field);
        }

        // create the grid
        parent.style.overflow = 'hidden';
        parent.style.width = '90%';
        var grid = new Grid({
            columns: columns,
            store: new MemoryStore({ data: rows })
        }, parent );

        return container;
    },

    _valToString: function( val ) {
        if( lang.isArray( val ) ) {
            return array.map( val, lang.hitch( this,'_valToString') ).join(' ');
        }
        else if( typeof val == 'object' ) {
            if( 'values' in val )
                return this._valToString( val.values );
            else
                return JSON.stringify( val );
        }
        return ''+val;
    }

});
});