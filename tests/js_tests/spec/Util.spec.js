require(['dojo/_base/array', 'JBrowse/Util'], function (array, Util) {
  function expectDeepEqual(func, input, output) {
    it(JSON.stringify(input) + ' -> ' + JSON.stringify(output), function () {
      expect(func.apply(Util, input)).toEqual(output)
    })
  }

  function testAll(func, inOut) {
    array.forEach(inOut, function (testcase) {
      expectDeepEqual(func, testcase[0], testcase[1])
    })
  }

  describe('Util.fillTemplate', function () {
    testAll(Util.fillTemplate, [
      [['{bar}', { bar: 'someurl', baz: { foo: 42 } }], 'someurl'],
      [['{ bar}', { bar: 'someurl', baz: { foo: 42 } }], 'someurl'],
      [['{ bar  }', { bar: 'someurl', baz: { foo: 42 } }], 'someurl'],
      [['{bar  }', { bar: 'someurl', baz: { foo: 42 } }], 'someurl'],
      [['{baz.foo}', { bar: 'someurl', baz: { foo: 42 } }], '42'],
      [['{ baz.  foo }', { bar: 'someurl', baz: { foo: 42 } }], '42'],
      [['{ baz.foo}', { bar: 'someurl', baz: { foo: 42 } }], '42'],
      [['{baz.foo }', { bar: 'someurl', baz: { foo: 42 } }], '42'],
    ])
  })

  describe('Util.basename', function () {
    testAll(Util.basename, [
      [[null], undefined],
      [[{}, '.baz'], undefined],
      [['bar.baz'], 'bar.baz'],
      [['foo/bar.baz'], 'bar.baz'],
      [['foo/bar.baz', '.baz'], 'bar'],
      [['foo/bar.BAZ', '.baz'], 'bar'],
      [['foo/bar.baz', '.BAZ'], 'bar'],
      [['/noggin/boggin/'], 'boggin'],
      [['/bee/boo/foo/bar.baz', '.BAZ'], 'bar'],
      [['foo/barfbaz', '.baz'], 'barfbaz'],
      [['foo\\barfbaz', '.baz'], 'barfbaz'],
      [['foo\\bar.baz', '.baz'], 'bar'],
    ])
  })

  describe('Util.parseLocString', function () {
    testAll(Util.parseLocString, [
      [['2RHet'], null],
      [['2L'], null],
      [['snark123'], null],
      [['ctgA:3000..4000'], { ref: 'ctgA', start: 2999, end: 4000 }],
      [['ctgA:4000..3000'], { ref: 'ctgA', start: 2999, end: 4000 }],
      [['ctgA^:3,000..4,000.0'], { ref: 'ctgA^', start: 2999, end: 4000 }],
      [
        ['ctgA^:3,000..4,000.0 (42 kb)'],
        { ref: 'ctgA^', start: 2999, end: 4000, extra: '42 kb' },
      ],
      [
        ['ziggy234.1:3,000..4,000.0 (42 kb)'],
        { ref: 'ziggy234.1', start: 2999, end: 4000, extra: '42 kb' },
      ],
      [['3,000..4,000.0 (42 kb)'], { start: 2999, end: 4000, extra: '42 kb' }],
      [['3,000'], { start: 2999, end: 3000 }],
      [['  3000 (42kb) '], { start: 2999, end: 3000, extra: '42kb' }],
      [['  3000 (42) '], { start: 2999, end: 3000, extra: '42' }],
      [['  3000 ( 42 ) '], { start: 2999, end: 3000, extra: ' 42 ' }],
      [['3000 ( 42 ) '], { start: 2999, end: 3000, extra: ' 42 ' }],
      [
        [' higgleplonk: 3000 ( 42 ) '],
        { ref: 'higgleplonk', start: 2999, end: 3000, extra: ' 42 ' },
      ],
      [
        ['234324x#21: 3000 ( 42 ) '],
        { ref: '234324x#21', start: 2999, end: 3000, extra: ' 42 ' },
      ],
      [['ctgA:3000'], { ref: 'ctgA', start: 2999, end: 3000 }],
      [
        ['ctgA:3000-4000 (42 kb)'],
        { ref: 'ctgA', start: 2999, end: 4000, extra: '42 kb' },
      ],
      [['ctgA:3000-4000'], { ref: 'ctgA', start: 2999, end: 4000 }],
      [['ctgA:3000...4000'], { ref: 'ctgA', start: 2999, end: 4000 }],
      [['ctgA:3000--4000'], { ref: 'ctgA', start: 2999, end: 4000 }],
      [['ctgA:3,000..4,000.0'], { ref: 'ctgA', start: 2999, end: 4000 }],
      [
        ['HLA-A*01:01:01:01:3000-4000'],
        { ref: 'HLA-A*01:01:01:01', start: 2999, end: 4000 },
      ],
      [
        ['HLA-A*01:01:01:01:3000'],
        { ref: 'HLA-A*01:01:01:01', start: 2999, end: 3000 },
      ],
      //                 [ ['HLA-A*01:01:01:01:'], { ref: 'HLA-A*01:01:01:01', start: 0, end: 1 } ],
      [
        ['ctgA:3000-4000:50-100'],
        { ref: 'ctgA:3000-4000', start: 49, end: 100 },
      ],
      [['ctgA:3000-4000:50'], { ref: 'ctgA:3000-4000', start: 49, end: 50 }],
      //                 [ ['ctgA:3000-4000:'], { ref: 'ctgA:3000-4000', start: 49, end: 50 } ]
    ])
  })
})
