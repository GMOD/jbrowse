/* 
 * SVG Layer implementing Base Pair coordinate system.
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
        // console.log("SVGLayerBpSpace::setViewInfo");

        this.inherited( arguments );
        
        // make svg canvas
        this.svgCanvas = document.createElementNS('http://www.w3.org/2000/svg','svg');
        this.svgCanvas.setAttribute('id', 'svg-overlay');
        this.svgCanvas.setAttribute('class', 'svg-overlay');
        this.svgCanvas.setAttribute('version', '1.1');
        this.svgCanvas.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        this.svgCanvas.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        this.svgCanvas.setAttribute('style', 'width:100%;height:100%;cursor:default;position:absolute;z-index:15');
        domConstruct.place(this.svgCanvas,trackDiv);
        
        // container for feature elements
        //this.svgCanvas.featureGroup = document.createElementNS('http://www.w3.org/2000/svg','g');
        //this.svgCanvas.appendChild(this.svgCanvas.featureGroup);
        this.svgCanvas.fItem = [];
        this.svgCanvas.scaleObj = false;
        
        //this.svgCanvas.height = this.svgCanvas.offsetHeight;
        
        this.svgHeight = 100;
        this.svgScale = 1;
      
    },
    showRange: function(first, last, startBase, bpPerBlock, scale, containerStart, containerEnd) {
        // console.log("SVGLayerBpSpace::showRange");

        this.inherited( arguments );

        // adjust svg size
        var left = first * this.svgParent.widthPct;
        var width = (last - first + 1) * this.svgParent.widthPct;
        
        // setup viewbox values for svgCanvas
        var vbMinX = startBase+1;
        var vbWidth = (last - first + 1) * bpPerBlock;
        var vbMinY = 0; 
        var vbHeight = -this.svgHeight;
        vbHeight = 100;
        var vbValues = vbMinX + ' ' + vbMinY + ' ' + vbWidth + ' ' + vbHeight;

	// console.log("viewBox="+vbValues);

        this.svgCanvas.setAttribute('viewBox', vbValues);
        //this.svgCanvas.setAttribute('border', '1px solid grey');

        this.svgCanvas.setAttribute('style', 'left:'+left+'%;width:'+width+'%;height:100%;position:absolute;z-index:15');
        //this.svgCanvas.featureGroup.setAttribute('style', 'width:100%;height:100%;position:absolute;');

        //this.svgCoords.showRange(first, last, startBase, bpPerBlock, scale, containerStart, containerEnd);

        // set scale for objects
        dojo.query(".svg-scale").style({
            "transform": "scale("+ vbWidth / 3500 +")"
        });        
    },
    addSVGObject: function(id,bpCoord,width,height,callback) {
        
        if (id in this.svgCanvas.fItem ) { 
            var svgItem = this.svgCanvas.fItem[id];        // element already exists 
        }
        else {
            var svgItem = document.createElementNS('http://www.w3.org/2000/svg','svg');
            svgItem.setAttribute('id',id);
            svgItem.setAttribute('bpCoord', bpCoord);
            svgItem.setAttribute('x',bpCoord);
            svgItem.setAttribute('y',20);
            svgItem.setAttribute('height','100%');
            svgItem.setAttribute('style','overflow:visible');
            svgItem.bpCoord = bpCoord;
            this.svgCanvas.fItem[id] = svgItem;

            var g1 = document.createElementNS('http://www.w3.org/2000/svg','g');
            g1.setAttribute('id','rotate');
            svgItem.g_rotate = g1;
            svgItem.appendChild(g1);
            
            var g2 = document.createElementNS('http://www.w3.org/2000/svg','g');
            g2.setAttribute('id','jb-scale');
            g2.setAttribute('class','svg-scale');
            //g2.setAttribute('transform','scale(1)');
            svgItem.g_scale = g2;
            g1.appendChild(g2);             
            
            var newObj = callback();
            //newObj.setAttribute('style','width:'+width+'px;height:'+height+'px');
            g2.appendChild(newObj);
            svgItem.SVGObj = newObj;

            this.svgCanvas.appendChild(svgItem);
        }
    },
    getHeight: function() {
        return this.svgHeight;
    },
    destroy: function() {

        domConstruct.destroy( this.svgCoords );
        delete this.svgCoords

        this.inherited( arguments );
    }
});
});


