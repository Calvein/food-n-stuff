(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/application.js":[function(require,module,exports){
/**
 * Module dependencies.
 */

var Emitter = require('component-emitter')

/**
 * Expose `scene`.
 */

module.exports = Application

/**
 * Create a new `Application`.
 *
 * @param {Object} element Optional initial element
 */

function Application (element) {
  if (!(this instanceof Application)) return new Application(element)
  this.options = {}
  this.sources = {}
  this.element = element
}

/**
 * Mixin `Emitter`.
 */

Emitter(Application.prototype)

/**
 * Add a plugin
 *
 * @param {Function} plugin
 */

Application.prototype.use = function (plugin) {
  plugin(this)
  return this
}

/**
 * Set an option
 *
 * @param {String} name
 */

Application.prototype.option = function (name, val) {
  this.options[name] = val
  return this
}

/**
 * Set value used somewhere in the IO network.
 */

Application.prototype.set = function (name, data) {
  this.sources[name] = data
  this.emit('source', name, data)
  return this
}

/**
 * Mount a virtual element.
 *
 * @param {VirtualElement} element
 */

Application.prototype.mount = function (element) {
  this.element = element
  this.emit('mount', element)
  return this
}

/**
 * Remove the world. Unmount everything.
 */

Application.prototype.unmount = function () {
  if (!this.element) return
  this.element = null
  this.emit('unmount')
  return this
}

},{"component-emitter":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/component-emitter/index.js"}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/events.js":[function(require,module,exports){
/**
 * All of the events can bind to
 */

module.exports = {
  onBlur: 'blur',
  onChange: 'change',
  onClick: 'click',
  onContextMenu: 'contextmenu',
  onCopy: 'copy',
  onCut: 'cut',
  onDoubleClick: 'dblclick',
  onDrag: 'drag',
  onDragEnd: 'dragend',
  onDragEnter: 'dragenter',
  onDragExit: 'dragexit',
  onDragLeave: 'dragleave',
  onDragOver: 'dragover',
  onDragStart: 'dragstart',
  onDrop: 'drop',
  onFocus: 'focus',
  onInput: 'input',
  onKeyDown: 'keydown',
  onKeyPress: 'keypress',
  onKeyUp: 'keyup',
  onMouseDown: 'mousedown',
  onMouseEnter: 'mouseenter',
  onMouseLeave: 'mouseleave',
  onMouseMove: 'mousemove',
  onMouseOut: 'mouseout',
  onMouseOver: 'mouseover',
  onMouseUp: 'mouseup',
  onPaste: 'paste',
  onScroll: 'scroll',
  onSubmit: 'submit',
  onTouchCancel: 'touchcancel',
  onTouchEnd: 'touchend',
  onTouchMove: 'touchmove',
  onTouchStart: 'touchstart',
  onWheel: 'wheel'
}

},{}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/index.js":[function(require,module,exports){
/**
 * Create the application.
 */

exports.tree =
exports.scene =
exports.deku = require('./application')

/**
 * Render scenes to the DOM.
 */

if (typeof document !== 'undefined') {
  exports.render = require('./render')
}

/**
 * Render scenes to a string
 */

exports.renderString = require('./stringify')

/**
 * Create virtual elements.
 */

exports.element =
exports.createElement =
exports.dom = require('./virtual')

},{"./application":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/application.js","./render":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/render.js","./stringify":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/stringify.js","./virtual":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/virtual.js"}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/render.js":[function(require,module,exports){
/**
 * Dependencies.
 */

var raf = require('component-raf')
var Pool = require('dom-pool')
var walk = require('dom-walk')
var isDom = require('is-dom')
var uid = require('get-uid')
var keypath = require('object-path')
var type = require('component-type')
var utils = require('./utils')
var svg = require('./svg')
var events = require('./events')
var defaults = utils.defaults
var forEach = require('fast.js/forEach')
var assign = require('fast.js/object/assign')
var reduce = require('fast.js/reduce')
var isPromise = require('is-promise')

/**
 * These elements won't be pooled
 */

var avoidPooling = ['input', 'textarea'];

/**
 * Expose `dom`.
 */

module.exports = render

/**
 * Render an app to the DOM
 *
 * @param {Application} app
 * @param {HTMLElement} container
 * @param {Object} opts
 *
 * @return {Object}
 */

function render (app, container, opts) {
  var frameId
  var isRendering
  var rootId = 'root'
  var currentElement
  var currentNativeElement
  var connections = {}
  var components = {}
  var entities = {}
  var pools = {}
  var handlers = {}
  var mountQueue = []
  var children = {}
  children[rootId] = {}

  if (!isDom(container)) {
    throw new Error('Container element must be a DOM element')
  }

  /**
   * Rendering options. Batching is only ever really disabled
   * when running tests, and pooling can be disabled if the user
   * is doing something stupid with the DOM in their components.
   */

  var options = defaults(assign({}, app.options || {}, opts || {}), {
    pooling: true,
    batching: true,
    validateProps: false
  })

  /**
   * Listen to DOM events
   */

  addNativeEventListeners()

  /**
   * Watch for changes to the app so that we can update
   * the DOM as needed.
   */

  app.on('unmount', onunmount)
  app.on('mount', onmount)
  app.on('source', onupdate)

  /**
   * If the app has already mounted an element, we can just
   * render that straight away.
   */

  if (app.element) render()

  /**
   * Teardown the DOM rendering so that it stops
   * rendering and everything can be garbage collected.
   */

  function teardown () {
    removeNativeEventListeners()
    removeNativeElement()
    app.off('unmount', onunmount)
    app.off('mount', onmount)
    app.off('source', onupdate)
  }

  /**
   * Swap the current rendered node with a new one that is rendered
   * from the new virtual element mounted on the app.
   *
   * @param {VirtualElement} element
   */

  function onmount () {
    invalidate()
  }

  /**
   * If the app unmounts an element, we should clear out the current
   * rendered element. This will remove all the entities.
   */

  function onunmount () {
    removeNativeElement()
    currentElement = null
  }

  /**
   * Update all components that are bound to the source
   *
   * @param {String} name
   * @param {*} data
   */

  function onupdate (name, data) {
    if (!connections[name]) return;
    connections[name].forEach(function(update) {
      update(data)
    })
  }

  /**
   * Render and mount a component to the native dom.
   *
   * @param {Entity} entity
   * @return {HTMLElement}
   */

  function mountEntity (entity) {
    register(entity)
    setSources(entity)
    children[entity.id] = {}
    entities[entity.id] = entity

    // commit initial state and props.
    commit(entity)

    // callback before mounting.
    trigger('beforeMount', entity, [entity.context])
    trigger('beforeRender', entity, [entity.context])

    // render virtual element.
    var virtualElement = renderEntity(entity)
    // create native element.
    var nativeElement = toNative(entity.id, '0', virtualElement)

    entity.virtualElement = virtualElement
    entity.nativeElement = nativeElement

    // Fire afterRender and afterMount hooks at the end
    // of the render cycle
    mountQueue.push(entity.id)

    return nativeElement
  }

  /**
   * Remove a component from the native dom.
   *
   * @param {Entity} entity
   */

  function unmountEntity (entityId) {
    var entity = entities[entityId]
    if (!entity) return
    trigger('beforeUnmount', entity, [entity.context, entity.nativeElement])
    unmountChildren(entityId)
    removeAllEvents(entityId)
    var componentEntities = components[entityId].entities;
    delete componentEntities[entityId]
    delete components[entityId]
    delete entities[entityId]
    delete children[entityId]
  }

  /**
   * Render the entity and make sure it returns a node
   *
   * @param {Entity} entity
   *
   * @return {VirtualTree}
   */

  function renderEntity (entity) {
    var component = entity.component
    if (!component.render) throw new Error('Component needs a render function')
    var result = component.render(entity.context, setState(entity))
    if (!result) throw new Error('Render function must return an element.')
    return result
  }

  /**
   * Whenever setState or setProps is called, we mark the entity
   * as dirty in the renderer. This lets us optimize the re-rendering
   * and skip components that definitely haven't changed.
   *
   * @param {Entity} entity
   *
   * @return {Function} A curried function for updating the state of an entity
   */

  function setState (entity) {
    return function (nextState) {
      updateEntityStateAsync(entity, nextState)
    }
  }

  /**
   * Tell the app it's dirty and needs to re-render. If batching is disabled
   * we can just trigger a render immediately, otherwise we'll wait until
   * the next available frame.
   */

  function invalidate () {
    if (!options.batching) {
      if (!isRendering) render()
    } else {
      if (!frameId) frameId = raf(render)
    }
  }

  /**
   * Update the DOM. If the update fails we stop the loop
   * so we don't get errors on every frame.
   *
   * @api public
   */

  function render () {
    // If this is called synchronously we need to
    // cancel any pending future updates
    clearFrame()

    // If the rendering from the previous frame is still going,
    // we'll just wait until the next frame. Ideally renders should
    // not take over 16ms to stay within a single frame, but this should
    // catch it if it does.
    if (isRendering) {
      frameId = raf(render)
      return
    } else {
      isRendering = true
    }

    // 1. If there isn't a native element rendered for the current mounted element
    // then we need to create it from scratch.
    // 2. If a new element has been mounted, we should diff them.
    // 3. We should update check all child components for changes.
    if (!currentNativeElement) {
      currentElement = app.element
      currentNativeElement = toNative(rootId, '0', currentElement)
      if (container.children.length > 0) {
        console.info('deku: The container element is not empty. These elements will be removed. Read more: http://cl.ly/b0Sr')
      }
      if (container === document.body) {
        console.warn('deku: Using document.body is allowed but it can cause some issues. Read more: http://cl.ly/b0SC')
      }
      removeAllChildren(container);
      container.appendChild(currentNativeElement)
    } else if (currentElement !== app.element) {
      currentNativeElement = patch(rootId, currentElement, app.element, currentNativeElement)
      currentElement = app.element
      updateChildren(rootId)
    } else {
      updateChildren(rootId)
    }

    // Call mount events on all new entities
    flushMountQueue()

    // Allow rendering again.
    isRendering = false
  }

  /**
   * Call hooks for all new entities that have been created in
   * the last render from the bottom up.
   */

  function flushMountQueue () {
    var entityId
    while (entityId = mountQueue.pop()) {
      var entity = entities[entityId]
      trigger('afterRender', entity, [entity.context, entity.nativeElement])
      triggerUpdate('afterMount', entity, [entity.context, entity.nativeElement, setState(entity)])
    }
  }

  /**
   * Clear the current scheduled frame
   */

  function clearFrame () {
    if (!frameId) return
    raf.cancel(frameId)
    frameId = 0
  }

  /**
   * Update a component.
   *
   * The entity is just the data object for a component instance.
   *
   * @param {String} id Component instance id.
   */

  function updateEntity (entityId) {
    var entity = entities[entityId]
    setSources(entity)

    if (!shouldUpdate(entity)) return updateChildren(entityId)

    var currentTree = entity.virtualElement
    var nextProps = entity.pendingProps
    var nextState = entity.pendingState
    var previousState = entity.context.state
    var previousProps = entity.context.props

    // hook before rendering. could modify state just before the render occurs.
    trigger('beforeUpdate', entity, [entity.context, nextProps, nextState])
    trigger('beforeRender', entity, [entity.context])

    // commit state and props.
    commit(entity)

    // re-render.
    var nextTree = renderEntity(entity)

    // if the tree is the same we can just skip this component
    // but we should still check the children to see if they're dirty.
    // This allows us to memoize the render function of components.
    if (nextTree === currentTree) return updateChildren(entityId)

    // apply new virtual tree to native dom.
    entity.nativeElement = patch(entityId, currentTree, nextTree, entity.nativeElement)
    entity.virtualElement = nextTree
    updateChildren(entityId)

    // trigger render hook
    trigger('afterRender', entity, [entity.context, entity.nativeElement])

    // trigger afterUpdate after all children have updated.
    triggerUpdate('afterUpdate', entity, [entity.context, previousProps, previousState])
  }

  /**
   * Update all the children of an entity.
   *
   * @param {String} id Component instance id.
   */

  function updateChildren (entityId) {
    forEach(children[entityId], function (childId) {
      updateEntity(childId)
    })
  }

  /**
   * Remove all of the child entities of an entity
   *
   * @param {Entity} entity
   */

  function unmountChildren (entityId) {
    forEach(children[entityId], function (childId) {
      unmountEntity(childId)
    })
  }

  /**
   * Remove the root element. If this is called synchronously we need to
   * cancel any pending future updates.
   */

  function removeNativeElement () {
    clearFrame()
    removeElement(rootId, '0', currentNativeElement)
    currentNativeElement = null
  }

  /**
   * Create a native element from a virtual element.
   *
   * @param {String} entityId
   * @param {String} path
   * @param {Object} vnode
   *
   * @return {HTMLDocumentFragment}
   */

  function toNative (entityId, path, vnode) {
    switch (vnode.type) {
      case 'text': return toNativeText(vnode)
      case 'element': return toNativeElement(entityId, path, vnode)
      case 'component': return toNativeComponent(entityId, path, vnode)
    }
  }

  /**
   * Create a native text element from a virtual element.
   *
   * @param {Object} vnode
   */

  function toNativeText (vnode) {
    return document.createTextNode(vnode.data)
  }

  /**
   * Create a native element from a virtual element.
   */

  function toNativeElement (entityId, path, vnode) {
    var attributes = vnode.attributes
    var children = vnode.children
    var tagName = vnode.tagName
    var el

    // create element either from pool or fresh.
    if (!options.pooling || !canPool(tagName)) {
      if (svg.isElement(tagName)) {
        el = document.createElementNS(svg.namespace, tagName)
      } else {
        el = document.createElement(tagName)
      }
    } else {
      var pool = getPool(tagName)
      el = cleanup(pool.pop())
      if (el.parentNode) el.parentNode.removeChild(el)
    }

    // set attributes.
    forEach(attributes, function (value, name) {
      setAttribute(entityId, path, el, name, value)
    })

    // store keys on the native element for fast event handling.
    el.__entity__ = entityId
    el.__path__ = path

    // add children.
    forEach(children, function (child, i) {
      var childEl = toNative(entityId, path + '.' + i, child)
      if (!childEl.parentNode) el.appendChild(childEl)
    })

    return el
  }

  /**
   * Create a native element from a component.
   */

  function toNativeComponent (entityId, path, vnode) {
    var child = new Entity(vnode.component, vnode.props, entityId)
    children[entityId][path] = child.id
    return mountEntity(child)
  }

  /**
   * Patch an element with the diff from two trees.
   */

  function patch (entityId, prev, next, el) {
    return diffNode('0', entityId, prev, next, el)
  }

  /**
   * Create a diff between two trees of nodes.
   */

  function diffNode (path, entityId, prev, next, el) {
    // Type changed. This could be from element->text, text->ComponentA,
    // ComponentA->ComponentB etc. But NOT div->span. These are the same type
    // (ElementNode) but different tag name.
    if (prev.type !== next.type) return replaceElement(entityId, path, el, next)

    switch (next.type) {
      case 'text': return diffText(prev, next, el)
      case 'element': return diffElement(path, entityId, prev, next, el)
      case 'component': return diffComponent(path, entityId, prev, next, el)
    }
  }

  /**
   * Diff two text nodes and update the element.
   */

  function diffText (previous, current, el) {
    if (current.data !== previous.data) el.data = current.data
    return el
  }

  /**
   * Diff the children of an ElementNode.
   */

  function diffChildren (path, entityId, prev, next, el) {
    var positions = []
    var hasKeys = false
    var childNodes = Array.prototype.slice.apply(el.childNodes)
    var leftKeys = reduce(prev.children, keyMapReducer, {})
    var rightKeys = reduce(next.children, keyMapReducer, {})
    var currentChildren = assign({}, children[entityId])

    function keyMapReducer (acc, child) {
      if (child.key != null) {
        acc[child.key] = child
        hasKeys = true
      }
      return acc
    }

    // Diff all of the nodes that have keys. This lets us re-used elements
    // instead of overriding them and lets us move them around.
    if (hasKeys) {

      // Removals
      forEach(leftKeys, function (leftNode, key) {
        if (rightKeys[key] == null) {
          var leftPath = path + '.' + leftNode.index
          removeElement(
            entityId,
            leftPath,
            childNodes[leftNode.index]
          )
        }
      })

      // Update nodes
      forEach(rightKeys, function (rightNode, key) {
        var leftNode = leftKeys[key]

        // We only want updates for now
        if (leftNode == null) return

        var leftPath = path + '.' + leftNode.index

        // Updated
        positions[rightNode.index] = diffNode(
          leftPath,
          entityId,
          leftNode,
          rightNode,
          childNodes[leftNode.index]
        )
      })

      // Update the positions of all child components and event handlers
      forEach(rightKeys, function (rightNode, key) {
        var leftNode = leftKeys[key]

        // We just want elements that have moved around
        if (leftNode == null || leftNode.index === rightNode.index) return

        var rightPath = path + '.' + rightNode.index
        var leftPath = path + '.' + leftNode.index

        // Update all the child component path positions to match
        // the latest positions if they've changed. This is a bit hacky.
        forEach(currentChildren, function (childId, childPath) {
          if (leftPath === childPath) {
            delete children[entityId][childPath]
            children[entityId][rightPath] = childId
          }
        })
      })

      // Now add all of the new nodes last in case their path
      // would have conflicted with one of the previous paths.
      forEach(rightKeys, function (rightNode, key) {
        var rightPath = path + '.' + rightNode.index
        if (leftKeys[key] == null) {
          positions[rightNode.index] = toNative(
            entityId,
            rightPath,
            rightNode
          )
        }
      })

    } else {
      var maxLength = Math.max(prev.children.length, next.children.length)

      // Now diff all of the nodes that don't have keys
      for (var i = 0; i < maxLength; i++) {
        var leftNode = prev.children[i]
        var rightNode = next.children[i]

        // Removals
        if (rightNode == null) {
          removeElement(
            entityId,
            path + '.' + leftNode.index,
            childNodes[leftNode.index]
          )
        }

        // New Node
        if (leftNode == null) {
          positions[rightNode.index] = toNative(
            entityId,
            path + '.' + rightNode.index,
            rightNode
          )
        }

        // Updated
        if (leftNode && rightNode) {
          positions[leftNode.index] = diffNode(
            path + '.' + leftNode.index,
            entityId,
            leftNode,
            rightNode,
            childNodes[leftNode.index]
          )
        }
      }
    }

    // Reposition all the elements
    forEach(positions, function (childEl, newPosition) {
      var target = el.childNodes[newPosition]
      if (childEl !== target) {
        if (target) {
          el.insertBefore(childEl, target)
        } else {
          el.appendChild(childEl)
        }
      }
    })
  }

  /**
   * Diff the attributes and add/remove them.
   */

  function diffAttributes (prev, next, el, entityId, path) {
    var nextAttrs = next.attributes
    var prevAttrs = prev.attributes

    // add new attrs
    forEach(nextAttrs, function (value, name) {
      if (events[name] || !(name in prevAttrs) || prevAttrs[name] !== value) {
        setAttribute(entityId, path, el, name, value)
      }
    })

    // remove old attrs
    forEach(prevAttrs, function (value, name) {
      if (!(name in nextAttrs)) {
        removeAttribute(entityId, path, el, name)
      }
    })
  }

  /**
   * Update a component with the props from the next node. If
   * the component type has changed, we'll just remove the old one
   * and replace it with the new component.
   */

  function diffComponent (path, entityId, prev, next, el) {
    if (next.component !== prev.component) {
      return replaceElement(entityId, path, el, next)
    } else {
      var targetId = children[entityId][path]

      // This is a hack for now
      if (targetId) {
        updateEntityProps(targetId, next.props)
      }

      return el
    }
  }

  /**
   * Diff two element nodes.
   */

  function diffElement (path, entityId, prev, next, el) {
    if (next.tagName !== prev.tagName) return replaceElement(entityId, path, el, next)
    diffAttributes(prev, next, el, entityId, path)
    diffChildren(path, entityId, prev, next, el)
    return el
  }

  /**
   * Removes an element from the DOM and unmounts and components
   * that are within that branch
   *
   * side effects:
   *   - removes element from the DOM
   *   - removes internal references
   *
   * @param {String} entityId
   * @param {String} path
   * @param {HTMLElement} el
   */

  function removeElement (entityId, path, el) {
    var childrenByPath = children[entityId]
    var childId = childrenByPath[path]
    var entityHandlers = handlers[entityId] || {}
    var removals = []

    // If the path points to a component we should use that
    // components element instead, because it might have moved it.
    if (childId) {
      var child = entities[childId]
      el = child.nativeElement
      unmountEntity(childId)
      removals.push(path)
    } else {

      // Just remove the text node
      if (!isElement(el)) return el.parentNode.removeChild(el)

      // Then we need to find any components within this
      // branch and unmount them.
      forEach(childrenByPath, function (childId, childPath) {
        if (childPath === path || isWithinPath(path, childPath)) {
          unmountEntity(childId)
          removals.push(childPath)
        }
      })

      // Remove all events at this path or below it
      forEach(entityHandlers, function (fn, handlerPath) {
        if (handlerPath === path || isWithinPath(path, handlerPath)) {
          removeEvent(entityId, handlerPath)
        }
      })
    }

    // Remove the paths from the object without touching the
    // old object. This keeps the object using fast properties.
    forEach(removals, function (path) {
      delete children[entityId][path]
    })

    // Remove it from the DOM
    el.parentNode.removeChild(el)

    // Return all of the elements in this node tree to the pool
    // so that the elements can be re-used.
    if (options.pooling) {
      walk(el, function (node) {
        if (!isElement(node) || !canPool(node.tagName)) return
        getPool(node.tagName.toLowerCase()).push(node)
      })
    }
  }

  /**
   * Replace an element in the DOM. Removing all components
   * within that element and re-rendering the new virtual node.
   *
   * @param {Entity} entity
   * @param {String} path
   * @param {HTMLElement} el
   * @param {Object} vnode
   *
   * @return {void}
   */

  function replaceElement (entityId, path, el, vnode) {
    var parent = el.parentNode
    var index = Array.prototype.indexOf.call(parent.childNodes, el)

    // remove the previous element and all nested components. This
    // needs to happen before we create the new element so we don't
    // get clashes on the component paths.
    removeElement(entityId, path, el)

    // then add the new element in there
    var newEl = toNative(entityId, path, vnode)
    var target = parent.childNodes[index]

    if (target) {
      parent.insertBefore(newEl, target)
    } else {
      parent.appendChild(newEl)
    }

    // walk up the tree and update all `entity.nativeElement` references.
    if (entityId !== 'root' && path === '0') {
      updateNativeElement(entityId, newEl)
    }

    return newEl
  }

  /**
   * Update all entities in a branch that have the same nativeElement. This
   * happens when a component has another component as it's root node.
   *
   * @param {String} entityId
   * @param {HTMLElement} newEl
   *
   * @return {void}
   */

  function updateNativeElement (entityId, newEl) {
    var target = entities[entityId]
    if (target.ownerId === 'root') return
    if (children[target.ownerId]['0'] === entityId) {
      entities[target.ownerId].nativeElement = newEl
      updateNativeElement(target.ownerId, newEl)
    }
  }

  /**
   * Set the attribute of an element, performing additional transformations
   * dependning on the attribute name
   *
   * @param {HTMLElement} el
   * @param {String} name
   * @param {String} value
   */

  function setAttribute (entityId, path, el, name, value) {
    if (events[name]) {
      addEvent(entityId, path, events[name], value)
      return
    }
    switch (name) {
      case 'checked':
      case 'disabled':
      case 'selected':
        el[name] = true
        break
      case 'innerHTML':
      case 'value':
        el[name] = value
        break
      case svg.isAttribute(name):
        el.setAttributeNS(svg.namespace, name, value)
        break
      default:
        el.setAttribute(name, value)
        break
    }
  }

  /**
   * Remove an attribute, performing additional transformations
   * dependning on the attribute name
   *
   * @param {HTMLElement} el
   * @param {String} name
   */

  function removeAttribute (entityId, path, el, name) {
    if (events[name]) {
      removeEvent(entityId, path, events[name])
      return
    }
    switch (name) {
      case 'checked':
      case 'disabled':
      case 'selected':
        el[name] = false
        break
      case 'innerHTML':
      case 'value':
        el[name] = ""
        break
      default:
        el.removeAttribute(name)
        break
    }
  }

  /**
   * Checks to see if one tree path is within
   * another tree path. Example:
   *
   * 0.1 vs 0.1.1 = true
   * 0.2 vs 0.3.5 = false
   *
   * @param {String} target
   * @param {String} path
   *
   * @return {Boolean}
   */

  function isWithinPath (target, path) {
    return path.indexOf(target + '.') === 0
  }

  /**
   * Is the DOM node an element node
   *
   * @param {HTMLElement} el
   *
   * @return {Boolean}
   */

  function isElement (el) {
    return !!el.tagName
  }

  /**
   * Get the pool for a tagName, creating it if it
   * doesn't exist.
   *
   * @param {String} tagName
   *
   * @return {Pool}
   */

  function getPool (tagName) {
    var pool = pools[tagName]
    if (!pool) {
      var poolOpts = svg.isElement(tagName) ?
        { namespace: svg.namespace, tagName: tagName } :
        { tagName: tagName }
      pool = pools[tagName] = new Pool(poolOpts)
    }
    return pool
  }

  /**
   * Clean up previously used native element for reuse.
   *
   * @param {HTMLElement} el
   */

  function cleanup (el) {
    removeAllChildren(el)
    removeAllAttributes(el)
    return el
  }

  /**
   * Remove all the attributes from a node
   *
   * @param {HTMLElement} el
   */

  function removeAllAttributes (el) {
    for (var i = el.attributes.length - 1; i >= 0; i--) {
      var name = el.attributes[i].name
      el.removeAttribute(name)
    }
  }

  /**
   * Remove all the child nodes from an element
   *
   * @param {HTMLElement} el
   */

  function removeAllChildren (el) {
    while (el.firstChild) el.removeChild(el.firstChild)
  }

  /**
   * Trigger a hook on a component.
   *
   * @param {String} name Name of hook.
   * @param {Entity} entity The component instance.
   * @param {Array} args To pass along to hook.
   */

  function trigger (name, entity, args) {
    if (typeof entity.component[name] !== 'function') return
    return entity.component[name].apply(null, args)
  }

  /**
   * Trigger a hook on the component and allow state to be
   * updated too.
   *
   * @param {String} name
   * @param {Object} entity
   * @param {Array} args
   *
   * @return {void}
   */

  function triggerUpdate (name, entity, args) {
    var update = setState(entity)
    args.push(update)
    var result = trigger(name, entity, args)
    if (result) {
      updateEntityStateAsync(entity, result)
    }
  }

  /**
   * Update the entity state using a promise
   *
   * @param {Entity} entity
   * @param {Promise} promise
   */

  function updateEntityStateAsync (entity, value) {
    if (isPromise(value)) {
      value.then(function (newState) {
        updateEntityState(entity, newState)
      })
    } else {
      updateEntityState(entity, value)
    }
  }

  /**
   * Update an entity to match the latest rendered vode. We always
   * replace the props on the component when composing them. This
   * will trigger a re-render on all children below this point.
   *
   * @param {Entity} entity
   * @param {String} path
   * @param {Object} vnode
   *
   * @return {void}
   */

  function updateEntityProps (entityId, nextProps) {
    var entity = entities[entityId]
    entity.pendingProps = nextProps
    entity.dirty = true
    invalidate()
  }

  /**
   * Update component instance state.
   */

  function updateEntityState (entity, nextState) {
    entity.pendingState = assign(entity.pendingState, nextState)
    entity.dirty = true
    invalidate()
  }

  /**
   * Commit props and state changes to an entity.
   */

  function commit (entity) {
    entity.context = {
      state: entity.pendingState,
      props: entity.pendingProps,
      id: entity.id
    }
    entity.pendingState = assign({}, entity.context.state)
    entity.pendingProps = assign({}, entity.context.props)
    validateProps(entity.context.props, entity.propTypes)
    entity.dirty = false
  }

  /**
   * Try to avoid creating new virtual dom if possible.
   *
   * Later we may expose this so you can override, but not there yet.
   */

  function shouldUpdate (entity) {
    if (!entity.dirty) return false
    if (!entity.component.shouldUpdate) return true
    var nextProps = entity.pendingProps
    var nextState = entity.pendingState
    var bool = entity.component.shouldUpdate(entity.context, nextProps, nextState)
    return bool
  }

  /**
   * Register an entity.
   *
   * This is mostly to pre-preprocess component properties and values chains.
   *
   * The end result is for every component that gets mounted,
   * you create a set of IO nodes in the network from the `value` definitions.
   *
   * @param {Component} component
   */

  function register (entity) {
    registerEntity(entity)
    var component = entity.component
    if (component.registered) return

    // initialize sources once for a component type.
    registerSources(entity)
    component.registered = true
  }

  /**
   * Add entity to data-structures related to components/entities.
   *
   * @param {Entity} entity
   */

  function registerEntity(entity) {
    var component = entity.component
    // all entities for this component type.
    var entities = component.entities = component.entities || {}
    // add entity to component list
    entities[entity.id] = entity
    // map to component so you can remove later.
    components[entity.id] = component
  }

  /**
   * Initialize sources for a component by type.
   *
   * @param {Entity} entity
   */

  function registerSources(entity) {
    var component = components[entity.id]
    // get 'class-level' sources.
    // if we've already hooked it up, then we're good.
    var sources = component.sources
    if (sources) return
    var entities = component.entities

    // hook up sources.
    var map = component.sourceToPropertyName = {}
    component.sources = sources = []
    var propTypes = component.propTypes
    for (var name in propTypes) {
      var data = propTypes[name]
      if (!data) continue
      if (!data.source) continue
      sources.push(data.source)
      map[data.source] = name
    }

    // send value updates to all component instances.
    sources.forEach(function (source) {
      connections[source] = connections[source] || []
      connections[source].push(update)

      function update (data) {
        var prop = map[source]
        for (var entityId in entities) {
          var entity = entities[entityId]
          var changes = {}
          changes[prop] = data
          updateEntityProps(entityId, assign(entity.pendingProps, changes))
        }
      }
    })
  }

  /**
   * Set the initial source value on the entity
   *
   * @param {Entity} entity
   */

  function setSources (entity) {
    var component = entity.component
    var map = component.sourceToPropertyName
    var sources = component.sources
    sources.forEach(function (source) {
      var name = map[source]
      if (entity.pendingProps[name] != null) return
      entity.pendingProps[name] = app.sources[source] // get latest value plugged into global store
    })
  }

  /**
   * Add all of the DOM event listeners
   */

  function addNativeEventListeners () {
    forEach(events, function (eventType) {
      document.body.addEventListener(eventType, handleEvent, true)
    })
  }

  /**
   * Add all of the DOM event listeners
   */

  function removeNativeEventListeners () {
    forEach(events, function (eventType) {
      document.body.removeEventListener(eventType, handleEvent, true)
    })
  }

  /**
   * Handle an event that has occured within the container
   *
   * @param {Event} event
   */

  function handleEvent (event) {
    var target = event.target
    var eventType = event.type

    // Walk up the DOM tree and see if there is a handler
    // for this event type higher up.
    while (target) {
      var fn = keypath.get(handlers, [target.__entity__, target.__path__, eventType])
      if (fn) {
        event.delegateTarget = target
        fn(event)
        break
      }
      target = target.parentNode
    }
  }

  /**
   * Bind events for an element, and all it's rendered child elements.
   *
   * @param {String} path
   * @param {String} event
   * @param {Function} fn
   */

  function addEvent (entityId, path, eventType, fn) {
    keypath.set(handlers, [entityId, path, eventType], function (e) {
      var entity = entities[entityId]
      if (entity) {
        var update = setState(entity)
        var result = fn.call(null, e, entity.context, update)
        if (result) {
          updateEntityStateAsync(entity, result)
        }
      } else {
        fn.call(null, e)
      }
    })
  }

  /**
   * Unbind events for a entityId
   *
   * @param {String} entityId
   */

  function removeEvent (entityId, path, eventType) {
    var args = [entityId]
    if (path) args.push(path)
    if (eventType) args.push(eventType)
    keypath.del(handlers, args)
  }

  /**
   * Unbind all events from an entity
   *
   * @param {Entity} entity
   */

  function removeAllEvents (entityId) {
    keypath.del(handlers, [entityId])
  }

  /**
   * Validate the current properties. These simple validations
   * make it easier to ensure the correct props are passed in.
   *
   * Available rules include:
   *
   * type: {String} string | array | object | boolean | number | date | function
   *       {Array} An array of types mentioned above
   *       {Function} fn(value) should return `true` to pass in
   * expects: [] An array of values this prop could equal
   * optional: Boolean
   */

  function validateProps (props, rules, optPrefix) {
    var prefix = optPrefix || ''
    if (!options.validateProps) return
    forEach(rules, function (options, name) {
      if (!options) {
        throw new Error('deku: propTypes should have an options object for each type')
      }

      var propName = prefix ? prefix + '.' + name : name
      var value = keypath.get(props, name)
      var valueType = type(value)
      var typeFormat = type(options.type)
      var optional = (options.optional === true)

      // If it's optional and doesn't exist
      if (optional && value == null) {
        return
      }

      // If it's required and doesn't exist
      if (!optional && value == null) {
        throw new TypeError('Missing property: ' + propName)
      }

      // It's a nested type
      if (typeFormat === 'object') {
        validateProps(value, options.type, propName)
        return
      }

      // If it's the incorrect type
      if (typeFormat === 'string' && valueType !== options.type) {
        throw new TypeError('Invalid property type: ' + propName)
      }

      // If type is validate function
      if (typeFormat === 'function' && !options.type(value)) {
        throw new TypeError('Invalid property type: ' + propName)
      }

      // if type is array of possible types
      if (typeFormat === 'array' && options.type.indexOf(valueType) < 0) {
        throw new TypeError('Invalid property type: ' + propName)
      }

      // If it's an invalid value
      if (options.expects && options.expects.indexOf(value) < 0) {
        throw new TypeError('Invalid property value: ' + propName)
      }
    })

    // Now check for props that haven't been defined
    forEach(props, function (value, key) {
      // props.children is always passed in, even if it's not defined
      if (key === 'children') return
      if (!rules[key]) throw new Error('Unexpected property: ' + key)
    })
  }

  /**
   * Used for debugging to inspect the current state without
   * us needing to explicitly manage storing/updating references.
   *
   * @return {Object}
   */

  function inspect () {
    return {
      entities: entities,
      pools: pools,
      handlers: handlers,
      connections: connections,
      currentElement: currentElement,
      options: options,
      app: app,
      container: container,
      children: children
    }
  }

  /**
   * Return an object that lets us completely remove the automatic
   * DOM rendering and export debugging tools.
   */

  return {
    remove: teardown,
    inspect: inspect
  }
}

/**
 * A rendered component instance.
 *
 * This manages the lifecycle, props and state of the component.
 * It's basically just a data object for more straightfoward lookup.
 *
 * @param {Component} component
 * @param {Object} props
 */

function Entity (component, props, ownerId) {
  this.id = uid()
  this.ownerId = ownerId
  this.component = component
  this.propTypes = component.propTypes || {}
  this.context = {}
  this.context.id = this.id;
  this.context.props = defaults(props || {}, component.defaultProps || {})
  this.context.state = this.component.initialState ? this.component.initialState(this.context.props) : {}
  this.pendingProps = assign({}, this.context.props)
  this.pendingState = assign({}, this.context.state)
  this.dirty = false
  this.virtualElement = null
  this.nativeElement = null
  this.displayName = component.name || 'Component'
}

/**
 * Should we pool an element?
 */

function canPool(tagName) {
  return avoidPooling.indexOf(tagName) < 0
}

/**
 * Get a nested node using a path
 *
 * @param {HTMLElement} el   The root node '0'
 * @param {String} path The path string eg. '0.2.43'
 */

function getNodeAtPath(el, path) {
  var parts = path.split('.')
  parts.shift()
  while (parts.length) {
    el = el.childNodes[parts.pop()]
  }
  return el
}

},{"./events":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/events.js","./svg":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/svg.js","./utils":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/utils.js","component-raf":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/component-raf/index.js","component-type":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/component-type/index.js","dom-pool":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/dom-pool/Pool.js","dom-walk":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/dom-walk/index.js","fast.js/forEach":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/fast.js/forEach.js","fast.js/object/assign":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/fast.js/object/assign.js","fast.js/reduce":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/fast.js/reduce.js","get-uid":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/get-uid/index.js","is-dom":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/is-dom/index.js","is-promise":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/is-promise/index.js","object-path":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/object-path/index.js"}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/stringify.js":[function(require,module,exports){
var utils = require('./utils')
var events = require('./events')
var defaults = utils.defaults

/**
 * Expose `stringify`.
 */

module.exports = function (app) {
  if (!app.element) {
    throw new Error('No element mounted')
  }

  /**
   * Render to string.
   *
   * @param {Component} component
   * @param {Object} [props]
   * @return {String}
   */

  function stringify (component, optProps) {
    var propTypes = component.propTypes || {}
    var props = defaults(optProps || {}, component.defaultProps || {})
    var state = component.initialState ? component.initialState(props) : {}

    for (var name in propTypes) {
      var options = propTypes[name]
      if (options.source) {
        props[name] = app.sources[options.source]
      }
    }

    if (component.beforeMount) component.beforeMount({ props: props, state: state })
    if (component.beforeRender) component.beforeRender({ props: props, state: state })
    var node = component.render({ props: props, state: state })
    return stringifyNode(node, '0')
  }

  /**
   * Render a node to a string
   *
   * @param {Node} node
   * @param {Tree} tree
   *
   * @return {String}
   */

  function stringifyNode (node, path) {
    switch (node.type) {
      case 'text': return node.data
      case 'element':
        var children = node.children
        var attributes = node.attributes
        var tagName = node.tagName
        var innerHTML = attributes.innerHTML
        var str = '<' + tagName + attrs(attributes) + '>'

        if (innerHTML) {
          str += innerHTML
        } else {
          for (var i = 0, n = children.length; i < n; i++) {
            str += stringifyNode(children[i], path + '.' + i)
          }
        }

        str += '</' + tagName + '>'
        return str
      case 'component': return stringify(node.component, node.props)
    }

    throw new Error('Invalid type')
  }

  return stringifyNode(app.element, '0')
}

/**
 * HTML attributes to string.
 *
 * @param {Object} attributes
 * @return {String}
 * @api private
 */

function attrs (attributes) {
  var str = ''
  for (var key in attributes) {
    if (key === 'innerHTML') continue
    if (events[key]) continue
    str += attr(key, attributes[key])
  }
  return str
}

/**
 * HTML attribute to string.
 *
 * @param {String} key
 * @param {String} val
 * @return {String}
 * @api private
 */

function attr (key, val) {
  return ' ' + key + '="' + val + '"'
}

},{"./events":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/events.js","./utils":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/utils.js"}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/svg.js":[function(require,module,exports){
var indexOf = require('fast.js/array/indexOf')

/**
 * This file lists the supported SVG elements used by the
 * renderer. We may add better SVG support in the future
 * that doesn't require whitelisting elements.
 */

exports.namespace = 'http://www.w3.org/2000/svg'

/**
 * Supported SVG elements
 *
 * @type {Array}
 */

exports.elements = [
  'circle',
  'defs',
  'ellipse',
  'g',
  'line',
  'linearGradient',
  'mask',
  'path',
  'pattern',
  'polygon',
  'polyline',
  'radialGradient',
  'rect',
  'stop',
  'svg',
  'text',
  'tspan'
]

/**
 * Supported SVG attributes
 */

exports.attributes = [
  'cx',
  'cy',
  'd',
  'dx',
  'dy',
  'fill',
  'fillOpacity',
  'fontFamily',
  'fontSize',
  'fx',
  'fy',
  'gradientTransform',
  'gradientUnits',
  'markerEnd',
  'markerMid',
  'markerStart',
  'offset',
  'opacity',
  'patternContentUnits',
  'patternUnits',
  'points',
  'preserveAspectRatio',
  'r',
  'rx',
  'ry',
  'spreadMethod',
  'stopColor',
  'stopOpacity',
  'stroke',
  'strokeDasharray',
  'strokeLinecap',
  'strokeOpacity',
  'strokeWidth',
  'textAnchor',
  'transform',
  'version',
  'viewBox',
  'x1',
  'x2',
  'x',
  'y1',
  'y2',
  'y'
]

/**
 * Is element's namespace SVG?
 *
 * @param {String} name
 */

exports.isElement = function (name) {
  return indexOf(exports.elements, name) !== -1
}

/**
 * Are element's attributes SVG?
 *
 * @param {String} attr
 */

exports.isAttribute = function (attr) {
  return indexOf(exports.attributes, attr) !== -1
}


},{"fast.js/array/indexOf":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/fast.js/array/indexOf.js"}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/utils.js":[function(require,module,exports){
/**
 * The npm 'defaults' module but without clone because
 * it was requiring the 'Buffer' module which is huge.
 *
 * @param {Object} options
 * @param {Object} defaults
 *
 * @return {Object}
 */

exports.defaults = function(options, defaults) {
  Object.keys(defaults).forEach(function(key) {
    if (typeof options[key] === 'undefined') {
      options[key] = defaults[key]
    }
  })
  return options
}

},{}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/virtual.js":[function(require,module,exports){
/**
 * Module dependencies.
 */

var type = require('component-type')
var slice = require('sliced')
var flatten = require('array-flatten')

/**
 * This function lets us create virtual nodes using a simple
 * syntax. It is compatible with JSX transforms so you can use
 * JSX to write nodes that will compile to this function.
 *
 * let node = virtual('div', { id: 'foo' }, [
 *   virtual('a', { href: 'http://google.com' }, 'Google')
 * ])
 *
 * You can leave out the attributes or the children if either
 * of them aren't needed and it will figure out what you're
 * trying to do.
 */

module.exports = virtual

/**
 * Create virtual DOM trees.
 *
 * This creates the nicer API for the user.
 * It translates that friendly API into an actual tree of nodes.
 *
 * @param {String|Function} type
 * @param {Object} props
 * @param {Array} children
 * @return {Node}
 * @api public
 */

function virtual (type, props, children) {
  // Default to div with no args
  if (!type) {
    throw new Error('deku: Element needs a type. Read more: http://cl.ly/b0KZ')
  }

  // Skipped adding attributes and we're passing
  // in children instead.
  if (arguments.length === 2 && (typeof props === 'string' || Array.isArray(props))) {
    children = props
    props = {}
  }

  // Account for JSX putting the children as multiple arguments.
  // This is essentially just the ES6 rest param
  if (arguments.length > 2 && Array.isArray(arguments[2]) === false) {
    children = slice(arguments, 2)
  }

  children = children || []
  props = props || {}

  // passing in a single child, you can skip
  // using the array
  if (!Array.isArray(children)) {
    children = [ children ]
  }

  children = flatten(children, 1).reduce(normalize, [])

  // pull the key out from the data.
  var key = 'key' in props ? String(props.key) : null
  delete props['key']

  // if you pass in a function, it's a `Component` constructor.
  // otherwise it's an element.
  var node
  if (typeof type === 'string') {
    node = new ElementNode(type, props, key, children)
  } else {
    node = new ComponentNode(type, props, key, children)
  }

  // set the unique ID
  node.index = 0

  return node
}

/**
 * Parse nodes into real `Node` objects.
 *
 * @param {Mixed} node
 * @param {Integer} index
 * @return {Node}
 * @api private
 */

function normalize (acc, node) {
  if (node == null) {
    return acc
  }
  if (typeof node === 'string' || typeof node === 'number') {
    var newNode = new TextNode(String(node))
    newNode.index = acc.length
    acc.push(newNode)
  } else {
    node.index = acc.length
    acc.push(node)
  }
  return acc
}

/**
 * Initialize a new `ComponentNode`.
 *
 * @param {Component} component
 * @param {Object} props
 * @param {String} key Used for sorting/replacing during diffing.
 * @param {Array} children Child virtual nodes
 * @api public
 */

function ComponentNode (component, props, key, children) {
  this.key = key
  this.props = props
  this.type = 'component'
  this.component = component
  this.props.children = children || []
}

/**
 * Initialize a new `ElementNode`.
 *
 * @param {String} tagName
 * @param {Object} attributes
 * @param {String} key Used for sorting/replacing during diffing.
 * @param {Array} children Child virtual dom nodes.
 * @api public
 */

function ElementNode (tagName, attributes, key, children) {
  this.type = 'element'
  this.attributes = parseAttributes(attributes)
  this.tagName = tagName
  this.children = children || []
  this.key = key
}

/**
 * Initialize a new `TextNode`.
 *
 * This is just a virtual HTML text object.
 *
 * @param {String} text
 * @api public
 */

function TextNode (text) {
  this.type = 'text'
  this.data = String(text)
}

/**
 * Parse attributes for some special cases.
 *
 * TODO: This could be more functional and allow hooks
 * into the processing of the attributes at a component-level
 *
 * @param {Object} attributes
 *
 * @return {Object}
 */

function parseAttributes (attributes) {
  // style: { 'text-align': 'left' }
  if (attributes.style) {
    attributes.style = parseStyle(attributes.style)
  }

  // class: { foo: true, bar: false, baz: true }
  // class: ['foo', 'bar', 'baz']
  if (attributes.class) {
    attributes.class = parseClass(attributes.class)
  }

  // Remove attributes with false values
  var filteredAttributes = {}
  for (var key in attributes) {
    var value = attributes[key]
    if (value == null || value === false) continue
    filteredAttributes[key] = value
  }

  return filteredAttributes
}

/**
 * Parse a block of styles into a string.
 *
 * TODO: this could do a lot more with vendor prefixing,
 * number values etc. Maybe there's a way to allow users
 * to hook into this?
 *
 * @param {Object} styles
 *
 * @return {String}
 */

function parseStyle (styles) {
  if (type(styles) === 'string') {
    return styles
  }
  var str = ''
  for (var name in styles) {
    var value = styles[name]
    str = str + name + ':' + value + ';'
  }
  return str;
}

/**
 * Parse the class attribute so it's able to be
 * set in a more user-friendly way
 *
 * @param {String|Object|Array} value
 *
 * @return {String}
 */

function parseClass (value) {
  // { foo: true, bar: false, baz: true }
  if (type(value) === 'object') {
    var matched = []
    for (var key in value) {
      if (value[key]) matched.push(key)
    }
    value = matched
  }

  // ['foo', 'bar', 'baz']
  if (type(value) === 'array') {
    if (value.length === 0) {
      return
    }
    value = value.join(' ')
  }

  return value
}

},{"array-flatten":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/array-flatten/array-flatten.js","component-type":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/component-type/index.js","sliced":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/sliced/index.js"}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/array-flatten/array-flatten.js":[function(require,module,exports){
/**
 * Recursive flatten function with depth.
 *
 * @param  {Array}  array
 * @param  {Array}  result
 * @param  {Number} depth
 * @return {Array}
 */
function flattenDepth (array, result, depth) {
  for (var i = 0; i < array.length; i++) {
    var value = array[i]

    if (depth > 0 && Array.isArray(value)) {
      flattenDepth(value, result, depth - 1)
    } else {
      result.push(value)
    }
  }

  return result
}

/**
 * Recursive flatten function. Omitting depth is slightly faster.
 *
 * @param  {Array} array
 * @param  {Array} result
 * @return {Array}
 */
function flattenForever (array, result) {
  for (var i = 0; i < array.length; i++) {
    var value = array[i]

    if (Array.isArray(value)) {
      flattenForever(value, result)
    } else {
      result.push(value)
    }
  }

  return result
}

/**
 * Flatten an array, with the ability to define a depth.
 *
 * @param  {Array}  array
 * @param  {Number} depth
 * @return {Array}
 */
module.exports = function (array, depth) {
  if (depth == null) {
    return flattenForever(array, [])
  }

  return flattenDepth(array, [], depth)
}

},{}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/component-emitter/index.js":[function(require,module,exports){

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  function on() {
    this.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks['$' + event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks['$' + event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks['$' + event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks['$' + event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/component-raf/index.js":[function(require,module,exports){
/**
 * Expose `requestAnimationFrame()`.
 */

exports = module.exports = window.requestAnimationFrame
  || window.webkitRequestAnimationFrame
  || window.mozRequestAnimationFrame
  || fallback;

/**
 * Fallback implementation.
 */

var prev = new Date().getTime();
function fallback(fn) {
  var curr = new Date().getTime();
  var ms = Math.max(0, 16 - (curr - prev));
  var req = setTimeout(fn, ms);
  prev = curr;
  return req;
}

/**
 * Cancel.
 */

var cancel = window.cancelAnimationFrame
  || window.webkitCancelAnimationFrame
  || window.mozCancelAnimationFrame
  || window.clearTimeout;

exports.cancel = function(id){
  cancel.call(window, id);
};

},{}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/component-type/index.js":[function(require,module,exports){
/**
 * toString ref.
 */

var toString = Object.prototype.toString;

/**
 * Return the type of `val`.
 *
 * @param {Mixed} val
 * @return {String}
 * @api public
 */

module.exports = function(val){
  switch (toString.call(val)) {
    case '[object Date]': return 'date';
    case '[object RegExp]': return 'regexp';
    case '[object Arguments]': return 'arguments';
    case '[object Array]': return 'array';
    case '[object Error]': return 'error';
  }

  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (val !== val) return 'nan';
  if (val && val.nodeType === 1) return 'element';

  val = val.valueOf
    ? val.valueOf()
    : Object.prototype.valueOf.apply(val)

  return typeof val;
};

},{}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/dom-pool/Pool.js":[function(require,module,exports){
function Pool(params) {
    if (typeof params !== 'object') {
        throw new Error("Please pass parameters. Example -> new Pool({ tagName: \"div\" })");
    }

    if (typeof params.tagName !== 'string') {
        throw new Error("Please specify a tagName. Example -> new Pool({ tagName: \"div\" })");
    }

    this.storage = [];
    this.tagName = params.tagName.toLowerCase();
    this.namespace = params.namespace;
}

Pool.prototype.push = function(el) {
    if (el.tagName.toLowerCase() !== this.tagName) {
        return;
    }
    
    this.storage.push(el);
};

Pool.prototype.pop = function(argument) {
    if (this.storage.length === 0) {
        return this.create();
    } else {
        return this.storage.pop();
    }
};

Pool.prototype.create = function() {
    if (this.namespace) {
        return document.createElementNS(this.namespace, this.tagName);
    } else {
        return document.createElement(this.tagName);
    }
};

Pool.prototype.allocate = function(size) {
    if (this.storage.length >= size) {
        return;
    }

    var difference = size - this.storage.length;
    for (var poolAllocIter = 0; poolAllocIter < difference; poolAllocIter++) {
        this.storage.push(this.create());
    }
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = Pool;
}

},{}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/dom-walk/index.js":[function(require,module,exports){
var slice = Array.prototype.slice

module.exports = iterativelyWalk

function iterativelyWalk(nodes, cb) {
    if (!('length' in nodes)) {
        nodes = [nodes]
    }
    
    nodes = slice.call(nodes)

    while(nodes.length) {
        var node = nodes.shift(),
            ret = cb(node)

        if (ret) {
            return ret
        }

        if (node.childNodes && node.childNodes.length) {
            nodes = slice.call(node.childNodes).concat(nodes)
        }
    }
}

},{}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/fast.js/array/forEach.js":[function(require,module,exports){
'use strict';

var bindInternal3 = require('../function/bindInternal3');

/**
 * # For Each
 *
 * A fast `.forEach()` implementation.
 *
 * @param  {Array}    subject     The array (or array-like) to iterate over.
 * @param  {Function} fn          The visitor function.
 * @param  {Object}   thisContext The context for the visitor.
 */
module.exports = function fastForEach (subject, fn, thisContext) {
  var length = subject.length,
      iterator = thisContext !== undefined ? bindInternal3(fn, thisContext) : fn,
      i;
  for (i = 0; i < length; i++) {
    iterator(subject[i], i, subject);
  }
};

},{"../function/bindInternal3":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/fast.js/function/bindInternal3.js"}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/fast.js/array/indexOf.js":[function(require,module,exports){
'use strict';

/**
 * # Index Of
 *
 * A faster `Array.prototype.indexOf()` implementation.
 *
 * @param  {Array}  subject   The array (or array-like) to search within.
 * @param  {mixed}  target    The target item to search for.
 * @param  {Number} fromIndex The position to start searching from, if known.
 * @return {Number}           The position of the target in the subject, or -1 if it does not exist.
 */
module.exports = function fastIndexOf (subject, target, fromIndex) {
  var length = subject.length,
      i = 0;

  if (typeof fromIndex === 'number') {
    i = fromIndex;
    if (i < 0) {
      i += length;
      if (i < 0) {
        i = 0;
      }
    }
  }

  for (; i < length; i++) {
    if (subject[i] === target) {
      return i;
    }
  }
  return -1;
};

},{}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/fast.js/array/reduce.js":[function(require,module,exports){
'use strict';

var bindInternal4 = require('../function/bindInternal4');

/**
 * # Reduce
 *
 * A fast `.reduce()` implementation.
 *
 * @param  {Array}    subject      The array (or array-like) to reduce.
 * @param  {Function} fn           The reducer function.
 * @param  {mixed}    initialValue The initial value for the reducer, defaults to subject[0].
 * @param  {Object}   thisContext  The context for the reducer.
 * @return {mixed}                 The final result.
 */
module.exports = function fastReduce (subject, fn, initialValue, thisContext) {
  var length = subject.length,
      iterator = thisContext !== undefined ? bindInternal4(fn, thisContext) : fn,
      i, result;

  if (initialValue === undefined) {
    i = 1;
    result = subject[0];
  }
  else {
    i = 0;
    result = initialValue;
  }

  for (; i < length; i++) {
    result = iterator(result, subject[i], i, subject);
  }

  return result;
};

},{"../function/bindInternal4":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/fast.js/function/bindInternal4.js"}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/fast.js/forEach.js":[function(require,module,exports){
'use strict';

var forEachArray = require('./array/forEach'),
    forEachObject = require('./object/forEach');

/**
 * # ForEach
 *
 * A fast `.forEach()` implementation.
 *
 * @param  {Array|Object} subject     The array or object to iterate over.
 * @param  {Function}     fn          The visitor function.
 * @param  {Object}       thisContext The context for the visitor.
 */
module.exports = function fastForEach (subject, fn, thisContext) {
  if (subject instanceof Array) {
    return forEachArray(subject, fn, thisContext);
  }
  else {
    return forEachObject(subject, fn, thisContext);
  }
};
},{"./array/forEach":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/fast.js/array/forEach.js","./object/forEach":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/fast.js/object/forEach.js"}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/fast.js/function/bindInternal3.js":[function(require,module,exports){
'use strict';

/**
 * Internal helper to bind a function known to have 3 arguments
 * to a given context.
 */
module.exports = function bindInternal3 (func, thisContext) {
  return function (a, b, c) {
    return func.call(thisContext, a, b, c);
  };
};

},{}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/fast.js/function/bindInternal4.js":[function(require,module,exports){
'use strict';

/**
 * Internal helper to bind a function known to have 4 arguments
 * to a given context.
 */
module.exports = function bindInternal4 (func, thisContext) {
  return function (a, b, c, d) {
    return func.call(thisContext, a, b, c, d);
  };
};

},{}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/fast.js/object/assign.js":[function(require,module,exports){
'use strict';

/**
 * Analogue of Object.assign().
 * Copies properties from one or more source objects to
 * a target object. Existing keys on the target object will be overwritten.
 *
 * > Note: This differs from spec in some important ways:
 * > 1. Will throw if passed non-objects, including `undefined` or `null` values.
 * > 2. Does not support the curious Exception handling behavior, exceptions are thrown immediately.
 * > For more details, see:
 * > https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
 *
 *
 *
 * @param  {Object} target      The target object to copy properties to.
 * @param  {Object} source, ... The source(s) to copy properties from.
 * @return {Object}             The updated target object.
 */
module.exports = function fastAssign (target) {
  var totalArgs = arguments.length,
      source, i, totalKeys, keys, key, j;

  for (i = 1; i < totalArgs; i++) {
    source = arguments[i];
    keys = Object.keys(source);
    totalKeys = keys.length;
    for (j = 0; j < totalKeys; j++) {
      key = keys[j];
      target[key] = source[key];
    }
  }
  return target;
};

},{}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/fast.js/object/forEach.js":[function(require,module,exports){
'use strict';

var bindInternal3 = require('../function/bindInternal3');

/**
 * # For Each
 *
 * A fast object `.forEach()` implementation.
 *
 * @param  {Object}   subject     The object to iterate over.
 * @param  {Function} fn          The visitor function.
 * @param  {Object}   thisContext The context for the visitor.
 */
module.exports = function fastForEachObject (subject, fn, thisContext) {
  var keys = Object.keys(subject),
      length = keys.length,
      iterator = thisContext !== undefined ? bindInternal3(fn, thisContext) : fn,
      key, i;
  for (i = 0; i < length; i++) {
    key = keys[i];
    iterator(subject[key], key, subject);
  }
};

},{"../function/bindInternal3":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/fast.js/function/bindInternal3.js"}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/fast.js/object/reduce.js":[function(require,module,exports){
'use strict';

var bindInternal4 = require('../function/bindInternal4');

/**
 * # Reduce
 *
 * A fast object `.reduce()` implementation.
 *
 * @param  {Object}   subject      The object to reduce over.
 * @param  {Function} fn           The reducer function.
 * @param  {mixed}    initialValue The initial value for the reducer, defaults to subject[0].
 * @param  {Object}   thisContext  The context for the reducer.
 * @return {mixed}                 The final result.
 */
module.exports = function fastReduceObject (subject, fn, initialValue, thisContext) {
  var keys = Object.keys(subject),
      length = keys.length,
      iterator = thisContext !== undefined ? bindInternal4(fn, thisContext) : fn,
      i, key, result;

  if (initialValue === undefined) {
    i = 1;
    result = subject[keys[0]];
  }
  else {
    i = 0;
    result = initialValue;
  }

  for (; i < length; i++) {
    key = keys[i];
    result = iterator(result, subject[key], key, subject);
  }

  return result;
};

},{"../function/bindInternal4":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/fast.js/function/bindInternal4.js"}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/fast.js/reduce.js":[function(require,module,exports){
'use strict';

var reduceArray = require('./array/reduce'),
    reduceObject = require('./object/reduce');

/**
 * # Reduce
 *
 * A fast `.reduce()` implementation.
 *
 * @param  {Array|Object} subject      The array or object to reduce over.
 * @param  {Function}     fn           The reducer function.
 * @param  {mixed}        initialValue The initial value for the reducer, defaults to subject[0].
 * @param  {Object}       thisContext  The context for the reducer.
 * @return {Array|Object}              The array or object containing the results.
 */
module.exports = function fastReduce (subject, fn, initialValue, thisContext) {
  if (subject instanceof Array) {
    return reduceArray(subject, fn, initialValue, thisContext);
  }
  else {
    return reduceObject(subject, fn, initialValue, thisContext);
  }
};
},{"./array/reduce":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/fast.js/array/reduce.js","./object/reduce":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/fast.js/object/reduce.js"}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/get-uid/index.js":[function(require,module,exports){
/** generate unique id for selector */
var counter = Date.now() % 1e9;

module.exports = function getUid(){
	return (Math.random() * 1e9 >>> 0) + (counter++);
};
},{}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/is-dom/index.js":[function(require,module,exports){
/*global window*/

/**
 * Check if object is dom node.
 *
 * @param {Object} val
 * @return {Boolean}
 * @api public
 */

module.exports = function isNode(val){
  if (!val || typeof val !== 'object') return false;
  if (window && 'object' == typeof window.Node) return val instanceof window.Node;
  return 'number' == typeof val.nodeType && 'string' == typeof val.nodeName;
}

},{}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/is-promise/index.js":[function(require,module,exports){
module.exports = isPromise;

function isPromise(obj) {
  return obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}

},{}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/object-path/index.js":[function(require,module,exports){
(function (root, factory){
  'use strict';

  /*istanbul ignore next:cant test*/
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else {
    // Browser globals
    root.objectPath = factory();
  }
})(this, function(){
  'use strict';

  var
    toStr = Object.prototype.toString,
    _hasOwnProperty = Object.prototype.hasOwnProperty;

  function isEmpty(value){
    if (!value) {
      return true;
    }
    if (isArray(value) && value.length === 0) {
      return true;
    } else {
      for (var i in value) {
        if (_hasOwnProperty.call(value, i)) {
          return false;
        }
      }
      return true;
    }
  }

  function toString(type){
    return toStr.call(type);
  }

  function isNumber(value){
    return typeof value === 'number' || toString(value) === "[object Number]";
  }

  function isString(obj){
    return typeof obj === 'string' || toString(obj) === "[object String]";
  }

  function isObject(obj){
    return typeof obj === 'object' && toString(obj) === "[object Object]";
  }

  function isArray(obj){
    return typeof obj === 'object' && typeof obj.length === 'number' && toString(obj) === '[object Array]';
  }

  function isBoolean(obj){
    return typeof obj === 'boolean' || toString(obj) === '[object Boolean]';
  }

  function getKey(key){
    var intKey = parseInt(key);
    if (intKey.toString() === key) {
      return intKey;
    }
    return key;
  }

  function set(obj, path, value, doNotReplace){
    if (isNumber(path)) {
      path = [path];
    }
    if (isEmpty(path)) {
      return obj;
    }
    if (isString(path)) {
      return set(obj, path.split('.').map(getKey), value, doNotReplace);
    }
    var currentPath = path[0];

    if (path.length === 1) {
      var oldVal = obj[currentPath];
      if (oldVal === void 0 || !doNotReplace) {
        obj[currentPath] = value;
      }
      return oldVal;
    }

    if (obj[currentPath] === void 0) {
      //check if we assume an array
      if(isNumber(path[1])) {
        obj[currentPath] = [];
      } else {
        obj[currentPath] = {};
      }
    }

    return set(obj[currentPath], path.slice(1), value, doNotReplace);
  }

  function del(obj, path) {
    if (isNumber(path)) {
      path = [path];
    }

    if (isEmpty(obj)) {
      return void 0;
    }

    if (isEmpty(path)) {
      return obj;
    }
    if(isString(path)) {
      return del(obj, path.split('.'));
    }

    var currentPath = getKey(path[0]);
    var oldVal = obj[currentPath];

    if(path.length === 1) {
      if (oldVal !== void 0) {
        if (isArray(obj)) {
          obj.splice(currentPath, 1);
        } else {
          delete obj[currentPath];
        }
      }
    } else {
      if (obj[currentPath] !== void 0) {
        return del(obj[currentPath], path.slice(1));
      }
    }

    return obj;
  }

  var objectPath = {};

  objectPath.has = function (obj, path) {
    if (isEmpty(obj)) {
      return false;
    }

    if (isNumber(path)) {
      path = [path];
    } else if (isString(path)) {
      path = path.split('.');
    }

    if (isEmpty(path) || path.length === 0) {
      return false;
    }

    for (var i = 0; i < path.length; i++) {
      var j = path[i];
      if ((isObject(obj) || isArray(obj)) && _hasOwnProperty.call(obj, j)) {
        obj = obj[j];
      } else {
        return false;
      }
    }

    return true;
  };

  objectPath.ensureExists = function (obj, path, value){
    return set(obj, path, value, true);
  };

  objectPath.set = function (obj, path, value, doNotReplace){
    return set(obj, path, value, doNotReplace);
  };

  objectPath.insert = function (obj, path, value, at){
    var arr = objectPath.get(obj, path);
    at = ~~at;
    if (!isArray(arr)) {
      arr = [];
      objectPath.set(obj, path, arr);
    }
    arr.splice(at, 0, value);
  };

  objectPath.empty = function(obj, path) {
    if (isEmpty(path)) {
      return obj;
    }
    if (isEmpty(obj)) {
      return void 0;
    }

    var value, i;
    if (!(value = objectPath.get(obj, path))) {
      return obj;
    }

    if (isString(value)) {
      return objectPath.set(obj, path, '');
    } else if (isBoolean(value)) {
      return objectPath.set(obj, path, false);
    } else if (isNumber(value)) {
      return objectPath.set(obj, path, 0);
    } else if (isArray(value)) {
      value.length = 0;
    } else if (isObject(value)) {
      for (i in value) {
        if (_hasOwnProperty.call(value, i)) {
          delete value[i];
        }
      }
    } else {
      return objectPath.set(obj, path, null);
    }
  };

  objectPath.push = function (obj, path /*, values */){
    var arr = objectPath.get(obj, path);
    if (!isArray(arr)) {
      arr = [];
      objectPath.set(obj, path, arr);
    }

    arr.push.apply(arr, Array.prototype.slice.call(arguments, 2));
  };

  objectPath.coalesce = function (obj, paths, defaultValue) {
    var value;

    for (var i = 0, len = paths.length; i < len; i++) {
      if ((value = objectPath.get(obj, paths[i])) !== void 0) {
        return value;
      }
    }

    return defaultValue;
  };

  objectPath.get = function (obj, path, defaultValue){
    if (isNumber(path)) {
      path = [path];
    }
    if (isEmpty(path)) {
      return obj;
    }
    if (isEmpty(obj)) {
      return defaultValue;
    }
    if (isString(path)) {
      return objectPath.get(obj, path.split('.'), defaultValue);
    }

    var currentPath = getKey(path[0]);

    if (path.length === 1) {
      if (obj[currentPath] === void 0) {
        return defaultValue;
      }
      return obj[currentPath];
    }

    return objectPath.get(obj[currentPath], path.slice(1), defaultValue);
  };

  objectPath.del = function(obj, path) {
    return del(obj, path);
  };

  return objectPath;
});

},{}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/sliced/index.js":[function(require,module,exports){
module.exports = exports = require('./lib/sliced');

},{"./lib/sliced":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/sliced/lib/sliced.js"}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/node_modules/sliced/lib/sliced.js":[function(require,module,exports){

/**
 * An Array.prototype.slice.call(arguments) alternative
 *
 * @param {Object} args something with a length
 * @param {Number} slice
 * @param {Number} sliceEnd
 * @api public
 */

module.exports = function (args, slice, sliceEnd) {
  var ret = [];
  var len = args.length;

  if (0 === len) return ret;

  var start = slice < 0
    ? Math.max(0, slice + len)
    : slice || 0;

  if (sliceEnd !== undefined) {
    len = sliceEnd < 0
      ? sliceEnd + len
      : sliceEnd
  }

  while (len-- > start) {
    ret[len - start] = args[len];
  }

  return ret;
}


},{}],"/home/donnees/workspaces/food-n-stuff/src/app/components/form/index.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _deku = require('deku');

var _modulesGeolocation = require('../../modules/geolocation');

var _map = require('../map');

var id = '1BHnaan3YfSDq9_LzjthDXjj5dzJZANjLSb8JHPl5';

// Query variables
var lat = undefined;
var lng = undefined;
var radius = 300;

(0, _modulesGeolocation.getCoords)().then(function (coords) {
    lat = coords.lat;
    lng = coords.lng;
    getSpecials();
});

function render(component) {
    return (0, _deku.element)(
        'form',
        null,
        (0, _deku.element)('input', {
            onInput: changeRadiusRange,
            name: 'radius-range',
            'class': 'mdl-slider mdl-js-slider',
            type: 'range',
            step: '100',
            min: '100',
            max: '5000',
            value: radius
        }),
        (0, _deku.element)('input', {
            onInput: changeRadiusInput,
            name: 'radius-number',
            type: 'number',
            step: '50',
            min: '100',
            max: '5000',
            value: radius
        }),
        (0, _deku.element)(
            'label',
            null,
            ' Food:',
            (0, _deku.element)('input', {
                name: 'food',
                type: 'checkbox',
                checked: true
            })
        ),
        (0, _deku.element)(
            'label',
            null,
            ' Drink:',
            (0, _deku.element)('input', {
                name: 'food',
                type: 'checkbox',
                checked: true
            })
        )
    );
}

var el = undefined;
function afterRender(component, _el) {
    el = _el;
}

function getSpecials() {
    var query = {
        select: 'address',
        from: id,
        where: 'ST_INTERSECTS(address,\n            CIRCLE(LATLNG(' + lat + ', ' + lng + '), ' + radius + '))\n        '
    };
    (0, _map.updateMap)(lat, lng, radius, query);
}

/* Events */
function changeRadiusRange(e) {
    radius = e.delegateTarget.valueAsNumber;
    el.querySelector('[name=radius-number]').value = radius;

    getSpecials();
}

function changeRadiusInput(e) {
    radius = e.delegateTarget.valueAsNumber;
    el.querySelector('[name=radius-range]').value = radius;

    getSpecials();
}

function markerDragged(e) {
    lat = e.latLng.lat();
    lng = e.latLng.lng();
    getSpecials();
}

exports.markerDragged = markerDragged;
exports['default'] = { render: render, afterRender: afterRender };

},{"../../modules/geolocation":"/home/donnees/workspaces/food-n-stuff/src/app/modules/geolocation/index.js","../map":"/home/donnees/workspaces/food-n-stuff/src/app/components/map/index.js","deku":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/index.js"}],"/home/donnees/workspaces/food-n-stuff/src/app/components/map/index.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _deku = require('deku');

var _modulesGeolocation = require('../../modules/geolocation');

var _form = require('../form');

var id = '1BHnaan3YfSDq9_LzjthDXjj5dzJZANjLSb8JHPl5';

function render(component) {
    var props = component.props;
    var state = component.state;

    return (0, _deku.element)('div', { 'class': 'map' });
}

var map = undefined;
function afterMount(component, el, setState) {
    map = getMap(el);
}

function getMap(el) {
    return new Promise(function (resolve) {
        if (el) {
            (0, _modulesGeolocation.getCoords)().then(function (coords) {
                map = new google.maps.Map(el, {
                    center: { lat: coords.lat, lng: coords.lng },
                    zoom: 16
                });

                resolve(map);
            });
        } else {
            resolve(map);
        }
    });
}

var fusionTablesLayer = undefined;
var posMarker = undefined;
var circleLayer = undefined;
function updateMap(lat, lng, radius, query) {
    getMap().then(function (map) {
        if (!fusionTablesLayer) {
            fusionTablesLayer = new google.maps.FusionTablesLayer({
                map: map
            });

            posMarker = new google.maps.Marker({
                map: map,
                clickable: false,
                draggable: true,
                animation: google.maps.Animation.DROP
            });
            posMarker.addListener('dragend', _form.markerDragged);

            circleLayer = new google.maps.Circle({
                map: map,
                strokeColor: '#3f51b5',
                strokeWeight: 2,
                fillColor: '#3f51b5',
                fillOpacity: .35,
                clickable: false
            });
        }
        fusionTablesLayer.setQuery(query);

        posMarker.setPosition(new google.maps.LatLng(lat, lng));

        circleLayer.setCenter(new google.maps.LatLng(lat, lng));
        circleLayer.setRadius(radius);

        map.fitBounds(circleLayer.getBounds());
    });
}

exports.updateMap = updateMap;
exports['default'] = { render: render, afterMount: afterMount };

},{"../../modules/geolocation":"/home/donnees/workspaces/food-n-stuff/src/app/modules/geolocation/index.js","../form":"/home/donnees/workspaces/food-n-stuff/src/app/components/form/index.js","deku":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/index.js"}],"/home/donnees/workspaces/food-n-stuff/src/app/index.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _componentsMap = require('./components/map');

var _componentsMap2 = _interopRequireDefault(_componentsMap);

var _componentsForm = require('./components/form');

var _componentsForm2 = _interopRequireDefault(_componentsForm);

var _deku = require('deku');

function render(component) {
    return (0, _deku.element)(
        'div',
        { 'class': 'app' },
        (0, _deku.element)(_componentsForm2['default'], null),
        (0, _deku.element)(_componentsMap2['default'], null)
    );
}

exports['default'] = { render: render };
module.exports = exports['default'];

},{"./components/form":"/home/donnees/workspaces/food-n-stuff/src/app/components/form/index.js","./components/map":"/home/donnees/workspaces/food-n-stuff/src/app/components/map/index.js","deku":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/index.js"}],"/home/donnees/workspaces/food-n-stuff/src/app/modules/geolocation/index.js":[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
function getCoords() {
    return new Promise(function (resolve) {
        navigator.geolocation.getCurrentPosition(function (geo) {
            var _geo$coords = geo.coords;
            var latitude = _geo$coords.latitude;
            var longitude = _geo$coords.longitude;

            resolve({ lat: latitude, lng: longitude });
        });
    });
}

exports.getCoords = getCoords;

},{}],"/home/donnees/workspaces/food-n-stuff/src/index.js":[function(require,module,exports){
'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _app = require('./app');

var _app2 = _interopRequireDefault(_app);

var _deku = require('deku');

// Create the app
var app = (0, _deku.tree)((0, _deku.element)(_app2['default'], null));

// Render into the DOM
(0, _deku.render)(app, document.querySelector('main'));

},{"./app":"/home/donnees/workspaces/food-n-stuff/src/app/index.js","deku":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/index.js"}]},{},["/home/donnees/workspaces/food-n-stuff/src/index.js"])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvZGVrdS9saWIvYXBwbGljYXRpb24uanMiLCJub2RlX21vZHVsZXMvZGVrdS9saWIvZXZlbnRzLmpzIiwibm9kZV9tb2R1bGVzL2Rla3UvbGliL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Rla3UvbGliL3JlbmRlci5qcyIsIm5vZGVfbW9kdWxlcy9kZWt1L2xpYi9zdHJpbmdpZnkuanMiLCJub2RlX21vZHVsZXMvZGVrdS9saWIvc3ZnLmpzIiwibm9kZV9tb2R1bGVzL2Rla3UvbGliL3V0aWxzLmpzIiwibm9kZV9tb2R1bGVzL2Rla3UvbGliL3ZpcnR1YWwuanMiLCJub2RlX21vZHVsZXMvZGVrdS9ub2RlX21vZHVsZXMvYXJyYXktZmxhdHRlbi9hcnJheS1mbGF0dGVuLmpzIiwibm9kZV9tb2R1bGVzL2Rla3Uvbm9kZV9tb2R1bGVzL2NvbXBvbmVudC1lbWl0dGVyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Rla3Uvbm9kZV9tb2R1bGVzL2NvbXBvbmVudC1yYWYvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZGVrdS9ub2RlX21vZHVsZXMvY29tcG9uZW50LXR5cGUvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZGVrdS9ub2RlX21vZHVsZXMvZG9tLXBvb2wvUG9vbC5qcyIsIm5vZGVfbW9kdWxlcy9kZWt1L25vZGVfbW9kdWxlcy9kb20td2Fsay9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kZWt1L25vZGVfbW9kdWxlcy9mYXN0LmpzL2FycmF5L2ZvckVhY2guanMiLCJub2RlX21vZHVsZXMvZGVrdS9ub2RlX21vZHVsZXMvZmFzdC5qcy9hcnJheS9pbmRleE9mLmpzIiwibm9kZV9tb2R1bGVzL2Rla3Uvbm9kZV9tb2R1bGVzL2Zhc3QuanMvYXJyYXkvcmVkdWNlLmpzIiwibm9kZV9tb2R1bGVzL2Rla3Uvbm9kZV9tb2R1bGVzL2Zhc3QuanMvZm9yRWFjaC5qcyIsIm5vZGVfbW9kdWxlcy9kZWt1L25vZGVfbW9kdWxlcy9mYXN0LmpzL2Z1bmN0aW9uL2JpbmRJbnRlcm5hbDMuanMiLCJub2RlX21vZHVsZXMvZGVrdS9ub2RlX21vZHVsZXMvZmFzdC5qcy9mdW5jdGlvbi9iaW5kSW50ZXJuYWw0LmpzIiwibm9kZV9tb2R1bGVzL2Rla3Uvbm9kZV9tb2R1bGVzL2Zhc3QuanMvb2JqZWN0L2Fzc2lnbi5qcyIsIm5vZGVfbW9kdWxlcy9kZWt1L25vZGVfbW9kdWxlcy9mYXN0LmpzL29iamVjdC9mb3JFYWNoLmpzIiwibm9kZV9tb2R1bGVzL2Rla3Uvbm9kZV9tb2R1bGVzL2Zhc3QuanMvb2JqZWN0L3JlZHVjZS5qcyIsIm5vZGVfbW9kdWxlcy9kZWt1L25vZGVfbW9kdWxlcy9mYXN0LmpzL3JlZHVjZS5qcyIsIm5vZGVfbW9kdWxlcy9kZWt1L25vZGVfbW9kdWxlcy9nZXQtdWlkL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Rla3Uvbm9kZV9tb2R1bGVzL2lzLWRvbS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kZWt1L25vZGVfbW9kdWxlcy9pcy1wcm9taXNlL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Rla3Uvbm9kZV9tb2R1bGVzL29iamVjdC1wYXRoL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Rla3Uvbm9kZV9tb2R1bGVzL3NsaWNlZC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kZWt1L25vZGVfbW9kdWxlcy9zbGljZWQvbGliL3NsaWNlZC5qcyIsIi9ob21lL2Rvbm5lZXMvd29ya3NwYWNlcy9mb29kLW4tc3R1ZmYvc3JjL2FwcC9jb21wb25lbnRzL2Zvcm0vaW5kZXguanMiLCIvaG9tZS9kb25uZWVzL3dvcmtzcGFjZXMvZm9vZC1uLXN0dWZmL3NyYy9hcHAvY29tcG9uZW50cy9tYXAvaW5kZXguanMiLCIvaG9tZS9kb25uZWVzL3dvcmtzcGFjZXMvZm9vZC1uLXN0dWZmL3NyYy9hcHAvaW5kZXguanMiLCIvaG9tZS9kb25uZWVzL3dvcmtzcGFjZXMvZm9vZC1uLXN0dWZmL3NyYy9hcHAvbW9kdWxlcy9nZW9sb2NhdGlvbi9pbmRleC5qcyIsIi9ob21lL2Rvbm5lZXMvd29ya3NwYWNlcy9mb29kLW4tc3R1ZmYvc3JjL2luZGV4LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3Y1Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ25DQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1FBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7Ozs7O29CQ2pDd0IsTUFBTTs7a0NBQ0osMkJBQTJCOzttQkFDM0IsUUFBUTs7QUFFbEMsSUFBTSxFQUFFLEdBQUcsMkNBQTJDLENBQUE7OztBQUl0RCxJQUFJLEdBQUcsWUFBQSxDQUFBO0FBQ1AsSUFBSSxHQUFHLFlBQUEsQ0FBQTtBQUNQLElBQUksTUFBTSxHQUFHLEdBQUcsQ0FBQTs7QUFFaEIsd0JBWFMsU0FBUyxHQVdQLENBQUMsSUFBSSxDQUFDLFVBQUMsTUFBTSxFQUFLO0FBQ3pCLE9BQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFBO0FBQ2hCLE9BQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFBO0FBQ2hCLGVBQVcsRUFBRSxDQUFBO0NBQ2hCLENBQUMsQ0FBQTs7QUFFRixTQUFTLE1BQU0sQ0FBQyxTQUFTLEVBQUU7QUFDdkIsV0FDSSxVQXBCQyxPQUFPOzs7UUFxQkosVUFyQkgsT0FBTztBQXNCQSxtQkFBTyxFQUFFLGlCQUFpQixBQUFDO0FBQzNCLGdCQUFJLEVBQUMsY0FBYztBQUNuQixxQkFBTSwwQkFBMEI7QUFDaEMsZ0JBQUksRUFBQyxPQUFPO0FBQ1osZ0JBQUksRUFBQyxLQUFLO0FBQ1YsZUFBRyxFQUFDLEtBQUs7QUFDVCxlQUFHLEVBQUMsTUFBTTtBQUNWLGlCQUFLLEVBQUUsTUFBTSxBQUFDO1VBQ2hCO1FBQ0YsVUEvQkgsT0FBTztBQWdDQSxtQkFBTyxFQUFFLGlCQUFpQixBQUFDO0FBQzNCLGdCQUFJLEVBQUMsZUFBZTtBQUNwQixnQkFBSSxFQUFDLFFBQVE7QUFDYixnQkFBSSxFQUFDLElBQUk7QUFDVCxlQUFHLEVBQUMsS0FBSztBQUNULGVBQUcsRUFBQyxNQUFNO0FBQ1YsaUJBQUssRUFBRSxNQUFNLEFBQUM7VUFDaEI7UUFDRixVQXhDSCxPQUFPOzs7O1lBeUNBLFVBekNQLE9BQU87QUEwQ0ksb0JBQUksRUFBQyxNQUFNO0FBQ1gsb0JBQUksRUFBQyxVQUFVO0FBQ2YsdUJBQU8sTUFBQTtjQUNUO1NBQ0U7UUFDUixVQS9DSCxPQUFPOzs7O1lBZ0RBLFVBaERQLE9BQU87QUFpREksb0JBQUksRUFBQyxNQUFNO0FBQ1gsb0JBQUksRUFBQyxVQUFVO0FBQ2YsdUJBQU8sTUFBQTtjQUNUO1NBQ0U7S0FDTCxDQUNWO0NBQ0o7O0FBRUQsSUFBSSxFQUFFLFlBQUEsQ0FBQTtBQUNOLFNBQVMsV0FBVyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7QUFDakMsTUFBRSxHQUFHLEdBQUcsQ0FBQTtDQUNYOztBQUVELFNBQVMsV0FBVyxHQUFHO0FBQ25CLFFBQUksS0FBSyxHQUFHO0FBQ1IsY0FBTSxFQUFFLFNBQVM7QUFDakIsWUFBSSxFQUFFLEVBQUU7QUFDUixhQUFLLHlEQUNlLEdBQUcsVUFBSyxHQUFHLFdBQU0sTUFBTSxpQkFDMUM7S0FDSixDQUFBO0FBQ0QsYUFyRUssU0FBUyxFQXFFSixHQUFHLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQTtDQUNyQzs7O0FBSUQsU0FBUyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUU7QUFDMUIsVUFBTSxHQUFHLENBQUMsQ0FBQyxjQUFjLENBQUMsYUFBYSxDQUFBO0FBQ3ZDLE1BQUUsQ0FBQyxhQUFhLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFBOztBQUV2RCxlQUFXLEVBQUUsQ0FBQTtDQUNoQjs7QUFFRCxTQUFTLGlCQUFpQixDQUFDLENBQUMsRUFBRTtBQUMxQixVQUFNLEdBQUcsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUE7QUFDdkMsTUFBRSxDQUFDLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUE7O0FBRXRELGVBQVcsRUFBRSxDQUFBO0NBQ2hCOztBQUVELFNBQVMsYUFBYSxDQUFDLENBQUMsRUFBRTtBQUN0QixPQUFHLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQTtBQUNwQixPQUFHLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQTtBQUNwQixlQUFXLEVBQUUsQ0FBQTtDQUNoQjs7UUFHUSxhQUFhLEdBQWIsYUFBYTtxQkFDUCxFQUFFLE1BQU0sRUFBTixNQUFNLEVBQUUsV0FBVyxFQUFYLFdBQVcsRUFBRTs7Ozs7Ozs7O29CQ2xHZCxNQUFNOztrQ0FDSiwyQkFBMkI7O29CQUN2QixTQUFTOztBQUV2QyxJQUFNLEVBQUUsR0FBRywyQ0FBMkMsQ0FBQTs7QUFFdEQsU0FBUyxNQUFNLENBQUMsU0FBUyxFQUFFO1FBQ2pCLEtBQUssR0FBWSxTQUFTLENBQTFCLEtBQUs7UUFBRSxLQUFLLEdBQUssU0FBUyxDQUFuQixLQUFLOztBQUNsQixXQUFPLFVBUkYsT0FBTyxXQVFBLFNBQU0sS0FBSyxHQUFPLENBQUE7Q0FDakM7O0FBRUQsSUFBSSxHQUFHLFlBQUEsQ0FBQTtBQUNQLFNBQVMsVUFBVSxDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFO0FBQ3pDLE9BQUcsR0FBRyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7Q0FDbkI7O0FBRUQsU0FBUyxNQUFNLENBQUMsRUFBRSxFQUFFO0FBQ2hCLFdBQU8sSUFBSSxPQUFPLENBQUMsVUFBQyxPQUFPLEVBQUs7QUFDNUIsWUFBSSxFQUFFLEVBQUU7QUFDSixvQ0FsQkgsU0FBUyxHQWtCSyxDQUFDLElBQUksQ0FBQyxVQUFDLE1BQU0sRUFBSztBQUN6QixtQkFBRyxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFO0FBQzFCLDBCQUFNLEVBQUUsRUFBRSxHQUFHLEVBQUUsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsTUFBTSxDQUFDLEdBQUcsRUFBRTtBQUM1Qyx3QkFBSSxFQUFFLEVBQUU7aUJBQ1gsQ0FBQyxDQUFBOztBQUVGLHVCQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7YUFDZixDQUFDLENBQUE7U0FDTCxNQUFNO0FBQ0gsbUJBQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtTQUNmO0tBQ0osQ0FBQyxDQUFBO0NBQ0w7O0FBRUQsSUFBSSxpQkFBaUIsWUFBQSxDQUFBO0FBQ3JCLElBQUksU0FBUyxZQUFBLENBQUE7QUFDYixJQUFJLFdBQVcsWUFBQSxDQUFBO0FBQ2YsU0FBUyxTQUFTLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFO0FBQ3hDLFVBQU0sRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFDLEdBQUcsRUFBSztBQUNuQixZQUFJLENBQUMsaUJBQWlCLEVBQUU7QUFDcEIsNkJBQWlCLEdBQUcsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDO0FBQ2xELG1CQUFHLEVBQUUsR0FBRzthQUNYLENBQUMsQ0FBQTs7QUFFRixxQkFBUyxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7QUFDL0IsbUJBQUcsRUFBRSxHQUFHO0FBQ1IseUJBQVMsRUFBRSxLQUFLO0FBQ2hCLHlCQUFTLEVBQUUsSUFBSTtBQUNmLHlCQUFTLEVBQUUsTUFBTSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSTthQUN4QyxDQUFDLENBQUE7QUFDRixxQkFBUyxDQUFDLFdBQVcsQ0FBQyxTQUFTLFFBL0NsQyxhQUFhLENBK0NxQyxDQUFBOztBQUUvQyx1QkFBVyxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7QUFDakMsbUJBQUcsRUFBRSxHQUFHO0FBQ1IsMkJBQVcsRUFBRSxTQUFTO0FBQ3RCLDRCQUFZLEVBQUUsQ0FBQztBQUNmLHlCQUFTLEVBQUUsU0FBUztBQUNwQiwyQkFBVyxFQUFFLEdBQUc7QUFDaEIseUJBQVMsRUFBRSxLQUFLO2FBQ25CLENBQUMsQ0FBQTtTQUNMO0FBQ0QseUJBQWlCLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBOztBQUVqQyxpQkFBUyxDQUFDLFdBQVcsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBOztBQUV2RCxtQkFBVyxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO0FBQ3ZELG1CQUFXLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBOztBQUU3QixXQUFHLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFBO0tBQ3pDLENBQUMsQ0FBQTtDQUNMOztRQUVRLFNBQVMsR0FBVCxTQUFTO3FCQUNILEVBQUUsTUFBTSxFQUFOLE1BQU0sRUFBRSxVQUFVLEVBQVYsVUFBVSxFQUFFOzs7Ozs7Ozs7Ozs2QkN4RXJCLGtCQUFrQjs7Ozs4QkFDakIsbUJBQW1COzs7O29CQUNaLE1BQU07O0FBRTlCLFNBQVMsTUFBTSxDQUFDLFNBQVMsRUFBRTtBQUN2QixXQUNJLFVBSkMsT0FBTzs7VUFJSCxTQUFNLEtBQUs7UUFDWixVQUxILE9BQU8sb0NBS1M7UUFDYixVQU5ILE9BQU8sbUNBTU87S0FDVCxDQUNUO0NBQ0o7O3FCQUdjLEVBQUUsTUFBTSxFQUFOLE1BQU0sRUFBRTs7Ozs7Ozs7O0FDZHpCLFNBQVMsU0FBUyxHQUFHO0FBQ2pCLFdBQU8sSUFBSSxPQUFPLENBQUMsVUFBQyxPQUFPLEVBQUs7QUFDNUIsaUJBQVMsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsVUFBUyxHQUFHLEVBQUU7OEJBQ3JCLEdBQUcsQ0FBQyxNQUFNO2dCQUFsQyxRQUFRLGVBQVIsUUFBUTtnQkFBRSxTQUFTLGVBQVQsU0FBUzs7QUFDekIsbUJBQU8sQ0FBQyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUE7U0FDN0MsQ0FBQyxDQUFBO0tBQ0wsQ0FBQyxDQUFBO0NBQ0w7O1FBR1EsU0FBUyxHQUFULFNBQVM7Ozs7Ozs7bUJDVkYsT0FBTzs7OztvQkFDZSxNQUFNOzs7QUFJNUMsSUFBSSxHQUFHLEdBQUcsVUFKTyxJQUFJLEVBSU4sVUFKUSxPQUFPLHlCQUlSLENBQUMsQ0FBQTs7O0FBR3ZCLFVBUFMsTUFBTSxFQU9SLEdBQUcsRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciBFbWl0dGVyID0gcmVxdWlyZSgnY29tcG9uZW50LWVtaXR0ZXInKVxuXG4vKipcbiAqIEV4cG9zZSBgc2NlbmVgLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gQXBwbGljYXRpb25cblxuLyoqXG4gKiBDcmVhdGUgYSBuZXcgYEFwcGxpY2F0aW9uYC5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gZWxlbWVudCBPcHRpb25hbCBpbml0aWFsIGVsZW1lbnRcbiAqL1xuXG5mdW5jdGlvbiBBcHBsaWNhdGlvbiAoZWxlbWVudCkge1xuICBpZiAoISh0aGlzIGluc3RhbmNlb2YgQXBwbGljYXRpb24pKSByZXR1cm4gbmV3IEFwcGxpY2F0aW9uKGVsZW1lbnQpXG4gIHRoaXMub3B0aW9ucyA9IHt9XG4gIHRoaXMuc291cmNlcyA9IHt9XG4gIHRoaXMuZWxlbWVudCA9IGVsZW1lbnRcbn1cblxuLyoqXG4gKiBNaXhpbiBgRW1pdHRlcmAuXG4gKi9cblxuRW1pdHRlcihBcHBsaWNhdGlvbi5wcm90b3R5cGUpXG5cbi8qKlxuICogQWRkIGEgcGx1Z2luXG4gKlxuICogQHBhcmFtIHtGdW5jdGlvbn0gcGx1Z2luXG4gKi9cblxuQXBwbGljYXRpb24ucHJvdG90eXBlLnVzZSA9IGZ1bmN0aW9uIChwbHVnaW4pIHtcbiAgcGx1Z2luKHRoaXMpXG4gIHJldHVybiB0aGlzXG59XG5cbi8qKlxuICogU2V0IGFuIG9wdGlvblxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gKi9cblxuQXBwbGljYXRpb24ucHJvdG90eXBlLm9wdGlvbiA9IGZ1bmN0aW9uIChuYW1lLCB2YWwpIHtcbiAgdGhpcy5vcHRpb25zW25hbWVdID0gdmFsXG4gIHJldHVybiB0aGlzXG59XG5cbi8qKlxuICogU2V0IHZhbHVlIHVzZWQgc29tZXdoZXJlIGluIHRoZSBJTyBuZXR3b3JrLlxuICovXG5cbkFwcGxpY2F0aW9uLnByb3RvdHlwZS5zZXQgPSBmdW5jdGlvbiAobmFtZSwgZGF0YSkge1xuICB0aGlzLnNvdXJjZXNbbmFtZV0gPSBkYXRhXG4gIHRoaXMuZW1pdCgnc291cmNlJywgbmFtZSwgZGF0YSlcbiAgcmV0dXJuIHRoaXNcbn1cblxuLyoqXG4gKiBNb3VudCBhIHZpcnR1YWwgZWxlbWVudC5cbiAqXG4gKiBAcGFyYW0ge1ZpcnR1YWxFbGVtZW50fSBlbGVtZW50XG4gKi9cblxuQXBwbGljYXRpb24ucHJvdG90eXBlLm1vdW50ID0gZnVuY3Rpb24gKGVsZW1lbnQpIHtcbiAgdGhpcy5lbGVtZW50ID0gZWxlbWVudFxuICB0aGlzLmVtaXQoJ21vdW50JywgZWxlbWVudClcbiAgcmV0dXJuIHRoaXNcbn1cblxuLyoqXG4gKiBSZW1vdmUgdGhlIHdvcmxkLiBVbm1vdW50IGV2ZXJ5dGhpbmcuXG4gKi9cblxuQXBwbGljYXRpb24ucHJvdG90eXBlLnVubW91bnQgPSBmdW5jdGlvbiAoKSB7XG4gIGlmICghdGhpcy5lbGVtZW50KSByZXR1cm5cbiAgdGhpcy5lbGVtZW50ID0gbnVsbFxuICB0aGlzLmVtaXQoJ3VubW91bnQnKVxuICByZXR1cm4gdGhpc1xufVxuIiwiLyoqXG4gKiBBbGwgb2YgdGhlIGV2ZW50cyBjYW4gYmluZCB0b1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICBvbkJsdXI6ICdibHVyJyxcbiAgb25DaGFuZ2U6ICdjaGFuZ2UnLFxuICBvbkNsaWNrOiAnY2xpY2snLFxuICBvbkNvbnRleHRNZW51OiAnY29udGV4dG1lbnUnLFxuICBvbkNvcHk6ICdjb3B5JyxcbiAgb25DdXQ6ICdjdXQnLFxuICBvbkRvdWJsZUNsaWNrOiAnZGJsY2xpY2snLFxuICBvbkRyYWc6ICdkcmFnJyxcbiAgb25EcmFnRW5kOiAnZHJhZ2VuZCcsXG4gIG9uRHJhZ0VudGVyOiAnZHJhZ2VudGVyJyxcbiAgb25EcmFnRXhpdDogJ2RyYWdleGl0JyxcbiAgb25EcmFnTGVhdmU6ICdkcmFnbGVhdmUnLFxuICBvbkRyYWdPdmVyOiAnZHJhZ292ZXInLFxuICBvbkRyYWdTdGFydDogJ2RyYWdzdGFydCcsXG4gIG9uRHJvcDogJ2Ryb3AnLFxuICBvbkZvY3VzOiAnZm9jdXMnLFxuICBvbklucHV0OiAnaW5wdXQnLFxuICBvbktleURvd246ICdrZXlkb3duJyxcbiAgb25LZXlQcmVzczogJ2tleXByZXNzJyxcbiAgb25LZXlVcDogJ2tleXVwJyxcbiAgb25Nb3VzZURvd246ICdtb3VzZWRvd24nLFxuICBvbk1vdXNlRW50ZXI6ICdtb3VzZWVudGVyJyxcbiAgb25Nb3VzZUxlYXZlOiAnbW91c2VsZWF2ZScsXG4gIG9uTW91c2VNb3ZlOiAnbW91c2Vtb3ZlJyxcbiAgb25Nb3VzZU91dDogJ21vdXNlb3V0JyxcbiAgb25Nb3VzZU92ZXI6ICdtb3VzZW92ZXInLFxuICBvbk1vdXNlVXA6ICdtb3VzZXVwJyxcbiAgb25QYXN0ZTogJ3Bhc3RlJyxcbiAgb25TY3JvbGw6ICdzY3JvbGwnLFxuICBvblN1Ym1pdDogJ3N1Ym1pdCcsXG4gIG9uVG91Y2hDYW5jZWw6ICd0b3VjaGNhbmNlbCcsXG4gIG9uVG91Y2hFbmQ6ICd0b3VjaGVuZCcsXG4gIG9uVG91Y2hNb3ZlOiAndG91Y2htb3ZlJyxcbiAgb25Ub3VjaFN0YXJ0OiAndG91Y2hzdGFydCcsXG4gIG9uV2hlZWw6ICd3aGVlbCdcbn1cbiIsIi8qKlxuICogQ3JlYXRlIHRoZSBhcHBsaWNhdGlvbi5cbiAqL1xuXG5leHBvcnRzLnRyZWUgPVxuZXhwb3J0cy5zY2VuZSA9XG5leHBvcnRzLmRla3UgPSByZXF1aXJlKCcuL2FwcGxpY2F0aW9uJylcblxuLyoqXG4gKiBSZW5kZXIgc2NlbmVzIHRvIHRoZSBET00uXG4gKi9cblxuaWYgKHR5cGVvZiBkb2N1bWVudCAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgZXhwb3J0cy5yZW5kZXIgPSByZXF1aXJlKCcuL3JlbmRlcicpXG59XG5cbi8qKlxuICogUmVuZGVyIHNjZW5lcyB0byBhIHN0cmluZ1xuICovXG5cbmV4cG9ydHMucmVuZGVyU3RyaW5nID0gcmVxdWlyZSgnLi9zdHJpbmdpZnknKVxuXG4vKipcbiAqIENyZWF0ZSB2aXJ0dWFsIGVsZW1lbnRzLlxuICovXG5cbmV4cG9ydHMuZWxlbWVudCA9XG5leHBvcnRzLmNyZWF0ZUVsZW1lbnQgPVxuZXhwb3J0cy5kb20gPSByZXF1aXJlKCcuL3ZpcnR1YWwnKVxuIiwiLyoqXG4gKiBEZXBlbmRlbmNpZXMuXG4gKi9cblxudmFyIHJhZiA9IHJlcXVpcmUoJ2NvbXBvbmVudC1yYWYnKVxudmFyIFBvb2wgPSByZXF1aXJlKCdkb20tcG9vbCcpXG52YXIgd2FsayA9IHJlcXVpcmUoJ2RvbS13YWxrJylcbnZhciBpc0RvbSA9IHJlcXVpcmUoJ2lzLWRvbScpXG52YXIgdWlkID0gcmVxdWlyZSgnZ2V0LXVpZCcpXG52YXIga2V5cGF0aCA9IHJlcXVpcmUoJ29iamVjdC1wYXRoJylcbnZhciB0eXBlID0gcmVxdWlyZSgnY29tcG9uZW50LXR5cGUnKVxudmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpXG52YXIgc3ZnID0gcmVxdWlyZSgnLi9zdmcnKVxudmFyIGV2ZW50cyA9IHJlcXVpcmUoJy4vZXZlbnRzJylcbnZhciBkZWZhdWx0cyA9IHV0aWxzLmRlZmF1bHRzXG52YXIgZm9yRWFjaCA9IHJlcXVpcmUoJ2Zhc3QuanMvZm9yRWFjaCcpXG52YXIgYXNzaWduID0gcmVxdWlyZSgnZmFzdC5qcy9vYmplY3QvYXNzaWduJylcbnZhciByZWR1Y2UgPSByZXF1aXJlKCdmYXN0LmpzL3JlZHVjZScpXG52YXIgaXNQcm9taXNlID0gcmVxdWlyZSgnaXMtcHJvbWlzZScpXG5cbi8qKlxuICogVGhlc2UgZWxlbWVudHMgd29uJ3QgYmUgcG9vbGVkXG4gKi9cblxudmFyIGF2b2lkUG9vbGluZyA9IFsnaW5wdXQnLCAndGV4dGFyZWEnXTtcblxuLyoqXG4gKiBFeHBvc2UgYGRvbWAuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSByZW5kZXJcblxuLyoqXG4gKiBSZW5kZXIgYW4gYXBwIHRvIHRoZSBET01cbiAqXG4gKiBAcGFyYW0ge0FwcGxpY2F0aW9ufSBhcHBcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGNvbnRhaW5lclxuICogQHBhcmFtIHtPYmplY3R9IG9wdHNcbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cblxuZnVuY3Rpb24gcmVuZGVyIChhcHAsIGNvbnRhaW5lciwgb3B0cykge1xuICB2YXIgZnJhbWVJZFxuICB2YXIgaXNSZW5kZXJpbmdcbiAgdmFyIHJvb3RJZCA9ICdyb290J1xuICB2YXIgY3VycmVudEVsZW1lbnRcbiAgdmFyIGN1cnJlbnROYXRpdmVFbGVtZW50XG4gIHZhciBjb25uZWN0aW9ucyA9IHt9XG4gIHZhciBjb21wb25lbnRzID0ge31cbiAgdmFyIGVudGl0aWVzID0ge31cbiAgdmFyIHBvb2xzID0ge31cbiAgdmFyIGhhbmRsZXJzID0ge31cbiAgdmFyIG1vdW50UXVldWUgPSBbXVxuICB2YXIgY2hpbGRyZW4gPSB7fVxuICBjaGlsZHJlbltyb290SWRdID0ge31cblxuICBpZiAoIWlzRG9tKGNvbnRhaW5lcikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbnRhaW5lciBlbGVtZW50IG11c3QgYmUgYSBET00gZWxlbWVudCcpXG4gIH1cblxuICAvKipcbiAgICogUmVuZGVyaW5nIG9wdGlvbnMuIEJhdGNoaW5nIGlzIG9ubHkgZXZlciByZWFsbHkgZGlzYWJsZWRcbiAgICogd2hlbiBydW5uaW5nIHRlc3RzLCBhbmQgcG9vbGluZyBjYW4gYmUgZGlzYWJsZWQgaWYgdGhlIHVzZXJcbiAgICogaXMgZG9pbmcgc29tZXRoaW5nIHN0dXBpZCB3aXRoIHRoZSBET00gaW4gdGhlaXIgY29tcG9uZW50cy5cbiAgICovXG5cbiAgdmFyIG9wdGlvbnMgPSBkZWZhdWx0cyhhc3NpZ24oe30sIGFwcC5vcHRpb25zIHx8IHt9LCBvcHRzIHx8IHt9KSwge1xuICAgIHBvb2xpbmc6IHRydWUsXG4gICAgYmF0Y2hpbmc6IHRydWUsXG4gICAgdmFsaWRhdGVQcm9wczogZmFsc2VcbiAgfSlcblxuICAvKipcbiAgICogTGlzdGVuIHRvIERPTSBldmVudHNcbiAgICovXG5cbiAgYWRkTmF0aXZlRXZlbnRMaXN0ZW5lcnMoKVxuXG4gIC8qKlxuICAgKiBXYXRjaCBmb3IgY2hhbmdlcyB0byB0aGUgYXBwIHNvIHRoYXQgd2UgY2FuIHVwZGF0ZVxuICAgKiB0aGUgRE9NIGFzIG5lZWRlZC5cbiAgICovXG5cbiAgYXBwLm9uKCd1bm1vdW50Jywgb251bm1vdW50KVxuICBhcHAub24oJ21vdW50Jywgb25tb3VudClcbiAgYXBwLm9uKCdzb3VyY2UnLCBvbnVwZGF0ZSlcblxuICAvKipcbiAgICogSWYgdGhlIGFwcCBoYXMgYWxyZWFkeSBtb3VudGVkIGFuIGVsZW1lbnQsIHdlIGNhbiBqdXN0XG4gICAqIHJlbmRlciB0aGF0IHN0cmFpZ2h0IGF3YXkuXG4gICAqL1xuXG4gIGlmIChhcHAuZWxlbWVudCkgcmVuZGVyKClcblxuICAvKipcbiAgICogVGVhcmRvd24gdGhlIERPTSByZW5kZXJpbmcgc28gdGhhdCBpdCBzdG9wc1xuICAgKiByZW5kZXJpbmcgYW5kIGV2ZXJ5dGhpbmcgY2FuIGJlIGdhcmJhZ2UgY29sbGVjdGVkLlxuICAgKi9cblxuICBmdW5jdGlvbiB0ZWFyZG93biAoKSB7XG4gICAgcmVtb3ZlTmF0aXZlRXZlbnRMaXN0ZW5lcnMoKVxuICAgIHJlbW92ZU5hdGl2ZUVsZW1lbnQoKVxuICAgIGFwcC5vZmYoJ3VubW91bnQnLCBvbnVubW91bnQpXG4gICAgYXBwLm9mZignbW91bnQnLCBvbm1vdW50KVxuICAgIGFwcC5vZmYoJ3NvdXJjZScsIG9udXBkYXRlKVxuICB9XG5cbiAgLyoqXG4gICAqIFN3YXAgdGhlIGN1cnJlbnQgcmVuZGVyZWQgbm9kZSB3aXRoIGEgbmV3IG9uZSB0aGF0IGlzIHJlbmRlcmVkXG4gICAqIGZyb20gdGhlIG5ldyB2aXJ0dWFsIGVsZW1lbnQgbW91bnRlZCBvbiB0aGUgYXBwLlxuICAgKlxuICAgKiBAcGFyYW0ge1ZpcnR1YWxFbGVtZW50fSBlbGVtZW50XG4gICAqL1xuXG4gIGZ1bmN0aW9uIG9ubW91bnQgKCkge1xuICAgIGludmFsaWRhdGUoKVxuICB9XG5cbiAgLyoqXG4gICAqIElmIHRoZSBhcHAgdW5tb3VudHMgYW4gZWxlbWVudCwgd2Ugc2hvdWxkIGNsZWFyIG91dCB0aGUgY3VycmVudFxuICAgKiByZW5kZXJlZCBlbGVtZW50LiBUaGlzIHdpbGwgcmVtb3ZlIGFsbCB0aGUgZW50aXRpZXMuXG4gICAqL1xuXG4gIGZ1bmN0aW9uIG9udW5tb3VudCAoKSB7XG4gICAgcmVtb3ZlTmF0aXZlRWxlbWVudCgpXG4gICAgY3VycmVudEVsZW1lbnQgPSBudWxsXG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIGFsbCBjb21wb25lbnRzIHRoYXQgYXJlIGJvdW5kIHRvIHRoZSBzb3VyY2VcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAgICogQHBhcmFtIHsqfSBkYXRhXG4gICAqL1xuXG4gIGZ1bmN0aW9uIG9udXBkYXRlIChuYW1lLCBkYXRhKSB7XG4gICAgaWYgKCFjb25uZWN0aW9uc1tuYW1lXSkgcmV0dXJuO1xuICAgIGNvbm5lY3Rpb25zW25hbWVdLmZvckVhY2goZnVuY3Rpb24odXBkYXRlKSB7XG4gICAgICB1cGRhdGUoZGF0YSlcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbmRlciBhbmQgbW91bnQgYSBjb21wb25lbnQgdG8gdGhlIG5hdGl2ZSBkb20uXG4gICAqXG4gICAqIEBwYXJhbSB7RW50aXR5fSBlbnRpdHlcbiAgICogQHJldHVybiB7SFRNTEVsZW1lbnR9XG4gICAqL1xuXG4gIGZ1bmN0aW9uIG1vdW50RW50aXR5IChlbnRpdHkpIHtcbiAgICByZWdpc3RlcihlbnRpdHkpXG4gICAgc2V0U291cmNlcyhlbnRpdHkpXG4gICAgY2hpbGRyZW5bZW50aXR5LmlkXSA9IHt9XG4gICAgZW50aXRpZXNbZW50aXR5LmlkXSA9IGVudGl0eVxuXG4gICAgLy8gY29tbWl0IGluaXRpYWwgc3RhdGUgYW5kIHByb3BzLlxuICAgIGNvbW1pdChlbnRpdHkpXG5cbiAgICAvLyBjYWxsYmFjayBiZWZvcmUgbW91bnRpbmcuXG4gICAgdHJpZ2dlcignYmVmb3JlTW91bnQnLCBlbnRpdHksIFtlbnRpdHkuY29udGV4dF0pXG4gICAgdHJpZ2dlcignYmVmb3JlUmVuZGVyJywgZW50aXR5LCBbZW50aXR5LmNvbnRleHRdKVxuXG4gICAgLy8gcmVuZGVyIHZpcnR1YWwgZWxlbWVudC5cbiAgICB2YXIgdmlydHVhbEVsZW1lbnQgPSByZW5kZXJFbnRpdHkoZW50aXR5KVxuICAgIC8vIGNyZWF0ZSBuYXRpdmUgZWxlbWVudC5cbiAgICB2YXIgbmF0aXZlRWxlbWVudCA9IHRvTmF0aXZlKGVudGl0eS5pZCwgJzAnLCB2aXJ0dWFsRWxlbWVudClcblxuICAgIGVudGl0eS52aXJ0dWFsRWxlbWVudCA9IHZpcnR1YWxFbGVtZW50XG4gICAgZW50aXR5Lm5hdGl2ZUVsZW1lbnQgPSBuYXRpdmVFbGVtZW50XG5cbiAgICAvLyBGaXJlIGFmdGVyUmVuZGVyIGFuZCBhZnRlck1vdW50IGhvb2tzIGF0IHRoZSBlbmRcbiAgICAvLyBvZiB0aGUgcmVuZGVyIGN5Y2xlXG4gICAgbW91bnRRdWV1ZS5wdXNoKGVudGl0eS5pZClcblxuICAgIHJldHVybiBuYXRpdmVFbGVtZW50XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGEgY29tcG9uZW50IGZyb20gdGhlIG5hdGl2ZSBkb20uXG4gICAqXG4gICAqIEBwYXJhbSB7RW50aXR5fSBlbnRpdHlcbiAgICovXG5cbiAgZnVuY3Rpb24gdW5tb3VudEVudGl0eSAoZW50aXR5SWQpIHtcbiAgICB2YXIgZW50aXR5ID0gZW50aXRpZXNbZW50aXR5SWRdXG4gICAgaWYgKCFlbnRpdHkpIHJldHVyblxuICAgIHRyaWdnZXIoJ2JlZm9yZVVubW91bnQnLCBlbnRpdHksIFtlbnRpdHkuY29udGV4dCwgZW50aXR5Lm5hdGl2ZUVsZW1lbnRdKVxuICAgIHVubW91bnRDaGlsZHJlbihlbnRpdHlJZClcbiAgICByZW1vdmVBbGxFdmVudHMoZW50aXR5SWQpXG4gICAgdmFyIGNvbXBvbmVudEVudGl0aWVzID0gY29tcG9uZW50c1tlbnRpdHlJZF0uZW50aXRpZXM7XG4gICAgZGVsZXRlIGNvbXBvbmVudEVudGl0aWVzW2VudGl0eUlkXVxuICAgIGRlbGV0ZSBjb21wb25lbnRzW2VudGl0eUlkXVxuICAgIGRlbGV0ZSBlbnRpdGllc1tlbnRpdHlJZF1cbiAgICBkZWxldGUgY2hpbGRyZW5bZW50aXR5SWRdXG4gIH1cblxuICAvKipcbiAgICogUmVuZGVyIHRoZSBlbnRpdHkgYW5kIG1ha2Ugc3VyZSBpdCByZXR1cm5zIGEgbm9kZVxuICAgKlxuICAgKiBAcGFyYW0ge0VudGl0eX0gZW50aXR5XG4gICAqXG4gICAqIEByZXR1cm4ge1ZpcnR1YWxUcmVlfVxuICAgKi9cblxuICBmdW5jdGlvbiByZW5kZXJFbnRpdHkgKGVudGl0eSkge1xuICAgIHZhciBjb21wb25lbnQgPSBlbnRpdHkuY29tcG9uZW50XG4gICAgaWYgKCFjb21wb25lbnQucmVuZGVyKSB0aHJvdyBuZXcgRXJyb3IoJ0NvbXBvbmVudCBuZWVkcyBhIHJlbmRlciBmdW5jdGlvbicpXG4gICAgdmFyIHJlc3VsdCA9IGNvbXBvbmVudC5yZW5kZXIoZW50aXR5LmNvbnRleHQsIHNldFN0YXRlKGVudGl0eSkpXG4gICAgaWYgKCFyZXN1bHQpIHRocm93IG5ldyBFcnJvcignUmVuZGVyIGZ1bmN0aW9uIG11c3QgcmV0dXJuIGFuIGVsZW1lbnQuJylcbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICAvKipcbiAgICogV2hlbmV2ZXIgc2V0U3RhdGUgb3Igc2V0UHJvcHMgaXMgY2FsbGVkLCB3ZSBtYXJrIHRoZSBlbnRpdHlcbiAgICogYXMgZGlydHkgaW4gdGhlIHJlbmRlcmVyLiBUaGlzIGxldHMgdXMgb3B0aW1pemUgdGhlIHJlLXJlbmRlcmluZ1xuICAgKiBhbmQgc2tpcCBjb21wb25lbnRzIHRoYXQgZGVmaW5pdGVseSBoYXZlbid0IGNoYW5nZWQuXG4gICAqXG4gICAqIEBwYXJhbSB7RW50aXR5fSBlbnRpdHlcbiAgICpcbiAgICogQHJldHVybiB7RnVuY3Rpb259IEEgY3VycmllZCBmdW5jdGlvbiBmb3IgdXBkYXRpbmcgdGhlIHN0YXRlIG9mIGFuIGVudGl0eVxuICAgKi9cblxuICBmdW5jdGlvbiBzZXRTdGF0ZSAoZW50aXR5KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChuZXh0U3RhdGUpIHtcbiAgICAgIHVwZGF0ZUVudGl0eVN0YXRlQXN5bmMoZW50aXR5LCBuZXh0U3RhdGUpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRlbGwgdGhlIGFwcCBpdCdzIGRpcnR5IGFuZCBuZWVkcyB0byByZS1yZW5kZXIuIElmIGJhdGNoaW5nIGlzIGRpc2FibGVkXG4gICAqIHdlIGNhbiBqdXN0IHRyaWdnZXIgYSByZW5kZXIgaW1tZWRpYXRlbHksIG90aGVyd2lzZSB3ZSdsbCB3YWl0IHVudGlsXG4gICAqIHRoZSBuZXh0IGF2YWlsYWJsZSBmcmFtZS5cbiAgICovXG5cbiAgZnVuY3Rpb24gaW52YWxpZGF0ZSAoKSB7XG4gICAgaWYgKCFvcHRpb25zLmJhdGNoaW5nKSB7XG4gICAgICBpZiAoIWlzUmVuZGVyaW5nKSByZW5kZXIoKVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIWZyYW1lSWQpIGZyYW1lSWQgPSByYWYocmVuZGVyKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGUgdGhlIERPTS4gSWYgdGhlIHVwZGF0ZSBmYWlscyB3ZSBzdG9wIHRoZSBsb29wXG4gICAqIHNvIHdlIGRvbid0IGdldCBlcnJvcnMgb24gZXZlcnkgZnJhbWUuXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGZ1bmN0aW9uIHJlbmRlciAoKSB7XG4gICAgLy8gSWYgdGhpcyBpcyBjYWxsZWQgc3luY2hyb25vdXNseSB3ZSBuZWVkIHRvXG4gICAgLy8gY2FuY2VsIGFueSBwZW5kaW5nIGZ1dHVyZSB1cGRhdGVzXG4gICAgY2xlYXJGcmFtZSgpXG5cbiAgICAvLyBJZiB0aGUgcmVuZGVyaW5nIGZyb20gdGhlIHByZXZpb3VzIGZyYW1lIGlzIHN0aWxsIGdvaW5nLFxuICAgIC8vIHdlJ2xsIGp1c3Qgd2FpdCB1bnRpbCB0aGUgbmV4dCBmcmFtZS4gSWRlYWxseSByZW5kZXJzIHNob3VsZFxuICAgIC8vIG5vdCB0YWtlIG92ZXIgMTZtcyB0byBzdGF5IHdpdGhpbiBhIHNpbmdsZSBmcmFtZSwgYnV0IHRoaXMgc2hvdWxkXG4gICAgLy8gY2F0Y2ggaXQgaWYgaXQgZG9lcy5cbiAgICBpZiAoaXNSZW5kZXJpbmcpIHtcbiAgICAgIGZyYW1lSWQgPSByYWYocmVuZGVyKVxuICAgICAgcmV0dXJuXG4gICAgfSBlbHNlIHtcbiAgICAgIGlzUmVuZGVyaW5nID0gdHJ1ZVxuICAgIH1cblxuICAgIC8vIDEuIElmIHRoZXJlIGlzbid0IGEgbmF0aXZlIGVsZW1lbnQgcmVuZGVyZWQgZm9yIHRoZSBjdXJyZW50IG1vdW50ZWQgZWxlbWVudFxuICAgIC8vIHRoZW4gd2UgbmVlZCB0byBjcmVhdGUgaXQgZnJvbSBzY3JhdGNoLlxuICAgIC8vIDIuIElmIGEgbmV3IGVsZW1lbnQgaGFzIGJlZW4gbW91bnRlZCwgd2Ugc2hvdWxkIGRpZmYgdGhlbS5cbiAgICAvLyAzLiBXZSBzaG91bGQgdXBkYXRlIGNoZWNrIGFsbCBjaGlsZCBjb21wb25lbnRzIGZvciBjaGFuZ2VzLlxuICAgIGlmICghY3VycmVudE5hdGl2ZUVsZW1lbnQpIHtcbiAgICAgIGN1cnJlbnRFbGVtZW50ID0gYXBwLmVsZW1lbnRcbiAgICAgIGN1cnJlbnROYXRpdmVFbGVtZW50ID0gdG9OYXRpdmUocm9vdElkLCAnMCcsIGN1cnJlbnRFbGVtZW50KVxuICAgICAgaWYgKGNvbnRhaW5lci5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnNvbGUuaW5mbygnZGVrdTogVGhlIGNvbnRhaW5lciBlbGVtZW50IGlzIG5vdCBlbXB0eS4gVGhlc2UgZWxlbWVudHMgd2lsbCBiZSByZW1vdmVkLiBSZWFkIG1vcmU6IGh0dHA6Ly9jbC5seS9iMFNyJylcbiAgICAgIH1cbiAgICAgIGlmIChjb250YWluZXIgPT09IGRvY3VtZW50LmJvZHkpIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdkZWt1OiBVc2luZyBkb2N1bWVudC5ib2R5IGlzIGFsbG93ZWQgYnV0IGl0IGNhbiBjYXVzZSBzb21lIGlzc3Vlcy4gUmVhZCBtb3JlOiBodHRwOi8vY2wubHkvYjBTQycpXG4gICAgICB9XG4gICAgICByZW1vdmVBbGxDaGlsZHJlbihjb250YWluZXIpO1xuICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGN1cnJlbnROYXRpdmVFbGVtZW50KVxuICAgIH0gZWxzZSBpZiAoY3VycmVudEVsZW1lbnQgIT09IGFwcC5lbGVtZW50KSB7XG4gICAgICBjdXJyZW50TmF0aXZlRWxlbWVudCA9IHBhdGNoKHJvb3RJZCwgY3VycmVudEVsZW1lbnQsIGFwcC5lbGVtZW50LCBjdXJyZW50TmF0aXZlRWxlbWVudClcbiAgICAgIGN1cnJlbnRFbGVtZW50ID0gYXBwLmVsZW1lbnRcbiAgICAgIHVwZGF0ZUNoaWxkcmVuKHJvb3RJZClcbiAgICB9IGVsc2Uge1xuICAgICAgdXBkYXRlQ2hpbGRyZW4ocm9vdElkKVxuICAgIH1cblxuICAgIC8vIENhbGwgbW91bnQgZXZlbnRzIG9uIGFsbCBuZXcgZW50aXRpZXNcbiAgICBmbHVzaE1vdW50UXVldWUoKVxuXG4gICAgLy8gQWxsb3cgcmVuZGVyaW5nIGFnYWluLlxuICAgIGlzUmVuZGVyaW5nID0gZmFsc2VcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsIGhvb2tzIGZvciBhbGwgbmV3IGVudGl0aWVzIHRoYXQgaGF2ZSBiZWVuIGNyZWF0ZWQgaW5cbiAgICogdGhlIGxhc3QgcmVuZGVyIGZyb20gdGhlIGJvdHRvbSB1cC5cbiAgICovXG5cbiAgZnVuY3Rpb24gZmx1c2hNb3VudFF1ZXVlICgpIHtcbiAgICB2YXIgZW50aXR5SWRcbiAgICB3aGlsZSAoZW50aXR5SWQgPSBtb3VudFF1ZXVlLnBvcCgpKSB7XG4gICAgICB2YXIgZW50aXR5ID0gZW50aXRpZXNbZW50aXR5SWRdXG4gICAgICB0cmlnZ2VyKCdhZnRlclJlbmRlcicsIGVudGl0eSwgW2VudGl0eS5jb250ZXh0LCBlbnRpdHkubmF0aXZlRWxlbWVudF0pXG4gICAgICB0cmlnZ2VyVXBkYXRlKCdhZnRlck1vdW50JywgZW50aXR5LCBbZW50aXR5LmNvbnRleHQsIGVudGl0eS5uYXRpdmVFbGVtZW50LCBzZXRTdGF0ZShlbnRpdHkpXSlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2xlYXIgdGhlIGN1cnJlbnQgc2NoZWR1bGVkIGZyYW1lXG4gICAqL1xuXG4gIGZ1bmN0aW9uIGNsZWFyRnJhbWUgKCkge1xuICAgIGlmICghZnJhbWVJZCkgcmV0dXJuXG4gICAgcmFmLmNhbmNlbChmcmFtZUlkKVxuICAgIGZyYW1lSWQgPSAwXG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIGEgY29tcG9uZW50LlxuICAgKlxuICAgKiBUaGUgZW50aXR5IGlzIGp1c3QgdGhlIGRhdGEgb2JqZWN0IGZvciBhIGNvbXBvbmVudCBpbnN0YW5jZS5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IGlkIENvbXBvbmVudCBpbnN0YW5jZSBpZC5cbiAgICovXG5cbiAgZnVuY3Rpb24gdXBkYXRlRW50aXR5IChlbnRpdHlJZCkge1xuICAgIHZhciBlbnRpdHkgPSBlbnRpdGllc1tlbnRpdHlJZF1cbiAgICBzZXRTb3VyY2VzKGVudGl0eSlcblxuICAgIGlmICghc2hvdWxkVXBkYXRlKGVudGl0eSkpIHJldHVybiB1cGRhdGVDaGlsZHJlbihlbnRpdHlJZClcblxuICAgIHZhciBjdXJyZW50VHJlZSA9IGVudGl0eS52aXJ0dWFsRWxlbWVudFxuICAgIHZhciBuZXh0UHJvcHMgPSBlbnRpdHkucGVuZGluZ1Byb3BzXG4gICAgdmFyIG5leHRTdGF0ZSA9IGVudGl0eS5wZW5kaW5nU3RhdGVcbiAgICB2YXIgcHJldmlvdXNTdGF0ZSA9IGVudGl0eS5jb250ZXh0LnN0YXRlXG4gICAgdmFyIHByZXZpb3VzUHJvcHMgPSBlbnRpdHkuY29udGV4dC5wcm9wc1xuXG4gICAgLy8gaG9vayBiZWZvcmUgcmVuZGVyaW5nLiBjb3VsZCBtb2RpZnkgc3RhdGUganVzdCBiZWZvcmUgdGhlIHJlbmRlciBvY2N1cnMuXG4gICAgdHJpZ2dlcignYmVmb3JlVXBkYXRlJywgZW50aXR5LCBbZW50aXR5LmNvbnRleHQsIG5leHRQcm9wcywgbmV4dFN0YXRlXSlcbiAgICB0cmlnZ2VyKCdiZWZvcmVSZW5kZXInLCBlbnRpdHksIFtlbnRpdHkuY29udGV4dF0pXG5cbiAgICAvLyBjb21taXQgc3RhdGUgYW5kIHByb3BzLlxuICAgIGNvbW1pdChlbnRpdHkpXG5cbiAgICAvLyByZS1yZW5kZXIuXG4gICAgdmFyIG5leHRUcmVlID0gcmVuZGVyRW50aXR5KGVudGl0eSlcblxuICAgIC8vIGlmIHRoZSB0cmVlIGlzIHRoZSBzYW1lIHdlIGNhbiBqdXN0IHNraXAgdGhpcyBjb21wb25lbnRcbiAgICAvLyBidXQgd2Ugc2hvdWxkIHN0aWxsIGNoZWNrIHRoZSBjaGlsZHJlbiB0byBzZWUgaWYgdGhleSdyZSBkaXJ0eS5cbiAgICAvLyBUaGlzIGFsbG93cyB1cyB0byBtZW1vaXplIHRoZSByZW5kZXIgZnVuY3Rpb24gb2YgY29tcG9uZW50cy5cbiAgICBpZiAobmV4dFRyZWUgPT09IGN1cnJlbnRUcmVlKSByZXR1cm4gdXBkYXRlQ2hpbGRyZW4oZW50aXR5SWQpXG5cbiAgICAvLyBhcHBseSBuZXcgdmlydHVhbCB0cmVlIHRvIG5hdGl2ZSBkb20uXG4gICAgZW50aXR5Lm5hdGl2ZUVsZW1lbnQgPSBwYXRjaChlbnRpdHlJZCwgY3VycmVudFRyZWUsIG5leHRUcmVlLCBlbnRpdHkubmF0aXZlRWxlbWVudClcbiAgICBlbnRpdHkudmlydHVhbEVsZW1lbnQgPSBuZXh0VHJlZVxuICAgIHVwZGF0ZUNoaWxkcmVuKGVudGl0eUlkKVxuXG4gICAgLy8gdHJpZ2dlciByZW5kZXIgaG9va1xuICAgIHRyaWdnZXIoJ2FmdGVyUmVuZGVyJywgZW50aXR5LCBbZW50aXR5LmNvbnRleHQsIGVudGl0eS5uYXRpdmVFbGVtZW50XSlcblxuICAgIC8vIHRyaWdnZXIgYWZ0ZXJVcGRhdGUgYWZ0ZXIgYWxsIGNoaWxkcmVuIGhhdmUgdXBkYXRlZC5cbiAgICB0cmlnZ2VyVXBkYXRlKCdhZnRlclVwZGF0ZScsIGVudGl0eSwgW2VudGl0eS5jb250ZXh0LCBwcmV2aW91c1Byb3BzLCBwcmV2aW91c1N0YXRlXSlcbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGUgYWxsIHRoZSBjaGlsZHJlbiBvZiBhbiBlbnRpdHkuXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBpZCBDb21wb25lbnQgaW5zdGFuY2UgaWQuXG4gICAqL1xuXG4gIGZ1bmN0aW9uIHVwZGF0ZUNoaWxkcmVuIChlbnRpdHlJZCkge1xuICAgIGZvckVhY2goY2hpbGRyZW5bZW50aXR5SWRdLCBmdW5jdGlvbiAoY2hpbGRJZCkge1xuICAgICAgdXBkYXRlRW50aXR5KGNoaWxkSWQpXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYWxsIG9mIHRoZSBjaGlsZCBlbnRpdGllcyBvZiBhbiBlbnRpdHlcbiAgICpcbiAgICogQHBhcmFtIHtFbnRpdHl9IGVudGl0eVxuICAgKi9cblxuICBmdW5jdGlvbiB1bm1vdW50Q2hpbGRyZW4gKGVudGl0eUlkKSB7XG4gICAgZm9yRWFjaChjaGlsZHJlbltlbnRpdHlJZF0sIGZ1bmN0aW9uIChjaGlsZElkKSB7XG4gICAgICB1bm1vdW50RW50aXR5KGNoaWxkSWQpXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgdGhlIHJvb3QgZWxlbWVudC4gSWYgdGhpcyBpcyBjYWxsZWQgc3luY2hyb25vdXNseSB3ZSBuZWVkIHRvXG4gICAqIGNhbmNlbCBhbnkgcGVuZGluZyBmdXR1cmUgdXBkYXRlcy5cbiAgICovXG5cbiAgZnVuY3Rpb24gcmVtb3ZlTmF0aXZlRWxlbWVudCAoKSB7XG4gICAgY2xlYXJGcmFtZSgpXG4gICAgcmVtb3ZlRWxlbWVudChyb290SWQsICcwJywgY3VycmVudE5hdGl2ZUVsZW1lbnQpXG4gICAgY3VycmVudE5hdGl2ZUVsZW1lbnQgPSBudWxsXG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmF0aXZlIGVsZW1lbnQgZnJvbSBhIHZpcnR1YWwgZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IGVudGl0eUlkXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAqIEBwYXJhbSB7T2JqZWN0fSB2bm9kZVxuICAgKlxuICAgKiBAcmV0dXJuIHtIVE1MRG9jdW1lbnRGcmFnbWVudH1cbiAgICovXG5cbiAgZnVuY3Rpb24gdG9OYXRpdmUgKGVudGl0eUlkLCBwYXRoLCB2bm9kZSkge1xuICAgIHN3aXRjaCAodm5vZGUudHlwZSkge1xuICAgICAgY2FzZSAndGV4dCc6IHJldHVybiB0b05hdGl2ZVRleHQodm5vZGUpXG4gICAgICBjYXNlICdlbGVtZW50JzogcmV0dXJuIHRvTmF0aXZlRWxlbWVudChlbnRpdHlJZCwgcGF0aCwgdm5vZGUpXG4gICAgICBjYXNlICdjb21wb25lbnQnOiByZXR1cm4gdG9OYXRpdmVDb21wb25lbnQoZW50aXR5SWQsIHBhdGgsIHZub2RlKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuYXRpdmUgdGV4dCBlbGVtZW50IGZyb20gYSB2aXJ0dWFsIGVsZW1lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSB2bm9kZVxuICAgKi9cblxuICBmdW5jdGlvbiB0b05hdGl2ZVRleHQgKHZub2RlKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKHZub2RlLmRhdGEpXG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmF0aXZlIGVsZW1lbnQgZnJvbSBhIHZpcnR1YWwgZWxlbWVudC5cbiAgICovXG5cbiAgZnVuY3Rpb24gdG9OYXRpdmVFbGVtZW50IChlbnRpdHlJZCwgcGF0aCwgdm5vZGUpIHtcbiAgICB2YXIgYXR0cmlidXRlcyA9IHZub2RlLmF0dHJpYnV0ZXNcbiAgICB2YXIgY2hpbGRyZW4gPSB2bm9kZS5jaGlsZHJlblxuICAgIHZhciB0YWdOYW1lID0gdm5vZGUudGFnTmFtZVxuICAgIHZhciBlbFxuXG4gICAgLy8gY3JlYXRlIGVsZW1lbnQgZWl0aGVyIGZyb20gcG9vbCBvciBmcmVzaC5cbiAgICBpZiAoIW9wdGlvbnMucG9vbGluZyB8fCAhY2FuUG9vbCh0YWdOYW1lKSkge1xuICAgICAgaWYgKHN2Zy5pc0VsZW1lbnQodGFnTmFtZSkpIHtcbiAgICAgICAgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50TlMoc3ZnLm5hbWVzcGFjZSwgdGFnTmFtZSlcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVsID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0YWdOYW1lKVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgcG9vbCA9IGdldFBvb2wodGFnTmFtZSlcbiAgICAgIGVsID0gY2xlYW51cChwb29sLnBvcCgpKVxuICAgICAgaWYgKGVsLnBhcmVudE5vZGUpIGVsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZWwpXG4gICAgfVxuXG4gICAgLy8gc2V0IGF0dHJpYnV0ZXMuXG4gICAgZm9yRWFjaChhdHRyaWJ1dGVzLCBmdW5jdGlvbiAodmFsdWUsIG5hbWUpIHtcbiAgICAgIHNldEF0dHJpYnV0ZShlbnRpdHlJZCwgcGF0aCwgZWwsIG5hbWUsIHZhbHVlKVxuICAgIH0pXG5cbiAgICAvLyBzdG9yZSBrZXlzIG9uIHRoZSBuYXRpdmUgZWxlbWVudCBmb3IgZmFzdCBldmVudCBoYW5kbGluZy5cbiAgICBlbC5fX2VudGl0eV9fID0gZW50aXR5SWRcbiAgICBlbC5fX3BhdGhfXyA9IHBhdGhcblxuICAgIC8vIGFkZCBjaGlsZHJlbi5cbiAgICBmb3JFYWNoKGNoaWxkcmVuLCBmdW5jdGlvbiAoY2hpbGQsIGkpIHtcbiAgICAgIHZhciBjaGlsZEVsID0gdG9OYXRpdmUoZW50aXR5SWQsIHBhdGggKyAnLicgKyBpLCBjaGlsZClcbiAgICAgIGlmICghY2hpbGRFbC5wYXJlbnROb2RlKSBlbC5hcHBlbmRDaGlsZChjaGlsZEVsKVxuICAgIH0pXG5cbiAgICByZXR1cm4gZWxcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuYXRpdmUgZWxlbWVudCBmcm9tIGEgY29tcG9uZW50LlxuICAgKi9cblxuICBmdW5jdGlvbiB0b05hdGl2ZUNvbXBvbmVudCAoZW50aXR5SWQsIHBhdGgsIHZub2RlKSB7XG4gICAgdmFyIGNoaWxkID0gbmV3IEVudGl0eSh2bm9kZS5jb21wb25lbnQsIHZub2RlLnByb3BzLCBlbnRpdHlJZClcbiAgICBjaGlsZHJlbltlbnRpdHlJZF1bcGF0aF0gPSBjaGlsZC5pZFxuICAgIHJldHVybiBtb3VudEVudGl0eShjaGlsZClcbiAgfVxuXG4gIC8qKlxuICAgKiBQYXRjaCBhbiBlbGVtZW50IHdpdGggdGhlIGRpZmYgZnJvbSB0d28gdHJlZXMuXG4gICAqL1xuXG4gIGZ1bmN0aW9uIHBhdGNoIChlbnRpdHlJZCwgcHJldiwgbmV4dCwgZWwpIHtcbiAgICByZXR1cm4gZGlmZk5vZGUoJzAnLCBlbnRpdHlJZCwgcHJldiwgbmV4dCwgZWwpXG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgZGlmZiBiZXR3ZWVuIHR3byB0cmVlcyBvZiBub2Rlcy5cbiAgICovXG5cbiAgZnVuY3Rpb24gZGlmZk5vZGUgKHBhdGgsIGVudGl0eUlkLCBwcmV2LCBuZXh0LCBlbCkge1xuICAgIC8vIFR5cGUgY2hhbmdlZC4gVGhpcyBjb3VsZCBiZSBmcm9tIGVsZW1lbnQtPnRleHQsIHRleHQtPkNvbXBvbmVudEEsXG4gICAgLy8gQ29tcG9uZW50QS0+Q29tcG9uZW50QiBldGMuIEJ1dCBOT1QgZGl2LT5zcGFuLiBUaGVzZSBhcmUgdGhlIHNhbWUgdHlwZVxuICAgIC8vIChFbGVtZW50Tm9kZSkgYnV0IGRpZmZlcmVudCB0YWcgbmFtZS5cbiAgICBpZiAocHJldi50eXBlICE9PSBuZXh0LnR5cGUpIHJldHVybiByZXBsYWNlRWxlbWVudChlbnRpdHlJZCwgcGF0aCwgZWwsIG5leHQpXG5cbiAgICBzd2l0Y2ggKG5leHQudHlwZSkge1xuICAgICAgY2FzZSAndGV4dCc6IHJldHVybiBkaWZmVGV4dChwcmV2LCBuZXh0LCBlbClcbiAgICAgIGNhc2UgJ2VsZW1lbnQnOiByZXR1cm4gZGlmZkVsZW1lbnQocGF0aCwgZW50aXR5SWQsIHByZXYsIG5leHQsIGVsKVxuICAgICAgY2FzZSAnY29tcG9uZW50JzogcmV0dXJuIGRpZmZDb21wb25lbnQocGF0aCwgZW50aXR5SWQsIHByZXYsIG5leHQsIGVsKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBEaWZmIHR3byB0ZXh0IG5vZGVzIGFuZCB1cGRhdGUgdGhlIGVsZW1lbnQuXG4gICAqL1xuXG4gIGZ1bmN0aW9uIGRpZmZUZXh0IChwcmV2aW91cywgY3VycmVudCwgZWwpIHtcbiAgICBpZiAoY3VycmVudC5kYXRhICE9PSBwcmV2aW91cy5kYXRhKSBlbC5kYXRhID0gY3VycmVudC5kYXRhXG4gICAgcmV0dXJuIGVsXG4gIH1cblxuICAvKipcbiAgICogRGlmZiB0aGUgY2hpbGRyZW4gb2YgYW4gRWxlbWVudE5vZGUuXG4gICAqL1xuXG4gIGZ1bmN0aW9uIGRpZmZDaGlsZHJlbiAocGF0aCwgZW50aXR5SWQsIHByZXYsIG5leHQsIGVsKSB7XG4gICAgdmFyIHBvc2l0aW9ucyA9IFtdXG4gICAgdmFyIGhhc0tleXMgPSBmYWxzZVxuICAgIHZhciBjaGlsZE5vZGVzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmFwcGx5KGVsLmNoaWxkTm9kZXMpXG4gICAgdmFyIGxlZnRLZXlzID0gcmVkdWNlKHByZXYuY2hpbGRyZW4sIGtleU1hcFJlZHVjZXIsIHt9KVxuICAgIHZhciByaWdodEtleXMgPSByZWR1Y2UobmV4dC5jaGlsZHJlbiwga2V5TWFwUmVkdWNlciwge30pXG4gICAgdmFyIGN1cnJlbnRDaGlsZHJlbiA9IGFzc2lnbih7fSwgY2hpbGRyZW5bZW50aXR5SWRdKVxuXG4gICAgZnVuY3Rpb24ga2V5TWFwUmVkdWNlciAoYWNjLCBjaGlsZCkge1xuICAgICAgaWYgKGNoaWxkLmtleSAhPSBudWxsKSB7XG4gICAgICAgIGFjY1tjaGlsZC5rZXldID0gY2hpbGRcbiAgICAgICAgaGFzS2V5cyA9IHRydWVcbiAgICAgIH1cbiAgICAgIHJldHVybiBhY2NcbiAgICB9XG5cbiAgICAvLyBEaWZmIGFsbCBvZiB0aGUgbm9kZXMgdGhhdCBoYXZlIGtleXMuIFRoaXMgbGV0cyB1cyByZS11c2VkIGVsZW1lbnRzXG4gICAgLy8gaW5zdGVhZCBvZiBvdmVycmlkaW5nIHRoZW0gYW5kIGxldHMgdXMgbW92ZSB0aGVtIGFyb3VuZC5cbiAgICBpZiAoaGFzS2V5cykge1xuXG4gICAgICAvLyBSZW1vdmFsc1xuICAgICAgZm9yRWFjaChsZWZ0S2V5cywgZnVuY3Rpb24gKGxlZnROb2RlLCBrZXkpIHtcbiAgICAgICAgaWYgKHJpZ2h0S2V5c1trZXldID09IG51bGwpIHtcbiAgICAgICAgICB2YXIgbGVmdFBhdGggPSBwYXRoICsgJy4nICsgbGVmdE5vZGUuaW5kZXhcbiAgICAgICAgICByZW1vdmVFbGVtZW50KFxuICAgICAgICAgICAgZW50aXR5SWQsXG4gICAgICAgICAgICBsZWZ0UGF0aCxcbiAgICAgICAgICAgIGNoaWxkTm9kZXNbbGVmdE5vZGUuaW5kZXhdXG4gICAgICAgICAgKVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICAvLyBVcGRhdGUgbm9kZXNcbiAgICAgIGZvckVhY2gocmlnaHRLZXlzLCBmdW5jdGlvbiAocmlnaHROb2RlLCBrZXkpIHtcbiAgICAgICAgdmFyIGxlZnROb2RlID0gbGVmdEtleXNba2V5XVxuXG4gICAgICAgIC8vIFdlIG9ubHkgd2FudCB1cGRhdGVzIGZvciBub3dcbiAgICAgICAgaWYgKGxlZnROb2RlID09IG51bGwpIHJldHVyblxuXG4gICAgICAgIHZhciBsZWZ0UGF0aCA9IHBhdGggKyAnLicgKyBsZWZ0Tm9kZS5pbmRleFxuXG4gICAgICAgIC8vIFVwZGF0ZWRcbiAgICAgICAgcG9zaXRpb25zW3JpZ2h0Tm9kZS5pbmRleF0gPSBkaWZmTm9kZShcbiAgICAgICAgICBsZWZ0UGF0aCxcbiAgICAgICAgICBlbnRpdHlJZCxcbiAgICAgICAgICBsZWZ0Tm9kZSxcbiAgICAgICAgICByaWdodE5vZGUsXG4gICAgICAgICAgY2hpbGROb2Rlc1tsZWZ0Tm9kZS5pbmRleF1cbiAgICAgICAgKVxuICAgICAgfSlcblxuICAgICAgLy8gVXBkYXRlIHRoZSBwb3NpdGlvbnMgb2YgYWxsIGNoaWxkIGNvbXBvbmVudHMgYW5kIGV2ZW50IGhhbmRsZXJzXG4gICAgICBmb3JFYWNoKHJpZ2h0S2V5cywgZnVuY3Rpb24gKHJpZ2h0Tm9kZSwga2V5KSB7XG4gICAgICAgIHZhciBsZWZ0Tm9kZSA9IGxlZnRLZXlzW2tleV1cblxuICAgICAgICAvLyBXZSBqdXN0IHdhbnQgZWxlbWVudHMgdGhhdCBoYXZlIG1vdmVkIGFyb3VuZFxuICAgICAgICBpZiAobGVmdE5vZGUgPT0gbnVsbCB8fCBsZWZ0Tm9kZS5pbmRleCA9PT0gcmlnaHROb2RlLmluZGV4KSByZXR1cm5cblxuICAgICAgICB2YXIgcmlnaHRQYXRoID0gcGF0aCArICcuJyArIHJpZ2h0Tm9kZS5pbmRleFxuICAgICAgICB2YXIgbGVmdFBhdGggPSBwYXRoICsgJy4nICsgbGVmdE5vZGUuaW5kZXhcblxuICAgICAgICAvLyBVcGRhdGUgYWxsIHRoZSBjaGlsZCBjb21wb25lbnQgcGF0aCBwb3NpdGlvbnMgdG8gbWF0Y2hcbiAgICAgICAgLy8gdGhlIGxhdGVzdCBwb3NpdGlvbnMgaWYgdGhleSd2ZSBjaGFuZ2VkLiBUaGlzIGlzIGEgYml0IGhhY2t5LlxuICAgICAgICBmb3JFYWNoKGN1cnJlbnRDaGlsZHJlbiwgZnVuY3Rpb24gKGNoaWxkSWQsIGNoaWxkUGF0aCkge1xuICAgICAgICAgIGlmIChsZWZ0UGF0aCA9PT0gY2hpbGRQYXRoKSB7XG4gICAgICAgICAgICBkZWxldGUgY2hpbGRyZW5bZW50aXR5SWRdW2NoaWxkUGF0aF1cbiAgICAgICAgICAgIGNoaWxkcmVuW2VudGl0eUlkXVtyaWdodFBhdGhdID0gY2hpbGRJZFxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH0pXG5cbiAgICAgIC8vIE5vdyBhZGQgYWxsIG9mIHRoZSBuZXcgbm9kZXMgbGFzdCBpbiBjYXNlIHRoZWlyIHBhdGhcbiAgICAgIC8vIHdvdWxkIGhhdmUgY29uZmxpY3RlZCB3aXRoIG9uZSBvZiB0aGUgcHJldmlvdXMgcGF0aHMuXG4gICAgICBmb3JFYWNoKHJpZ2h0S2V5cywgZnVuY3Rpb24gKHJpZ2h0Tm9kZSwga2V5KSB7XG4gICAgICAgIHZhciByaWdodFBhdGggPSBwYXRoICsgJy4nICsgcmlnaHROb2RlLmluZGV4XG4gICAgICAgIGlmIChsZWZ0S2V5c1trZXldID09IG51bGwpIHtcbiAgICAgICAgICBwb3NpdGlvbnNbcmlnaHROb2RlLmluZGV4XSA9IHRvTmF0aXZlKFxuICAgICAgICAgICAgZW50aXR5SWQsXG4gICAgICAgICAgICByaWdodFBhdGgsXG4gICAgICAgICAgICByaWdodE5vZGVcbiAgICAgICAgICApXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIG1heExlbmd0aCA9IE1hdGgubWF4KHByZXYuY2hpbGRyZW4ubGVuZ3RoLCBuZXh0LmNoaWxkcmVuLmxlbmd0aClcblxuICAgICAgLy8gTm93IGRpZmYgYWxsIG9mIHRoZSBub2RlcyB0aGF0IGRvbid0IGhhdmUga2V5c1xuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBtYXhMZW5ndGg7IGkrKykge1xuICAgICAgICB2YXIgbGVmdE5vZGUgPSBwcmV2LmNoaWxkcmVuW2ldXG4gICAgICAgIHZhciByaWdodE5vZGUgPSBuZXh0LmNoaWxkcmVuW2ldXG5cbiAgICAgICAgLy8gUmVtb3ZhbHNcbiAgICAgICAgaWYgKHJpZ2h0Tm9kZSA9PSBudWxsKSB7XG4gICAgICAgICAgcmVtb3ZlRWxlbWVudChcbiAgICAgICAgICAgIGVudGl0eUlkLFxuICAgICAgICAgICAgcGF0aCArICcuJyArIGxlZnROb2RlLmluZGV4LFxuICAgICAgICAgICAgY2hpbGROb2Rlc1tsZWZ0Tm9kZS5pbmRleF1cbiAgICAgICAgICApXG4gICAgICAgIH1cblxuICAgICAgICAvLyBOZXcgTm9kZVxuICAgICAgICBpZiAobGVmdE5vZGUgPT0gbnVsbCkge1xuICAgICAgICAgIHBvc2l0aW9uc1tyaWdodE5vZGUuaW5kZXhdID0gdG9OYXRpdmUoXG4gICAgICAgICAgICBlbnRpdHlJZCxcbiAgICAgICAgICAgIHBhdGggKyAnLicgKyByaWdodE5vZGUuaW5kZXgsXG4gICAgICAgICAgICByaWdodE5vZGVcbiAgICAgICAgICApXG4gICAgICAgIH1cblxuICAgICAgICAvLyBVcGRhdGVkXG4gICAgICAgIGlmIChsZWZ0Tm9kZSAmJiByaWdodE5vZGUpIHtcbiAgICAgICAgICBwb3NpdGlvbnNbbGVmdE5vZGUuaW5kZXhdID0gZGlmZk5vZGUoXG4gICAgICAgICAgICBwYXRoICsgJy4nICsgbGVmdE5vZGUuaW5kZXgsXG4gICAgICAgICAgICBlbnRpdHlJZCxcbiAgICAgICAgICAgIGxlZnROb2RlLFxuICAgICAgICAgICAgcmlnaHROb2RlLFxuICAgICAgICAgICAgY2hpbGROb2Rlc1tsZWZ0Tm9kZS5pbmRleF1cbiAgICAgICAgICApXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBSZXBvc2l0aW9uIGFsbCB0aGUgZWxlbWVudHNcbiAgICBmb3JFYWNoKHBvc2l0aW9ucywgZnVuY3Rpb24gKGNoaWxkRWwsIG5ld1Bvc2l0aW9uKSB7XG4gICAgICB2YXIgdGFyZ2V0ID0gZWwuY2hpbGROb2Rlc1tuZXdQb3NpdGlvbl1cbiAgICAgIGlmIChjaGlsZEVsICE9PSB0YXJnZXQpIHtcbiAgICAgICAgaWYgKHRhcmdldCkge1xuICAgICAgICAgIGVsLmluc2VydEJlZm9yZShjaGlsZEVsLCB0YXJnZXQpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZWwuYXBwZW5kQ2hpbGQoY2hpbGRFbClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogRGlmZiB0aGUgYXR0cmlidXRlcyBhbmQgYWRkL3JlbW92ZSB0aGVtLlxuICAgKi9cblxuICBmdW5jdGlvbiBkaWZmQXR0cmlidXRlcyAocHJldiwgbmV4dCwgZWwsIGVudGl0eUlkLCBwYXRoKSB7XG4gICAgdmFyIG5leHRBdHRycyA9IG5leHQuYXR0cmlidXRlc1xuICAgIHZhciBwcmV2QXR0cnMgPSBwcmV2LmF0dHJpYnV0ZXNcblxuICAgIC8vIGFkZCBuZXcgYXR0cnNcbiAgICBmb3JFYWNoKG5leHRBdHRycywgZnVuY3Rpb24gKHZhbHVlLCBuYW1lKSB7XG4gICAgICBpZiAoZXZlbnRzW25hbWVdIHx8ICEobmFtZSBpbiBwcmV2QXR0cnMpIHx8IHByZXZBdHRyc1tuYW1lXSAhPT0gdmFsdWUpIHtcbiAgICAgICAgc2V0QXR0cmlidXRlKGVudGl0eUlkLCBwYXRoLCBlbCwgbmFtZSwgdmFsdWUpXG4gICAgICB9XG4gICAgfSlcblxuICAgIC8vIHJlbW92ZSBvbGQgYXR0cnNcbiAgICBmb3JFYWNoKHByZXZBdHRycywgZnVuY3Rpb24gKHZhbHVlLCBuYW1lKSB7XG4gICAgICBpZiAoIShuYW1lIGluIG5leHRBdHRycykpIHtcbiAgICAgICAgcmVtb3ZlQXR0cmlidXRlKGVudGl0eUlkLCBwYXRoLCBlbCwgbmFtZSlcbiAgICAgIH1cbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSBhIGNvbXBvbmVudCB3aXRoIHRoZSBwcm9wcyBmcm9tIHRoZSBuZXh0IG5vZGUuIElmXG4gICAqIHRoZSBjb21wb25lbnQgdHlwZSBoYXMgY2hhbmdlZCwgd2UnbGwganVzdCByZW1vdmUgdGhlIG9sZCBvbmVcbiAgICogYW5kIHJlcGxhY2UgaXQgd2l0aCB0aGUgbmV3IGNvbXBvbmVudC5cbiAgICovXG5cbiAgZnVuY3Rpb24gZGlmZkNvbXBvbmVudCAocGF0aCwgZW50aXR5SWQsIHByZXYsIG5leHQsIGVsKSB7XG4gICAgaWYgKG5leHQuY29tcG9uZW50ICE9PSBwcmV2LmNvbXBvbmVudCkge1xuICAgICAgcmV0dXJuIHJlcGxhY2VFbGVtZW50KGVudGl0eUlkLCBwYXRoLCBlbCwgbmV4dClcbiAgICB9IGVsc2Uge1xuICAgICAgdmFyIHRhcmdldElkID0gY2hpbGRyZW5bZW50aXR5SWRdW3BhdGhdXG5cbiAgICAgIC8vIFRoaXMgaXMgYSBoYWNrIGZvciBub3dcbiAgICAgIGlmICh0YXJnZXRJZCkge1xuICAgICAgICB1cGRhdGVFbnRpdHlQcm9wcyh0YXJnZXRJZCwgbmV4dC5wcm9wcylcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGVsXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERpZmYgdHdvIGVsZW1lbnQgbm9kZXMuXG4gICAqL1xuXG4gIGZ1bmN0aW9uIGRpZmZFbGVtZW50IChwYXRoLCBlbnRpdHlJZCwgcHJldiwgbmV4dCwgZWwpIHtcbiAgICBpZiAobmV4dC50YWdOYW1lICE9PSBwcmV2LnRhZ05hbWUpIHJldHVybiByZXBsYWNlRWxlbWVudChlbnRpdHlJZCwgcGF0aCwgZWwsIG5leHQpXG4gICAgZGlmZkF0dHJpYnV0ZXMocHJldiwgbmV4dCwgZWwsIGVudGl0eUlkLCBwYXRoKVxuICAgIGRpZmZDaGlsZHJlbihwYXRoLCBlbnRpdHlJZCwgcHJldiwgbmV4dCwgZWwpXG4gICAgcmV0dXJuIGVsXG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlcyBhbiBlbGVtZW50IGZyb20gdGhlIERPTSBhbmQgdW5tb3VudHMgYW5kIGNvbXBvbmVudHNcbiAgICogdGhhdCBhcmUgd2l0aGluIHRoYXQgYnJhbmNoXG4gICAqXG4gICAqIHNpZGUgZWZmZWN0czpcbiAgICogICAtIHJlbW92ZXMgZWxlbWVudCBmcm9tIHRoZSBET01cbiAgICogICAtIHJlbW92ZXMgaW50ZXJuYWwgcmVmZXJlbmNlc1xuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gZW50aXR5SWRcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxcbiAgICovXG5cbiAgZnVuY3Rpb24gcmVtb3ZlRWxlbWVudCAoZW50aXR5SWQsIHBhdGgsIGVsKSB7XG4gICAgdmFyIGNoaWxkcmVuQnlQYXRoID0gY2hpbGRyZW5bZW50aXR5SWRdXG4gICAgdmFyIGNoaWxkSWQgPSBjaGlsZHJlbkJ5UGF0aFtwYXRoXVxuICAgIHZhciBlbnRpdHlIYW5kbGVycyA9IGhhbmRsZXJzW2VudGl0eUlkXSB8fCB7fVxuICAgIHZhciByZW1vdmFscyA9IFtdXG5cbiAgICAvLyBJZiB0aGUgcGF0aCBwb2ludHMgdG8gYSBjb21wb25lbnQgd2Ugc2hvdWxkIHVzZSB0aGF0XG4gICAgLy8gY29tcG9uZW50cyBlbGVtZW50IGluc3RlYWQsIGJlY2F1c2UgaXQgbWlnaHQgaGF2ZSBtb3ZlZCBpdC5cbiAgICBpZiAoY2hpbGRJZCkge1xuICAgICAgdmFyIGNoaWxkID0gZW50aXRpZXNbY2hpbGRJZF1cbiAgICAgIGVsID0gY2hpbGQubmF0aXZlRWxlbWVudFxuICAgICAgdW5tb3VudEVudGl0eShjaGlsZElkKVxuICAgICAgcmVtb3ZhbHMucHVzaChwYXRoKVxuICAgIH0gZWxzZSB7XG5cbiAgICAgIC8vIEp1c3QgcmVtb3ZlIHRoZSB0ZXh0IG5vZGVcbiAgICAgIGlmICghaXNFbGVtZW50KGVsKSkgcmV0dXJuIGVsLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQoZWwpXG5cbiAgICAgIC8vIFRoZW4gd2UgbmVlZCB0byBmaW5kIGFueSBjb21wb25lbnRzIHdpdGhpbiB0aGlzXG4gICAgICAvLyBicmFuY2ggYW5kIHVubW91bnQgdGhlbS5cbiAgICAgIGZvckVhY2goY2hpbGRyZW5CeVBhdGgsIGZ1bmN0aW9uIChjaGlsZElkLCBjaGlsZFBhdGgpIHtcbiAgICAgICAgaWYgKGNoaWxkUGF0aCA9PT0gcGF0aCB8fCBpc1dpdGhpblBhdGgocGF0aCwgY2hpbGRQYXRoKSkge1xuICAgICAgICAgIHVubW91bnRFbnRpdHkoY2hpbGRJZClcbiAgICAgICAgICByZW1vdmFscy5wdXNoKGNoaWxkUGF0aClcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgICAgLy8gUmVtb3ZlIGFsbCBldmVudHMgYXQgdGhpcyBwYXRoIG9yIGJlbG93IGl0XG4gICAgICBmb3JFYWNoKGVudGl0eUhhbmRsZXJzLCBmdW5jdGlvbiAoZm4sIGhhbmRsZXJQYXRoKSB7XG4gICAgICAgIGlmIChoYW5kbGVyUGF0aCA9PT0gcGF0aCB8fCBpc1dpdGhpblBhdGgocGF0aCwgaGFuZGxlclBhdGgpKSB7XG4gICAgICAgICAgcmVtb3ZlRXZlbnQoZW50aXR5SWQsIGhhbmRsZXJQYXRoKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cblxuICAgIC8vIFJlbW92ZSB0aGUgcGF0aHMgZnJvbSB0aGUgb2JqZWN0IHdpdGhvdXQgdG91Y2hpbmcgdGhlXG4gICAgLy8gb2xkIG9iamVjdC4gVGhpcyBrZWVwcyB0aGUgb2JqZWN0IHVzaW5nIGZhc3QgcHJvcGVydGllcy5cbiAgICBmb3JFYWNoKHJlbW92YWxzLCBmdW5jdGlvbiAocGF0aCkge1xuICAgICAgZGVsZXRlIGNoaWxkcmVuW2VudGl0eUlkXVtwYXRoXVxuICAgIH0pXG5cbiAgICAvLyBSZW1vdmUgaXQgZnJvbSB0aGUgRE9NXG4gICAgZWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbClcblxuICAgIC8vIFJldHVybiBhbGwgb2YgdGhlIGVsZW1lbnRzIGluIHRoaXMgbm9kZSB0cmVlIHRvIHRoZSBwb29sXG4gICAgLy8gc28gdGhhdCB0aGUgZWxlbWVudHMgY2FuIGJlIHJlLXVzZWQuXG4gICAgaWYgKG9wdGlvbnMucG9vbGluZykge1xuICAgICAgd2FsayhlbCwgZnVuY3Rpb24gKG5vZGUpIHtcbiAgICAgICAgaWYgKCFpc0VsZW1lbnQobm9kZSkgfHwgIWNhblBvb2wobm9kZS50YWdOYW1lKSkgcmV0dXJuXG4gICAgICAgIGdldFBvb2wobm9kZS50YWdOYW1lLnRvTG93ZXJDYXNlKCkpLnB1c2gobm9kZSlcbiAgICAgIH0pXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlcGxhY2UgYW4gZWxlbWVudCBpbiB0aGUgRE9NLiBSZW1vdmluZyBhbGwgY29tcG9uZW50c1xuICAgKiB3aXRoaW4gdGhhdCBlbGVtZW50IGFuZCByZS1yZW5kZXJpbmcgdGhlIG5ldyB2aXJ0dWFsIG5vZGUuXG4gICAqXG4gICAqIEBwYXJhbSB7RW50aXR5fSBlbnRpdHlcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxcbiAgICogQHBhcmFtIHtPYmplY3R9IHZub2RlXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuXG4gIGZ1bmN0aW9uIHJlcGxhY2VFbGVtZW50IChlbnRpdHlJZCwgcGF0aCwgZWwsIHZub2RlKSB7XG4gICAgdmFyIHBhcmVudCA9IGVsLnBhcmVudE5vZGVcbiAgICB2YXIgaW5kZXggPSBBcnJheS5wcm90b3R5cGUuaW5kZXhPZi5jYWxsKHBhcmVudC5jaGlsZE5vZGVzLCBlbClcblxuICAgIC8vIHJlbW92ZSB0aGUgcHJldmlvdXMgZWxlbWVudCBhbmQgYWxsIG5lc3RlZCBjb21wb25lbnRzLiBUaGlzXG4gICAgLy8gbmVlZHMgdG8gaGFwcGVuIGJlZm9yZSB3ZSBjcmVhdGUgdGhlIG5ldyBlbGVtZW50IHNvIHdlIGRvbid0XG4gICAgLy8gZ2V0IGNsYXNoZXMgb24gdGhlIGNvbXBvbmVudCBwYXRocy5cbiAgICByZW1vdmVFbGVtZW50KGVudGl0eUlkLCBwYXRoLCBlbClcblxuICAgIC8vIHRoZW4gYWRkIHRoZSBuZXcgZWxlbWVudCBpbiB0aGVyZVxuICAgIHZhciBuZXdFbCA9IHRvTmF0aXZlKGVudGl0eUlkLCBwYXRoLCB2bm9kZSlcbiAgICB2YXIgdGFyZ2V0ID0gcGFyZW50LmNoaWxkTm9kZXNbaW5kZXhdXG5cbiAgICBpZiAodGFyZ2V0KSB7XG4gICAgICBwYXJlbnQuaW5zZXJ0QmVmb3JlKG5ld0VsLCB0YXJnZXQpXG4gICAgfSBlbHNlIHtcbiAgICAgIHBhcmVudC5hcHBlbmRDaGlsZChuZXdFbClcbiAgICB9XG5cbiAgICAvLyB3YWxrIHVwIHRoZSB0cmVlIGFuZCB1cGRhdGUgYWxsIGBlbnRpdHkubmF0aXZlRWxlbWVudGAgcmVmZXJlbmNlcy5cbiAgICBpZiAoZW50aXR5SWQgIT09ICdyb290JyAmJiBwYXRoID09PSAnMCcpIHtcbiAgICAgIHVwZGF0ZU5hdGl2ZUVsZW1lbnQoZW50aXR5SWQsIG5ld0VsKVxuICAgIH1cblxuICAgIHJldHVybiBuZXdFbFxuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSBhbGwgZW50aXRpZXMgaW4gYSBicmFuY2ggdGhhdCBoYXZlIHRoZSBzYW1lIG5hdGl2ZUVsZW1lbnQuIFRoaXNcbiAgICogaGFwcGVucyB3aGVuIGEgY29tcG9uZW50IGhhcyBhbm90aGVyIGNvbXBvbmVudCBhcyBpdCdzIHJvb3Qgbm9kZS5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IGVudGl0eUlkXG4gICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IG5ld0VsXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuXG4gIGZ1bmN0aW9uIHVwZGF0ZU5hdGl2ZUVsZW1lbnQgKGVudGl0eUlkLCBuZXdFbCkge1xuICAgIHZhciB0YXJnZXQgPSBlbnRpdGllc1tlbnRpdHlJZF1cbiAgICBpZiAodGFyZ2V0Lm93bmVySWQgPT09ICdyb290JykgcmV0dXJuXG4gICAgaWYgKGNoaWxkcmVuW3RhcmdldC5vd25lcklkXVsnMCddID09PSBlbnRpdHlJZCkge1xuICAgICAgZW50aXRpZXNbdGFyZ2V0Lm93bmVySWRdLm5hdGl2ZUVsZW1lbnQgPSBuZXdFbFxuICAgICAgdXBkYXRlTmF0aXZlRWxlbWVudCh0YXJnZXQub3duZXJJZCwgbmV3RWwpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFNldCB0aGUgYXR0cmlidXRlIG9mIGFuIGVsZW1lbnQsIHBlcmZvcm1pbmcgYWRkaXRpb25hbCB0cmFuc2Zvcm1hdGlvbnNcbiAgICogZGVwZW5kbmluZyBvbiB0aGUgYXR0cmlidXRlIG5hbWVcbiAgICpcbiAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAgICogQHBhcmFtIHtTdHJpbmd9IHZhbHVlXG4gICAqL1xuXG4gIGZ1bmN0aW9uIHNldEF0dHJpYnV0ZSAoZW50aXR5SWQsIHBhdGgsIGVsLCBuYW1lLCB2YWx1ZSkge1xuICAgIGlmIChldmVudHNbbmFtZV0pIHtcbiAgICAgIGFkZEV2ZW50KGVudGl0eUlkLCBwYXRoLCBldmVudHNbbmFtZV0sIHZhbHVlKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIHN3aXRjaCAobmFtZSkge1xuICAgICAgY2FzZSAnY2hlY2tlZCc6XG4gICAgICBjYXNlICdkaXNhYmxlZCc6XG4gICAgICBjYXNlICdzZWxlY3RlZCc6XG4gICAgICAgIGVsW25hbWVdID0gdHJ1ZVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSAnaW5uZXJIVE1MJzpcbiAgICAgIGNhc2UgJ3ZhbHVlJzpcbiAgICAgICAgZWxbbmFtZV0gPSB2YWx1ZVxuICAgICAgICBicmVha1xuICAgICAgY2FzZSBzdmcuaXNBdHRyaWJ1dGUobmFtZSk6XG4gICAgICAgIGVsLnNldEF0dHJpYnV0ZU5TKHN2Zy5uYW1lc3BhY2UsIG5hbWUsIHZhbHVlKVxuICAgICAgICBicmVha1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgZWwuc2V0QXR0cmlidXRlKG5hbWUsIHZhbHVlKVxuICAgICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYW4gYXR0cmlidXRlLCBwZXJmb3JtaW5nIGFkZGl0aW9uYWwgdHJhbnNmb3JtYXRpb25zXG4gICAqIGRlcGVuZG5pbmcgb24gdGhlIGF0dHJpYnV0ZSBuYW1lXG4gICAqXG4gICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gICAqL1xuXG4gIGZ1bmN0aW9uIHJlbW92ZUF0dHJpYnV0ZSAoZW50aXR5SWQsIHBhdGgsIGVsLCBuYW1lKSB7XG4gICAgaWYgKGV2ZW50c1tuYW1lXSkge1xuICAgICAgcmVtb3ZlRXZlbnQoZW50aXR5SWQsIHBhdGgsIGV2ZW50c1tuYW1lXSlcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICBzd2l0Y2ggKG5hbWUpIHtcbiAgICAgIGNhc2UgJ2NoZWNrZWQnOlxuICAgICAgY2FzZSAnZGlzYWJsZWQnOlxuICAgICAgY2FzZSAnc2VsZWN0ZWQnOlxuICAgICAgICBlbFtuYW1lXSA9IGZhbHNlXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdpbm5lckhUTUwnOlxuICAgICAgY2FzZSAndmFsdWUnOlxuICAgICAgICBlbFtuYW1lXSA9IFwiXCJcbiAgICAgICAgYnJlYWtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShuYW1lKVxuICAgICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDaGVja3MgdG8gc2VlIGlmIG9uZSB0cmVlIHBhdGggaXMgd2l0aGluXG4gICAqIGFub3RoZXIgdHJlZSBwYXRoLiBFeGFtcGxlOlxuICAgKlxuICAgKiAwLjEgdnMgMC4xLjEgPSB0cnVlXG4gICAqIDAuMiB2cyAwLjMuNSA9IGZhbHNlXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB0YXJnZXRcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICpcbiAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICovXG5cbiAgZnVuY3Rpb24gaXNXaXRoaW5QYXRoICh0YXJnZXQsIHBhdGgpIHtcbiAgICByZXR1cm4gcGF0aC5pbmRleE9mKHRhcmdldCArICcuJykgPT09IDBcbiAgfVxuXG4gIC8qKlxuICAgKiBJcyB0aGUgRE9NIG5vZGUgYW4gZWxlbWVudCBub2RlXG4gICAqXG4gICAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGVsXG4gICAqXG4gICAqIEByZXR1cm4ge0Jvb2xlYW59XG4gICAqL1xuXG4gIGZ1bmN0aW9uIGlzRWxlbWVudCAoZWwpIHtcbiAgICByZXR1cm4gISFlbC50YWdOYW1lXG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSBwb29sIGZvciBhIHRhZ05hbWUsIGNyZWF0aW5nIGl0IGlmIGl0XG4gICAqIGRvZXNuJ3QgZXhpc3QuXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSB0YWdOYW1lXG4gICAqXG4gICAqIEByZXR1cm4ge1Bvb2x9XG4gICAqL1xuXG4gIGZ1bmN0aW9uIGdldFBvb2wgKHRhZ05hbWUpIHtcbiAgICB2YXIgcG9vbCA9IHBvb2xzW3RhZ05hbWVdXG4gICAgaWYgKCFwb29sKSB7XG4gICAgICB2YXIgcG9vbE9wdHMgPSBzdmcuaXNFbGVtZW50KHRhZ05hbWUpID9cbiAgICAgICAgeyBuYW1lc3BhY2U6IHN2Zy5uYW1lc3BhY2UsIHRhZ05hbWU6IHRhZ05hbWUgfSA6XG4gICAgICAgIHsgdGFnTmFtZTogdGFnTmFtZSB9XG4gICAgICBwb29sID0gcG9vbHNbdGFnTmFtZV0gPSBuZXcgUG9vbChwb29sT3B0cylcbiAgICB9XG4gICAgcmV0dXJuIHBvb2xcbiAgfVxuXG4gIC8qKlxuICAgKiBDbGVhbiB1cCBwcmV2aW91c2x5IHVzZWQgbmF0aXZlIGVsZW1lbnQgZm9yIHJldXNlLlxuICAgKlxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbFxuICAgKi9cblxuICBmdW5jdGlvbiBjbGVhbnVwIChlbCkge1xuICAgIHJlbW92ZUFsbENoaWxkcmVuKGVsKVxuICAgIHJlbW92ZUFsbEF0dHJpYnV0ZXMoZWwpXG4gICAgcmV0dXJuIGVsXG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGFsbCB0aGUgYXR0cmlidXRlcyBmcm9tIGEgbm9kZVxuICAgKlxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbFxuICAgKi9cblxuICBmdW5jdGlvbiByZW1vdmVBbGxBdHRyaWJ1dGVzIChlbCkge1xuICAgIGZvciAodmFyIGkgPSBlbC5hdHRyaWJ1dGVzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgICB2YXIgbmFtZSA9IGVsLmF0dHJpYnV0ZXNbaV0ubmFtZVxuICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKG5hbWUpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhbGwgdGhlIGNoaWxkIG5vZGVzIGZyb20gYW4gZWxlbWVudFxuICAgKlxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbFxuICAgKi9cblxuICBmdW5jdGlvbiByZW1vdmVBbGxDaGlsZHJlbiAoZWwpIHtcbiAgICB3aGlsZSAoZWwuZmlyc3RDaGlsZCkgZWwucmVtb3ZlQ2hpbGQoZWwuZmlyc3RDaGlsZClcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmlnZ2VyIGEgaG9vayBvbiBhIGNvbXBvbmVudC5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWUgTmFtZSBvZiBob29rLlxuICAgKiBAcGFyYW0ge0VudGl0eX0gZW50aXR5IFRoZSBjb21wb25lbnQgaW5zdGFuY2UuXG4gICAqIEBwYXJhbSB7QXJyYXl9IGFyZ3MgVG8gcGFzcyBhbG9uZyB0byBob29rLlxuICAgKi9cblxuICBmdW5jdGlvbiB0cmlnZ2VyIChuYW1lLCBlbnRpdHksIGFyZ3MpIHtcbiAgICBpZiAodHlwZW9mIGVudGl0eS5jb21wb25lbnRbbmFtZV0gIT09ICdmdW5jdGlvbicpIHJldHVyblxuICAgIHJldHVybiBlbnRpdHkuY29tcG9uZW50W25hbWVdLmFwcGx5KG51bGwsIGFyZ3MpXG4gIH1cblxuICAvKipcbiAgICogVHJpZ2dlciBhIGhvb2sgb24gdGhlIGNvbXBvbmVudCBhbmQgYWxsb3cgc3RhdGUgdG8gYmVcbiAgICogdXBkYXRlZCB0b28uXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBlbnRpdHlcbiAgICogQHBhcmFtIHtBcnJheX0gYXJnc1xuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cblxuICBmdW5jdGlvbiB0cmlnZ2VyVXBkYXRlIChuYW1lLCBlbnRpdHksIGFyZ3MpIHtcbiAgICB2YXIgdXBkYXRlID0gc2V0U3RhdGUoZW50aXR5KVxuICAgIGFyZ3MucHVzaCh1cGRhdGUpXG4gICAgdmFyIHJlc3VsdCA9IHRyaWdnZXIobmFtZSwgZW50aXR5LCBhcmdzKVxuICAgIGlmIChyZXN1bHQpIHtcbiAgICAgIHVwZGF0ZUVudGl0eVN0YXRlQXN5bmMoZW50aXR5LCByZXN1bHQpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSB0aGUgZW50aXR5IHN0YXRlIHVzaW5nIGEgcHJvbWlzZVxuICAgKlxuICAgKiBAcGFyYW0ge0VudGl0eX0gZW50aXR5XG4gICAqIEBwYXJhbSB7UHJvbWlzZX0gcHJvbWlzZVxuICAgKi9cblxuICBmdW5jdGlvbiB1cGRhdGVFbnRpdHlTdGF0ZUFzeW5jIChlbnRpdHksIHZhbHVlKSB7XG4gICAgaWYgKGlzUHJvbWlzZSh2YWx1ZSkpIHtcbiAgICAgIHZhbHVlLnRoZW4oZnVuY3Rpb24gKG5ld1N0YXRlKSB7XG4gICAgICAgIHVwZGF0ZUVudGl0eVN0YXRlKGVudGl0eSwgbmV3U3RhdGUpXG4gICAgICB9KVxuICAgIH0gZWxzZSB7XG4gICAgICB1cGRhdGVFbnRpdHlTdGF0ZShlbnRpdHksIHZhbHVlKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGUgYW4gZW50aXR5IHRvIG1hdGNoIHRoZSBsYXRlc3QgcmVuZGVyZWQgdm9kZS4gV2UgYWx3YXlzXG4gICAqIHJlcGxhY2UgdGhlIHByb3BzIG9uIHRoZSBjb21wb25lbnQgd2hlbiBjb21wb3NpbmcgdGhlbS4gVGhpc1xuICAgKiB3aWxsIHRyaWdnZXIgYSByZS1yZW5kZXIgb24gYWxsIGNoaWxkcmVuIGJlbG93IHRoaXMgcG9pbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7RW50aXR5fSBlbnRpdHlcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICogQHBhcmFtIHtPYmplY3R9IHZub2RlXG4gICAqXG4gICAqIEByZXR1cm4ge3ZvaWR9XG4gICAqL1xuXG4gIGZ1bmN0aW9uIHVwZGF0ZUVudGl0eVByb3BzIChlbnRpdHlJZCwgbmV4dFByb3BzKSB7XG4gICAgdmFyIGVudGl0eSA9IGVudGl0aWVzW2VudGl0eUlkXVxuICAgIGVudGl0eS5wZW5kaW5nUHJvcHMgPSBuZXh0UHJvcHNcbiAgICBlbnRpdHkuZGlydHkgPSB0cnVlXG4gICAgaW52YWxpZGF0ZSgpXG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIGNvbXBvbmVudCBpbnN0YW5jZSBzdGF0ZS5cbiAgICovXG5cbiAgZnVuY3Rpb24gdXBkYXRlRW50aXR5U3RhdGUgKGVudGl0eSwgbmV4dFN0YXRlKSB7XG4gICAgZW50aXR5LnBlbmRpbmdTdGF0ZSA9IGFzc2lnbihlbnRpdHkucGVuZGluZ1N0YXRlLCBuZXh0U3RhdGUpXG4gICAgZW50aXR5LmRpcnR5ID0gdHJ1ZVxuICAgIGludmFsaWRhdGUoKVxuICB9XG5cbiAgLyoqXG4gICAqIENvbW1pdCBwcm9wcyBhbmQgc3RhdGUgY2hhbmdlcyB0byBhbiBlbnRpdHkuXG4gICAqL1xuXG4gIGZ1bmN0aW9uIGNvbW1pdCAoZW50aXR5KSB7XG4gICAgZW50aXR5LmNvbnRleHQgPSB7XG4gICAgICBzdGF0ZTogZW50aXR5LnBlbmRpbmdTdGF0ZSxcbiAgICAgIHByb3BzOiBlbnRpdHkucGVuZGluZ1Byb3BzLFxuICAgICAgaWQ6IGVudGl0eS5pZFxuICAgIH1cbiAgICBlbnRpdHkucGVuZGluZ1N0YXRlID0gYXNzaWduKHt9LCBlbnRpdHkuY29udGV4dC5zdGF0ZSlcbiAgICBlbnRpdHkucGVuZGluZ1Byb3BzID0gYXNzaWduKHt9LCBlbnRpdHkuY29udGV4dC5wcm9wcylcbiAgICB2YWxpZGF0ZVByb3BzKGVudGl0eS5jb250ZXh0LnByb3BzLCBlbnRpdHkucHJvcFR5cGVzKVxuICAgIGVudGl0eS5kaXJ0eSA9IGZhbHNlXG4gIH1cblxuICAvKipcbiAgICogVHJ5IHRvIGF2b2lkIGNyZWF0aW5nIG5ldyB2aXJ0dWFsIGRvbSBpZiBwb3NzaWJsZS5cbiAgICpcbiAgICogTGF0ZXIgd2UgbWF5IGV4cG9zZSB0aGlzIHNvIHlvdSBjYW4gb3ZlcnJpZGUsIGJ1dCBub3QgdGhlcmUgeWV0LlxuICAgKi9cblxuICBmdW5jdGlvbiBzaG91bGRVcGRhdGUgKGVudGl0eSkge1xuICAgIGlmICghZW50aXR5LmRpcnR5KSByZXR1cm4gZmFsc2VcbiAgICBpZiAoIWVudGl0eS5jb21wb25lbnQuc2hvdWxkVXBkYXRlKSByZXR1cm4gdHJ1ZVxuICAgIHZhciBuZXh0UHJvcHMgPSBlbnRpdHkucGVuZGluZ1Byb3BzXG4gICAgdmFyIG5leHRTdGF0ZSA9IGVudGl0eS5wZW5kaW5nU3RhdGVcbiAgICB2YXIgYm9vbCA9IGVudGl0eS5jb21wb25lbnQuc2hvdWxkVXBkYXRlKGVudGl0eS5jb250ZXh0LCBuZXh0UHJvcHMsIG5leHRTdGF0ZSlcbiAgICByZXR1cm4gYm9vbFxuICB9XG5cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGFuIGVudGl0eS5cbiAgICpcbiAgICogVGhpcyBpcyBtb3N0bHkgdG8gcHJlLXByZXByb2Nlc3MgY29tcG9uZW50IHByb3BlcnRpZXMgYW5kIHZhbHVlcyBjaGFpbnMuXG4gICAqXG4gICAqIFRoZSBlbmQgcmVzdWx0IGlzIGZvciBldmVyeSBjb21wb25lbnQgdGhhdCBnZXRzIG1vdW50ZWQsXG4gICAqIHlvdSBjcmVhdGUgYSBzZXQgb2YgSU8gbm9kZXMgaW4gdGhlIG5ldHdvcmsgZnJvbSB0aGUgYHZhbHVlYCBkZWZpbml0aW9ucy5cbiAgICpcbiAgICogQHBhcmFtIHtDb21wb25lbnR9IGNvbXBvbmVudFxuICAgKi9cblxuICBmdW5jdGlvbiByZWdpc3RlciAoZW50aXR5KSB7XG4gICAgcmVnaXN0ZXJFbnRpdHkoZW50aXR5KVxuICAgIHZhciBjb21wb25lbnQgPSBlbnRpdHkuY29tcG9uZW50XG4gICAgaWYgKGNvbXBvbmVudC5yZWdpc3RlcmVkKSByZXR1cm5cblxuICAgIC8vIGluaXRpYWxpemUgc291cmNlcyBvbmNlIGZvciBhIGNvbXBvbmVudCB0eXBlLlxuICAgIHJlZ2lzdGVyU291cmNlcyhlbnRpdHkpXG4gICAgY29tcG9uZW50LnJlZ2lzdGVyZWQgPSB0cnVlXG4gIH1cblxuICAvKipcbiAgICogQWRkIGVudGl0eSB0byBkYXRhLXN0cnVjdHVyZXMgcmVsYXRlZCB0byBjb21wb25lbnRzL2VudGl0aWVzLlxuICAgKlxuICAgKiBAcGFyYW0ge0VudGl0eX0gZW50aXR5XG4gICAqL1xuXG4gIGZ1bmN0aW9uIHJlZ2lzdGVyRW50aXR5KGVudGl0eSkge1xuICAgIHZhciBjb21wb25lbnQgPSBlbnRpdHkuY29tcG9uZW50XG4gICAgLy8gYWxsIGVudGl0aWVzIGZvciB0aGlzIGNvbXBvbmVudCB0eXBlLlxuICAgIHZhciBlbnRpdGllcyA9IGNvbXBvbmVudC5lbnRpdGllcyA9IGNvbXBvbmVudC5lbnRpdGllcyB8fCB7fVxuICAgIC8vIGFkZCBlbnRpdHkgdG8gY29tcG9uZW50IGxpc3RcbiAgICBlbnRpdGllc1tlbnRpdHkuaWRdID0gZW50aXR5XG4gICAgLy8gbWFwIHRvIGNvbXBvbmVudCBzbyB5b3UgY2FuIHJlbW92ZSBsYXRlci5cbiAgICBjb21wb25lbnRzW2VudGl0eS5pZF0gPSBjb21wb25lbnRcbiAgfVxuXG4gIC8qKlxuICAgKiBJbml0aWFsaXplIHNvdXJjZXMgZm9yIGEgY29tcG9uZW50IGJ5IHR5cGUuXG4gICAqXG4gICAqIEBwYXJhbSB7RW50aXR5fSBlbnRpdHlcbiAgICovXG5cbiAgZnVuY3Rpb24gcmVnaXN0ZXJTb3VyY2VzKGVudGl0eSkge1xuICAgIHZhciBjb21wb25lbnQgPSBjb21wb25lbnRzW2VudGl0eS5pZF1cbiAgICAvLyBnZXQgJ2NsYXNzLWxldmVsJyBzb3VyY2VzLlxuICAgIC8vIGlmIHdlJ3ZlIGFscmVhZHkgaG9va2VkIGl0IHVwLCB0aGVuIHdlJ3JlIGdvb2QuXG4gICAgdmFyIHNvdXJjZXMgPSBjb21wb25lbnQuc291cmNlc1xuICAgIGlmIChzb3VyY2VzKSByZXR1cm5cbiAgICB2YXIgZW50aXRpZXMgPSBjb21wb25lbnQuZW50aXRpZXNcblxuICAgIC8vIGhvb2sgdXAgc291cmNlcy5cbiAgICB2YXIgbWFwID0gY29tcG9uZW50LnNvdXJjZVRvUHJvcGVydHlOYW1lID0ge31cbiAgICBjb21wb25lbnQuc291cmNlcyA9IHNvdXJjZXMgPSBbXVxuICAgIHZhciBwcm9wVHlwZXMgPSBjb21wb25lbnQucHJvcFR5cGVzXG4gICAgZm9yICh2YXIgbmFtZSBpbiBwcm9wVHlwZXMpIHtcbiAgICAgIHZhciBkYXRhID0gcHJvcFR5cGVzW25hbWVdXG4gICAgICBpZiAoIWRhdGEpIGNvbnRpbnVlXG4gICAgICBpZiAoIWRhdGEuc291cmNlKSBjb250aW51ZVxuICAgICAgc291cmNlcy5wdXNoKGRhdGEuc291cmNlKVxuICAgICAgbWFwW2RhdGEuc291cmNlXSA9IG5hbWVcbiAgICB9XG5cbiAgICAvLyBzZW5kIHZhbHVlIHVwZGF0ZXMgdG8gYWxsIGNvbXBvbmVudCBpbnN0YW5jZXMuXG4gICAgc291cmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgICAgIGNvbm5lY3Rpb25zW3NvdXJjZV0gPSBjb25uZWN0aW9uc1tzb3VyY2VdIHx8IFtdXG4gICAgICBjb25uZWN0aW9uc1tzb3VyY2VdLnB1c2godXBkYXRlKVxuXG4gICAgICBmdW5jdGlvbiB1cGRhdGUgKGRhdGEpIHtcbiAgICAgICAgdmFyIHByb3AgPSBtYXBbc291cmNlXVxuICAgICAgICBmb3IgKHZhciBlbnRpdHlJZCBpbiBlbnRpdGllcykge1xuICAgICAgICAgIHZhciBlbnRpdHkgPSBlbnRpdGllc1tlbnRpdHlJZF1cbiAgICAgICAgICB2YXIgY2hhbmdlcyA9IHt9XG4gICAgICAgICAgY2hhbmdlc1twcm9wXSA9IGRhdGFcbiAgICAgICAgICB1cGRhdGVFbnRpdHlQcm9wcyhlbnRpdHlJZCwgYXNzaWduKGVudGl0eS5wZW5kaW5nUHJvcHMsIGNoYW5nZXMpKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBTZXQgdGhlIGluaXRpYWwgc291cmNlIHZhbHVlIG9uIHRoZSBlbnRpdHlcbiAgICpcbiAgICogQHBhcmFtIHtFbnRpdHl9IGVudGl0eVxuICAgKi9cblxuICBmdW5jdGlvbiBzZXRTb3VyY2VzIChlbnRpdHkpIHtcbiAgICB2YXIgY29tcG9uZW50ID0gZW50aXR5LmNvbXBvbmVudFxuICAgIHZhciBtYXAgPSBjb21wb25lbnQuc291cmNlVG9Qcm9wZXJ0eU5hbWVcbiAgICB2YXIgc291cmNlcyA9IGNvbXBvbmVudC5zb3VyY2VzXG4gICAgc291cmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChzb3VyY2UpIHtcbiAgICAgIHZhciBuYW1lID0gbWFwW3NvdXJjZV1cbiAgICAgIGlmIChlbnRpdHkucGVuZGluZ1Byb3BzW25hbWVdICE9IG51bGwpIHJldHVyblxuICAgICAgZW50aXR5LnBlbmRpbmdQcm9wc1tuYW1lXSA9IGFwcC5zb3VyY2VzW3NvdXJjZV0gLy8gZ2V0IGxhdGVzdCB2YWx1ZSBwbHVnZ2VkIGludG8gZ2xvYmFsIHN0b3JlXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYWxsIG9mIHRoZSBET00gZXZlbnQgbGlzdGVuZXJzXG4gICAqL1xuXG4gIGZ1bmN0aW9uIGFkZE5hdGl2ZUV2ZW50TGlzdGVuZXJzICgpIHtcbiAgICBmb3JFYWNoKGV2ZW50cywgZnVuY3Rpb24gKGV2ZW50VHlwZSkge1xuICAgICAgZG9jdW1lbnQuYm9keS5hZGRFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgaGFuZGxlRXZlbnQsIHRydWUpXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBBZGQgYWxsIG9mIHRoZSBET00gZXZlbnQgbGlzdGVuZXJzXG4gICAqL1xuXG4gIGZ1bmN0aW9uIHJlbW92ZU5hdGl2ZUV2ZW50TGlzdGVuZXJzICgpIHtcbiAgICBmb3JFYWNoKGV2ZW50cywgZnVuY3Rpb24gKGV2ZW50VHlwZSkge1xuICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgaGFuZGxlRXZlbnQsIHRydWUpXG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBIYW5kbGUgYW4gZXZlbnQgdGhhdCBoYXMgb2NjdXJlZCB3aXRoaW4gdGhlIGNvbnRhaW5lclxuICAgKlxuICAgKiBAcGFyYW0ge0V2ZW50fSBldmVudFxuICAgKi9cblxuICBmdW5jdGlvbiBoYW5kbGVFdmVudCAoZXZlbnQpIHtcbiAgICB2YXIgdGFyZ2V0ID0gZXZlbnQudGFyZ2V0XG4gICAgdmFyIGV2ZW50VHlwZSA9IGV2ZW50LnR5cGVcblxuICAgIC8vIFdhbGsgdXAgdGhlIERPTSB0cmVlIGFuZCBzZWUgaWYgdGhlcmUgaXMgYSBoYW5kbGVyXG4gICAgLy8gZm9yIHRoaXMgZXZlbnQgdHlwZSBoaWdoZXIgdXAuXG4gICAgd2hpbGUgKHRhcmdldCkge1xuICAgICAgdmFyIGZuID0ga2V5cGF0aC5nZXQoaGFuZGxlcnMsIFt0YXJnZXQuX19lbnRpdHlfXywgdGFyZ2V0Ll9fcGF0aF9fLCBldmVudFR5cGVdKVxuICAgICAgaWYgKGZuKSB7XG4gICAgICAgIGV2ZW50LmRlbGVnYXRlVGFyZ2V0ID0gdGFyZ2V0XG4gICAgICAgIGZuKGV2ZW50KVxuICAgICAgICBicmVha1xuICAgICAgfVxuICAgICAgdGFyZ2V0ID0gdGFyZ2V0LnBhcmVudE5vZGVcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQmluZCBldmVudHMgZm9yIGFuIGVsZW1lbnQsIGFuZCBhbGwgaXQncyByZW5kZXJlZCBjaGlsZCBlbGVtZW50cy5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gICAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gICAqL1xuXG4gIGZ1bmN0aW9uIGFkZEV2ZW50IChlbnRpdHlJZCwgcGF0aCwgZXZlbnRUeXBlLCBmbikge1xuICAgIGtleXBhdGguc2V0KGhhbmRsZXJzLCBbZW50aXR5SWQsIHBhdGgsIGV2ZW50VHlwZV0sIGZ1bmN0aW9uIChlKSB7XG4gICAgICB2YXIgZW50aXR5ID0gZW50aXRpZXNbZW50aXR5SWRdXG4gICAgICBpZiAoZW50aXR5KSB7XG4gICAgICAgIHZhciB1cGRhdGUgPSBzZXRTdGF0ZShlbnRpdHkpXG4gICAgICAgIHZhciByZXN1bHQgPSBmbi5jYWxsKG51bGwsIGUsIGVudGl0eS5jb250ZXh0LCB1cGRhdGUpXG4gICAgICAgIGlmIChyZXN1bHQpIHtcbiAgICAgICAgICB1cGRhdGVFbnRpdHlTdGF0ZUFzeW5jKGVudGl0eSwgcmVzdWx0KVxuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmbi5jYWxsKG51bGwsIGUpXG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBVbmJpbmQgZXZlbnRzIGZvciBhIGVudGl0eUlkXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBlbnRpdHlJZFxuICAgKi9cblxuICBmdW5jdGlvbiByZW1vdmVFdmVudCAoZW50aXR5SWQsIHBhdGgsIGV2ZW50VHlwZSkge1xuICAgIHZhciBhcmdzID0gW2VudGl0eUlkXVxuICAgIGlmIChwYXRoKSBhcmdzLnB1c2gocGF0aClcbiAgICBpZiAoZXZlbnRUeXBlKSBhcmdzLnB1c2goZXZlbnRUeXBlKVxuICAgIGtleXBhdGguZGVsKGhhbmRsZXJzLCBhcmdzKVxuICB9XG5cbiAgLyoqXG4gICAqIFVuYmluZCBhbGwgZXZlbnRzIGZyb20gYW4gZW50aXR5XG4gICAqXG4gICAqIEBwYXJhbSB7RW50aXR5fSBlbnRpdHlcbiAgICovXG5cbiAgZnVuY3Rpb24gcmVtb3ZlQWxsRXZlbnRzIChlbnRpdHlJZCkge1xuICAgIGtleXBhdGguZGVsKGhhbmRsZXJzLCBbZW50aXR5SWRdKVxuICB9XG5cbiAgLyoqXG4gICAqIFZhbGlkYXRlIHRoZSBjdXJyZW50IHByb3BlcnRpZXMuIFRoZXNlIHNpbXBsZSB2YWxpZGF0aW9uc1xuICAgKiBtYWtlIGl0IGVhc2llciB0byBlbnN1cmUgdGhlIGNvcnJlY3QgcHJvcHMgYXJlIHBhc3NlZCBpbi5cbiAgICpcbiAgICogQXZhaWxhYmxlIHJ1bGVzIGluY2x1ZGU6XG4gICAqXG4gICAqIHR5cGU6IHtTdHJpbmd9IHN0cmluZyB8IGFycmF5IHwgb2JqZWN0IHwgYm9vbGVhbiB8IG51bWJlciB8IGRhdGUgfCBmdW5jdGlvblxuICAgKiAgICAgICB7QXJyYXl9IEFuIGFycmF5IG9mIHR5cGVzIG1lbnRpb25lZCBhYm92ZVxuICAgKiAgICAgICB7RnVuY3Rpb259IGZuKHZhbHVlKSBzaG91bGQgcmV0dXJuIGB0cnVlYCB0byBwYXNzIGluXG4gICAqIGV4cGVjdHM6IFtdIEFuIGFycmF5IG9mIHZhbHVlcyB0aGlzIHByb3AgY291bGQgZXF1YWxcbiAgICogb3B0aW9uYWw6IEJvb2xlYW5cbiAgICovXG5cbiAgZnVuY3Rpb24gdmFsaWRhdGVQcm9wcyAocHJvcHMsIHJ1bGVzLCBvcHRQcmVmaXgpIHtcbiAgICB2YXIgcHJlZml4ID0gb3B0UHJlZml4IHx8ICcnXG4gICAgaWYgKCFvcHRpb25zLnZhbGlkYXRlUHJvcHMpIHJldHVyblxuICAgIGZvckVhY2gocnVsZXMsIGZ1bmN0aW9uIChvcHRpb25zLCBuYW1lKSB7XG4gICAgICBpZiAoIW9wdGlvbnMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdkZWt1OiBwcm9wVHlwZXMgc2hvdWxkIGhhdmUgYW4gb3B0aW9ucyBvYmplY3QgZm9yIGVhY2ggdHlwZScpXG4gICAgICB9XG5cbiAgICAgIHZhciBwcm9wTmFtZSA9IHByZWZpeCA/IHByZWZpeCArICcuJyArIG5hbWUgOiBuYW1lXG4gICAgICB2YXIgdmFsdWUgPSBrZXlwYXRoLmdldChwcm9wcywgbmFtZSlcbiAgICAgIHZhciB2YWx1ZVR5cGUgPSB0eXBlKHZhbHVlKVxuICAgICAgdmFyIHR5cGVGb3JtYXQgPSB0eXBlKG9wdGlvbnMudHlwZSlcbiAgICAgIHZhciBvcHRpb25hbCA9IChvcHRpb25zLm9wdGlvbmFsID09PSB0cnVlKVxuXG4gICAgICAvLyBJZiBpdCdzIG9wdGlvbmFsIGFuZCBkb2Vzbid0IGV4aXN0XG4gICAgICBpZiAob3B0aW9uYWwgJiYgdmFsdWUgPT0gbnVsbCkge1xuICAgICAgICByZXR1cm5cbiAgICAgIH1cblxuICAgICAgLy8gSWYgaXQncyByZXF1aXJlZCBhbmQgZG9lc24ndCBleGlzdFxuICAgICAgaWYgKCFvcHRpb25hbCAmJiB2YWx1ZSA9PSBudWxsKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ01pc3NpbmcgcHJvcGVydHk6ICcgKyBwcm9wTmFtZSlcbiAgICAgIH1cblxuICAgICAgLy8gSXQncyBhIG5lc3RlZCB0eXBlXG4gICAgICBpZiAodHlwZUZvcm1hdCA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgdmFsaWRhdGVQcm9wcyh2YWx1ZSwgb3B0aW9ucy50eXBlLCBwcm9wTmFtZSlcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIC8vIElmIGl0J3MgdGhlIGluY29ycmVjdCB0eXBlXG4gICAgICBpZiAodHlwZUZvcm1hdCA9PT0gJ3N0cmluZycgJiYgdmFsdWVUeXBlICE9PSBvcHRpb25zLnR5cGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBwcm9wZXJ0eSB0eXBlOiAnICsgcHJvcE5hbWUpXG4gICAgICB9XG5cbiAgICAgIC8vIElmIHR5cGUgaXMgdmFsaWRhdGUgZnVuY3Rpb25cbiAgICAgIGlmICh0eXBlRm9ybWF0ID09PSAnZnVuY3Rpb24nICYmICFvcHRpb25zLnR5cGUodmFsdWUpKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgcHJvcGVydHkgdHlwZTogJyArIHByb3BOYW1lKVxuICAgICAgfVxuXG4gICAgICAvLyBpZiB0eXBlIGlzIGFycmF5IG9mIHBvc3NpYmxlIHR5cGVzXG4gICAgICBpZiAodHlwZUZvcm1hdCA9PT0gJ2FycmF5JyAmJiBvcHRpb25zLnR5cGUuaW5kZXhPZih2YWx1ZVR5cGUpIDwgMCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIHByb3BlcnR5IHR5cGU6ICcgKyBwcm9wTmFtZSlcbiAgICAgIH1cblxuICAgICAgLy8gSWYgaXQncyBhbiBpbnZhbGlkIHZhbHVlXG4gICAgICBpZiAob3B0aW9ucy5leHBlY3RzICYmIG9wdGlvbnMuZXhwZWN0cy5pbmRleE9mKHZhbHVlKSA8IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBwcm9wZXJ0eSB2YWx1ZTogJyArIHByb3BOYW1lKVxuICAgICAgfVxuICAgIH0pXG5cbiAgICAvLyBOb3cgY2hlY2sgZm9yIHByb3BzIHRoYXQgaGF2ZW4ndCBiZWVuIGRlZmluZWRcbiAgICBmb3JFYWNoKHByb3BzLCBmdW5jdGlvbiAodmFsdWUsIGtleSkge1xuICAgICAgLy8gcHJvcHMuY2hpbGRyZW4gaXMgYWx3YXlzIHBhc3NlZCBpbiwgZXZlbiBpZiBpdCdzIG5vdCBkZWZpbmVkXG4gICAgICBpZiAoa2V5ID09PSAnY2hpbGRyZW4nKSByZXR1cm5cbiAgICAgIGlmICghcnVsZXNba2V5XSkgdGhyb3cgbmV3IEVycm9yKCdVbmV4cGVjdGVkIHByb3BlcnR5OiAnICsga2V5KVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogVXNlZCBmb3IgZGVidWdnaW5nIHRvIGluc3BlY3QgdGhlIGN1cnJlbnQgc3RhdGUgd2l0aG91dFxuICAgKiB1cyBuZWVkaW5nIHRvIGV4cGxpY2l0bHkgbWFuYWdlIHN0b3JpbmcvdXBkYXRpbmcgcmVmZXJlbmNlcy5cbiAgICpcbiAgICogQHJldHVybiB7T2JqZWN0fVxuICAgKi9cblxuICBmdW5jdGlvbiBpbnNwZWN0ICgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgZW50aXRpZXM6IGVudGl0aWVzLFxuICAgICAgcG9vbHM6IHBvb2xzLFxuICAgICAgaGFuZGxlcnM6IGhhbmRsZXJzLFxuICAgICAgY29ubmVjdGlvbnM6IGNvbm5lY3Rpb25zLFxuICAgICAgY3VycmVudEVsZW1lbnQ6IGN1cnJlbnRFbGVtZW50LFxuICAgICAgb3B0aW9uczogb3B0aW9ucyxcbiAgICAgIGFwcDogYXBwLFxuICAgICAgY29udGFpbmVyOiBjb250YWluZXIsXG4gICAgICBjaGlsZHJlbjogY2hpbGRyZW5cbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmV0dXJuIGFuIG9iamVjdCB0aGF0IGxldHMgdXMgY29tcGxldGVseSByZW1vdmUgdGhlIGF1dG9tYXRpY1xuICAgKiBET00gcmVuZGVyaW5nIGFuZCBleHBvcnQgZGVidWdnaW5nIHRvb2xzLlxuICAgKi9cblxuICByZXR1cm4ge1xuICAgIHJlbW92ZTogdGVhcmRvd24sXG4gICAgaW5zcGVjdDogaW5zcGVjdFxuICB9XG59XG5cbi8qKlxuICogQSByZW5kZXJlZCBjb21wb25lbnQgaW5zdGFuY2UuXG4gKlxuICogVGhpcyBtYW5hZ2VzIHRoZSBsaWZlY3ljbGUsIHByb3BzIGFuZCBzdGF0ZSBvZiB0aGUgY29tcG9uZW50LlxuICogSXQncyBiYXNpY2FsbHkganVzdCBhIGRhdGEgb2JqZWN0IGZvciBtb3JlIHN0cmFpZ2h0Zm93YXJkIGxvb2t1cC5cbiAqXG4gKiBAcGFyYW0ge0NvbXBvbmVudH0gY29tcG9uZW50XG4gKiBAcGFyYW0ge09iamVjdH0gcHJvcHNcbiAqL1xuXG5mdW5jdGlvbiBFbnRpdHkgKGNvbXBvbmVudCwgcHJvcHMsIG93bmVySWQpIHtcbiAgdGhpcy5pZCA9IHVpZCgpXG4gIHRoaXMub3duZXJJZCA9IG93bmVySWRcbiAgdGhpcy5jb21wb25lbnQgPSBjb21wb25lbnRcbiAgdGhpcy5wcm9wVHlwZXMgPSBjb21wb25lbnQucHJvcFR5cGVzIHx8IHt9XG4gIHRoaXMuY29udGV4dCA9IHt9XG4gIHRoaXMuY29udGV4dC5pZCA9IHRoaXMuaWQ7XG4gIHRoaXMuY29udGV4dC5wcm9wcyA9IGRlZmF1bHRzKHByb3BzIHx8IHt9LCBjb21wb25lbnQuZGVmYXVsdFByb3BzIHx8IHt9KVxuICB0aGlzLmNvbnRleHQuc3RhdGUgPSB0aGlzLmNvbXBvbmVudC5pbml0aWFsU3RhdGUgPyB0aGlzLmNvbXBvbmVudC5pbml0aWFsU3RhdGUodGhpcy5jb250ZXh0LnByb3BzKSA6IHt9XG4gIHRoaXMucGVuZGluZ1Byb3BzID0gYXNzaWduKHt9LCB0aGlzLmNvbnRleHQucHJvcHMpXG4gIHRoaXMucGVuZGluZ1N0YXRlID0gYXNzaWduKHt9LCB0aGlzLmNvbnRleHQuc3RhdGUpXG4gIHRoaXMuZGlydHkgPSBmYWxzZVxuICB0aGlzLnZpcnR1YWxFbGVtZW50ID0gbnVsbFxuICB0aGlzLm5hdGl2ZUVsZW1lbnQgPSBudWxsXG4gIHRoaXMuZGlzcGxheU5hbWUgPSBjb21wb25lbnQubmFtZSB8fCAnQ29tcG9uZW50J1xufVxuXG4vKipcbiAqIFNob3VsZCB3ZSBwb29sIGFuIGVsZW1lbnQ/XG4gKi9cblxuZnVuY3Rpb24gY2FuUG9vbCh0YWdOYW1lKSB7XG4gIHJldHVybiBhdm9pZFBvb2xpbmcuaW5kZXhPZih0YWdOYW1lKSA8IDBcbn1cblxuLyoqXG4gKiBHZXQgYSBuZXN0ZWQgbm9kZSB1c2luZyBhIHBhdGhcbiAqXG4gKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbCAgIFRoZSByb290IG5vZGUgJzAnXG4gKiBAcGFyYW0ge1N0cmluZ30gcGF0aCBUaGUgcGF0aCBzdHJpbmcgZWcuICcwLjIuNDMnXG4gKi9cblxuZnVuY3Rpb24gZ2V0Tm9kZUF0UGF0aChlbCwgcGF0aCkge1xuICB2YXIgcGFydHMgPSBwYXRoLnNwbGl0KCcuJylcbiAgcGFydHMuc2hpZnQoKVxuICB3aGlsZSAocGFydHMubGVuZ3RoKSB7XG4gICAgZWwgPSBlbC5jaGlsZE5vZGVzW3BhcnRzLnBvcCgpXVxuICB9XG4gIHJldHVybiBlbFxufVxuIiwidmFyIHV0aWxzID0gcmVxdWlyZSgnLi91dGlscycpXG52YXIgZXZlbnRzID0gcmVxdWlyZSgnLi9ldmVudHMnKVxudmFyIGRlZmF1bHRzID0gdXRpbHMuZGVmYXVsdHNcblxuLyoqXG4gKiBFeHBvc2UgYHN0cmluZ2lmeWAuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXBwKSB7XG4gIGlmICghYXBwLmVsZW1lbnQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIGVsZW1lbnQgbW91bnRlZCcpXG4gIH1cblxuICAvKipcbiAgICogUmVuZGVyIHRvIHN0cmluZy5cbiAgICpcbiAgICogQHBhcmFtIHtDb21wb25lbnR9IGNvbXBvbmVudFxuICAgKiBAcGFyYW0ge09iamVjdH0gW3Byb3BzXVxuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuXG4gIGZ1bmN0aW9uIHN0cmluZ2lmeSAoY29tcG9uZW50LCBvcHRQcm9wcykge1xuICAgIHZhciBwcm9wVHlwZXMgPSBjb21wb25lbnQucHJvcFR5cGVzIHx8IHt9XG4gICAgdmFyIHByb3BzID0gZGVmYXVsdHMob3B0UHJvcHMgfHwge30sIGNvbXBvbmVudC5kZWZhdWx0UHJvcHMgfHwge30pXG4gICAgdmFyIHN0YXRlID0gY29tcG9uZW50LmluaXRpYWxTdGF0ZSA/IGNvbXBvbmVudC5pbml0aWFsU3RhdGUocHJvcHMpIDoge31cblxuICAgIGZvciAodmFyIG5hbWUgaW4gcHJvcFR5cGVzKSB7XG4gICAgICB2YXIgb3B0aW9ucyA9IHByb3BUeXBlc1tuYW1lXVxuICAgICAgaWYgKG9wdGlvbnMuc291cmNlKSB7XG4gICAgICAgIHByb3BzW25hbWVdID0gYXBwLnNvdXJjZXNbb3B0aW9ucy5zb3VyY2VdXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGNvbXBvbmVudC5iZWZvcmVNb3VudCkgY29tcG9uZW50LmJlZm9yZU1vdW50KHsgcHJvcHM6IHByb3BzLCBzdGF0ZTogc3RhdGUgfSlcbiAgICBpZiAoY29tcG9uZW50LmJlZm9yZVJlbmRlcikgY29tcG9uZW50LmJlZm9yZVJlbmRlcih7IHByb3BzOiBwcm9wcywgc3RhdGU6IHN0YXRlIH0pXG4gICAgdmFyIG5vZGUgPSBjb21wb25lbnQucmVuZGVyKHsgcHJvcHM6IHByb3BzLCBzdGF0ZTogc3RhdGUgfSlcbiAgICByZXR1cm4gc3RyaW5naWZ5Tm9kZShub2RlLCAnMCcpXG4gIH1cblxuICAvKipcbiAgICogUmVuZGVyIGEgbm9kZSB0byBhIHN0cmluZ1xuICAgKlxuICAgKiBAcGFyYW0ge05vZGV9IG5vZGVcbiAgICogQHBhcmFtIHtUcmVlfSB0cmVlXG4gICAqXG4gICAqIEByZXR1cm4ge1N0cmluZ31cbiAgICovXG5cbiAgZnVuY3Rpb24gc3RyaW5naWZ5Tm9kZSAobm9kZSwgcGF0aCkge1xuICAgIHN3aXRjaCAobm9kZS50eXBlKSB7XG4gICAgICBjYXNlICd0ZXh0JzogcmV0dXJuIG5vZGUuZGF0YVxuICAgICAgY2FzZSAnZWxlbWVudCc6XG4gICAgICAgIHZhciBjaGlsZHJlbiA9IG5vZGUuY2hpbGRyZW5cbiAgICAgICAgdmFyIGF0dHJpYnV0ZXMgPSBub2RlLmF0dHJpYnV0ZXNcbiAgICAgICAgdmFyIHRhZ05hbWUgPSBub2RlLnRhZ05hbWVcbiAgICAgICAgdmFyIGlubmVySFRNTCA9IGF0dHJpYnV0ZXMuaW5uZXJIVE1MXG4gICAgICAgIHZhciBzdHIgPSAnPCcgKyB0YWdOYW1lICsgYXR0cnMoYXR0cmlidXRlcykgKyAnPidcblxuICAgICAgICBpZiAoaW5uZXJIVE1MKSB7XG4gICAgICAgICAgc3RyICs9IGlubmVySFRNTFxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGZvciAodmFyIGkgPSAwLCBuID0gY2hpbGRyZW4ubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgICAgICBzdHIgKz0gc3RyaW5naWZ5Tm9kZShjaGlsZHJlbltpXSwgcGF0aCArICcuJyArIGkpXG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgc3RyICs9ICc8LycgKyB0YWdOYW1lICsgJz4nXG4gICAgICAgIHJldHVybiBzdHJcbiAgICAgIGNhc2UgJ2NvbXBvbmVudCc6IHJldHVybiBzdHJpbmdpZnkobm9kZS5jb21wb25lbnQsIG5vZGUucHJvcHMpXG4gICAgfVxuXG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHR5cGUnKVxuICB9XG5cbiAgcmV0dXJuIHN0cmluZ2lmeU5vZGUoYXBwLmVsZW1lbnQsICcwJylcbn1cblxuLyoqXG4gKiBIVE1MIGF0dHJpYnV0ZXMgdG8gc3RyaW5nLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBhdHRyaWJ1dGVzXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBhdHRycyAoYXR0cmlidXRlcykge1xuICB2YXIgc3RyID0gJydcbiAgZm9yICh2YXIga2V5IGluIGF0dHJpYnV0ZXMpIHtcbiAgICBpZiAoa2V5ID09PSAnaW5uZXJIVE1MJykgY29udGludWVcbiAgICBpZiAoZXZlbnRzW2tleV0pIGNvbnRpbnVlXG4gICAgc3RyICs9IGF0dHIoa2V5LCBhdHRyaWJ1dGVzW2tleV0pXG4gIH1cbiAgcmV0dXJuIHN0clxufVxuXG4vKipcbiAqIEhUTUwgYXR0cmlidXRlIHRvIHN0cmluZy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5XG4gKiBAcGFyYW0ge1N0cmluZ30gdmFsXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBhdHRyIChrZXksIHZhbCkge1xuICByZXR1cm4gJyAnICsga2V5ICsgJz1cIicgKyB2YWwgKyAnXCInXG59XG4iLCJ2YXIgaW5kZXhPZiA9IHJlcXVpcmUoJ2Zhc3QuanMvYXJyYXkvaW5kZXhPZicpXG5cbi8qKlxuICogVGhpcyBmaWxlIGxpc3RzIHRoZSBzdXBwb3J0ZWQgU1ZHIGVsZW1lbnRzIHVzZWQgYnkgdGhlXG4gKiByZW5kZXJlci4gV2UgbWF5IGFkZCBiZXR0ZXIgU1ZHIHN1cHBvcnQgaW4gdGhlIGZ1dHVyZVxuICogdGhhdCBkb2Vzbid0IHJlcXVpcmUgd2hpdGVsaXN0aW5nIGVsZW1lbnRzLlxuICovXG5cbmV4cG9ydHMubmFtZXNwYWNlID0gJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJ1xuXG4vKipcbiAqIFN1cHBvcnRlZCBTVkcgZWxlbWVudHNcbiAqXG4gKiBAdHlwZSB7QXJyYXl9XG4gKi9cblxuZXhwb3J0cy5lbGVtZW50cyA9IFtcbiAgJ2NpcmNsZScsXG4gICdkZWZzJyxcbiAgJ2VsbGlwc2UnLFxuICAnZycsXG4gICdsaW5lJyxcbiAgJ2xpbmVhckdyYWRpZW50JyxcbiAgJ21hc2snLFxuICAncGF0aCcsXG4gICdwYXR0ZXJuJyxcbiAgJ3BvbHlnb24nLFxuICAncG9seWxpbmUnLFxuICAncmFkaWFsR3JhZGllbnQnLFxuICAncmVjdCcsXG4gICdzdG9wJyxcbiAgJ3N2ZycsXG4gICd0ZXh0JyxcbiAgJ3RzcGFuJ1xuXVxuXG4vKipcbiAqIFN1cHBvcnRlZCBTVkcgYXR0cmlidXRlc1xuICovXG5cbmV4cG9ydHMuYXR0cmlidXRlcyA9IFtcbiAgJ2N4JyxcbiAgJ2N5JyxcbiAgJ2QnLFxuICAnZHgnLFxuICAnZHknLFxuICAnZmlsbCcsXG4gICdmaWxsT3BhY2l0eScsXG4gICdmb250RmFtaWx5JyxcbiAgJ2ZvbnRTaXplJyxcbiAgJ2Z4JyxcbiAgJ2Z5JyxcbiAgJ2dyYWRpZW50VHJhbnNmb3JtJyxcbiAgJ2dyYWRpZW50VW5pdHMnLFxuICAnbWFya2VyRW5kJyxcbiAgJ21hcmtlck1pZCcsXG4gICdtYXJrZXJTdGFydCcsXG4gICdvZmZzZXQnLFxuICAnb3BhY2l0eScsXG4gICdwYXR0ZXJuQ29udGVudFVuaXRzJyxcbiAgJ3BhdHRlcm5Vbml0cycsXG4gICdwb2ludHMnLFxuICAncHJlc2VydmVBc3BlY3RSYXRpbycsXG4gICdyJyxcbiAgJ3J4JyxcbiAgJ3J5JyxcbiAgJ3NwcmVhZE1ldGhvZCcsXG4gICdzdG9wQ29sb3InLFxuICAnc3RvcE9wYWNpdHknLFxuICAnc3Ryb2tlJyxcbiAgJ3N0cm9rZURhc2hhcnJheScsXG4gICdzdHJva2VMaW5lY2FwJyxcbiAgJ3N0cm9rZU9wYWNpdHknLFxuICAnc3Ryb2tlV2lkdGgnLFxuICAndGV4dEFuY2hvcicsXG4gICd0cmFuc2Zvcm0nLFxuICAndmVyc2lvbicsXG4gICd2aWV3Qm94JyxcbiAgJ3gxJyxcbiAgJ3gyJyxcbiAgJ3gnLFxuICAneTEnLFxuICAneTInLFxuICAneSdcbl1cblxuLyoqXG4gKiBJcyBlbGVtZW50J3MgbmFtZXNwYWNlIFNWRz9cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICovXG5cbmV4cG9ydHMuaXNFbGVtZW50ID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgcmV0dXJuIGluZGV4T2YoZXhwb3J0cy5lbGVtZW50cywgbmFtZSkgIT09IC0xXG59XG5cbi8qKlxuICogQXJlIGVsZW1lbnQncyBhdHRyaWJ1dGVzIFNWRz9cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gYXR0clxuICovXG5cbmV4cG9ydHMuaXNBdHRyaWJ1dGUgPSBmdW5jdGlvbiAoYXR0cikge1xuICByZXR1cm4gaW5kZXhPZihleHBvcnRzLmF0dHJpYnV0ZXMsIGF0dHIpICE9PSAtMVxufVxuXG4iLCIvKipcbiAqIFRoZSBucG0gJ2RlZmF1bHRzJyBtb2R1bGUgYnV0IHdpdGhvdXQgY2xvbmUgYmVjYXVzZVxuICogaXQgd2FzIHJlcXVpcmluZyB0aGUgJ0J1ZmZlcicgbW9kdWxlIHdoaWNoIGlzIGh1Z2UuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBwYXJhbSB7T2JqZWN0fSBkZWZhdWx0c1xuICpcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuXG5leHBvcnRzLmRlZmF1bHRzID0gZnVuY3Rpb24ob3B0aW9ucywgZGVmYXVsdHMpIHtcbiAgT2JqZWN0LmtleXMoZGVmYXVsdHMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zW2tleV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBvcHRpb25zW2tleV0gPSBkZWZhdWx0c1trZXldXG4gICAgfVxuICB9KVxuICByZXR1cm4gb3B0aW9uc1xufVxuIiwiLyoqXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciB0eXBlID0gcmVxdWlyZSgnY29tcG9uZW50LXR5cGUnKVxudmFyIHNsaWNlID0gcmVxdWlyZSgnc2xpY2VkJylcbnZhciBmbGF0dGVuID0gcmVxdWlyZSgnYXJyYXktZmxhdHRlbicpXG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBsZXRzIHVzIGNyZWF0ZSB2aXJ0dWFsIG5vZGVzIHVzaW5nIGEgc2ltcGxlXG4gKiBzeW50YXguIEl0IGlzIGNvbXBhdGlibGUgd2l0aCBKU1ggdHJhbnNmb3JtcyBzbyB5b3UgY2FuIHVzZVxuICogSlNYIHRvIHdyaXRlIG5vZGVzIHRoYXQgd2lsbCBjb21waWxlIHRvIHRoaXMgZnVuY3Rpb24uXG4gKlxuICogbGV0IG5vZGUgPSB2aXJ0dWFsKCdkaXYnLCB7IGlkOiAnZm9vJyB9LCBbXG4gKiAgIHZpcnR1YWwoJ2EnLCB7IGhyZWY6ICdodHRwOi8vZ29vZ2xlLmNvbScgfSwgJ0dvb2dsZScpXG4gKiBdKVxuICpcbiAqIFlvdSBjYW4gbGVhdmUgb3V0IHRoZSBhdHRyaWJ1dGVzIG9yIHRoZSBjaGlsZHJlbiBpZiBlaXRoZXJcbiAqIG9mIHRoZW0gYXJlbid0IG5lZWRlZCBhbmQgaXQgd2lsbCBmaWd1cmUgb3V0IHdoYXQgeW91J3JlXG4gKiB0cnlpbmcgdG8gZG8uXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB2aXJ0dWFsXG5cbi8qKlxuICogQ3JlYXRlIHZpcnR1YWwgRE9NIHRyZWVzLlxuICpcbiAqIFRoaXMgY3JlYXRlcyB0aGUgbmljZXIgQVBJIGZvciB0aGUgdXNlci5cbiAqIEl0IHRyYW5zbGF0ZXMgdGhhdCBmcmllbmRseSBBUEkgaW50byBhbiBhY3R1YWwgdHJlZSBvZiBub2Rlcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xGdW5jdGlvbn0gdHlwZVxuICogQHBhcmFtIHtPYmplY3R9IHByb3BzXG4gKiBAcGFyYW0ge0FycmF5fSBjaGlsZHJlblxuICogQHJldHVybiB7Tm9kZX1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gdmlydHVhbCAodHlwZSwgcHJvcHMsIGNoaWxkcmVuKSB7XG4gIC8vIERlZmF1bHQgdG8gZGl2IHdpdGggbm8gYXJnc1xuICBpZiAoIXR5cGUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2Rla3U6IEVsZW1lbnQgbmVlZHMgYSB0eXBlLiBSZWFkIG1vcmU6IGh0dHA6Ly9jbC5seS9iMEtaJylcbiAgfVxuXG4gIC8vIFNraXBwZWQgYWRkaW5nIGF0dHJpYnV0ZXMgYW5kIHdlJ3JlIHBhc3NpbmdcbiAgLy8gaW4gY2hpbGRyZW4gaW5zdGVhZC5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIgJiYgKHR5cGVvZiBwcm9wcyA9PT0gJ3N0cmluZycgfHwgQXJyYXkuaXNBcnJheShwcm9wcykpKSB7XG4gICAgY2hpbGRyZW4gPSBwcm9wc1xuICAgIHByb3BzID0ge31cbiAgfVxuXG4gIC8vIEFjY291bnQgZm9yIEpTWCBwdXR0aW5nIHRoZSBjaGlsZHJlbiBhcyBtdWx0aXBsZSBhcmd1bWVudHMuXG4gIC8vIFRoaXMgaXMgZXNzZW50aWFsbHkganVzdCB0aGUgRVM2IHJlc3QgcGFyYW1cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIEFycmF5LmlzQXJyYXkoYXJndW1lbnRzWzJdKSA9PT0gZmFsc2UpIHtcbiAgICBjaGlsZHJlbiA9IHNsaWNlKGFyZ3VtZW50cywgMilcbiAgfVxuXG4gIGNoaWxkcmVuID0gY2hpbGRyZW4gfHwgW11cbiAgcHJvcHMgPSBwcm9wcyB8fCB7fVxuXG4gIC8vIHBhc3NpbmcgaW4gYSBzaW5nbGUgY2hpbGQsIHlvdSBjYW4gc2tpcFxuICAvLyB1c2luZyB0aGUgYXJyYXlcbiAgaWYgKCFBcnJheS5pc0FycmF5KGNoaWxkcmVuKSkge1xuICAgIGNoaWxkcmVuID0gWyBjaGlsZHJlbiBdXG4gIH1cblxuICBjaGlsZHJlbiA9IGZsYXR0ZW4oY2hpbGRyZW4sIDEpLnJlZHVjZShub3JtYWxpemUsIFtdKVxuXG4gIC8vIHB1bGwgdGhlIGtleSBvdXQgZnJvbSB0aGUgZGF0YS5cbiAgdmFyIGtleSA9ICdrZXknIGluIHByb3BzID8gU3RyaW5nKHByb3BzLmtleSkgOiBudWxsXG4gIGRlbGV0ZSBwcm9wc1sna2V5J11cblxuICAvLyBpZiB5b3UgcGFzcyBpbiBhIGZ1bmN0aW9uLCBpdCdzIGEgYENvbXBvbmVudGAgY29uc3RydWN0b3IuXG4gIC8vIG90aGVyd2lzZSBpdCdzIGFuIGVsZW1lbnQuXG4gIHZhciBub2RlXG4gIGlmICh0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICBub2RlID0gbmV3IEVsZW1lbnROb2RlKHR5cGUsIHByb3BzLCBrZXksIGNoaWxkcmVuKVxuICB9IGVsc2Uge1xuICAgIG5vZGUgPSBuZXcgQ29tcG9uZW50Tm9kZSh0eXBlLCBwcm9wcywga2V5LCBjaGlsZHJlbilcbiAgfVxuXG4gIC8vIHNldCB0aGUgdW5pcXVlIElEXG4gIG5vZGUuaW5kZXggPSAwXG5cbiAgcmV0dXJuIG5vZGVcbn1cblxuLyoqXG4gKiBQYXJzZSBub2RlcyBpbnRvIHJlYWwgYE5vZGVgIG9iamVjdHMuXG4gKlxuICogQHBhcmFtIHtNaXhlZH0gbm9kZVxuICogQHBhcmFtIHtJbnRlZ2VyfSBpbmRleFxuICogQHJldHVybiB7Tm9kZX1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZSAoYWNjLCBub2RlKSB7XG4gIGlmIChub2RlID09IG51bGwpIHtcbiAgICByZXR1cm4gYWNjXG4gIH1cbiAgaWYgKHR5cGVvZiBub2RlID09PSAnc3RyaW5nJyB8fCB0eXBlb2Ygbm9kZSA9PT0gJ251bWJlcicpIHtcbiAgICB2YXIgbmV3Tm9kZSA9IG5ldyBUZXh0Tm9kZShTdHJpbmcobm9kZSkpXG4gICAgbmV3Tm9kZS5pbmRleCA9IGFjYy5sZW5ndGhcbiAgICBhY2MucHVzaChuZXdOb2RlKVxuICB9IGVsc2Uge1xuICAgIG5vZGUuaW5kZXggPSBhY2MubGVuZ3RoXG4gICAgYWNjLnB1c2gobm9kZSlcbiAgfVxuICByZXR1cm4gYWNjXG59XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBhIG5ldyBgQ29tcG9uZW50Tm9kZWAuXG4gKlxuICogQHBhcmFtIHtDb21wb25lbnR9IGNvbXBvbmVudFxuICogQHBhcmFtIHtPYmplY3R9IHByb3BzXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5IFVzZWQgZm9yIHNvcnRpbmcvcmVwbGFjaW5nIGR1cmluZyBkaWZmaW5nLlxuICogQHBhcmFtIHtBcnJheX0gY2hpbGRyZW4gQ2hpbGQgdmlydHVhbCBub2Rlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBDb21wb25lbnROb2RlIChjb21wb25lbnQsIHByb3BzLCBrZXksIGNoaWxkcmVuKSB7XG4gIHRoaXMua2V5ID0ga2V5XG4gIHRoaXMucHJvcHMgPSBwcm9wc1xuICB0aGlzLnR5cGUgPSAnY29tcG9uZW50J1xuICB0aGlzLmNvbXBvbmVudCA9IGNvbXBvbmVudFxuICB0aGlzLnByb3BzLmNoaWxkcmVuID0gY2hpbGRyZW4gfHwgW11cbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBFbGVtZW50Tm9kZWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHRhZ05hbWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBhdHRyaWJ1dGVzXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5IFVzZWQgZm9yIHNvcnRpbmcvcmVwbGFjaW5nIGR1cmluZyBkaWZmaW5nLlxuICogQHBhcmFtIHtBcnJheX0gY2hpbGRyZW4gQ2hpbGQgdmlydHVhbCBkb20gbm9kZXMuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIEVsZW1lbnROb2RlICh0YWdOYW1lLCBhdHRyaWJ1dGVzLCBrZXksIGNoaWxkcmVuKSB7XG4gIHRoaXMudHlwZSA9ICdlbGVtZW50J1xuICB0aGlzLmF0dHJpYnV0ZXMgPSBwYXJzZUF0dHJpYnV0ZXMoYXR0cmlidXRlcylcbiAgdGhpcy50YWdOYW1lID0gdGFnTmFtZVxuICB0aGlzLmNoaWxkcmVuID0gY2hpbGRyZW4gfHwgW11cbiAgdGhpcy5rZXkgPSBrZXlcbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBUZXh0Tm9kZWAuXG4gKlxuICogVGhpcyBpcyBqdXN0IGEgdmlydHVhbCBIVE1MIHRleHQgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0ZXh0XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIFRleHROb2RlICh0ZXh0KSB7XG4gIHRoaXMudHlwZSA9ICd0ZXh0J1xuICB0aGlzLmRhdGEgPSBTdHJpbmcodGV4dClcbn1cblxuLyoqXG4gKiBQYXJzZSBhdHRyaWJ1dGVzIGZvciBzb21lIHNwZWNpYWwgY2FzZXMuXG4gKlxuICogVE9ETzogVGhpcyBjb3VsZCBiZSBtb3JlIGZ1bmN0aW9uYWwgYW5kIGFsbG93IGhvb2tzXG4gKiBpbnRvIHRoZSBwcm9jZXNzaW5nIG9mIHRoZSBhdHRyaWJ1dGVzIGF0IGEgY29tcG9uZW50LWxldmVsXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGF0dHJpYnV0ZXNcbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cblxuZnVuY3Rpb24gcGFyc2VBdHRyaWJ1dGVzIChhdHRyaWJ1dGVzKSB7XG4gIC8vIHN0eWxlOiB7ICd0ZXh0LWFsaWduJzogJ2xlZnQnIH1cbiAgaWYgKGF0dHJpYnV0ZXMuc3R5bGUpIHtcbiAgICBhdHRyaWJ1dGVzLnN0eWxlID0gcGFyc2VTdHlsZShhdHRyaWJ1dGVzLnN0eWxlKVxuICB9XG5cbiAgLy8gY2xhc3M6IHsgZm9vOiB0cnVlLCBiYXI6IGZhbHNlLCBiYXo6IHRydWUgfVxuICAvLyBjbGFzczogWydmb28nLCAnYmFyJywgJ2JheiddXG4gIGlmIChhdHRyaWJ1dGVzLmNsYXNzKSB7XG4gICAgYXR0cmlidXRlcy5jbGFzcyA9IHBhcnNlQ2xhc3MoYXR0cmlidXRlcy5jbGFzcylcbiAgfVxuXG4gIC8vIFJlbW92ZSBhdHRyaWJ1dGVzIHdpdGggZmFsc2UgdmFsdWVzXG4gIHZhciBmaWx0ZXJlZEF0dHJpYnV0ZXMgPSB7fVxuICBmb3IgKHZhciBrZXkgaW4gYXR0cmlidXRlcykge1xuICAgIHZhciB2YWx1ZSA9IGF0dHJpYnV0ZXNba2V5XVxuICAgIGlmICh2YWx1ZSA9PSBudWxsIHx8IHZhbHVlID09PSBmYWxzZSkgY29udGludWVcbiAgICBmaWx0ZXJlZEF0dHJpYnV0ZXNba2V5XSA9IHZhbHVlXG4gIH1cblxuICByZXR1cm4gZmlsdGVyZWRBdHRyaWJ1dGVzXG59XG5cbi8qKlxuICogUGFyc2UgYSBibG9jayBvZiBzdHlsZXMgaW50byBhIHN0cmluZy5cbiAqXG4gKiBUT0RPOiB0aGlzIGNvdWxkIGRvIGEgbG90IG1vcmUgd2l0aCB2ZW5kb3IgcHJlZml4aW5nLFxuICogbnVtYmVyIHZhbHVlcyBldGMuIE1heWJlIHRoZXJlJ3MgYSB3YXkgdG8gYWxsb3cgdXNlcnNcbiAqIHRvIGhvb2sgaW50byB0aGlzP1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBzdHlsZXNcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cblxuZnVuY3Rpb24gcGFyc2VTdHlsZSAoc3R5bGVzKSB7XG4gIGlmICh0eXBlKHN0eWxlcykgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHN0eWxlc1xuICB9XG4gIHZhciBzdHIgPSAnJ1xuICBmb3IgKHZhciBuYW1lIGluIHN0eWxlcykge1xuICAgIHZhciB2YWx1ZSA9IHN0eWxlc1tuYW1lXVxuICAgIHN0ciA9IHN0ciArIG5hbWUgKyAnOicgKyB2YWx1ZSArICc7J1xuICB9XG4gIHJldHVybiBzdHI7XG59XG5cbi8qKlxuICogUGFyc2UgdGhlIGNsYXNzIGF0dHJpYnV0ZSBzbyBpdCdzIGFibGUgdG8gYmVcbiAqIHNldCBpbiBhIG1vcmUgdXNlci1mcmllbmRseSB3YXlcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R8QXJyYXl9IHZhbHVlXG4gKlxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5cbmZ1bmN0aW9uIHBhcnNlQ2xhc3MgKHZhbHVlKSB7XG4gIC8vIHsgZm9vOiB0cnVlLCBiYXI6IGZhbHNlLCBiYXo6IHRydWUgfVxuICBpZiAodHlwZSh2YWx1ZSkgPT09ICdvYmplY3QnKSB7XG4gICAgdmFyIG1hdGNoZWQgPSBbXVxuICAgIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgaWYgKHZhbHVlW2tleV0pIG1hdGNoZWQucHVzaChrZXkpXG4gICAgfVxuICAgIHZhbHVlID0gbWF0Y2hlZFxuICB9XG5cbiAgLy8gWydmb28nLCAnYmFyJywgJ2JheiddXG4gIGlmICh0eXBlKHZhbHVlKSA9PT0gJ2FycmF5Jykge1xuICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICB2YWx1ZSA9IHZhbHVlLmpvaW4oJyAnKVxuICB9XG5cbiAgcmV0dXJuIHZhbHVlXG59XG4iLCIvKipcbiAqIFJlY3Vyc2l2ZSBmbGF0dGVuIGZ1bmN0aW9uIHdpdGggZGVwdGguXG4gKlxuICogQHBhcmFtICB7QXJyYXl9ICBhcnJheVxuICogQHBhcmFtICB7QXJyYXl9ICByZXN1bHRcbiAqIEBwYXJhbSAge051bWJlcn0gZGVwdGhcbiAqIEByZXR1cm4ge0FycmF5fVxuICovXG5mdW5jdGlvbiBmbGF0dGVuRGVwdGggKGFycmF5LCByZXN1bHQsIGRlcHRoKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgdmFsdWUgPSBhcnJheVtpXVxuXG4gICAgaWYgKGRlcHRoID4gMCAmJiBBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgZmxhdHRlbkRlcHRoKHZhbHVlLCByZXN1bHQsIGRlcHRoIC0gMSlcbiAgICB9IGVsc2Uge1xuICAgICAgcmVzdWx0LnB1c2godmFsdWUpXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlc3VsdFxufVxuXG4vKipcbiAqIFJlY3Vyc2l2ZSBmbGF0dGVuIGZ1bmN0aW9uLiBPbWl0dGluZyBkZXB0aCBpcyBzbGlnaHRseSBmYXN0ZXIuXG4gKlxuICogQHBhcmFtICB7QXJyYXl9IGFycmF5XG4gKiBAcGFyYW0gIHtBcnJheX0gcmVzdWx0XG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqL1xuZnVuY3Rpb24gZmxhdHRlbkZvcmV2ZXIgKGFycmF5LCByZXN1bHQpIHtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcnJheS5sZW5ndGg7IGkrKykge1xuICAgIHZhciB2YWx1ZSA9IGFycmF5W2ldXG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIGZsYXR0ZW5Gb3JldmVyKHZhbHVlLCByZXN1bHQpXG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHRcbn1cblxuLyoqXG4gKiBGbGF0dGVuIGFuIGFycmF5LCB3aXRoIHRoZSBhYmlsaXR5IHRvIGRlZmluZSBhIGRlcHRoLlxuICpcbiAqIEBwYXJhbSAge0FycmF5fSAgYXJyYXlcbiAqIEBwYXJhbSAge051bWJlcn0gZGVwdGhcbiAqIEByZXR1cm4ge0FycmF5fVxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIChhcnJheSwgZGVwdGgpIHtcbiAgaWYgKGRlcHRoID09IG51bGwpIHtcbiAgICByZXR1cm4gZmxhdHRlbkZvcmV2ZXIoYXJyYXksIFtdKVxuICB9XG5cbiAgcmV0dXJuIGZsYXR0ZW5EZXB0aChhcnJheSwgW10sIGRlcHRoKVxufVxuIiwiXG4vKipcbiAqIEV4cG9zZSBgRW1pdHRlcmAuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBFbWl0dGVyO1xuXG4vKipcbiAqIEluaXRpYWxpemUgYSBuZXcgYEVtaXR0ZXJgLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gRW1pdHRlcihvYmopIHtcbiAgaWYgKG9iaikgcmV0dXJuIG1peGluKG9iaik7XG59O1xuXG4vKipcbiAqIE1peGluIHRoZSBlbWl0dGVyIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gbWl4aW4ob2JqKSB7XG4gIGZvciAodmFyIGtleSBpbiBFbWl0dGVyLnByb3RvdHlwZSkge1xuICAgIG9ialtrZXldID0gRW1pdHRlci5wcm90b3R5cGVba2V5XTtcbiAgfVxuICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIExpc3RlbiBvbiB0aGUgZ2l2ZW4gYGV2ZW50YCB3aXRoIGBmbmAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUub24gPVxuRW1pdHRlci5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50LCBmbil7XG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcbiAgKHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF0gPSB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdIHx8IFtdKVxuICAgIC5wdXNoKGZuKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEFkZHMgYW4gYGV2ZW50YCBsaXN0ZW5lciB0aGF0IHdpbGwgYmUgaW52b2tlZCBhIHNpbmdsZVxuICogdGltZSB0aGVuIGF1dG9tYXRpY2FsbHkgcmVtb3ZlZC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24oZXZlbnQsIGZuKXtcbiAgZnVuY3Rpb24gb24oKSB7XG4gICAgdGhpcy5vZmYoZXZlbnQsIG9uKTtcbiAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgb24uZm4gPSBmbjtcbiAgdGhpcy5vbihldmVudCwgb24pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIHRoZSBnaXZlbiBjYWxsYmFjayBmb3IgYGV2ZW50YCBvciBhbGxcbiAqIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLm9mZiA9XG5FbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9XG5FbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPVxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50LCBmbil7XG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcblxuICAvLyBhbGxcbiAgaWYgKDAgPT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgIHRoaXMuX2NhbGxiYWNrcyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gc3BlY2lmaWMgZXZlbnRcbiAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF07XG4gIGlmICghY2FsbGJhY2tzKSByZXR1cm4gdGhpcztcblxuICAvLyByZW1vdmUgYWxsIGhhbmRsZXJzXG4gIGlmICgxID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICBkZWxldGUgdGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHJlbW92ZSBzcGVjaWZpYyBoYW5kbGVyXG4gIHZhciBjYjtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBjYWxsYmFja3MubGVuZ3RoOyBpKyspIHtcbiAgICBjYiA9IGNhbGxiYWNrc1tpXTtcbiAgICBpZiAoY2IgPT09IGZuIHx8IGNiLmZuID09PSBmbikge1xuICAgICAgY2FsbGJhY2tzLnNwbGljZShpLCAxKTtcbiAgICAgIGJyZWFrO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogRW1pdCBgZXZlbnRgIHdpdGggdGhlIGdpdmVuIGFyZ3MuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge01peGVkfSAuLi5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgdGhpcy5fY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzIHx8IHt9O1xuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKVxuICAgICwgY2FsbGJhY2tzID0gdGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XTtcblxuICBpZiAoY2FsbGJhY2tzKSB7XG4gICAgY2FsbGJhY2tzID0gY2FsbGJhY2tzLnNsaWNlKDApO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjYWxsYmFja3MubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIGNhbGxiYWNrc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmV0dXJuIGFycmF5IG9mIGNhbGxiYWNrcyBmb3IgYGV2ZW50YC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbihldmVudCl7XG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcbiAgcmV0dXJuIHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF0gfHwgW107XG59O1xuXG4vKipcbiAqIENoZWNrIGlmIHRoaXMgZW1pdHRlciBoYXMgYGV2ZW50YCBoYW5kbGVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLmhhc0xpc3RlbmVycyA9IGZ1bmN0aW9uKGV2ZW50KXtcbiAgcmV0dXJuICEhIHRoaXMubGlzdGVuZXJzKGV2ZW50KS5sZW5ndGg7XG59O1xuIiwiLyoqXG4gKiBFeHBvc2UgYHJlcXVlc3RBbmltYXRpb25GcmFtZSgpYC5cbiAqL1xuXG5leHBvcnRzID0gbW9kdWxlLmV4cG9ydHMgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4gIHx8IHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZVxuICB8fCBmYWxsYmFjaztcblxuLyoqXG4gKiBGYWxsYmFjayBpbXBsZW1lbnRhdGlvbi5cbiAqL1xuXG52YXIgcHJldiA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuZnVuY3Rpb24gZmFsbGJhY2soZm4pIHtcbiAgdmFyIGN1cnIgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbiAgdmFyIG1zID0gTWF0aC5tYXgoMCwgMTYgLSAoY3VyciAtIHByZXYpKTtcbiAgdmFyIHJlcSA9IHNldFRpbWVvdXQoZm4sIG1zKTtcbiAgcHJldiA9IGN1cnI7XG4gIHJldHVybiByZXE7XG59XG5cbi8qKlxuICogQ2FuY2VsLlxuICovXG5cbnZhciBjYW5jZWwgPSB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93LndlYmtpdENhbmNlbEFuaW1hdGlvbkZyYW1lXG4gIHx8IHdpbmRvdy5tb3pDYW5jZWxBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cuY2xlYXJUaW1lb3V0O1xuXG5leHBvcnRzLmNhbmNlbCA9IGZ1bmN0aW9uKGlkKXtcbiAgY2FuY2VsLmNhbGwod2luZG93LCBpZCk7XG59O1xuIiwiLyoqXG4gKiB0b1N0cmluZyByZWYuXG4gKi9cblxudmFyIHRvU3RyaW5nID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZztcblxuLyoqXG4gKiBSZXR1cm4gdGhlIHR5cGUgb2YgYHZhbGAuXG4gKlxuICogQHBhcmFtIHtNaXhlZH0gdmFsXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24odmFsKXtcbiAgc3dpdGNoICh0b1N0cmluZy5jYWxsKHZhbCkpIHtcbiAgICBjYXNlICdbb2JqZWN0IERhdGVdJzogcmV0dXJuICdkYXRlJztcbiAgICBjYXNlICdbb2JqZWN0IFJlZ0V4cF0nOiByZXR1cm4gJ3JlZ2V4cCc7XG4gICAgY2FzZSAnW29iamVjdCBBcmd1bWVudHNdJzogcmV0dXJuICdhcmd1bWVudHMnO1xuICAgIGNhc2UgJ1tvYmplY3QgQXJyYXldJzogcmV0dXJuICdhcnJheSc7XG4gICAgY2FzZSAnW29iamVjdCBFcnJvcl0nOiByZXR1cm4gJ2Vycm9yJztcbiAgfVxuXG4gIGlmICh2YWwgPT09IG51bGwpIHJldHVybiAnbnVsbCc7XG4gIGlmICh2YWwgPT09IHVuZGVmaW5lZCkgcmV0dXJuICd1bmRlZmluZWQnO1xuICBpZiAodmFsICE9PSB2YWwpIHJldHVybiAnbmFuJztcbiAgaWYgKHZhbCAmJiB2YWwubm9kZVR5cGUgPT09IDEpIHJldHVybiAnZWxlbWVudCc7XG5cbiAgdmFsID0gdmFsLnZhbHVlT2ZcbiAgICA/IHZhbC52YWx1ZU9mKClcbiAgICA6IE9iamVjdC5wcm90b3R5cGUudmFsdWVPZi5hcHBseSh2YWwpXG5cbiAgcmV0dXJuIHR5cGVvZiB2YWw7XG59O1xuIiwiZnVuY3Rpb24gUG9vbChwYXJhbXMpIHtcclxuICAgIGlmICh0eXBlb2YgcGFyYW1zICE9PSAnb2JqZWN0Jykge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlBsZWFzZSBwYXNzIHBhcmFtZXRlcnMuIEV4YW1wbGUgLT4gbmV3IFBvb2woeyB0YWdOYW1lOiBcXFwiZGl2XFxcIiB9KVwiKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAodHlwZW9mIHBhcmFtcy50YWdOYW1lICE9PSAnc3RyaW5nJykge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIlBsZWFzZSBzcGVjaWZ5IGEgdGFnTmFtZS4gRXhhbXBsZSAtPiBuZXcgUG9vbCh7IHRhZ05hbWU6IFxcXCJkaXZcXFwiIH0pXCIpO1xyXG4gICAgfVxyXG5cclxuICAgIHRoaXMuc3RvcmFnZSA9IFtdO1xyXG4gICAgdGhpcy50YWdOYW1lID0gcGFyYW1zLnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcclxuICAgIHRoaXMubmFtZXNwYWNlID0gcGFyYW1zLm5hbWVzcGFjZTtcclxufVxyXG5cclxuUG9vbC5wcm90b3R5cGUucHVzaCA9IGZ1bmN0aW9uKGVsKSB7XHJcbiAgICBpZiAoZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpICE9PSB0aGlzLnRhZ05hbWUpIHtcclxuICAgICAgICByZXR1cm47XHJcbiAgICB9XHJcbiAgICBcclxuICAgIHRoaXMuc3RvcmFnZS5wdXNoKGVsKTtcclxufTtcclxuXHJcblBvb2wucHJvdG90eXBlLnBvcCA9IGZ1bmN0aW9uKGFyZ3VtZW50KSB7XHJcbiAgICBpZiAodGhpcy5zdG9yYWdlLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmNyZWF0ZSgpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zdG9yYWdlLnBvcCgpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuUG9vbC5wcm90b3R5cGUuY3JlYXRlID0gZnVuY3Rpb24oKSB7XHJcbiAgICBpZiAodGhpcy5uYW1lc3BhY2UpIHtcclxuICAgICAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudE5TKHRoaXMubmFtZXNwYWNlLCB0aGlzLnRhZ05hbWUpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCh0aGlzLnRhZ05hbWUpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuUG9vbC5wcm90b3R5cGUuYWxsb2NhdGUgPSBmdW5jdGlvbihzaXplKSB7XHJcbiAgICBpZiAodGhpcy5zdG9yYWdlLmxlbmd0aCA+PSBzaXplKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHZhciBkaWZmZXJlbmNlID0gc2l6ZSAtIHRoaXMuc3RvcmFnZS5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciBwb29sQWxsb2NJdGVyID0gMDsgcG9vbEFsbG9jSXRlciA8IGRpZmZlcmVuY2U7IHBvb2xBbGxvY0l0ZXIrKykge1xyXG4gICAgICAgIHRoaXMuc3RvcmFnZS5wdXNoKHRoaXMuY3JlYXRlKCkpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuaWYgKHR5cGVvZiBtb2R1bGUgIT09ICd1bmRlZmluZWQnICYmIHR5cGVvZiBtb2R1bGUuZXhwb3J0cyAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgIG1vZHVsZS5leHBvcnRzID0gUG9vbDtcclxufVxyXG4iLCJ2YXIgc2xpY2UgPSBBcnJheS5wcm90b3R5cGUuc2xpY2VcblxubW9kdWxlLmV4cG9ydHMgPSBpdGVyYXRpdmVseVdhbGtcblxuZnVuY3Rpb24gaXRlcmF0aXZlbHlXYWxrKG5vZGVzLCBjYikge1xuICAgIGlmICghKCdsZW5ndGgnIGluIG5vZGVzKSkge1xuICAgICAgICBub2RlcyA9IFtub2Rlc11cbiAgICB9XG4gICAgXG4gICAgbm9kZXMgPSBzbGljZS5jYWxsKG5vZGVzKVxuXG4gICAgd2hpbGUobm9kZXMubGVuZ3RoKSB7XG4gICAgICAgIHZhciBub2RlID0gbm9kZXMuc2hpZnQoKSxcbiAgICAgICAgICAgIHJldCA9IGNiKG5vZGUpXG5cbiAgICAgICAgaWYgKHJldCkge1xuICAgICAgICAgICAgcmV0dXJuIHJldFxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKG5vZGUuY2hpbGROb2RlcyAmJiBub2RlLmNoaWxkTm9kZXMubGVuZ3RoKSB7XG4gICAgICAgICAgICBub2RlcyA9IHNsaWNlLmNhbGwobm9kZS5jaGlsZE5vZGVzKS5jb25jYXQobm9kZXMpXG4gICAgICAgIH1cbiAgICB9XG59XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBiaW5kSW50ZXJuYWwzID0gcmVxdWlyZSgnLi4vZnVuY3Rpb24vYmluZEludGVybmFsMycpO1xuXG4vKipcbiAqICMgRm9yIEVhY2hcbiAqXG4gKiBBIGZhc3QgYC5mb3JFYWNoKClgIGltcGxlbWVudGF0aW9uLlxuICpcbiAqIEBwYXJhbSAge0FycmF5fSAgICBzdWJqZWN0ICAgICBUaGUgYXJyYXkgKG9yIGFycmF5LWxpa2UpIHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiAgICAgICAgICBUaGUgdmlzaXRvciBmdW5jdGlvbi5cbiAqIEBwYXJhbSAge09iamVjdH0gICB0aGlzQ29udGV4dCBUaGUgY29udGV4dCBmb3IgdGhlIHZpc2l0b3IuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZmFzdEZvckVhY2ggKHN1YmplY3QsIGZuLCB0aGlzQ29udGV4dCkge1xuICB2YXIgbGVuZ3RoID0gc3ViamVjdC5sZW5ndGgsXG4gICAgICBpdGVyYXRvciA9IHRoaXNDb250ZXh0ICE9PSB1bmRlZmluZWQgPyBiaW5kSW50ZXJuYWwzKGZuLCB0aGlzQ29udGV4dCkgOiBmbixcbiAgICAgIGk7XG4gIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGl0ZXJhdG9yKHN1YmplY3RbaV0sIGksIHN1YmplY3QpO1xuICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqICMgSW5kZXggT2ZcbiAqXG4gKiBBIGZhc3RlciBgQXJyYXkucHJvdG90eXBlLmluZGV4T2YoKWAgaW1wbGVtZW50YXRpb24uXG4gKlxuICogQHBhcmFtICB7QXJyYXl9ICBzdWJqZWN0ICAgVGhlIGFycmF5IChvciBhcnJheS1saWtlKSB0byBzZWFyY2ggd2l0aGluLlxuICogQHBhcmFtICB7bWl4ZWR9ICB0YXJnZXQgICAgVGhlIHRhcmdldCBpdGVtIHRvIHNlYXJjaCBmb3IuXG4gKiBAcGFyYW0gIHtOdW1iZXJ9IGZyb21JbmRleCBUaGUgcG9zaXRpb24gdG8gc3RhcnQgc2VhcmNoaW5nIGZyb20sIGlmIGtub3duLlxuICogQHJldHVybiB7TnVtYmVyfSAgICAgICAgICAgVGhlIHBvc2l0aW9uIG9mIHRoZSB0YXJnZXQgaW4gdGhlIHN1YmplY3QsIG9yIC0xIGlmIGl0IGRvZXMgbm90IGV4aXN0LlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZhc3RJbmRleE9mIChzdWJqZWN0LCB0YXJnZXQsIGZyb21JbmRleCkge1xuICB2YXIgbGVuZ3RoID0gc3ViamVjdC5sZW5ndGgsXG4gICAgICBpID0gMDtcblxuICBpZiAodHlwZW9mIGZyb21JbmRleCA9PT0gJ251bWJlcicpIHtcbiAgICBpID0gZnJvbUluZGV4O1xuICAgIGlmIChpIDwgMCkge1xuICAgICAgaSArPSBsZW5ndGg7XG4gICAgICBpZiAoaSA8IDApIHtcbiAgICAgICAgaSA9IDA7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZm9yICg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGlmIChzdWJqZWN0W2ldID09PSB0YXJnZXQpIHtcbiAgICAgIHJldHVybiBpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gLTE7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYmluZEludGVybmFsNCA9IHJlcXVpcmUoJy4uL2Z1bmN0aW9uL2JpbmRJbnRlcm5hbDQnKTtcblxuLyoqXG4gKiAjIFJlZHVjZVxuICpcbiAqIEEgZmFzdCBgLnJlZHVjZSgpYCBpbXBsZW1lbnRhdGlvbi5cbiAqXG4gKiBAcGFyYW0gIHtBcnJheX0gICAgc3ViamVjdCAgICAgIFRoZSBhcnJheSAob3IgYXJyYXktbGlrZSkgdG8gcmVkdWNlLlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuICAgICAgICAgICBUaGUgcmVkdWNlciBmdW5jdGlvbi5cbiAqIEBwYXJhbSAge21peGVkfSAgICBpbml0aWFsVmFsdWUgVGhlIGluaXRpYWwgdmFsdWUgZm9yIHRoZSByZWR1Y2VyLCBkZWZhdWx0cyB0byBzdWJqZWN0WzBdLlxuICogQHBhcmFtICB7T2JqZWN0fSAgIHRoaXNDb250ZXh0ICBUaGUgY29udGV4dCBmb3IgdGhlIHJlZHVjZXIuXG4gKiBAcmV0dXJuIHttaXhlZH0gICAgICAgICAgICAgICAgIFRoZSBmaW5hbCByZXN1bHQuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZmFzdFJlZHVjZSAoc3ViamVjdCwgZm4sIGluaXRpYWxWYWx1ZSwgdGhpc0NvbnRleHQpIHtcbiAgdmFyIGxlbmd0aCA9IHN1YmplY3QubGVuZ3RoLFxuICAgICAgaXRlcmF0b3IgPSB0aGlzQ29udGV4dCAhPT0gdW5kZWZpbmVkID8gYmluZEludGVybmFsNChmbiwgdGhpc0NvbnRleHQpIDogZm4sXG4gICAgICBpLCByZXN1bHQ7XG5cbiAgaWYgKGluaXRpYWxWYWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgaSA9IDE7XG4gICAgcmVzdWx0ID0gc3ViamVjdFswXTtcbiAgfVxuICBlbHNlIHtcbiAgICBpID0gMDtcbiAgICByZXN1bHQgPSBpbml0aWFsVmFsdWU7XG4gIH1cblxuICBmb3IgKDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgcmVzdWx0ID0gaXRlcmF0b3IocmVzdWx0LCBzdWJqZWN0W2ldLCBpLCBzdWJqZWN0KTtcbiAgfVxuXG4gIHJldHVybiByZXN1bHQ7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZm9yRWFjaEFycmF5ID0gcmVxdWlyZSgnLi9hcnJheS9mb3JFYWNoJyksXG4gICAgZm9yRWFjaE9iamVjdCA9IHJlcXVpcmUoJy4vb2JqZWN0L2ZvckVhY2gnKTtcblxuLyoqXG4gKiAjIEZvckVhY2hcbiAqXG4gKiBBIGZhc3QgYC5mb3JFYWNoKClgIGltcGxlbWVudGF0aW9uLlxuICpcbiAqIEBwYXJhbSAge0FycmF5fE9iamVjdH0gc3ViamVjdCAgICAgVGhlIGFycmF5IG9yIG9iamVjdCB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gICAgIGZuICAgICAgICAgIFRoZSB2aXNpdG9yIGZ1bmN0aW9uLlxuICogQHBhcmFtICB7T2JqZWN0fSAgICAgICB0aGlzQ29udGV4dCBUaGUgY29udGV4dCBmb3IgdGhlIHZpc2l0b3IuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZmFzdEZvckVhY2ggKHN1YmplY3QsIGZuLCB0aGlzQ29udGV4dCkge1xuICBpZiAoc3ViamVjdCBpbnN0YW5jZW9mIEFycmF5KSB7XG4gICAgcmV0dXJuIGZvckVhY2hBcnJheShzdWJqZWN0LCBmbiwgdGhpc0NvbnRleHQpO1xuICB9XG4gIGVsc2Uge1xuICAgIHJldHVybiBmb3JFYWNoT2JqZWN0KHN1YmplY3QsIGZuLCB0aGlzQ29udGV4dCk7XG4gIH1cbn07IiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEludGVybmFsIGhlbHBlciB0byBiaW5kIGEgZnVuY3Rpb24ga25vd24gdG8gaGF2ZSAzIGFyZ3VtZW50c1xuICogdG8gYSBnaXZlbiBjb250ZXh0LlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGJpbmRJbnRlcm5hbDMgKGZ1bmMsIHRoaXNDb250ZXh0KSB7XG4gIHJldHVybiBmdW5jdGlvbiAoYSwgYiwgYykge1xuICAgIHJldHVybiBmdW5jLmNhbGwodGhpc0NvbnRleHQsIGEsIGIsIGMpO1xuICB9O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBJbnRlcm5hbCBoZWxwZXIgdG8gYmluZCBhIGZ1bmN0aW9uIGtub3duIHRvIGhhdmUgNCBhcmd1bWVudHNcbiAqIHRvIGEgZ2l2ZW4gY29udGV4dC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBiaW5kSW50ZXJuYWw0IChmdW5jLCB0aGlzQ29udGV4dCkge1xuICByZXR1cm4gZnVuY3Rpb24gKGEsIGIsIGMsIGQpIHtcbiAgICByZXR1cm4gZnVuYy5jYWxsKHRoaXNDb250ZXh0LCBhLCBiLCBjLCBkKTtcbiAgfTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogQW5hbG9ndWUgb2YgT2JqZWN0LmFzc2lnbigpLlxuICogQ29waWVzIHByb3BlcnRpZXMgZnJvbSBvbmUgb3IgbW9yZSBzb3VyY2Ugb2JqZWN0cyB0b1xuICogYSB0YXJnZXQgb2JqZWN0LiBFeGlzdGluZyBrZXlzIG9uIHRoZSB0YXJnZXQgb2JqZWN0IHdpbGwgYmUgb3ZlcndyaXR0ZW4uXG4gKlxuICogPiBOb3RlOiBUaGlzIGRpZmZlcnMgZnJvbSBzcGVjIGluIHNvbWUgaW1wb3J0YW50IHdheXM6XG4gKiA+IDEuIFdpbGwgdGhyb3cgaWYgcGFzc2VkIG5vbi1vYmplY3RzLCBpbmNsdWRpbmcgYHVuZGVmaW5lZGAgb3IgYG51bGxgIHZhbHVlcy5cbiAqID4gMi4gRG9lcyBub3Qgc3VwcG9ydCB0aGUgY3VyaW91cyBFeGNlcHRpb24gaGFuZGxpbmcgYmVoYXZpb3IsIGV4Y2VwdGlvbnMgYXJlIHRocm93biBpbW1lZGlhdGVseS5cbiAqID4gRm9yIG1vcmUgZGV0YWlscywgc2VlOlxuICogPiBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9PYmplY3QvYXNzaWduXG4gKlxuICpcbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IHRhcmdldCAgICAgIFRoZSB0YXJnZXQgb2JqZWN0IHRvIGNvcHkgcHJvcGVydGllcyB0by5cbiAqIEBwYXJhbSAge09iamVjdH0gc291cmNlLCAuLi4gVGhlIHNvdXJjZShzKSB0byBjb3B5IHByb3BlcnRpZXMgZnJvbS5cbiAqIEByZXR1cm4ge09iamVjdH0gICAgICAgICAgICAgVGhlIHVwZGF0ZWQgdGFyZ2V0IG9iamVjdC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBmYXN0QXNzaWduICh0YXJnZXQpIHtcbiAgdmFyIHRvdGFsQXJncyA9IGFyZ3VtZW50cy5sZW5ndGgsXG4gICAgICBzb3VyY2UsIGksIHRvdGFsS2V5cywga2V5cywga2V5LCBqO1xuXG4gIGZvciAoaSA9IDE7IGkgPCB0b3RhbEFyZ3M7IGkrKykge1xuICAgIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcbiAgICBrZXlzID0gT2JqZWN0LmtleXMoc291cmNlKTtcbiAgICB0b3RhbEtleXMgPSBrZXlzLmxlbmd0aDtcbiAgICBmb3IgKGogPSAwOyBqIDwgdG90YWxLZXlzOyBqKyspIHtcbiAgICAgIGtleSA9IGtleXNbal07XG4gICAgICB0YXJnZXRba2V5XSA9IHNvdXJjZVtrZXldO1xuICAgIH1cbiAgfVxuICByZXR1cm4gdGFyZ2V0O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGJpbmRJbnRlcm5hbDMgPSByZXF1aXJlKCcuLi9mdW5jdGlvbi9iaW5kSW50ZXJuYWwzJyk7XG5cbi8qKlxuICogIyBGb3IgRWFjaFxuICpcbiAqIEEgZmFzdCBvYmplY3QgYC5mb3JFYWNoKClgIGltcGxlbWVudGF0aW9uLlxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gICBzdWJqZWN0ICAgICBUaGUgb2JqZWN0IHRvIGl0ZXJhdGUgb3Zlci5cbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiAgICAgICAgICBUaGUgdmlzaXRvciBmdW5jdGlvbi5cbiAqIEBwYXJhbSAge09iamVjdH0gICB0aGlzQ29udGV4dCBUaGUgY29udGV4dCBmb3IgdGhlIHZpc2l0b3IuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZmFzdEZvckVhY2hPYmplY3QgKHN1YmplY3QsIGZuLCB0aGlzQ29udGV4dCkge1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHN1YmplY3QpLFxuICAgICAgbGVuZ3RoID0ga2V5cy5sZW5ndGgsXG4gICAgICBpdGVyYXRvciA9IHRoaXNDb250ZXh0ICE9PSB1bmRlZmluZWQgPyBiaW5kSW50ZXJuYWwzKGZuLCB0aGlzQ29udGV4dCkgOiBmbixcbiAgICAgIGtleSwgaTtcbiAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAga2V5ID0ga2V5c1tpXTtcbiAgICBpdGVyYXRvcihzdWJqZWN0W2tleV0sIGtleSwgc3ViamVjdCk7XG4gIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBiaW5kSW50ZXJuYWw0ID0gcmVxdWlyZSgnLi4vZnVuY3Rpb24vYmluZEludGVybmFsNCcpO1xuXG4vKipcbiAqICMgUmVkdWNlXG4gKlxuICogQSBmYXN0IG9iamVjdCBgLnJlZHVjZSgpYCBpbXBsZW1lbnRhdGlvbi5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgc3ViamVjdCAgICAgIFRoZSBvYmplY3QgdG8gcmVkdWNlIG92ZXIuXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm4gICAgICAgICAgIFRoZSByZWR1Y2VyIGZ1bmN0aW9uLlxuICogQHBhcmFtICB7bWl4ZWR9ICAgIGluaXRpYWxWYWx1ZSBUaGUgaW5pdGlhbCB2YWx1ZSBmb3IgdGhlIHJlZHVjZXIsIGRlZmF1bHRzIHRvIHN1YmplY3RbMF0uXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgdGhpc0NvbnRleHQgIFRoZSBjb250ZXh0IGZvciB0aGUgcmVkdWNlci5cbiAqIEByZXR1cm4ge21peGVkfSAgICAgICAgICAgICAgICAgVGhlIGZpbmFsIHJlc3VsdC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBmYXN0UmVkdWNlT2JqZWN0IChzdWJqZWN0LCBmbiwgaW5pdGlhbFZhbHVlLCB0aGlzQ29udGV4dCkge1xuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHN1YmplY3QpLFxuICAgICAgbGVuZ3RoID0ga2V5cy5sZW5ndGgsXG4gICAgICBpdGVyYXRvciA9IHRoaXNDb250ZXh0ICE9PSB1bmRlZmluZWQgPyBiaW5kSW50ZXJuYWw0KGZuLCB0aGlzQ29udGV4dCkgOiBmbixcbiAgICAgIGksIGtleSwgcmVzdWx0O1xuXG4gIGlmIChpbml0aWFsVmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgIGkgPSAxO1xuICAgIHJlc3VsdCA9IHN1YmplY3Rba2V5c1swXV07XG4gIH1cbiAgZWxzZSB7XG4gICAgaSA9IDA7XG4gICAgcmVzdWx0ID0gaW5pdGlhbFZhbHVlO1xuICB9XG5cbiAgZm9yICg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGtleSA9IGtleXNbaV07XG4gICAgcmVzdWx0ID0gaXRlcmF0b3IocmVzdWx0LCBzdWJqZWN0W2tleV0sIGtleSwgc3ViamVjdCk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHJlZHVjZUFycmF5ID0gcmVxdWlyZSgnLi9hcnJheS9yZWR1Y2UnKSxcbiAgICByZWR1Y2VPYmplY3QgPSByZXF1aXJlKCcuL29iamVjdC9yZWR1Y2UnKTtcblxuLyoqXG4gKiAjIFJlZHVjZVxuICpcbiAqIEEgZmFzdCBgLnJlZHVjZSgpYCBpbXBsZW1lbnRhdGlvbi5cbiAqXG4gKiBAcGFyYW0gIHtBcnJheXxPYmplY3R9IHN1YmplY3QgICAgICBUaGUgYXJyYXkgb3Igb2JqZWN0IHRvIHJlZHVjZSBvdmVyLlxuICogQHBhcmFtICB7RnVuY3Rpb259ICAgICBmbiAgICAgICAgICAgVGhlIHJlZHVjZXIgZnVuY3Rpb24uXG4gKiBAcGFyYW0gIHttaXhlZH0gICAgICAgIGluaXRpYWxWYWx1ZSBUaGUgaW5pdGlhbCB2YWx1ZSBmb3IgdGhlIHJlZHVjZXIsIGRlZmF1bHRzIHRvIHN1YmplY3RbMF0uXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgICAgIHRoaXNDb250ZXh0ICBUaGUgY29udGV4dCBmb3IgdGhlIHJlZHVjZXIuXG4gKiBAcmV0dXJuIHtBcnJheXxPYmplY3R9ICAgICAgICAgICAgICBUaGUgYXJyYXkgb3Igb2JqZWN0IGNvbnRhaW5pbmcgdGhlIHJlc3VsdHMuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZmFzdFJlZHVjZSAoc3ViamVjdCwgZm4sIGluaXRpYWxWYWx1ZSwgdGhpc0NvbnRleHQpIHtcbiAgaWYgKHN1YmplY3QgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgIHJldHVybiByZWR1Y2VBcnJheShzdWJqZWN0LCBmbiwgaW5pdGlhbFZhbHVlLCB0aGlzQ29udGV4dCk7XG4gIH1cbiAgZWxzZSB7XG4gICAgcmV0dXJuIHJlZHVjZU9iamVjdChzdWJqZWN0LCBmbiwgaW5pdGlhbFZhbHVlLCB0aGlzQ29udGV4dCk7XG4gIH1cbn07IiwiLyoqIGdlbmVyYXRlIHVuaXF1ZSBpZCBmb3Igc2VsZWN0b3IgKi9cclxudmFyIGNvdW50ZXIgPSBEYXRlLm5vdygpICUgMWU5O1xyXG5cclxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBnZXRVaWQoKXtcclxuXHRyZXR1cm4gKE1hdGgucmFuZG9tKCkgKiAxZTkgPj4+IDApICsgKGNvdW50ZXIrKyk7XHJcbn07IiwiLypnbG9iYWwgd2luZG93Ki9cblxuLyoqXG4gKiBDaGVjayBpZiBvYmplY3QgaXMgZG9tIG5vZGUuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IHZhbFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc05vZGUodmFsKXtcbiAgaWYgKCF2YWwgfHwgdHlwZW9mIHZhbCAhPT0gJ29iamVjdCcpIHJldHVybiBmYWxzZTtcbiAgaWYgKHdpbmRvdyAmJiAnb2JqZWN0JyA9PSB0eXBlb2Ygd2luZG93Lk5vZGUpIHJldHVybiB2YWwgaW5zdGFuY2VvZiB3aW5kb3cuTm9kZTtcbiAgcmV0dXJuICdudW1iZXInID09IHR5cGVvZiB2YWwubm9kZVR5cGUgJiYgJ3N0cmluZycgPT0gdHlwZW9mIHZhbC5ub2RlTmFtZTtcbn1cbiIsIm1vZHVsZS5leHBvcnRzID0gaXNQcm9taXNlO1xuXG5mdW5jdGlvbiBpc1Byb21pc2Uob2JqKSB7XG4gIHJldHVybiBvYmogJiYgKHR5cGVvZiBvYmogPT09ICdvYmplY3QnIHx8IHR5cGVvZiBvYmogPT09ICdmdW5jdGlvbicpICYmIHR5cGVvZiBvYmoudGhlbiA9PT0gJ2Z1bmN0aW9uJztcbn1cbiIsIihmdW5jdGlvbiAocm9vdCwgZmFjdG9yeSl7XG4gICd1c2Ugc3RyaWN0JztcblxuICAvKmlzdGFuYnVsIGlnbm9yZSBuZXh0OmNhbnQgdGVzdCovXG4gIGlmICh0eXBlb2YgbW9kdWxlID09PSAnb2JqZWN0JyAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09ICdvYmplY3QnKSB7XG4gICAgbW9kdWxlLmV4cG9ydHMgPSBmYWN0b3J5KCk7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgLy8gQU1ELiBSZWdpc3RlciBhcyBhbiBhbm9ueW1vdXMgbW9kdWxlLlxuICAgIGRlZmluZShbXSwgZmFjdG9yeSk7XG4gIH0gZWxzZSB7XG4gICAgLy8gQnJvd3NlciBnbG9iYWxzXG4gICAgcm9vdC5vYmplY3RQYXRoID0gZmFjdG9yeSgpO1xuICB9XG59KSh0aGlzLCBmdW5jdGlvbigpe1xuICAndXNlIHN0cmljdCc7XG5cbiAgdmFyXG4gICAgdG9TdHIgPSBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLFxuICAgIF9oYXNPd25Qcm9wZXJ0eSA9IE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHk7XG5cbiAgZnVuY3Rpb24gaXNFbXB0eSh2YWx1ZSl7XG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgcmV0dXJuIHRydWU7XG4gICAgfVxuICAgIGlmIChpc0FycmF5KHZhbHVlKSAmJiB2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICBmb3IgKHZhciBpIGluIHZhbHVlKSB7XG4gICAgICAgIGlmIChfaGFzT3duUHJvcGVydHkuY2FsbCh2YWx1ZSwgaSkpIHtcbiAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHRvU3RyaW5nKHR5cGUpe1xuICAgIHJldHVybiB0b1N0ci5jYWxsKHR5cGUpO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNOdW1iZXIodmFsdWUpe1xuICAgIHJldHVybiB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInIHx8IHRvU3RyaW5nKHZhbHVlKSA9PT0gXCJbb2JqZWN0IE51bWJlcl1cIjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzU3RyaW5nKG9iail7XG4gICAgcmV0dXJuIHR5cGVvZiBvYmogPT09ICdzdHJpbmcnIHx8IHRvU3RyaW5nKG9iaikgPT09IFwiW29iamVjdCBTdHJpbmddXCI7XG4gIH1cblxuICBmdW5jdGlvbiBpc09iamVjdChvYmope1xuICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyAmJiB0b1N0cmluZyhvYmopID09PSBcIltvYmplY3QgT2JqZWN0XVwiO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNBcnJheShvYmope1xuICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyAmJiB0eXBlb2Ygb2JqLmxlbmd0aCA9PT0gJ251bWJlcicgJiYgdG9TdHJpbmcob2JqKSA9PT0gJ1tvYmplY3QgQXJyYXldJztcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzQm9vbGVhbihvYmope1xuICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnYm9vbGVhbicgfHwgdG9TdHJpbmcob2JqKSA9PT0gJ1tvYmplY3QgQm9vbGVhbl0nO1xuICB9XG5cbiAgZnVuY3Rpb24gZ2V0S2V5KGtleSl7XG4gICAgdmFyIGludEtleSA9IHBhcnNlSW50KGtleSk7XG4gICAgaWYgKGludEtleS50b1N0cmluZygpID09PSBrZXkpIHtcbiAgICAgIHJldHVybiBpbnRLZXk7XG4gICAgfVxuICAgIHJldHVybiBrZXk7XG4gIH1cblxuICBmdW5jdGlvbiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKXtcbiAgICBpZiAoaXNOdW1iZXIocGF0aCkpIHtcbiAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgfVxuICAgIGlmIChpc0VtcHR5KHBhdGgpKSB7XG4gICAgICByZXR1cm4gb2JqO1xuICAgIH1cbiAgICBpZiAoaXNTdHJpbmcocGF0aCkpIHtcbiAgICAgIHJldHVybiBzZXQob2JqLCBwYXRoLnNwbGl0KCcuJykubWFwKGdldEtleSksIHZhbHVlLCBkb05vdFJlcGxhY2UpO1xuICAgIH1cbiAgICB2YXIgY3VycmVudFBhdGggPSBwYXRoWzBdO1xuXG4gICAgaWYgKHBhdGgubGVuZ3RoID09PSAxKSB7XG4gICAgICB2YXIgb2xkVmFsID0gb2JqW2N1cnJlbnRQYXRoXTtcbiAgICAgIGlmIChvbGRWYWwgPT09IHZvaWQgMCB8fCAhZG9Ob3RSZXBsYWNlKSB7XG4gICAgICAgIG9ialtjdXJyZW50UGF0aF0gPSB2YWx1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvbGRWYWw7XG4gICAgfVxuXG4gICAgaWYgKG9ialtjdXJyZW50UGF0aF0gPT09IHZvaWQgMCkge1xuICAgICAgLy9jaGVjayBpZiB3ZSBhc3N1bWUgYW4gYXJyYXlcbiAgICAgIGlmKGlzTnVtYmVyKHBhdGhbMV0pKSB7XG4gICAgICAgIG9ialtjdXJyZW50UGF0aF0gPSBbXTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIG9ialtjdXJyZW50UGF0aF0gPSB7fTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gc2V0KG9ialtjdXJyZW50UGF0aF0sIHBhdGguc2xpY2UoMSksIHZhbHVlLCBkb05vdFJlcGxhY2UpO1xuICB9XG5cbiAgZnVuY3Rpb24gZGVsKG9iaiwgcGF0aCkge1xuICAgIGlmIChpc051bWJlcihwYXRoKSkge1xuICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICB9XG5cbiAgICBpZiAoaXNFbXB0eShvYmopKSB7XG4gICAgICByZXR1cm4gdm9pZCAwO1xuICAgIH1cblxuICAgIGlmIChpc0VtcHR5KHBhdGgpKSB7XG4gICAgICByZXR1cm4gb2JqO1xuICAgIH1cbiAgICBpZihpc1N0cmluZyhwYXRoKSkge1xuICAgICAgcmV0dXJuIGRlbChvYmosIHBhdGguc3BsaXQoJy4nKSk7XG4gICAgfVxuXG4gICAgdmFyIGN1cnJlbnRQYXRoID0gZ2V0S2V5KHBhdGhbMF0pO1xuICAgIHZhciBvbGRWYWwgPSBvYmpbY3VycmVudFBhdGhdO1xuXG4gICAgaWYocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGlmIChvbGRWYWwgIT09IHZvaWQgMCkge1xuICAgICAgICBpZiAoaXNBcnJheShvYmopKSB7XG4gICAgICAgICAgb2JqLnNwbGljZShjdXJyZW50UGF0aCwgMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVsZXRlIG9ialtjdXJyZW50UGF0aF07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgaWYgKG9ialtjdXJyZW50UGF0aF0gIT09IHZvaWQgMCkge1xuICAgICAgICByZXR1cm4gZGVsKG9ialtjdXJyZW50UGF0aF0sIHBhdGguc2xpY2UoMSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBvYmo7XG4gIH1cblxuICB2YXIgb2JqZWN0UGF0aCA9IHt9O1xuXG4gIG9iamVjdFBhdGguaGFzID0gZnVuY3Rpb24gKG9iaiwgcGF0aCkge1xuICAgIGlmIChpc0VtcHR5KG9iaikpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBpZiAoaXNOdW1iZXIocGF0aCkpIHtcbiAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgfSBlbHNlIGlmIChpc1N0cmluZyhwYXRoKSkge1xuICAgICAgcGF0aCA9IHBhdGguc3BsaXQoJy4nKTtcbiAgICB9XG5cbiAgICBpZiAoaXNFbXB0eShwYXRoKSB8fCBwYXRoLmxlbmd0aCA9PT0gMCkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGF0aC5sZW5ndGg7IGkrKykge1xuICAgICAgdmFyIGogPSBwYXRoW2ldO1xuICAgICAgaWYgKChpc09iamVjdChvYmopIHx8IGlzQXJyYXkob2JqKSkgJiYgX2hhc093blByb3BlcnR5LmNhbGwob2JqLCBqKSkge1xuICAgICAgICBvYmogPSBvYmpbal07XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRydWU7XG4gIH07XG5cbiAgb2JqZWN0UGF0aC5lbnN1cmVFeGlzdHMgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSl7XG4gICAgcmV0dXJuIHNldChvYmosIHBhdGgsIHZhbHVlLCB0cnVlKTtcbiAgfTtcblxuICBvYmplY3RQYXRoLnNldCA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIHZhbHVlLCBkb05vdFJlcGxhY2Upe1xuICAgIHJldHVybiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgfTtcblxuICBvYmplY3RQYXRoLmluc2VydCA9IGZ1bmN0aW9uIChvYmosIHBhdGgsIHZhbHVlLCBhdCl7XG4gICAgdmFyIGFyciA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aCk7XG4gICAgYXQgPSB+fmF0O1xuICAgIGlmICghaXNBcnJheShhcnIpKSB7XG4gICAgICBhcnIgPSBbXTtcbiAgICAgIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgYXJyKTtcbiAgICB9XG4gICAgYXJyLnNwbGljZShhdCwgMCwgdmFsdWUpO1xuICB9O1xuXG4gIG9iamVjdFBhdGguZW1wdHkgPSBmdW5jdGlvbihvYmosIHBhdGgpIHtcbiAgICBpZiAoaXNFbXB0eShwYXRoKSkge1xuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG4gICAgaWYgKGlzRW1wdHkob2JqKSkge1xuICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICB9XG5cbiAgICB2YXIgdmFsdWUsIGk7XG4gICAgaWYgKCEodmFsdWUgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpKSkge1xuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG5cbiAgICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCAnJyk7XG4gICAgfSBlbHNlIGlmIChpc0Jvb2xlYW4odmFsdWUpKSB7XG4gICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBmYWxzZSk7XG4gICAgfSBlbHNlIGlmIChpc051bWJlcih2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIDApO1xuICAgIH0gZWxzZSBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgIHZhbHVlLmxlbmd0aCA9IDA7XG4gICAgfSBlbHNlIGlmIChpc09iamVjdCh2YWx1ZSkpIHtcbiAgICAgIGZvciAoaSBpbiB2YWx1ZSkge1xuICAgICAgICBpZiAoX2hhc093blByb3BlcnR5LmNhbGwodmFsdWUsIGkpKSB7XG4gICAgICAgICAgZGVsZXRlIHZhbHVlW2ldO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIG51bGwpO1xuICAgIH1cbiAgfTtcblxuICBvYmplY3RQYXRoLnB1c2ggPSBmdW5jdGlvbiAob2JqLCBwYXRoIC8qLCB2YWx1ZXMgKi8pe1xuICAgIHZhciBhcnIgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpO1xuICAgIGlmICghaXNBcnJheShhcnIpKSB7XG4gICAgICBhcnIgPSBbXTtcbiAgICAgIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgYXJyKTtcbiAgICB9XG5cbiAgICBhcnIucHVzaC5hcHBseShhcnIsIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMikpO1xuICB9O1xuXG4gIG9iamVjdFBhdGguY29hbGVzY2UgPSBmdW5jdGlvbiAob2JqLCBwYXRocywgZGVmYXVsdFZhbHVlKSB7XG4gICAgdmFyIHZhbHVlO1xuXG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IHBhdGhzLmxlbmd0aDsgaSA8IGxlbjsgaSsrKSB7XG4gICAgICBpZiAoKHZhbHVlID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoc1tpXSkpICE9PSB2b2lkIDApIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gIH07XG5cbiAgb2JqZWN0UGF0aC5nZXQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCBkZWZhdWx0VmFsdWUpe1xuICAgIGlmIChpc051bWJlcihwYXRoKSkge1xuICAgICAgcGF0aCA9IFtwYXRoXTtcbiAgICB9XG4gICAgaWYgKGlzRW1wdHkocGF0aCkpIHtcbiAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuICAgIGlmIChpc0VtcHR5KG9iaikpIHtcbiAgICAgIHJldHVybiBkZWZhdWx0VmFsdWU7XG4gICAgfVxuICAgIGlmIChpc1N0cmluZyhwYXRoKSkge1xuICAgICAgcmV0dXJuIG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aC5zcGxpdCgnLicpLCBkZWZhdWx0VmFsdWUpO1xuICAgIH1cblxuICAgIHZhciBjdXJyZW50UGF0aCA9IGdldEtleShwYXRoWzBdKTtcblxuICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgaWYgKG9ialtjdXJyZW50UGF0aF0gPT09IHZvaWQgMCkge1xuICAgICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgICAgfVxuICAgICAgcmV0dXJuIG9ialtjdXJyZW50UGF0aF07XG4gICAgfVxuXG4gICAgcmV0dXJuIG9iamVjdFBhdGguZ2V0KG9ialtjdXJyZW50UGF0aF0sIHBhdGguc2xpY2UoMSksIGRlZmF1bHRWYWx1ZSk7XG4gIH07XG5cbiAgb2JqZWN0UGF0aC5kZWwgPSBmdW5jdGlvbihvYmosIHBhdGgpIHtcbiAgICByZXR1cm4gZGVsKG9iaiwgcGF0aCk7XG4gIH07XG5cbiAgcmV0dXJuIG9iamVjdFBhdGg7XG59KTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL3NsaWNlZCcpO1xuIiwiXG4vKipcbiAqIEFuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cykgYWx0ZXJuYXRpdmVcbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gYXJncyBzb21ldGhpbmcgd2l0aCBhIGxlbmd0aFxuICogQHBhcmFtIHtOdW1iZXJ9IHNsaWNlXG4gKiBAcGFyYW0ge051bWJlcn0gc2xpY2VFbmRcbiAqIEBhcGkgcHVibGljXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiAoYXJncywgc2xpY2UsIHNsaWNlRW5kKSB7XG4gIHZhciByZXQgPSBbXTtcbiAgdmFyIGxlbiA9IGFyZ3MubGVuZ3RoO1xuXG4gIGlmICgwID09PSBsZW4pIHJldHVybiByZXQ7XG5cbiAgdmFyIHN0YXJ0ID0gc2xpY2UgPCAwXG4gICAgPyBNYXRoLm1heCgwLCBzbGljZSArIGxlbilcbiAgICA6IHNsaWNlIHx8IDA7XG5cbiAgaWYgKHNsaWNlRW5kICE9PSB1bmRlZmluZWQpIHtcbiAgICBsZW4gPSBzbGljZUVuZCA8IDBcbiAgICAgID8gc2xpY2VFbmQgKyBsZW5cbiAgICAgIDogc2xpY2VFbmRcbiAgfVxuXG4gIHdoaWxlIChsZW4tLSA+IHN0YXJ0KSB7XG4gICAgcmV0W2xlbiAtIHN0YXJ0XSA9IGFyZ3NbbGVuXTtcbiAgfVxuXG4gIHJldHVybiByZXQ7XG59XG5cbiIsImltcG9ydCB7IGVsZW1lbnQgfSBmcm9tICdkZWt1J1xuaW1wb3J0IHsgZ2V0Q29vcmRzIH0gZnJvbSAnLi4vLi4vbW9kdWxlcy9nZW9sb2NhdGlvbidcbmltcG9ydCB7IHVwZGF0ZU1hcCB9IGZyb20gJy4uL21hcCdcblxuY29uc3QgaWQgPSAnMUJIbmFhbjNZZlNEcTlfTHpqdGhEWGpqNWR6SlpBTmpMU2I4SkhQbDUnXG5cblxuLy8gUXVlcnkgdmFyaWFibGVzXG5sZXQgbGF0XG5sZXQgbG5nXG5sZXQgcmFkaXVzID0gMzAwXG5cbmdldENvb3JkcygpLnRoZW4oKGNvb3JkcykgPT4ge1xuICAgIGxhdCA9IGNvb3Jkcy5sYXRcbiAgICBsbmcgPSBjb29yZHMubG5nXG4gICAgZ2V0U3BlY2lhbHMoKVxufSlcblxuZnVuY3Rpb24gcmVuZGVyKGNvbXBvbmVudCkge1xuICAgIHJldHVybiAoXG4gICAgICAgIDxmb3JtPlxuICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgICAgb25JbnB1dD17Y2hhbmdlUmFkaXVzUmFuZ2V9XG4gICAgICAgICAgICAgICAgbmFtZT1cInJhZGl1cy1yYW5nZVwiXG4gICAgICAgICAgICAgICAgY2xhc3M9XCJtZGwtc2xpZGVyIG1kbC1qcy1zbGlkZXJcIlxuICAgICAgICAgICAgICAgIHR5cGU9XCJyYW5nZVwiXG4gICAgICAgICAgICAgICAgc3RlcD1cIjEwMFwiXG4gICAgICAgICAgICAgICAgbWluPVwiMTAwXCJcbiAgICAgICAgICAgICAgICBtYXg9XCI1MDAwXCJcbiAgICAgICAgICAgICAgICB2YWx1ZT17cmFkaXVzfVxuICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDxpbnB1dFxuICAgICAgICAgICAgICAgIG9uSW5wdXQ9e2NoYW5nZVJhZGl1c0lucHV0fVxuICAgICAgICAgICAgICAgIG5hbWU9XCJyYWRpdXMtbnVtYmVyXCJcbiAgICAgICAgICAgICAgICB0eXBlPVwibnVtYmVyXCJcbiAgICAgICAgICAgICAgICBzdGVwPVwiNTBcIlxuICAgICAgICAgICAgICAgIG1pbj1cIjEwMFwiXG4gICAgICAgICAgICAgICAgbWF4PVwiNTAwMFwiXG4gICAgICAgICAgICAgICAgdmFsdWU9e3JhZGl1c31cbiAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8bGFiZWw+IEZvb2Q6XG4gICAgICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgICAgICAgIG5hbWU9XCJmb29kXCJcbiAgICAgICAgICAgICAgICAgICAgdHlwZT1cImNoZWNrYm94XCJcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tlZFxuICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgPGxhYmVsPiBEcmluazpcbiAgICAgICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgICAgICAgbmFtZT1cImZvb2RcIlxuICAgICAgICAgICAgICAgICAgICB0eXBlPVwiY2hlY2tib3hcIlxuICAgICAgICAgICAgICAgICAgICBjaGVja2VkXG4gICAgICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDwvbGFiZWw+XG4gICAgICAgIDwvZm9ybT5cbiAgICApXG59XG5cbmxldCBlbFxuZnVuY3Rpb24gYWZ0ZXJSZW5kZXIoY29tcG9uZW50LCBfZWwpIHtcbiAgICBlbCA9IF9lbFxufVxuXG5mdW5jdGlvbiBnZXRTcGVjaWFscygpIHtcbiAgICBsZXQgcXVlcnkgPSB7XG4gICAgICAgIHNlbGVjdDogJ2FkZHJlc3MnXG4gICAgICAsIGZyb206IGlkXG4gICAgICAsIHdoZXJlOiBgU1RfSU5URVJTRUNUUyhhZGRyZXNzLFxuICAgICAgICAgICAgQ0lSQ0xFKExBVExORygke2xhdH0sICR7bG5nfSksICR7cmFkaXVzfSkpXG4gICAgICAgIGBcbiAgICB9XG4gICAgdXBkYXRlTWFwKGxhdCwgbG5nLCByYWRpdXMsIHF1ZXJ5KVxufVxuXG5cbi8qIEV2ZW50cyAqL1xuZnVuY3Rpb24gY2hhbmdlUmFkaXVzUmFuZ2UoZSkge1xuICAgIHJhZGl1cyA9IGUuZGVsZWdhdGVUYXJnZXQudmFsdWVBc051bWJlclxuICAgIGVsLnF1ZXJ5U2VsZWN0b3IoJ1tuYW1lPXJhZGl1cy1udW1iZXJdJykudmFsdWUgPSByYWRpdXNcblxuICAgIGdldFNwZWNpYWxzKClcbn1cblxuZnVuY3Rpb24gY2hhbmdlUmFkaXVzSW5wdXQoZSkge1xuICAgIHJhZGl1cyA9IGUuZGVsZWdhdGVUYXJnZXQudmFsdWVBc051bWJlclxuICAgIGVsLnF1ZXJ5U2VsZWN0b3IoJ1tuYW1lPXJhZGl1cy1yYW5nZV0nKS52YWx1ZSA9IHJhZGl1c1xuXG4gICAgZ2V0U3BlY2lhbHMoKVxufVxuXG5mdW5jdGlvbiBtYXJrZXJEcmFnZ2VkKGUpIHtcbiAgICBsYXQgPSBlLmxhdExuZy5sYXQoKVxuICAgIGxuZyA9IGUubGF0TG5nLmxuZygpXG4gICAgZ2V0U3BlY2lhbHMoKVxufVxuXG5cbmV4cG9ydCB7IG1hcmtlckRyYWdnZWQgfVxuZXhwb3J0IGRlZmF1bHQgeyByZW5kZXIsIGFmdGVyUmVuZGVyIH0iLCJpbXBvcnQgeyBlbGVtZW50IH0gZnJvbSAnZGVrdSdcbmltcG9ydCB7IGdldENvb3JkcyB9IGZyb20gJy4uLy4uL21vZHVsZXMvZ2VvbG9jYXRpb24nXG5pbXBvcnQgeyBtYXJrZXJEcmFnZ2VkIH0gZnJvbSAnLi4vZm9ybSdcblxuY29uc3QgaWQgPSAnMUJIbmFhbjNZZlNEcTlfTHpqdGhEWGpqNWR6SlpBTmpMU2I4SkhQbDUnXG5cbmZ1bmN0aW9uIHJlbmRlcihjb21wb25lbnQpIHtcbiAgICBsZXQgeyBwcm9wcywgc3RhdGUgfSA9IGNvbXBvbmVudFxuICAgIHJldHVybiA8ZGl2IGNsYXNzPVwibWFwXCI+PC9kaXY+XG59XG5cbmxldCBtYXBcbmZ1bmN0aW9uIGFmdGVyTW91bnQoY29tcG9uZW50LCBlbCwgc2V0U3RhdGUpIHtcbiAgICBtYXAgPSBnZXRNYXAoZWwpXG59XG5cbmZ1bmN0aW9uIGdldE1hcChlbCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICBpZiAoZWwpIHtcbiAgICAgICAgICAgIGdldENvb3JkcygpLnRoZW4oKGNvb3JkcykgPT4ge1xuICAgICAgICAgICAgICAgIG1hcCA9IG5ldyBnb29nbGUubWFwcy5NYXAoZWwsIHtcbiAgICAgICAgICAgICAgICAgICAgY2VudGVyOiB7IGxhdDogY29vcmRzLmxhdCwgbG5nOiBjb29yZHMubG5nIH1cbiAgICAgICAgICAgICAgICAgICwgem9vbTogMTZcbiAgICAgICAgICAgICAgICB9KVxuXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShtYXApXG4gICAgICAgICAgICB9KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzb2x2ZShtYXApXG4gICAgICAgIH1cbiAgICB9KVxufVxuXG5sZXQgZnVzaW9uVGFibGVzTGF5ZXJcbmxldCBwb3NNYXJrZXJcbmxldCBjaXJjbGVMYXllclxuZnVuY3Rpb24gdXBkYXRlTWFwKGxhdCwgbG5nLCByYWRpdXMsIHF1ZXJ5KSB7XG4gICAgZ2V0TWFwKCkudGhlbigobWFwKSA9PiB7XG4gICAgICAgIGlmICghZnVzaW9uVGFibGVzTGF5ZXIpIHtcbiAgICAgICAgICAgIGZ1c2lvblRhYmxlc0xheWVyID0gbmV3IGdvb2dsZS5tYXBzLkZ1c2lvblRhYmxlc0xheWVyKHtcbiAgICAgICAgICAgICAgICBtYXA6IG1hcFxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgcG9zTWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XG4gICAgICAgICAgICAgICAgbWFwOiBtYXBcbiAgICAgICAgICAgICAgLCBjbGlja2FibGU6IGZhbHNlXG4gICAgICAgICAgICAgICwgZHJhZ2dhYmxlOiB0cnVlXG4gICAgICAgICAgICAgICwgYW5pbWF0aW9uOiBnb29nbGUubWFwcy5BbmltYXRpb24uRFJPUFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHBvc01hcmtlci5hZGRMaXN0ZW5lcignZHJhZ2VuZCcsIG1hcmtlckRyYWdnZWQpXG5cbiAgICAgICAgICAgIGNpcmNsZUxheWVyID0gbmV3IGdvb2dsZS5tYXBzLkNpcmNsZSh7XG4gICAgICAgICAgICAgICAgbWFwOiBtYXBcbiAgICAgICAgICAgICAgLCBzdHJva2VDb2xvcjogJyMzZjUxYjUnXG4gICAgICAgICAgICAgICwgc3Ryb2tlV2VpZ2h0OiAyXG4gICAgICAgICAgICAgICwgZmlsbENvbG9yOiAnIzNmNTFiNSdcbiAgICAgICAgICAgICAgLCBmaWxsT3BhY2l0eTogLjM1XG4gICAgICAgICAgICAgICwgY2xpY2thYmxlOiBmYWxzZVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuICAgICAgICBmdXNpb25UYWJsZXNMYXllci5zZXRRdWVyeShxdWVyeSlcblxuICAgICAgICBwb3NNYXJrZXIuc2V0UG9zaXRpb24obmV3IGdvb2dsZS5tYXBzLkxhdExuZyhsYXQsIGxuZykpXG5cbiAgICAgICAgY2lyY2xlTGF5ZXIuc2V0Q2VudGVyKG5ldyBnb29nbGUubWFwcy5MYXRMbmcobGF0LCBsbmcpKVxuICAgICAgICBjaXJjbGVMYXllci5zZXRSYWRpdXMocmFkaXVzKVxuXG4gICAgICAgIG1hcC5maXRCb3VuZHMoY2lyY2xlTGF5ZXIuZ2V0Qm91bmRzKCkpXG4gICAgfSlcbn1cblxuZXhwb3J0IHsgdXBkYXRlTWFwIH1cbmV4cG9ydCBkZWZhdWx0IHsgcmVuZGVyLCBhZnRlck1vdW50IH0iLCJpbXBvcnQgTWFwIGZyb20gJy4vY29tcG9uZW50cy9tYXAnXG5pbXBvcnQgRm9ybSBmcm9tICcuL2NvbXBvbmVudHMvZm9ybSdcbmltcG9ydCB7IGVsZW1lbnQgfSBmcm9tICdkZWt1J1xuXG5mdW5jdGlvbiByZW5kZXIoY29tcG9uZW50KSB7XG4gICAgcmV0dXJuIChcbiAgICAgICAgPGRpdiBjbGFzcz1cImFwcFwiPlxuICAgICAgICAgICAgPEZvcm0+PC9Gb3JtPlxuICAgICAgICAgICAgPE1hcD48L01hcD5cbiAgICAgICAgPC9kaXY+XG4gICAgKVxufVxuXG5cbmV4cG9ydCBkZWZhdWx0IHsgcmVuZGVyIH0iLCJmdW5jdGlvbiBnZXRDb29yZHMoKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgIG5hdmlnYXRvci5nZW9sb2NhdGlvbi5nZXRDdXJyZW50UG9zaXRpb24oZnVuY3Rpb24oZ2VvKSB7XG4gICAgICAgICAgICBsZXQgeyBsYXRpdHVkZSwgbG9uZ2l0dWRlIH0gPSBnZW8uY29vcmRzXG4gICAgICAgICAgICByZXNvbHZlKHsgbGF0OiBsYXRpdHVkZSwgbG5nOiBsb25naXR1ZGUgfSlcbiAgICAgICAgfSlcbiAgICB9KVxufVxuXG5cbmV4cG9ydCB7IGdldENvb3JkcyB9IiwiaW1wb3J0IEFwcCBmcm9tICcuL2FwcCdcbmltcG9ydCB7IHJlbmRlciwgdHJlZSwgZWxlbWVudCB9IGZyb20gJ2Rla3UnXG5cblxuLy8gQ3JlYXRlIHRoZSBhcHBcbnZhciBhcHAgPSB0cmVlKDxBcHAgLz4pXG5cbi8vIFJlbmRlciBpbnRvIHRoZSBET01cbnJlbmRlcihhcHAsIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ21haW4nKSkiXX0=
