define(['dojo/_base/declare', 'dojo/_base/lang'], function (declare, lang) {
  // A class representing a node of a binary tree.

  return declare(null, {
    // Initialize relevant values
    constructor: function (args) {
      this.Value = args.Value
      if (args.leftChild) {
        this.leftChild = args.leftChild
      }
      if (args.rightChild) {
        this.rightChild = args.rightChild
      }

      this.leaf = args.leaf || false
    },

    // Attempt to add the given child node to the left of this node.  Return true if success.
    addLeft: function (child) {
      if (!this.leaf && this.leftChild === undefined) {
        this.leftChild = child
        return true
      }
      return false
    },

    // Attempt to add the given child node to the right of this node.  Return true if success.
    addRight: function (child) {
      if (!this.leaf && this.rightChild === undefined) {
        this.rightChild = child
        return true
      }
      return false
    },

    // Try to add the given child node on either the left or the right of this node.  Return true if success.
    add: function (child) {
      var added = this.addLeft(child) || this.addRight(child)
      return added
    },

    // Return true if this node is a leaf (has no children, or is specially designated as a leaf node)
    isLeaf: function () {
      return (
        this.leaf ||
        (this.leftChild === undefined && this.rightChild === undefined)
      )
    },

    // Get the value of this node.
    get: function () {
      return this.Value
    },

    // Set the value of this node.
    set: function (value) {
      this.Value = value
    },

    // Get the leftChild of this node
    left: function () {
      return this.leftChild
    },

    // Get the rightChild of this node
    right: function () {
      return this.rightChild
    },

    // Return whether this node has a left child
    hasLeft: function () {
      return !(this.leftChild === undefined)
    },

    // Return whether this node has a right child
    hasRight: function () {
      return !(this.rightChild === undefined)
    },

    // Remove the left child from this node
    removeLeft: function () {
      this.leftChild = undefined
    },

    // Remove the right child from this node
    removeRight: function () {
      this.rightChild = undefined
    },

    // Remove all children from this node
    removeAll: function () {
      this.removeLeft()
      this.removeRight()
    },

    // Destroy this node and all its children.
    destroy: function () {
      if (this.leftChild) {
        this.leftChild.destroy()
        this.removeLeft()
      }
      if (this.rightChild) {
        this.rightChild.destroy()
        this.removeRight()
      }
      this.Value = undefined
    },

    // Return an array containing all leaf nodes of this tree.
    getLeaves: function () {
      if (this.isLeaf()) {
        var retArray = []
        retArray[0] = this.Value
        return retArray
      } else if (this.leftChild === undefined) {
        return this.rightChild.getLeaves()
      } else if (this.rightChild === undefined) {
        return this.leftChild.getLeaves()
      }

      return this.leftChild.getLeaves().concat(this.rightChild.getLeaves())
    },

    recursivelyCall: function (callback) {
      if (this.leftChild) {
        this.leftChild.recursivelyCall(callback)
      }
      if (this.rightChild) {
        this.rightChild.recursivelyCall(callback)
      }
      callback(this)
    },

    clone: function () {
      var newTreeNode = lang.mixin({}, this)
      if (this.leftChild) {
        var newLeftChild = this.leftChild.clone()
        newTreeNode.leftChild = newLeftChild
      }
      if (this.rightChild) {
        var newRightChild = this.rightChild.clone()
        newTreeNode.rightChild = newRightChild
      }

      return newTreeNode
    },
  })
})
