define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/dom-construct',
           'dojo/Deferred',
           'dijit/form/Form',
           'dijit/form/TextBox',
           'JBrowse/View/Dialog/WithActionBar',
           'JBrowse/Util',
           'dijit/form/Button'
       ],
       function(
           declare,
           lang,
           array,
           dom,
           Deferred,
           dijitForm,
           dijitTextBox,
           ActionBarDialog,
           Util,
           dijitButton
       ) {

return declare( ActionBarDialog, {

    refocus: false,
    autofocus: false,

    // given a nested object containing some items of the form name:
    // '<prompt>', prompt for those items and return a Deferred copy
    // of the hash with them filled in.
    promptForPlaceHolders: function( data ) {
        data = lang.clone( data );

        // find <prompt> tags in the input data
        var promptFields = [];
        function findPrompts(d,path) {
            for( var k in d ) {
                if( d[k] == '<prompt>' )
                    promptFields.push( { name: k, label: Util.ucFirst(k).replace(/_/g,' '), path: path.concat(k) } );
                else if( typeof d[k] == 'object' || lang.isArray( d[k] ) ) {
                    findPrompts( d[k], path.concat(k) );
                }
            }
        }
        findPrompts(data,[]);

        if( promptFields.length ) {
            data.prompted = true;

            var form = new dijitForm();
            array.forEach( promptFields,
                           function( f ) {
                               var label = dom.create( 'label', {innerHTML: f.label}, form.domNode );
                               new dijitTextBox({ name: f.name }, dom.create('div',{},label));
                           });
            this.form = form;
            this.set( 'content', this.form );

            return this.prompt()
                .then( function( formdata ) {
                           function set( d, path, value ) {
                               var k = path.shift();
                               if( path.length )
                                   set( d[k], path, value );
                               else
                                   d[k] = value;
                           }

                           array.forEach( promptFields, function( promptField ) {
                                              if( promptField.name in formdata )
                                                  set( data, promptField.path, formdata[promptField.name] );
                                          });
                           return data;
                       });
        } else {
            data.prompted = false;
            return Util.resolved( data );
        }
    },

    _fillActionBar: function( actionBar ) {
        var thisB = this;
        thisB.form.onSubmit = function() {
            thisB.submit();
            return false;
        };
            new dijitButton({
                className: 'Submit',
                label: 'Submit',
                onClick: function() {
                    thisB.submit();
                },
                focus: false
            })
            .placeAt( actionBar);

            new dijitButton({
                className: 'Cancel',
                label: 'Cancel',
                onClick: dojo.hitch(this,'hide'),
                focus: false
            })
            .placeAt( actionBar);
    },

    submit: function() {
        this.deferredResults.resolve( this.form.getValues() );
        this.hide();
    },

    prompt: function() {
        this.show();
        return this.deferredResults = new Deferred();
    },

    hide: function() {
        this.inherited(arguments);
        window.setTimeout( lang.hitch( this, 'destroyRecursive' ), 1000 );
    }
});
});