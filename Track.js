function Track(name, numBlocks, trackDiv, labelDiv,
	       widthPct, widthPx) {
    this.div = trackDiv;
    this.label = labelDiv;
    this.name = name;
    this.widthPct = widthPct;
    this.widthPx = widthPx;
    this.sizeInit(numBlocks, widthPct);
    this.labelHTML = "";
    this.labelHeight = 0;
    //this.trackPadding = 20;
}

Track.prototype.initBlocks = function() {
    this.blocks = new Array(this.numBlocks);
    this.blockAttached = new Array(this.numBlocks);
    this.blockHeights = new Array(this.numBlocks);
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

Track.prototype.showRange = function(first, last, startBase, bpPerBlock, scale) {
    //if (null == this.firstAttached) this.div.style.backgroundColor = "";
    var firstAttached = (null == this.firstAttached ? last + 1 : this.firstAttached);
    var lastAttached =  (null == this.lastAttached ? first - 1 : this.lastAttached);
    //detach left blocks
    var i, endBase;
    var maxHeight = 0;
    var destBlock = this.blocks[first];
    for (i = firstAttached; i < first; i++) {
        this.transfer(this.blocks[i], destBlock);
        this._hideBlock(i);
    }
    //show blocks from first to last (inclusive)
    for (i = first; i <= last; i++) {
        endBase = startBase + bpPerBlock;
        maxHeight = Math.max(maxHeight,
                             this._showBlock(i, startBase, endBase, scale));
        startBase = endBase;
    }
    //detach right blocks
    startBase = endBase - bpPerBlock;
    destBlock = this.blocks[last];
    for (i = lastAttached; i > last; i--) {
        this.transfer(this.blocks[i], destBlock);
        this._hideBlock(i);
    }

    this.firstAttached = first;
    this.lastAttached = last;
    return Math.max(maxHeight, this.labelHeight);// + this.trackPadding;
}

Track.prototype._hideBlock = function(blockIndex) {
    if (this.blocks[blockIndex] && this.blockAttached[blockIndex]) {
	this.div.removeChild(this.blocks[blockIndex]);
        //this.blocks[blockIndex].style.display = "none";
	this.blockAttached[blockIndex] = false;
    }
}

Track.prototype.hideAll = function() {
    if (null == this.firstAttached) return;
    for (var i = this.firstAttached; i <= this.lastAttached; i++)
	this._hideBlock(i);
    this.firstAttached = null;
    this.lastAttached = null;
    //this.div.style.backgroundColor = "#eee";
}

Track.prototype._showBlock = function(blockIndex, startBase, endBase, scale) {
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
				 scale, 5,
				 this.widthPx);

    this.blocks[blockIndex] = blockDiv;
    this.blockAttached[blockIndex] = true;
    this.blockHeights[blockIndex] = blockHeight;
    this.div.appendChild(blockDiv);
    return blockHeight;
}

Track.prototype.moveBlocks = function(delta) {
    var newBlocks = new Array(this.numBlocks);
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
        } else {
            //move block
            newBlocks[newIndex] = this.blocks[i];
            if (this.blocks[i]) 
		newBlocks[newIndex].style.left =
		    ((newIndex) * this.widthPct) + "%";
	    newHeights[newIndex] = this.blockHeights[i];
	    newAttached[newIndex] = this.blockAttached[i];
        }
    }
    this.blocks = newBlocks;
    this.blockHeights = newHeights;
    this.blockAttached = newAttached;

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