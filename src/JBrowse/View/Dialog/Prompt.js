define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/dom-construct',
           'dojo/Deferred',
           'dojo/on',
           'dojo/keys',

           'dijit/form/Form',
           'dijit/form/TextBox',
           'dijit/form/Button',

           'JBrowse/View/Dialog/WithActionBar',
           'JBrowse/Util',
           'JBrowse/Errors'
       ],
       function(
           declare,
           lang,
           array,
           dom,
           Deferred,
           on,
           keys,

           dijitForm,
           dijitTextBox,
           dijitButton,

           ActionBarDialog,
           Util,
           Errors
       ) {

return declare( ActionBarDialog, {

    refocus: true,
    autofocus: true,

    // given a nested object containing some items of the form name:
    // '<prompt>', prompt for those items and return a Deferred copy
    // of the hash with them filled in.
    promptForPlaceHolders: function( data ) {
        var thisB = this;
        data = lang.clone( data );

        // find <prompt> tags in the input data
        var promptFields = [];
        function findPrompts(d,path) {
            for( var k in d ) {
                var match = typeof d[k] == 'string' && d[k].match( /<prompt:?([^>]+)?>/ );
                if( match )
                    promptFields.push( { name: k, type: match[1] || 'text', label: Util.ucFirst(k).replace(/_/g,' '), path: path.concat(k) } );
                else if( typeof d[k] == 'object' || lang.isArray( d[k] ) ) {
                    findPrompts( d[k], path.concat(k) );
                }
            }
        }
        findPrompts(data,[]);

        if( promptFields.length ) {
            data.prompted = true;

            var form = new dijitForm();
            on( form.domNode, 'keyup', function(evt) {
                    if( evt.keyCode == keys.ENTER )
                        thisB._submit();
                });

            var container = dom.create('div', { className: 'autoprompt' }, form.domNode );
            array.forEach( promptFields,
                           function( f ) {
                               var label = dom.create( 'label', {innerHTML: '<div class="text">'+f.label+'</div>'}, container );
                               new dijitTextBox({ name: f.name, type: f.type }).placeAt(label);
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
            thisB._submit();
            return false;
        };
            new dijitButton({
                className: 'Submit',
                label: 'Submit',
                onClick: lang.hitch( this, '_submit' )
            })
            .placeAt( actionBar);

            new dijitButton({
                className: 'Cancel',
                label: 'Cancel',
                onClick: lang.hitch(this,'_cancel')
            })
            .placeAt( actionBar);
    },

    _submit: function() {
        this.deferredResults.resolve( this.form.getValues() );
        this.hide();
    },
    _cancel: function() {
        this.deferredResults.cancel( new Errors.UserCancel( 'canceled by user action') );
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