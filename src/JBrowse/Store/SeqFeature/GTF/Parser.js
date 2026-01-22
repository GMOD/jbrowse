// the challenge with GTF is that there is no parent relationship
// every feature line has a gene_id and a transcript_id but there are no ids that uniquely id each feature
// in eukaryotes a gene can have multiple transcripts
// in prokaryotes a transcript can have multiple genes
// here we just create transcript features with children features and let 'gene_ids' simply be attributes not a feature in themselves

define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/json',
  'JBrowse/Util/GTF',
], function (declare, array, lang, JSON, GTF) {
  return declare(null, {
    constructor: function (args) {
      lang.mixin(this, {
        featureCallback: args.featureCallback || function () {},
        endCallback: args.endCallback || function () {},
        commentCallback: args.commentCallback || function () {},
        errorCallback:
          args.errorCallback ||
          function (e) {
            console.error(e)
          },
        directiveCallback: args.directiveCallback || function () {},

        // features that we have to keep on hand for now because they
        // might be referenced by something else
        under_construction_top_level: [],
        // index of the above by ID
        under_construction_by_id: {},

        completed_references: {},

        // features that reference something we have not seen yet
        // structured as:
        // {  'some_id' : {
        //     'Parent' : [ orphans that have a Parent attr referencing it ],
        //     'Derives_from' : [ orphans that have a Derives_from attr referencing it ],
        // }
        under_construction_orphans: {},

        // if this is true, the parser ignores the
        // rest of the lines in the file.  currently
        // set when the file switches over to FASTA
        eof: false,
      })
    },

    addLine: function (line) {
      var match
      if (this.eof) {
        // do nothing
      } else if (/^\s*[^#\s>]/.test(line)) {
        //< feature line, most common case
        var f = GTF.parse_feature(line)
        this._buffer_feature(f)
      }
      // directive or comment
      else if ((match = /^\s*(\#+)(.*)/.exec(line))) {
        var hashsigns = match[1],
          contents = match[2]
        if (hashsigns.length == 3) {
          //< sync directive, all forward-references are resolved.
          this._return_all_under_construction_features()
        } else if (hashsigns.length == 2) {
          var directive = GTF.parse_directive(line)
          if (directive.directive == 'FASTA') {
            this._return_all_under_construction_features()
            this.eof = true
          } else {
            this._return_item(directive)
          }
        } else {
          contents = contents.replace(/\s*/, '')
          this._return_item({ comment: contents })
        }
      } else if (/^\s*$/.test(line)) {
        // blank line, do nothing
      } else if (/^\s*>/.test(line)) {
        // implicit beginning of a FASTA section.  just stop
        // parsing, since we don't currently handle sequences
        this._return_all_under_construction_features()
        this.eof = true
      } else {
        // it's a parse error
        line = line.replace(/\r?\n?$/g, '')
        throw `GTF parse error.  Cannot parse '${line}'.`
      }
    },

    _return_item: function (i) {
      if (i[0]) {
        this.featureCallback(i)
      } else if (i.directive) {
        this.directiveCallback(i)
      } else if (i.comment) {
        this.commentCallback(i)
      }
    },

    finish: function () {
      this._return_all_under_construction_features()
      this.endCallback()
    },

    /**
     * return all under-construction features, called when we know
     * there will be no additional data to attach to them
     */
    _return_all_under_construction_features: function () {
      // since the under_construction_top_level buffer is likely to be
      // much larger than the item_buffer, we swap them and unshift the
      // existing buffer onto it to avoid a big copy.
      array.forEach(this.under_construction_top_level, this._return_item, this)

      this.under_construction_top_level = []
      this.under_construction_by_id = {}
      this.completed_references = {}

      // if we have any orphans hanging around still, this is a
      // problem. die with a parse error
      for (var o in this.under_construction_orphans) {
        for (var orphan in o) {
          throw `parse error: orphans ${JSON.stringify(
            this.under_construction_orphans,
          )}`
        }
      }
    },

    container_attributes: {
      Parent: 'child_features',
      Derives_from: 'derived_features',
    },
    line_number: 0,

    // do the right thing with a newly-parsed feature line
    _buffer_feature: function (feature_line) {
      feature_line.child_features = []
      feature_line.derived_features = []

      // NOTE: a feature is an arrayref of one or more feature lines.
      this.line_number = this.line_number + 1
      var feature_number = this.line_number // no such thing as unique ID in GTF. make one up.
      var is_transcript = feature_line.type == 'transcript' //trying to support the Cufflinks convention of adding a transcript line
      var ids = is_transcript
        ? feature_line.attributes.transcript_id || []
        : [feature_number]
      var parents = is_transcript
        ? []
        : feature_line.attributes.transcript_id || []
      var derives = feature_line.attributes.Derives_from || []

      if (!ids.length && !parents.length && !derives.length) {
        // if it has no IDs and does not refer to anything, we can just
        // output it
        this._return_item([feature_line])
        return
      }
      array.forEach(
        parents,
        function (id) {
          if (!this.under_construction_by_id[id]) {
            this._buffer_feature(this._create_transcript(feature_line))
          }
        },
        this,
      )

      var feature
      array.forEach(
        ids,
        function (id) {
          var existing
          if ((existing = this.under_construction_by_id[id])) {
            // another location of the same feature
            existing.push(feature_line)
            feature = existing
          } else {
            // haven't seen it yet
            feature = [feature_line]
            if (!parents.length && !derives.length) {
              this.under_construction_top_level.push(feature)
            }
            this.under_construction_by_id[id] = feature

            // see if we have anything buffered that refers to it
            this._resolve_references_to(feature, id)
          }
        },
        this,
      )

      // try to resolve all its references
      this._resolve_references_from(
        feature || [feature_line],
        { Parent: parents, Derives_from: derives },
        ids,
      )
    },

    _create_transcript: function (feature) {
      var result = JSON.parse(JSON.stringify(feature))
      result.type = 'transcript'
      //result.attributes={'transcript_id':result.attributes.transcript_id, 'gene_id':result.attributes.gene_id};
      return result
    },

    //there are no unique ids so no chance for collision just use first elements
    _expand_feature: function (parent_feature, child_feature) {
      parent_feature[0].start = Math.min(
        parent_feature[0].start,
        child_feature[0].start,
      )
      parent_feature[0].end = Math.max(
        parent_feature[0].end,
        child_feature[0].end,
      )
    },

    _resolve_references_to: function (feature, id) {
      var references = this.under_construction_orphans[id]
      if (!references) {
        return
      }

      for (var attrname in references) {
        var pname =
          this.container_attributes[attrname] || attrname.toLowerCase()
        array.forEach(feature, function (loc) {
          loc[pname].push(references[attrname])
          delete references[attrname]
        })
      }
    },
    _resolve_references_from: function (feature, references, ids) {
      // go through our references
      //  if we have the feature under construction, put this feature in the right place
      //  otherwise, put this feature in the right slot in the orphans

      var pname
      for (var attrname in references) {
        array.forEach(
          references[attrname],
          function (to_id) {
            var other_feature
            if ((other_feature = this.under_construction_by_id[to_id])) {
              this._expand_feature(other_feature, feature)
              if (!pname) {
                pname =
                  this.container_attributes[attrname] || attrname.toLowerCase()
              }
              if (
                !array.some(
                  ids,
                  function (i) {
                    return this.completed_references[
                      `${i},${attrname},${to_id}`
                    ]++
                  },
                  this,
                )
              ) {
                array.forEach(other_feature, function (loc) {
                  loc[pname].push(feature)
                })
              }
            } else {
              ;(this.under_construction_orphans[to_id][attrname] =
                this.under_construction_orphans[to_id][attrname] || []).push(
                feature,
              )
            }
          },
          this,
        )
      }
    },
  })
})
