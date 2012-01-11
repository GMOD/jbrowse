

/* database-l10n.js */
if(!("l10n" in Exhibit.Database)){Exhibit.Database.l10n={};
}Exhibit.Database.l10n.itemType={label:"Item",pluralLabel:"Items",uri:"http://simile.mit.edu/2006/11/exhibit#Item"};
Exhibit.Database.l10n.labelProperty={label:"libellé",pluralLabel:"libellés",reverseLabel:"libellé de",reversePluralLabel:"libellés de"};
Exhibit.Database.l10n.typeProperty={label:"type",pluralLabel:"types",reverseLabel:"type de",reversePluralLabel:"types de"};
Exhibit.Database.l10n.uriProperty={label:"URI",pluralLabel:"URIs",reverseLabel:"URI de",reversePluralLabel:"URIs de"};
Exhibit.Database.l10n.sortLabels={"text":{ascending:"a - z",descending:"z - a"},"number":{ascending:"du plus petit au plus grand",descending:"du plus grand au plus petit"},"date":{ascending:"du plus ancien au plus récent",descending:"du plus récent au plus ancien"},"boolean":{ascending:"faux en premier",descending:"vrai en premier"},"item":{ascending:"a - z",descending:"z - a"}};
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
}Exhibit.l10n.missingLabel="manquant";
Exhibit.l10n.missingSortKey="(manquant)";
Exhibit.l10n.notApplicableSortKey="(n/a)";
Exhibit.l10n.itemLinkLabel="lien";
Exhibit.l10n.busyIndicatorMessage="Traitement en cours...";
Exhibit.l10n.showDocumentationMessage="Vous verrez la documentation appropriée après ce message.";
Exhibit.l10n.showJavascriptValidationMessage="Vous aurez l'explication détaillée de l'erreur après ce message.";
Exhibit.l10n.showJsonValidationMessage="Vous aurez l'explication détaillée de l'erreur après ce message.";
Exhibit.l10n.showJsonValidationFormMessage="Après ce message, vous accéderez à un service web sur lequel vous pourrez transmettre et vérifier votre code.";
Exhibit.l10n.badJsonMessage=function(A,B){return"Le fichier de données JSON\n  "+A+"\ncontient des erreurs :\n\n"+B;
};
Exhibit.l10n.failedToLoadDataFileMessage=function(A){return"Impossible de trouver le fichier de données\n  "+A+"\nVérifiez que le nom du fichier est correct.";
};
Exhibit.l10n.exportButtonLabel="Exporter";
Exhibit.l10n.exportAllButtonLabel="Tout exporter";
Exhibit.l10n.exportDialogBoxCloseButtonLabel="Fermer";
Exhibit.l10n.exportDialogBoxPrompt="Copiez ce code dans votre presse-papier comme vous le feriez pour un texte. Appuyez sur ESC pour fermer cette fenêtre.";
Exhibit.l10n.focusDialogBoxCloseButtonLabel="Fermer";
Exhibit.l10n.rdfXmlExporterLabel="RDF/XML";
Exhibit.l10n.smwExporterLabel="Semantic wikitext";
Exhibit.l10n.exhibitJsonExporterLabel="Exhibit JSON";
Exhibit.l10n.tsvExporterLabel="Valeurs séparées par tabulation";
Exhibit.l10n.htmlExporterLabel="Exportation HTML";


/* formatter-l10n.js */
if(!("l10n" in Exhibit.Formatter)){Exhibit.Formatter.l10n={};
}Exhibit.Formatter.l10n.listSeparator=", ";
Exhibit.Formatter.l10n.listLastSeparator=", et ";
Exhibit.Formatter.l10n.listPairSeparator=" et ";
Exhibit.Formatter.l10n.textEllipsis="...";
Exhibit.Formatter.l10n.booleanTrue="vrai";
Exhibit.Formatter.l10n.booleanFalse="faux";
Exhibit.Formatter.l10n.currencySymbol="€";
Exhibit.Formatter.l10n.currencySymbolPlacement="last";
Exhibit.Formatter.l10n.currencyShowSign=true;
Exhibit.Formatter.l10n.currencyShowRed=false;
Exhibit.Formatter.l10n.currencyShowParentheses=false;
Exhibit.Formatter.l10n.dateTimeDefaultFormat="EEE d MMM yyyy, hh:mm a";
Exhibit.Formatter.l10n.dateShortFormat="dd/MM/yy";
Exhibit.Formatter.l10n.timeShortFormat="hh:mm a";
Exhibit.Formatter.l10n.dateTimeShortFormat="dd/MM/yy hh:mm a";
Exhibit.Formatter.l10n.dateMediumFormat="EEE d MMM yyyy";
Exhibit.Formatter.l10n.timeMediumFormat="hh:mm a";
Exhibit.Formatter.l10n.dateTimeMediumFormat="EEE d MMM yyyy, hh:mm a";
Exhibit.Formatter.l10n.dateLongFormat="EEE d MMM yyyy";
Exhibit.Formatter.l10n.timeLongFormat="HH:mm:ss z";
Exhibit.Formatter.l10n.dateTimeLongFormat="EEE d MMM yyyy, HH:mm:ss z";
Exhibit.Formatter.l10n.dateFullFormat="EEE d MMM yyyy";
Exhibit.Formatter.l10n.timeFullFormat="HH:mm:ss.S z";
Exhibit.Formatter.l10n.dateTimeFullFormat="EEEE d MMM yyyy G, HH:mm:ss.S z";
Exhibit.Formatter.l10n.shortDaysOfWeek=["Dim","Lun","Mar","Mer","Jeu","Ven","Sam"];
Exhibit.Formatter.l10n.daysOfWeek=["Dimanche","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
Exhibit.Formatter.l10n.shortMonths=["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aou","Sep","Oct","Nov","Déc"];
Exhibit.Formatter.l10n.months=["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
Exhibit.Formatter.l10n.commonEra="ap J-C";
Exhibit.Formatter.l10n.beforeCommonEra="av J-C";
Exhibit.Formatter.l10n.beforeNoon="mat";
Exhibit.Formatter.l10n.afterNoon="a-m";
Exhibit.Formatter.l10n.BeforeNoon="MAT";
Exhibit.Formatter.l10n.AfterNoon="A-M";


/* lens-l10n.js */
if(!("l10n" in Exhibit.Lens)){Exhibit.Lens.l10n={};
}

/* ui-context-l10n.js */
if(!("l10n" in Exhibit.UIContext)){Exhibit.UIContext.l10n={};
}Exhibit.UIContext.l10n.initialSettings={"bubbleWidth":400,"bubbleHeight":300};


/* ordered-view-frame-l10n.js */
if(!("l10n" in Exhibit.OrderedViewFrame)){Exhibit.OrderedViewFrame.l10n={};
}Exhibit.OrderedViewFrame.l10n.removeOrderLabel="Retirer ce critère";
Exhibit.OrderedViewFrame.l10n.sortingControlsTemplate="Trier par : <span id='ordersSpan'></span>, <a id='thenSortByAction' href='javascript:void' class='exhibit-action' title='Ajouter un item'>puis par...</a>";
Exhibit.OrderedViewFrame.l10n.formatSortActionTitle=function(B,A){return"Trier par "+B+" ("+A+")";
};
Exhibit.OrderedViewFrame.l10n.formatRemoveOrderActionTitle=function(B,A){return"Critère de tri retiré : "+B+" ("+A+")";
};
Exhibit.OrderedViewFrame.l10n.groupedAsSortedOptionLabel="Grouper selon le tri";
Exhibit.OrderedViewFrame.l10n.groupAsSortedActionTitle="Grouper selon le tri";
Exhibit.OrderedViewFrame.l10n.ungroupAsSortedActionTitle="Dégrouper selon le tri";
Exhibit.OrderedViewFrame.l10n.showAllActionTitle="Voir tous les résultats";
Exhibit.OrderedViewFrame.l10n.dontShowAllActionTitle="Voir les premiers résultats";
Exhibit.OrderedViewFrame.l10n.formatDontShowAll=function(A){return"Montrer seulement les "+A+" premiers résultats";
};
Exhibit.OrderedViewFrame.l10n.formatShowAll=function(A){return"Montrer l'ensemble des "+A+" résultats";
};


/* tabular-view-l10n.js */
if(!("l10n" in Exhibit.TabularView)){Exhibit.TabularView.l10n={};
}Exhibit.TabularView.l10n.viewLabel="Tableau";
Exhibit.TabularView.l10n.viewTooltip="Voir les items dans un tableau";
Exhibit.TabularView.l10n.columnHeaderSortTooltip="Cliquer pour trier sur cette colonne";
Exhibit.TabularView.l10n.columnHeaderReSortTooltip="Cliquer pour trier dans l'ordre inverse";
Exhibit.TabularView.l10n.makeSortActionTitle=function(A,B){return(B?"triés par ordre croissant selon ":"triés par ordre décroissant selon ")+A;
};


/* thumbnail-view-l10n.js */
if(!("l10n" in Exhibit.ThumbnailView)){Exhibit.ThumbnailView.l10n={};
}Exhibit.ThumbnailView.l10n.viewLabel="Vignettes";
Exhibit.ThumbnailView.l10n.viewTooltip="Voir les items commes des vignettes";


/* tile-view-l10n.js */
if(!("l10n" in Exhibit.TileView)){Exhibit.TileView.l10n={};
}Exhibit.TileView.l10n.viewLabel="Blocs";
Exhibit.TileView.l10n.viewTooltip="Voir les items sous forme de blocs dans une liste";


/* view-panel-l10n.js */
if(!("l10n" in Exhibit.ViewPanel)){Exhibit.ViewPanel.l10n={};
}Exhibit.ViewPanel.l10n.createSelectViewActionTitle=function(A){return"Sélectionner la vue "+A;
};
Exhibit.ViewPanel.l10n.missingViewClassMessage="La spécification pour une des vues ne contient pas le champ viewClass.";
Exhibit.ViewPanel.l10n.viewClassNotFunctionMessage=function(A){return"La valeur '"+A+"' de l'attribut viewClass que vous avez spécifiée\npour une des vues ne correspond pas à une fonction Javascript.";
};
Exhibit.ViewPanel.l10n.badViewClassMessage=function(A){return"La valeur '"+A+"' de l'attribut viewClass que vous avez spécifiée\npour une des vues n'est pas une expression Javascript valide.";
};


/* collection-summary-widget-l10n.js */
if(!("l10n" in Exhibit.CollectionSummaryWidget)){Exhibit.CollectionSummaryWidget.l10n={};
}Exhibit.CollectionSummaryWidget.l10n.resetFiltersLabel="Réinitialiser tous les filtres";
Exhibit.CollectionSummaryWidget.l10n.resetFiltersTooltip="Retirer tous les filtres et voir les items d'origine";
Exhibit.CollectionSummaryWidget.l10n.resetActionTitle="Retirer tous les filtres";
Exhibit.CollectionSummaryWidget.l10n.allResultsTemplate="<span class='%0' id='resultDescription'></span>";
Exhibit.CollectionSummaryWidget.l10n.noResultsTemplate="<span class='%0'><span class='%1'>0</span> résultats</span> (<span id='resetActionLink'></span>)";
Exhibit.CollectionSummaryWidget.l10n.filteredResultsTemplate="<span class='%0' id='resultDescription'></span> filtrés sur un total de <span id='originalCountSpan'>0</span> items (<span id='resetActionLink'></span>)";


/* coders-l10n.js */
if(!("l10n" in Exhibit.Coders)){Exhibit.Coders.l10n={};
}Exhibit.Coders.l10n.mixedCaseLabel="mixed";
Exhibit.Coders.l10n.missingCaseLabel="missing";
Exhibit.Coders.l10n.othersCaseLabel="others";


/* facets-l10n.js */
if(!("l10n" in Exhibit.FacetUtilities)){Exhibit.FacetUtilities.l10n={};
}Exhibit.FacetUtilities.l10n.clearSelectionsTooltip="Effacer ces sélections";
Exhibit.FacetUtilities.l10n.facetSelectActionTitle="Sélectionner %0 dans la facette %1";
Exhibit.FacetUtilities.l10n.facetUnselectActionTitle="Déselectionner %0 dans la facette %1";
Exhibit.FacetUtilities.l10n.facetSelectOnlyActionTitle="Sélectionner seulement %0 dans la facette %1";
Exhibit.FacetUtilities.l10n.facetClearSelectionsActionTitle="Effacer les sélections dans la facette %0";
Exhibit.FacetUtilities.l10n.facetTextSearchActionTitle="Recherche du texte %0";
Exhibit.FacetUtilities.l10n.facetClearTextSearchActionTitle="Effacer la recherche de texte";
Exhibit.FacetUtilities.l10n.missingThisField="(missing this field)";


/* views-l10n.js */
if(!("l10n" in Exhibit.ViewUtilities)){Exhibit.ViewUtilities.l10n={};
}Exhibit.ViewUtilities.l10n.unplottableMessageFormatter=function(B,A,C){var D=A.length;
return String.substitute("<a class='exhibit-action exhibit-views-unplottableCount' href='javascript:void' id='unplottableCountLink'>%0</a> sur <class class='exhibit-views-totalCount'>%1</span> ne peuvent pas être tracés.",[D==1?(D+" résultat"):(D+" résultats"),B]);
};
