define([
           'dojo/_base/declare',
           'JBrowse/View/Track/Alignments',
           'WebApollo/View/Track/DraggableHTMLFeatures'
       ],
       function(
           declare,
           AlignmentsTrack,
           DraggableTrack
       ) {

return declare([ DraggableTrack, AlignmentsTrack ], {} );

});