define([
			'dojo/_base/declare',
			'dojo/_base/lang',
			'JBrowse/View/Export',
		], function(declare, lang, ExportBase) {

			return declare(ExportBase, {

				exportRegion: function ( region, callback) {
					var featureArray = [];
					var store = this.store;
					store.getGlobalStats(function(stats) {
						featureArray.push(stats);
					}, function() { console.error("error fetching global stats for store " + store.name); });
					this.store.getFeatures( region,
						function(featureOrig) {
							var feature;
							
							try {
								feature = lang.clone(featureOrig);
							} catch(e) {
								feature = lang.mixin({}, featureOrig);
							}
							feature.get = feature.get.toString();
							if(typeof feature.id == "function") feature.id = { function: feature.id.toString()};
							featureArray.push(feature);
						},
						dojo.hitch(this, function() {
							this.output = JSON.stringify(featureArray);
							callback(this.output);
						}),
			            dojo.hitch( this, function( error ) { console.error(error); } )
			        ); 
				}

			});

		});