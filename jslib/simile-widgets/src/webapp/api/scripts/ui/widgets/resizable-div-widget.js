/*==================================================
 *  Exhibit.ResizableDivWidget
 *==================================================
 */
Exhibit.ResizableDivWidget = function(configuration, elmt, uiContext) {
    this._div = elmt;
    this._configuration = configuration;
    if (!("minHeight" in configuration)) {
        configuration["minHeight"] = 10; // pixels
    }
    
    this._initializeUI();
};

Exhibit.ResizableDivWidget.create = function(configuration, elmt, uiContext) {
    return new Exhibit.ResizableDivWidget(configuration, elmt, uiContext);
};

Exhibit.ResizableDivWidget.prototype.dispose = function() {
    this._div.innerHTML = "";
    this._contentDiv = null;
    this._resizerDiv = null;
    this._div = null;
};

Exhibit.ResizableDivWidget.prototype.getContentDiv = function() {
    return this._contentDiv;
};

Exhibit.ResizableDivWidget.prototype._initializeUI = function() {
    var self = this;
    
    this._div.innerHTML = 
        "<div></div>" +
        "<div class='exhibit-resizableDivWidget-resizer'>" +
            SimileAjax.Graphics.createTranslucentImageHTML(Exhibit.urlPrefix + "images/down-arrow.png") +
        "</div>";
        
    this._contentDiv = this._div.childNodes[0];
    this._resizerDiv = this._div.childNodes[1];
    
    SimileAjax.WindowManager.registerForDragging(
        this._resizerDiv,
        {   onDragStart: function() {
                this._height = self._contentDiv.offsetHeight;
            },
            onDragBy: function(diffX, diffY) {
                this._height += diffY;
                self._contentDiv.style.height = Math.max(
                    self._configuration.minHeight, 
                    this._height
                ) + "px";
            },
            onDragEnd: function() {
                if ("onResize" in self._configuration) {
                    self._configuration["onResize"]();
                }
            }
        }
    );
};
