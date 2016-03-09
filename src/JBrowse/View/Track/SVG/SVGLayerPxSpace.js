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

        // container for feature elements
        this.svgCanvas.featureGroup = document.createElementNS('http://www.w3.org/2000/svg','g');
        this.svgCanvas.featureGroup.fItem = new Array();
        this.svgCanvas.appendChild(this.svgCanvas.featureGroup);
        
    },
    showRange: function(first, last, startBase, bpPerBlock, scale, containerStart, containerEnd) {
        console.log("SVGLayerBpSpace::showRange");

        this.inherited( arguments );

        var lf = this.blocks[first].domNode.left;
    
        // adjust svg size
        var left = first * this.widthPct;
        var width = (last - first) * this.widthPct;
        
        // setup viewbox values for svgCanvas
        var vbMinX = -left;
        var vbMinY = 0; 
        var vbHeight = this.svgHeight;
        var vbWidth = width;
        var vbValues = bMinX + ' ' + vbMinY + ' ' + vbWidth + ' ' + vbHeight;

        this.svgCanvas.setAttribute('style', 'left:'+left+'%;width:'+width+'%;height:100%;cursor:default;position:absolute;z-index:15');
        this.coordGroup.setAttribute('style', 'width:100%;height:100%;position:absolute;');
        this.corodGroup.setAttribute('viewBox', vbValues);
        this.svgCanvas.featureGroup.setAttribute('style', 'width:100%;height:100%;position:absolute;');
        
        var maxLen = this.svgHeight;
	var len = 0;
        
        // lot of this can go away when the viewbox stuff is working properly.
        // traverse features.
        for (var id in this.svgCanvas.featureGroup.fItem) {
            var bpCoord = this.svgCanvas.featureGroup.fItem[id].bpCoord;
            if (bpCoord < this.blocks[first].startBase && bpCoord > this.blocks[last].endBase) {
                // hide features out of range
                this.svgCanvas.featureGroup.fItem[id].setAttribute("display","none");
            }
            else {
                // adjust positions of features
                var feature = this.svgCanvas.featureGroup.fItem[id].feature;
                var bpCoord = feature.get("start");
                var cx = this.bp2px(bpCoord);
                len = feature.get("end") - feature.get("start") ;
                if (len > maxLen)  maxLen = len;
                len = this.svgHeight - (len / 5);
                if (id.charAt(0) === "C")
                    this.svgCanvas.featureGroup.fItem[id].setAttribute('style', 'cx:'+cx+';cy:'+len+';r:10;fill:rgba(0,0,255,.5)');
                else {
                    svgItem = this.svgCanvas.featureGroup.fItem[id];
                    svgItem.feature = feature;
                    svgItem.setAttribute('x1',cx);
                    svgItem.setAttribute('y1',len);
                    svgItem.setAttribute('x2',cx);
                    svgItem.setAttribute('y2',this.svgHeight);
                    svgItem.setAttribute('stroke','grey');
                    svgItem.setAttribute('stroke-width',1);
                    //svgItem.setAttribute('style', 'x1:'+cx+';y1:'+len+';x2:'+cx+';y2:'+this.svgHeight+';stroke:grey;stroke-width:1');
                }
		//console.log("len="+len);
            }
        }  
        console.log("maxLen="+maxLen);

        // adjust vertical height of features if necessary
        if (0) { //maxLen > this.svgHeight) {
            this.svgScale = this.svgHeight / maxLen;
            console.log("Adjusting vertical...scale="+scale);
            
            // traverse features with vertical height adjust.
            for (var id in this.svgCanvas.featureGroup.fItem) {
                var bpCoord = this.svgCanvas.featureGroup.fItem[id].bpCoord;
                if (bpCoord < this.blocks[first].startBase && bpCoord > this.blocks[last].endBase) {
                    // hide features out of range
                    this.svgCanvas.featureGroup.fItem[id].setAttribute("display","none");
                }
                else {
                    // adjust positions of features
                    var feature = this.svgCanvas.featureGroup.fItem[id].feature;
                    var bpCoord = feature.get("start");
                    var cx = this.bp2px(bpCoord);
                    len = this.svgScale * (feature.get("end") - feature.get("start") ) / 5;
                    len = this.svgHeight - len;
                    if (id.charAt(0) === "C")
                        this.svgCanvas.featureGroup.fItem[id].setAttribute('style', 'cx:'+cx+';cy:'+len+';r:10;fill:rgba(0,0,255,.5)');
                    else {
                        svgItem = this.svgCanvas.featureGroup.fItem[id];
                        svgItem.feature = feature;
                        svgItem.setAttribute('x1',cx);
                        svgItem.setAttribute('y1',len);
                        svgItem.setAttribute('x2',cx);
                        svgItem.setAttribute('y2',this.svgHeight);
                        svgItem.setAttribute('stroke','grey');
                        svgItem.setAttribute('stroke-width',1);
                        //svgItem.setAttribute('style', 'x1:'+cx+';y1:'+len+';x2:'+cx+';y2:'+this.svgHeight+';stroke:grey;stroke-width:1');
                    }
                }
            }  
        }
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
    destroy: function() {

        domConstruct.destroy( this.svgCoords );
        delete this.svgCoords

        this.inherited( arguments );
    }
});
});



