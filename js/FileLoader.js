
function FileLoader(parent_element, brow)  {
    var floader = this;
    this.brow = brow;
    this.initLoadDialog();
    $(parent_element).append("<div style=\"text-align:center;\"><button type=\"button\" id=\"fileLoadB\">Load Files</button></div>");
    $("#fileLoadB").click(function(event) { FileLoader.prototype.showLoadDialog.call(floader, event); } );
}

FileLoader.prototype.initLoadDialog = function() {
    this.loadDialog = new dijit.Dialog({title: "Load BAM File"});
    this.loadDialog.startup();
}

FileLoader.prototype.showLoadDialog = function(event) {
    console.log("called FileLoader.showLoadDialog");
    var mydialog = this.loadDialog;
    var floader = this;
    var content = document.createElement("div");
    $(content).append("<table>"
		      + "<tr><td><label>BAM File</label></td><td><input type=\"file\" id=\"bam_file\" name=\"bam_files[]\" ></input></td></tr>"
		      + "<tr><td><label>BAI File</label></td><td><input type=\"file\" id=\"bai_file\" name=\"bai_files[]\" ></input></td></tr>"
		      + "</table>");
    $(content).append("<div style=\"text-align:center\"><button id=\"file_load_ok\">OK</button><button id=\"file_load_cancel\">Cancel</button></div>");
    this.loadDialog.set("content", content);
    this.loadDialog.show();
    this.loadDialog.placeAt("GenomeBrowser", "first");
    $("#file_load_cancel").click(function()  { mydialog.hide() } );
    $("#file_load_ok").click(function()  { FileLoader.prototype.handleFileSelect.call(floader, event); } );
};

FileLoader.prototype.handleFileSelect = function(event)  {
    console.log("called FileLoader.handleFileSelect()");
    var bamfiles = $("#bam_file")[0].files;
    var baifiles = $("#bai_file")[0].files;
    if (bamfiles && baifiles && bamfiles.length > 0 && baifiles.length > 0) {
	console.log("bamfile:"); console.log(bamfiles);
	console.log("baifile:"); console.log(baifiles);
	var bamfile = bamfiles[0];
	var baifile = baifiles[0];
	this.loadBamFile(bamfile, baifile);
	this.loadDialog.hide();
    }
    else {
	alert("must specify both a BAM file and an BAI index file");
    }

};

FileLoader.prototype.loadBamFile = function(bamfile, baifile)  {  // bamfile and baifile are HTML5 File objects
    console.log("called FileLoader.loadBamFile()");
    var trackName = bamfile.name;
    var trackInfoEntry = 
      {
	  "type" : "BamFeatureTrack", 
	  "label" : trackName, 
	  "key" : trackName, 
	  "data_file" : bamfile, 
          "index_file" : baifile, 
          "autocomplete" : "none",
          "style" : {
              "className" : "bam",
              "subfeatureClasses" : {
	          "M": "cigarM", 
		  "D": "cigarD",
		  "N": "cigarN",
		  "=": "cigarEQ",
		  "E": "cigarEQ",
		  "X": "cigarX", 
		  "I": "cigarI"
              },
              "arrowheadClass" : null
          },
          "compress" : 0,
          "subfeatures" : 1
      };
    var gb = $("#GenomeBrowser").get(0).genomeBrowser;
    // gb.trackCreate(trackInfoEntry);
    gb.viewDndWidget.insertNodes(false, [trackInfoEntry]);
    gb.onVisibleTracksChanged();
};

