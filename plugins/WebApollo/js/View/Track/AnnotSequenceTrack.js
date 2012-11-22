define( [
    'dojo/_base/declare',
    'WebApollo/View/Track/SequenceTrack', 
],
        function( declare, SequenceTrack) {

var AnnotSequenceTrack = declare( SequenceTrack, 
{   
    // AnnotSequenceTrack is just a stub for now, all functionality is in SequenceTrack superclass
    //    intent is to eventually move sequence alteration functionality out of SequenceTrack and into AnnotSequenceTrack subclass
    constructor: function(args)  {  }
    // , test: function()  { console.log("called AnnotSequenceTrack.test"); }
});

return AnnotSequenceTrack;

});

