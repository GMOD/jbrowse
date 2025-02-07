/**
 * Mixin with methods for parsing making default feature detail dialogs.
 */
define([
  'dojo/_base/declare',
  'dojo/_base/array',
  'dojo/_base/lang',
  'dojo/aspect',
  'dojo/on',
  'dojo/dom-construct',
  'JBrowse/Util',
  'JBrowse/View/FASTA',
  'JBrowse/View/_FeatureDescriptionMixin',
], function (
  declare,
  array,
  lang,
  aspect,
  on,
  domConstruct,
  Util,
  FASTAView,
  FeatureDescriptionMixin,
) {
  return declare(FeatureDescriptionMixin, {
    constructor: function () {
      // clean up the eventHandlers at destruction time if possible
      if (typeof this.destroy == 'function') {
        aspect.before(this, 'destroy', function () {
          delete this.eventHandlers
        })
      }
    },

    _setupEventHandlers: function () {
      // make a default click event handler
      var eventConf = dojo.clone(this.config.events || {})
      if (!eventConf.click) {
        eventConf.click = (this.config.style || {}).linkTemplate
          ? {
              action: 'newWindow',
              url: this.config.style.linkTemplate,
            }
          : {
              action: 'contentDialog',
              title: '{type} {name}',
              content: dojo.hitch(this, 'defaultFeatureDetail'),
            }
      }

      // process the configuration to set up our event handlers
      this.eventHandlers = function () {
        var handlers = dojo.clone(eventConf)
        // find conf vars that set events, like `onClick`
        for (var key in this.config) {
          var handlerName = key.replace(/^on(?=[A-Z])/, '')
          if (handlerName != key) {
            handlers[handlerName.toLowerCase()] = this.config[key]
          }
        }
        // interpret handlers that are just strings to be URLs that should be opened
        for (key in handlers) {
          if (typeof handlers[key] == 'string') {
            handlers[key] = { url: handlers[key] }
          }
        }
        return handlers
      }.call(this)
      this.eventHandlers.click = this._makeClickHandler(
        this.eventHandlers.click,
      )
    },

    /**
     * Make a default feature detail page for the given feature.
     * @returns {HTMLElement} feature detail page HTML
     */
    defaultFeatureDetail: function (
      /** JBrowse.Track */ track,
      /** Object */ f,
      /** HTMLElement */ featDiv,
      /** HTMLElement */ container,
      layer,
    ) {
      container =
        container ||
        dojo.create('div', {
          className:
            'detail feature-detail feature-detail-' +
            track.name.replace(/\s+/g, '_').toLowerCase(),
          innerHTML: '',
        })

      this._renderCoreDetails(track, f, featDiv, container)

      this._renderAdditionalTagsDetail(track, f, featDiv, container)

      if (!this.config.hideSequenceBox) {
        this._renderUnderlyingReferenceSequence(track, f, featDiv, container)
      }

      this._renderSubfeaturesDetail(track, f, featDiv, container, layer || 1)

      // hook function extendedRender(track,f,featDiv,container)
      if (typeof this.extendedRender === 'function') {
        this.extendedRender(track, f, featDiv, container)
      }

      return container
    },

    _renderCoreDetails: function (track, f, featDiv, container) {
      var coreDetails = dojo.create('div', { className: 'core' }, container)
      var fmt = dojo.hitch(this, 'renderDetailField', coreDetails)
      coreDetails.innerHTML += '<h2 class="sectiontitle">Primary Data</h2>'

      fmt('Name', this.getFeatureLabel(f), f)
      fmt('Type', f.get('type'), f)
      fmt('Score', f.get('score'), f)
      fmt('Description', this.getFeatureDescription(f), f)
      fmt(
        'Position',
        Util.assembleLocString({
          start: f.get('start'),
          end: f.get('end'),
          ref: this.refSeq.name,
          strand: f.get('strand'),
        }),
        f,
      )
      fmt('Length', Util.addCommas(f.get('end') - f.get('start')) + ' bp', f)
    },

    // render any subfeatures this feature has
    _renderSubfeaturesDetail: function (track, f, featDiv, container, layer) {
      var thisB = this
      var subfeatures = f.get('subfeatures')
      if (subfeatures && subfeatures.length) {
        if (f.get('strand') == -1) {
          // Feature is on the oposite strand, lets reverse the order of the subfeatures according to their start position
          subfeatures.sort(function (a, b) {
            return b.get('start') - a.get('start')
          })
        }
        if (
          !(track.config.subfeatureDetailLevel != null) ||
          layer < track.config.subfeatureDetailLevel
        ) {
          this._subfeaturesDetail(track, subfeatures, container, f, layer + 1)
        } else if (layer >= track.config.subfeatureDetailLevel) {
          var b = domConstruct.create(
            'button',
            {
              className: 'subfeature-load-button',
              innerHTML: 'Show subfeatures...',
            },
            container,
          )
          on(b, 'click', function () {
            thisB._subfeaturesDetail(
              track,
              subfeatures,
              container,
              f,
              layer + 1,
            )
            dojo.destroy(b)
          })
        }
      }
    },

    _isReservedTag: function (t) {
      return {
        name: 1,
        start: 1,
        end: 1,
        strand: 1,
        note: 1,
        subfeatures: 1,
        type: 1,
        score: 1,
      }[t.toLowerCase()]
    },

    // render any additional tags as just key/value
    _renderAdditionalTagsDetail: function (track, f, featDiv, container) {
      var thisB = this
      var additionalTags = array.filter(
        f.tags(),
        function (t) {
          if (thisB.config.showNoteInAttributes && t.toLowerCase() == 'note') {
            return true
          }
          return !this._isReservedTag(t)
        },
        this,
      )

      if (additionalTags.length) {
        var atElement = domConstruct.create(
          'div',
          {
            className: 'additional',
            innerHTML: '<h2 class="sectiontitle">Attributes</h2>',
          },
          container,
        )
        additionalTags.sort().forEach(t => {
          this.renderDetailField(
            atElement,
            t,
            f.get(t),
            f,
            undefined,
            track.store.getTagMetadata(t),
          )
        })
      }
    },

    _renderUnderlyingReferenceSequence: function (
      track,
      f,
      featDiv,
      container,
    ) {
      // render the sequence underlying this feature if possible
      var field_container = dojo.create(
        'div',
        { className: 'field_container feature_sequence' },
        container,
      )
      dojo.create(
        'h2',
        {
          className: 'field feature_sequence',
          innerHTML: 'Region sequence',
          title:
            'reference sequence underlying this ' +
            (f.get('type') || 'feature'),
        },
        field_container,
      )
      var valueContainerID = 'feature_sequence' + this._uniqID()
      var valueContainer = dojo.create(
        'div',
        {
          id: valueContainerID,
          innerHTML: '<div style="height: 12em">Loading...</div>',
          className: 'value feature_sequence',
        },
        field_container,
      )
      var maxSize = this.config.maxFeatureSizeForUnderlyingRefSeq
      if (maxSize < f.get('end') - f.get('start')) {
        valueContainer.innerHTML =
          'Not displaying underlying reference sequence, feature is longer than maximum of ' +
          Util.humanReadableNumber(maxSize) +
          'bp'
      } else {
        track.browser.getStore(
          'refseqs',
          dojo.hitch(this, function (refSeqStore) {
            valueContainer = dojo.byId(valueContainerID) || valueContainer
            if (refSeqStore) {
              refSeqStore.getReferenceSequence(
                {
                  ref: this.refSeq.name,
                  start: f.get('start'),
                  end: f.get('end'),
                },
                // feature callback
                dojo.hitch(this, function (seq) {
                  valueContainer = dojo.byId(valueContainerID) || valueContainer
                  valueContainer.innerHTML = ''
                  // the HTML is rewritten by the dojo dialog
                  // parser, but this callback may be called either
                  // before or after that happens.  if the fetch by
                  // ID fails, we have come back before the parse.
                  var textArea = new FASTAView({
                    track: this,
                    width: 62,
                    htmlMaxRows: 10,
                  }).renderHTML(
                    {
                      ref: this.refSeq.name,
                      start: f.get('start'),
                      end: f.get('end'),
                      strand: f.get('strand'),
                      type: f.get('type'),
                    },
                    f.get('strand') == -1 ? Util.revcom(seq) : seq,
                    valueContainer,
                  )
                }),
                // end callback
                function () {},
                // error callback
                dojo.hitch(this, function () {
                  valueContainer = dojo.byId(valueContainerID) || valueContainer
                  valueContainer.innerHTML =
                    '<span class="ghosted">reference sequence not available</span>'
                }),
              )
            } else {
              valueContainer.innerHTML =
                '<span class="ghosted">reference sequence not available</span>'
            }
          }),
        )
      }
    },

    _uniqID: function () {
      this._idCounter = this._idCounter || 0
      return this._idCounter++
    },

    _subfeaturesDetail: function (track, subfeatures, container, f, layer) {
      var field_container = dojo.create(
        'div',
        { className: 'field_container subfeatures' },
        container,
      )
      dojo.create(
        'h2',
        { className: 'field subfeatures', innerHTML: 'Subfeatures' },
        field_container,
      )
      var subfeaturesContainer = dojo.create(
        'div',
        { className: 'value subfeatures' },
        field_container,
      )

      array.forEach(
        subfeatures || [],
        function (subfeature) {
          this.defaultFeatureDetail(
            track,
            subfeature,
            null,
            dojo.create(
              'div',
              {
                className:
                  'detail feature-detail subfeature-detail feature-detail-' +
                  track.name +
                  ' subfeature-detail-' +
                  track.name,
                innerHTML: '',
              },
              subfeaturesContainer,
            ),
            layer,
          )
        },
        this,
      )
    },
  })
})
