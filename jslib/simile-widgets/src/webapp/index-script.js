function onLoad() {
    var examples = [
        {   url:        "examples/presidents/presidents.html",
            screenshot: "images/example-screenshot-presidents.png"
        },
        {   url:        "examples/flags/flags.html",
            screenshot: "images/example-screenshot-flags.png"
        },
        {   url:        "examples/cereals/cereal-characters.html",
            screenshot: "images/example-screenshot-cereals.png"
        },
        {   url:        "examples/billionaires/billionaires.html",
            screenshot: "images/example-screenshot-billionnaires.png"
        },
        {   url:        "examples/senate/senate.html",
            screenshot: "images/example-screenshot-senate.png"
        },
        {   url:        "examples/nobelists/nobelists.html",
            screenshot: "images/example-screenshot-nobelists.png"
        },
        {   url:        "examples/factbook/factbook-people.html",
            screenshot: "images/example-screenshot-factbook.png"
        },
        {   url:        "examples/CSAIL-PIs/CSAIL-PIs.html",
            screenshot: "images/example-screenshot-csail-pis.png"
        },
        {   url:        "examples/cities/cities.html",
            screenshot: "images/example-screenshot-cities.png"
        }
    ];
    
    var carouselContent = document.getElementById("carousel-content");
    carouselContent.style.display = "none";
    
    var tr = carouselContent.rows[0];
    
    var pngIsTranslucent = true;
    var isIE = (navigator.appName.toLowerCase().indexOf("microsoft") != -1);
    if (isIE) {
        var parseVersionString = function(s) {
            return parseInt(s.split(".")[0]);
        };
        var indexOf = function(s, sub, start) {
            var i = s.indexOf(sub, start);
            return i >= 0 ? i : s.length;
        };

        var ua = navigator.userAgent.toLowerCase();
        var offset = ua.indexOf("msie ");
        if (offset >= 0) {
            var majorVersion = parseVersionString(ua.substring(offset + 5, indexOf(ua, ";", offset)));
            pngIsTranslucent = (majorVersion > 6);
        }
    }
    
    var makeImage = pngIsTranslucent ? 
        function(url) {
            elmt = document.createElement("img");
            elmt.setAttribute("src", url);
            return elmt;
        } :
        function(url) {
            elmt = document.createElement("img");
            elmt.style.width = "1px";  // just so that IE will calculate the size property
            elmt.style.height = "1px";
            elmt.style.filter = "progid:DXImageTransform.Microsoft.AlphaImageLoader(src='" + url +"', sizingMethod='image')";
            return elmt;
        };

    var makeExample = function(index) {
        var example = examples[index];
        
        var a = document.createElement("a");
        a.href = examples[index].url;
        a.target = "_blank";
        
        var img = makeImage(example.screenshot);
        img.className = "example-screenshot";
        a.appendChild(img);
        
        var td = tr.insertCell(index);
        td.appendChild(a);
    }
    for (var i = 0; i < examples.length; i++) {
        makeExample(i);
    }
    
    var carousel = document.getElementById("carousel");
    
    var scrollLeft = makeImage("images/scroll-left.png");
    scrollLeft.id = "scroll-left";
    scrollLeft.onclick = scrollToLeft;
    carousel.appendChild(scrollLeft);
    
    var scrollRight = makeImage("images/scroll-right.png");
    scrollRight.id = "scroll-right";
    scrollRight.onclick = scrollToRight;
    carousel.appendChild(scrollRight);
    
    window.onresize = onWindowResize;
    
    /*
     * Show and animate the carousel content in
     */
    carouselContent.style.left = "0px";//Math.floor(carousel.offsetWidth / 2) + "px";
    carouselContent.style.display = "block";
    /*
    animation = new Animation(
        function(current, change) {
            carouselContent.style.left = current + "px";
        }, 
        Math.floor(carousel.offsetWidth / 2), 
        0, 
        2000,
        function() {
            animation = null;
            showHideScrollButtons();
        }
    );
    animation.run();
    */
    //window.setTimeout(march, 200);
}

function onWindowResize() {
    var carousel = document.getElementById("carousel");
    var carouselContent = document.getElementById("carousel-content");
    
    carouselContent.style.left = 
        Math.max(
            Math.min(carouselContent.offsetLeft, 0), 
            carousel.offsetWidth - carouselContent.offsetWidth
        ) + "px";
        
    showHideScrollButtons();
}

function onCarouselMouseOver() {
    march = function() {};
    showHideScrollButtons();
}

function march() {
    var carousel = document.getElementById("carousel");
    var carouselContent = document.getElementById("carousel-content");
    if (carouselContent.offsetLeft + carouselContent.offsetWidth > carousel.offsetWidth) {
        carouselContent.style.left = (carouselContent.offsetLeft - 1) + "px";
        
        window.setTimeout(march, 120);
    }
}

function showHideScrollButtons() {
    var carousel = document.getElementById("carousel");
    var carouselContent = document.getElementById("carousel-content");
    
    var scrollLeftButton = document.getElementById("scroll-left");
    var scrollRightButton = document.getElementById("scroll-right");
    scrollLeftButton.style.display = (carouselContent.offsetLeft < -1) ? "block" : "none";
    scrollRightButton.style.display = (carouselContent.offsetLeft + carouselContent.offsetWidth > carousel.offsetWidth) ? "block" : "none";
}

var animation = null;

function scrollToLeft() {
    if (animation != null) {
        animation.canceled = true;
    }
    
    var carousel = document.getElementById("carousel");
    var carouselContent = document.getElementById("carousel-content");
    
    var maxDistance = Math.floor(0.7 * carousel.offsetWidth);
    var from = carouselContent.offsetLeft;
    var to = Math.min(
        carouselContent.offsetLeft + maxDistance,
        0
    );
    
    animation = new Animation(
        function(current, change) {
            carouselContent.style.left = current + "px";
        }, 
        from, 
        to, 
        500 + Math.round(1000 * (to - from) / maxDistance),
        function() {
            animation = null;
            showHideScrollButtons();
        }
    );
    animation.run();
}

function scrollToRight() {
    if (animation != null) {
        animation.canceled = true;
    }
    
    var carousel = document.getElementById("carousel");
    var carouselContent = document.getElementById("carousel-content");
    
    var maxDistance = Math.floor(0.7 * carousel.offsetWidth);
    var from = carouselContent.offsetLeft;
    var to = Math.max(
        carouselContent.offsetLeft - maxDistance,
        carousel.offsetWidth - carouselContent.offsetWidth
    );
    
    animation = new Animation(
        function(current, change) {
            carouselContent.style.left = Math.floor(current) + "px";
        }, 
        from, 
        to, 
        500 + Math.round(1000 * (from - to) / maxDistance),
        function() {
            animation = null;
            showHideScrollButtons();
        }
    );
    animation.run();
}

function Animation(f, from, to, duration, cont) {
    this.f = f;
    this.cont = (typeof cont == "function") ? cont : function() {};
    
    this.from = from;
    this.to = to;
    this.current = from;
    
    this.duration = duration;
    this.start = new Date().getTime();
    this.timePassed = 0;
    
    this.canceled = false;
};

Animation.prototype.run = function() {
    var a = this;
    window.setTimeout(function() { a.step(); }, 50);
};

Animation.prototype.step = function() {
    if (this.canceled) return;
    
    this.timePassed += 50;
    
    var timePassedFraction = this.timePassed / this.duration;
    var parameterFraction = 1 - Math.exp(-7 * timePassedFraction); //-Math.cos(timePassedFraction * Math.PI) / 2 + 0.5;
    var current = parameterFraction * (this.to - this.from) + this.from;
    
    try {
        this.f(current, current - this.current);
    } catch (e) {
    }
    this.current = current;
    
    if (this.timePassed < this.duration) {
        this.run();
    } else {
        this.f(this.to, 0);
        this["cont"]();
    }
};
