require([
    'dojo/aspect',
    'dojo/_base/declare',
    'JBrowse/View/TrackList/Hierarchical',
],
function(
    aspect,
    declare,
    Hierarchical
) {
    describe( 'custom sort', function() {
        var tracklist;
        beforeEach( function() {
            tracklist = new Hierarchical()
        });

        it( 'performs a custom sort', function() {
            var tracks = [{
                category: 't1'
            }, {
                category: 't2'
            }, {
                category: 't3'
            }];
            tracklist.induceCategoryOrder(tracks, 't1,t2,t3')


            expect(tracks).toEqual([{
                category: 't1'
            }, {
                category: 't2'
            }, {
                category: 't3'
            }]);
        });
    });
});

