/*==================================================
 *  Exhibit.LegendWidget
 *==================================================
 */
Exhibit.LegendWidget = function(configuration, containerElmt, uiContext) {
    this._configuration = configuration;
    this._div = containerElmt;
    this._jq=SimileAjax.jQuery(this._div);
    this._uiContext = uiContext;
    
    this._colorMarkerGenerator = "colorMarkerGenerator" in configuration ?
        configuration.colorMarkerGenerator :
        Exhibit.LegendWidget._defaultColorMarkerGenerator;	 
	this._sizeMarkerGenerator = "sizeMarkerGenerator" in configuration ?
		configuration.sizeMarkerGenerator :
		Exhibit.LegendWidget._defaultSizeMarkerGenerator;
	this._iconMarkerGenerator = "iconMarkerGenerator" in configuration ?
		configuration.iconMarkerGenerator :
		Exhibit.LegendWidget._defaultIconMarkerGenerator;

    this._labelStyler = "labelStyler" in configuration ?
        configuration.labelStyler :
        Exhibit.LegendWidget._defaultColorLabelStyler;
    
    this._initializeUI();
};

Exhibit.LegendWidget.create = function(configuration, containerElmt, uiContext) {
    return new Exhibit.LegendWidget(configuration, containerElmt, uiContext);
};

Exhibit.LegendWidget.prototype.dispose = function() {
    this._div.innerHTML = "";
    
    this._div = null;
    this._jq=null;
    this._uiContext = null;
};

Exhibit.LegendWidget.prototype._initializeUI = function() {
    this._div.className = "exhibit-legendWidget";
    this._div.innerHTML = "<div class='exhibit-color-legend'></div><div class='exhibit-size-legend'></div><div class='exhibit-icon-legend'></div>";
};

Exhibit.LegendWidget.prototype.clear = function() {
    this._div.innerHTML = "<div class='exhibit-color-legend'></div><div class='exhibit-size-legend'></div><div class='exhibit-icon-legend'></div>";
};

Exhibit.LegendWidget.prototype.addLegendLabel = function(label, type) {
	var dom = SimileAjax.DOM.createDOMFromString(
			"div",
			"<div class='legend-label'>" +
				"<span class='label' class='exhibit-legendWidget-entry-title'>" + 
					label.replace(/\s+/g, "\u00a0") + 
				"</span>" +
			"\u00a0\u00a0 </div>",
			{ }
		);
	dom.elmt.className = "exhibit-legendWidget-label";
    this._jq.find("." + "exhibit-" + type + "-legend").append(dom.elmt);
}

Exhibit.LegendWidget.prototype.addEntry = function(value, label, type) {
    type = type || 'color';
    label = (label != null) ? label.toString() : "";
    var legendDiv=this._jq.find(".exhibit-" + type + "-legend");
    var marker;
	
    if (type == 'color') {
		var dom = SimileAjax.DOM.createDOMFromString(
			"span",
			"<span id='marker'></span>\u00a0" +
				"<span id='label' class='exhibit-legendWidget-entry-title'>" + 
					label.replace(/\s+/g, "\u00a0") + 
				"</span>" +
				"\u00a0\u00a0 ",
			{ marker: this._colorMarkerGenerator(value) }
		);
	}
	if (type == 'size') {
		var dom = SimileAjax.DOM.createDOMFromString(
			"span",
			"<span id='marker'></span>\u00a0" +
				"<span id='label' class='exhibit-legendWidget-entry-title'>" + 
					label.replace(/\s+/g, "\u00a0") + 
				"</span>" +
				"\u00a0\u00a0 ",
			{ marker: this._sizeMarkerGenerator(value) }
		);
	}
	if (type == 'icon') {
		var dom = SimileAjax.DOM.createDOMFromString(
			"span",
			"<span id='marker'></span>\u00a0" +
				"<span id='label' class='exhibit-legendWidget-entry-title'>" + 
					label.replace(/\s+/g, "\u00a0") + 
				"</span>" +
				"\u00a0\u00a0 ",
			{ marker: this._iconMarkerGenerator(value) }
		);
	}
    dom.elmt.className = "exhibit-legendWidget-entry";
    this._labelStyler(dom.label, value);
    legendDiv.append(dom.elmt);
};

Exhibit.LegendWidget._localeSort = function(a,b) {
    return a.localeCompare(b);
}

Exhibit.LegendWidget._defaultColorMarkerGenerator = function(value) {
    var span = document.createElement("span");
    span.className = "exhibit-legendWidget-entry-swatch";
    span.style.background = value;
    span.innerHTML = "\u00a0\u00a0";
    return span;
};

Exhibit.LegendWidget._defaultSizeMarkerGenerator = function(value) {
    var span = document.createElement("span");
    span.className = "exhibit-legendWidget-entry-swatch";
    span.style.height = value;
    span.style.width = value;
    span.style.background = "#C0C0C0";
    span.innerHTML = "\u00a0\u00a0";
    return span;
}

Exhibit.LegendWidget._defaultIconMarkerGenerator = function(value) {
    var span = document.createElement("span");
    span.className = "<img src="+value+"/>";
    return span;
}

Exhibit.LegendWidget._defaultColorLabelStyler = function(elmt, value) {
    //elmt.style.color = "#" + value;
};
