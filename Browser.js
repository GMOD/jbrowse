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
    gv.addTrack(new ImageTrack("Gene_Image", "Gene Image", refSeq, 1000, 
                               [
                                {basesPerTile: 100, height: 68, urlPrefix: "tiles/3R/Genes/100bp/"},
                                {basesPerTile: 200, height: 64, urlPrefix: "tiles/3R/Genes/200bp/"},
                                {basesPerTile: 500, height: 68, urlPrefix: "tiles/3R/Genes/500bp/"},
                                {basesPerTile: 1000, height: 68, urlPrefix: "tiles/3R/Genes/1kbp/"},
                                {basesPerTile: 2000, height: 68, urlPrefix: "tiles/3R/Genes/2kbp/"},
                                {basesPerTile: 5000, height: 68, urlPrefix: "tiles/3R/Genes/5kbp/"},
                                {basesPerTile: 10000, height: 80, urlPrefix: "tiles/3R/Genes/10kbp/"},
                                {basesPerTile: 20000, height: 100, urlPrefix: "tiles/3R/Genes/20kbp/"},
                                {basesPerTile: 50000, height: 140, urlPrefix: "tiles/3R/Genes/50kbp/"},
                                {basesPerTile: 100000, height: 180, urlPrefix: "tiles/3R/Genes/100kbp/"},
                                {basesPerTile: 200000, height: 240, urlPrefix: "tiles/3R/Genes/200kbp/"},
                                {basesPerTile: 500000, height: 47, urlPrefix: "tiles/3R/Genes/500kbp/"},
                                {basesPerTile: 1000000, height: 55, urlPrefix: "tiles/3R/Genes/1Mbp/"},
                                {basesPerTile: 2000000, height: 71, urlPrefix: "tiles/3R/Genes/2Mbp/"},
                                {basesPerTile: 5000000, height: 208.5, urlPrefix: "tiles/3R/Genes/5Mbp/"},
                                {basesPerTile: 10000000, height: 208.5, urlPrefix: "tiles/3R/Genes/10Mbp/"}
                                ]));
    var trackSuccess = function(o) {
        //try {
            var startTime = new Date().getTime();
            //var featArray = eval(o.responseText);
	    var trackInfo = eval(o.responseText);
            var track = new SimpleFeatureTrack(trackInfo,
                                               o.argument.className,
                                               refSeq, 
                                               4 * (trackInfo.featureCount 
                                                    / refSeq.length()),
                                               //100, //turn off labels
                                               50 * (trackInfo.featureCount 
                                                     / refSeq.length()),
                                               5);
            gv.addTrack(track);

            YAHOO.log((new Date().getTime() - startTime) / 1000);
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
