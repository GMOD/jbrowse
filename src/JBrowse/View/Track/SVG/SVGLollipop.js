/* 
 * Lollipop track
 */

define( [
            'dojo/_base/declare',
            'dojo/_base/array',
            'dojo/_base/lang',
            'dojo/_base/event',
            'dojo/mouse',
            'dojo/dom-construct',
            'dojo/dom-style',
            'dojo/Deferred',
            'dojo/on',
            'JBrowse/has',
            'JBrowse/Util',
            'JBrowse/View/GranularRectLayout',
            'JBrowse/View/Track/BlockBased',
            'JBrowse/View/Track/_ExportMixin',
            'JBrowse/Errors',
            'JBrowse/View/Track/_FeatureDetailMixin',
            'JBrowse/View/Track/_FeatureContextMenusMixin',
            'JBrowse/View/Track/_YScaleMixin',
            'JBrowse/Model/Location',
            'JBrowse/Model/SimpleFeature',
            'JBrowse/View/Track/SVG/SVGTrackBase'
        ],
        function(
            declare,
            array,
            lang,
            domEvent,
            mouse,
            domConstruct,
            domStyle,
            Deferred,
            on,
            has,
            Util,
            Layout,
            BlockBasedTrack,
            ExportMixin,
            Errors,
            FeatureDetailMixin,
            FeatureContextMenuMixin,
            YScaleMixin,
            Location,
            SimpleFeature,
            SVGTrackBase        
        ) {

return declare(
    [ SVGTrackBase ], {

    constructor: function( args ) {
    },

    setViewInfo: function( genomeView, heightUpdate, numBlocks, trackDiv, widthPct, widthPx, scale ) {
        console.log("SVGFeatures::setViewInfo");
        console.log(numBlocks+" "+widthPct+" "+widthPx+" "+scale);

        this.inherited( arguments );
        // version="1.1" 
        // xmlns="http://www.w3.org/2000/svg" 
        // xmlns:xlink="http://www.w3.org/1999/xlink" 
        //        
        // make svg canvas coord group
        this.svgCoords = document.createElementNS('http://www.w3.org/2000/svg','svg');
        this.svgCoords.setAttribute('class', 'svg-coords');
        this.svgCoords.setAttribute('style', 'width:100%;height:100%;cursor:default;position:absolute;z-index:15');
        domConstruct.place(this.svgCoords,trackDiv);
        
        // make svg canvas
        this.svgCanvas = document.createElementNS('http://www.w3.org/2000/svg','svg');
        this.svgCanvas.setAttribute('id', 'svg-overlay');
        this.svgCanvas.setAttribute('class', 'svg-overlay');
        this.svgCanvas.setAttribute('version', '1.1');
        this.svgCanvas.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        this.svgCanvas.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
        this.svgCanvas.setAttribute('style', 'width:100%;height:100%;cursor:default;position:absolute;z-index:15');
        domConstruct.place(this.svgCanvas,trackDiv);

        // container for coord elements (this is just to test the coordinate space)
        this.coordGroup = document.createElementNS('http://www.w3.org/2000/svg','g');
        this.svgCoords.appendChild(this.coordGroup);
        this.svgCoords.fCoord = new Array();

        // container for feature elements
        //this.svgCanvas.featureGroup = document.createElementNS('http://www.w3.org/2000/svg','g');
        //this.svgCanvas.appendChild(this.svgCanvas.featureGroup);
        this.svgCanvas.fItem = new Array();
        this.svgCanvas.scaleObj = false;
        
        //this.svgCanvas.height = this.svgCanvas.offsetHeight;
        
        this.svgHeight = 100;
        this.svgScale = 1;

        this._makeLabelTooltip( );
        
    },

    showSVGRange: function(first, last, startBase, bpPerBlock, scale, containerStart, containerEnd) {
    
        var lf = this.blocks[first].domNode.left;

        console.log("this.widthPct = "+this.widthPct);
        
        // adjust svg size
        var left = first * this.widthPct;
        var width = (last - first + 1) * this.widthPct;
        
        // setup viewbox values for svgCanvas
        var vbMinX = startBase+1;
        var vbWidth = (last - first + 1) * bpPerBlock;
        var vbMinY = 0; 
        var vbHeight = -this.svgHeight;
        vbHeight = 100;
        var vbValues = vbMinX + ' ' + vbMinY + ' ' + vbWidth + ' ' + vbHeight;

	console.log("viewBox="+vbValues);

        this.svgCanvas.setAttribute('viewBox', vbValues);
        this.svgCanvas.setAttribute('border', '1px solid grey');

        this.svgCanvas.setAttribute('style', 'left:'+left+'%;width:'+width+'%;height:100%;position:absolute;z-index:15');
        //this.svgCanvas.featureGroup.setAttribute('style', 'width:100%;height:100%;position:absolute;');

        // coords group
        this.svgCoords.setAttribute('style', 'left:'+left+'%;width:'+width+'%;height:100%;position:absolute;z-index:15');
        this.coordGroup.setAttribute('style', 'width:100%;height:100%;position:absolute;');


        console.log("len = " + document.getElementById("svg-overlay").offsetWidth);

        var maxLen = this.svgHeight;
	var len = 0;

        // erase test coordinates
        for (var bpCoord in this.svgCoords.fCoord) {
            this.svgCoords.fCoord[bpCoord].setAttribute("display","none");
        }        
        
        // draw test coordinates
        for(var i=first;i < last;i++) {
            var bpCoord = this.blocks[i].startBase;
            var x = this.bp2px(bpCoord);
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
        /*
        // draw test object
        this.addSVGObject("pear",5000,100,100,function () {
            var apple = document.createElementNS('http://www.w3.org/2000/svg','circle');
            apple.setAttribute('r',"50");
            apple.setAttribute('width','100px');
            apple.setAttribute('height','100px');
            return apple;
        });
        */
        // set scale for objects
        dojo.query(".svg-scale").style({
            "transform": "scale("+ vbWidth / 3500 +")"
        });        
        
    },

    fillBlock: function( args ) {
        this.inherited( arguments );
    },

    fillFeatures: function( args ) {
        this.inherited( arguments );
    },

    // draw the features on the canvas
    renderFeatures: function( args, fRects ) {
        this.inherited( arguments );
    },

    renderSVGFeature: function( context, fRect ) {
        var feature = fRect.f;
        var thisB = this;
        
        // given the bp coordinate of the feature, get the x position in the SVG coord space.
        var bpCoord = feature.get("start");
        var cx = this.bp2px(bpCoord);
        var len = this.svgScale * (feature.get("end") - feature.get("start") ) / 5;
        len = this.svgHeight - len;
        //console.log("cx="+cx+" len="+len);
        
        // create svg element new
        
        // draw line
        var id = "L-"+this.fixId(fRect.f.id());
        
        this.addSVGObject(id,bpCoord,100,100,function () {
            var svgItem = document.createElementNS('http://www.w3.org/2000/svg','line');
            svgItem.setAttribute('x1',0);
            svgItem.setAttribute('y1',len);
            svgItem.setAttribute('x2',0);
            svgItem.setAttribute('y2',thisB.svgHeight);
            svgItem.setAttribute('stroke','rgba(255,0,0,.5)');
            svgItem.setAttribute('stroke-width',10);
            svgItem.setAttribute('stroke-linecap','round');
            return svgItem;
        });
        
        // draw ciecle
        var id = "C-"+this.fixId(fRect.f.id());
        
        this.addSVGObject(id,bpCoord,100,100,function () {
            var apple = document.createElementNS('http://www.w3.org/2000/svg','circle');
            apple.setAttribute('r',"25");
            apple.setAttribute('width','100px');
            apple.setAttribute('height','100px');
            apple.setAttribute('style', 'cy:'+len+';fill:rgba(0,0,255,.5)');
            //apple.setAttribute('style', 'cx:'+cx+';cy:'+len+';fill:rgba(0,0,255,.5)');
            return apple;
        });
        
        return;     // skip the rest
        
/*        
        addSVGObject(id,bpCoord,20,20,function() {
            var circle= document.createElementNS('http://www.w3.org/2000/svg','circle');
            svgItem.setAttribute("r","100%");
            return circle;
        });

        return; // ignore stuff below
*/        
        // create svg element
        
        if (id in this.svgCanvas.featureGroup.fItem ) { 
            var svgItem = this.svgCanvas.featureGroup.fItem[id];        // element already exists 
        }
        else {
            var svgItem = document.createElementNS('http://www.w3.org/2000/svg','line');
            svgItem.setAttribute('id',id);
            svgItem.setAttribute('bpCoord', bpCoord);
            svgItem.bpCoord = bpCoord;
            this.svgCanvas.featureGroup.fItem[id] = svgItem;
            this.svgCanvas.featureGroup.appendChild(svgItem);
        }

        svgItem.feature = feature;
        svgItem.setAttribute('x1',cx);
        svgItem.setAttribute('y1',len);
        svgItem.setAttribute('x2',cx);
        svgItem.setAttribute('y2',this.svgHeight);
        svgItem.setAttribute('stroke','grey');
        svgItem.setAttribute('stroke-width',1);
        //svgItem.setAttribute('style', 'x1:'+cx+';y1:'+len+';x2:'+cx+';y2:'+this.svgHeight+';stroke:grey;stroke-width:1');
        svgItem.setAttribute('display', 'block');
        
        var id = "C-"+this.fixId(fRect.f.id());
        //var feature = fRect.f;
        
        // given the bp coordinate of the feature, get the x position in the SVG coord space.
        //var bpCoord = feature.get("start");
        //var cx = this.bp2px(bpCoord);
        //var len = this.svgScale * (feature.get("end") - feature.get("start") ) / 5;
        //len = this.svgHeight - len;
        //console.log("cx="+cx+" len="+len);
        
        // create svg element
        
        if (id in this.svgCanvas.featureGroup.fItem ) { 
            var svgItem = this.svgCanvas.featureGroup.fItem[id];        // element already exists 
        }
        else {
            var svgItem = document.createElementNS('http://www.w3.org/2000/svg','circle');
            svgItem.setAttribute('id',id);
            svgItem.setAttribute('bpCoord', bpCoord);
            svgItem.bpCoord = bpCoord;
            this.svgCanvas.featureGroup.fItem[id] = svgItem;
            this.svgCanvas.featureGroup.appendChild(svgItem);
        }

        svgItem.feature = feature;
        svgItem.setAttribute('style', 'cx:'+cx+';cy:'+len+';r:10;fill:rgba(0,0,255,.5)');
        svgItem.setAttribute('display', 'block');
       
    },
    
    destroy: function() {
        this.inherited( arguments );
    }
});
});

