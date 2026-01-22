define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Deferred',
  'dojo/dom-construct',
  'dojo/query',
  'JBrowse/View/Track/HTMLFeatures',
], function (declare, lang, Deferred, domConstruct, query, HTMLFeatures) {
  return declare(HTMLFeatures, {
    renderFeature: function (
      feature,
      uniqueId,
      block,
      scale,
      labelScale,
      descriptionScale,
      containerStart,
      containerEnd,
    ) {
      var featureNode = this.inherited(arguments)
      var thisB = this

      if (featureNode) {
        // In case the feature was not rendered (too many)
        thisB.insertIntrons(featureNode)
        thisB.paintNeatFeatures(featureNode)
      }
      return featureNode
    },
    insertIntrons: function (featureNode) {
      // ignore if we have already processed this node
      if (!dojo.hasClass(featureNode, 'has-neat-introns')) {
        // get the subfeatures nodes (only immediate children)
        var subNodesX = query('> .subfeature', featureNode)

        // filter nodes - eliminate nodes that are splice sites (for Apollo)
        var subNodes = []
        for (var i = 0; i < subNodesX.length; i++) {
          var attr = dojo.attr(subNodesX[i], 'class')
          if (
            attr.indexOf('splice-site') === -1 &&
            attr.indexOf('Shine_Dalgarno_sequence') === -1 &&
            attr.indexOf('stop_codon_read_through') === -1 &&
            attr.indexOf('intron') === -1
          ) {
            subNodes.push(subNodesX[i])
          }
        }
        if (subNodes.length < 2) {
          // apply introns to all feature tracks
          var subFeatureIntron = query('div.feature-render', featureNode)
          // added to handle apollo annotation classes:  https://github.com/GMOD/Apollo/issues/1417
          if (
            subFeatureIntron &&
            subFeatureIntron.length == 1 &&
            subFeatureIntron[0].className.indexOf('annot-apollo') < 0 &&
            subFeatureIntron[0].className.indexOf('annot-render') < 0
          ) {
            var left = featureNode.style.left
            var width = featureNode.style.width
            var height = '100%'
            var str = ''
            str +=
              "<svg class='jb-intron' viewBox='0 0 100 100' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' "
            str += "style='position:absolute;z-index: 15;" // this must be here and not in CSS file
            str +=
              'left: ' + left + ';width: ' + width + ';height: ' + height + "'>"
            str +=
              "<polyline points='0,50 100,50' style='fill:none;stroke:black;stroke-width:5' shape-rendering='optimizeQuality' />"
            str += '</svg>'

            // note: dojo.create("svg") does not render due to namespace issue between DOM and SVG
            domConstruct.place(str, featureNode)
          }
        } else if (subNodes.length >= 2) {
          // identify directionality
          var classAttr = dojo.attr(featureNode, 'class')
          var direction = 1
          if (classAttr.indexOf('minus') > -1) {
            direction = -1
          }
          // extract some left & width -  more convient to access
          for (var i = 0; i < subNodes.length; i++) {
            subNodes[i].left = dojo.getStyle(subNodes[i], 'left')
            subNodes[i].width = dojo.getStyle(subNodes[i], 'width')
          }
          // sort the subfeatures
          if (subNodes.length >= 2) {
            subNodes.sort(function (a, b) {
              return a.left - b.left
            })
          }

          // insert introns between subfeature gaps
          for (var i = 0; i < subNodes.length - 1; ++i) {
            var gap =
              subNodes[i + 1].left - (subNodes[i].left + subNodes[i].width)
            if (gap > 0.02) {
              var subLeft = subNodes[i].left + subNodes[i].width
              var subWidth =
                subNodes[i + 1].left - (subNodes[i].left + subNodes[i].width)

              var left = subLeft
              var width = subWidth
              var height = '100%'

              // invert hat if reverse direction
              var dir = '50,5'
              if (direction == -1) dir = '50,95'

              var str = ''
              str +=
                "<svg class='jb-intron' viewBox='0 0 100 100' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' "
              str += "style='position:absolute;z-index: 15;" // this must be here and not in CSS file
              str +=
                'left: ' +
                left +
                '%;width: ' +
                width +
                '%;height: ' +
                height +
                "'>"
              str +=
                "<polyline class='neat-intron' points='0,50 " +
                dir +
                " 100,50' shape-rendering='optimizeQuality' />"
              str += '</svg>'

              // note: dojo.create("svg") does not render due to namespace issue between DOM and SVG
              domConstruct.place(str, featureNode)
            }
          }
        }
      }
    },
    /*
     * Paint neat features and subfeatures
     */
    paintNeatFeatures: function (featureNode) {
      // get the subfeature nodes (only immediate children)
      var subNodesX = query('> .subfeature', featureNode)
      var thisB = this

      // filter nodes - eliminate nodes that are splice sites (for Apollo)
      var subNodes = []
      for (var i = 0; i < subNodesX.length; i++) {
        var attr = dojo.attr(subNodesX[i], 'class')
        if (attr.indexOf('splice-site') === -1) {
          subNodes.push(subNodesX[i])
        }
      }

      // if feature has subfeatures
      if (subNodes.length) {
        dojo.setStyle(featureNode, {
          background: 'none',
          'background-color': 'transparent',
          'border-width': '0px',
        })

        // paint subfeatures
        for (var i = 0; i < subNodes.length; i++) {
          // if this is Apollo, we have another subfeature level to traverse
          if (subNodes[i].childElementCount) {
            // get the subfeature nodes (only immediate children)
            var childNodes = query('> .subfeature', subNodes[i])

            for (var j = 0; j < childNodes.length; j++) {
              thisB.paintSubNode(childNodes[j])
            }
          }
          // handle the first level subfeature
          else {
            thisB.paintSubNode(subNodes[i])
          }
        }
      }
      // paint features that have no subfeatures
      else {
        // ignore if we have already processed node
        if (!dojo.hasClass(featureNode, 'neat-feature')) {
          var classAttr = dojo.attr(featureNode, 'class')
          var color = dojo.getStyle(featureNode, 'background-color')

          // update the element with new styling
          // if(dojo.hasClass(featureNode,'neat-linear-shading')){
          if (this.config.gradient == 1) {
            dojo.setStyle(featureNode, {
              background:
                'linear-gradient(to bottom,  ' +
                color +
                ' 0%,#e5e5e5 50%,' +
                color +
                ' 100%)',
            })
          }
          dojo.addClass(featureNode, 'neat-feature')
        }
      }
    },
    /*
     * apply neat modifications to feature sub-nodes
     */
    paintSubNode: function (subNode) {
      var classAttr = dojo.attr(subNode, 'class')
      var color = dojo.getStyle(subNode, 'background-color')

      // ignore if we have already processed node
      if (!dojo.hasClass(subNode, 'neat-subfeature')) {
        // restyle UTR
        if (classAttr.indexOf('UTR') > -1) {
          dojo.setStyle(subNode, {
            top: '0px',
            border: '1px solid ' + color,
          })
          // mark as neat subfeature
          dojo.addClass(subNode, 'neat-UTR')
        } else {
          // if(classAttr.indexOf('CDS') > -1 || classAttr.indexOf('exon') > -1) {
          if (this.config.gradient == 1) {
            dojo.setStyle(subNode, {
              top: '0px',
              background:
                'linear-gradient(to bottom,  ' +
                color +
                ' 0%,#e5e5e5 50%,' +
                color +
                ' 100%)',
            })
          }
        }
        // mark that we have processed the node
        dojo.addClass(subNode, 'neat-subfeature')
      }
    },
  })
})
