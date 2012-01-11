/*==================================================
 *  Exhibit.FacetSelectionExporter
 *==================================================
 */
 
Exhibit.FacetSelectionExporter = {
    getLabel: function() {
        return "Facet Selections";
    },
    exportOne: function(itemID, database) {
        return Exhibit.FacetSelectionExporter._exportUrl();
    },
    exportMany: function(set, database) {
        return Exhibit.FacetSelectionExporter._exportUrl();
    }
};

Exhibit.FacetSelectionExporter._exportUrl = function() {
  var currentSettings = window.exhibit.exportSettings();
  var url = window.location.href.split('?')[0] + '?';
  var sep = '';
  for(id in currentSettings) {
    url += sep + id + '=' + escape(currentSettings[id]);
    if (sep === '') sep = '&';
  }
  return url;
};