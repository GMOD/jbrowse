function Track(name) {
    this.name = name;
}

Track.prototype.setViewInfo = function(numBlocks, trackDiv, labelDiv,
                                       widthPct, widthPx) {
    this.div = trackDiv;
    this.label = labelDiv;
    this.widthPct = widthPct;
    this.widthPx = widthPx;
    this.sizeInit(numBlocks, widthPct);
    this.labelHTML = "";
    this.labelHeight = 0;
}    

Track.prototype.initBlocks = function() {
    this.blocks = new Array(this.numBlocks);
    this.blockAttached = new Array(this.numBlocks);
    this.blockHeights = new Array(this.numBlocks);
    this.emptyBlocks = new Array(this.numBlocks);
    for (i = 0; i < this.numBlocks; i++) {
	this.blockAttached[i] = false;
	this.blockHeights[i] = 0;
    }
    this.firstAttached = null;
    this.lastAttached = null;
    //if (this.div) this.div.style.backgroundColor = "#eee";
}

Track.prototype.clear = function() {
    if (this.blocks)
	for (var i = 0; i < this.numBlocks; i++)
	    if (this.blockAttached[i]) this.div.removeChild(this.blocks[i]);
    for (var i = 0; i < this.numBlocks; i++)
	if (this.emptyBlocks[i]) this.div.removeChild(this.emptyBlocks[i]);
    this.initBlocks();
}

Track.prototype.setLabel = function(newHTML) {
    if ((this.labelHeight == 0) && this.label)
        this.labelHeight = this.label.offsetHeight;
    if (this.labelHTML == newHTML) return;
    this.labelHTML = newHTML;
    this.label.innerHTML = newHTML;
    this.labelHeight = this.label.offsetHeight;
}

Track.prototype.transfer = function() {};

Track.prototype.startZoom = function(destScale, destStart, destEnd) {};
Track.prototype.endZoom = function(destScale, destBlockBases) {};

Track.prototype.showRange = function(first, last, startBase, bpPerBlock, scale) {
    if (this.blocks === undefined) return;
    //if (null == this.firstAttached) this.div.style.backgroundColor = "";
    var firstAttached = (null == this.firstAttached ? last + 1 : this.firstAttached);
    var lastAttached =  (null == this.lastAttached ? first - 1 : this.lastAttached);

    var i, leftBase;
    var maxHeight = 0;
    //fill right
    for (i = firstAttached; i <= last; i++) {
	leftBase = startBase + (bpPerBlock * (i - first));
        maxHeight = Math.max(maxHeight,
                             this._showBlock(i, leftBase,
					     leftBase + bpPerBlock, scale));
    }
    //fill left
    for (i = firstAttached - 1; i >= first; i--) {
	leftBase = startBase + (bpPerBlock * (i - first));
        maxHeight = Math.max(maxHeight,
                             this._showBlock(i, leftBase, 
					     leftBase + bpPerBlock, scale));
    }

    //detach left blocks
    var destBlock = this.blocks[first];
    for (i = firstAttached; i < first; i++) {
        this.transfer(this.blocks[i], destBlock);
        this._hideBlock(i);
    }
    //detach right blocks
    destBlock = this.blocks[last];
    for (i = lastAttached; i > last; i--) {
        this.transfer(this.blocks[i], destBlock);
        this._hideBlock(i);
    }

    //insert blank blocks
    for (i = 0; i < this.numBlocks; i++) {
	if ((i >= first) && (i <= last)) continue;
	this._addBlank(i);
    }

    this.firstAttached = first;
    this.lastAttached = last;
    return Math.max(maxHeight, this.labelHeight);// + this.trackPadding;
}

Track.prototype._addBlank = function(blockIndex) {
    if (!this.emptyBlocks[blockIndex]) {
	var blankDiv = document.createElement("div");
	blankDiv.className = "blank-block";
	blankDiv.style.left = (blockIndex * this.widthPct) + "%";
	blankDiv.style.width = this.widthPct + "%";
	this.div.appendChild(blankDiv);
	this.emptyBlocks[blockIndex] = blankDiv;
    }
}

Track.prototype._hideBlock = function(blockIndex) {
    if (this.blocks[blockIndex] && this.blockAttached[blockIndex]) {
	this.div.removeChild(this.blocks[blockIndex]);
	this.blocks[blockIndex] = undefined;
        //this.blocks[blockIndex].style.display = "none";
	this.blockAttached[blockIndex] = false;
    }
}

Track.prototype.hideAll = function() {
    if (null == this.firstAttached) return;
    for (var i = this.firstAttached; i <= this.lastAttached; i++)
	this._hideBlock(i);

    //insert blank blocks
    for (i = 0; i < this.numBlocks; i++)
	this._addBlank(i);

    this.firstAttached = null;
    this.lastAttached = null;
    //this.div.style.backgroundColor = "#eee";
}

Track.prototype._showBlock = function(blockIndex, startBase, endBase, scale) {
    if (this.emptyBlocks[blockIndex]) {
	this.div.removeChild(this.emptyBlocks[blockIndex]);
	this.emptyBlocks[blockIndex] = null;
    }
    if (this.blockAttached[blockIndex]) return this.blockHeights[blockIndex];
    if (this.blocks[blockIndex]) {
	//this.blocks[i].style.left = (blockIndex * this.widthPct) + "%";
	//this.blocks[i].style.width = this.widthPct + "%";
	this.div.appendChild(this.blocks[blockIndex]);
        //this.blocks[blockIndex].style.display = "block";
	this.blockAttached[blockIndex] = true;
	return this.blockHeights[blockIndex];
    }

    var blockHeight;

    var blockDiv = document.createElement("div");
    blockDiv.className = "block";
    blockDiv.style.left = (blockIndex * this.widthPct) + "%";
    blockDiv.style.width = this.widthPct + "%";
    blockDiv.startBase = startBase;
    blockDiv.endBase = endBase;
    blockHeight = this.fillBlock(blockDiv, 
				 this.blocks[blockIndex - 1],
				 this.blocks[blockIndex + 1],
				 startBase,
				 endBase, 
				 scale,
				 this.widthPx);

    this.blocks[blockIndex] = blockDiv;
    this.blockAttached[blockIndex] = true;
    this.blockHeights[blockIndex] = blockHeight;
    this.div.appendChild(blockDiv);
    return blockHeight;
}

Track.prototype.moveBlocks = function(delta) {
    var newBlocks = new Array(this.numBlocks);
    var newEmpty = new Array(this.numBlocks);
    var newHeights = new Array(this.numBlocks);
    var newAttached = new Array(this.numBlocks);
    for (i = 0; i < this.numBlocks; i++) {
	newAttached[i] = false;
	newHeights[i] = 0;
    }

    var destBlock;
    if ((this.lastAttached + delta < 0)
        || (this.firstAttached + delta >= this.numBlocks)) {
        this.firstAttached = null;
        this.lastAttached = null;
    } else {
        this.firstAttached = Math.max(0, Math.min(this.numBlocks - 1,
                                                 this.firstAttached + delta));
        this.lastAttached = Math.max(0, Math.min(this.numBlocks - 1,
                                                  this.lastAttached + delta));

        if (delta < 0)
            destBlock = newBlocks[this.firstAttached];
        else
            destBlock = newBlocks[this.lastAttached];
    }

    for (var i = 0; i < this.numBlocks; i++) {
        var newIndex = i + delta;
        if ((newIndex < 0) || (newIndex >= this.numBlocks)) {
            //We're not keeping this block around, so delete
            //the old one.

	    if (this.blockAttached[i]) this.div.removeChild(this.blocks[i]);
            if (destBlock) this.transfer(this.blocks[i], destBlock);
	    if (this.emptyBlocks[i]) this.div.removeChild(this.emptyBlocks[i]);
        } else {
            //move block
            newBlocks[newIndex] = this.blocks[i];
            if (newBlocks[newIndex]) 
		newBlocks[newIndex].style.left =
		    ((newIndex) * this.widthPct) + "%";

	    newEmpty[newIndex] = this.emptyBlocks[i];
	    if (newEmpty[newIndex])
		newEmpty[newIndex].style.left = 
		    ((newIndex) * this.widthPct) + "%";

	    newHeights[newIndex] = this.blockHeights[i];
	    newAttached[newIndex] = this.blockAttached[i];
        }
    }
    this.blocks = newBlocks;
    this.blockHeights = newHeights;
    this.blockAttached = newAttached;
    this.emptyBlocks = newEmpty;
}

Track.prototype.heightUpdate = function() {
    var maxHeight = 0;
    for (var i = this.firstAttached; i < this.lastAttached; i++)
	if (this.blockHeights[i] > maxHeight)
	    maxHeight = this.blockHeights[i];
    //this.div.style.height = (maxHeight + this.trackPadding) + "px";
    //this.div.style.top = top + "px";
    return maxHeight;// + this.trackPadding;
}

Track.prototype.sizeInit = function(numBlocks, widthPct) {
    var block, i, oldLast;
    this.numBlocks = numBlocks;
    this.widthPct = widthPct;
    if (this.blocks && (this.blocks.length > 0)) {
        for (i = numBlocks; i < this.blocks.length; i++) {
	    block = this.blocks[i];
            if (this.blockAttached[i]) this.div.removeChild(block);
        }
        oldLast = this.blockAttached.length;
        this.blocks = this.blocks.slice(0, numBlocks);
	this.blockAttached = this.blockAttached.slice(0, numBlocks);
	this.blockHeights = this.blockHeights.slice(0, numBlocks);
        for (i = oldLast; i < numBlocks; i++) {
            this.blocks[i] = undefined;
            this.blockAttached[i] = false;
            this.blockHeights[i] = 0;
        }
        this.lastAttached = Math.min(this.lastAttached, numBlocks - 1);
        if (this.firstAttached > this.lastAttached) {
            //not sure if this can happen
            this.firstAttached = null;
            this.lastAttached = null;
        }
            
        if (this.blocks.length != numBlocks) throw new Error("block number mismatch: should be " + numBlocks + "; blocks.length: " + this.blocks.length);
        for (i = 0; i < numBlocks; i++) {
            if (this.blocks[i]) {
                this.blocks[i].style.left = (i * widthPct) + "%";
                this.blocks[i].style.width = widthPct + "%";
            }
        }
    } else {
	this.initBlocks();
    }
}