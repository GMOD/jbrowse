/**
 * Extends dojo/has with a few additional tests, and makes sure dojo/sniff is loaded.
 */

define(['dojo/has', 'dojo/sniff'], function (has) {
  // does the browser support typed arrays?
  has.add('typed-arrays', function () {
    try {
      var a = new Uint8Array(1)
      return !!a
    } catch (e) {}
    return false
  })

  // does it support canvas?
  has.add('canvas', function () {
    try {
      return !!document.createElement('canvas').getContext('2d')
    } catch (e) {}
    return false
  })

  // some browsers don't do a very good job with
  // percentage-based and fractional-pixel HTML coordinates
  // and sizes
  has.add(
    'inaccurate-html-layout',
    function () {
      return has('safari') || has('ie') < 9
    },
    true,
  )

  has.add(
    'save-generated-files',
    function () {
      var canSave = false
      try {
        canSave = Blob && !(has('ie') < 10) && !(has('safari') < 10)
      } catch (e) {}
      return canSave
    },
    true,
  )

  // similar to the inaccurate-html-layout problem, but specifically related to width being 100%
  // rounding on canvas features at the time being
  has.add(
    'inaccurate-html-width',
    function () {
      return has('safari') || has('chrome')
    },
    true,
  )

  return has
})
