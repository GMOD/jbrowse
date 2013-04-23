require(['JBrowse/Store/SeqFeature/GFF3/GFF3Parser','JBrowse/Store/SeqFeature/GFF3'],function( GFF3Parser, GFF3Store ) {
	// now GFF3Store is the GFF3 store class (actually just an object that 
	// you use for prototype inheritance, since javascript does not
	// actually have classes)

	var gparser, store;
	var makerGff3String;
	var makerGff3String2;
	var parsedGFF3toJbrowseJsonInput;
	var actualJbrowseJsonOutput;
	var actualJbrowseJsonOutput2;

	describe('GFF3 file inloading - turning parsed GFF3 into jbrowse json', function() {
		
		beforeEach(function() {
			// instantiate a store with some mocked-up stuff to keep it happy
			store = new GFF3Store({ browser: {}, blob: { url: 'fake' }});
			
			makerGff3String = "Group1.33	maker	gene	245454	247006	.	+	.	ID=this_parent_id_12345;Name=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;\nGroup1.33	maker	mRNA	245454	247006	.	+	.	ID=1:gnomon_566853_mRNA;Parent=this_parent_id_12345;Name=gnomon_566853_mRNA;_AED=0.45;_eAED=0.45;_QI=138|1|1|1|1|1|4|191|259;\nGroup1.33	maker	exon	245454	245533	.	+	.	ID=1:gnomon_566853_mRNA:exon:5976;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	exon	245702	245879	.	+	.	ID=1:gnomon_566853_mRNA:exon:5977;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	exon	246046	246278	.	+	.	ID=1:gnomon_566853_mRNA:exon:5978;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	exon	246389	247006	.	+	.	ID=1:gnomon_566853_mRNA:exon:5979;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	five_prime_UTR	245454	245533	.	+	.	ID=1:gnomon_566853_mRNA:five_prime_utr;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	five_prime_UTR	245702	245759	.	+	.	ID=1:gnomon_566853_mRNA:five_prime_utr;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	CDS	245760	245879	.	+	0	ID=1:gnomon_566853_mRNA:cds;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	CDS	246046	246278	.	+	0	ID=1:gnomon_566853_mRNA:cds;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	CDS	246389	246815	.	+	1	ID=1:gnomon_566853_mRNA:cds;Parent=1:gnomon_566853_mRNA;\nGroup1.33	maker	three_prime_UTR	246816	247006	.	+	.	ID=1:gnomon_566853_mRNA:three_prime_utr;Parent=1:gnomon_566853_mRNA;\n";
			
			makerGff3String2 = "Group1.33	maker	gene	245454	247006	.	+	.	ID=this_parent_id_12345;Name=maker-Group1%2E33-pred_gff_GNOMON-gene-4.137;\nGroup1.33	maker	mRNA	245454	247006	.	+	.	ID=mRNA_1;Parent=this_parent_id_12345;Name=mRNA_1;\nGroup1.33	maker	CDS	245760	245879	.	+	0	ID=cds_1.1;Parent=mRNA_1;\nGroup1.33	maker	CDS	246046	246278	.	+	0	ID=cds_1.2;Parent=mRNA_1;\nGroup1.33	maker	CDS	246389	246815	.	+	1	ID=cds_1.3;Parent=mRNA_1;\nGroup1.33	maker	mRNA	245454	247006	.	+	.	ID=mRNA_2;Parent=this_parent_id_12345;Name=mRNA_2;\nGroup1.33	maker	CDS	245760	245879	.	+	0	ID=cds_2.1;Parent=mRNA_2;\nGroup1.33	maker	CDS	246046	246278	.	+	0	ID=cds_2.2;Parent=mRNA_2;\nGroup1.33	maker	CDS	246389	246815	.	+	1	ID=cds_2.3;Parent=mRNA_2;\n";
			
			gparser = new GFF3Parser();
			parsedGFF3toJbrowseJsonInput = gparser.parse( makerGff3String );
			actualJbrowseJsonOutput = store._gff3toJbrowseJson( parsedGFF3toJbrowseJsonInput );
		    });
		
		it("should respond to _gff3toJbrowseJson", function() {
			expect(store._gff3toJbrowseJson).toBeDefined();
		    });

		it("should correctly set histograms/stats/meta in jbrowse json", function() {
			expect(actualJbrowseJsonOutput["trackInfo"]["histograms"]).toEqual({"stats" : [ {"basesPerBin" : "1000000","max" : 1,"mean" : 1} ],"meta" : [ { "basesPerBin" : "1000000", "arrayParams" : { "length" : 1, "chunkSize" : 10000, "urlTemplate" : "hist-1000000-{Chunk}.json"}}]});
		    });

		it("should correctly set featureCount in jbrowse json", function() {
			expect(actualJbrowseJsonOutput["trackInfo"]["featureCount"]).toEqual(1);
		    });

		it("should correctly set ['trackInfo']['intervals']['nclist'] in jbrowse json", function() {
			expect(actualJbrowseJsonOutput["featArray"]).toEqual(
				     [ [ 0, 245453, 247006, '+', 'maker', '.', 'mRNA', '.', '1:gnomon_566853_mRNA', 'gnomon_566853_mRNA', [ [ 1, 245453, 245533, '+', 'maker', '.', 'exon', '.', '1:gnomon_566853_mRNA:exon:5976', null ], [ 1, 245701, 245879, '+', 'maker', '.', 'exon', '.', '1:gnomon_566853_mRNA:exon:5977', null ], [ 1, 246045, 246278, '+', 'maker', '.', 'exon', '.', '1:gnomon_566853_mRNA:exon:5978', null ], [ 1, 246388, 247006, '+', 'maker', '.', 'exon', '.', '1:gnomon_566853_mRNA:exon:5979', null ], [ 1, 245701, 245759, '+', 'maker', '.', 'five_prime_UTR', '.', '1:gnomon_566853_mRNA:five_prime_utr', null ], [ 1, 246388, 246815, '+', 'maker', '1', 'CDS', '.', '1:gnomon_566853_mRNA:cds', null ], [ 1, 246815, 247006, '+', 'maker', '.', 'three_prime_UTR', '.', '1:gnomon_566853_mRNA:three_prime_utr', null ] ] ] ] 
									     );
		    });

		it("should correctly set ['trackInfo']['intervals']['classes'] in jbrowse json", function() {
			expect(actualJbrowseJsonOutput['trackInfo']["intervals"]["classes"]).toEqual(
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
		
		it("should correctly set ['trackInfo']['intervals']['lazyClass'] in jbrowse json", function() {
			expect(actualJbrowseJsonOutput['trackInfo']["intervals"]["lazyClass"]).toEqual(2)
			    });
		
		it("should correctly set ['trackInfo']['intervals']['urlTemplate'] in jbrowse json", function() {
			expect(actualJbrowseJsonOutput['trackInfo']["intervals"]["urlTemplate"]).toEqual("lf-{Chunk}.json");
		    });

		it("_getFeaturesAtGivenDepth should correctly retrieve two level features from parsed gene GFF3", function() {
			var twoLevelFeat = store._getFeaturesAtGivenDepth( parsedGFF3toJbrowseJsonInput["parsedData"][0], 2 );
			expect(twoLevelFeat).toNotEqual(null);
			expect(twoLevelFeat).toEqual(
						     [ { ID : '1:gnomon_566853_mRNA', data : [ { rawdata : [ 'Group1.33', 'maker', 'mRNA', '245454', '247006', '.', '+', '.', 'ID=1:gnomon_566853_mRNA;Parent=this_parent_id_12345;Name=gnomon_566853_mRNA;_AED=0.45;_eAED=0.45;_QI=138|1|1|1|1|1|4|191|259;' ], attributes : { ID : [ '1:gnomon_566853_mRNA' ], Parent : [ 'this_parent_id_12345' ], Name : [ 'gnomon_566853_mRNA' ], _AED : [ '0.45' ], _eAED : [ '0.45' ], _QI : [ '138|1|1|1|1|1|4|191|259' ] } } ], children : [ { ID : '1:gnomon_566853_mRNA:exon:5976', data : [ { rawdata : [ 'Group1.33', 'maker', 'exon', '245454', '245533', '.', '+', '.', 'ID=1:gnomon_566853_mRNA:exon:5976;Parent=1:gnomon_566853_mRNA;' ], attributes : { ID : [ '1:gnomon_566853_mRNA:exon:5976' ], Parent : [ '1:gnomon_566853_mRNA' ] } } ], children : [ ] }, { ID : '1:gnomon_566853_mRNA:exon:5977', data : [ { rawdata : [ 'Group1.33', 'maker', 'exon', '245702', '245879', '.', '+', '.', 'ID=1:gnomon_566853_mRNA:exon:5977;Parent=1:gnomon_566853_mRNA;' ], attributes : { ID : [ '1:gnomon_566853_mRNA:exon:5977' ], Parent : [ '1:gnomon_566853_mRNA' ] } } ], children : [ ] }, { ID : '1:gnomon_566853_mRNA:exon:5978', data : [ { rawdata : [ 'Group1.33', 'maker', 'exon', '246046', '246278', '.', '+', '.', 'ID=1:gnomon_566853_mRNA:exon:5978;Parent=1:gnomon_566853_mRNA;' ], attributes : { ID : [ '1:gnomon_566853_mRNA:exon:5978' ], Parent : [ '1:gnomon_566853_mRNA' ] } } ], children : [ ] }, { ID : '1:gnomon_566853_mRNA:exon:5979', data : [ { rawdata : [ 'Group1.33', 'maker', 'exon', '246389', '247006', '.', '+', '.', 'ID=1:gnomon_566853_mRNA:exon:5979;Parent=1:gnomon_566853_mRNA;' ], attributes : { ID : [ '1:gnomon_566853_mRNA:exon:5979' ], Parent : [ '1:gnomon_566853_mRNA' ] } } ], children : [ ] }, { ID : '1:gnomon_566853_mRNA:five_prime_utr', data : [ { rawdata : [ 'Group1.33', 'maker', 'five_prime_UTR', '245702', '245759', '.', '+', '.', 'ID=1:gnomon_566853_mRNA:five_prime_utr;Parent=1:gnomon_566853_mRNA;' ], attributes : { ID : [ '1:gnomon_566853_mRNA:five_prime_utr' ], Parent : [ '1:gnomon_566853_mRNA' ] } }, { rawdata : [ 'Group1.33', 'maker', 'five_prime_UTR', '245702', '245759', '.', '+', '.', 'ID=1:gnomon_566853_mRNA:five_prime_utr;Parent=1:gnomon_566853_mRNA;' ], attributes : { ID : [ '1:gnomon_566853_mRNA:five_prime_utr' ], Parent : [ '1:gnomon_566853_mRNA' ] } } ], children : [ ] }, { ID : '1:gnomon_566853_mRNA:cds', data : [ { rawdata : [ 'Group1.33', 'maker', 'CDS', '246389', '246815', '.', '+', '1', 'ID=1:gnomon_566853_mRNA:cds;Parent=1:gnomon_566853_mRNA;' ], attributes : { ID : [ '1:gnomon_566853_mRNA:cds' ], Parent : [ '1:gnomon_566853_mRNA' ] } }, { rawdata : [ 'Group1.33', 'maker', 'CDS', '246389', '246815', '.', '+', '1', 'ID=1:gnomon_566853_mRNA:cds;Parent=1:gnomon_566853_mRNA;' ], attributes : { ID : [ '1:gnomon_566853_mRNA:cds' ], Parent : [ '1:gnomon_566853_mRNA' ] } }, { rawdata : [ 'Group1.33', 'maker', 'CDS', '246389', '246815', '.', '+', '1', 'ID=1:gnomon_566853_mRNA:cds;Parent=1:gnomon_566853_mRNA;' ], attributes : { ID : [ '1:gnomon_566853_mRNA:cds' ], Parent : [ '1:gnomon_566853_mRNA' ] } }, { rawdata : [ 'Group1.33', 'maker', 'CDS', '246389', '246815', '.', '+', '1', 'ID=1:gnomon_566853_mRNA:cds;Parent=1:gnomon_566853_mRNA;' ], attributes : { ID : [ '1:gnomon_566853_mRNA:cds' ], Parent : [ '1:gnomon_566853_mRNA' ] } } ], children : [ ] }, { ID : '1:gnomon_566853_mRNA:three_prime_utr', data : [ { rawdata : [ 'Group1.33', 'maker', 'three_prime_UTR', '246816', '247006', '.', '+', '.', 'ID=1:gnomon_566853_mRNA:three_prime_utr;Parent=1:gnomon_566853_mRNA;' ], attributes : { ID : [ '1:gnomon_566853_mRNA:three_prime_utr' ], Parent : [ '1:gnomon_566853_mRNA' ] } } ], children : [ ] } ] } ]
						     )
			    });

		it("_getFeaturesAtGivenDepth should correctly retrieve two level features from parsed gene GFF3 with two mRNAs", function() {
			parsedGFF3toJbrowseJsonInput2 = gparser.parse( makerGff3String2 );
			var twoLevelFeat = store._getFeaturesAtGivenDepth( parsedGFF3toJbrowseJsonInput2["parsedData"][0], 2 );
			expect(twoLevelFeat).toNotEqual(null);
			expect(twoLevelFeat).toEqual(
						     [ 
						      { ID : 'mRNA_1', data : [ { rawdata : [ 'Group1.33', 'maker', 'mRNA', '245454', '247006', '.', '+', '.', 'ID=mRNA_1;Parent=this_parent_id_12345;Name=mRNA_1;' ], attributes : { ID : [ 'mRNA_1' ], Parent : [ 'this_parent_id_12345' ], Name : [ 'mRNA_1' ] } } ], children : [ { ID : 'cds_1.1', data : [ { rawdata : [ 'Group1.33', 'maker', 'CDS', '245760', '245879', '.', '+', '0', 'ID=cds_1.1;Parent=mRNA_1;' ], attributes : { ID : [ 'cds_1.1' ], Parent : [ 'mRNA_1' ] } } ], children : [ ] }, { ID : 'cds_1.2', data : [ { rawdata : [ 'Group1.33', 'maker', 'CDS', '246046', '246278', '.', '+', '0', 'ID=cds_1.2;Parent=mRNA_1;' ], attributes : { ID : [ 'cds_1.2' ], Parent : [ 'mRNA_1' ] } } ], children : [ ] }, { ID : 'cds_1.3', data : [ { rawdata : [ 'Group1.33', 'maker', 'CDS', '246389', '246815', '.', '+', '1', 'ID=cds_1.3;Parent=mRNA_1;' ], attributes : { ID : [ 'cds_1.3' ], Parent : [ 'mRNA_1' ] } } ], children : [ ] } ] }, 
						      { ID : 'mRNA_2', data : [ { rawdata : [ 'Group1.33', 'maker', 'mRNA', '245454', '247006', '.', '+', '.', 'ID=mRNA_2;Parent=this_parent_id_12345;Name=mRNA_2;' ], attributes : { ID : [ 'mRNA_2' ], Parent : [ 'this_parent_id_12345' ], Name : [ 'mRNA_2' ] } } ], children : [ { ID : 'cds_2.1', data : [ { rawdata : [ 'Group1.33', 'maker', 'CDS', '245760', '245879', '.', '+', '0', 'ID=cds_2.1;Parent=mRNA_2;' ], attributes : { ID : [ 'cds_2.1' ], Parent : [ 'mRNA_2' ] } } ], children : [ ] }, { ID : 'cds_2.2', data : [ { rawdata : [ 'Group1.33', 'maker', 'CDS', '246046', '246278', '.', '+', '0', 'ID=cds_2.2;Parent=mRNA_2;' ], attributes : { ID : [ 'cds_2.2' ], Parent : [ 'mRNA_2' ] } } ], children : [ ] }, { ID : 'cds_2.3', data : [ { rawdata : [ 'Group1.33', 'maker', 'CDS', '246389', '246815', '.', '+', '1', 'ID=cds_2.3;Parent=mRNA_2;' ], attributes : { ID : [ 'cds_2.3' ], Parent : [ 'mRNA_2' ] } } ], children : [ ] } ] }, 
						       ] 
						     )
			    });

		it("_gff3toJbrowseJson should correctly retrieve two level features from parsed gene GFF3 with two mRNAs", function() {
			parsedGFF3toJbrowseJsonInput2 = gparser.parse( makerGff3String2 );
			var twoLevelFeat = store._gff3toJbrowseJson( parsedGFF3toJbrowseJsonInput2 );
			expect(twoLevelFeat["featArray"].length).toEqual(2);
			expect(twoLevelFeat["featArray"]).toEqual(
					  [ 
					   [ 0, 245453, 247006, '+', 'maker', '.', 'mRNA', '.', 'mRNA_1', 'mRNA_1', [ [ 1, 245759, 245879, '+', 'maker', '0', 'CDS', '.', 'cds_1.1', null ], [ 1, 246045, 246278, '+', 'maker', '0', 'CDS', '.', 'cds_1.2', null ], [ 1, 246388, 246815, '+', 'maker', '1', 'CDS', '.', 'cds_1.3', null ] ] ], 
					   [ 0, 245453, 247006, '+', 'maker', '.', 'mRNA', '.', 'mRNA_2', 'mRNA_2', [ [ 1, 245759, 245879, '+', 'maker', '0', 'CDS', '.', 'cds_2.1', null ], [ 1, 246045, 246278, '+', 'maker', '0', 'CDS', '.', 'cds_2.2', null ], [ 1, 246388, 246815, '+', 'maker', '1', 'CDS', '.', 'cds_2.3', null ] ] ] 
					    ]);
		    });
		
	    });
	
    });

