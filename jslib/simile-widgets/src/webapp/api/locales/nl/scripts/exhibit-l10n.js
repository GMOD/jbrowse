/*==================================================
 *  Exhibit Dutch localization
 *==================================================
 */

if (!("l10n" in Exhibit)) {
    Exhibit.l10n = {};
}

Exhibit.l10n.missingLabel = "missend";
Exhibit.l10n.missingSortKey = "(missend)";
Exhibit.l10n.notApplicableSortKey = "(niet beschikbaar)";
Exhibit.l10n.itemLinkLabel = "link";
    
Exhibit.l10n.busyIndicatorMessage = "Even wachten aub...";
Exhibit.l10n.showDocumentationMessage = "We zullen de relevante informatie tonen na dit bericht.";
Exhibit.l10n.showJavascriptValidationMessage = "We zullen de fout gedetailleerd uitleggen na dit bericht.";
    
Exhibit.l10n.showJsonValidationMessage = "We zullen de fout gedetailleerd uitleggen na dit bericht.";
Exhibit.l10n.showJsonValidationFormMessage = "We zullen naar een website surfen waar u uw code kunt uploaden en checken..";
    
Exhibit.l10n.badJsonMessage = function(url, e) {
    return "De JSON-data\n  " + url + "\nbevat fouten =\n\n" + e;
};
Exhibit.l10n.failedToLoadDataFileMessage = function(url) {
    return "De data\n  " + url + "\nkan niet gevonden worden. Is de bestandsnaam wel correct?";
};
    
/*
 *  Copy button and dialog box
 */
Exhibit.l10n.exportButtonLabel = "Exporteren";
Exhibit.l10n.exportAllButtonLabel = "Alles exporteren";
Exhibit.l10n.exportDialogBoxCloseButtonLabel =  "sluiten";
Exhibit.l10n.exportDialogBoxPrompt =
    "Kopieer deze code naar het clipboard, zoals u ook zou doen met tekst. Druk op ESC om dit dialoogvenster te sluiten.";
        
/*
 *  Focusdialog box
 */
Exhibit.l10n.focusDialogBoxCloseButtonLabel = "Sluiten";
     
/*
 *  Common exporters' labels
 */
Exhibit.l10n.rdfXmlExporterLabel =            "RDF/XML";
Exhibit.l10n.smwExporterLabel =               "Semantische wikitekst";
Exhibit.l10n.exhibitJsonExporterLabel =       "Exhibit JSON";
Exhibit.l10n.tsvExporterLabel =               "Tab gescheiden waardes";
Exhibit.l10n.htmlExporterLabel =              "Generateer hier HTML van";
