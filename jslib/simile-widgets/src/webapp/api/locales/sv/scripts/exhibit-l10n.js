/*==================================================
 *  Exhibit Swedish localization
 *==================================================
 */

if (!("l10n" in Exhibit)) {
    Exhibit.l10n = {};
}

Exhibit.l10n.missingLabel = "saknas";
Exhibit.l10n.missingSortKey = "(saknas)";
Exhibit.l10n.notApplicableSortKey = "(n/a)";
Exhibit.l10n.itemLinkLabel = "länk";

Exhibit.l10n.busyIndicatorMessage = "Arbetar...";
Exhibit.l10n.showDocumentationMessage = "Relevant dokumentation kommer visas efter det här meddelandet.";
Exhibit.l10n.showJavascriptValidationMessage = "Felet förklaras mer ingående efter det här meddelandet.";

Exhibit.l10n.showJsonValidationMessage = "Felet förklaras mer ingående efter det här meddelandet.";
Exhibit.l10n.showJsonValidationFormMessage = "Vi skickar dig till en webtjänst du kan ladda upp din kod till för felsökning efter det här meddelandet.";

Exhibit.l10n.badJsonMessage = function(url, e) {
    return "JSON-filen\n  " + url + "\ninnehåller fel =\n\n" + e;
};
Exhibit.l10n.failedToLoadDataFileMessage = function(url) {
    return "Kunde inte hitta filen\n  " + url + "\nKontrollera att filnamnet är korrekt.";
};

/*
 *  Copy button and dialog box
 */
Exhibit.l10n.copyButtonLabel =                "Kopiera";
Exhibit.l10n.copyAllButtonLabel =             "Kopiera allt";
Exhibit.l10n.copyDialogBoxCloseButtonLabel =  "Stäng";
Exhibit.l10n.copyDialogBoxPrompt =
    "Kopiera det här till klippbordet precis som du skulle göra för annan text. Tryck ESC för att stänga den här dialogen.";

/*
 *  Focusdialog box
 */
Exhibit.l10n.focusDialogBoxCloseButtonLabel =  "Stäng";

/*
 *  Common exporters' labels
 */
Exhibit.l10n.rdfXmlExporterLabel =            "RDF/XML";
Exhibit.l10n.smwExporterLabel =               "Semantisk wikitext";
Exhibit.l10n.exhibitJsonExporterLabel =       "Exhibit JSON";
Exhibit.l10n.tsvExporterLabel =               "Tabseparerade värden";
Exhibit.l10n.htmlExporterLabel =              "HTML för den här vyn";
