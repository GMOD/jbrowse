define([], function () {
  var startX
  var initialPane

  /**
   * Utility functions for touch-screen device (smartphone and tablet) support.
   *
   * @lends JBrowse.TouchScreenSupport
   */
  var Touch
  Touch = {
    CompareObjPos: function (nodes, touch) {
      var samePos = 0,
        j = 0,
        top = touch.pageY

      for (var i = 0; i < nodes.length; i++) {
        samePos = j++
        var position = Touch.findPos(nodes[i])
        if (position.top > top) {
          break
        }
      }
      return samePos
    },

    checkAvatarPosition: function (first) {
      var leftPane = document.getElementById('tracksAvail'),
        rightPane = document.getElementById('container')

      if (!leftPane) {
        return rightPane
      }

      if (first.pageX < leftPane.offsetLeft + leftPane.offsetWidth) {
        return leftPane
      } else {
        return rightPane
      }
    },

    removeTouchEvents: function () {
      startX = null
    },

    touchSimulated: function (event) {
      if (event.touches.length <= 1) {
        var touches = event.changedTouches,
          first = touches[0],
          type1 = '',
          type2 = 'mouseover',
          objAvatar = document.getElementsByClassName('dojoDndAvatar'),
          obj = {},
          pane = Touch.checkAvatarPosition(first),
          nodes = pane.getElementsByClassName('dojoDndItem'),
          element = {},
          simulatedEvent_1 = document.createEvent('MouseEvent'),
          simulatedEvent_2 = document.createEvent('MouseEvent')

        switch (event.type) {
          case 'touchstart':
            startX = first.pageX
            type1 = 'mousedown'
            break
          case 'touchmove':
            event.preventDefault()
            type1 = 'mousemove'
            break
          default:
            return
        }

        simulatedEvent_1.initMouseEvent(
          type1,
          true,
          true,
          window,
          1,
          first.pageX,
          first.pageY,
          first.clientX,
          first.clientY,
          false,
          false,
          false,
          false,
          0,
          null,
        )

        simulatedEvent_2.initMouseEvent(
          type2,
          true,
          true,
          window,
          1,
          first.pageX,
          first.pageY,
          first.clientX,
          first.clientY,
          false,
          false,
          false,
          false,
          0,
          null,
        )

        switch (event.type) {
          case 'touchstart':
            first.target.dispatchEvent(simulatedEvent_1)
            first.target.dispatchEvent(simulatedEvent_2)
            initialPane = pane
            break
          case 'touchmove':
            if (objAvatar.length > 0) {
              if (nodes.length > 0) {
                element = Touch.CompareObjPos(nodes, first)
                obj = nodes[element]
              }
              try {
                if (initialPane != pane) {
                  var simulatedEvent_3 = document.createEvent('MouseEvent')
                  var type3 = 'mouseout'
                  simulatedEvent_3.initMouseEvent(
                    type3,
                    true,
                    true,
                    window,
                    1,
                    first.pageX,
                    first.pageY,
                    first.clientX,
                    first.clientY,
                    false,
                    false,
                    false,
                    false,
                    0,
                    null,
                  )
                  initialPane.dispatchEvent(simulatedEvent_3)
                }
                obj.dispatchEvent(simulatedEvent_2)
                obj.dispatchEvent(simulatedEvent_1)
              } catch (err) {
                //No Elements in the pane
                pane.dispatchEvent(simulatedEvent_2)
                pane.dispatchEvent(simulatedEvent_1)
              }
            }
            break
          default:
            return
        }
      } else {
        Touch.removeTouchEvents()
      }
    },

    touchEnd: function (event) {
      var touches = event.changedTouches,
        first = touches[0],
        type1 = 'mouseup',
        type2 = 'mouseover',
        objAvatar = document.getElementsByClassName('dojoDndAvatar'),
        obj = {},
        pane = Touch.checkAvatarPosition(first),
        nodes = pane.getElementsByClassName('dojoDndItem'),
        element = {},
        simulatedEvent_1 = document.createEvent('MouseEvent'),
        simulatedEvent_2 = document.createEvent('MouseEvent')

      if (startX !== first.pageX) {
        //slide ocurrs
        event.preventDefault()
      }

      var test = Touch.findPos(first.target)

      simulatedEvent_1.initMouseEvent(
        type1,
        true,
        true,
        window,
        1,
        first.pageX,
        first.pageY,
        first.clientX,
        first.clientY,
        false,
        false,
        false,
        false,
        0,
        null,
      )

      simulatedEvent_2.initMouseEvent(
        type2,
        true,
        true,
        window,
        1,
        first.pageX,
        first.pageY,
        first.clientX,
        first.clientY,
        false,
        false,
        false,
        false,
        0,
        null,
      )

      if (objAvatar.length > 0) {
        if (nodes.length > 0) {
          element = Touch.CompareObjPos(nodes, first)
          obj = nodes[element]
        }
        try {
          obj.dispatchEvent(simulatedEvent_2)
          obj.dispatchEvent(simulatedEvent_1)
        } catch (error) {
          first.target.dispatchEvent(simulatedEvent_2)
          pane.dispatchEvent(simulatedEvent_2)
        }
      } else {
        first.target.dispatchEvent(simulatedEvent_1)
        first.target.dispatchEvent(simulatedEvent_2)
      }

      Touch.removeTouchEvents()
    },

    touchHandle: function (event) {
      dojo
        .query('.dojoDndItemAnchor')
        .connect('touchstart', Touch.touchSimulated)
      dojo
        .query('.dojoDndItemAnchor')
        .connect('touchmove', Touch.touchSimulated)
      dojo.query('.dojoDndItemAnchor').connect('touchend', Touch.touchEnd)
      dojo.query('.dojoDndItemAnchor').connect('click', function () {
        void 0
      })

      if (event.touches.length <= 1) {
        var touches = event.changedTouches,
          first = touches[0],
          type = ''

        switch (event.type) {
          case 'touchstart':
            startX = first.pageX
            type = 'mousedown'
            break

          case 'touchmove':
            event.preventDefault()
            type = 'mousemove'
            break

          case 'touchend':
            if (startX !== first.pageX) {
              //slide ocurrs
              event.preventDefault()
            }
            type = 'mouseup'
            break

          default:
            return
        }

        var simulatedEvent = document.createEvent('MouseEvent')

        simulatedEvent.initMouseEvent(
          type,
          true,
          true,
          window,
          1,
          first.screenX,
          first.screenY,
          first.clientX,
          first.clientY,
          false,
          false,
          false,
          false,
          0 /*left*/,
          null,
        )

        first.target.dispatchEvent(simulatedEvent)
      } else {
        Touch.removeTouchEvents()
      }
    },

    touchinit: function () {
      dojo.query('.dojoDndItem').connect('touchstart', Touch.touchSimulated)
      dojo.query('.dojoDndItem').connect('touchmove', Touch.touchSimulated)
      dojo.query('.dojoDndItem').connect('touchend', Touch.touchEnd)

      dojo.query('.locationThumb').connect('touchstart', Touch.touchHandle)
      dojo.query('.locationThumb').connect('touchmove', Touch.touchHandle)
      dojo.query('.locationThumb').connect('touchend', Touch.touchHandle)

      dojo.query('.dojoDndItem').connect('click', function () {
        void 0
      })

      dojo.query('.dojoDndTarget').connect('touchstart', Touch.touchHandle)
      dojo.query('.dojoDndTarget').connect('touchmove', Touch.touchHandle)
      dojo.query('.dojoDndTarget').connect('touchend', Touch.touchHandle)

      dojo.query('.dijitSplitter').connect('touchstart', Touch.touchHandle)
      dojo.query('.dijitSplitter').connect('touchmove', Touch.touchHandle)
      dojo.query('.dijitSplitter').connect('touchend', Touch.touchHandle)
    },

    loadTouch: function () {
      Touch.touchinit()
      document.documentElement.style.webkitTouchCallout = 'none'
    },

    findPos: function (obj) {
      var curtop = 0,
        objP = {}

      if (obj.offsetParent) {
        do {
          curtop += obj.offsetTop
        } while ((obj = obj.offsetParent))
      }

      objP.top = curtop

      return objP
    },
  }

  return Touch
})
