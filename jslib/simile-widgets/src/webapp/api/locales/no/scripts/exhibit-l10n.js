/*==================================================
 *  Exhibit Norwegian localization
 *==================================================
 */

if (!("l10n" in Exhibit)) {
    Exhibit.l10n = {};
}

Exhibit.l10n.missingLabel = "mangler";
Exhibit.l10n.missingSortKey = "(mangler)";
Exhibit.l10n.notApplicableSortKey = "(n/a)";
Exhibit.l10n.itemLinkLabel = "lenke";
    
Exhibit.l10n.busyIndicatorMessage = "Søker...";
Exhibit.l10n.showDocumentationMessage = "Vi vil vise dokumentasjon etter denne meldinga.";
Exhibit.l10n.showJavascriptValidationMessage = "Vi vil forklare feilen etter denne meldinga.";
    
Exhibit.l10n.showJsonValidationMessage = "Vi vil forklare feilen etter denne meldinga.";
Exhibit.l10n.showJsonValidationFormMessage = "Vi vil lete opp en webservice der du kan laste opp og teste koden etter denne meldinga.";
    
Exhibit.l10n.badJsonMessage = function(url, e) {
    return "JSON-datafila\n  " + url + "\ninneholder feil =\n\n" + e;
};
Exhibit.l10n.failedToLoadDataFileMessage = function(url) {
    return "Vi kan ikke finne fila \n  " + url + "\n sjekk om filnavnet stemmer.";
};
    
/*
 *  Copy button and dialog box
 */
Exhibit.l10n.exportButtonLabel = "Eksporter";
Exhibit.l10n.exportAllButtonLabel = "Eksporter alle";
Exhibit.l10n.exportDialogBoxCloseButtonLabel =  "Lukk";
Exhibit.l10n.exportDialogBoxPrompt =
    "Kopier koden til utklippstavlen. Trykk ESC for å fjerne denne dialogboksen.";
        
/*
 *  Focusdialog box
 */
Exhibit.l10n.focusDialogBoxCloseButtonLabel = "Lukk";
     
/*
 *  Common exporters' labels
 */
Exhibit.l10n.rdfXmlExporterLabel =            "RDF/XML";
Exhibit.l10n.smwExporterLabel =               "Semantisk wikitext";
Exhibit.l10n.exhibitJsonExporterLabel =       "Exhibit JSON";
Exhibit.l10n.tsvExporterLabel =               "Tab-separerte verdier";
Exhibit.l10n.htmlExporterLabel =              "HTML generert fra denne visninga";
