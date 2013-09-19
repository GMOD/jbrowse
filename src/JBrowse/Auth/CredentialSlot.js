define([
           'dojo/_base/declare',
           'dojo/_base/lang',
           'dojo/_base/array',
           'dojo/dom-construct',
           'dojo/Deferred',
           'dijit/form/Form',
           'dijit/form/TextBox',
           'JBrowse/Util',
           'JBrowse/Component',
           'JBrowse/View/Dialog/Prompt'
       ],
       function(
           declare,
           lang,
           array,
           dom,
           Deferred,
           dijitForm,
           dijitTextBox,
           Util,
           Component,
           PromptDialog
       ) {

return declare( Component, {

  configSchema: {
      slots: [
          { name: 'type', type: 'string', required: true },

          { name: 'urlPrefix', type: 'string' },
          { name: 'urlRegExp', type: 'string' },
          { name: 'urlRegExpOpts', type: 'string', defaultValue: 'i' },
          { name: 'predicate', type: 'boolean', defaultValue: function( slot, resourceDef ) {
                var url = resourceDef.url || '';
                var re = slot.getConf('urlRegExp');
                if( re ) {
                    re = new RegExp( re, slot.getConf('urlRegExpOpts') );
                    return re.test( url );
                }
                var prefix = slot.getConf('urlPrefix');
                if( prefix ) {
                    return url.indexOf( prefix ) != -1;
                }
                return false;
            }
          }

      ]
  },

  ready: function() {
      return this._ready || ( this._ready = this._getCredentials() );
  },

  neededFor: function( resourceDefinition ) {
      return this.getConf('predicate', [ this, resourceDefinition ]);
  },

  _getCredentials: function() {
      throw new Error('override either _getCredentials() or ready() in a subclass');
  },

  release: function() {
      delete this._ready;
      return Util.resolved(true);
  },

  // TODO: implement this stub
  _promptForData: function( title, data ) {
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

          return new PromptDialog(
              {
                  title: title || '',
                  content: form,
                  form: form
              })
              .prompt()
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
  }

  // implement this in a subclass to decorate HTTP requests with
  // auth tokens and so forth
  // decorateHTTPRequest: function( req ) {
  // }

});
});