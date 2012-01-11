/*==================================================
 *  Exhibit.LegendGradientWidget
 *==================================================
 */
Exhibit.LegendGradientWidget = function(containerElmt, uiContext) {
    this._div = containerElmt;
    this._uiContext = uiContext;
    
    this._initializeUI();
};

Exhibit.LegendGradientWidget.create = function (containerElmt, uiContext) {
    return new Exhibit.LegendGradientWidget(containerElmt, uiContext);
};

Exhibit.LegendGradientWidget.prototype.addGradient = function(configuration) {
	var gradientPoints = [];
	var gradientPoints = configuration;
	var sortObj = function(a, b) {
		return a.value - b.value;
	};
	gradientPoints.sort(sortObj);
	
	var theTable = document.createElement("table");
	var tableBody = document.createElement("tbody");
	var theRow1 = document.createElement("tr");
	var theRow2 = document.createElement("tr");
	var theRow3 = document.createElement("tr");
	
	theRow1.style.height="2em";
	theRow2.style.height="2em";
	theRow3.style.height="2em";
	theTable.style.width="80%";
	theTable.cellSpacing="0";
	theTable.style.emptyCells="show";
	theTable.style.marginLeft="auto";
	theTable.style.marginRight="auto";
	tableBody.appendChild(theRow1);
	tableBody.appendChild(theRow2);
	tableBody.appendChild(theRow3);
	theTable.appendChild(tableBody);
	
	this._theRow1 = theRow1;
	this._theRow2 = theRow2;
	this._theRow3 = theRow3;

	var globLowPoint = gradientPoints[0].value;
	var globHighPoint = gradientPoints[gradientPoints.length - 1].value;
	var stepSize = (globHighPoint - globLowPoint) / 50;
	var counter = 0;
	
	for(var i = 0; i < gradientPoints.length-1; i++) {
		var lowPoint = gradientPoints[i].value;
		var highPoint = gradientPoints[i+1].value;
		
		var colorRect = document.createElement("td");
		colorRect.style.backgroundColor = "rgb(" + gradientPoints[i].red + "," + gradientPoints[i].green + "," + gradientPoints[i].blue + ")";
		var numberRect = document.createElement("td");
		var textDiv = document.createElement("div");
		var theText = document.createTextNode(gradientPoints[i].value);
		textDiv.appendChild(theText);
		numberRect.appendChild(textDiv);
		theRow1.appendChild(document.createElement("td"));
		theRow2.appendChild(colorRect);
		theRow3.appendChild(numberRect);
		
		colorRect.onmouseover = function() {
			this.style.border="solid 1.2px";
		};
		colorRect.onmouseout = function() {
			this.style.border="none";	
		};
		
		counter++;
		
		for(var j = lowPoint + stepSize; j < highPoint; j += stepSize) {
			var fraction = (j - lowPoint)/(highPoint - lowPoint);
			var newRed = Math.floor(gradientPoints[i].red + fraction*(gradientPoints[i+1].red - gradientPoints[i].red));
			var newGreen = Math.floor(gradientPoints[i].green + fraction*(gradientPoints[i+1].green - gradientPoints[i].green));
			var newBlue = Math.floor(gradientPoints[i].blue + fraction*(gradientPoints[i+1].blue - gradientPoints[i].blue));
			
			var colorRect = document.createElement("td");
			colorRect.count = counter;
			colorRect.style.backgroundColor = "rgb(" + newRed + "," + newGreen + "," + newBlue + ")";
			var numberRect = document.createElement("td");
			var textDiv = document.createElement("div");
			var theText = document.createTextNode((Math.floor(j*100))/100);
			textDiv.appendChild(theText);
			numberRect.appendChild(textDiv);
			textDiv.style.width="2px";
			textDiv.style.overflow="hidden";
			textDiv.style.visibility="hidden";
			theRow1.appendChild(numberRect);
			theRow2.appendChild(colorRect);
			theRow3.appendChild(document.createElement("td"));
			counter++;
			
			colorRect.onmouseover = function() {
				this.parentNode.parentNode.childNodes[0].childNodes[this.count].childNodes[0].style.visibility="visible";
				this.parentNode.parentNode.childNodes[0].childNodes[this.count].childNodes[0].style.overflow="visible";
				this.style.border="solid 1.2px";
			};
			colorRect.onmouseout = function() {
				this.parentNode.parentNode.childNodes[0].childNodes[this.count].childNodes[0].style.visibility="hidden";
				this.parentNode.parentNode.childNodes[0].childNodes[this.count].childNodes[0].style.overflow="hidden";
				this.style.border="none";	
			};
		};
	};
	
	var high = gradientPoints.length - 1
	var colorRect = document.createElement("td");
	colorRect.style.backgroundColor = "rgb(" + gradientPoints[high].red + "," + gradientPoints[high].green + "," + gradientPoints[high].blue + ")";
	var numberRect = document.createElement("td");
	var textDiv = document.createElement("div");
	var theText = document.createTextNode(globHighPoint);
	textDiv.appendChild(theText);
	numberRect.appendChild(textDiv);
	theRow1.appendChild(document.createElement("td"));
	theRow2.appendChild(colorRect);
	theRow3.appendChild(numberRect);
	counter++;
	
	colorRect.onmouseover = function() {
		this.style.border="solid 1.2px";
	};
	colorRect.onmouseout = function() {
		this.style.border="none";	
	};
	
	this._div.appendChild(theTable);
};

Exhibit.LegendGradientWidget.prototype.addEntry = function(color, label) {
	var cell = document.createElement("td");
	
	cell.style.width="1.5em";
	cell.style.height="2em";
	this._theRow1.appendChild(cell);
	this._theRow1.appendChild(document.createElement("td"));
	this._theRow2.appendChild(document.createElement("td"));
	this._theRow3.appendChild(document.createElement("td"));
	
	var colorCell = document.createElement("td");
	
	colorCell.style.backgroundColor = color;
	this._theRow2.appendChild(colorCell);
	
	var labelCell = document.createElement("td");
	var labelDiv = document.createElement("div");
	
	labelDiv.appendChild(document.createTextNode(label));
	labelCell.appendChild(labelDiv);
	this._theRow3.appendChild(labelCell);
}	

Exhibit.LegendGradientWidget.prototype.dispose = function() {
    this._div.innerHTML = "";
    
    this._div = null;
    this._uiContext = null;
};

Exhibit.LegendGradientWidget.prototype._initializeUI = function() {
    this._div.className = "exhibit-legendGradientWidget";
    this._div.innerHTML = "";
};

Exhibit.LegendGradientWidget.prototype.clear = function() {
    this._div.innerHTML = "";
};
