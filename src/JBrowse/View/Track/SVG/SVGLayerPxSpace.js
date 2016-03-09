/* 
 * SVG Layer implementing Px coordinate system.
 */

define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/lang',
            'dojo/_base/event',
            'dojo/dom-construct',
            'JBrowse/View/Track/SVG/SVGLayerBase'
        ],
        function(
            declare,
            array,
            lang,
            domEvent,
            domConstruct,
            SVGLayerBase
        ) {

return declare(
    [ SVGLayerBase ], {

    setViewInfo: function( genomeView, heightUpdate, numBlocks, trackDiv, widthPct, widthPx, scale ) {
        console.log("SVGLayerBpSpace::setViewInfo");

        this.inherited( arguments );
        
        // make svg canvas
        this.svgCanvas = document.createElementNS('http://www.w3.org/2000/svg','svg');
        this.svgCanvas.setAttribute('class', 'svg-overlay');
        this.svgCanvas.setAttribute('version', '1.1');
        this.svgCanvas.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        this.svgCanvas.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        this.svgCanvas.setAttribute('style', 'width:100%;height:100%;cursor:default;position:absolute;z-index:15');
        domConstruct.place(this.svgCanvas,trackDiv);

        // container for coord elements (this is just to test the coordinate space)
        this.coordGroup = document.createElementNS('http://www.w3.org/2000/svg','g');
        
        // container for feature elements
        //this.svgCanvas.featureGroup = document.createElementNS('http://www.w3.org/2000/svg','g');
        this.svgCanvas.fItem = new Array();
        //this.svgCanvas.appendChild(this.svgCanvas.featureGroup);
        
        this.height = 100;
        
    },
    showRange: function(first, last, startBase, bpPerBlock, scale, containerStart, containerEnd) {
        console.log("SVGLayerBpSpace::showRange");

        //this.inherited( arguments );

        // adjust svg size
        var left = first * this.svgParent.widthPct;
        var width = (last - first + 1) * this.svgParent.widthPct;
        
        this.svgCanvas.setAttribute('style', 'left:'+left+'%;width:'+width+'%;height:100%;position:absolute;z-index:15;');
        this.svgCanvas.setAttribute('transform', 'translate('+(startBase+1)+')');
        
        // traverse features.
        for (var id in this.svgCanvas.fItem) {
            var bpCoord = this.svgCanvas.fItem[id].bpCoord;
            var xCoord = this.bp2Native(bpCoord);
            
            // adjust positions of features
            var svgObj = this.svgCanvas.fItem[id].svgObj;
            svgObj.setAttribute('transform','translate('+xCoord+')');
        }  
        //console.log("maxLen="+maxLen);

    },
    addSVGObject: function(id,bpCoord,width,height,callback) {
        
        xCoord = this.bp2Native(bpCoord);
        
        if (id in this.svgCanvas.fItem ) { 
            var svgItem = this.svgCanvas.fItem[id];        // element already exists 
        }
        else {
            var svgItem = document.createElementNS('http://www.w3.org/2000/svg','g');
            svgItem.setAttribute('id',id);
            svgItem.setAttribute('bpCoord', bpCoord);
            svgItem.setAttribute('transform','translate('+xCoord+')');
            svgItem.bpCoord = bpCoord;
            this.svgCanvas.fItem[id] = svgItem;

            var newObj = callback();
            //newObj.setAttribute('style','width:'+width+'px;height:'+height+'px');
            svgItem.appendChild(newObj);
            svgItem.svgObj = newObj;

            this.svgCanvas.appendChild(svgItem);
        }
    },
    bp2Native: function(val) {
        return (val - this.svgParent.displayContext.startBase) * this.svgParent.displayContext.scale;
    },
    destroy: function() {

        domConstruct.destroy( this.svgCanvas );
        delete this.svgCanvas;

        this.inherited( arguments );
    }
});
});



