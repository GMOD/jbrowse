/*==================================================
 *  Exhibit French localization
 *==================================================
 */

if (!("l10n" in Exhibit)) {
    Exhibit.l10n = {};
}

Exhibit.l10n.missingLabel = "manquant";
Exhibit.l10n.missingSortKey = "(manquant)";
Exhibit.l10n.notApplicableSortKey = "(n/a)";
Exhibit.l10n.itemLinkLabel = "lien";
    
Exhibit.l10n.busyIndicatorMessage = "Traitement en cours...";
Exhibit.l10n.showDocumentationMessage = "Vous verrez la documentation appropriée après ce message.";
Exhibit.l10n.showJavascriptValidationMessage = "Vous aurez l'explication détaillée de l'erreur après ce message.";
    
Exhibit.l10n.showJsonValidationMessage = "Vous aurez l'explication détaillée de l'erreur après ce message.";
Exhibit.l10n.showJsonValidationFormMessage = "Après ce message, vous accéderez à un service web sur lequel vous pourrez transmettre et vérifier votre code.";
    
Exhibit.l10n.badJsonMessage = function(url, e) {
    return "Le fichier de données JSON\n  " + url + "\ncontient des erreurs :\n\n" + e;
};
Exhibit.l10n.failedToLoadDataFileMessage = function(url) {
    return "Impossible de trouver le fichier de données\n  " + url + "\nVérifiez que le nom du fichier est correct.";
};
    
/*
 *  Copy button and dialog box
 */
Exhibit.l10n.exportButtonLabel = "Exporter";
Exhibit.l10n.exportAllButtonLabel = "Tout exporter";
Exhibit.l10n.exportDialogBoxCloseButtonLabel =  "Fermer";
Exhibit.l10n.exportDialogBoxPrompt =
    "Copiez ce code dans votre presse-papier comme vous le feriez pour un texte. Appuyez sur ESC pour fermer cette fenêtre.";
        
/*
 *  Focusdialog box
 */
Exhibit.l10n.focusDialogBoxCloseButtonLabel = "Fermer";
     
/*
 *  Common exporters' labels
 */
Exhibit.l10n.rdfXmlExporterLabel =            "RDF/XML";
Exhibit.l10n.smwExporterLabel =               "Semantic wikitext";
Exhibit.l10n.exhibitJsonExporterLabel =       "Exhibit JSON";
Exhibit.l10n.tsvExporterLabel =               "Valeurs séparées par tabulation";
Exhibit.l10n.htmlExporterLabel =              "Exportation HTML";
