var Browser = {};
Browser.init = function() {
    var viewElem = $("dragWindow");
    var gv = new GenomeView(viewElem, 250, 0, 27905053, 1/50);
    viewElem.genomeView = gv;
    var numTracks = 4;
    var addTrack = function() {
        new Ajax.Request("gene.json", {
            method: 'get',
            onSuccess: function(transport) {
                try {
                    var startTime = new Date().getTime();
                    var featArray = eval(transport.responseText);
                    gv.addTrack(new SimpleFeatureTrack("gene" + numTracks,
                                                       featArray,
                                                       "feature", 11));
                    $('profTime').appendChild(document.createTextNode(" " + (new Date().getTime() - startTime) / 1000));
                } catch (e) {
                    alert(Object.toJSON(e)); 
                }
            }
        });
        new Ajax.Request("exon.json", {
            method: 'get',
            onSuccess: function(transport) {
                try {
                    var startTime = new Date().getTime();
                    var featArray = eval(transport.responseText);
                    gv.addTrack(new SimpleFeatureTrack("exon" + numTracks,
                                                       featArray,
                                                       "exon", 9));
                    $('profTime').appendChild(document.createTextNode(" " + (new Date().getTime() - startTime) / 1000));
                    if (--numTracks) setTimeout(addTrack, 0);
                } catch (e) {
                    alert(Object.toJSON(e)); 
                }
            }
        });
    }
    setTimeout(addTrack, 0);
}
