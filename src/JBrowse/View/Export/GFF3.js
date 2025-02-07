import gff from '@gmod/gff'

define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/_base/array',
  'JBrowse/View/Export',
], function (declare, lang, array, ExportBase) {
  return declare(
    ExportBase,
    /**
     * @lends JBrowse.View.Export.GFF3.prototype
     */
    {
      /**
       * Data export driver for GFF3 format.
       * @constructs
       */
      constructor: function (args) {
        this._idCounter = 0
        this.lastSync = 0
      },

      gff3_field_names: [
        'seq_id',
        'source',
        'type',
        'start',
        'end',
        'score',
        'strand',
        'phase',
        'attributes',
      ],

      gff3_reserved_attributes: [
        'ID',
        'Name',
        'Alias',
        'Parent',
        'Target',
        'Gap',
        'Derives_from',
        'Note',
        'Dbxref',
        'Ontology_term',
        'Is_circular',
      ],

      /**
       * @returns false if the field goes in tabular portion of gff3, true otherwise
       * @private
       */
      _is_not_gff3_tab_field: function (fieldname) {
        if (!this._gff3_fields_by_name) {
          var fields = {}
          dojo.forEach(this.gff3_field_names, function (f) {
            fields[f] = true
          })
          this._gff3_fields_by_name = fields
        }

        return !this._gff3_fields_by_name[fieldname.toLowerCase()]
      },

      /**
       * @returns the capitalized attribute name if the given field name
       * corresponds to a GFF3 reserved attribute
       * @private
       */
      _gff3_reserved_attribute: function (fieldname) {
        if (!this._gff3_reserved_attributes_by_lcname) {
          var fields = {}
          dojo.forEach(this.gff3_reserved_attributes, function (f) {
            fields[f.toLowerCase()] = f
          })
          this._gff3_reserved_attributes_by_lcname = fields
        }

        return this._gff3_reserved_attributes_by_lcname[fieldname.toLowerCase()]
      },

      exportRegion(region, callback) {
        this.print('##gff-version 3\n')
        this.print(
          `##sequence-region ${region.ref} ${region.start + 1} ${region.end}\n`,
        )
        this.inherited(arguments)
      },

      /**
       * Format a feature into a string.
       * @param {Object} feature feature object (like those returned from JBrowse/Store/SeqFeature/*)
       * @returns {String} GFF3 string representation of the feature
       */
      formatFeature: function (feature, parentID) {
        var fields = dojo.map(
          [feature.get('seq_id') || this.refSeq.name].concat(
            dojo.map(
              this.gff3_field_names.slice(1, 8),
              function (field) {
                return feature.get(field)
              },
              this,
            ),
          ),
          function (data) {
            var dt = typeof data
            return gff.util.escapeColumn(
              dt == 'string' || dt == 'number' ? data : '.',
            )
          },
          this,
        )

        // convert back from interbase
        if (typeof parseInt(fields[3]) == 'number') fields[3]++
        // normalize the strand field
        fields[6] = { 1: '+', '-1': '-', 0: '.' }[fields[6]] || fields[6]

        // format the attributes
        var attr = this._gff3_attributes(feature)
        if (parentID) attr.Parent = parentID
        else delete attr.Parent

        var subfeatures = array.map(
          feature.get('subfeatures') || [],
          function (feat) {
            if (!attr.ID) {
              attr.ID = ++this._idCounter
            }
            return this.formatFeature(feat, attr.ID)
          },
          this,
        )

        // need to format the attrs after doing the subfeatures,
        // because the subfeature formatting might have autocreated an
        // ID for the parent
        fields[8] = this._gff3_format_attributes(attr)

        var fl = fields.join('\t') + '\n'
        subfeatures.unshift(fl)
        return subfeatures.join('')
      },

      /**
       * Write the feature to the GFF3 under construction.
       * @returns nothing
       */
      writeFeature: function (feature) {
        var fmt = this.formatFeature(feature)
        this.print(fmt)

        // avoid printing sync marks more than every 10 lines
        if (this.lastSync >= 9) {
          this.lastSync = 0
          this.print('###\n')
        } else {
          this.lastSync += fmt.length || 1
        }
      },

      /**
       * Extract a key-value object of gff3 attributes from the given
       * feature.  Attribute names will have proper capitalization.
       * @private
       */
      _gff3_attributes: function (feature) {
        var tags = array.filter(
          feature.tags(),
          dojo.hitch(this, function (f) {
            f = f.toLowerCase()
            return this._is_not_gff3_tab_field(f) && f != 'subfeatures'
          }),
        )
        var attrs = {}
        array.forEach(
          tags,
          function (tag) {
            var val = feature.get(tag)
            var valtype = typeof val
            if (valtype == 'boolean') val = val ? 1 : 0
            else if (valtype == 'undefined') return
            tag =
              this._gff3_reserved_attribute(tag) ||
              this._ensure_non_reserved(tag)
            attrs[tag] = val
          },
          this,
        )
        return attrs
      },

      // ensure that an attribute name is not reserved.  currently does
      // this by adding a leading underscore to attribute names that
      // have initial capital letters.
      _ensure_non_reserved: function (str) {
        return str.replace(/^[A-Z]/, function () {
          return '_' + str[0]
        })
      },

      /**
       * @private
       * @returns {String} formatted attribute string
       */
      _gff3_format_attributes: function (attrs) {
        var attrOrder = []
        for (var tag in attrs) {
          var val = attrs[tag]
          if (!val) {
            continue
          }

          var valstring = val.hasOwnProperty('toString')
            ? gff.util.escape(val.toString())
            : val instanceof Array
              ? array.map(val, s => gff.util.escape(s)).join(',')
              : val instanceof Object
                ? gff.util.escape(JSON.stringify(val))
                : val.values
                  ? val instanceof Array
                    ? array.map(val, s => gff.util.escape(s)).join(',')
                    : gff.util.escape(val)
                  : gff.util.escape(val)
          attrOrder.push(gff.util.escape(tag) + '=' + valstring)
        }
        return attrOrder.join(';') || '.'
      },
    },
  )
})
