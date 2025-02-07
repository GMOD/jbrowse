import dompurify from 'dompurify'

define([
  'dojo/_base/declare',
  'dijit/Dialog',
  'dijit/form/RadioButton',
  'dijit/form/Button',
  'dojo/dom-construct',
  'JBrowse/Model/BinaryTreeNode',
], function (declare, Dialog, RadioButton, Button, dom, TreeNode) {
  return declare(null, {
    // Produces a dialog box in which a user may enter settings for how they
    // would like to combine tracks in a Combination Track.
    constructor: function (args) {
      this.newTrackKey = args.trackConfig ? args.trackConfig.key : args.key
      this.track = args.track
      this.newStore = args.store
      this.opTree = this.track.opTree

      this.currType = this.track.currType
      this.oldType = this.track.oldType
      this.supportedBy = this.track.supportedBy
      this.displayType = this.track.displayType

      this.storeToKey = this.track.config.storeToKey

      this.newDisplayType = this.displayType

      this.inWords = this.track.inWords

      this.trackClasses = this.track.trackClasses

      this.dialog = new Dialog({
        title: `Combine with ${this.newTrackKey}`,
        style: 'width: 475px;',
        className: 'combinationDialog',
      })
      var content = this._dialogContent(this.newStore)
      this.dialog.set('content', content)
    },

    _dialogContent: function (store) {
      var nodesToAdd = []

      var opList = this._allAllowedOperations(store)
      if (!opList.length) {
        nodesToAdd.push(
          dom.create('div', {
            innerHTML: 'No operations are possible for this track.',
          }),
        )
        var actionBar = this._createActionBar(false)
        nodesToAdd.push(actionBar)
        return nodesToAdd
      }

      nodesToAdd.push(
        dom.create('div', {
          className: 'intro',
          innerHTML: dompurify.sanitize(
            `Adding ${this.currType} track ${
              this.newTrackKey
            } to the combination.`,
          ),
        }),
      )

      var maskOpListDiv = dom.create('div', {
        id: `${this.track.name}_maskOpList`,
      })

      var thisB = this

      var maskOps = this._makeUnique(
        opList.map(function (item) {
          return item.substring(0, 4)
        }),
      )
      nodesToAdd.push(maskOpListDiv)

      this.changingOpPanel = dom.create('div', {
        id: `${this.track.name}_suffixLists`,
      })
      nodesToAdd.push(this.changingOpPanel)

      nodesToAdd.push(
        dom.create('h2', {
          innerHTML: 'Combination formula',
        }),
      )

      this.formulaPreview = dom.create('div', {
        innerHTML: '(nothing currently selected)',
        className: 'formulaPreview',
      })
      nodesToAdd.push(this.formulaPreview)

      this.maskOpButtons = []

      for (var i in maskOps) {
        var opButton = this._renderRadioButton(
          maskOpListDiv,
          maskOps[i],
          this.inWords[maskOps[i]],
        )
        this.maskOpButtons.push(opButton)

        opButton.on('change', function (isSelected) {
          if (isSelected) {
            delete this.whichArg
            delete this.opValue

            thisB.maskOpValue = this.value

            var numOpLists = thisB.maskOpValue == '1111' ? 3 : 1
            thisB.opListDivs = []
            thisB.whichArgDivs = []

            thisB.opValue = []
            thisB.whichArg = []

            thisB.changingOpPanel.innerHTML = ''

            for (var i = 0; i < numOpLists; i++) {
              var opDiv = dom.create(
                'div',
                {
                  id: `${thisB.track.name}_suffix${i}`,
                  style: {
                    display: 'inline-block',
                    'padding-left': '15px',
                    'vertical-align': 'top',
                  },
                },
                thisB.changingOpPanel,
              )
              if (numOpLists == 3) {
                var text = ['Main', 'Mask', 'Display']

                dom.create(
                  'h2',
                  {
                    // eslint-disable-next-line xss/no-mixed-html
                    innerHTML: dompurify.sanitize(text[i]),
                  },
                  opDiv,
                )
              }

              var whichOpSpan = dom.create(
                'h3',
                {
                  innerHTML: 'Combining operation',
                  style: { display: 'none' },
                },
                opDiv,
              )

              thisB.opListDivs[i] = dom.create(
                'div',
                { id: `${thisB.track.name}_OpList${i}` },
                opDiv,
              )

              var leftRightSpan = dom.create(
                'h3',
                {
                  innerHTML: 'Left or right?',
                  style: { display: 'none' },
                },
                opDiv,
              )
              thisB.whichArgDivs[i] = dom.create(
                'div',
                { id: `${thisB.track.name}_whichArg${i}` },
                opDiv,
              )

              var opButtons = thisB._generateSuffixRadioButtons(
                this.value,
                opList,
                store,
                thisB.opListDivs[i],
                i,
              )
              var leftRightButtons = thisB._maybeRenderWhichArgDiv(
                this.value,
                store,
                thisB.whichArgDivs[i],
                i,
              )

              if (leftRightButtons.length && !thisB.whichOpArg) {
                leftRightButtons[0].set('checked', 'checked')
              }
              if (opButtons.length) {
                opButtons[0].set('checked', 'checked')
              }

              whichOpSpan.style.display = opButtons.length ? '' : 'none'
              leftRightSpan.style.display = leftRightButtons.length
                ? ''
                : 'none'
            }
          }
        })
      }

      if (maskOps[0]) {
        this.maskOpButtons[0].set('checked', 'checked')
      }

      if (maskOps.length <= 1) {
        if (!maskOps.length || maskOps[0] == '0000') {
          maskOpListDiv.style.display = 'none'
        }
        this.maskOpButtons[0].set('disabled', 'disabled')
      }

      var actionBar = this._createActionBar()

      nodesToAdd.push(actionBar)

      return nodesToAdd
    },

    _createActionBar: function (addingEnabled) {
      if (addingEnabled === undefined) {
        addingEnabled = true
      }
      var actionBar = dom.create('div', {
        className: 'dijitDialogPaneActionBar',
      })
      new Button({
        iconClass: 'dijitIconDelete',
        label: 'Cancel',
        onClick: dojo.hitch(this, function () {
          this.shouldCombine = false
          this.dialog.hide()
        }),
      }).placeAt(actionBar)

      var btnCombine = new Button({
        label: 'Combine tracks',
        onClick: dojo.hitch(this, function () {
          this.shouldCombine = true
          this.dialog.hide()
        }),
      })

      btnCombine.placeAt(actionBar)

      if (!addingEnabled) {
        btnCombine.set('disabled', 'disabled')
      }
      return actionBar
    },

    _generateSuffixRadioButtons: function (
      prefix,
      stringlist,
      store,
      parent,
      offset,
    ) {
      offset = offset || 0
      while (parent.firstChild) {
        if (dijit.byId(parent.firstChild.id)) {
          dijit.byId(parent.firstChild.id).destroy()
        }
        dom.destroy(parent.firstChild)
      }
      var buttons = []

      var thisB = this
      var allowedOps = this._generateSuffixList(prefix, stringlist, offset)
      for (var i in allowedOps) {
        var opButton = this._renderRadioButton(
          parent,
          allowedOps[i],
          this.inWords[allowedOps[i]],
        )
        buttons.push(opButton)
        opButton.on('change', function (isSelected) {
          if (isSelected) {
            thisB.opValue[offset] = this.value
            var operation = thisB._getOperation()
            thisB.previewTree = thisB._createPreviewTree(operation, store)

            // eslint-disable-next-line xss/no-mixed-html
            thisB.formulaPreview.innerHTML = dompurify.sanitize(
              thisB._generateTreeFormula(thisB.previewTree),
            )
          }
        })
      }
      return buttons
    },

    _getOperation: function () {
      var retString = this.maskOpValue
      for (var i = 0; i < this.opListDivs.length; i++) {
        retString = retString + this.opValue[i] + this.whichArg[i]
      }
      return retString
    },

    //Type checking necessary?
    _generateSuffixList: function (prefix, stringlist, offset) {
      if (offset === undefined) {
        offset = 0
      }
      return this._makeUnique(
        stringlist
          .filter(function (value) {
            return value.indexOf(prefix) != -1
          })
          .map(function (item) {
            return item.substring(
              prefix.length + offset,
              prefix.length + offset + 1,
            )
          }),
      )
    },

    _maybeRenderWhichArgDiv: function (prefix, store, parent, offset) {
      offset = offset || 0
      while (parent.firstChild) {
        if (dijit.byId(parent.firstChild.id)) {
          dijit.byId(parent.firstChild.id).destroy()
        }
        dom.destroy(parent.firstChild)
      }
      var leftRightButtons = []
      var thisB = this

      var whichArgChange = function (isSelected, value) {
        if (isSelected) {
          thisB.whichArg[offset] = value === undefined ? this.value : value
          var operation = thisB._getOperation()
          thisB.previewTree = thisB._createPreviewTree(operation, store)

          // eslint-disable-next-line xss/no-mixed-html
          thisB.formulaPreview.innerHTML = dompurify.sanitize(
            thisB._generateTreeFormula(thisB.previewTree),
          )
        }
      }

      if (prefix == '0020') {
        whichArgChange(true, 'L')
      } else if (prefix == '0002') {
        whichArgChange(true, 'R')
      } else if (prefix == '1111' && offset == 0) {
        whichArgChange(true, '?')
      } else {
        var rbLeft = this._renderRadioButton(parent, 'L', 'left')
        var rbRight = this._renderRadioButton(parent, 'R', 'right')
        leftRightButtons.push(rbLeft)
        leftRightButtons.push(rbRight)
        rbLeft.on('change', whichArgChange)
        rbRight.on('change', whichArgChange)
      }

      return leftRightButtons
    },

    _makeUnique: function (stringArray) {
      var unique = {}
      return stringArray.filter(function (value) {
        if (!unique[value]) {
          unique[value] = true
          return true
        }
        return false
      })
    },

    _createPreviewTree: function (opString, store) {
      // Recursive cloning would probably be safer, but this seems to be working okay
      var newOpTree = store.opTree
        ? store.opTree.clone()
        : new TreeNode({ Value: store })
      if (newOpTree) {
        newOpTree.recursivelyCall(function (node) {
          node.highlighted = true
        })
      }
      var superior = new TreeNode(this.opTree)
      var firstChars = opString.substring(0, 2)
      var inferior = newOpTree
      if (firstChars == '01') {
        superior = newOpTree
        inferior = this.opTree
      }
      return this._applyTreeTransform(opString.substring(2), superior, inferior)
    },

    _applyTreeTransform: function (opString, superior, inferior) {
      var retTree = superior
      var firstChars = opString.substring(0, 2)
      var childToUse
      var opTree1 = superior
      var opTree2 = inferior
      switch (firstChars) {
        case '10':
          opTree1 = superior.leftChild
          childToUse = 'leftChild'
          opTree2 = inferior
          break
        case '01':
          opTree1 = superior.rightChild
          childToUse = 'rightChild'
          opTree2 = inferior
          break
        case '11':
          retTree = new TreeNode({ Value: opString.substring(2, 3) })
          retTree['leftChild'] = this._transformTree(
            opString.substring(4),
            superior.leftChild,
            inferior.leftChild,
          )
          opString = opString.substring(4)
          childToUse = 'rightChild'
          opTree1 = superior.rightChild
          opTree2 = inferior.rightChild
          break
        case '20':
          this.newDisplayType = this.oldType
          break
        case '02':
          this.newDisplayType = this.currType
          break
      }
      var opNode = this._transformTree(opString.substring(2), opTree1, opTree2)
      if (childToUse == undefined) {
        return opNode
      }

      retTree[childToUse] = opNode
      return retTree
    },

    _transformTree: function (opString, opTree1, opTree2) {
      var op = opString.substring(0, 1)
      var opNode = new TreeNode({ Value: op })
      if (opString.substring(1, 2) == 'L') {
        opNode.add(opTree2)
        opNode.add(opTree1)
      } else {
        opNode.add(opTree1)
        opNode.add(opTree2)
      }

      return opNode
    },

    // This mess constructs a complete list of all operations that can be performed
    _allAllowedOperations: function (store) {
      var allowedList = []
      var candidate = ''
      var allowedOps
      candidate = candidate + (this.oldType == 'mask' ? '1' : '0')
      candidate = candidate + (this.currType == 'mask' ? '1' : '0')
      if (candidate == '00') {
        if (this.oldType == this.currType) {
          var candidate2 = `${candidate}00`
          allowedOps = this.trackClasses[this.currType].allowedOps
          for (var i in allowedOps) {
            allowedList.push(candidate2 + allowedOps[i])
          }
        }
        allowedOps = this.trackClasses['mask'].allowedOps
        if (this.currType == 'set') {
          var candidate2 = `${candidate}20`
          for (var i in allowedOps) {
            allowedList.push(candidate2 + allowedOps[i])
          }
        }
        if (this.oldType == 'set') {
          var candidate2 = `${candidate}02`
          for (var i in allowedOps) {
            allowedList.push(candidate2 + allowedOps[i])
          }
        }
      } else if (candidate == '10') {
        if (this.currType == 'set') {
          allowedOps = this.trackClasses[this.currType].allowedOps
          var candidate2 = `${candidate}10`
          for (var i in allowedOps) {
            allowedList.push(candidate2 + allowedOps[i])
          }
        }
        if (this.currType == this.displayType) {
          var candidate2 = `${candidate}01`
          allowedOps = this.trackClasses[this.currType].allowedOps
          for (var i in allowedOps) {
            allowedList.push(candidate2 + allowedOps[i])
          }
        }
      } else if (candidate == '01') {
        if (this.oldType == 'set') {
          allowedOps = this.trackClasses[this.oldType].allowedOps
          var candidate2 = `${candidate}10`
          for (var i in allowedOps) {
            allowedList.push(candidate2 + allowedOps[i])
          }
        }
        var displayType = this.supportedBy[store.stores.display.config.type]
        if (this.oldType == displayType) {
          candidate = `${candidate}01`
          var allowedOps = this.trackClasses[displayType].allowedOps
          for (var i in allowedOps) {
            allowedList.push(candidate + allowedOps[i])
          }
        }
      } else if (candidate == '11') {
        // Fix the logic of the tree manipulation to work with out the last L's and R's
        candidate = `${candidate}11`
        allowedOps = this.trackClasses['set'].allowedOps
        for (var i in allowedOps) {
          var displayType = this.supportedBy[store.stores.display.config.type]
          var oldType = this.displayType
          if (displayType == oldType) {
            var allowedOps2 = this.trackClasses[displayType].allowedOps
            for (var j in allowedOps2) {
              var allowedMaskOps = this.trackClasses['mask'].allowedOps
              for (var k in allowedMaskOps) {
                allowedList.push(
                  candidate +
                    allowedMaskOps[k] +
                    allowedOps[i] +
                    allowedOps2[j],
                )
              }
            }
          }
        }
      }

      return allowedList
    },

    _renderRadioButton: function (parent, value, label) {
      var id = `${parent.id}_rb_${value}`
      if (dijit.byId(id)) {
        dom.destroy(dijit.byId(id).domNode)
        dijit.byId(id).destroy()
      }

      label = label || value
      var radioButton = new RadioButton({
        name: `${parent.id}_rb`,
        id: id,
        value: value,
      })
      parent.appendChild(radioButton.domNode)
      dom.create(
        'label',
        {
          for: radioButton.id,
          // eslint-disable-next-line xss/no-mixed-html
          innerHTML: dompurify.sanitize(label),
        },
        parent,
      )
      parent.appendChild(dom.create('br'))
      return radioButton
    },

    run: function (callback, cancelCallback, errorCallback) {
      this.dialog.show()
      var thisB = this
      this.dialog.on('Hide', function () {
        if (thisB.previewTree) {
          thisB.previewTree.recursivelyCall(function (node) {
            if (node.highlighted) {
              delete node.highlighted
            }
          })
        }
        if (thisB.shouldCombine) {
          callback(thisB.previewTree, thisB.newStore, thisB.newDisplayType)
        } else {
          cancelCallback()
        }
      })
    },

    _generateTreeFormula: function (tree) {
      if (!tree || tree === undefined) {
        return '<span class="null">NULL</span>'
      }
      if (tree.isLeaf()) {
        return `<span class="leaf${tree.highlighted ? ' highlighted' : ''}">${
          tree.get().name
            ? this.storeToKey[tree.get().name]
              ? this.storeToKey[tree.get().name]
              : tree.get().name
            : tree.get()
        }</span>`
      }
      return `<span class="tree">(${this._generateTreeFormula(
        tree.left(),
      )} <span class="op" title="${
        this.inWords[tree.get()]
      }">${tree.get()}</span> ${this._generateTreeFormula(
        tree.right(),
      )})</span>`
    },

    destroyRecursive: function () {
      this.dialog.destroyRecursive()
    },
  })
})
