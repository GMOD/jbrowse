/*global dojo */
require(['JBrowse/Browser', 'JBrowse/View/Track/Sequence'], function (
  Browser,
  SequenceTrack,
) {
  describe('sequence track', function () {
    it('test track rendering', function () {
      var browser = new Browser({ unitTestMode: true })

      var output = dojo.create(
        'div',
        {
          style: {
            display: 'none',
          },
        },
        document.body,
      )
      var track = new SequenceTrack({
        browser: browser,
      })
      track.div = output
      track.blockHeights = []
      track.heightUpdateCallback = function () {}

      var block = {
        startBase: 0,
        endBase: 6,
        domNode: output,
      }

      track._fillSequenceBlock(block, 0, 25, 'XXATGATGATGATGATGATGXX')
      console.log(output)

      var f = output.children[2].children[0].children[0].children
      var arr = Array.prototype.slice.call(f)
      var seq = arr
        .map(function (elt) {
          return elt.innerHTML
        })
        .join('')
      expect('MMMMMM').toEqual(seq)

      var f = output.children[1].children[0].children[0].children
      var arr = Array.prototype.slice.call(f)
      var seq = arr
        .map(function (elt) {
          return elt.innerHTML
        })
        .join('')
      expect('*****&nbsp;').toEqual(seq)

      var f = output.children[4].children[0].children[0].children
      var arr = Array.prototype.slice.call(f)
      var seq = arr
        .map(function (elt) {
          return elt.innerHTML
        })
        .join('')
      expect('HHHHHH').toEqual(seq)

      dojo.empty(output)

      track._fillSequenceBlock(block, 0, 1, 'XXATGATGATGATGATGATGXX')
      console.log(output)

      var f = output.children[2].children[0].children[0].children
      var arr = Array.prototype.slice.call(f)
      var seq = arr
        .map(function (elt) {
          console.log(elt.className)
          return dojo.hasClass(elt, 'aminoAcid_start') ? 'M' : 'X'
        })
        .join('')
      expect('MMMMMM').toEqual(seq)

      var f = output.children[1].children[0].children[0].children
      var arr = Array.prototype.slice.call(f)
      var seq = arr
        .map(function (elt) {
          return dojo.hasClass(elt, 'aminoAcid_stop') ? '*' : 'X'
        })
        .join('')
      expect('*****X').toEqual(seq)

      var f = output.children[4].children[0].children[0].children
      var arr = Array.prototype.slice.call(f)
      var seq = arr
        .map(function (elt) {
          return dojo.hasClass(elt, 'aminoAcid_h') ? 'H' : 'X'
        })
        .join('')
      expect('HHHHHH').toEqual(seq)
    })
  })
})
