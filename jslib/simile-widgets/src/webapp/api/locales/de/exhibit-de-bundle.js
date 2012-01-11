

/* database-l10n.js */
if(!("l10n" in Exhibit.Database)){Exhibit.Database.l10n={};
}Exhibit.Database.l10n.itemType={label:"Element",pluralLabel:"Elemente",uri:"http://simile.mit.edu/2006/11/exhibit#Item"};
Exhibit.Database.l10n.labelProperty={label:"Bezeichnung",pluralLabel:"Bezeichnungen",reverseLabel:"Bezeichnung von",reversePluralLabel:"Bezeichnungen von"};
Exhibit.Database.l10n.typeProperty={label:"Typ",pluralLabel:"Typen",reverseLabel:"Typ von",reversePluralLabel:"Typen von"};
Exhibit.Database.l10n.uriProperty={label:"URI",pluralLabel:"URIs",reverseLabel:"URI von",reversePluralLabel:"URIs von"};
Exhibit.Database.l10n.sortLabels={"text":{ascending:"a - z",descending:"z - a"},"number":{ascending:"kleinstes zuerst",descending:"größtes zuerst"},"date":{ascending:"frühestes zuerst",descending:"spätestes zuerst"},"boolean":{ascending:"falsch zuerst",descending:"wahr zuerst"},"item":{ascending:"a - z",descending:"z - a"}};
Exhibit.Database.l10n.labelItemsOfType=function(F,C,G,B){var A=F==1?Exhibit.Database.l10n.itemType.label:Exhibit.Database.l10n.itemType.pluralLabel;
var E=G.getType(C);
if(E){A=E.getLabel();
if(F!=1){var H=E.getProperty("pluralLabel");
if(H){A=H;
}}}var D=document.createElement("span");
D.innerHTML="<span class='"+B+"'>"+F+"</span> "+A;
return D;
};


/* exhibit-l10n.js */
if(!("l10n" in Exhibit)){Exhibit.l10n={};
}Exhibit.l10n.missingLabel="fehlend";
Exhibit.l10n.missingSortKey="(fehlend)";
Exhibit.l10n.notApplicableSortKey="(k.A.)";
Exhibit.l10n.itemLinkLabel="Verweis";
Exhibit.l10n.busyIndicatorMessage="Bitte warten...";
Exhibit.l10n.showDocumentationMessage="Der relevante Teil der Dokumentation wird nach nach dieser Nachricht angezeigt.";
Exhibit.l10n.showJavascriptValidationMessage="Dieser Fehler wird detailliert nach dieser Nachricht erklärt.";
Exhibit.l10n.showJsonValidationMessage="Dieser Fehler wird detailliert nach dieser Nachricht erklärt.";
Exhibit.l10n.showJsonValidationFormMessage="Nach dieser Nachricht werden Sie zu einem Webservice weitergeleitet, mit dessen Hilfe Sie ihren Code überprüfen können.";
Exhibit.l10n.badJsonMessage=function(A,B){return"Die JSON Datei\n  "+A+"\nenthält Fehler =\n\n"+B;
};
Exhibit.l10n.failedToLoadDataFileMessage=function(A){return"Die Datei\n  "+A+"\nkann nicht gefunden werden. Bitte überprüfen Sie den Dateinamen.";
};
Exhibit.l10n.exportButtonLabel="Exportieren";
Exhibit.l10n.exportAllButtonLabel="Alles Exportieren";
Exhibit.l10n.exportDialogBoxCloseButtonLabel="Schließen";
Exhibit.l10n.exportDialogBoxPrompt="Kopieren Sie diesen Code wie normalen Text in die Zwischenablage. Drücken Sie ESC um dieses Dialogfenster zu schliessen.";
Exhibit.l10n.focusDialogBoxCloseButtonLabel="Schließen";
Exhibit.l10n.rdfXmlExporterLabel="RDF/XML";
Exhibit.l10n.smwExporterLabel="Semantic wikitext";
Exhibit.l10n.exhibitJsonExporterLabel="Exhibit JSON";
Exhibit.l10n.tsvExporterLabel="Tabulator-getrennte Werte";
Exhibit.l10n.htmlExporterLabel="Erzeugtes HTML dieser Ansicht";


/* formatter-l10n.js */
if(!("l10n" in Exhibit.Formatter)){Exhibit.Formatter.l10n={};
}Exhibit.Formatter.l10n.listSeparator=", ";
Exhibit.Formatter.l10n.listLastSeparator=" und ";
Exhibit.Formatter.l10n.listPairSeparator=" und ";
Exhibit.Formatter.l10n.textEllipsis="...";
Exhibit.Formatter.l10n.booleanTrue="wahr";
Exhibit.Formatter.l10n.booleanFalse="falsch";
Exhibit.Formatter.l10n.currencySymbol="€";
Exhibit.Formatter.l10n.currencySymbolPlacement="first";
Exhibit.Formatter.l10n.currencyShowSign=true;
Exhibit.Formatter.l10n.currencyShowRed=false;
Exhibit.Formatter.l10n.currencyShowParentheses=false;
Exhibit.Formatter.l10n.dateTimeDefaultFormat="EEE, MMM d, yyyy, hh:mm a";
Exhibit.Formatter.l10n.dateShortFormat="dd.MM.yy";
Exhibit.Formatter.l10n.timeShortFormat="hh:mm a";
Exhibit.Formatter.l10n.dateTimeShortFormat="dd.MM.yy hh:mm a";
Exhibit.Formatter.l10n.dateMediumFormat="EEE, d. MMM yyyy";
Exhibit.Formatter.l10n.timeMediumFormat="hh:mm a";
Exhibit.Formatter.l10n.dateTimeMediumFormat="EEE, d. MMM, yyyy, hh:mm a";
Exhibit.Formatter.l10n.dateLongFormat="EEEE, d. MMMM, yyyy";
Exhibit.Formatter.l10n.timeLongFormat="HH:mm:ss z";
Exhibit.Formatter.l10n.dateTimeLongFormat="EEEE, d. MMMM, yyyy, HH:mm:ss z";
Exhibit.Formatter.l10n.dateFullFormat="EEEE, d. MMMM, yyyy";
Exhibit.Formatter.l10n.timeFullFormat="HH:mm:ss.S z";
Exhibit.Formatter.l10n.dateTimeFullFormat="EEEE, d. MMMM, yyyy G, HH:mm:ss.S z";
Exhibit.Formatter.l10n.shortDaysOfWeek=["So","Mo","Di","Mi","Do","Fr","Sa"];
Exhibit.Formatter.l10n.daysOfWeek=["Sonntag","Montag","Dienstag","Mittwoch","Donnerstag","Freitag","Samstag"];
Exhibit.Formatter.l10n.shortMonths=["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
Exhibit.Formatter.l10n.months=["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];
Exhibit.Formatter.l10n.commonEra="u.Z.";
Exhibit.Formatter.l10n.beforeCommonEra="v.u.Z";
Exhibit.Formatter.l10n.beforeNoon="am";
Exhibit.Formatter.l10n.afterNoon="pm";
Exhibit.Formatter.l10n.BeforeNoon="AM";
Exhibit.Formatter.l10n.AfterNoon="PM";


/* lens-l10n.js */
if(!("l10n" in Exhibit.Lens)){Exhibit.Lens.l10n={};
}

/* ui-context-l10n.js */
if(!("l10n" in Exhibit.UIContext)){Exhibit.UIContext.l10n={};
}Exhibit.UIContext.l10n.initialSettings={"bubbleWidth":400,"bubbleHeight":300};


/* ordered-view-frame-l10n.js */
if(!("l10n" in Exhibit.OrderedViewFrame)){Exhibit.OrderedViewFrame.l10n={};
}Exhibit.OrderedViewFrame.l10n.removeOrderLabel="Diese Sortierung aufheben";
Exhibit.OrderedViewFrame.l10n.sortingControlsTemplate="sortiert nach: <span id='ordersSpan'></span>; <a id='thenSortByAction' href='javascript:void' class='exhibit-action' title='Sortiere die Elemente ferner nach'>sowie nach...</a>";
Exhibit.OrderedViewFrame.l10n.formatSortActionTitle=function(B,A){return"Sortiert nach "+B+" ("+A+")";
};
Exhibit.OrderedViewFrame.l10n.formatRemoveOrderActionTitle=function(B,A){return"Hebe Sortierung nach "+B+" auf ("+A+")";
};
Exhibit.OrderedViewFrame.l10n.groupedAsSortedOptionLabel="Gruppierung wie Sortierung";
Exhibit.OrderedViewFrame.l10n.groupAsSortedActionTitle="Gruppierung nach Sortierung";
Exhibit.OrderedViewFrame.l10n.ungroupAsSortedActionTitle="hebe Gruppierung nach Sortierung auf";
Exhibit.OrderedViewFrame.l10n.showAllActionTitle="zeige alle Ergebnisse";
Exhibit.OrderedViewFrame.l10n.dontShowAllActionTitle="zeige die ersten paar Ergebnisse";
Exhibit.OrderedViewFrame.l10n.formatDontShowAll=function(A){return"Zeige nur die ersten "+A+" Ergebnisse";
};
Exhibit.OrderedViewFrame.l10n.formatShowAll=function(A){return"Zeige alle "+A+" Ergebnisse";
};


/* tabular-view-l10n.js */
if(!("l10n" in Exhibit.TabularView)){Exhibit.TabularView.l10n={};
}Exhibit.TabularView.l10n.viewLabel="Tabelle";
Exhibit.TabularView.l10n.viewTooltip="Zeige Elemente in einer Tabelle";
Exhibit.TabularView.l10n.columnHeaderSortTooltip="Nach dieser Spalte sortieren";
Exhibit.TabularView.l10n.columnHeaderReSortTooltip="In umgekehrter Reihenfolge sortieren";
Exhibit.TabularView.l10n.makeSortActionTitle=function(A,B){return(B?"aufsteigend sortiert nach ":"absteigend sortiert nach ")+A;
};


/* thumbnail-view-l10n.js */
if(!("l10n" in Exhibit.ThumbnailView)){Exhibit.ThumbnailView.l10n={};
}Exhibit.ThumbnailView.l10n.viewLabel="Vorschaubilder";
Exhibit.ThumbnailView.l10n.viewTooltip="Zeige Elemente als Vorschaubilder";


/* tile-view-l10n.js */
if(!("l10n" in Exhibit.TileView)){Exhibit.TileView.l10n={};
}Exhibit.TileView.l10n.viewLabel="Kachelansicht";
Exhibit.TileView.l10n.viewTooltip="Zeige Elemente in einer Kachelansicht (als Liste)";


/* view-panel-l10n.js */
if(!("l10n" in Exhibit.ViewPanel)){Exhibit.ViewPanel.l10n={};
}Exhibit.ViewPanel.l10n.createSelectViewActionTitle=function(A){return"Wähle Sicht "+A;
};
Exhibit.ViewPanel.l10n.missingViewClassMessage="Der Beschreibung einer der Sichten fehlt das viewClass Attribut.";
Exhibit.ViewPanel.l10n.viewClassNotFunctionMessage=function(A){return"Der angegebene Wert '"+A+"' des viewClass Attributs\neiner der Sichten ist keine Javascript Funktion.";
};
Exhibit.ViewPanel.l10n.badViewClassMessage=function(A){return"Der angegebene Wert '"+A+"' des viewClass Attributs\neiner der Sichten ist kein gültiger Javascript Ausdruck.";
};


/* collection-summary-widget-l10n.js */
if(!("l10n" in Exhibit.CollectionSummaryWidget)){Exhibit.CollectionSummaryWidget.l10n={};
}Exhibit.CollectionSummaryWidget.l10n.resetFiltersLabel="Alle Filter zurücksetzen";
Exhibit.CollectionSummaryWidget.l10n.resetFiltersTooltip="Alle Filter zurücksetzen und ursprüngliche Elemente anzeigen";
Exhibit.CollectionSummaryWidget.l10n.resetActionTitle="Alle Filter zurücksetzen";
Exhibit.CollectionSummaryWidget.l10n.allResultsTemplate="<span class='%0' id='resultDescription'></span>";
Exhibit.CollectionSummaryWidget.l10n.noResultsTemplate="<span class='%0'><span class='%1'>0</span> Ergebnisse</span> (<span id='resetActionLink'></span>)";
Exhibit.CollectionSummaryWidget.l10n.filteredResultsTemplate="<span class='%0' id='resultDescription'></span> gefiltert von ursprünglich <span id='originalCountSpan'>0</span> (<span id='resetActionLink'></span>)";


/* coders-l10n.js */
if(!("l10n" in Exhibit.Coders)){Exhibit.Coders.l10n={};
}Exhibit.Coders.l10n.mixedCaseLabel="gemischt";
Exhibit.Coders.l10n.missingCaseLabel="fehlend";
Exhibit.Coders.l10n.othersCaseLabel="andere";


/* facets-l10n.js */
if(!("l10n" in Exhibit.FacetUtilities)){Exhibit.FacetUtilities.l10n={};
}Exhibit.FacetUtilities.l10n.clearSelectionsTooltip="Auswahl aufheben";
Exhibit.FacetUtilities.l10n.facetSelectActionTitle="Auswahl %0 in Facette %1";
Exhibit.FacetUtilities.l10n.facetUnselectActionTitle="Auswahl %0 in Facette %1 aufheben";
Exhibit.FacetUtilities.l10n.facetSelectOnlyActionTitle="Wähle nur %0 in Facette %1 aus";
Exhibit.FacetUtilities.l10n.facetClearSelectionsActionTitle="Lösche Auswahl in Facette %0";
Exhibit.FacetUtilities.l10n.facetTextSearchActionTitle="Textsuche %0";
Exhibit.FacetUtilities.l10n.facetClearTextSearchActionTitle="Textsuche zurücksetzen";
Exhibit.FacetUtilities.l10n.missingThisField="(Feld fehlt)";


/* views-l10n.js */
if(!("l10n" in Exhibit.ViewUtilities)){Exhibit.ViewUtilities.l10n={};
}Exhibit.ViewUtilities.l10n.unplottableMessageFormatter=function(B,A,C){var D=A.length;
return String.substitute("<a class='exhibit-action exhibit-views-unplottableCount' href='javascript:void' id='unplottableCountLink'>%0</a> von <class class='exhibit-views-totalCount'>%1</span> können nicht angezeigt werden.",[D==1?(D+" Ergebnis"):(D+" Ergebnisse"),B]);
};
