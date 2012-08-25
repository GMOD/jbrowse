require(['JBrowse/ConfigManager'], function( ConfigManager ) {

describe("ConfigManager", function () {
    it( "should work with a config with no includes", function() {
            var m = new ConfigManager({
                config: { foo: 1 },
                browser: { fatalError: function(error) { throw error; } },
                skipValidation: true
            });
            var config;
            expect(m).toBeTruthy();
            waitsFor( function() { return config; }, 1000 );
            m.getFinalConfig( function(c) {
                config = c;
            });
            runs(function() {
                expect(config.foo).toEqual(1);
            });
    });

    it( "should work with a config with one include", function() {
            var m = new ConfigManager({
                config: {
                    include: [ '../data/conf/no_includes.json'],
                    overrideMe: 'rootConfig',
                    foo: 1
                },
                browser: { fatalError: function(error) { throw error; } },
                skipValidation: true
            });
            var config;
            expect(m).toBeTruthy();
            waitsFor( function() { return config; }, 1000 );
            m.getFinalConfig( function(c) {
                config = c;
            });
            runs(function() {
                expect(config.foo).toEqual(1);
                expect(config.bar).toEqual(42);
                expect(config.overrideMe).toEqual('rootConfig');
            });
    });

    it( "should work with a config with nested includes", function() {
            var m = new ConfigManager({
                config: {
                    include: [ '../data/conf/includes.json'],
                    overrideMe: 'rootConfig',
                    foo: 1
                },
                browser: { fatalError: function(error) { throw error; } },
                skipValidation: true
            });
            var config;
            expect(m).toBeTruthy();
            waitsFor( function() { return config; }, 1000 );
            m.getFinalConfig( function(c) {
                config = c;
            });
            runs(function() {
                console.log(config);
                expect(config.foo).toEqual(1);
                expect(config.bar).toEqual(42);
                expect(config.overrideMe).toEqual('rootConfig');
                expect(config.override2).toEqual('no_includes.json');
                expect(config.zoz).toEqual(42);
            });
    });
});
});