var Browser = {};
Browser.init = function(elemId) {
    var viewElem = $(elemId);
    //var refSeq = {start: 0, end: 27905053, length: function() {return this.end - this.start}};
    var refSeq = {start: -224036, end: 27905053, length: function() {return this.end - this.start}};
    var gv = new GenomeView(viewElem, 250, refSeq.start, refSeq.end, 1/50);
    gv.setY(0);
    viewElem.view = gv;
    var trackNum = 0;
    gv.showWait();
    var trackSuccess = function(o) {
        //try {
            var startTime = new Date().getTime();
            var featArray = eval(o.responseText);
            gv.addTrack(o.argument.label,
                        featArray,
                        o.argument.className,
                        o.argument.height, undefined,
                        4 * (featArray.length / refSeq.length()));
            $('profTime').appendChild(document.createTextNode(" " + (new Date().getTime() - startTime) / 1000));
            if (trackNum < trackList.length)
                setTimeout(addTrack, 0);
            else
                gv.showDone();
            //} catch (e) {
            //alert(Util.stringify(e)); 
            //}
    };

    var addTrack = function() {
        var track = trackList[trackNum++];
        YAHOO.util.Connect.asyncRequest("GET", track.url, {success: trackSuccess, argument: track});
    }
    setTimeout(addTrack, 0);
}
