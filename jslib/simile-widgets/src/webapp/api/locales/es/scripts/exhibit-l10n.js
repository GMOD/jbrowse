/*==================================================
 *  Exhibit Spanish localization
 *==================================================
 */

if (!("l10n" in Exhibit)) {
    Exhibit.l10n = {};
}

Exhibit.l10n.missingLabel = "falta";
Exhibit.l10n.missingSortKey = "(falta)";
Exhibit.l10n.notApplicableSortKey = "(n/a)";
Exhibit.l10n.itemLinkLabel =  "link";

Exhibit.l10n.busyIndicatorMessage = "Procesando...";
Exhibit.l10n.showDocumentationMessage = "Te enseñaremos la documentación asociada después de este mensaje.";
Exhibit.l10n.showJavascriptValidationMessage = "Te explicaremos los detalles del error después de este mensaje.";

Exhibit.l10n.showJsonValidationMessage = "Te explicaremos los detalles del error después de este mensaje.";
Exhibit.l10n.showJsonValidationFormMessage = "Te redirigiremos a un servicio web donde podrás subir y verificar tu código después de este mensaje.";

Exhibit.l10n.badJsonMessage = function(url, e) {
    return "El fichero de datos JSON\n  " + url + "\ncontiene errores =\n\n" + e;
};
Exhibit.l10n.failedToLoadDataFileMessage = function(url) {
    return "No podemos localizar el fichero de datos\n  " + url + "\nComprueba que el nombre del archivo es correcto.";
};

/*
 *  Copy button and dialog box
 */
Exhibit.l10n.copyButtonLabel = "Copiar";
Exhibit.l10n.copyAllButtonLabel = "Copiar todo";
Exhibit.l10n.copyDialogBoxCloseButtonLabel = "Cerrar";
Exhibit.l10n.copyDialogBoxPrompt = 
    "Copia este código en tu clipboard como si fuera texto. Pulsa ESC para cerrar este cuadro de diálogo.";
    
/*
 *  Focusdialog box
 */
Exhibit.l10n.focusDialogBoxCloseButtonLabel =  "Cerrar";
 
/*
 *  Common exporters' labels
 */
Exhibit.l10n.rdfXmlExporterLabel =            "RDF/XML";
Exhibit.l10n.smwExporterLabel =               "Semantic wikitext";
Exhibit.l10n.exhibitJsonExporterLabel =       "Exhibit JSON";
Exhibit.l10n.tsvExporterLabel =               "Tab Separated Values";
Exhibit.l10n.htmlExporterLabel =              "Generated HTML of this view";
