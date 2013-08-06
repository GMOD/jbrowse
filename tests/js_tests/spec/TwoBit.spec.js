require([
            'JBrowse/Store/Sequence/TwoBit',
            'JBrowse/Browser',
            'dojo/aspect',
            'JBrowse/Model/XHRBlob'

        ], function(
            TwoBitStore,
            Browser,
            aspect,
            XHRBlob
        ) {
    
describe(".2bit data store with T_ko.2bit", function() {

    var t = new TwoBitStore({
            browser: new Browser({ unitTestMode: true }),
            blob: new XHRBlob("../data/T_ko.2bit")
        });

    it("constructs", function() {
        expect(t).toBeTruthy();
    });

    it("loads some data", function() {
        var done;
        var features = [];

        t.getFeatures({ref: "chr1", start: 0, end: 50000 },
            function(feature) {
                features.push(feature);
            },
            function() { done = true; });

        expect(t.twoBit.byteSwapped).toBe(true);

        waitsFor( function() { return done; }, 2000);
        runs(function(){ 
            expect(features.length).toEqual(1);
            expect(features[0].seq.length).toEqual(50000);
        });
    });

    it("has correct behavior when refSeq not defined in file", function() {
        var done;
        var features = [];

        t.getFeatures({ref: "chr2", start: 0, end: 50000 },
            function(feature) {
                features.push(feature);
                console.log(feature);
            },
            function() { done = true; });

        expect(t.twoBit.byteSwapped).toBe(true);

        waitsFor( function() { return done; }, 2000);
        runs(function(){ 
            expect(features.length).toEqual(0);
        });
    });
   
});

describe(".2bit data store with volvox.2bit", function() {

    var t2 = new TwoBitStore({
            browser: new Browser({ unitTestMode: true }),
            blob: new XHRBlob("../data/volvox.2bit")
        });

    it("constructs", function() {
        expect(t2).toBeTruthy();
    });

    it("loads some data", function() {
        var done;
        var features = [];

        t2.getFeatures({ref: "ctgA", start: 0, end: 50000 },
            function(feature) {
                features.push(feature);
            },
            function() { done = true; });

        expect(t2.twoBit.byteSwapped).toBe(true);

        waitsFor( function() { return done; }, 2000);
        runs(function(){ 
            expect(features.length).toEqual(1);
            expect(features[0].seq.length).toEqual(50000);
        });
    });

    it("loads some more data", function() {
        var done;
        var features = [];

        t2.getFeatures({ref: "ctgB", start: 0, end: 5000 },
            function(feature) {
                features.push(feature);
            },
            function() { done = true; });

        expect(t2.twoBit.byteSwapped).toBe(true);

        waitsFor( function() { return done; }, 2000);
        runs(function(){ 
            expect(features.length).toEqual(1);
            expect(features[0].seq.length).toEqual(5000);
        });
    });

    it("has correct behavior when refSeq not defined in file", function() {
        var done;
        var features = [];

        t2.getFeatures({ref: "nonexistent", start: 0, end: 50000 },
            function(feature) {
                features.push(feature);
                console.log(feature);
            },
            function() { done = true; });

        waitsFor( function() { return done; }, 2000);
        runs(function(){ 
            expect(features.length).toEqual(0);
        });
    });
   
});


});