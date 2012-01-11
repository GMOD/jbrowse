/*==================================================
 *  Exhibit.OptionWidget
 *==================================================
 */
Exhibit.OptionWidget = function(configuration, containerElmt, uiContext) {
    this._label = configuration.label;
    this._checked = "checked" in configuration ? configuration.checked : false;
    this._onToggle = configuration.onToggle;
    
    this._containerElmt = containerElmt;
    this._uiContext = uiContext;
    this._initializeUI();
};

Exhibit.OptionWidget.create = function(configuration, containerElmt, uiContext) {
    return new Exhibit.OptionWidget(configuration, containerElmt, uiContext);
};

Exhibit.OptionWidget.prototype.dispose = function() {
    this._containerElmt.innerHTML = "";
    
    this._dom = null;
    this._containerElmt = null;
    this._uiContext = null;
};

Exhibit.OptionWidget.uncheckedImageURL = Exhibit.urlPrefix + "images/option.png";

Exhibit.OptionWidget.checkedImageURL = Exhibit.urlPrefix + "images/option-check.png";

Exhibit.OptionWidget.uncheckedTemplate = 
    "<span id='uncheckedSpan' style='display: none;'><img id='uncheckedImage' /> %0</span>";
    
Exhibit.OptionWidget.checkedTemplate = 
    "<span id='checkedSpan' style='display: none;'><img id='checkedImage' /> %0</span>";
    
Exhibit.OptionWidget.prototype._initializeUI = function() {
    this._containerElmt.className = "exhibit-optionWidget";
    this._dom = SimileAjax.DOM.createDOMFromString(
        this._containerElmt,
        String.substitute(
            Exhibit.OptionWidget.uncheckedTemplate + Exhibit.OptionWidget.checkedTemplate,
            [ this._label ]
        ),
        {   uncheckedImage: SimileAjax.Graphics.createTranslucentImage(Exhibit.OptionWidget.uncheckedImageURL),
            checkedImage:   SimileAjax.Graphics.createTranslucentImage(Exhibit.OptionWidget.checkedImageURL)
        }
    );
    
    if (this._checked) {
        this._dom.checkedSpan.style.display = "inline";
    } else {
        this._dom.uncheckedSpan.style.display = "inline";
    }
    
    SimileAjax.WindowManager.registerEvent(this._containerElmt, "click", this._onToggle);
};

Exhibit.OptionWidget.prototype.getChecked = function() {
    return this._checked;
};

Exhibit.OptionWidget.prototype.setChecked = function(checked) {
    if (checked != this._checked) {
        this._checked = checked;
        if (checked) {
            this._dom.checkedSpan.style.display = "inline";
            this._dom.uncheckedSpan.style.display = "none";
        } else {
            this._dom.checkedSpan.style.display = "none";
            this._dom.uncheckedSpan.style.display = "inline";
        }
    }
};

Exhibit.OptionWidget.prototype.toggle = function() {
    this.setChecked(!this._checked);
};
