

/* database-l10n.js */
if(!("l10n" in Exhibit.Database)){Exhibit.Database.l10n={};
}Exhibit.Database.l10n.itemType={label:"Item",pluralLabel:"Items",uri:"http://simile.mit.edu/2006/11/exhibit#Item"};
Exhibit.Database.l10n.labelProperty={label:"label",pluralLabel:"labels",reverseLabel:"label of",reversePluralLabel:"labels of"};
Exhibit.Database.l10n.typeProperty={label:"type",pluralLabel:"types",reverseLabel:"type of",reversePluralLabel:"types of"};
Exhibit.Database.l10n.uriProperty={label:"URI",pluralLabel:"URIs",reverseLabel:"URI of",reversePluralLabel:"URIs of"};
Exhibit.Database.l10n.sortLabels={"text":{ascending:"a - z",descending:"z - a"},"number":{ascending:"smallest first",descending:"largest first"},"date":{ascending:"earliest first",descending:"latest first"},"boolean":{ascending:"false first",descending:"true first"},"item":{ascending:"a - z",descending:"z - a"}};
Exhibit.Database.l10n.labelItemsOfType=function(D,B,I,A){var G=Exhibit.Database.l10n.itemType.label;
var C="个";
var F=I.getType(B);
if(F){G=F.getLabel();
var E=F.getProperty("measureWord");
if(E){C=E;
}}var H=document.createElement("span");
H.innerHTML="<span class='"+A+"'>"+D+"</span>"+C+G;
return H;
};


/* exhibit-l10n.js */
if(!("l10n" in Exhibit)){Exhibit.l10n={};
}Exhibit.l10n.missingLabel="missing";
Exhibit.l10n.missingSortKey="(missing)";
Exhibit.l10n.notApplicableSortKey="(n/a)";
Exhibit.l10n.itemLinkLabel="link";
Exhibit.l10n.busyIndicatorMessage="Working...";
Exhibit.l10n.showDocumentationMessage="We will show the relevant documentation after this message.";
Exhibit.l10n.showJavascriptValidationMessage="We will explain the error in details after this message.";
Exhibit.l10n.showJsonValidationMessage="We will explain the error in details after this message.";
Exhibit.l10n.showJsonValidationFormMessage="We will browse to a web service where you can upload and check your code after this message.";
Exhibit.l10n.badJsonMessage=function(A,B){return"The JSON data file\n  "+A+"\ncontains errors =\n\n"+B;
};
Exhibit.l10n.failedToLoadDataFileMessage=function(A){return"We cannot locate the data file\n  "+A+"\nCheck that the file name is correct.";
};
Exhibit.l10n.exportButtonLabel="Export";
Exhibit.l10n.exportAllButtonLabel="Export All";
Exhibit.l10n.exportDialogBoxCloseButtonLabel="Close";
Exhibit.l10n.exportDialogBoxPrompt="Copy this code to your clipboard as you would copy any text. Press ESC to close this dialog box.";
Exhibit.l10n.focusDialogBoxCloseButtonLabel="Close";
Exhibit.l10n.rdfXmlExporterLabel="RDF/XML";
Exhibit.l10n.smwExporterLabel="Semantic wikitext";
Exhibit.l10n.exhibitJsonExporterLabel="Exhibit JSON";
Exhibit.l10n.tsvExporterLabel="Tab Separated Values";
Exhibit.l10n.htmlExporterLabel="Generated HTML of this view";


/* formatter-l10n.js */
if(!("l10n" in Exhibit.Formatter)){Exhibit.Formatter.l10n={};
}Exhibit.Formatter.l10n.listSeparator=", ";
Exhibit.Formatter.l10n.listLastSeparator=", and ";
Exhibit.Formatter.l10n.listPairSeparator=" and ";
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
}Exhibit.OrderedViewFrame.l10n.removeOrderLabel="Remove this order";
Exhibit.OrderedViewFrame.l10n.sortingControlsTemplate="sorted by: <span id='ordersSpan'></span>; <a id='thenSortByAction' href='javascript:void' class='exhibit-action' title='Further sort the items'>then by...</a>";
Exhibit.OrderedViewFrame.l10n.formatSortActionTitle=function(B,A){return"Sorted by "+B+" ("+A+")";
};
Exhibit.OrderedViewFrame.l10n.formatRemoveOrderActionTitle=function(B,A){return"Removed order by "+B+" ("+A+")";
};
Exhibit.OrderedViewFrame.l10n.groupedAsSortedOptionLabel="grouped as sorted";
Exhibit.OrderedViewFrame.l10n.groupAsSortedActionTitle="group as sorted";
Exhibit.OrderedViewFrame.l10n.ungroupAsSortedActionTitle="ungroup as sorted";
Exhibit.OrderedViewFrame.l10n.showAllActionTitle="show all results";
Exhibit.OrderedViewFrame.l10n.dontShowAllActionTitle="show first few results";
Exhibit.OrderedViewFrame.l10n.formatDontShowAll=function(A){return"Show only the first "+A+" results";
};
Exhibit.OrderedViewFrame.l10n.formatShowAll=function(A){return"Show all "+A+" results";
};


/* tabular-view-l10n.js */
if(!("l10n" in Exhibit.TabularView)){Exhibit.TabularView.l10n={};
}Exhibit.TabularView.l10n.viewLabel="Table";
Exhibit.TabularView.l10n.viewTooltip="View items in a table";
Exhibit.TabularView.l10n.columnHeaderSortTooltip="Click to sort by this column";
Exhibit.TabularView.l10n.columnHeaderReSortTooltip="Click to sort in the reverse order";
Exhibit.TabularView.l10n.makeSortActionTitle=function(A,B){return(B?"sorted ascending by ":"sorted descending by ")+A;
};


/* thumbnail-view-l10n.js */
if(!("l10n" in Exhibit.ThumbnailView)){Exhibit.ThumbnailView.l10n={};
}Exhibit.ThumbnailView.l10n.viewLabel="Thumbnails";
Exhibit.ThumbnailView.l10n.viewTooltip="View items as thumbnails";


/* tile-view-l10n.js */
if(!("l10n" in Exhibit.TileView)){Exhibit.TileView.l10n={};
}Exhibit.TileView.l10n.viewLabel="Tiles";
Exhibit.TileView.l10n.viewTooltip="View items as tiles in a list";


/* view-panel-l10n.js */
if(!("l10n" in Exhibit.ViewPanel)){Exhibit.ViewPanel.l10n={};
}Exhibit.ViewPanel.l10n.createSelectViewActionTitle=function(A){return"select "+A+" view";
};
Exhibit.ViewPanel.l10n.missingViewClassMessage="The specification for one of the views is missing the viewClass field.";
Exhibit.ViewPanel.l10n.viewClassNotFunctionMessage=function(A){return"The viewClass attribute value '"+A+"' you have specified\nfor one of the views does not evaluate to a Javascript function.";
};
Exhibit.ViewPanel.l10n.badViewClassMessage=function(A){return"The viewClass attribute value '"+A+"' you have specified\nfor one of the views is not a valid Javascript expression.";
};


/* collection-summary-widget-l10n.js */
if(!("l10n" in Exhibit.CollectionSummaryWidget)){Exhibit.CollectionSummaryWidget.l10n={};
}Exhibit.CollectionSummaryWidget.l10n.resetFiltersLabel="Reset All Filters";
Exhibit.CollectionSummaryWidget.l10n.resetFiltersTooltip="Clear all filters and see the original items";
Exhibit.CollectionSummaryWidget.l10n.resetActionTitle="Reset all filters";
Exhibit.CollectionSummaryWidget.l10n.allResultsTemplate="<span class='%0' id='resultDescription'></span>";
Exhibit.CollectionSummaryWidget.l10n.noResultsTemplate="<span class='%0'><span class='%1'>0</span> results</span> (<span id='resetActionLink'></span>)";
Exhibit.CollectionSummaryWidget.l10n.filteredResultsTemplate="<span class='%0' id='resultDescription'></span> filtered from <span id='originalCountSpan'>0</span> originally (<span id='resetActionLink'></span>)";


/* coders-l10n.js */
if(!("l10n" in Exhibit.Coders)){Exhibit.Coders.l10n={};
}Exhibit.Coders.l10n.mixedCaseLabel="mixed";
Exhibit.Coders.l10n.missingCaseLabel="missing";
Exhibit.Coders.l10n.othersCaseLabel="others";


/* facets-l10n.js */
if(!("l10n" in Exhibit.FacetUtilities)){Exhibit.FacetUtilities.l10n={};
}Exhibit.FacetUtilities.l10n.clearSelectionsTooltip="Clear these selections";
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
