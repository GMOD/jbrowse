/*global require:false,console:false,phantom:false */
/*jshint maxstatements:13,maxcomplexity:3 */
var system = require('system');
var page = require('webpage').create();
page.onConsoleMessage = function(msg) {
    console.log(msg);
};
page.onError = function(msg, trace) {

    var msgStack = ['ERROR: ' + msg];

    if (trace && trace.length) {
      msgStack.push('TRACE:');
      trace.forEach(function(t) {
        msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
      });
    }

    console.error(msgStack.join('\n'));

  };

if (system.args.length != 2) {
  console.log('Usage: phantomjs phantomjs-test-runner.js URL');
  phantom.exit(1);
}


var JasmineUtil = {
  maxtimeSec: 20,
  isDone: function () {
    return page.evaluate(function(){
      return document.querySelector('.symbolSummary') !== null &&
             document.querySelector('.symbolSummary .pending') === null;
    });
  },
  parseResults: function () {
    var exitCode = page.evaluate(function () {
      var list = document.querySelectorAll('.results > #details > .specDetail.failed');
      if (list && list.length > 0) {
        console.log('');
        console.log(list.length + ' test(s) FAILED:');
        for( var i=0; i<list.length; i++ ) {
          var el = list[i],
              desc = el.querySelector('.description').innerText,
              res = el.querySelector('.resultMessage.fail').innerText;
          console.log('');
          console.log(desc);
          console.log(res);
          console.log('');
        }
        return 1;
      }
      else {
        console.log(document.querySelector('.alert > .passingAlert.bar').innerText);
        return 0;
      }
    });
    phantom.exit(exitCode);
  },
  waitAndRun: function (callback) {
    var self = this;
    var start = new Date().getTime();
    var intervalId = setInterval(function () {
      var millisPassed = new Date().getTime() - start;
      if ( self.isDone() ) {
        clearInterval(intervalId);
        callback();
        return ;
      }
      else if (millisPassed >= (self.maxtimeSec * 1000)) {
        console.log('Script timed out after ' + self.maxtimeSec + ' seconds');
        phantom.exit(1);
      }
    }, 100);
  }
};


var url = system.args[1];
var statusCode = null;

page.open(url, function (status) {
  if (status !== 'success') {
    console.log('Unable to open URI: ' + url);
    phantom.exit(1);
  }
  else {
    if(statusCode && statusCode.toString().substr(0,1) > 3) {
      console.log('Unable to open ' + url);
      console.log('Returned with status code - ' + statusCode);
      phantom.exit(1);
      return ;
    }
    page.evaluate(function () {
      console.log('Running test suite: ' + document.title);
      console.log('Loaded ' + window.location.href);
    });
    JasmineUtil.waitAndRun(JasmineUtil.parseResults);
  }
});
page.onResourceReceived = function (resource) {
  if (resource.url == url) {
    statusCode = resource.status;
  }
};

