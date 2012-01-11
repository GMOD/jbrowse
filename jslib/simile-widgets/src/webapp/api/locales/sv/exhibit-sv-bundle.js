

/* database-l10n.js */
if(!("l10n" in Exhibit.Database)){Exhibit.Database.l10n={};
}Exhibit.Database.l10n.itemType={label:"Sak",pluralLabel:"Saker"};
Exhibit.Database.l10n.labelProperty={label:"etikett",pluralLabel:"etiketter",reverseLabel:"etikett till",reversePluralLabel:"etiketter till"};
Exhibit.Database.l10n.typeProperty={label:"typ",pluralLabel:"typer",reverseLabel:"typ av",reversePluralLabel:"typer av"};
Exhibit.Database.l10n.uriProperty={label:"URI",pluralLabel:"URIer",reverseLabel:"URI för",reversePluralLabel:"URIer för"};
Exhibit.Database.l10n.sortLabels={"text":{ascending:"a - z",descending:"z - a"},"number":{ascending:"lägst först",descending:"högst först"},"date":{ascending:"tidigast först",descending:"nyligast först"},"boolean":{ascending:"falskt först",descending:"sant först"},"item":{ascending:"a - z",descending:"z - a"}};


/* exhibit-l10n.js */
if(!("l10n" in Exhibit)){Exhibit.l10n={};
}Exhibit.l10n.missingLabel="saknas";
Exhibit.l10n.missingSortKey="(saknas)";
Exhibit.l10n.notApplicableSortKey="(n/a)";
Exhibit.l10n.itemLinkLabel="länk";
Exhibit.l10n.busyIndicatorMessage="Arbetar...";
Exhibit.l10n.showDocumentationMessage="Relevant dokumentation kommer visas efter det här meddelandet.";
Exhibit.l10n.showJavascriptValidationMessage="Felet förklaras mer ingående efter det här meddelandet.";
Exhibit.l10n.showJsonValidationMessage="Felet förklaras mer ingående efter det här meddelandet.";
Exhibit.l10n.showJsonValidationFormMessage="Vi skickar dig till en webtjänst du kan ladda upp din kod till för felsökning efter det här meddelandet.";
Exhibit.l10n.badJsonMessage=function(A,B){return"JSON-filen\n  "+A+"\ninnehåller fel =\n\n"+B;
};
Exhibit.l10n.failedToLoadDataFileMessage=function(A){return"Kunde inte hitta filen\n  "+A+"\nKontrollera att filnamnet är korrekt.";
};
Exhibit.l10n.copyButtonLabel="Kopiera";
Exhibit.l10n.copyAllButtonLabel="Kopiera allt";
Exhibit.l10n.copyDialogBoxCloseButtonLabel="Stäng";
Exhibit.l10n.copyDialogBoxPrompt="Kopiera det här till klippbordet precis som du skulle göra för annan text. Tryck ESC för att stänga den här dialogen.";
Exhibit.l10n.focusDialogBoxCloseButtonLabel="Stäng";
Exhibit.l10n.rdfXmlExporterLabel="RDF/XML";
Exhibit.l10n.smwExporterLabel="Semantisk wikitext";
Exhibit.l10n.exhibitJsonExporterLabel="Exhibit JSON";
Exhibit.l10n.tsvExporterLabel="Tabseparerade värden";
Exhibit.l10n.htmlExporterLabel="HTML för den här vyn";


/* formatter-l10n.js */
if(!("l10n" in Exhibit.Formatter)){Exhibit.Formatter.l10n={};
}Exhibit.Formatter.l10n.listSeparator=", ";
Exhibit.Formatter.l10n.listLastSeparator=", och ";
Exhibit.Formatter.l10n.listPairSeparator=" och ";
Exhibit.Formatter.l10n.textEllipsis="...";
Exhibit.Formatter.l10n.booleanTrue="true";
Exhibit.Formatter.l10n.booleanFalse="false";
Exhibit.Formatter.l10n.currencySymbol="$";
Exhibit.Formatter.l10n.currencySymbolPlacement="first";
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
Exhibit.Formatter.l10n.shortDaysOfWeek=["Sun","Mon","Tue","Wed","Thr","Fri","Sat"];
Exhibit.Formatter.l10n.daysOfWeek=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
Exhibit.Formatter.l10n.shortMonths=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
Exhibit.Formatter.l10n.months=["January","February","March","April","May","June","July","August","September","October","November","December"];
Exhibit.Formatter.l10n.commonEra="CE";
Exhibit.Formatter.l10n.beforeCommonEra="BCE";
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
}Exhibit.OrderedViewFrame.l10n.removeOrderLabel="Ta bort det här sorteringskriteriet";
Exhibit.OrderedViewFrame.l10n.sortingControlsTemplate="sorterat efter: <span id='ordersSpan'></span>; <a id='thenSortByAction' href='javascript:void' class='exhibit-action' title='sortera ytterligare'>then by...</a>";
Exhibit.OrderedViewFrame.l10n.formatSortActionTitle=function(B,A){return"Sorterat efter "+B+" ("+A+")";
};
Exhibit.OrderedViewFrame.l10n.formatRemoveOrderActionTitle=function(B,A){return"Ta bort sorteringskriteriet "+B+" ("+A+")";
};
Exhibit.OrderedViewFrame.l10n.groupedAsSortedOptionLabel="gruppera som de sorterats";
Exhibit.OrderedViewFrame.l10n.groupAsSortedActionTitle="grupperade som de sorterats";
Exhibit.OrderedViewFrame.l10n.ungroupAsSortedActionTitle="ogrupperade";
Exhibit.OrderedViewFrame.l10n.showAllActionTitle="show all results";
Exhibit.OrderedViewFrame.l10n.dontShowAllActionTitle="show first few results";
Exhibit.OrderedViewFrame.l10n.formatDontShowAll=function(A){return"Visa bara de första "+A+" resultaten";
};
Exhibit.OrderedViewFrame.l10n.formatShowAll=function(A){return"Visa samtliga "+A+" resultat";
};


/* tabular-view-l10n.js */
if(!("l10n" in Exhibit.TabularView)){Exhibit.TabularView.l10n={};
}Exhibit.TabularView.l10n.viewLabel="Tabell";
Exhibit.TabularView.l10n.viewTooltip="Visa i tabell";
Exhibit.TabularView.l10n.columnHeaderSortTooltip="Klicka för att sortera efter den här kolumnen";
Exhibit.TabularView.l10n.columnHeaderReSortTooltip="Klicka för att välja omvänd ordning";
Exhibit.TabularView.l10n.makeSortActionTitle=function(A,B){return"sortera efter "+(B?"stigande ":"fallande ")+A;
};


/* thumbnail-view-l10n.js */
if(!("l10n" in Exhibit.ThumbnailView)){Exhibit.ThumbnailView.l10n={};
}Exhibit.ThumbnailView.l10n.viewLabel="Tumnaglar";
Exhibit.ThumbnailView.l10n.viewTooltip="Visa som tumnaglar";


/* tile-view-l10n.js */
if(!("l10n" in Exhibit.TileView)){Exhibit.TileView.l10n={};
}Exhibit.TileView.l10n.viewLabel="Lista";
Exhibit.TileView.l10n.viewTooltip="Visa som lista";


/* view-panel-l10n.js */
if(!("l10n" in Exhibit.ViewPanel)){Exhibit.ViewPanel.l10n={};
}Exhibit.ViewPanel.l10n.createSelectViewActionTitle=function(A){return"välj vyn "+A;
};
Exhibit.ViewPanel.l10n.missingViewClassMessage="Specifikationen för en av vyerna saknas i fältet viewClass.";
Exhibit.ViewPanel.l10n.viewClassNotFunctionMessage=function(A){return"Värdet '"+A+"' du angivit för attributet viewClass\nför en av dessa vyer var inte namnet på en javascriptfunktion.";
};
Exhibit.ViewPanel.l10n.badViewClassMessage=function(A){return"Värdet '"+A+"' du angivit för attributet viewClass\nför en av dessa vyer är inte ett giltigt javascriptuttryck.";
};


/* collection-summary-widget-l10n.js */
if(!("l10n" in Exhibit.CollectionSummaryWidget)){Exhibit.CollectionSummaryWidget.l10n={};
}Exhibit.CollectionSummaryWidget.l10n.resetFiltersLabel="visa alla";
Exhibit.CollectionSummaryWidget.l10n.resetFiltersTooltip="Välj bort några filter för fler resultat.";
Exhibit.CollectionSummaryWidget.l10n.resetActionTitle="visa alla";
Exhibit.CollectionSummaryWidget.l10n.allResultsTemplate="<span class='%0' id='resultDescription'></span>";
Exhibit.CollectionSummaryWidget.l10n.noResultsTemplate="<span class='%0'>0</span> <span class='%1' id='typesSpan'>resultat</span>. (<span id='resetActionLink'></span>)";
Exhibit.CollectionSummaryWidget.l10n.filteredResultsTemplate="<span class='%0' id='resultDescription'></span> av <span id='originalCountSpan'>0</span> totalt. (<span id='resetActionLink'></span>)";


/* coders-l10n.js */
if(!("l10n" in Exhibit.Coders)){Exhibit.Coders.l10n={};
}Exhibit.Coders.l10n.mixedCaseLabel="mixed";
Exhibit.Coders.l10n.missingCaseLabel="missing";
Exhibit.Coders.l10n.othersCaseLabel="others";


/* facets-l10n.js */
if(!("l10n" in Exhibit.FacetUtilities)){Exhibit.FacetUtilities.l10n={};
}Exhibit.FacetUtilities.l10n.clearSelectionsTooltip="ångra dessa val";
Exhibit.FacetUtilities.l10n.facetSelectActionTitle="Select %0 in facet %1";
Exhibit.FacetUtilities.l10n.facetUnselectActionTitle="Unselect %0 in facet %1";
Exhibit.FacetUtilities.l10n.facetSelectOnlyActionTitle="Select only %0 in facet %1";
Exhibit.FacetUtilities.l10n.facetClearSelectionsActionTitle="Clear selections in facet %0";
Exhibit.FacetUtilities.l10n.facetTextSearchActionTitle="Text search %0";
Exhibit.FacetUtilities.l10n.facetClearTextSearchActionTitle="Clear text search";
Exhibit.FacetUtilities.l10n.missingThisField="(missing this field)";


/* views-l10n.js */
if(!("l10n" in Exhibit.ViewUtilities)){Exhibit.ViewUtilities.l10n={};
}Exhibit.ViewUtilities.l10n.unplottableMessageFormatter=function(B,A,C){var D=A.length;
return String.substitute("<a class='exhibit-action exhibit-views-unplottableCount' href='javascript:void' id='unplottableCountLink'>%0</a> out of <class class='exhibit-views-totalCount'>%1</span> cannot be plotted.",[D==1?(D+" result"):(D+" results"),B]);
};
