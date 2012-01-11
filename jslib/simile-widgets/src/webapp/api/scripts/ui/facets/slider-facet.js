/*==================================================
 *  Exhibit.SliderFacet
 *==================================================
 */


Exhibit.SliderFacet = function(containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;

    this._expression = null;
    this._settings = {};

//  this._selection = {min: null, max: null};
    this._range = {min: null, max: null}; //currently selected range
    this._maxRange = {min: null, max: null}; //total range of slider
};



Exhibit.SliderFacet._settingsSpecs = {
    "facetLabel":       { type: "text" },
    "scroll":           { type: "boolean", defaultValue: true },
    "height":           { type: "text" },
    "precision":        { type: "float", defaultValue: 1 },
    "histogram":        { type: "boolean", defaultValue: true },
    "height":           { type: "int", defaultValue: false },
    "width":            { type: "int", defaultValue: false },
    "horizontal":       { type: "boolean", defaultValue: true },
    "inputText":        { type: "boolean", defaultValue: true },
    "showMissing":	{ type: "boolean", defaultValue: true},
    "selection":        { type: "float", dimensions: 2}
    };
        


Exhibit.SliderFacet.create = function(configuration, containerElmt, uiContext) {
    var uiContext = Exhibit.UIContext.create(configuration, uiContext);
    var facet = new Exhibit.SliderFacet(containerElmt, uiContext);

    Exhibit.SliderFacet._configure(facet, configuration);

    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);

    return facet;
};

//this is what Exhibit.UI.createFromDOM(elmt, uiContext) redirects to for the slider facet
Exhibit.SliderFacet.createFromDOM = function(configElmt, containerElmt, uiContext) {
    var configuration = Exhibit.getConfigurationFromDOM(configElmt);
    var uiContext = Exhibit.UIContext.createFromDOM(configElmt, uiContext);
    var facet = new Exhibit.SliderFacet(
	containerElmt != null? containerElmt : configElmt,
	uiContext
    );
	
	//fills facet with configuration information
    Exhibit.SettingsUtilities.collectSettingsFromDOM(configElmt, Exhibit.SliderFacet._settingsSpecs, facet._settings);

    try {
        var expressionString = Exhibit.getAttribute(configElmt, "expression");
        if (expressionString != null && expressionString.length > 0) {
            facet._expression = Exhibit.ExpressionParser.parse(expressionString);
        }
        
        var showMissing = Exhibit.getAttribute(configElmt, "showMissing");
        
        if (showMissing != null && showMissing.length > 0) {
            facet._showMissing = (showMissing == "true");
        }
        else{facet._showMissing=true;}

    if ("selection" in facet._settings) {
        var selection = facet._settings.selection;
        facet._range = {min: selection[0], max: selection[1]};
    }

    } catch (e) {
        SimileAjax.Debug.exception(e, "SliderFacet: Error processing configuration of slider facet");
    }
	
    Exhibit.SliderFacet._configure(facet, configuration);
    facet._initializeUI();
    uiContext.getCollection().addFacet(facet);

    return facet;
};

//what appears to be redundant configuration
Exhibit.SliderFacet._configure = function(facet, configuration) {
    Exhibit.SettingsUtilities.collectSettings(configuration, Exhibit.SliderFacet._settingsSpecs, facet._settings);

    if ("expression" in configuration) {
		facet._expression = Exhibit.ExpressionParser.parse(configuration.expression);
		
    }
    if ("selection" in configuration) {
        var selection = configuration.selection;
        facet._range = {min: selection[0], max: selection[1]};
    }
    
    if ("showMissing" in configuration){
 		facet._showMissing=configuration.showMissing;   
    
    }
 
    
    
    
	
	//needs to be altered...get a label for something complex
    if (!("facetLabel" in facet._settings)) {
		facet._settings.facetLabel = "missing ex:facetLabel";
		if (facet._expression != null && facet._expression.isPath()) {
		    var segment = facet._expression.getPath().getLastSegment();
		    var property = facet._uiContext.getDatabase().getProperty(segment.property);
		    if (property != null) {
				facet._settings.facetLabel = segment.forward ? property.getLabel() : property.getReverseLabel();
		    }
		}
		}
	
    facet._cache = new Exhibit.FacetUtilities.Cache(
        facet._uiContext.getDatabase(),
        facet._uiContext.getCollection(),
        facet._expression
    );
    
    facet._maxRange = facet._getMaxRange();
};
//initializes UI, obviously
Exhibit.SliderFacet.prototype._initializeUI = function() {
    this._dom = SimileAjax.DOM.createDOMFromString(
       this._div,
       "<div class='exhibit-facet-header'>" +
           "<span class='exhibit-facet-header-title'>" + this._settings.facetLabel + "</span>" +
       "</div>" +
       "<div class='exhibit-slider' id='slider'></div>"
    );

    this._slider = new Exhibit.SliderFacet.slider(this._dom.slider, this, this._settings.precision, this._settings.horizontal);
};

//checks for user use of slider, null if slider not yet used
Exhibit.SliderFacet.prototype.hasRestrictions = function() {
    return (this._range.min && this._range.min != this._maxRange.min) || (this._range.max && this._range.max != this._maxRange.max);
};

//[items] used by other function
Exhibit.SliderFacet.prototype.update = function(items) {
    if (this._settings.histogram) {
		var data = [];
		var n = 75; //number of bars on histogram
		var range = (this._maxRange.max - this._maxRange.min)/n //range represented by each bar
	    var missingCount=0;
		var database = this._uiContext.getDatabase();
	
	if(this._selectMissing){
	  missingCount=this._cache.getItemsMissingValue(items).size();
	
	
	}	
	if(this._expression.isPath()){
			var path = this._expression.getPath();
			
			for(var i=0; i<n; i++) {
			 data[i] = path.rangeBackward(this._maxRange.min+i*range, this._maxRange.min+(i+1)*range, false, items,database).values.size()+missingCount;
						}
		}
		
	
	else{
		this._buildRangeIndex();
		var rangeIndex=this._rangeIndex;
		
		for(var i=0; i<n; i++){ 
		
		   data[i] = rangeIndex.getSubjectsInRange(this._maxRange.min+i*range, this._maxRange.min+(i+1)*range, false, null, items).size()+missingCount;
			}
		
		}

		
		this._slider.updateHistogram(data);
    }
    this._slider._setMin(this._range.min);
    this._slider._setMax(this._range.max);
};
//[items] used by other function
Exhibit.SliderFacet.prototype.restrict = function(items) {
    if (!this.hasRestrictions()) {
	return items;
    }
    
    
    set=new Exhibit.Set();
    
    
   
    
    if(this._expression.isPath()){
		var path = this._expression.getPath();
    	var database = this._uiContext.getDatabase();
    	set=path.rangeBackward(this._range.min, this._range.max, false, items, database).values;
    	
		}
		
	else{
		this._buildRangeIndex();
		var rangeIndex=this._rangeIndex;
		set=rangeIndex.getSubjectsInRange(this._range.min, this._range.max, false, null, items);
		
			
	}
	
	if(this._showMissing){
    
    this._cache.getItemsMissingValue(items, set);
    }
    
    return set;
    
};
//gets maximum range? need to construct a range index for this...
Exhibit.SliderFacet.prototype._getMaxRange = function() {
	if(this._expression.getPath()){
	    var path = this._expression.getPath();
	    var database = this._uiContext.getDatabase();
	    var propertyID = path.getLastSegment().property;
	    var property = database.getProperty(propertyID);
	    var rangeIndex = property.getRangeIndex();
	    }
	else{
	  
	  	this._buildRangeIndex();
		var rangeIndex=this._rangeIndex;	
	
	
	}

    return {min: rangeIndex.getMin(), max: rangeIndex.getMax()};
};

Exhibit.SliderFacet.prototype._buildRangeIndex = function() {
    if (!("_rangeIndex" in this)) {
        var expression = this._expression;
        var database = this._uiContext.getDatabase();
        var getter = function(item, f) {
            expression.evaluateOnItem(item, database).values.visit(function(value) {
                if (typeof value != "number") {
                    value = parseFloat(value);
                }
                if (!isNaN(value)) {
                    f(value);
                }
            });
        };
    
        this._rangeIndex = new Exhibit.Database._RangeIndex(
            this._uiContext.getCollection().getAllItems(),
            getter
        );    
    }
};


//clear
Exhibit.SliderFacet.prototype.changeRange = function(range) {
    this._range = range;

    var preUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    this._notifyCollection();
    var postUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    var totalSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countAllItems() : 0;

    SimileAjax.RemoteLog.possiblyLog({
        facetType:"Slider", 
        facetLabel:this._settings.facetLabel, 
        operation:"changeRange", 
        max:range.max, 
        min:range.min,
        exhibitSize:totalSize,
        preUpdateSize:preUpdateSize,
        postUpdateSize:postUpdateSize        
    });
    
};
//clear
Exhibit.SliderFacet.prototype._notifyCollection = function() {
    this._uiContext.getCollection().onFacetUpdated(this);
};
//clear
Exhibit.SliderFacet.prototype.clearAllRestrictions = function() {
    var preUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    this._slider.resetSliders();
    var postUpdateSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countRestrictedItems() : 0;
    var totalSize = SimileAjax.RemoteLog.logActive ? this._uiContext.getCollection().countAllItems() : 0;

    SimileAjax.RemoteLog.possiblyLog({
        facetType:"Slider", 
        facetLabel:this._settings.facetLabel, 
        operation:"clearAllRestrictions",
        exhibitSize:totalSize,
        preUpdateSize:preUpdateSize,
        postUpdateSize:postUpdateSize        
    });
 
    this._range = this._maxRange;
};
//clear
Exhibit.SliderFacet.prototype.dispose = function() {
    this._uiContext.getCollection().removeFacet(this);
    this._uiContext = null;
    this._colorCoder = null;
    
    this._div.innerHTML = "";
    this._div = null;
    this._dom = null;
    
    this._expression = null;
    this._settings = null;
    
//  this._selection = null;
    this._range = null; //currently selected range
    this._maxRange = null; //total range of slider
};