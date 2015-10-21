define(['dojo/Deferred'],
       function(Deferred) {

function FastaParser() {
};

FastaParser.prototype.parseFile = function(fastaFile) {
    var d = new Deferred()
    var fr = new FileReader()
    fr.onload = dojo.hitch (this, function(e) {
	var fastaString = e.target.result
	if (!(fastaString && fastaString.length))
	    d.reject ("Could not read file: " + fastaFile.name)
	else {
	    var data = this.parseString (e.target.result)
	    if (!data.length)
		d.reject ("File contained no (FASTA) sequences: " + fastaFile.name)
	    else
		d.resolve (data)
	}
    })
    fr.readAsText(fastaFile)
    return d
};

FastaParser.prototype.parseString = function(fastaString) {
    
    var data = [];
    var addSeq = function (s) {
	if ("name" in s && s.seq.length)  // ignore empty sequences
	    data.push (s)
    }
    var current = { seq: "" };
    var lines = fastaString.match(/^.*((\r\n|\n|\r)|$)/gm); // this is wasteful, maybe try to avoid storing split lines separately later

    for (var i = 0; i < lines.length; i++) {

	var m
	if (m = /^>(\S*)/.exec(lines[i])) {
	    addSeq (current)
	    current = { seq: "" }
	    if (m[1].length)
		current.name = m[1]
	} else if (m = /^\s*(\S+)\s*$/.exec(lines[i])) {
	    current.seq += m[1]
	}
    }
    addSeq (current)

    return data
};

return FastaParser;

});
