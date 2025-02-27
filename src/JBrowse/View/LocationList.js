/**
 * Generic component that displays a list of genomic locations, along
 * with buttons to execute actions on them.
 */

define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/dom-construct',
  'dijit/form/Button',
  'JBrowse/Util',
  'dstore/Memory',
  'dgrid/OnDemandGrid',
  'dgrid/extensions/DijitRegistry',
], function (
  declare,
  array,
  dom,
  dijitButton,
  Util,
  MemoryStore,
  DGrid,
  DGridDijitRegistry,
) {
  var Grid = declare([DGrid, DGridDijitRegistry])

  return declare(null, {
    constructor: function (args, parent) {
      var thisB = this
      this.browser = args.browser

      // transform our data first, so that it's sortable.
      var locations = array.map(args.locations || [], function (l) {
        return {
          locstring: Util.assembleLocString(l),
          location: l,
          label: l.label || l.objectName,
          description: l.description,
          score: l.score,
          tracks: array
            .map(
              array.filter(l.tracks || [], function (t) {
                return t
              }), // remove nulls
              function (t) {
                return t.key || t.name || t.label || t
              },
            )
            .join(', '),
        }
      })

      // build the column list
      var columns = []
      if (
        array.some(locations, function (l) {
          return l.label
        })
      ) {
        columns.unshift({ label: 'Name', field: 'label' })
      }
      if (
        array.some(locations, function (l) {
          return l.description
        })
      ) {
        columns.unshift({ label: 'Description', field: 'description' })
      }
      if (
        array.some(locations, function (l) {
          return l.score
        })
      ) {
        columns.unshift({ label: 'Score', field: 'score' })
      }
      columns.push({ label: 'Location', field: 'locstring' })
      if (locations.length && locations[0].tracks) {
        columns.push({ label: 'Track', field: 'tracks' })
      }
      if (args.buttons) {
        columns.push({
          label: '',
          className: 'goButtonColumn',
          renderCell: function (object, value, node, options) {
            var container = dom.create('div')
            array.forEach(args.buttons, function (button) {
              var buttonArgs = dojo.mixin({}, button)
              buttonArgs.onClick = function () {
                button.onClick(object.location, value, node, options)
              }
              new dijitButton(buttonArgs).placeAt(container)
            })
            return container
          },
        })
      }

      // create the grid
      this.grid = new Grid(
        {
          columns: columns,
          collection: new MemoryStore({ data: locations }),
        },
        parent,
      )
    },
  })
})
