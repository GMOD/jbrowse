
function ChromIdeogram(refSeq) {
    var overview = dojo.byId('overview');
    var elem  = dojo.byId('chromosome_representation');
    if(!elem) {
        elem = document.createElement('div');
        overview.appendChild(elem);
        elem.id = 'chromosome_representation';
    }
    elem.style.width = "100%";
    elem.track = this;
    elem.innerHTML = '';
    this.div = elem;
    var trackData = refSeq.chromBands;
    this.clear();
    this.drawChromosome(elem, refSeq, trackData);
}


ChromIdeogram.prototype.drawChromosome = function(elem, refSeq, trackData) {
    this.height = 40;

    this.Bands = {};
    this.bandCount = 0;

    var chrName = document.createElement("div");
    this.chrNameHeight = 20;
    chrName.style.cssText = "color: black; text-align: left; height: "+this.chrNameHeight+"px;";
    chrName.innerHTML = refSeq.name;
    elem.appendChild(chrName);

    var chr1 = document.createElement("div");
    var chr2;
    chr1.className = "chr";
    elem.appendChild(chr1);

    var length = refSeq.length;
    this.length = length;
    this.centromere = refSeq.centromere;
    if(this.centromere > 0 && this.centromere < this.length) {
        chr1.style.width = this.centromere/length * 100 + "%";
        chr2 = document.createElement("div");
        chr2.className = "chr";
        elem.appendChild(chr2);
        chr2.style.width = (length - this.centromere)/length * 100+ "%";
    }
    else {
        chr1.style.width = "100%";
        this.centromere = this.length;
    }

    for(var i = 0; i < trackData.length; i++) {
        var start = trackData[i][0];
        var bandLength = trackData[i][1];
        if(start <= 0) start = 1;

        if(start < this.centromere) {
            if( start + bandLength > this.centromere) {
                this.createBand(chr2, this.centromere, bandLength - (this.centromere - start));
                bandLength = this.centromere-start;
            }
            this.createBand(chr1, start, bandLength);
        }
        else {
            if(start + bandLength > this.length) bandLength = this.length-start;
            this.createBand(chr2, start, bandLength);
        }
    }

    var chr1_topper = document.createElement("div");
    chr1_topper.className = "chrBorder";
    chr1.appendChild(chr1_topper);
    if(this.centromere < this.length) {
        var chr2_topper = document.createElement("div");
        chr2_topper.className = "chrBorder";
        chr2.appendChild(chr2_topper);
    }
}

ChromIdeogram.prototype.createBand = function(chr, pos, size, background) {
    var band = document.createElement("div");
    this.setBandCss(band, pos, size, background);
    band.id = "band_"+this.bandCount;
    this.bandCount += 1;
    this.Bands[band.id] = {"pos": pos, "size": size};
    chr.appendChild(band);
}

ChromIdeogram.prototype.resetBands = function() {
    for( var i = 0; i < this.bandCount; i++) {
        this.resetBandCss(dojo.byId("band_"+i));
    }
}

ChromIdeogram.prototype.setBandCss = function(band, pos, size, background) {
    if(!background) {
        background= band.style.background? band.style.background : "#E2EBFE";
    }
    band.style.cssText = ""; 
    band.style.height = "15px";
    var left = pos/this.length;
    var width = size/this.length;

    var curvePt = 4;
    var divSize = dojo.marginBox(dojo.byId("overview")).w;
    var leftPx = left * divSize;
    var widthPx = width * divSize;
    var centromerePx = this.centromere/ this.length * divSize;

    var radius = 10;

    if(leftPx < curvePt) {
        band.style.cssText = "-moz-border-radius: 5px 0 0 5px;";
        band.style.height = "15px";
        if(leftPx + widthPx < curvePt) {
            var crossSec = 2 * Math.sqrt( (radius* radius) - ((radius - leftPx - widthPx) * (radius - leftPx - widthPx)));
            if(crossSec > 15) crossSec = 15;
            band.style.height = crossSec + "px";
            band.style.top = (15 - crossSec) /2 + 5 + this.chrNameHeight + "px";
        }
    }
    if((leftPx >= centromerePx) && (leftPx < centromerePx + curvePt)) {
        band.style.cssText = "-moz-border-radius: 5px 0 0 5px;";
        band.style.height = "15px";
        if(leftPx + widthPx < centromerePx + curvePt) {
	    var crossSec = 2 * Math.sqrt( (radius* radius) - ((radius + centromerePx - leftPx - widthPx) * (radius + centromerePx - leftPx - widthPx)));
            if(crossSec > 15) crossSec = 15;
            band.style.height = crossSec + "px";
            band.style.top = (15 - crossSec) /2 + 5 + this.chrNameHeight + "px";
        }
    }
    if((widthPx + leftPx <= centromerePx+1) && (widthPx + leftPx > centromerePx - curvePt)) {
        band.style.cssText = "-moz-border-radius: 0 5px 5px 0;";
        band.style.height = "15px";
        if(leftPx > centromerePx - curvePt) {
            var crossSec = 2 * Math.sqrt( (radius* radius) - ((radius - centromerePx + leftPx) * (radius - centromerePx + leftPx)));
            if(crossSec > 15) crossSec = 15;
            band.style.height = crossSec + "px";
            band.style.top = (15 - crossSec) /2 + 5 + this.chrNameHeight + "px";
        }
    }
    if(widthPx + leftPx > divSize - curvePt) {
        band.style.cssText = "-moz-border-radius: 0 5px 5px 0;";
        band.style.height = "15px";
        if(leftPx > divSize - curvePt) {
            var crossSec = 2 * Math.sqrt( (radius* radius) - ((radius - divSize + leftPx) * (radius - divSize + leftPx)));
            if(crossSec > 15) crossSec = 15;
            band.style.height = crossSec + "px";
            band.style.top = (15 - crossSec) /2 + 5 + this.chrNameHeight + "px";
        }
    }

    band.style.width = width*100 + "%";
    band.style.left = left*100 + "%";
    band.style.position = "absolute";
    band.style.background = background; //"rgba(189, 215, 255, 0.8)"; // "#E2EBFE";
}

ChromIdeogram.prototype.resetBandCss = function(band) {
    var pos = this.Bands[band.id].pos;
    var size = this.Bands[band.id].size;
    this.setBandCss(band, pos, size);
}

ChromIdeogram.prototype.clear = function() {
    this.div.innerHTML = '';
    this.height = 0;
}
