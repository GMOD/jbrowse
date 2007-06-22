var Browser = {};
Browser.init = function() {
    var viewElem = $("dragWindow");
    //var refSeq = {start: 0, end: 27905053, length: function() {return this.end - this.start}};
    var refSeq = {start: -224036, end: 27905053, length: function() {return this.end - this.start}};
    var gv = new GenomeView(viewElem, 250, refSeq.start, refSeq.end, 1/50);
    viewElem.genomeView = gv;
    var trackNum = 0;
    gv.showWait();
    var addTrack = function() {
        var track = trackList[trackNum++];
        new Ajax.Request(track.url, {
            method: 'get',
            onSuccess: function(transport) {
                try {
                    var startTime = new Date().getTime();
                    var featArray = eval(transport.responseText);
                    gv.addTrack(new SimpleFeatureTrack(track.label,
                                                       featArray,
                                                       track.class,
                                                       track.height, undefined,
						       4 * (featArray.length / refSeq.length())));
                    $('profTime').appendChild(document.createTextNode(" " + (new Date().getTime() - startTime) / 1000));
                    if (trackNum < trackList.length)
                        setTimeout(addTrack, 0);
                    else
                        gv.showDone();
                } catch (e) {
                    alert(Object.toJSON(e)); 
                }
            }
        });
    }
    setTimeout(addTrack, 0);
}
