import dompurify from 'dompurify'
/**
 * Mixin that provides generic functions for displaying nested data.
 */
define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'dojo/query',
  'dojo/dom-construct',
  'dojo/dom-class',
  'dstore/Memory',
  'dgrid/OnDemandGrid',
  'dgrid/extensions/DijitRegistry',
  'JBrowse/Util',
], function (
  declare,
  lang,
  array,
  query,
  domConstruct,
  domClass,
  MemoryStore,
  DGrid,
  DGridDijitRegistry,
  Util,
) {
  // make a DGrid that registers itself as a dijit widget
  var Grid = declare([DGrid, DGridDijitRegistry])

  return declare(null, {
    renderDetailField: function (
      parentElement,
      title,
      val,
      f,
      class_,
      externalFieldMeta = {},
    ) {
      if (val === null || val === undefined) {
        return ''
      }

      // if this object has a 'fmtDetailFooField' function, delegate to that
      var fieldSpecificFormatter
      if (
        (fieldSpecificFormatter = this[`fmtDetail${Util.ucFirst(title)}Field`])
      ) {
        return fieldSpecificFormatter.apply(this, arguments)
      }

      // otherwise, use default formatting

      class_ = class_ || title.replace(/\W/g, '_').toLowerCase()

      var formatted_title = title
      // if this object has a config value 'fmtDetailField_Foo' function, apply it to field title
      if (
        (fieldSpecificFormatter = this.config[`fmtDetailField_${title}`]) &&
        f
      ) {
        formatted_title = fieldSpecificFormatter(title, f)
        if (!formatted_title) {
          return ''
        } // if the callback returns null, remove field from dialog
      } else if (
        (fieldSpecificFormatter = this.config[`fmtMetaField_${title}`]) &&
        !f
      ) {
        formatted_title = fieldSpecificFormatter(title)
        if (!formatted_title) {
          return ''
        } // if the callback returns null, remove field from dialog
      }

      // special case for values that include metadata about their
      // meaning, which are formed like { values: [], meta:
      // {description: }.  break it out, putting the meta description in a `title`
      // attr on the field name so that it shows on mouseover, and
      // using the values as the new field value.
      var fieldMeta
      if (typeof val == 'object' && !Array.isArray(val) && 'values' in val) {
        fieldMeta = (val.meta || {}).description || (val.meta || {}).Description
        // join the description if it is an array
        if (lang.isArray(fieldMeta)) {
          fieldMeta = fieldMeta.join(', ')
        }

        val = val.values
      } else {
        fieldMeta = externalFieldMeta.description
      }

      if (
        (fieldSpecificFormatter =
          this.config[`fmtDetailDescription_${title}`]) &&
        f
      ) {
        fieldMeta = fieldSpecificFormatter(fieldMeta)
      } else if (
        (fieldSpecificFormatter = this.config[`fmtMetaDescription_${title}`]) &&
        !f
      ) {
        fieldMeta = fieldSpecificFormatter(fieldMeta)
      }
      var titleAttr = fieldMeta ? ` title="${fieldMeta}"` : ''
      var fieldContainer = domConstruct.create(
        'div',
        {
          className: 'field_container',
          // eslint-disable-next-line xss/no-mixed-html
          innerHTML: dompurify.sanitize(
            `<h2 class="field ${class_}"${titleAttr}>${formatted_title}</h2>`,
          ),
        },
        parentElement,
      )
      var valueContainer = domConstruct.create(
        'div',
        { className: `value_container ${class_}` },
        fieldContainer,
      )

      var count = this.renderDetailValue(valueContainer, title, val, f, class_)
      if (typeof count == 'number' && count > 4) {
        // eslint-disable-next-line xss/no-mixed-html
        query('h2', fieldContainer)[0].innerHTML = dompurify.sanitize(
          `${formatted_title} (${count})`,
        )
      }

      return fieldContainer
    },

    renderDetailValue: function (parent, title, val, f, class_) {
      var thisB = this

      if (!lang.isArray(val) && val && val.values) {
        val = val.values
      }
      console.log(val)

      // if this object has a 'fmtDetailFooValue' function, delegate to that
      var fieldSpecificFormatter
      if (
        (fieldSpecificFormatter = this[`fmtDetail${Util.ucFirst(title)}Value`])
      ) {
        return fieldSpecificFormatter.apply(this, arguments)
      }

      // otherwise, use default formatting

      // if this object has a config value 'fmtDetailValue_Foo' function, apply it to val
      if (
        (fieldSpecificFormatter = this.config[`fmtDetailValue_${title}`]) &&
        f
      ) {
        val = fieldSpecificFormatter(val, f)
        if (!val) {
          val = ''
        }
        if (val.length == 1) {
          val = val[0]
        } // avoid recursion when an array of length 1 is returned
      } else if (
        (fieldSpecificFormatter = this.config[`fmtMetaValue_${title}`]) &&
        !f
      ) {
        val = fieldSpecificFormatter(val)
        if (val.length == 1) {
          val = val[0]
        }
      }

      var valType = typeof val
      if (valType == 'object' && val === null) {
        val = ''
      }
      if (typeof val.toHTML == 'function') {
        val = val.toHTML()
      }
      if (valType == 'boolean') {
        val = val ? 'yes' : 'no'
      } else if (valType == 'undefined' || val === null) {
        return 0
      } else if (lang.isArray(val)) {
        var vals
        if (val.length > 0 && lang.isObject(val[0])) {
          parent.style.width = '90%'
          vals = val.map(v => {
            const itemContainer = domConstruct.create(
              'div',
              {
                className: `value_container ${class_}`,
                style: { width: '100%' },
              },
              parent,
            )
            this.renderDetailValue(itemContainer, title, v, f, class_)
            return itemContainer
          })
        } else {
          vals = array.map(
            val,
            function (v) {
              return this.renderDetailValue(parent, title, v, f, class_)
            },
            this,
          )
        }
        if (vals.length > 1) {
          domClass.add(parent, 'multi_value')
        }
        if (vals.length > 10) {
          domClass.add(parent, 'big')
        }
        return vals.length
      } else if (valType == 'object') {
        var keys = Util.dojof.keys(val).sort()
        var count = keys.length
        if (count > 5) {
          this.renderDetailValueGrid(
            parent,
            title,
            f,
            // iterator
            function () {
              if (!keys.length) {
                return null
              }
              var k = keys.shift()
              var value = val[k]

              var item = { id: k }

              if (typeof value == 'object') {
                for (var field in value) {
                  item[field] = thisB._valToString(value[field])
                }
              } else {
                item.value = value
              }

              return item
            },
            {
              descriptions: (function () {
                if (!keys.length) {
                  return {}
                }

                var subValue = val[keys[0]]
                var descriptions = {}
                for (var k in subValue) {
                  descriptions[k] =
                    (subValue[k].meta && subValue[k].meta.description) || null
                }
                return descriptions
              })(),
            },
          )
          return count
        } else {
          array.forEach(
            keys,
            function (k) {
              return this.renderDetailField(parent, k, val[k], f, class_, {})
            },
            this,
          )
          return keys.length
        }
      }

      domConstruct.create(
        'div',
        {
          className: `value ${
            val.length > 70 && val.indexOf(' ') == -1 ? 'long ' : ''
          }${class_}`,
          // eslint-disable-next-line xss/no-mixed-html
          innerHTML: Util.escapeHTML(`${val}`),
        },
        parent,
      )
      return 1
    },

    renderDetailValueGrid: function (parent, title, f, iterator, attrs) {
      var thisB = this
      var rows = []
      var item
      var descriptions = attrs.descriptions || {}
      var cellRenderers = attrs.renderCell || {}
      while ((item = iterator())) {
        rows.push(item)
      }

      if (!rows.length) {
        return document.createElement('span')
      }

      function defaultRenderCell(field, value, node, options) {
        thisB.renderDetailValue(node, '', value, f, '')
      }

      var columns = []
      for (var field in rows[0]) {
        ;(function (field) {
          var column = {
            label: { id: 'Name' }[field] || Util.ucFirst(field),
            field: field,
            renderCell: cellRenderers[field] || defaultRenderCell,
            renderHeaderCell: function (contentNode) {
              if (descriptions[field]) {
                contentNode.title = descriptions[field]
              }
              contentNode.appendChild(
                document.createTextNode(column.label || column.field),
              )
            },
          }
          columns.push(column)
        })(field)
      }

      // create the grid
      parent.style.overflow = 'hidden'
      parent.style.width = '90%'
      var grid = new Grid(
        {
          columns: columns,
          collection: new MemoryStore({ data: rows }),
        },
        parent,
      )

      return parent
    },

    _valToString: function (val) {
      if (!val) {
        return ''
      }
      if (lang.isArray(val)) {
        return array.map(val, lang.hitch(this, '_valToString')).join(' ')
      } else if (typeof val == 'object') {
        if ('values' in val) {
          return this._valToString(val.values)
        } else {
          return JSON.stringify(val)
        }
      }
      return `${val}`
    },
  })
})
