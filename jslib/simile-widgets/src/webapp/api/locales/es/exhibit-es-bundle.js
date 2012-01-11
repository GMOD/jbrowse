

/* database-l10n.js */
if(!("l10n" in Exhibit.Database)){Exhibit.Database.l10n={};
}Exhibit.Database.l10n.itemType={label:"Elemento",pluralLabel:"Elementos"};
Exhibit.Database.l10n.labelProperty={label:"etiqueta",pluralLabel:"etiquetas",reverseLabel:"etiqueta de",reversePluralLabel:"etiquetas de"};
Exhibit.Database.l10n.typeProperty={label:"tipo",pluralLabel:"tipos",reverseLabel:"tipo de",reversePluralLabel:"tipos de"};
Exhibit.Database.l10n.uriProperty={label:"URI",pluralLabel:"URIs",reverseLabel:"URI de",reversePluralLabel:"URIs de"};
Exhibit.Database.l10n.sortLabels={"text":{ascending:"a - z",descending:"z - a"},"number":{ascending:"menor primero",descending:"mayor primero"},"date":{ascending:"la más antigua primero",descending:"la más reciente primero"},"boolean":{ascending:"falso primero",descending:"verdadero primero"},"item":{ascending:"a - z",descending:"z - a"}};


/* exhibit-l10n.js */
if(!("l10n" in Exhibit)){Exhibit.l10n={};
}Exhibit.l10n.missingLabel="falta";
Exhibit.l10n.missingSortKey="(falta)";
Exhibit.l10n.notApplicableSortKey="(n/a)";
Exhibit.l10n.itemLinkLabel="link";
Exhibit.l10n.busyIndicatorMessage="Procesando...";
Exhibit.l10n.showDocumentationMessage="Te enseñaremos la documentación asociada después de este mensaje.";
Exhibit.l10n.showJavascriptValidationMessage="Te explicaremos los detalles del error después de este mensaje.";
Exhibit.l10n.showJsonValidationMessage="Te explicaremos los detalles del error después de este mensaje.";
Exhibit.l10n.showJsonValidationFormMessage="Te redirigiremos a un servicio web donde podrás subir y verificar tu código después de este mensaje.";
Exhibit.l10n.badJsonMessage=function(A,B){return"El fichero de datos JSON\n  "+A+"\ncontiene errores =\n\n"+B;
};
Exhibit.l10n.failedToLoadDataFileMessage=function(A){return"No podemos localizar el fichero de datos\n  "+A+"\nComprueba que el nombre del archivo es correcto.";
};
Exhibit.l10n.copyButtonLabel="Copiar";
Exhibit.l10n.copyAllButtonLabel="Copiar todo";
Exhibit.l10n.copyDialogBoxCloseButtonLabel="Cerrar";
Exhibit.l10n.copyDialogBoxPrompt="Copia este código en tu clipboard como si fuera texto. Pulsa ESC para cerrar este cuadro de diálogo.";
Exhibit.l10n.focusDialogBoxCloseButtonLabel="Cerrar";
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
}Exhibit.OrderedViewFrame.l10n.removeOrderLabel="Eliminar este orden";
Exhibit.OrderedViewFrame.l10n.sortingControlsTemplate="ordenados por: <span id='ordersSpan'></span>; <a id='thenSortByAction' href='javascript:void' class='exhibit-action' title='Seguir ordenando elementos'>luego por...</a>";
Exhibit.OrderedViewFrame.l10n.formatSortActionTitle=function(B,A){return"Ordenados por "+B+" ("+A+")";
};
Exhibit.OrderedViewFrame.l10n.formatRemoveOrderActionTitle=function(B,A){return"Eliminar ordenación por "+B+" ("+A+")";
};
Exhibit.OrderedViewFrame.l10n.groupedAsSortedOptionLabel="agrupar según orden";
Exhibit.OrderedViewFrame.l10n.groupAsSortedActionTitle="agrupar según orden";
Exhibit.OrderedViewFrame.l10n.ungroupAsSortedActionTitle="sin agrupar";
Exhibit.OrderedViewFrame.l10n.showAllActionTitle="show all results";
Exhibit.OrderedViewFrame.l10n.dontShowAllActionTitle="show first few results";
Exhibit.OrderedViewFrame.l10n.formatDontShowAll=function(A){return"Mostrar solamente "+A+" resultados";
};
Exhibit.OrderedViewFrame.l10n.formatShowAll=function(A){return"Mostrar "+A+" resultados";
};


/* tabular-view-l10n.js */
if(!("l10n" in Exhibit.TabularView)){Exhibit.TabularView.l10n={};
}Exhibit.TabularView.l10n.viewLabel="Tabla";
Exhibit.TabularView.l10n.viewTooltip="Ver elementos como una tabla";
Exhibit.TabularView.l10n.columnHeaderSortTooltip="Click para ordenar por esta columna";
Exhibit.TabularView.l10n.columnHeaderReSortTooltip="Click para ordenar inversamente";
Exhibit.TabularView.l10n.makeSortActionTitle=function(A,B){return(B?"ordenado acendentemente por ":"ordenado descendentemente por ")+A;
};


/* thumbnail-view-l10n.js */
if(!("l10n" in Exhibit.ThumbnailView)){Exhibit.ThumbnailView.l10n={};
}Exhibit.ThumbnailView.l10n.viewLabel="Thumbnails";
Exhibit.ThumbnailView.l10n.viewTooltip="Ver elementos como iconos";


/* tile-view-l10n.js */
if(!("l10n" in Exhibit.TileView)){Exhibit.TileView.l10n={};
}Exhibit.TileView.l10n.viewLabel="Tiles";
Exhibit.TileView.l10n.viewTooltip="Ver elementos en una lista detallada";


/* view-panel-l10n.js */
if(!("l10n" in Exhibit.ViewPanel)){Exhibit.ViewPanel.l10n={};
}Exhibit.ViewPanel.l10n.createSelectViewActionTitle=function(A){return"selecciona "+A+" vista";
};
Exhibit.ViewPanel.l10n.missingViewClassMessage="En la especificación de una de las vistas falta el campo viewClass.";
Exhibit.ViewPanel.l10n.viewClassNotFunctionMessage=function(A){return"El valor del atributo viewClass '"+A+"' espeficicado\nen una de las vistas no se corresponde con una función Javascript.";
};
Exhibit.ViewPanel.l10n.badViewClassMessage=function(A){return"El valor del atributo viewClass '"+A+"' especificado\nen una de las vistas no es una expresión Javascript válida.";
};


/* collection-summary-widget-l10n.js */
if(!("l10n" in Exhibit.CollectionSummaryWidget)){Exhibit.CollectionSummaryWidget.l10n={};
}Exhibit.CollectionSummaryWidget.l10n.resetFiltersLabel="Reset All Filters";
Exhibit.CollectionSummaryWidget.l10n.resetFiltersTooltip="Elimina algunos filtros para obtener resultados.";
Exhibit.CollectionSummaryWidget.l10n.resetActionTitle="Reset all filters";
Exhibit.CollectionSummaryWidget.l10n.allResultsTemplate="<span class='%0' id='resultDescription'></span>";
Exhibit.CollectionSummaryWidget.l10n.noResultsTemplate="<span class='%0'>0</span> <span class='%1' id='typesSpan'>resultados</span> (<span id='resetActionLink'></span>)";
Exhibit.CollectionSummaryWidget.l10n.filteredResultsTemplate="<span class='%0' id='resultDescription'></span> filtered from <span id='originalCountSpan'>0</span> originally (<span id='resetActionLink'></span>)";


/* coders-l10n.js */
if(!("l10n" in Exhibit.Coders)){Exhibit.Coders.l10n={};
}Exhibit.Coders.l10n.mixedCaseLabel="mixed";
Exhibit.Coders.l10n.missingCaseLabel="missing";
Exhibit.Coders.l10n.othersCaseLabel="others";


/* facets-l10n.js */
if(!("l10n" in Exhibit.FacetUtilities)){Exhibit.FacetUtilities.l10n={};
}Exhibit.FacetUtilities.l10n.clearSelectionsTooltip="Eliminar estas selecciones";
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
