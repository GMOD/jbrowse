console.log("at top of SequenceSearch.js (outside of define)");

define( [
            'dojo/_base/declare',
            'jquery',
], 
	function( declare, $ ) {

	    console.log("in SequenceSearch returned function");

function SequenceSearch(contextPath) {
	this.contextPath = contextPath;
};

SequenceSearch.prototype.setRedirectCallback = function(callback) {
	this.redirectCallback = callback;
};

SequenceSearch.prototype.setErrorCallback = function(callback) {
	this.errorCallback = callback;
};

SequenceSearch.prototype.searchSequence = function(trackName, refSeqName, starts) {
    var operation = "search_sequence";
    var contextPath = this.contextPath;
    var redirectCallback = this.redirectCallback;
    var errorCallback = this.errorCallback;
    
    var content = dojo.create("div", { className: "search_sequence" });
    var sequenceToolsDiv = dojo.create("div", { className: "search_sequence_tools" }, content);
    var sequenceToolsSelect = dojo.create("select", { className: "search_sequence_tools_select" }, sequenceToolsDiv);
    var sequenceDiv = dojo.create("div", { className: "search_sequence_area" }, content);
    var sequenceLabel = dojo.create("div", { className: "search_sequence_label", innerHTML: "Enter sequence" }, sequenceDiv);
    var sequenceFieldDiv = dojo.create("div", { }, sequenceDiv);
    var sequenceField = dojo.create("textarea", { className: "search_sequence_input" }, sequenceFieldDiv);
    var searchAllRefSeqsDiv = dojo.create("div", { className: "search_all_ref_seqs_area" }, sequenceDiv);
    var searchAllRefSeqsCheckbox = dojo.create("input", { className: "search_all_ref_seqs_checkbox", type: "checkbox" }, searchAllRefSeqsDiv);
    var searchAllRefSeqsLabel = dojo.create("span", { className: "search_all_ref_seqs_label", innerHTML: "Search all genomic sequences" }, searchAllRefSeqsDiv);
    var sequenceButtonDiv = dojo.create("div", { }, sequenceDiv);
    var sequenceButton = dojo.create("button", { innerHTML: "Search" }, sequenceButtonDiv);
    var messageDiv = dojo.create("div", { className: "search_sequence_message", innerHTML: "No matches found" }, content);
    var waitingDiv = dojo.create("div", { innerHTML: "<img class='waiting_image' src='plugins/WebApollo/img/loading.gif' />"}, content);
    var headerDiv = dojo.create("div", { className: "search_sequence_matches_header" }, content);
    dojo.create("span", { innerHTML: "ID", className: "search_sequence_matches_header_field search_sequence_matches_generic_field" }, headerDiv);
    dojo.create("span", { innerHTML: "Start", className: "search_sequence_matches_header_field search_sequence_matches_generic_field" }, headerDiv);
    dojo.create("span", { innerHTML: "End", className: "search_sequence_matches_header_field search_sequence_matches_generic_field" }, headerDiv);
    dojo.create("span", { innerHTML: "Score", className: "search_sequence_matches_header_field search_sequence_matches_generic_field" }, headerDiv);
    dojo.create("span", { innerHTML: "Significance", className: "search_sequence_matches_header_field search_sequence_matches_generic_field" }, headerDiv);
    dojo.create("span", { innerHTML: "Identity", className: "search_sequence_matches_header_field search_sequence_matches_generic_field" }, headerDiv);
    var matchDiv = dojo.create("div", { className: "search_sequence_matches" }, content);
    var matches = dojo.create("div", { }, matchDiv);

    dojo.style(messageDiv, { display: "none" });
    dojo.style(matchDiv, { display: "none" });
    dojo.style(headerDiv, { display: "none" });
    dojo.style(waitingDiv, { display: "none" });
    if (!refSeqName) {
    	dojo.style(searchAllRefSeqsDiv, { display: "none" });
    }

    var getSequenceSearchTools = function() {
    	var ok = false;
    	var operation = "get_sequence_search_tools";
    	dojo.xhrPost( {
    		postData: '{ "track": "' + trackName + '", "operation": "' + operation + '" }', 
    		url: contextPath + "/AnnotationEditorService",
    		sync: true,
    		handleAs: "json",
    		timeout: 5000 * 1000, // Time in milliseconds
    		load: function(response, ioArgs) {
    			if (response.sequence_search_tools.length == 0) {
    				ok = false;
    				return;
    			}
    			for (var i = 0; i < response.sequence_search_tools.length; ++i) {
    				dojo.create("option", { innerHTML: response.sequence_search_tools[i] }, sequenceToolsSelect);
    			}
    			ok = true;
    		},
    		error: function(response, ioArgs) {
				errorCallback(response);
				return response;
    		}
    	});
    	return ok;
    };
    
    var search = function() {
    	var residues = dojo.attr(sequenceField, "value").toUpperCase();
    	var ok = true;
    	if (residues.length == 0) {
    		alert("No sequence entered");
    		ok = false;
    	}
    	else if (residues.match(/[^ACDEFGHIKLMNPQRSTVWXY\n]/)) {
    		alert("The sequence should only contain non redundant IUPAC nucleotide or amino acid codes (except for N/X)");
    		ok = false;
    	}
    	var searchAllRefSeqs = dojo.attr(searchAllRefSeqsCheckbox, "checked");
    	if (ok) {
    		dojo.style(waitingDiv, { display: "block"} );
    		dojo.style(matchDiv, { display: "none"} );
    	    dojo.style(headerDiv, { display: "none" });
    	    dojo.xhrPost( {
    			postData: '{ "track": "' + trackName + '", "search": { "key": "' + sequenceToolsSelect.value + '", "residues": "' + residues + (!searchAllRefSeqs && refSeqName != null ? '", "database_id": "' + refSeqName : '') + '"}, "operation": "' + operation + '" }', 
    			url: contextPath + "/AnnotationEditorService",
    			handleAs: "json",
    			timeout: 5000 * 1000, // Time in milliseconds
    			load: function(response, ioArgs) {
    				dojo.style(waitingDiv, { display: "none"} );
    				while (matches.hasChildNodes()) {
    					matches.removeChild(matches.lastChild);
    				}
    				if (response.matches.length == 0) {
    					dojo.style(messageDiv, { display: "block" });
    					dojo.style(matchDiv, { display: "none" });
    					dojo.style(headerDiv, { display: "none" });
    					return;
    				}
    				dojo.style(messageDiv, { display: "none" });
    				dojo.style(headerDiv, { display: "block"} );
    				dojo.style(matchDiv, { display: "block"} );
    				
    				var returnedMatches = response.matches;
    				returnedMatches.sort(function(match1, match2) {
    					return match2.rawscore - match1.rawscore;
    				});
    				var maxNumberOfHits = 100;
    				
    				for (var i = 0; i < returnedMatches.length && i < maxNumberOfHits; ++i) {
    					var match = returnedMatches[i];
    					var query = match.query;
    					var subject = match.subject;
    					var refSeqStart = starts[subject.feature.uniquename] || 0;
    					var refSeqEnd = starts[subject.feature.uniquename] || 0;
    					subject.location.fmin += refSeqStart;
    					subject.location.fmax += refSeqStart;
    					var subjectStart = subject.location.fmin + 1;
    					var subjectEnd = subject.location.fmax + 1;
    					if (subject.location.strand == -1) {
    						var tmp = subjectStart;
    						subjectStart = subjectEnd;
    						subjectEnd = tmp;
    					}
    					var rawscore = match.rawscore;
    					var significance = match.significance;
    					var identity = match.identity;
    					var row = dojo.create("div", { className: "search_sequence_matches_row" + (dojo.isFF ? " search_sequence_matches_row-firefox" : "") }, matches);
    					var subjectIdColumn = dojo.create("span", { innerHTML: subject.feature.uniquename, className: "search_sequence_matches_field search_sequence_matches_generic_field", title: subject.feature.uniquename }, row);
    					var subjectStartColumn = dojo.create("span", { innerHTML: subjectStart, className: "search_sequence_matches_field search_sequence_matches_generic_field" }, row);
    					var subjectEndColumn = dojo.create("span", { innerHTML: subjectEnd, className: "search_sequence_matches_field search_sequence_matches_generic_field" }, row);
    					var scoreColumn = dojo.create("span", { innerHTML: match.rawscore, className: "search_sequence_matches_field search_sequence_matches_generic_field" }, row);
    					var significanceColumn = dojo.create("span", { innerHTML: match.significance, className: "search_sequence_matches_field search_sequence_matches_generic_field" }, row);
    					var identityColumn = dojo.create("span", { innerHTML : match.identity, className: "search_sequence_matches_field search_sequence_matches_generic_field" }, row);
    					dojo.connect(row, "onclick", function(id, fmin, fmax) {
    						return function() {
    							redirectCallback(id, fmin, fmax);
    						};
    					}(subject.feature.uniquename, subject.location.fmin, subject.location.fmax));
    				}
    			},
    			// The ERROR function will be called in an error case.
    			error: function(response, ioArgs) { // 
    				errorCallback(response);
    				return response;
    			}

    		});
    	}
    };
    
    dojo.connect(sequenceField, "onkeypress", function(event) {
    	if (event.keyCode == dojo.keys.ENTER) {
    		event.preventDefault();
    		search();
    	}
    });
    dojo.connect(sequenceButton, "onclick", search);
    dojo.connect(searchAllRefSeqsLabel, "onclick", function() {
    	dojo.attr(searchAllRefSeqsCheckbox, "checked", !searchAllRefSeqsCheckbox.checked);
    });

    if (!getSequenceSearchTools()) {
    	alert("No search plugins setup");
    	return null;
    }
    
    return content;
};

	/*    console.log("at end of SequenceSearch returned function");
	    console.log(window);
	    console.log(SequenceSearch);
	    console.log(new SequenceSearch("."));
	    window.SequenceSearch = SequenceSearch;
            */
	    return SequenceSearch;
	} );

console.log("at end of SequenceSearch.js (outside of define)");