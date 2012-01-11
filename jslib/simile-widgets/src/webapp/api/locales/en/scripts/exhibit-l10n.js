/*==================================================
 *  Exhibit English localization
 *==================================================
 */

if (!("l10n" in Exhibit)) {
    Exhibit.l10n = {};
}

Exhibit.l10n.missingLabel = "missing";
Exhibit.l10n.missingSortKey = "(missing)";
Exhibit.l10n.notApplicableSortKey = "(n/a)";
Exhibit.l10n.itemLinkLabel = "link";
    
Exhibit.l10n.busyIndicatorMessage = "Working...";
Exhibit.l10n.showDocumentationMessage = "We will show the relevant documentation after this message.";
Exhibit.l10n.showJavascriptValidationMessage = "We will explain the error in details after this message.";
    
Exhibit.l10n.showJsonValidationMessage = "We will explain the error in details after this message.";
Exhibit.l10n.showJsonValidationFormMessage = "We will browse to a web service where you can upload and check your code after this message.";
    
Exhibit.l10n.badJsonMessage = function(url, e) {
    return "The JSON data file\n  " + url + "\ncontains errors =\n\n" + e;
};
Exhibit.l10n.failedToLoadDataFileMessage = function(url) {
    return "We cannot locate the data file\n  " + url + "\nCheck that the file name is correct.";
};
    
/*
 *  Copy button and dialog box
 */
Exhibit.l10n.exportButtonLabel = "Export";
Exhibit.l10n.exportAllButtonLabel = "Export All";
Exhibit.l10n.exportDialogBoxCloseButtonLabel =  "Close";
Exhibit.l10n.exportDialogBoxPrompt =
    "Copy this code to your clipboard as you would copy any text. Press ESC to close this dialog box.";
        
/*
 *  Focusdialog box
 */
Exhibit.l10n.focusDialogBoxCloseButtonLabel = "Close";
     
/*
 *  Common exporters' labels
 */
Exhibit.l10n.rdfXmlExporterLabel =            "RDF/XML";
Exhibit.l10n.smwExporterLabel =               "Semantic wikitext";
Exhibit.l10n.exhibitJsonExporterLabel =       "Exhibit JSON";
Exhibit.l10n.tsvExporterLabel =               "Tab Separated Values";
Exhibit.l10n.htmlExporterLabel =              "Generated HTML of this view";
