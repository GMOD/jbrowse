/* 
 * SVG Layer - display coordinates across the track
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
        // console.log("SVGLayerCoords::setViewInfo");

        this.inherited( arguments );
        
        // make svg canvas coord group
        this.svgCoords = document.createElementNS('http://www.w3.org/2000/svg','svg');
        this.svgCoords.setAttribute('class', 'svg-coords');
        this.svgCoords.setAttribute('style', 'width:100%;height:100%;cursor:default;position:absolute;z-index:15');
        this.svgCoords.setAttribute('version', '1.1');
        this.svgCoords.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        this.svgCoords.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        domConstruct.place(this.svgCoords,trackDiv);
        
        // container for coord elements (this is just to test the coordinate space)
        this.coordGroup = document.createElementNS('http://www.w3.org/2000/svg','g');
        this.svgCoords.appendChild(this.coordGroup);
        this.svgCoords.fCoord = new Array();

       
        this.svgHeight = 100;
        this.svgScale = 1;
      
    },
    showRange: function(first, last, startBase, bpPerBlock, scale, containerStart, containerEnd) {
        // console.log("SVGLayerCoords::showRange");

        this.inherited( arguments );
    
        // adjust svg size
        var left = first * this.svgParent.widthPct;
        var width = (last - first + 1) * this.svgParent.widthPct;
        
        // coords group
        this.svgCoords.setAttribute('style', 'left:'+left+'%;width:'+width+'%;height:100%;position:absolute;z-index:15');
        this.coordGroup.setAttribute('style', 'width:100%;height:100%;position:absolute;');

        var maxLen = this.svgHeight;
	var len = 0;

        // erase test coordinates
        for (var bpCoord in this.svgCoords.fCoord) {
            this.svgCoords.fCoord[bpCoord].setAttribute("display","none");
        }        
        
        // draw test coordinates
        for(var i=first;i < last;i++) {
            var bpCoord = this.svgParent.blocks[i].startBase;
            var x = this.bp2Native(bpCoord);
            var svgCoord;
            if (bpCoord in this.svgCoords.fCoord ) { 
                svgCoord = this.svgCoords.fCoord[bpCoord]; 
            }
            else {
                svgCoord = document.createElementNS('http://www.w3.org/2000/svg','text');
                this.svgCoords.fCoord[bpCoord] = svgCoord;
            }
            svgCoord.setAttribute('x',x);
            svgCoord.setAttribute('y','20');
            svgCoord.setAttribute('fill','red');
            svgCoord.setAttribute('transform','rotate(90 '+x+' 20)');
            svgCoord.setAttribute('display','block');
            svgCoord.innerHTML = bpCoord + 1;            
            this.coordGroup.appendChild(svgCoord);
        }
    },
    bp2Native: function(val) {
        return (val - this.svgParent.displayContext.startBase) * this.svgParent.displayContext.scale;
    },
    destroy: function() {

        domConstruct.destroy( this.svgCoords );
        delete this.svgCoords

        this.inherited( arguments );
    }
});
});
