var requirejs = require('requirejs');
requirejs.config({
    nodeRequire: require,
    baseUrl: 'src'
});
exports.require = requirejs;
exports.tap = require('tap');
exports.test = exports.tap.test;

