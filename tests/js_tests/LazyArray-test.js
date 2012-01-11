describe("LazyArray",
function () {
    var la;

    beforeEach(function() {
        la = new LazyArray({
                               urlTemplate: "lazyarray-{chunk}.json",
                               length: 12,
                               chunkSize: 5
                           });
               });

    it("should have length 12", function() {
        expect(la.length).toEqual(12);
    });

    it("should have \"zero\" at index 0", function() {
        runs(function() {
                 this.callback = jasmine.createSpy();
                 la.index(0, this.callback);
                 expect(this.callback).wasNotCalled();
             });

        waits(500);

        runs(function() {
                 expect(this.callback).wasCalledWith(0, "zero", undefined);
             });
    });

    it("should have \"five\" at index 5", function() {
        runs(function() {
                 this.callback = jasmine.createSpy();
                 la.index(5, this.callback);
                 expect(this.callback).wasNotCalled();
             });

        waits(500);

        runs(function() {
                 expect(this.callback).wasCalledWith(5, "five", undefined);
             });
    });

    it("should run a range call properly", function() {
        runs(function() {
                 this.callback = jasmine.createSpy();
                 la.range(3, 7, this.callback);
                 expect(this.callback).wasNotCalled();
             });

        waits(500);

        // how do we handle the fact that the async calls can return
        // in any order?
        // OTOH, when you reload the data should be cached
        runs(function() {
                 expect(this.callback.callCount).toEqual(5);
                 expect(this.callback.argsForCall[0]).toEqual(
                     [3, "three", undefined]);
                 expect(this.callback.argsForCall[1]).toEqual(
                     [4, "four", undefined]);
                 expect(this.callback.argsForCall[2]).toEqual(
                     [5, "five", undefined]);
                 expect(this.callback.argsForCall[3]).toEqual(
                     [6, "six", undefined]);
                 expect(this.callback.argsForCall[4]).toEqual(
                     [7, "seven", undefined]);

                 var cb2 = jasmine.createSpy();
                 la.range(4, 5, cb2);
                 expect(cb2.callCount).toEqual(2);
                 expect(cb2.argsForCall[0]).toEqual(
                     [4, "four", undefined]);
                 expect(cb2.argsForCall[1]).toEqual(
                     [5, "five", undefined]);
             });
    });

});