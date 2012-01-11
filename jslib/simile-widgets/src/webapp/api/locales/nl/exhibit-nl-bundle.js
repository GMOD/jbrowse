

/* database-l10n.js */
if(!("l10n" in Exhibit.Database)){Exhibit.Database.l10n={};
}Exhibit.Database.l10n.itemType={label:"Element",pluralLabel:"Elemente",uri:"http://simile.mit.edu/2006/11/exhibit#Item"};
Exhibit.Database.l10n.labelProperty={label:"Bezeichnung",pluralLabel:"Bezeichnungen",reverseLabel:"Bezeichnung von",reversePluralLabel:"Bezeichnungen von"};
Exhibit.Database.l10n.typeProperty={label:"Type",pluralLabel:"Typen",reverseLabel:"Type van",reversePluralLabel:"Typen van"};
Exhibit.Database.l10n.uriProperty={label:"URI",pluralLabel:"URIs",reverseLabel:"URI van",reversePluralLabel:"URIs van"};
Exhibit.Database.l10n.sortLabels={"text":{ascending:"a - z",descending:"z - a"},"number":{ascending:"kleinste eerst",descending:"grootste eerst"},"date":{ascending:"eerste eerst",descending:"laatste eerst"},"boolean":{ascending:"foutief eerst",descending:"correct eerst"},"item":{ascending:"a - z",descending:"z - a"}};
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
}Exhibit.l10n.missingLabel="missend";
Exhibit.l10n.missingSortKey="(missend)";
Exhibit.l10n.notApplicableSortKey="(niet beschikbaar)";
Exhibit.l10n.itemLinkLabel="link";
Exhibit.l10n.busyIndicatorMessage="Even wachten aub...";
Exhibit.l10n.showDocumentationMessage="We zullen de relevante informatie tonen na dit bericht.";
Exhibit.l10n.showJavascriptValidationMessage="We zullen de fout gedetailleerd uitleggen na dit bericht.";
Exhibit.l10n.showJsonValidationMessage="We zullen de fout gedetailleerd uitleggen na dit bericht.";
Exhibit.l10n.showJsonValidationFormMessage="We zullen naar een website surfen waar u uw code kunt uploaden en checken..";
Exhibit.l10n.badJsonMessage=function(A,B){return"De JSON-data\n  "+A+"\nbevat fouten =\n\n"+B;
};
Exhibit.l10n.failedToLoadDataFileMessage=function(A){return"De data\n  "+A+"\nkan niet gevonden worden. Is de bestandsnaam wel correct?";
};
Exhibit.l10n.exportButtonLabel="Exporteren";
Exhibit.l10n.exportAllButtonLabel="Alles exporteren";
Exhibit.l10n.exportDialogBoxCloseButtonLabel="sluiten";
Exhibit.l10n.exportDialogBoxPrompt="Kopieer deze code naar het clipboard, zoals u ook zou doen met tekst. Druk op ESC om dit dialoogvenster te sluiten.";
Exhibit.l10n.focusDialogBoxCloseButtonLabel="Sluiten";
Exhibit.l10n.rdfXmlExporterLabel="RDF/XML";
Exhibit.l10n.smwExporterLabel="Semantische wikitekst";
Exhibit.l10n.exhibitJsonExporterLabel="Exhibit JSON";
Exhibit.l10n.tsvExporterLabel="Tab gescheiden waardes";
Exhibit.l10n.htmlExporterLabel="Generateer hier HTML van";


/* formatter-l10n.js */
if(!("l10n" in Exhibit.Formatter)){Exhibit.Formatter.l10n={};
}Exhibit.Formatter.l10n.listSeparator=", ";
Exhibit.Formatter.l10n.listLastSeparator=", en ";
Exhibit.Formatter.l10n.listPairSeparator=" en ";
Exhibit.Formatter.l10n.textEllipsis="...";
Exhibit.Formatter.l10n.booleanTrue="correct";
Exhibit.Formatter.l10n.booleanFalse="foutief";
Exhibit.Formatter.l10n.currencySymbol="$";
Exhibit.Formatter.l10n.currencySymbolPlacement="eerste";
Exhibit.Formatter.l10n.currencyShowSign=true;
Exhibit.Formatter.l10n.currencyShowRed=false;
Exhibit.Formatter.l10n.currencyShowParentheses=false;
Exhibit.Formatter.l10n.dateTimeDefaultFormat="EEE, MMM d, yyyy, hh:mm a";
Exhibit.Formatter.l10n.dateShortFormat="dd/MM/yy";
Exhibit.Formatter.l10n.timeShortFormat="hh:mm a";
Exhibit.Formatter.l10n.dateTimeShortFormat="dd/MM/yy hh:mm a";
Exhibit.Formatter.l10n.dateMediumFormat="EEE, MMM d, yyyy";
Exhibit.Formatter.l10n.timeMediumFormat="hh:mm a";
Exhibit.Formatter.l10n.dateTimeMediumFormat="EEE, MMM d, yyyy, hh:mm a";
Exhibit.Formatter.l10n.dateLongFormat="EEEE, MMMM d, yyyy";
Exhibit.Formatter.l10n.timeLongFormat="HH:mm:ss z";
Exhibit.Formatter.l10n.dateTimeLongFormat="EEEE, MMMM d, yyyy, HH:mm:ss z";
Exhibit.Formatter.l10n.dateFullFormat="EEEE, MMMM d, yyyy";
Exhibit.Formatter.l10n.timeFullFormat="HH:mm:ss.S z";
Exhibit.Formatter.l10n.dateTimeFullFormat="EEEE, MMMM d, yyyy G, HH:mm:ss.S z";
Exhibit.Formatter.l10n.shortDaysOfWeek=["zo","ma","di","wo","do","vr","za"];
Exhibit.Formatter.l10n.daysOfWeek=["zondag","maandag","dinsdag","woensdag","donderdag","vrijdag","zaterdag"];
Exhibit.Formatter.l10n.shortMonths=["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
Exhibit.Formatter.l10n.months=["Januari","februari","maart","april","mei","june","july","augustus","september","oktober","november","december"];
Exhibit.Formatter.l10n.commonEra="A.D.";
Exhibit.Formatter.l10n.beforeCommonEra="B.C.";
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
}Exhibit.OrderedViewFrame.l10n.removeOrderLabel="Verwijder deze sortering";
Exhibit.OrderedViewFrame.l10n.sortingControlsTemplate="Sortering: <span id='ordersSpan'></span>; <a id='thenSortByAction' href='javascript:void' class='exhibit-action' title='Sorteer deze items'>daarna door...</a>";
Exhibit.OrderedViewFrame.l10n.formatSortActionTitle=function(B,A){return"Sortering is "+B+" ("+A+")";
};
Exhibit.OrderedViewFrame.l10n.formatRemoveOrderActionTitle=function(B,A){return"Verwijder sortering "+B+" ("+A+")";
};
Exhibit.OrderedViewFrame.l10n.groupedAsSortedOptionLabel="Groepering zoals gesorteerd";
Exhibit.OrderedViewFrame.l10n.groupAsSortedActionTitle="Groepeer zoals gesorteerd";
Exhibit.OrderedViewFrame.l10n.ungroupAsSortedActionTitle="Hef groupering zoals gesorteerd op";
Exhibit.OrderedViewFrame.l10n.showAllActionTitle="Toon alle resultaten";
Exhibit.OrderedViewFrame.l10n.dontShowAllActionTitle="Toon alleen de eerste paar resultaten";
Exhibit.OrderedViewFrame.l10n.formatDontShowAll=function(A){return"Toon alleen de eerste "+A+" resultaten";
};
Exhibit.OrderedViewFrame.l10n.formatShowAll=function(A){return"Toon alle "+A+" resultaten";
};


/* tabular-view-l10n.js */
if(!("l10n" in Exhibit.TabularView)){Exhibit.TabularView.l10n={};
}Exhibit.TabularView.l10n.viewLabel="Tabel";
Exhibit.TabularView.l10n.viewTooltip="Toon items in een tabel";
Exhibit.TabularView.l10n.columnHeaderSortTooltip="Klik om deze kolom te sorteren";
Exhibit.TabularView.l10n.columnHeaderReSortTooltip="Klik om deze kolom te sorteren in omgekeerde volgorder";
Exhibit.TabularView.l10n.makeSortActionTitle=function(A,B){return(B?"Sorteer oplopend ":"sorteer aflopend ")+A;
};


/* thumbnail-view-l10n.js */
if(!("l10n" in Exhibit.ThumbnailView)){Exhibit.ThumbnailView.l10n={};
}Exhibit.ThumbnailView.l10n.viewLabel="Miniaturen";
Exhibit.ThumbnailView.l10n.viewTooltip="Toon items als miniaturen";


/* tile-view-l10n.js */
if(!("l10n" in Exhibit.TileView)){Exhibit.TileView.l10n={};
}Exhibit.TileView.l10n.viewLabel="Tegels";
Exhibit.TileView.l10n.viewTooltip="Toon items als tegels in een lijst";


/* view-panel-l10n.js */
if(!("l10n" in Exhibit.ViewPanel)){Exhibit.ViewPanel.l10n={};
}Exhibit.ViewPanel.l10n.createSelectViewActionTitle=function(A){return"selecteer "+A+" toon";
};
Exhibit.ViewPanel.l10n.missingViewClassMessage="De beschrijving voor een van de zichten mist het viewClass-veld.";
Exhibit.ViewPanel.l10n.viewClassNotFunctionMessage=function(A){return"De waarde van het viewClass attribuut '"+A+"' die u heeft aangegeven\nvoor een van de zichten lijkt geen javascriptfunctie te zijn.";
};
Exhibit.ViewPanel.l10n.badViewClassMessage=function(A){return"De waarde van het viewClass attribuut '"+A+"' die u heeft aangegeven\nvoor een van de zichten lijkt geen javascriptexpressie te zijn.";
};


/* collection-summary-widget-l10n.js */
if(!("l10n" in Exhibit.CollectionSummaryWidget)){Exhibit.CollectionSummaryWidget.l10n={};
}Exhibit.CollectionSummaryWidget.l10n.resetFiltersLabel="Reset alle filters";
Exhibit.CollectionSummaryWidget.l10n.resetFiltersTooltip="Maak alle filters leeg en toon de oorspronkelijke items";
Exhibit.CollectionSummaryWidget.l10n.resetActionTitle="Reset alle filters";
Exhibit.CollectionSummaryWidget.l10n.allResultsTemplate="<span class='%0' id='resultDescription'></span>";
Exhibit.CollectionSummaryWidget.l10n.noResultsTemplate="<span class='%0'><span class='%1'>0</span> resultaten</span> (<span id='resetActionLink'></span>)";
Exhibit.CollectionSummaryWidget.l10n.filteredResultsTemplate="<span class='%0' id='resultDescription'></span> <span id='originalCountSpan'>0</span> gefilterd van oorspronkelijk (<span id='resetActionLink'></span>)";


/* coders-l10n.js */
if(!("l10n" in Exhibit.Coders)){Exhibit.Coders.l10n={};
}Exhibit.Coders.l10n.mixedCaseLabel="mixed";
Exhibit.Coders.l10n.missingCaseLabel="missend";
Exhibit.Coders.l10n.othersCaseLabel="anders";


/* facets-l10n.js */
if(!("l10n" in Exhibit.FacetUtilities)){Exhibit.FacetUtilities.l10n={};
}Exhibit.FacetUtilities.l10n.clearSelectionsTooltip="Maak deze selecties leeg";
Exhibit.FacetUtilities.l10n.facetSelectActionTitle="Selecteer %0 in facet %1";
Exhibit.FacetUtilities.l10n.facetUnselectActionTitle="Hef selectie %0 in facet %1 op";
Exhibit.FacetUtilities.l10n.facetSelectOnlyActionTitle="Selecteer alleen %0 in facet %1";
Exhibit.FacetUtilities.l10n.facetClearSelectionsActionTitle="Maak selecties in facet %0 leeg";
Exhibit.FacetUtilities.l10n.facetTextSearchActionTitle="Tekst doorzoeken %0";
Exhibit.FacetUtilities.l10n.facetClearTextSearchActionTitle="Maak veld tekst doorzoeken leeg";
Exhibit.FacetUtilities.l10n.missingThisField="(mist dit veld)";


/* views-l10n.js */
if(!("l10n" in Exhibit.ViewUtilities)){Exhibit.ViewUtilities.l10n={};
}Exhibit.ViewUtilities.l10n.unplottableMessageFormatter=function(B,A,C){var D=A.length;
return String.substitute("<a class='exhibit-action exhibit-views-unplottableCount' href='javascript:void' id='unplottableCountLink'>%0</a> van <class class='exhibit-views-totalCount'>%1</span>  kan niet worden afgebeeld.",[D==1?(D+" result"):(D+" results"),B]);
};
