/*
HideTrackLabels JBrowse plugin CSS
*/
/*
    Created on : Jul 15, 2015, 7:19:50 PM
    Author     : EY
*/

define([
  'dojo/_base/declare',
  'dojo/_base/lang',
  'dojo/Deferred',
  'dojo/dom-construct',
  'dijit/form/Button',
  'dojo/fx',
  'dojo/dom',
  'dojo/dom-style',
  'dojo/on',
  'dojo/query',
  'dojo/dom-geometry',
  'JBrowse/Plugin',
], function (
  declare,
  lang,
  Deferred,
  domConstruct,
  dijitButton,
  coreFx,
  dom,
  style,
  on,
  query,
  domGeom,
  JBrowsePlugin,
) {
  return declare(JBrowsePlugin, {
    constructor: function (args) {
      console.log('plugin HideTracksButton constructor')

      var baseUrl = this._defaultConfig().baseUrl
      var thisB = this
      var queryParams = dojo.queryToObject(window.location.search.slice(1))

      // create the hide/show button after genome view initialization
      this.browser.afterMilestone('initView', function () {
        var navBox = dojo.byId('navbox')

        thisB.browser.hideTitlesButton = new dijitButton(
          {
            title: 'Hide/Show Track Titles',
            id: 'hidetitles-btn',
            width: '24px',
            onClick: dojo.hitch(thisB, function (event) {
              thisB.showTrackLabels('toggle')
              dojo.stopEvent(event)
            }),
          },
          dojo.create('button', {}, navBox),
        )

        if (
          queryParams.tracklabels == 0 ||
          thisB.browser.config.show_tracklabels == 0
        ) {
          query('.track-label').style('visibility', 'hidden')
          dojo.attr(thisB.browser.hideTitlesButton.domNode, 'hidden-titles', '')
        }
      })
      if (thisB.browser.config.show_tracklabels == 0) {
        dojo.subscribe('/jbrowse/v1/n/tracks/redraw', function (data) {
          thisB.showTrackLabels('hide')
        })
      }
      dojo.subscribe('/jbrowse/v1/n/tracks/redraw', function (data) {
        thisB.showTrackLabels('hide-if')
      })
    },

    /* show or hide track labels
     * showTrackLabels(param)
     * @param {string} function "show", "hide", "toggle", or "hide-if"
     * "hide-if" rehides if already hidden.
     * @returns {undefined}
     */
    showTrackLabels: function (fn) {
      var direction = 1
      var button = dom.byId('hidetitles-btn')

      if (fn == 'show') {
        if (button) dojo.removeAttr(button, 'hidden-titles')
        direction = 1
      }
      if (fn == 'hide') {
        if (button) dojo.attr(button, 'hidden-titles', '')
        direction = -1
      }
      if (fn == 'hide-if') {
        if (button && dojo.hasAttr(button, 'hidden-titles')) direction = -1
        else return
      }

      if (fn == 'toggle') {
        if (button) {
          if (dojo.hasAttr(button, 'hidden-titles')) {
            // if hidden, show
            dojo.removeAttr(button, 'hidden-titles')
            direction = 1
          } else {
            dojo.attr(button, 'hidden-titles', '') // if shown, hide
            direction = -1
          }
        }
      }
      // protect Hide button from clicks during animation
      if (button) dojo.attr(button, 'disabled', '')
      setTimeout(function () {
        if (button) dojo.removeAttr(button, 'disabled')
      }, 200)

      if (direction == -1) {
        setTimeout(function () {
          query('.track-label').style('visibility', 'hidden')
        }, 200)
      } else {
        query('.track-label').style('visibility', 'visible')
      }
      // slide em
      query('.track-label').forEach(function (node, index, arr) {
        var w = domGeom.getMarginBox(node).w
        coreFx
          .slideTo({
            node: node,
            duration: 200,
            top: domGeom.getMarginBox(node).t.toString(),
            left: (domGeom.getMarginBox(node).l + w * direction).toString(),
            unit: 'px',
          })
          .play()
      })
    },
  })
})
