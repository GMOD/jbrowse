define([
           'dojo/_base/declare',
           'dojo/_base/url',
           'dojo/_base/lang',
           'dojo/io-query',

           'JBrowse/has',
           './_RequestBased'
       ],
       function(
           declare,
           URL,
           lang,
           ioQuery,

           has,
           _RequestBased
       ) {
return declare( 'JBrowse.Transport.LocalMail', _RequestBased, {

  configSchema: {
      slots: [
          { name: 'name', defaultValue: 'Send as email' },
          { name: 'sendFileControlClass', type: 'string', defaultValue: 'JBrowse/View/SendTo/MailTo' }
      ]
  },

  canHandle: function( def ) {
      return /^mailto:/i.test( def );
  },

  sendFile: function( dataGenerator, destinationResourceDefinition, sendOpts ) {
      sendOpts = { body: '', subject: sendOpts.filename };

      // var mediaType = sendOpts.mediaType;
      // console.log( 'saving as type '+mediaType+', name '+filename );

      return dataGenerator
          .forEach(
              function( chunk ) {
                  sendOpts.body += chunk;
              },
              function() {
                  window.location = ( destinationResourceDefinition
                      + (destinationResourceDefinition.indexOf('?') >= 0 ? '&':'?')
                      + ioQuery.objectToQuery( sendOpts ) );
              }
          );
  }

});
});