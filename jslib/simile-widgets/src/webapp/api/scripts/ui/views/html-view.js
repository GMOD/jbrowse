/*==================================================
 *  Exhibit.HTMLView
 *==================================================
 */

Exhibit.HTMLView = function(containerElmt, uiContext, html) {
    this.html = html;
    this.view = this.moveChildNodes(html, containerElmt);
    //this._uiContext = uiContext;
};

Exhibit.HTMLView.create = Exhibit.HTMLView.createFromDOM = function(
    configElmt,
    containerElmt,
    uiContext
) {
    return new Exhibit.HTMLView(
        containerElmt != null ? containerElmt : configElmt,
        null,//Exhibit.UIContext.createFromDOM(configElmt, uiContext),
	configElmt
    );
};

Exhibit.HTMLView.prototype.dispose = function() {
    //this._uiContext.dispose();
    //this._uiContext = null;

    this.html = this.moveChildNodes(this.view, this.html);
    this.view = this.html = null;
};

Exhibit.HTMLView.prototype.moveChildNodes = function(src, dst) {
    if( src === dst ) return dst;
    var tmp = document.createDocumentFragment();
    while(src.firstChild)
        tmp.appendChild(src.firstChild);
    dst.appendChild(tmp);
    return dst;
};
