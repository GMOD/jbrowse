/*
 * Code for laying out rectangles, given that layout is also happening
 * in adjacent blocks at the same time
 *
 * This code does a lot of linear searching; n should be low enough that
 * it's not a problem but if it turns out to be, some of it can be changed to
 * binary searching without too much work.  Another possibility is to merge
 * contour spans and give up some packing closeness in exchange for speed
 * (the code already merges spans that have the same x-coord and are vertically
 * contiguous).
 */

function Contour(top) {
    /*
     * A contour is described by a set of vertical lines of varying heights,
     * like this:
     *                         |
     *                         |
     *               |
     *                   |
     *                   |
     *                   |
     *
     * The contour is the union of the rectangles ending on the right side
     * at those lines, and extending leftward toward negative infinity.
     *
     * <=======================|
     * <=======================|
     * <==========|
     * <=================|
     * <=================|
     * <=================|
     *
     * x -->
     *
     * As we add new vertical spans, the contour expands, either downward
     * or in the direction of increasing x.
     */
    // takes: top, a number indicating where the first span of the contour
    // will go
    if (top === undefined) top = 0;

    // spans is an array of {top, x, height} objects representing
    // the boundaries of the contour
    // they're always sorted by top
    this.spans = [{top: top, x: Infinity, height: 0}];
}

// finds a space in the contour into which the given span fits
// (i.e., the given span has higher x than the contour over its vertical span)
// returns an ojbect {above, count}; above is the index of the last span above
// where the given span will fit, count is the number of spans being
// replaced by the given span
Contour.prototype.getFit = function(x, height, minTop) {
    var aboveBottom, curSpan;
    var above = 0;
    if (minTop) {
        // set above = (index of the first span that starts below minTop)
        for (; this.spans[above].top < minTop; above++) {
            if (above >= (this.spans.length - 1))
                return {above: this.spans.length - 1, count: 0};
        }
    }
    // slide down the contour
    ABOVE: for (; above < this.spans.length; above++) {
        aboveBottom = this.spans[above].top + this.spans[above].height;
        for (var count = 1; above + count < this.spans.length; count++) {
            curSpan = this.spans[above + count];
            if ((aboveBottom + height) <= curSpan.top) {
                // the given span fits between span[above] and
                // curSpan, keeping curSpan
                return {above: above, count: count - 1};
            }
            if (curSpan.x > x) {
                // the span at [above + count] overlaps the given span,
                // so we continue down the contour
                continue ABOVE;
            }
            if ((curSpan.x <= x) &&
                ((aboveBottom + height) < (curSpan.top + curSpan.height))) {
                // the given span partially covers curSpan, and
                // will overlap it, so we keep curSpan
                return {above: above, count: count - 1};
            }
        }
        // the given span fits below span[above], replacing any
        // lower spans in the contour
        return {above: above, count: count - 1};
    }
    // the given span fits at the end of the contour, replacing no spans
    return {above: above, count: 0};
};

// add the given span to this contour where it fits, as given
// by getFit
Contour.prototype.insertFit = function(fit, x, top, height) {
    // if the previous span and the current span have the same x-coord,
    // and are vertically contiguous, merge them.
    var prevSpan = this.spans[fit.above];
    if ((Math.abs(prevSpan.x - x) < 1)
        && (Math.abs((prevSpan.top + prevSpan.height) - top) < 1) ) {
        prevSpan.height = (top + height) - prevSpan.top;
        // a bit of slop here is conservative if we take the max
        // (means things might get laid out slightly farther apart
        // than they would otherwise)
        prevSpan.x = Math.max(prevSpan.x, x);
        this.spans.splice(fit.above + 1, fit.count);
    } else {
        this.spans.splice(fit.above + 1, fit.count,
                          {
                              top: top,
                              x: x,
                              height: height
                          });
    }
};

// add the given span to this contour at the given location, if
// it would extend the contour
Contour.prototype.unionWith = function(x, top, height) {
    var startBottom, startIndex, endIndex, startSpan, endSpan;
    var bottom = top + height;
    START: for (startIndex = 0; startIndex < this.spans.length; startIndex++) {
        startSpan = this.spans[startIndex];
        startBottom = startSpan.top + startSpan.height;
        if (startSpan.top > top) {
            // the given span extends above an existing span
            endIndex = startIndex;
            break START;
        }
        if (startBottom > top) {
            // if startSpan covers (at least some of) the given span,
            if (startSpan.x >= x) {
                var covered = startBottom - top;
                // we don't have to worry about the covered area any more
                top += covered;
                height -= covered;
                // if we've eaten up the whole span, then it's submerged
                // and we don't have to do anything
                if (top >= bottom) return;
                continue;
            } else {
                // find the first span not covered by the given span
                for (endIndex = startIndex;
                     endIndex < this.spans.length;
                     endIndex++) {
                    endSpan = this.spans[endIndex];
                    // if endSpan extends below or to the right
                    // of the given span, then we need to keep it
                    if (((endSpan.top + endSpan.height) > bottom)
                        || endSpan.x > x) {
                        break START;
                    }
                }
                break START;
            }
        }
    }

    // if the previous span and the current span have the same x-coord,
    // and are vertically contiguous, merge them.
    var prevSpan = this.spans[startIndex - 1];
    if ((Math.abs(prevSpan.x - x) < 1)
        && (Math.abs((prevSpan.top + prevSpan.height) - top) < 1) ) {
        prevSpan.height = (top + height) - prevSpan.top;
        prevSpan.x = Math.max(prevSpan.x, x);
        this.spans.splice(startIndex, endIndex - startIndex);
    } else {
        this.spans.splice(startIndex, endIndex - startIndex,
                          {
                              top: top,
                              x: x,
                              height: height
                          });
    }
};

// returns the top of the to-be-added span that fits into "fit"
// (as returned by getFit)
Contour.prototype.getNextTop = function(fit) {
    return this.spans[fit.above].top + this.spans[fit.above].height;
};

function Layout(leftBound, rightBound) {
    this.leftBound = leftBound;
    this.rightBound = rightBound;
    // a Layout contains a left contour and a right contour;
    // the area between the contours is allocated, and the
    // area outside the contours is free.
    this.leftContour = new Contour();
    this.rightContour = new Contour();
    this.seen = {};
    this.leftOverlaps = [];
    this.rightOverlaps = [];
    this.totalHeight = 0;
}

Layout.prototype.addRect = function(id, left, right, height) {
    if (this.seen[id] !== undefined) return this.seen[id];
    // for each contour, we test the fit on the near side of the given rect,
    var leftFit = this.tryLeftFit(left, right, height, 0);
    var rightFit = this.tryRightFit(left, right, height, 0);

    var top;

    // and insert the far side from the side we tested
    // (we want to make sure the near side fits, but we want to extend
    //  the contour to cover the far side)
    if (leftFit.top < rightFit.top) {
        top = leftFit.top;
        this.leftContour.insertFit(leftFit.fit, this.rightBound - left,
                                   top, height);
        this.rightContour.unionWith(right - this.leftBound, top, height);
    } else {
        top = rightFit.top;
        this.rightContour.insertFit(rightFit.fit, right - this.leftBound,
                                    top, height);
        this.leftContour.unionWith(this.rightBound - left, top, height);
    }

    var existing = {id: id, left: left, right: right,
                    top: top, height: height};
    this.seen[id] = top;
    if (left <= this.leftBound) {
        this.leftOverlaps.push(existing);
        if (this.leftLayout) this.leftLayout.addExisting(existing);
    }
    if (right >= this.rightBound) {
        this.rightOverlaps.push(existing);
        if (this.rightLayout) this.rightLayout.addExisting(existing);
    }
    this.seen[id] = top;
    this.totalHeight = Math.max(this.totalHeight, top + height);
    return top;
};

// this method is called by the block to the left to see if a given fit works
// in this layout
// takes: proposed rectangle
// returns: {top: value that makes the rectangle fit in this layout,
//           fit: "fit" for passing to insertFit}
Layout.prototype.tryLeftFit = function(left, right, height, top) {
    var fit, nextFit;
    var curTop = top;
    while (true) {
        // check if the rectangle fits at curTop
        fit = this.leftContour.getFit(this.rightBound - right, height, curTop);
        curTop = Math.max(this.leftContour.getNextTop(fit), curTop);
        // if the rectangle extends onto the next block to the right;
        if (this.rightLayout && (right >= this.rightBound)) {
            // check if the rectangle fits into that block at this position
            nextFit = this.rightLayout.tryLeftFit(left, right, height, curTop);
            // if not, nextTop will be the next y-value where the rectangle
            // fits into that block
            if (nextFit.top > curTop) {
                // in that case, try again to see if that y-value works
                curTop = nextFit.top;
                continue;
            }
        }
        break;
    }
    return {top: curTop, fit: fit};
};

// this method is called by the block to the right to see if a given fit works
// in this layout
// takes: proposed rectangle
// returns: {top: value that makes the rectangle fit in this layout,
//           fit: "fit" for passing to insertFit}
Layout.prototype.tryRightFit = function(left, right, height, top) {
    var fit, nextFit;
    var curTop = top;
    while (true) {
        // check if the rectangle fits at curTop
        fit = this.rightContour.getFit(left - this.leftBound, height, curTop);
        curTop = Math.max(this.rightContour.getNextTop(fit), curTop);
        // if the rectangle extends onto the next block to the left;
        if (this.leftLayout && (left <= this.leftBound)) {
            // check if the rectangle fits into that block at this position
            nextFit = this.leftLayout.tryRightFit(left, right, height, curTop);
            // if not, nextTop will be the next y-value where the rectangle
            // fits into that block
            if (nextFit.top > curTop) {
                // in that case, try again to see if that y-value works
                curTop = nextFit.top;
                continue;
            }
        }
        break;
    }
    return {top: curTop, fit: fit};
};

Layout.prototype.hasSeen = function(id) {
    return (this.seen[id] !== undefined);
};

Layout.prototype.setLeftLayout = function(left) {
    for (var i = 0; i < this.leftOverlaps.length; i++) {
        left.addExisting(this.leftOverlaps[i]);
    }
    this.leftLayout = left;
};

Layout.prototype.setRightLayout = function(right) {
    for (var i = 0; i < this.rightOverlaps.length; i++) {
        right.addExisting(this.rightOverlaps[i]);
    }
    this.rightLayout = right;
};

Layout.prototype.cleanup = function() {
    this.leftLayout = undefined;
    this.rightLayout = undefined;
};

//expects an {id, left, right, height, top} object
Layout.prototype.addExisting = function(existing) {
    if (this.seen[existing.id] !== undefined) return;
    this.seen[existing.id] = existing.top;

    this.totalHeight =
        Math.max(this.totalHeight, existing.top + existing.height);

    if (existing.left <= this.leftBound) {
        this.leftOverlaps.push(existing);
        if (this.leftLayout) this.leftLayout.addExisting(existing);
    }
    if (existing.right >= this.rightBound) {
        this.rightOverlaps.push(existing);
        if (this.rightLayout) this.rightLayout.addExisting(existing);
    }

    this.leftContour.unionWith(this.rightBound - existing.left,
                               existing.top,
                               existing.height);
    this.rightContour.unionWith(existing.right - this.leftBound,
                                existing.top,
                                existing.height);
};

/*

Copyright (c) 2007-2010 The Evolutionary Software Foundation

Created by Mitchell Skinner <mitch_skinner@berkeley.edu>

This package and its accompanying libraries are free software; you can
redistribute it and/or modify it under the terms of the LGPL (either
version 2.1, or at your option, any later version) or the Artistic
License 2.0.  Refer to LICENSE for the full license text.

*/
