/*==================================================
 *  Exhibit.ViewUtilities
 *
 *  Utilities for views' code.
 *==================================================
 */
Exhibit.ViewUtilities = new Object();

Exhibit.ViewUtilities.openBubbleForItems = function(anchorElmt, arrayOfItemIDs, uiContext) {
    var coords = SimileAjax.DOM.getPageCoordinates(anchorElmt);
    var bubble = SimileAjax.Graphics.createBubbleForPoint(
        coords.left + Math.round(anchorElmt.offsetWidth / 2), 
        coords.top + Math.round(anchorElmt.offsetHeight / 2), 
        uiContext.getSetting("bubbleWidth"), // px
        uiContext.getSetting("bubbleHeight") // px
    );
    Exhibit.ViewUtilities.fillBubbleWithItems(bubble.content, arrayOfItemIDs, uiContext);
};

Exhibit.ViewUtilities.fillBubbleWithItems = function(bubbleElmt, arrayOfItemIDs, uiContext) {
    if (bubbleElmt == null) {
        bubbleElmt = document.createElement("div");
    }
    
    if (arrayOfItemIDs.length > 1) {
        bubbleElmt.className = [ bubbleElmt.className, "exhibit-views-bubbleWithItems" ].join(" ");
        
        var ul = document.createElement("ul");
        for (var i = 0; i < arrayOfItemIDs.length; i++) {
            uiContext.format(arrayOfItemIDs[i], "item", function(elmt) {
                var li = document.createElement("li");
                li.appendChild(elmt);
                ul.appendChild(li);
            });
        }
        bubbleElmt.appendChild(ul);
    } else {
        var itemLensDiv = document.createElement("div");
        var itemLens = uiContext.getLensRegistry().createLens(arrayOfItemIDs[0], itemLensDiv, uiContext);
        bubbleElmt.appendChild(itemLensDiv);
    }
    
    return bubbleElmt;
};

Exhibit.ViewUtilities.constructPlottingViewDom = function(
    div, 
    uiContext, 
    showSummary,
    resizableDivWidgetSettings, 
    legendWidgetSettings
)
{ 
    var dom = SimileAjax.DOM.createDOMFromString(
        div,
        "<div class='exhibit-views-header'>" +
            (showSummary ? "<div id='collectionSummaryDiv'></div>" : "") +
            "<div id='unplottableMessageDiv' class='exhibit-views-unplottableMessage'></div>" +
        "</div>" +
        "<div id='resizableDiv'></div>" +
        "<div id='legendDiv'></div>",
        {}
    );
    
    if (showSummary) {
        dom.collectionSummaryWidget = Exhibit.CollectionSummaryWidget.create(
            {}, 
            dom.collectionSummaryDiv, 
            uiContext
        );
    }
    
    dom.resizableDivWidget = Exhibit.ResizableDivWidget.create(
        resizableDivWidgetSettings,
        dom.resizableDiv, 
        uiContext
    );
    dom.plotContainer = dom.resizableDivWidget.getContentDiv();

    dom.legendWidget = Exhibit.LegendWidget.create(
        legendWidgetSettings,
        dom.legendDiv, 
        uiContext
    );
    
    if (legendWidgetSettings.colorGradient == true) {
        dom.legendGradientWidget = Exhibit.LegendGradientWidget.create(
            dom.legendDiv,
            uiContext
        );
    } 

    
    dom.setUnplottableMessage = function(totalCount, unplottableItems) {
        Exhibit.ViewUtilities._setUnplottableMessage(dom, totalCount, unplottableItems, uiContext);
    };
    dom.dispose = function() {
        if (showSummary) {
            dom.collectionSummaryWidget.dispose();
        }
	if (dom.resizableDivWidget)
            dom.resizableDivWidget.dispose();
        if (dom.legendWidget)
	    dom.legendWidget.dispose();
    };

    return dom;
};

Exhibit.ViewUtilities._setUnplottableMessage = function(dom, totalCount, unplottableItems, uiContext) {
    var div = dom.unplottableMessageDiv;
    if (unplottableItems.length == 0) {
        div.style.display = "none";
    } else {
        div.innerHTML = "";
    
        var dom = SimileAjax.DOM.createDOMFromString(
            div,
            Exhibit.ViewUtilities.l10n.unplottableMessageFormatter(totalCount, unplottableItems, uiContext),
            {}
        );
        SimileAjax.WindowManager.registerEvent(dom.unplottableCountLink, "click", function(elmt, evt, target) {
            Exhibit.ViewUtilities.openBubbleForItems(elmt, unplottableItems, uiContext);
        });
        div.style.display = "block";
    }
};
