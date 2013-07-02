define([
			'dojo/_base/declare',
			'dojo/_base/array',
			'dojo/Deferred',
			'dojo/json',
            'dojo/_base/url',
			'JBrowse/Store/SeqFeature'
		],
		function (declare, array, Deferred, JSON, urlObj, SeqFeatureStore){ 
			return declare([SeqFeatureStore], {

				// A store that imports and reads a JSON file to produce features.

				constructor: function(args) {


					this.featuresAreLoaded = new Deferred();
			        this.data = args.blob;
			        this.name = args.name || ( this.data.url && new urlObj( this.data.url ).path.replace(/^.+\//,'') ) || 'anonymous';
			        console.log("called JSON load");

			        // load and index the JSON here
			        var store = this;
			        if (this.data.blob instanceof File)  {
			            var fil = this.data.blob;
			            var reader = new FileReader();
			            reader.onload = function(e)  {
			                var content = e.target.result;
			                store.loadContent(content);
			                console.log( "In JSON store, got the file: " + fil.name + ", type: " + fil.type + ", size: " + fil.size);
			            };
			            reader.readAsText(fil);
			            console.log("called reader.readAsText");
			        }
			        else if (this.data.url) {
			            var jsonurl = this.data.url;
			            dojo.xhrGet( {
			                url: jsonurl,
			                handleAs: "text",
			                load: function(response, ioArgs) {
			                    console.log( "In JSON store, got data from URL: ", jsonurl);
			                    store.loadContent(response);
			                },
			                error: function(response, ioArgs) {
			                    console.error(response);
			                    console.error(response.stack);
			                }
			            } );
			        }
				},

				// Load whatever is in the JSON file
				loadContent: function(response) {
					this._loadFeatures( response );
				},

				// Load a set of features from a JSON string.
				_loadFeatures: function( JSONstring ) {
					this.featureArray = JSON.parse(JSONstring);

					if(this.featureArray[0]) {
						this.globalStats = this.featureArray[0];
						this.featureArray.splice(0,1);
					}

					this.maskingSpans = [];

					for(var key in this.featureArray) {
						eval("this.featureArray[key].get = " + this.featureArray[key].get);
						if(this.featureArray[key].id && this.featureArray[key].id.function) {
							eval("this.featureArray[key].id = " + this.featureArray[key].id.function);
						}
						this.maskingSpans = this.maskingSpans.concat(this.featureArray[key].masks || []);
					}

					this.featuresAreLoaded.resolve(true);
				},

				getFeatures: function(query, featCallback, doneCallback, errorCallback) {
					this.featuresAreLoaded.then( dojo.hitch(this, function() {

						var features = array.filter(this.featureArray, function(item) {
							return item.get('start') < query.end && item.get('end') > query.start;
						});

						for(var i in features) {
							if(features.hasOwnProperty(i)) {
								featCallback(features[i]);
							}
						}
						doneCallback({maskingSpans: this.maskingSpans});
					}));
				}

			});
		});