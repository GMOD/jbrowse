describe("GFF3toJbrowseJson", function() { 
	// GFF3toNclist takes a data structure such as that returned by GFF3toJson.js 
	// and makes it into an nested containment list suitable for use in 
	// WebApollo and possibly Jbrowse. 

	var nclistGen;
	var parsedGFF3toJbrowseJsonInput, expectedJbrowseJsonOutput, actualJbrowseJsonOutput;
	var gp;

	beforeEach(function() {
		gp = new GFF3Parser;
		nclistGen = new GFF3toJbrowseJson();
		makerGff3String = "Group1.33	maker	gene	245454	247006	.	+	.	ID=this_parent_id_12345;Name=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;\nGroup1.33	maker	mRNA	245454	247006	.	+	.	ID=1:gnomon_566853_mRNA;Parent=this_parent_id_12345;Name=gnomon_566853_mRNA;_AED=0.45;_eAED=0.45;_QI=138|1|1|1|1|1|4|191|259;\nGroup1.33	maker	exon	245454	245533	.	+	.	ID=1:gnomon_566853_mRNA:exon:5976;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	exon	245702	245879	.	+	.	ID=1:gnomon_566853_mRNA:exon:5977;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	exon	246046	246278	.	+	.	ID=1:gnomon_566853_mRNA:exon:5978;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	exon	246389	247006	.	+	.	ID=1:gnomon_566853_mRNA:exon:5979;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	five_prime_UTR	245454	245533	.	+	.	ID=1:gnomon_566853_mRNA:five_prime_utr;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	five_prime_UTR	245702	245759	.	+	.	ID=1:gnomon_566853_mRNA:five_prime_utr;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	CDS	245760	245879	.	+	0	ID=1:gnomon_566853_mRNA:cds;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	CDS	246046	246278	.	+	0	ID=1:gnomon_566853_mRNA:cds;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	CDS	246389	246815	.	+	1	ID=1:gnomon_566853_mRNA:cds;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	three_prime_UTR	246816	247006	.	+	.	ID=1:gnomon_566853_mRNA:three_prime_utr;Parent=1:gnomon_566853_mRNA;\n";

		// fixtures to test making jbrowse json from parsed GFF3
		expectedJbrowseJsonOutput = { // just putting this here for reference, I'm going to check most items in this struct manually below
			"histograms" : {
			    "stats" : [ {
				    "basesPerBin" : "1000000",
				    "max" : 1,
				    "mean" : 1
				} ],
			    "meta" : [ {
				    "basesPerBin" : "1000000",
				    "arrayParams" : {
					"length" : 1,
					"chunkSize" : 10000,
					"urlTemplate" : "hist-1000000-{Chunk}.json"
				    }
				} ]
			},
			"featureCount" : 1,
			"intervals" : {
			    "nclist" : [ 
					[ 0, 0, 14, -1, "maker", null, "mRNA", null, "x0", "x0", 
					  [ [ 1, 0, 3, -1, null, null, "exon", null, "p0", "p0", null ], 
					    [ 1, 6, 9, -1, null, null, "exon", null, null, null, null ], 
					    [ 1, 12, 14, -1, null, null, "exon", null, null, null, null ], 
					    [ 1, 0, 14, -1, null, null, "wholeCDS", null, null, null, null ] 
					    ] ]
					 ],
			    "classes" : [ {
				    "isArrayAttr" : {
					"Subfeatures" : 1
				    },
				    "attributes" : [ "Start", "End", "Strand", "Source", "Phase", "Type", "Score", "Id", "Name", "Subfeatures" ]
				}, {
				    "isArrayAttr" : {
				    },
				    "attributes" : [ "Start", "End", "Strand", "Source", "Phase", "Type", "Score", "Id", "Name", "Subfeatures" ]
				}, {
				    "isArrayAttr" : {
					"Sublist" : 1
				    },
				    "attributes" : [ "Start", "End", "Chunk" ]
				} ],
			    "maxEnd" : 247006,
			    "count" : 1,
			    "lazyClass" : 2,
			    "urlTemplate" : "lf-{Chunk}.json",
			    "minStart" : 245453
			},
			"formatVersion" : 1
		    };

		parsedGFF3toJbrowseJsonInput = gp.parse( makerGff3String );
		actualJbrowseJsonOutput = nclistGen.gff3toJbrowseJson(parsedGFF3toJbrowseJsonInput); 

	    });
	
	xit("should respond to gff3toJbrowseJson", function() {
		expect(nclistGen.gff3toJbrowseJson).toBeDefined();
	    });

	xit("should correctly set histograms/stats/meta in jbrowse json", function() {
		expect(actualJbrowseJsonOutput["histograms"]).toEqual({"stats" : [ {"basesPerBin" : "1000000","max" : 1,"mean" : 1} ],"meta" : [ { "basesPerBin" : "1000000", "arrayParams" : { "length" : 1, "chunkSize" : 10000, "urlTemplate" : "hist-1000000-{Chunk}.json"}}]});
	    });

	xit("should correctly set featureCount in jbrowse json", function() {
		expect(actualJbrowseJsonOutput["featureCount"]).toEqual(1);
	    });
	
        xit("should correctly set ['intervals']['nclist'] in jbrowse json", function() {
		expect(actualJbrowseJsonOutput["intervals"]["nclist"]).toEqual(
			       [0, 245454, 247006, "+", "maker", ".", "mRNA", ".", "1:gnomon_566853_mRNA", "gnomon_566853_mRNA", 
				[ [ 1, 0, 245454, 245533, "+", "maker", ".", "exon", ".", "1:gnomon_566853_mRNA:exon:5976", null],
				  [ 1, 0, 245702, 245879, "+", "maker", ".", "exon", ".", "1:gnomon_566853_mRNA:exon:5977", null] ] ]
									       );
	    });

	xit("should correctly set ['intervals']['classes'] in jbrowse json", function() {
		expect(actualJbrowseJsonOutput["intervals"]["classes"]).toEqual(
		   [ {
				    "isArrayAttr" : {
					"Subfeatures" : 1
				    },
				    "attributes" : [ "Start", "End", "Strand", "Source", "Phase", "Type", "Score", "Id", "Name", "Subfeatures" ]
				}, {
				    "isArrayAttr" : {
				    },
				    "attributes" : [ "Start", "End", "Strand", "Source", "Phase", "Type", "Score", "Id", "Name", "Subfeatures" ]
				}, {
				    "isArrayAttr" : {
					"Sublist" : 1
				    },
				    "attributes" : [ "Start", "End", "Chunk" ]
					} ]);

	    });

	xit("should correctly set ['intervals']['maxEnd'] in jbrowse json", function() {
		expect(actualJbrowseJsonOutput["intervals"]["maxEnd"]).toEqual( 245879 );
	    });
	xit("should correctly set ['intervals']['count'] in jbrowse json", function() {
		expect(actualJbrowseJsonOutput["intervals"]["count"]).toEqual( 1 )
    	    });

	xit("should correctly set ['intervals']['lazyClass'] in jbrowse json", function() {
		expect(actualJbrowseJsonOutput["intervals"]["lazyClass"]).toEqual(2)
		    });
	
	xit("should correctly set ['intervals']['urlTemplate'] in jbrowse json", function() {
		expect(actualJbrowseJsonOutput["intervals"]["urlTemplate"]).toEqual("lf-{Chunk}.json");
	    });
	
	xit("should correctly set ['intervals']['minStart'] in jbrowse json", function() {
		expect(actualJbrowseJsonOutput["intervals"]["minStart"]).toEqual( 245454 );
	    });
	
	xit("should correctly set formatVersion in jbrowse json", function() {
		expect(actualJbrowseJsonOutput["formatVersion"]).toEqual(1);
	    });

    });

