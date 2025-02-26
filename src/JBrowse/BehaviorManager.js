define([], function () {
  /**
   * Stores, applies, and removes a named set of behaviors.  A behavior
   * is a set of event handlers that need to be connected and then
   * disconnected repeatedly as a group.
   * @constructor
   * @class
   * @param {Object} args.behaviors object containing the behaviors to be managed, as:
   * <pre>
   *     {
   *        behavior_name: {
   *          apply_on_init: true if this behavior should be applied when the manager is initialized,
   *          apply: function( manager_object, handles_array ) {
   *            // required function that returns an array of dojo event handles.  for example:
   *            return [
   *                dojo.connect(document.body, "mouseup",   this, 'rubberExecute'  ),
   *                dojo.connect(document.body, "mousemove", this, 'rubberMove'     )
   *            ];
   *          },
   *          remove: function( manager_object, handles_array ) {
   *              // optional function that removes the behavior.  by
   *              // default dojo.disconnect() is just called on each
   *              // of the event handles that were returned by the
   *              // apply function
   *          }
   *        },
   *        ...
   *     }
   * </pre>
   * @param {Object} [args.context=BehaviorManager itself] context
   *    (i.e. <code>this</code>) in which each of the behavior
   *    <code>apply()</code> and <code>remove()</code> functions will be
   *    called.
   * @lends JBrowse.BehaviorManager
   */
  function BehaviorManager(args) {
    this.context = args.context
    this.behaviors = args.behaviors
  }

  /**
   * Apply the behaviors that have <code>apply_on_init</code> true.
   */
  BehaviorManager.prototype.initialize = function () {
    this.removeAll()
    for (var bname in this.behaviors) {
      var b = this.behaviors[bname]
      if (b.apply_on_init) {
        this.applyBehaviors(bname)
      }
    }
  }

  /**
   * Apply each of the behaviors named as arguments to this function.
   * @param {String} [...] Zero or more string behavior names to apply.
   */
  BehaviorManager.prototype.applyBehaviors = function () {
    dojo.forEach(
      arguments,
      function (name) {
        var b = this._get(name)
        if (!b.applied) {
          b.handles = b.handles || []
          b.handles = b.apply.call(this.context || this, this, b.handles)
          b.applied = true
        }
      },
      this,
    )
  }

  /**
   * Look up a behavior by name, throw an exception if it's not there.
   * @private
   */
  BehaviorManager.prototype._get = function (name) {
    var b = this.behaviors[name]
    if (!b) throw "no behavior registed with name '" + "'name"
    return b
  }

  /**
   * Given two behavior names, remove the first one and apply the second
   * one.  For convenience.
   */
  BehaviorManager.prototype.swapBehaviors = function (off, on) {
    this.removeBehaviors(off)
    this.applyBehaviors(on)
  }

  /**
   * Remove each of the behaviors named as arguments to this function.
   * @param {String} [...] Zero or more string behavior names to remove.
   */
  BehaviorManager.prototype.removeBehaviors = function () {
    dojo.forEach(
      arguments,
      function (name) {
        var b = this._get(name)
        if (b.applied) {
          var remove =
            b.remove ||
            function (m, h) {
              dojo.forEach(h, dojo.disconnect, dojo)
            }
          remove.call(this.context || this, this, b.handles)
          b.applied = false
        }
      },
      this,
    )
  }

  /**
   * Remove all behaviors that are currently applied.
   */
  BehaviorManager.prototype.removeAll = function () {
    for (var bname in this.behaviors) {
      this.removeBehaviors(bname)
    }
  }

  return BehaviorManager
})
