/*======================================================================
 *  Exhibit.Logo
 *======================================================================
 */
Exhibit.Logo = function(elmt, exhibit) {
    this._exhibit = exhibit;
    this._elmt = elmt;
    this._color = "Silver";
}

Exhibit.Logo.create = function(configuration, elmt, exhibit) {
    var logo = new Exhibit.Logo(elmt, exhibit);
    
    if ("color" in configuration) {
        logo._color = configuration.color;
    }
    
    logo._initializeUI();
    return logo;
};

Exhibit.Logo.createFromDOM = function(elmt, exhibit) {
    var logo = new Exhibit.Logo(elmt, exhibit);
    
    var color = Exhibit.getAttribute(elmt, "color");
    if (color != null && color.length > 0) {
        logo._color = color;
    }
    
    logo._initializeUI();
    return logo;
};

Exhibit.Logo.prototype.dispose = function() {
    this._elmt = null;
    this._exhibit = null;
};

Exhibit.Logo.prototype._initializeUI = function() {
    var logoURL = "http://static.simile-widgets.org/graphics/logos/exhibit/exhibit-small-" + this._color + ".png";
    var img = SimileAjax.Graphics.createTranslucentImage(logoURL);
    var id = "exhibit-logo-image";
    if (!document.getElementById(id)) {
        img.id = id;
    }
    var a = document.createElement("a");
    a.href = "http://simile-widgets.org/exhibit/";
    a.title = "http://simile-widgets.org/exhibit/";
    a.target = "_blank";
    a.appendChild(img);
    
    this._elmt.appendChild(a);
};
