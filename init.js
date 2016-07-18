var rotunda

require(
    ["dojo/request/xhr",
     "dojo/Deferred",
     "Rotunda/Rotunda",
     "Rotunda/View/Track/Arc",
     "Rotunda/View/Track/Text",
     "Rotunda/View/Track/Histogram",
     "Rotunda/View/Track/Link",
     "Rotunda/View/Track/Ruler",
     "Rotunda/util",
     "dojo/domReady!"],

    function(xhr,
             Deferred,
             Rotunda,
	     ArcTrack,
	     TextTrack,
	     HistogramTrack,
	     LinkTrack,
	     RulerTrack,
             util) {
        
        var refSeqNameLen = [
            ["chr1", 249250621],
            ["chr2", 243199373],
            ["chr3", 198022430],
            ["chr4", 191154276],
            ["chr5", 180915260],
            ["chr6", 171115067],
            ["chr7", 159138663],
            ["chr8", 146364022],
            ["chr9", 141213431],
            ["chr10", 135534747],
            ["chr11", 135006516],
            ["chr12", 133851895],
            ["chr13", 115169878],
            ["chr14", 107349540],
            ["chr15", 102531392],
            ["chr16", 90354753],
            ["chr17", 81195210],
            ["chr18", 78077248],
            ["chr19", 59128983],
            ["chr20", 63025520],
            ["chr21", 48129895],
            ["chr22", 51304566],
            ["chrX", 155270560],
            ["chrY", 59373566]
        ]

        var refSeqName = refSeqNameLen.map (function (nl) { return nl[0] })
        var refSeqLen = refSeqNameLen.map (function (nl) { return nl[1] })
        var isRefSeqName = util.listToCounts (refSeqName)
        
        var refSeqFeatures = refSeqNameLen.map (function (nl) {
            return { seq: nl[0],
                     start: 0,
                     end: nl[1],
                     id: nl[0],
                     type: nl[0] }
        })

        var refSeqTrack = new ArcTrack ({ id: "ref_seqs",
					  label: "Chromosomes",
					  features: refSeqFeatures })

	var rulerTrack = new RulerTrack ({ id: "ruler",
					   label: "Ruler",
					   displayedName: function (refSeqName) {
					       return refSeqName.replace("chr","")
					   }
					 })

        var cytoTrack, segDupTrack100kb, segDupTrack200kb, gcTrack

        var nonempty_regex = /\S/

        xhr("cytoBand.txt", {
            handleAs: "text"
        }).then (function (cytoBandTxt) {
            
            var cytoFeatures = cytoBandTxt
                .split("\n")
                .filter (function (line) { return line.match (nonempty_regex) })
                .map (function (line) { return line.split("\t") })
                .map (function (fields) {
                    return { seq: fields[0],
                             start: fields[1],
                             end: fields[2],
                             id: fields[3],
                             type: fields[4] }
                })

            console.log (cytoFeatures.length + " cytogenetic bands")

            cytoTrack = new ArcTrack ({ id: "cyto_bands",
					label: "Cytogenetic bands",
					features: cytoFeatures })

            return xhr ("GRCh37GenomicSuperDup.links", {
                handleAs: "text"
            })
            
        }).then (function (segDupTxt) {

	    function segDupFilter (minSegDupSize, maxSegDupSize) {
		return function (link) {
		    var dupSize = link.end - link.start
		    if (maxSegDupSize && dupSize >= maxSegDupSize)
			return false
		    return dupSize >= minSegDupSize
		}
	    }

            var segDup = segDupTxt
                .split("\n")
                .filter (function (line) { return line.match (nonempty_regex) })
                .map (function (line) { return line.split("\t") })
                .map (function (fields) {
                    return { seq: fields[0],
                             start: fields[1],
                             end: fields[2],
                             otherSeq: fields[3],
                             otherStart: fields[4],
                             otherEnd: fields[5] }
                })
                .filter (function (link) {
                    return isRefSeqName[link.seq] && isRefSeqName[link.otherSeq]
                })
		

	    var segDup100kb = segDup.filter (segDupFilter (1e5, 2e5))
            console.log (segDup100kb.length + " segmental duplications of size 100kb-200kb")
            
            segDupTrack100kb = new LinkTrack ({ id: "segdup100k",
						label: "Segmental duplications 100-200kb",
						color: function() { return 'blue' },
						highlightColor: function() { return 'red' },
						features: segDup100kb })

	    var segDup200kb = segDup.filter (segDupFilter (2e5))
            console.log (segDup200kb.length + " segmental duplications of size >= 200kb")

            segDupTrack200kb = new LinkTrack ({ id: "segdup200kb",
					      label: "Segmental duplications >200kb",
					      color: function() { return 'cyan' },
					      highlightColor: function() { return 'red' },
					      features: segDup200kb })

	    

            return xhr ("hg19.gc10Mb.txt", {
                handleAs: "text"
            })
            
        }).then (function (gcTxt) {

            var gcFeatures = gcTxt
                .split("\n")
                .filter (function (line) { return line.match (nonempty_regex) })
                .map (function (line) { return line.split(" ") })
                .map (function (fields) {
                    return { seq: fields[0],
                             start: fields[1],
                             end: fields[2],
                             value: parseFloat (fields[3]) }
                })

            gcTrack = new HistogramTrack ({ id: "gc_hist",
					    label: "GC content",
					    radius: 30,
					    units: "%",
					    features: gcFeatures })

            console.log (gcFeatures.length + " GC-content regions")

            rotunda = new Rotunda( { refSeqName: refSeqName,
                                     refSeqLen: refSeqLen,
                                     tracks: [ rulerTrack,
                                               refSeqTrack,
                                               cytoTrack,
                                               gcTrack,
                                               segDupTrack200kb,
					       segDupTrack100kb] })
        })
    })
