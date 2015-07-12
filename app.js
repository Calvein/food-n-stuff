(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/home/donnees/workspaces/food-n-stuff/node_modules/browserify/node_modules/events/events.js":[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/application.js":[function(require,module,exports){
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

var avoidPooling = ['input', 'textarea', 'select', 'option'];

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

    if (!shouldUpdate(entity)) {
      commit(entity)
      return updateChildren(entityId)
    }

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
      if (!isElement(el)) return el && el.parentNode.removeChild(el)

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
    return !!(el && el.tagName)
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
  'animate',
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
'use strict'

/**
 * Expose `arrayFlatten`.
 */
module.exports = arrayFlatten

/**
 * Recursive flatten function with depth.
 *
 * @param  {Array}  array
 * @param  {Array}  result
 * @param  {Number} depth
 * @return {Array}
 */
function flattenWithDepth (array, result, depth) {
  for (var i = 0; i < array.length; i++) {
    var value = array[i]

    if (depth > 0 && Array.isArray(value)) {
      flattenWithDepth(value, result, depth - 1)
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
function arrayFlatten (array, depth) {
  if (depth == null) {
    return flattenForever(array, [])
  }

  return flattenWithDepth(array, [], depth)
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


},{}],"/home/donnees/workspaces/food-n-stuff/src/app/components/drawer/index.js":[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _deku = require("deku");

function render(component) {
    return (0, _deku.element)(
        "div",
        { "class": "mdl-layout__drawer" },
        (0, _deku.element)(
            "span",
            { "class": "mdl-layout-title" },
            "Food'n Stuff"
        ),
        (0, _deku.element)(
            "nav",
            { "class": "mdl-navigation" },
            (0, _deku.element)(
                "a",
                { "class": "mdl-navigation__link", href: "https://github.com/Calvein/food-n-stuff" },
                "Repo"
            )
        )
    );
}

exports["default"] = { render: render };
module.exports = exports["default"];

},{"deku":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/index.js"}],"/home/donnees/workspaces/food-n-stuff/src/app/components/header/index.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _deku = require('deku');

var _ = require('../..');

var defaultProps = {
    types: ['food', 'drinks']
};

function render(component) {
    return (0, _deku.element)(
        'header',
        { 'class': 'mdl-layout__header' },
        (0, _deku.element)(
            'div',
            { 'class': 'mdl-layout__header-row' },
            (0, _deku.element)(
                'span',
                { 'class': 'mdl-layout-title' },
                'Food\'n Stuff'
            ),
            (0, _deku.element)('div', { 'class': 'mdl-layout-spacer' }),
            (0, _deku.element)(
                'label',
                { 'class': 'mdl-icon-toggle mdl-js-icon-toggle mdl-js-ripple-effect' },
                (0, _deku.element)('input', {
                    name: 'food',
                    onChange: changeType,
                    type: 'checkbox',
                    'class': 'mdl-icon-toggle__input',
                    checked: true
                }),
                (0, _deku.element)(
                    'i',
                    { 'class': 'mdl-icon-toggle__label material-icons' },
                    'local_dining'
                )
            ),
            (0, _deku.element)(
                'label',
                { 'class': 'mdl-icon-toggle mdl-js-icon-toggle mdl-js-ripple-effect' },
                (0, _deku.element)('input', {
                    name: 'drinks',
                    onChange: changeType,
                    type: 'checkbox',
                    'class': 'mdl-icon-toggle__input',
                    checked: true
                }),
                (0, _deku.element)(
                    'i',
                    { 'class': 'mdl-icon-toggle__label material-icons' },
                    'local_bar'
                )
            )
        )
    );

    /* Events */
    function changeType(e, _ref) {
        var props = _ref.props;

        var el = e.delegateTarget;
        if (el.checked) {
            props.types.push(el.name);
        } else {
            props.types = props.types.filter(function (type) {
                return type !== el.name;
            });
        }
        _.eventDispatcher.emit('changes:types', props.types);
    }
}

exports['default'] = { defaultProps: defaultProps, render: render };
module.exports = exports['default'];

},{"../..":"/home/donnees/workspaces/food-n-stuff/src/app/index.js","deku":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/index.js"}],"/home/donnees/workspaces/food-n-stuff/src/app/components/map/index.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _deku = require('deku');

var _ = require('../..');

var _modulesGeolocation = require('../../modules/geolocation');

var TABLE_ID = '1BHnaan3YfSDq9_LzjthDXjj5dzJZANjLSb8JHPl5';

var defaultProps = {
    lat: 0,
    lng: 0,
    radius: 0,
    types: ['food', 'drinks'],
    query: {
        select: 'address',
        from: TABLE_ID,
        where: null
    }
};

function render(_ref) {
    var props = _ref.props;

    return (0, _deku.element)('div', { 'class': 'map' });
}

function afterRender(_ref2, el) {
    var props = _ref2.props;

    getMap(el, props).then(function () {
        return getSpecials(props);
    });

    // Listeners
    _.eventDispatcher.on('changes:types', function (types) {
        props.types = types;
        getSpecials(props);
    });
    _.eventDispatcher.on('change:radius', function (radius) {
        props.radius = radius;
        getSpecials(props);
    });
}

function getSpecials(props) {
    props.query.where = 'ST_INTERSECTS(address,\n        CIRCLE(LATLNG(' + props.lat + ', ' + props.lng + '), ' + props.radius + '))\n        AND type IN (\'' + props.types.join('\',\'') + '\')\n    ';
    updateMap(props);
}

var map = undefined;
function getMap(el, props) {
    return new Promise(function (resolve) {
        if (el) {
            (0, _modulesGeolocation.getCoords)().then(function (coords) {
                props.lat = coords.lat;
                props.lng = coords.lng;
                map = new google.maps.Map(el, {
                    center: { lat: props.lat, lng: props.lng },
                    zoom: 16
                });

                google.maps.event.addListenerOnce(map, 'idle', function () {
                    resolve(map);
                });
            });
        } else {
            resolve(map);
        }
    });
}

var fusionTablesLayer = undefined;
var posMarker = undefined;
var circleLayer = undefined;
function updateMap(props) {
    getMap().then(function (map) {
        if (!fusionTablesLayer) {
            fusionTablesLayer = new google.maps.FusionTablesLayer({
                map: map
            });
            fusionTablesLayer.addListener('click', function (e) {
                var getVal = function getVal(col) {
                    var value = e.row[col].value;
                    if (col === 'from' || col === 'to') {
                        value = value.replace(/(..)$/, ':$1');
                    }

                    return value;
                };

                e.infoWindowHtml = '\n                    <div class="infowindow">\n                        <div class="infowindow__name">' + getVal('establishment') + '</div>\n                        <div class="infowindow__address">' + getVal('address') + '</div>\n                        <div class="infowindow__description">' + getVal('description') + '</div>\n                        <div class="infowindow__time">From ' + getVal('from') + ' to ' + getVal('to') + '</div>\n                    </div>\n                ';
            });

            posMarker = new google.maps.Marker({
                map: map,
                clickable: false,
                draggable: true,
                animation: google.maps.Animation.DROP
            });
            posMarker.addListener('dragend', function (e) {
                props.lat = e.latLng.lat();
                props.lng = e.latLng.lng();
                getSpecials(props);
            });

            circleLayer = new google.maps.Circle({
                map: map,
                strokeColor: '#3f51b5',
                strokeWeight: 2,
                fillColor: '#3f51b5',
                fillOpacity: .35,
                clickable: false
            });
        }
        fusionTablesLayer.setQuery(props.query);

        posMarker.setPosition(new google.maps.LatLng(props.lat, props.lng));

        circleLayer.setCenter(new google.maps.LatLng(props.lat, props.lng));
        circleLayer.setRadius(props.radius);

        map.fitBounds(circleLayer.getBounds());
    });
}

exports['default'] = { defaultProps: defaultProps, render: render, afterRender: afterRender };
module.exports = exports['default'];

},{"../..":"/home/donnees/workspaces/food-n-stuff/src/app/index.js","../../modules/geolocation":"/home/donnees/workspaces/food-n-stuff/src/app/modules/geolocation/index.js","deku":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/index.js"}],"/home/donnees/workspaces/food-n-stuff/src/app/components/radius/index.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _deku = require('deku');

var _ = require('../..');

var defaultProps = {
    radius: 0
};
function render(_ref) {
    var props = _ref.props;

    return (0, _deku.element)(
        'div',
        { 'class': 'radius' },
        (0, _deku.element)('input', {
            onInput: changeRadiusRange,
            name: 'radius-range',
            'class': 'mdl-slider mdl-js-slider',
            type: 'range',
            step: '100',
            min: '100',
            max: '5000',
            value: props.radius
        }),
        (0, _deku.element)(
            'div',
            { 'class': 'mdl-textfield mdl-js-textfield mdl-textfield--floating-label' },
            (0, _deku.element)('input', {
                'class': 'mdl-textfield__input',
                onInput: changeRadiusInput,
                name: 'radius-number',
                type: 'number',
                step: '50',
                min: '100',
                max: '5000',
                value: props.radius
            }),
            (0, _deku.element)(
                'label',
                { 'class': 'mdl-textfield__label' },
                'Distance (m)'
            )
        )
    );

    /* Events */
    function changeRadiusRange(e) {
        props.radius = radiusSlider.valueAsNumber;
        radiusNumber.value = props.radius;

        sendRadius(props.radius);
    }

    function changeRadiusInput(e) {
        var value = radiusNumber.valueAsNumber;

        // Prevent non numbers values
        if (isNaN(value)) {
            radiusNumber.value = radiusNumber.value;
            return;
        }

        // Clamp value
        if (value > radiusNumber.max) value = +radiusNumber.max;
        if (value < radiusNumber.min) value = +radiusNumber.min;
        props.radius = value;

        radiusNumber.value = props.radius;
        radiusSlider.MaterialSlider.change(props.radius);

        sendRadius(props.radius);
    }
}

var radiusSlider = undefined;
var radiusNumber = undefined;
function afterRender(component, el) {
    radiusSlider = el.querySelector('[name=radius-range]');
    radiusNumber = el.querySelector('[name=radius-number]');
}

function sendRadius(radius) {
    _.eventDispatcher.emit('change:radius', radius);
}

exports['default'] = { defaultProps: defaultProps, render: render, afterRender: afterRender };
module.exports = exports['default'];

},{"../..":"/home/donnees/workspaces/food-n-stuff/src/app/index.js","deku":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/index.js"}],"/home/donnees/workspaces/food-n-stuff/src/app/index.js":[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _events = require('events');

var _componentsHeader = require('./components/header');

var _componentsHeader2 = _interopRequireDefault(_componentsHeader);

var _componentsDrawer = require('./components/drawer');

var _componentsDrawer2 = _interopRequireDefault(_componentsDrawer);

var _componentsMap = require('./components/map');

var _componentsMap2 = _interopRequireDefault(_componentsMap);

var _componentsRadius = require('./components/radius');

var _componentsRadius2 = _interopRequireDefault(_componentsRadius);

var _deku = require('deku');

function render(component) {
    var radius = 300;

    return (0, _deku.element)(
        'div',
        { 'class': 'mdl-layout mdl-js-layout mdl-layout--fixed-header' },
        (0, _deku.element)(_componentsHeader2['default'], null),
        (0, _deku.element)(_componentsDrawer2['default'], null),
        (0, _deku.element)(
            'main',
            { 'class': 'mdl-layout__content' },
            (0, _deku.element)(
                'div',
                { 'class': 'page-content' },
                (0, _deku.element)(_componentsMap2['default'], { radius: radius }),
                (0, _deku.element)(_componentsRadius2['default'], { radius: radius })
            )
        )
    );
}

// Global event emitter
var emitter = new _events.EventEmitter();

exports.eventDispatcher = emitter;
exports['default'] = { render: render };

},{"./components/drawer":"/home/donnees/workspaces/food-n-stuff/src/app/components/drawer/index.js","./components/header":"/home/donnees/workspaces/food-n-stuff/src/app/components/header/index.js","./components/map":"/home/donnees/workspaces/food-n-stuff/src/app/components/map/index.js","./components/radius":"/home/donnees/workspaces/food-n-stuff/src/app/components/radius/index.js","deku":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/index.js","events":"/home/donnees/workspaces/food-n-stuff/node_modules/browserify/node_modules/events/events.js"}],"/home/donnees/workspaces/food-n-stuff/src/app/modules/geolocation/index.js":[function(require,module,exports){
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
(0, _deku.render)(app, document.querySelector('.app'));

},{"./app":"/home/donnees/workspaces/food-n-stuff/src/app/index.js","deku":"/home/donnees/workspaces/food-n-stuff/node_modules/deku/lib/index.js"}]},{},["/home/donnees/workspaces/food-n-stuff/src/index.js"])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyIsIm5vZGVfbW9kdWxlcy9kZWt1L2xpYi9hcHBsaWNhdGlvbi5qcyIsIm5vZGVfbW9kdWxlcy9kZWt1L2xpYi9ldmVudHMuanMiLCJub2RlX21vZHVsZXMvZGVrdS9saWIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZGVrdS9saWIvcmVuZGVyLmpzIiwibm9kZV9tb2R1bGVzL2Rla3UvbGliL3N0cmluZ2lmeS5qcyIsIm5vZGVfbW9kdWxlcy9kZWt1L2xpYi9zdmcuanMiLCJub2RlX21vZHVsZXMvZGVrdS9saWIvdXRpbHMuanMiLCJub2RlX21vZHVsZXMvZGVrdS9saWIvdmlydHVhbC5qcyIsIm5vZGVfbW9kdWxlcy9kZWt1L25vZGVfbW9kdWxlcy9hcnJheS1mbGF0dGVuL2FycmF5LWZsYXR0ZW4uanMiLCJub2RlX21vZHVsZXMvZGVrdS9ub2RlX21vZHVsZXMvY29tcG9uZW50LWVtaXR0ZXIvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZGVrdS9ub2RlX21vZHVsZXMvY29tcG9uZW50LXJhZi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kZWt1L25vZGVfbW9kdWxlcy9jb21wb25lbnQtdHlwZS9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9kZWt1L25vZGVfbW9kdWxlcy9kb20tcG9vbC9Qb29sLmpzIiwibm9kZV9tb2R1bGVzL2Rla3Uvbm9kZV9tb2R1bGVzL2RvbS13YWxrL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Rla3Uvbm9kZV9tb2R1bGVzL2Zhc3QuanMvYXJyYXkvZm9yRWFjaC5qcyIsIm5vZGVfbW9kdWxlcy9kZWt1L25vZGVfbW9kdWxlcy9mYXN0LmpzL2FycmF5L2luZGV4T2YuanMiLCJub2RlX21vZHVsZXMvZGVrdS9ub2RlX21vZHVsZXMvZmFzdC5qcy9hcnJheS9yZWR1Y2UuanMiLCJub2RlX21vZHVsZXMvZGVrdS9ub2RlX21vZHVsZXMvZmFzdC5qcy9mb3JFYWNoLmpzIiwibm9kZV9tb2R1bGVzL2Rla3Uvbm9kZV9tb2R1bGVzL2Zhc3QuanMvZnVuY3Rpb24vYmluZEludGVybmFsMy5qcyIsIm5vZGVfbW9kdWxlcy9kZWt1L25vZGVfbW9kdWxlcy9mYXN0LmpzL2Z1bmN0aW9uL2JpbmRJbnRlcm5hbDQuanMiLCJub2RlX21vZHVsZXMvZGVrdS9ub2RlX21vZHVsZXMvZmFzdC5qcy9vYmplY3QvYXNzaWduLmpzIiwibm9kZV9tb2R1bGVzL2Rla3Uvbm9kZV9tb2R1bGVzL2Zhc3QuanMvb2JqZWN0L2ZvckVhY2guanMiLCJub2RlX21vZHVsZXMvZGVrdS9ub2RlX21vZHVsZXMvZmFzdC5qcy9vYmplY3QvcmVkdWNlLmpzIiwibm9kZV9tb2R1bGVzL2Rla3Uvbm9kZV9tb2R1bGVzL2Zhc3QuanMvcmVkdWNlLmpzIiwibm9kZV9tb2R1bGVzL2Rla3Uvbm9kZV9tb2R1bGVzL2dldC11aWQvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZGVrdS9ub2RlX21vZHVsZXMvaXMtZG9tL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Rla3Uvbm9kZV9tb2R1bGVzL2lzLXByb21pc2UvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZGVrdS9ub2RlX21vZHVsZXMvb2JqZWN0LXBhdGgvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZGVrdS9ub2RlX21vZHVsZXMvc2xpY2VkL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL2Rla3Uvbm9kZV9tb2R1bGVzL3NsaWNlZC9saWIvc2xpY2VkLmpzIiwiL2hvbWUvZG9ubmVlcy93b3Jrc3BhY2VzL2Zvb2Qtbi1zdHVmZi9zcmMvYXBwL2NvbXBvbmVudHMvZHJhd2VyL2luZGV4LmpzIiwiL2hvbWUvZG9ubmVlcy93b3Jrc3BhY2VzL2Zvb2Qtbi1zdHVmZi9zcmMvYXBwL2NvbXBvbmVudHMvaGVhZGVyL2luZGV4LmpzIiwiL2hvbWUvZG9ubmVlcy93b3Jrc3BhY2VzL2Zvb2Qtbi1zdHVmZi9zcmMvYXBwL2NvbXBvbmVudHMvbWFwL2luZGV4LmpzIiwiL2hvbWUvZG9ubmVlcy93b3Jrc3BhY2VzL2Zvb2Qtbi1zdHVmZi9zcmMvYXBwL2NvbXBvbmVudHMvcmFkaXVzL2luZGV4LmpzIiwiL2hvbWUvZG9ubmVlcy93b3Jrc3BhY2VzL2Zvb2Qtbi1zdHVmZi9zcmMvYXBwL2luZGV4LmpzIiwiL2hvbWUvZG9ubmVlcy93b3Jrc3BhY2VzL2Zvb2Qtbi1zdHVmZi9zcmMvYXBwL21vZHVsZXMvZ2VvbG9jYXRpb24vaW5kZXguanMiLCIvaG9tZS9kb25uZWVzL3dvcmtzcGFjZXMvZm9vZC1uLXN0dWZmL3NyYy9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN1NBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxNUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzR0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2UEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pLQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDckJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ0xBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3UUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7Ozs7b0JDakN3QixNQUFNOztBQUU5QixTQUFTLE1BQU0sQ0FBQyxTQUFTLEVBQUU7QUFDdkIsV0FDSSxVQUpDLE9BQU87O1VBSUgsU0FBTSxvQkFBb0I7UUFDM0IsVUFMSCxPQUFPOztjQUtFLFNBQU0sa0JBQWtCOztTQUFvQjtRQUNsRCxVQU5ILE9BQU87O2NBTUMsU0FBTSxnQkFBZ0I7WUFDdkIsVUFQUCxPQUFPOztrQkFPRyxTQUFNLHNCQUFzQixFQUFDLElBQUksRUFBQyx5Q0FBeUM7O2FBQVM7U0FDckY7S0FDSixDQUNUO0NBQ0o7O3FCQUdjLEVBQUUsTUFBTSxFQUFOLE1BQU0sRUFBRTs7Ozs7Ozs7OztvQkNkRCxNQUFNOztnQkFDRSxPQUFPOztBQUV2QyxJQUFJLFlBQVksR0FBRztBQUNmLFNBQUssRUFBRSxDQUFDLE1BQU0sRUFBRSxRQUFRLENBQUM7Q0FDNUIsQ0FBQTs7QUFFRCxTQUFTLE1BQU0sQ0FBQyxTQUFTLEVBQUU7QUFDdkIsV0FDSSxVQVRDLE9BQU87O1VBU0EsU0FBTSxvQkFBb0I7UUFDOUIsVUFWSCxPQUFPOztjQVVDLFNBQU0sd0JBQXdCO1lBQy9CLFVBWFAsT0FBTzs7a0JBV00sU0FBTSxrQkFBa0I7O2FBQW9CO1lBQ2xELFVBWlAsT0FBTyxXQVlLLFNBQU0sbUJBQW1CLEdBQU87WUFDckMsVUFiUCxPQUFPOztrQkFhTyxTQUFNLHlEQUF5RDtnQkFDbEUsVUFkWCxPQUFPO0FBZVEsd0JBQUksRUFBQyxNQUFNO0FBQ1gsNEJBQVEsRUFBRSxVQUFVLEFBQUM7QUFDckIsd0JBQUksRUFBQyxVQUFVO0FBQ2YsNkJBQU0sd0JBQXdCO0FBQzlCLDJCQUFPLE1BQUE7a0JBQ1Q7Z0JBQ0YsVUFyQlgsT0FBTzs7c0JBcUJPLFNBQU0sdUNBQXVDOztpQkFBaUI7YUFDN0Q7WUFDUixVQXZCUCxPQUFPOztrQkF1Qk8sU0FBTSx5REFBeUQ7Z0JBQ2xFLFVBeEJYLE9BQU87QUF5QlEsd0JBQUksRUFBQyxRQUFRO0FBQ2IsNEJBQVEsRUFBRSxVQUFVLEFBQUM7QUFDckIsd0JBQUksRUFBQyxVQUFVO0FBQ2YsNkJBQU0sd0JBQXdCO0FBQzlCLDJCQUFPLE1BQUE7a0JBQ1Q7Z0JBQ0YsVUEvQlgsT0FBTzs7c0JBK0JPLFNBQU0sdUNBQXVDOztpQkFBYzthQUMxRDtTQUNOO0tBQ0QsQ0FDWjs7O0FBSUQsYUFBUyxVQUFVLENBQUMsQ0FBQyxFQUFFLElBQVMsRUFBRTtZQUFULEtBQUssR0FBUCxJQUFTLENBQVAsS0FBSzs7QUFDMUIsWUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLGNBQWMsQ0FBQTtBQUN6QixZQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUU7QUFDWixpQkFBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFBO1NBQzVCLE1BQU07QUFDSCxpQkFBSyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxVQUFDLElBQUk7dUJBQUssSUFBSSxLQUFLLEVBQUUsQ0FBQyxJQUFJO2FBQUEsQ0FBQyxDQUFBO1NBQy9EO0FBQ0QsVUE3Q0MsZUFBZSxDQTZDQSxJQUFJLENBQUMsZUFBZSxFQUFFLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtLQUNyRDtDQUNKOztxQkFHYyxFQUFFLFlBQVksRUFBWixZQUFZLEVBQUUsTUFBTSxFQUFOLE1BQU0sRUFBRTs7Ozs7Ozs7OztvQkNuRGYsTUFBTTs7Z0JBQ0UsT0FBTzs7a0NBQ2IsMkJBQTJCOztBQUdyRCxJQUFNLFFBQVEsR0FBRywyQ0FBMkMsQ0FBQTs7QUFFNUQsSUFBSSxZQUFZLEdBQUc7QUFDZixPQUFHLEVBQUUsQ0FBQztBQUNOLE9BQUcsRUFBRSxDQUFDO0FBQ04sVUFBTSxFQUFFLENBQUM7QUFDVCxTQUFLLEVBQUUsQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDO0FBQ3pCLFNBQUssRUFBRTtBQUNILGNBQU0sRUFBRSxTQUFTO0FBQ2pCLFlBQUksRUFBRSxRQUFRO0FBQ2QsYUFBSyxFQUFFLElBQUk7S0FDZDtDQUNKLENBQUE7O0FBRUQsU0FBUyxNQUFNLENBQUMsSUFBUyxFQUFFO1FBQVQsS0FBSyxHQUFQLElBQVMsQ0FBUCxLQUFLOztBQUNuQixXQUFPLFVBcEJGLE9BQU8sV0FvQkEsU0FBTSxLQUFLLEdBQU8sQ0FBQTtDQUNqQzs7QUFFRCxTQUFTLFdBQVcsQ0FBQyxLQUFTLEVBQUUsRUFBRSxFQUFFO1FBQWIsS0FBSyxHQUFQLEtBQVMsQ0FBUCxLQUFLOztBQUN4QixVQUFNLENBQUMsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQztlQUFNLFdBQVcsQ0FBQyxLQUFLLENBQUM7S0FBQSxDQUFDLENBQUE7OztBQUdoRCxNQTFCSyxlQUFlLENBMEJKLEVBQUUsQ0FBQyxlQUFlLEVBQUUsVUFBQyxLQUFLLEVBQUs7QUFDM0MsYUFBSyxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7QUFDbkIsbUJBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtLQUNyQixDQUFDLENBQUE7QUFDRixNQTlCSyxlQUFlLENBOEJKLEVBQUUsQ0FBQyxlQUFlLEVBQUUsVUFBQyxNQUFNLEVBQUs7QUFDNUMsYUFBSyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUE7QUFDckIsbUJBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtLQUNyQixDQUFDLENBQUE7Q0FDTDs7QUFFRCxTQUFTLFdBQVcsQ0FBQyxLQUFLLEVBQUU7QUFDeEIsU0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLHNEQUNHLEtBQUssQ0FBQyxHQUFHLFVBQUssS0FBSyxDQUFDLEdBQUcsV0FBTSxLQUFLLENBQUMsTUFBTSxtQ0FDekMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLGNBQzVDLENBQUE7QUFDRCxhQUFTLENBQUMsS0FBSyxDQUFDLENBQUE7Q0FDbkI7O0FBRUQsSUFBSSxHQUFHLFlBQUEsQ0FBQTtBQUNQLFNBQVMsTUFBTSxDQUFDLEVBQUUsRUFBRSxLQUFLLEVBQUU7QUFDdkIsV0FBTyxJQUFJLE9BQU8sQ0FBQyxVQUFDLE9BQU8sRUFBSztBQUM1QixZQUFJLEVBQUUsRUFBRTtBQUNKLG9DQS9DSCxTQUFTLEdBK0NLLENBQUMsSUFBSSxDQUFDLFVBQUMsTUFBTSxFQUFLO0FBQ3pCLHFCQUFLLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxHQUFHLENBQUE7QUFDdEIscUJBQUssQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQTtBQUN0QixtQkFBRyxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFO0FBQzFCLDBCQUFNLEVBQUUsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUcsRUFBRTtBQUMxQyx3QkFBSSxFQUFFLEVBQUU7aUJBQ1gsQ0FBQyxDQUFBOztBQUVGLHNCQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsR0FBRyxFQUFFLE1BQU0sRUFBRSxZQUFNO0FBQ2pELDJCQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7aUJBQ2YsQ0FBQyxDQUFBO2FBQ0wsQ0FBQyxDQUFBO1NBQ0wsTUFBTTtBQUNILG1CQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7U0FDZjtLQUNKLENBQUMsQ0FBQTtDQUNMOztBQUVELElBQUksaUJBQWlCLFlBQUEsQ0FBQTtBQUNyQixJQUFJLFNBQVMsWUFBQSxDQUFBO0FBQ2IsSUFBSSxXQUFXLFlBQUEsQ0FBQTtBQUNmLFNBQVMsU0FBUyxDQUFDLEtBQUssRUFBRTtBQUN0QixVQUFNLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBQyxHQUFHLEVBQUs7QUFDbkIsWUFBSSxDQUFDLGlCQUFpQixFQUFFO0FBQ3BCLDZCQUFpQixHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQztBQUNsRCxtQkFBRyxFQUFFLEdBQUc7YUFDWCxDQUFDLENBQUE7QUFDRiw2QkFBaUIsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFLFVBQUMsQ0FBQyxFQUFLO0FBQzFDLG9CQUFJLE1BQU0sR0FBRyxTQUFULE1BQU0sQ0FBSSxHQUFHLEVBQUs7QUFDbEIsd0JBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFBO0FBQzVCLHdCQUFJLEdBQUcsS0FBSyxNQUFNLElBQUksR0FBRyxLQUFLLElBQUksRUFBRTtBQUNoQyw2QkFBSyxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLEtBQUssQ0FBQyxDQUFBO3FCQUN4Qzs7QUFFRCwyQkFBTyxLQUFLLENBQUE7aUJBQ2YsQ0FBQTs7QUFFRCxpQkFBQyxDQUFDLGNBQWMsOEdBRXdCLE1BQU0sQ0FBQyxlQUFlLENBQUMseUVBQ3BCLE1BQU0sQ0FBQyxTQUFTLENBQUMsNkVBQ2IsTUFBTSxDQUFDLGFBQWEsQ0FBQywyRUFDdkIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxZQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUMseURBRTdFLENBQUE7YUFDSixDQUFDLENBQUE7O0FBRUYscUJBQVMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDO0FBQy9CLG1CQUFHLEVBQUUsR0FBRztBQUNSLHlCQUFTLEVBQUUsS0FBSztBQUNoQix5QkFBUyxFQUFFLElBQUk7QUFDZix5QkFBUyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUk7YUFDeEMsQ0FBQyxDQUFBO0FBQ0YscUJBQVMsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLFVBQUMsQ0FBQyxFQUFLO0FBQ3BDLHFCQUFLLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUE7QUFDMUIscUJBQUssQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQTtBQUMxQiwyQkFBVyxDQUFDLEtBQUssQ0FBQyxDQUFBO2FBQ3JCLENBQUMsQ0FBQTs7QUFFRix1QkFBVyxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7QUFDakMsbUJBQUcsRUFBRSxHQUFHO0FBQ1IsMkJBQVcsRUFBRSxTQUFTO0FBQ3RCLDRCQUFZLEVBQUUsQ0FBQztBQUNmLHlCQUFTLEVBQUUsU0FBUztBQUNwQiwyQkFBVyxFQUFFLEdBQUc7QUFDaEIseUJBQVMsRUFBRSxLQUFLO2FBQ25CLENBQUMsQ0FBQTtTQUNMO0FBQ0QseUJBQWlCLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTs7QUFFdkMsaUJBQVMsQ0FBQyxXQUFXLENBQUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBOztBQUVuRSxtQkFBVyxDQUFDLFNBQVMsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFDbkUsbUJBQVcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFBOztBQUVuQyxXQUFHLENBQUMsU0FBUyxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFBO0tBQ3pDLENBQUMsQ0FBQTtDQUNMOztxQkFHYyxFQUFFLFlBQVksRUFBWixZQUFZLEVBQUUsTUFBTSxFQUFOLE1BQU0sRUFBRSxXQUFXLEVBQVgsV0FBVyxFQUFFOzs7Ozs7Ozs7O29CQ2pJNUIsTUFBTTs7Z0JBQ0UsT0FBTzs7QUFHdkMsSUFBSSxZQUFZLEdBQUc7QUFDZixVQUFNLEVBQUUsQ0FBQztDQUNaLENBQUE7QUFDRCxTQUFTLE1BQU0sQ0FBQyxJQUFTLEVBQUU7UUFBVCxLQUFLLEdBQVAsSUFBUyxDQUFQLEtBQUs7O0FBQ25CLFdBQ0ksVUFUQyxPQUFPOztVQVNILFNBQU0sUUFBUTtRQUNmLFVBVkgsT0FBTztBQVdBLG1CQUFPLEVBQUUsaUJBQWlCLEFBQUM7QUFDM0IsZ0JBQUksRUFBQyxjQUFjO0FBQ25CLHFCQUFNLDBCQUEwQjtBQUNoQyxnQkFBSSxFQUFDLE9BQU87QUFDWixnQkFBSSxFQUFDLEtBQUs7QUFDVixlQUFHLEVBQUMsS0FBSztBQUNULGVBQUcsRUFBQyxNQUFNO0FBQ1YsaUJBQUssRUFBRSxLQUFLLENBQUMsTUFBTSxBQUFDO1VBQ3RCO1FBQ0YsVUFwQkgsT0FBTzs7Y0FvQkMsU0FBTSw4REFBOEQ7WUFDckUsVUFyQlAsT0FBTztBQXNCSSx5QkFBTSxzQkFBc0I7QUFDNUIsdUJBQU8sRUFBRSxpQkFBaUIsQUFBQztBQUMzQixvQkFBSSxFQUFDLGVBQWU7QUFDcEIsb0JBQUksRUFBQyxRQUFRO0FBQ2Isb0JBQUksRUFBQyxJQUFJO0FBQ1QsbUJBQUcsRUFBQyxLQUFLO0FBQ1QsbUJBQUcsRUFBQyxNQUFNO0FBQ1YscUJBQUssRUFBRSxLQUFLLENBQUMsTUFBTSxBQUFDO2NBQ3RCO1lBQ0YsVUEvQlAsT0FBTzs7a0JBK0JPLFNBQU0sc0JBQXNCOzthQUFxQjtTQUN0RDtLQUNKLENBQ1Q7OztBQUlELGFBQVMsaUJBQWlCLENBQUMsQ0FBQyxFQUFFO0FBQzFCLGFBQUssQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFDLGFBQWEsQ0FBQTtBQUN6QyxvQkFBWSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFBOztBQUVqQyxrQkFBVSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQTtLQUMzQjs7QUFFRCxhQUFTLGlCQUFpQixDQUFDLENBQUMsRUFBRTtBQUMxQixZQUFJLEtBQUssR0FBRyxZQUFZLENBQUMsYUFBYSxDQUFBOzs7QUFHdEMsWUFBSSxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUU7QUFDZCx3QkFBWSxDQUFDLEtBQUssR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFBO0FBQ3ZDLG1CQUFNO1NBQ1Q7OztBQUdELFlBQUksS0FBSyxHQUFHLFlBQVksQ0FBQyxHQUFHLEVBQUUsS0FBSyxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQTtBQUN2RCxZQUFJLEtBQUssR0FBRyxZQUFZLENBQUMsR0FBRyxFQUFFLEtBQUssR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUE7QUFDdkQsYUFBSyxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7O0FBRXBCLG9CQUFZLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUE7QUFDakMsb0JBQVksQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQTs7QUFFaEQsa0JBQVUsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUE7S0FDM0I7Q0FDSjs7QUFFRCxJQUFJLFlBQVksWUFBQSxDQUFBO0FBQ2hCLElBQUksWUFBWSxZQUFBLENBQUE7QUFDaEIsU0FBUyxXQUFXLENBQUMsU0FBUyxFQUFFLEVBQUUsRUFBRTtBQUNoQyxnQkFBWSxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUMscUJBQXFCLENBQUMsQ0FBQTtBQUN0RCxnQkFBWSxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtDQUMxRDs7QUFFRCxTQUFTLFVBQVUsQ0FBQyxNQUFNLEVBQUU7QUFDeEIsTUF6RUssZUFBZSxDQXlFSixJQUFJLENBQUMsZUFBZSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0NBQ2hEOztxQkFHYyxFQUFFLFlBQVksRUFBWixZQUFZLEVBQUUsTUFBTSxFQUFOLE1BQU0sRUFBRSxXQUFXLEVBQVgsV0FBVyxFQUFFOzs7Ozs7Ozs7Ozs7c0JDOUV2QixRQUFROztnQ0FDbEIscUJBQXFCOzs7O2dDQUNyQixxQkFBcUI7Ozs7NkJBQ2Ysa0JBQWtCOzs7O2dDQUN4QixxQkFBcUI7Ozs7b0JBQ2hCLE1BQU07O0FBRTlCLFNBQVMsTUFBTSxDQUFDLFNBQVMsRUFBRTtBQUN2QixRQUFJLE1BQU0sR0FBRyxHQUFHLENBQUE7O0FBRWhCLFdBQ0ksVUFOQyxPQUFPOztVQU1ILFNBQU0sbURBQW1EO1FBQzFELFVBUEgsT0FBTyxzQ0FPTTtRQUNWLFVBUkgsT0FBTyxzQ0FRTTtRQUNWLFVBVEgsT0FBTzs7Y0FTRSxTQUFNLHFCQUFxQjtZQUM3QixVQVZQLE9BQU87O2tCQVVLLFNBQU0sY0FBYztnQkFDckIsVUFYWCxPQUFPLGdDQVdrQixNQUFNLEVBQUUsTUFBTSxBQUFDLEdBQUc7Z0JBQ2hDLFVBWlgsT0FBTyxtQ0FZWSxNQUFNLEVBQUUsTUFBTSxBQUFDLEdBQUc7YUFDeEI7U0FDSDtLQUNMLENBQ1Q7Q0FDSjs7O0FBR0QsSUFBSSxPQUFPLEdBQUcsWUF6QkwsWUFBWSxFQXlCUyxDQUFBOztRQUVWLGVBQWUsR0FBMUIsT0FBTztxQkFDRCxFQUFFLE1BQU0sRUFBTixNQUFNLEVBQUU7Ozs7Ozs7O0FDNUJ6QixTQUFTLFNBQVMsR0FBRztBQUNqQixXQUFPLElBQUksT0FBTyxDQUFDLFVBQUMsT0FBTyxFQUFLO0FBQzVCLGlCQUFTLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLFVBQVMsR0FBRyxFQUFFOzhCQUNyQixHQUFHLENBQUMsTUFBTTtnQkFBbEMsUUFBUSxlQUFSLFFBQVE7Z0JBQUUsU0FBUyxlQUFULFNBQVM7O0FBQ3pCLG1CQUFPLENBQUMsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFBO1NBQzdDLENBQUMsQ0FBQTtLQUNMLENBQUMsQ0FBQTtDQUNMOztRQUdRLFNBQVMsR0FBVCxTQUFTOzs7Ozs7O21CQ1ZGLE9BQU87Ozs7b0JBQ2UsTUFBTTs7O0FBSTVDLElBQUksR0FBRyxHQUFHLFVBSk8sSUFBSSxFQUlOLFVBSlEsT0FBTyx5QkFJUixDQUFDLENBQUE7OztBQUd2QixVQVBTLE1BQU0sRUFPUixHQUFHLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsIi8qKlxuICogTW9kdWxlIGRlcGVuZGVuY2llcy5cbiAqL1xuXG52YXIgRW1pdHRlciA9IHJlcXVpcmUoJ2NvbXBvbmVudC1lbWl0dGVyJylcblxuLyoqXG4gKiBFeHBvc2UgYHNjZW5lYC5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IEFwcGxpY2F0aW9uXG5cbi8qKlxuICogQ3JlYXRlIGEgbmV3IGBBcHBsaWNhdGlvbmAuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGVsZW1lbnQgT3B0aW9uYWwgaW5pdGlhbCBlbGVtZW50XG4gKi9cblxuZnVuY3Rpb24gQXBwbGljYXRpb24gKGVsZW1lbnQpIHtcbiAgaWYgKCEodGhpcyBpbnN0YW5jZW9mIEFwcGxpY2F0aW9uKSkgcmV0dXJuIG5ldyBBcHBsaWNhdGlvbihlbGVtZW50KVxuICB0aGlzLm9wdGlvbnMgPSB7fVxuICB0aGlzLnNvdXJjZXMgPSB7fVxuICB0aGlzLmVsZW1lbnQgPSBlbGVtZW50XG59XG5cbi8qKlxuICogTWl4aW4gYEVtaXR0ZXJgLlxuICovXG5cbkVtaXR0ZXIoQXBwbGljYXRpb24ucHJvdG90eXBlKVxuXG4vKipcbiAqIEFkZCBhIHBsdWdpblxuICpcbiAqIEBwYXJhbSB7RnVuY3Rpb259IHBsdWdpblxuICovXG5cbkFwcGxpY2F0aW9uLnByb3RvdHlwZS51c2UgPSBmdW5jdGlvbiAocGx1Z2luKSB7XG4gIHBsdWdpbih0aGlzKVxuICByZXR1cm4gdGhpc1xufVxuXG4vKipcbiAqIFNldCBhbiBvcHRpb25cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICovXG5cbkFwcGxpY2F0aW9uLnByb3RvdHlwZS5vcHRpb24gPSBmdW5jdGlvbiAobmFtZSwgdmFsKSB7XG4gIHRoaXMub3B0aW9uc1tuYW1lXSA9IHZhbFxuICByZXR1cm4gdGhpc1xufVxuXG4vKipcbiAqIFNldCB2YWx1ZSB1c2VkIHNvbWV3aGVyZSBpbiB0aGUgSU8gbmV0d29yay5cbiAqL1xuXG5BcHBsaWNhdGlvbi5wcm90b3R5cGUuc2V0ID0gZnVuY3Rpb24gKG5hbWUsIGRhdGEpIHtcbiAgdGhpcy5zb3VyY2VzW25hbWVdID0gZGF0YVxuICB0aGlzLmVtaXQoJ3NvdXJjZScsIG5hbWUsIGRhdGEpXG4gIHJldHVybiB0aGlzXG59XG5cbi8qKlxuICogTW91bnQgYSB2aXJ0dWFsIGVsZW1lbnQuXG4gKlxuICogQHBhcmFtIHtWaXJ0dWFsRWxlbWVudH0gZWxlbWVudFxuICovXG5cbkFwcGxpY2F0aW9uLnByb3RvdHlwZS5tb3VudCA9IGZ1bmN0aW9uIChlbGVtZW50KSB7XG4gIHRoaXMuZWxlbWVudCA9IGVsZW1lbnRcbiAgdGhpcy5lbWl0KCdtb3VudCcsIGVsZW1lbnQpXG4gIHJldHVybiB0aGlzXG59XG5cbi8qKlxuICogUmVtb3ZlIHRoZSB3b3JsZC4gVW5tb3VudCBldmVyeXRoaW5nLlxuICovXG5cbkFwcGxpY2F0aW9uLnByb3RvdHlwZS51bm1vdW50ID0gZnVuY3Rpb24gKCkge1xuICBpZiAoIXRoaXMuZWxlbWVudCkgcmV0dXJuXG4gIHRoaXMuZWxlbWVudCA9IG51bGxcbiAgdGhpcy5lbWl0KCd1bm1vdW50JylcbiAgcmV0dXJuIHRoaXNcbn1cbiIsIi8qKlxuICogQWxsIG9mIHRoZSBldmVudHMgY2FuIGJpbmQgdG9cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgb25CbHVyOiAnYmx1cicsXG4gIG9uQ2hhbmdlOiAnY2hhbmdlJyxcbiAgb25DbGljazogJ2NsaWNrJyxcbiAgb25Db250ZXh0TWVudTogJ2NvbnRleHRtZW51JyxcbiAgb25Db3B5OiAnY29weScsXG4gIG9uQ3V0OiAnY3V0JyxcbiAgb25Eb3VibGVDbGljazogJ2RibGNsaWNrJyxcbiAgb25EcmFnOiAnZHJhZycsXG4gIG9uRHJhZ0VuZDogJ2RyYWdlbmQnLFxuICBvbkRyYWdFbnRlcjogJ2RyYWdlbnRlcicsXG4gIG9uRHJhZ0V4aXQ6ICdkcmFnZXhpdCcsXG4gIG9uRHJhZ0xlYXZlOiAnZHJhZ2xlYXZlJyxcbiAgb25EcmFnT3ZlcjogJ2RyYWdvdmVyJyxcbiAgb25EcmFnU3RhcnQ6ICdkcmFnc3RhcnQnLFxuICBvbkRyb3A6ICdkcm9wJyxcbiAgb25Gb2N1czogJ2ZvY3VzJyxcbiAgb25JbnB1dDogJ2lucHV0JyxcbiAgb25LZXlEb3duOiAna2V5ZG93bicsXG4gIG9uS2V5UHJlc3M6ICdrZXlwcmVzcycsXG4gIG9uS2V5VXA6ICdrZXl1cCcsXG4gIG9uTW91c2VEb3duOiAnbW91c2Vkb3duJyxcbiAgb25Nb3VzZUVudGVyOiAnbW91c2VlbnRlcicsXG4gIG9uTW91c2VMZWF2ZTogJ21vdXNlbGVhdmUnLFxuICBvbk1vdXNlTW92ZTogJ21vdXNlbW92ZScsXG4gIG9uTW91c2VPdXQ6ICdtb3VzZW91dCcsXG4gIG9uTW91c2VPdmVyOiAnbW91c2VvdmVyJyxcbiAgb25Nb3VzZVVwOiAnbW91c2V1cCcsXG4gIG9uUGFzdGU6ICdwYXN0ZScsXG4gIG9uU2Nyb2xsOiAnc2Nyb2xsJyxcbiAgb25TdWJtaXQ6ICdzdWJtaXQnLFxuICBvblRvdWNoQ2FuY2VsOiAndG91Y2hjYW5jZWwnLFxuICBvblRvdWNoRW5kOiAndG91Y2hlbmQnLFxuICBvblRvdWNoTW92ZTogJ3RvdWNobW92ZScsXG4gIG9uVG91Y2hTdGFydDogJ3RvdWNoc3RhcnQnLFxuICBvbldoZWVsOiAnd2hlZWwnXG59XG4iLCIvKipcbiAqIENyZWF0ZSB0aGUgYXBwbGljYXRpb24uXG4gKi9cblxuZXhwb3J0cy50cmVlID1cbmV4cG9ydHMuc2NlbmUgPVxuZXhwb3J0cy5kZWt1ID0gcmVxdWlyZSgnLi9hcHBsaWNhdGlvbicpXG5cbi8qKlxuICogUmVuZGVyIHNjZW5lcyB0byB0aGUgRE9NLlxuICovXG5cbmlmICh0eXBlb2YgZG9jdW1lbnQgIT09ICd1bmRlZmluZWQnKSB7XG4gIGV4cG9ydHMucmVuZGVyID0gcmVxdWlyZSgnLi9yZW5kZXInKVxufVxuXG4vKipcbiAqIFJlbmRlciBzY2VuZXMgdG8gYSBzdHJpbmdcbiAqL1xuXG5leHBvcnRzLnJlbmRlclN0cmluZyA9IHJlcXVpcmUoJy4vc3RyaW5naWZ5JylcblxuLyoqXG4gKiBDcmVhdGUgdmlydHVhbCBlbGVtZW50cy5cbiAqL1xuXG5leHBvcnRzLmVsZW1lbnQgPVxuZXhwb3J0cy5jcmVhdGVFbGVtZW50ID1cbmV4cG9ydHMuZG9tID0gcmVxdWlyZSgnLi92aXJ0dWFsJylcbiIsIi8qKlxuICogRGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciByYWYgPSByZXF1aXJlKCdjb21wb25lbnQtcmFmJylcbnZhciBQb29sID0gcmVxdWlyZSgnZG9tLXBvb2wnKVxudmFyIHdhbGsgPSByZXF1aXJlKCdkb20td2FsaycpXG52YXIgaXNEb20gPSByZXF1aXJlKCdpcy1kb20nKVxudmFyIHVpZCA9IHJlcXVpcmUoJ2dldC11aWQnKVxudmFyIGtleXBhdGggPSByZXF1aXJlKCdvYmplY3QtcGF0aCcpXG52YXIgdHlwZSA9IHJlcXVpcmUoJ2NvbXBvbmVudC10eXBlJylcbnZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKVxudmFyIHN2ZyA9IHJlcXVpcmUoJy4vc3ZnJylcbnZhciBldmVudHMgPSByZXF1aXJlKCcuL2V2ZW50cycpXG52YXIgZGVmYXVsdHMgPSB1dGlscy5kZWZhdWx0c1xudmFyIGZvckVhY2ggPSByZXF1aXJlKCdmYXN0LmpzL2ZvckVhY2gnKVxudmFyIGFzc2lnbiA9IHJlcXVpcmUoJ2Zhc3QuanMvb2JqZWN0L2Fzc2lnbicpXG52YXIgcmVkdWNlID0gcmVxdWlyZSgnZmFzdC5qcy9yZWR1Y2UnKVxudmFyIGlzUHJvbWlzZSA9IHJlcXVpcmUoJ2lzLXByb21pc2UnKVxuXG4vKipcbiAqIFRoZXNlIGVsZW1lbnRzIHdvbid0IGJlIHBvb2xlZFxuICovXG5cbnZhciBhdm9pZFBvb2xpbmcgPSBbJ2lucHV0JywgJ3RleHRhcmVhJywgJ3NlbGVjdCcsICdvcHRpb24nXTtcblxuLyoqXG4gKiBFeHBvc2UgYGRvbWAuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSByZW5kZXJcblxuLyoqXG4gKiBSZW5kZXIgYW4gYXBwIHRvIHRoZSBET01cbiAqXG4gKiBAcGFyYW0ge0FwcGxpY2F0aW9ufSBhcHBcbiAqIEBwYXJhbSB7SFRNTEVsZW1lbnR9IGNvbnRhaW5lclxuICogQHBhcmFtIHtPYmplY3R9IG9wdHNcbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cblxuZnVuY3Rpb24gcmVuZGVyIChhcHAsIGNvbnRhaW5lciwgb3B0cykge1xuICB2YXIgZnJhbWVJZFxuICB2YXIgaXNSZW5kZXJpbmdcbiAgdmFyIHJvb3RJZCA9ICdyb290J1xuICB2YXIgY3VycmVudEVsZW1lbnRcbiAgdmFyIGN1cnJlbnROYXRpdmVFbGVtZW50XG4gIHZhciBjb25uZWN0aW9ucyA9IHt9XG4gIHZhciBjb21wb25lbnRzID0ge31cbiAgdmFyIGVudGl0aWVzID0ge31cbiAgdmFyIHBvb2xzID0ge31cbiAgdmFyIGhhbmRsZXJzID0ge31cbiAgdmFyIG1vdW50UXVldWUgPSBbXVxuICB2YXIgY2hpbGRyZW4gPSB7fVxuICBjaGlsZHJlbltyb290SWRdID0ge31cblxuICBpZiAoIWlzRG9tKGNvbnRhaW5lcikpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0NvbnRhaW5lciBlbGVtZW50IG11c3QgYmUgYSBET00gZWxlbWVudCcpXG4gIH1cblxuICAvKipcbiAgICogUmVuZGVyaW5nIG9wdGlvbnMuIEJhdGNoaW5nIGlzIG9ubHkgZXZlciByZWFsbHkgZGlzYWJsZWRcbiAgICogd2hlbiBydW5uaW5nIHRlc3RzLCBhbmQgcG9vbGluZyBjYW4gYmUgZGlzYWJsZWQgaWYgdGhlIHVzZXJcbiAgICogaXMgZG9pbmcgc29tZXRoaW5nIHN0dXBpZCB3aXRoIHRoZSBET00gaW4gdGhlaXIgY29tcG9uZW50cy5cbiAgICovXG5cbiAgdmFyIG9wdGlvbnMgPSBkZWZhdWx0cyhhc3NpZ24oe30sIGFwcC5vcHRpb25zIHx8IHt9LCBvcHRzIHx8IHt9KSwge1xuICAgIHBvb2xpbmc6IHRydWUsXG4gICAgYmF0Y2hpbmc6IHRydWUsXG4gICAgdmFsaWRhdGVQcm9wczogZmFsc2VcbiAgfSlcblxuICAvKipcbiAgICogTGlzdGVuIHRvIERPTSBldmVudHNcbiAgICovXG5cbiAgYWRkTmF0aXZlRXZlbnRMaXN0ZW5lcnMoKVxuXG4gIC8qKlxuICAgKiBXYXRjaCBmb3IgY2hhbmdlcyB0byB0aGUgYXBwIHNvIHRoYXQgd2UgY2FuIHVwZGF0ZVxuICAgKiB0aGUgRE9NIGFzIG5lZWRlZC5cbiAgICovXG5cbiAgYXBwLm9uKCd1bm1vdW50Jywgb251bm1vdW50KVxuICBhcHAub24oJ21vdW50Jywgb25tb3VudClcbiAgYXBwLm9uKCdzb3VyY2UnLCBvbnVwZGF0ZSlcblxuICAvKipcbiAgICogSWYgdGhlIGFwcCBoYXMgYWxyZWFkeSBtb3VudGVkIGFuIGVsZW1lbnQsIHdlIGNhbiBqdXN0XG4gICAqIHJlbmRlciB0aGF0IHN0cmFpZ2h0IGF3YXkuXG4gICAqL1xuXG4gIGlmIChhcHAuZWxlbWVudCkgcmVuZGVyKClcblxuICAvKipcbiAgICogVGVhcmRvd24gdGhlIERPTSByZW5kZXJpbmcgc28gdGhhdCBpdCBzdG9wc1xuICAgKiByZW5kZXJpbmcgYW5kIGV2ZXJ5dGhpbmcgY2FuIGJlIGdhcmJhZ2UgY29sbGVjdGVkLlxuICAgKi9cblxuICBmdW5jdGlvbiB0ZWFyZG93biAoKSB7XG4gICAgcmVtb3ZlTmF0aXZlRXZlbnRMaXN0ZW5lcnMoKVxuICAgIHJlbW92ZU5hdGl2ZUVsZW1lbnQoKVxuICAgIGFwcC5vZmYoJ3VubW91bnQnLCBvbnVubW91bnQpXG4gICAgYXBwLm9mZignbW91bnQnLCBvbm1vdW50KVxuICAgIGFwcC5vZmYoJ3NvdXJjZScsIG9udXBkYXRlKVxuICB9XG5cbiAgLyoqXG4gICAqIFN3YXAgdGhlIGN1cnJlbnQgcmVuZGVyZWQgbm9kZSB3aXRoIGEgbmV3IG9uZSB0aGF0IGlzIHJlbmRlcmVkXG4gICAqIGZyb20gdGhlIG5ldyB2aXJ0dWFsIGVsZW1lbnQgbW91bnRlZCBvbiB0aGUgYXBwLlxuICAgKlxuICAgKiBAcGFyYW0ge1ZpcnR1YWxFbGVtZW50fSBlbGVtZW50XG4gICAqL1xuXG4gIGZ1bmN0aW9uIG9ubW91bnQgKCkge1xuICAgIGludmFsaWRhdGUoKVxuICB9XG5cbiAgLyoqXG4gICAqIElmIHRoZSBhcHAgdW5tb3VudHMgYW4gZWxlbWVudCwgd2Ugc2hvdWxkIGNsZWFyIG91dCB0aGUgY3VycmVudFxuICAgKiByZW5kZXJlZCBlbGVtZW50LiBUaGlzIHdpbGwgcmVtb3ZlIGFsbCB0aGUgZW50aXRpZXMuXG4gICAqL1xuXG4gIGZ1bmN0aW9uIG9udW5tb3VudCAoKSB7XG4gICAgcmVtb3ZlTmF0aXZlRWxlbWVudCgpXG4gICAgY3VycmVudEVsZW1lbnQgPSBudWxsXG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIGFsbCBjb21wb25lbnRzIHRoYXQgYXJlIGJvdW5kIHRvIHRoZSBzb3VyY2VcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAgICogQHBhcmFtIHsqfSBkYXRhXG4gICAqL1xuXG4gIGZ1bmN0aW9uIG9udXBkYXRlIChuYW1lLCBkYXRhKSB7XG4gICAgaWYgKCFjb25uZWN0aW9uc1tuYW1lXSkgcmV0dXJuO1xuICAgIGNvbm5lY3Rpb25zW25hbWVdLmZvckVhY2goZnVuY3Rpb24odXBkYXRlKSB7XG4gICAgICB1cGRhdGUoZGF0YSlcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbmRlciBhbmQgbW91bnQgYSBjb21wb25lbnQgdG8gdGhlIG5hdGl2ZSBkb20uXG4gICAqXG4gICAqIEBwYXJhbSB7RW50aXR5fSBlbnRpdHlcbiAgICogQHJldHVybiB7SFRNTEVsZW1lbnR9XG4gICAqL1xuXG4gIGZ1bmN0aW9uIG1vdW50RW50aXR5IChlbnRpdHkpIHtcbiAgICByZWdpc3RlcihlbnRpdHkpXG4gICAgc2V0U291cmNlcyhlbnRpdHkpXG4gICAgY2hpbGRyZW5bZW50aXR5LmlkXSA9IHt9XG4gICAgZW50aXRpZXNbZW50aXR5LmlkXSA9IGVudGl0eVxuXG4gICAgLy8gY29tbWl0IGluaXRpYWwgc3RhdGUgYW5kIHByb3BzLlxuICAgIGNvbW1pdChlbnRpdHkpXG5cbiAgICAvLyBjYWxsYmFjayBiZWZvcmUgbW91bnRpbmcuXG4gICAgdHJpZ2dlcignYmVmb3JlTW91bnQnLCBlbnRpdHksIFtlbnRpdHkuY29udGV4dF0pXG4gICAgdHJpZ2dlcignYmVmb3JlUmVuZGVyJywgZW50aXR5LCBbZW50aXR5LmNvbnRleHRdKVxuXG4gICAgLy8gcmVuZGVyIHZpcnR1YWwgZWxlbWVudC5cbiAgICB2YXIgdmlydHVhbEVsZW1lbnQgPSByZW5kZXJFbnRpdHkoZW50aXR5KVxuICAgIC8vIGNyZWF0ZSBuYXRpdmUgZWxlbWVudC5cbiAgICB2YXIgbmF0aXZlRWxlbWVudCA9IHRvTmF0aXZlKGVudGl0eS5pZCwgJzAnLCB2aXJ0dWFsRWxlbWVudClcblxuICAgIGVudGl0eS52aXJ0dWFsRWxlbWVudCA9IHZpcnR1YWxFbGVtZW50XG4gICAgZW50aXR5Lm5hdGl2ZUVsZW1lbnQgPSBuYXRpdmVFbGVtZW50XG5cbiAgICAvLyBGaXJlIGFmdGVyUmVuZGVyIGFuZCBhZnRlck1vdW50IGhvb2tzIGF0IHRoZSBlbmRcbiAgICAvLyBvZiB0aGUgcmVuZGVyIGN5Y2xlXG4gICAgbW91bnRRdWV1ZS5wdXNoKGVudGl0eS5pZClcblxuICAgIHJldHVybiBuYXRpdmVFbGVtZW50XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGEgY29tcG9uZW50IGZyb20gdGhlIG5hdGl2ZSBkb20uXG4gICAqXG4gICAqIEBwYXJhbSB7RW50aXR5fSBlbnRpdHlcbiAgICovXG5cbiAgZnVuY3Rpb24gdW5tb3VudEVudGl0eSAoZW50aXR5SWQpIHtcbiAgICB2YXIgZW50aXR5ID0gZW50aXRpZXNbZW50aXR5SWRdXG4gICAgaWYgKCFlbnRpdHkpIHJldHVyblxuICAgIHRyaWdnZXIoJ2JlZm9yZVVubW91bnQnLCBlbnRpdHksIFtlbnRpdHkuY29udGV4dCwgZW50aXR5Lm5hdGl2ZUVsZW1lbnRdKVxuICAgIHVubW91bnRDaGlsZHJlbihlbnRpdHlJZClcbiAgICByZW1vdmVBbGxFdmVudHMoZW50aXR5SWQpXG4gICAgdmFyIGNvbXBvbmVudEVudGl0aWVzID0gY29tcG9uZW50c1tlbnRpdHlJZF0uZW50aXRpZXM7XG4gICAgZGVsZXRlIGNvbXBvbmVudEVudGl0aWVzW2VudGl0eUlkXVxuICAgIGRlbGV0ZSBjb21wb25lbnRzW2VudGl0eUlkXVxuICAgIGRlbGV0ZSBlbnRpdGllc1tlbnRpdHlJZF1cbiAgICBkZWxldGUgY2hpbGRyZW5bZW50aXR5SWRdXG4gIH1cblxuICAvKipcbiAgICogUmVuZGVyIHRoZSBlbnRpdHkgYW5kIG1ha2Ugc3VyZSBpdCByZXR1cm5zIGEgbm9kZVxuICAgKlxuICAgKiBAcGFyYW0ge0VudGl0eX0gZW50aXR5XG4gICAqXG4gICAqIEByZXR1cm4ge1ZpcnR1YWxUcmVlfVxuICAgKi9cblxuICBmdW5jdGlvbiByZW5kZXJFbnRpdHkgKGVudGl0eSkge1xuICAgIHZhciBjb21wb25lbnQgPSBlbnRpdHkuY29tcG9uZW50XG4gICAgaWYgKCFjb21wb25lbnQucmVuZGVyKSB0aHJvdyBuZXcgRXJyb3IoJ0NvbXBvbmVudCBuZWVkcyBhIHJlbmRlciBmdW5jdGlvbicpXG4gICAgdmFyIHJlc3VsdCA9IGNvbXBvbmVudC5yZW5kZXIoZW50aXR5LmNvbnRleHQsIHNldFN0YXRlKGVudGl0eSkpXG4gICAgaWYgKCFyZXN1bHQpIHRocm93IG5ldyBFcnJvcignUmVuZGVyIGZ1bmN0aW9uIG11c3QgcmV0dXJuIGFuIGVsZW1lbnQuJylcbiAgICByZXR1cm4gcmVzdWx0XG4gIH1cblxuICAvKipcbiAgICogV2hlbmV2ZXIgc2V0U3RhdGUgb3Igc2V0UHJvcHMgaXMgY2FsbGVkLCB3ZSBtYXJrIHRoZSBlbnRpdHlcbiAgICogYXMgZGlydHkgaW4gdGhlIHJlbmRlcmVyLiBUaGlzIGxldHMgdXMgb3B0aW1pemUgdGhlIHJlLXJlbmRlcmluZ1xuICAgKiBhbmQgc2tpcCBjb21wb25lbnRzIHRoYXQgZGVmaW5pdGVseSBoYXZlbid0IGNoYW5nZWQuXG4gICAqXG4gICAqIEBwYXJhbSB7RW50aXR5fSBlbnRpdHlcbiAgICpcbiAgICogQHJldHVybiB7RnVuY3Rpb259IEEgY3VycmllZCBmdW5jdGlvbiBmb3IgdXBkYXRpbmcgdGhlIHN0YXRlIG9mIGFuIGVudGl0eVxuICAgKi9cblxuICBmdW5jdGlvbiBzZXRTdGF0ZSAoZW50aXR5KSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uIChuZXh0U3RhdGUpIHtcbiAgICAgIHVwZGF0ZUVudGl0eVN0YXRlQXN5bmMoZW50aXR5LCBuZXh0U3RhdGUpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFRlbGwgdGhlIGFwcCBpdCdzIGRpcnR5IGFuZCBuZWVkcyB0byByZS1yZW5kZXIuIElmIGJhdGNoaW5nIGlzIGRpc2FibGVkXG4gICAqIHdlIGNhbiBqdXN0IHRyaWdnZXIgYSByZW5kZXIgaW1tZWRpYXRlbHksIG90aGVyd2lzZSB3ZSdsbCB3YWl0IHVudGlsXG4gICAqIHRoZSBuZXh0IGF2YWlsYWJsZSBmcmFtZS5cbiAgICovXG5cbiAgZnVuY3Rpb24gaW52YWxpZGF0ZSAoKSB7XG4gICAgaWYgKCFvcHRpb25zLmJhdGNoaW5nKSB7XG4gICAgICBpZiAoIWlzUmVuZGVyaW5nKSByZW5kZXIoKVxuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoIWZyYW1lSWQpIGZyYW1lSWQgPSByYWYocmVuZGVyKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGUgdGhlIERPTS4gSWYgdGhlIHVwZGF0ZSBmYWlscyB3ZSBzdG9wIHRoZSBsb29wXG4gICAqIHNvIHdlIGRvbid0IGdldCBlcnJvcnMgb24gZXZlcnkgZnJhbWUuXG4gICAqXG4gICAqIEBhcGkgcHVibGljXG4gICAqL1xuXG4gIGZ1bmN0aW9uIHJlbmRlciAoKSB7XG4gICAgLy8gSWYgdGhpcyBpcyBjYWxsZWQgc3luY2hyb25vdXNseSB3ZSBuZWVkIHRvXG4gICAgLy8gY2FuY2VsIGFueSBwZW5kaW5nIGZ1dHVyZSB1cGRhdGVzXG4gICAgY2xlYXJGcmFtZSgpXG5cbiAgICAvLyBJZiB0aGUgcmVuZGVyaW5nIGZyb20gdGhlIHByZXZpb3VzIGZyYW1lIGlzIHN0aWxsIGdvaW5nLFxuICAgIC8vIHdlJ2xsIGp1c3Qgd2FpdCB1bnRpbCB0aGUgbmV4dCBmcmFtZS4gSWRlYWxseSByZW5kZXJzIHNob3VsZFxuICAgIC8vIG5vdCB0YWtlIG92ZXIgMTZtcyB0byBzdGF5IHdpdGhpbiBhIHNpbmdsZSBmcmFtZSwgYnV0IHRoaXMgc2hvdWxkXG4gICAgLy8gY2F0Y2ggaXQgaWYgaXQgZG9lcy5cbiAgICBpZiAoaXNSZW5kZXJpbmcpIHtcbiAgICAgIGZyYW1lSWQgPSByYWYocmVuZGVyKVxuICAgICAgcmV0dXJuXG4gICAgfSBlbHNlIHtcbiAgICAgIGlzUmVuZGVyaW5nID0gdHJ1ZVxuICAgIH1cblxuICAgIC8vIDEuIElmIHRoZXJlIGlzbid0IGEgbmF0aXZlIGVsZW1lbnQgcmVuZGVyZWQgZm9yIHRoZSBjdXJyZW50IG1vdW50ZWQgZWxlbWVudFxuICAgIC8vIHRoZW4gd2UgbmVlZCB0byBjcmVhdGUgaXQgZnJvbSBzY3JhdGNoLlxuICAgIC8vIDIuIElmIGEgbmV3IGVsZW1lbnQgaGFzIGJlZW4gbW91bnRlZCwgd2Ugc2hvdWxkIGRpZmYgdGhlbS5cbiAgICAvLyAzLiBXZSBzaG91bGQgdXBkYXRlIGNoZWNrIGFsbCBjaGlsZCBjb21wb25lbnRzIGZvciBjaGFuZ2VzLlxuICAgIGlmICghY3VycmVudE5hdGl2ZUVsZW1lbnQpIHtcbiAgICAgIGN1cnJlbnRFbGVtZW50ID0gYXBwLmVsZW1lbnRcbiAgICAgIGN1cnJlbnROYXRpdmVFbGVtZW50ID0gdG9OYXRpdmUocm9vdElkLCAnMCcsIGN1cnJlbnRFbGVtZW50KVxuICAgICAgaWYgKGNvbnRhaW5lci5jaGlsZHJlbi5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnNvbGUuaW5mbygnZGVrdTogVGhlIGNvbnRhaW5lciBlbGVtZW50IGlzIG5vdCBlbXB0eS4gVGhlc2UgZWxlbWVudHMgd2lsbCBiZSByZW1vdmVkLiBSZWFkIG1vcmU6IGh0dHA6Ly9jbC5seS9iMFNyJylcbiAgICAgIH1cbiAgICAgIGlmIChjb250YWluZXIgPT09IGRvY3VtZW50LmJvZHkpIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdkZWt1OiBVc2luZyBkb2N1bWVudC5ib2R5IGlzIGFsbG93ZWQgYnV0IGl0IGNhbiBjYXVzZSBzb21lIGlzc3Vlcy4gUmVhZCBtb3JlOiBodHRwOi8vY2wubHkvYjBTQycpXG4gICAgICB9XG4gICAgICByZW1vdmVBbGxDaGlsZHJlbihjb250YWluZXIpO1xuICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKGN1cnJlbnROYXRpdmVFbGVtZW50KVxuICAgIH0gZWxzZSBpZiAoY3VycmVudEVsZW1lbnQgIT09IGFwcC5lbGVtZW50KSB7XG4gICAgICBjdXJyZW50TmF0aXZlRWxlbWVudCA9IHBhdGNoKHJvb3RJZCwgY3VycmVudEVsZW1lbnQsIGFwcC5lbGVtZW50LCBjdXJyZW50TmF0aXZlRWxlbWVudClcbiAgICAgIGN1cnJlbnRFbGVtZW50ID0gYXBwLmVsZW1lbnRcbiAgICAgIHVwZGF0ZUNoaWxkcmVuKHJvb3RJZClcbiAgICB9IGVsc2Uge1xuICAgICAgdXBkYXRlQ2hpbGRyZW4ocm9vdElkKVxuICAgIH1cblxuICAgIC8vIENhbGwgbW91bnQgZXZlbnRzIG9uIGFsbCBuZXcgZW50aXRpZXNcbiAgICBmbHVzaE1vdW50UXVldWUoKVxuXG4gICAgLy8gQWxsb3cgcmVuZGVyaW5nIGFnYWluLlxuICAgIGlzUmVuZGVyaW5nID0gZmFsc2VcbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxsIGhvb2tzIGZvciBhbGwgbmV3IGVudGl0aWVzIHRoYXQgaGF2ZSBiZWVuIGNyZWF0ZWQgaW5cbiAgICogdGhlIGxhc3QgcmVuZGVyIGZyb20gdGhlIGJvdHRvbSB1cC5cbiAgICovXG5cbiAgZnVuY3Rpb24gZmx1c2hNb3VudFF1ZXVlICgpIHtcbiAgICB2YXIgZW50aXR5SWRcbiAgICB3aGlsZSAoZW50aXR5SWQgPSBtb3VudFF1ZXVlLnBvcCgpKSB7XG4gICAgICB2YXIgZW50aXR5ID0gZW50aXRpZXNbZW50aXR5SWRdXG4gICAgICB0cmlnZ2VyKCdhZnRlclJlbmRlcicsIGVudGl0eSwgW2VudGl0eS5jb250ZXh0LCBlbnRpdHkubmF0aXZlRWxlbWVudF0pXG4gICAgICB0cmlnZ2VyVXBkYXRlKCdhZnRlck1vdW50JywgZW50aXR5LCBbZW50aXR5LmNvbnRleHQsIGVudGl0eS5uYXRpdmVFbGVtZW50LCBzZXRTdGF0ZShlbnRpdHkpXSlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogQ2xlYXIgdGhlIGN1cnJlbnQgc2NoZWR1bGVkIGZyYW1lXG4gICAqL1xuXG4gIGZ1bmN0aW9uIGNsZWFyRnJhbWUgKCkge1xuICAgIGlmICghZnJhbWVJZCkgcmV0dXJuXG4gICAgcmFmLmNhbmNlbChmcmFtZUlkKVxuICAgIGZyYW1lSWQgPSAwXG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIGEgY29tcG9uZW50LlxuICAgKlxuICAgKiBUaGUgZW50aXR5IGlzIGp1c3QgdGhlIGRhdGEgb2JqZWN0IGZvciBhIGNvbXBvbmVudCBpbnN0YW5jZS5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IGlkIENvbXBvbmVudCBpbnN0YW5jZSBpZC5cbiAgICovXG5cbiAgZnVuY3Rpb24gdXBkYXRlRW50aXR5IChlbnRpdHlJZCkge1xuICAgIHZhciBlbnRpdHkgPSBlbnRpdGllc1tlbnRpdHlJZF1cbiAgICBzZXRTb3VyY2VzKGVudGl0eSlcblxuICAgIGlmICghc2hvdWxkVXBkYXRlKGVudGl0eSkpIHtcbiAgICAgIGNvbW1pdChlbnRpdHkpXG4gICAgICByZXR1cm4gdXBkYXRlQ2hpbGRyZW4oZW50aXR5SWQpXG4gICAgfVxuXG4gICAgdmFyIGN1cnJlbnRUcmVlID0gZW50aXR5LnZpcnR1YWxFbGVtZW50XG4gICAgdmFyIG5leHRQcm9wcyA9IGVudGl0eS5wZW5kaW5nUHJvcHNcbiAgICB2YXIgbmV4dFN0YXRlID0gZW50aXR5LnBlbmRpbmdTdGF0ZVxuICAgIHZhciBwcmV2aW91c1N0YXRlID0gZW50aXR5LmNvbnRleHQuc3RhdGVcbiAgICB2YXIgcHJldmlvdXNQcm9wcyA9IGVudGl0eS5jb250ZXh0LnByb3BzXG5cbiAgICAvLyBob29rIGJlZm9yZSByZW5kZXJpbmcuIGNvdWxkIG1vZGlmeSBzdGF0ZSBqdXN0IGJlZm9yZSB0aGUgcmVuZGVyIG9jY3Vycy5cbiAgICB0cmlnZ2VyKCdiZWZvcmVVcGRhdGUnLCBlbnRpdHksIFtlbnRpdHkuY29udGV4dCwgbmV4dFByb3BzLCBuZXh0U3RhdGVdKVxuICAgIHRyaWdnZXIoJ2JlZm9yZVJlbmRlcicsIGVudGl0eSwgW2VudGl0eS5jb250ZXh0XSlcblxuICAgIC8vIGNvbW1pdCBzdGF0ZSBhbmQgcHJvcHMuXG4gICAgY29tbWl0KGVudGl0eSlcblxuICAgIC8vIHJlLXJlbmRlci5cbiAgICB2YXIgbmV4dFRyZWUgPSByZW5kZXJFbnRpdHkoZW50aXR5KVxuXG4gICAgLy8gaWYgdGhlIHRyZWUgaXMgdGhlIHNhbWUgd2UgY2FuIGp1c3Qgc2tpcCB0aGlzIGNvbXBvbmVudFxuICAgIC8vIGJ1dCB3ZSBzaG91bGQgc3RpbGwgY2hlY2sgdGhlIGNoaWxkcmVuIHRvIHNlZSBpZiB0aGV5J3JlIGRpcnR5LlxuICAgIC8vIFRoaXMgYWxsb3dzIHVzIHRvIG1lbW9pemUgdGhlIHJlbmRlciBmdW5jdGlvbiBvZiBjb21wb25lbnRzLlxuICAgIGlmIChuZXh0VHJlZSA9PT0gY3VycmVudFRyZWUpIHJldHVybiB1cGRhdGVDaGlsZHJlbihlbnRpdHlJZClcblxuICAgIC8vIGFwcGx5IG5ldyB2aXJ0dWFsIHRyZWUgdG8gbmF0aXZlIGRvbS5cbiAgICBlbnRpdHkubmF0aXZlRWxlbWVudCA9IHBhdGNoKGVudGl0eUlkLCBjdXJyZW50VHJlZSwgbmV4dFRyZWUsIGVudGl0eS5uYXRpdmVFbGVtZW50KVxuICAgIGVudGl0eS52aXJ0dWFsRWxlbWVudCA9IG5leHRUcmVlXG4gICAgdXBkYXRlQ2hpbGRyZW4oZW50aXR5SWQpXG5cbiAgICAvLyB0cmlnZ2VyIHJlbmRlciBob29rXG4gICAgdHJpZ2dlcignYWZ0ZXJSZW5kZXInLCBlbnRpdHksIFtlbnRpdHkuY29udGV4dCwgZW50aXR5Lm5hdGl2ZUVsZW1lbnRdKVxuXG4gICAgLy8gdHJpZ2dlciBhZnRlclVwZGF0ZSBhZnRlciBhbGwgY2hpbGRyZW4gaGF2ZSB1cGRhdGVkLlxuICAgIHRyaWdnZXJVcGRhdGUoJ2FmdGVyVXBkYXRlJywgZW50aXR5LCBbZW50aXR5LmNvbnRleHQsIHByZXZpb3VzUHJvcHMsIHByZXZpb3VzU3RhdGVdKVxuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSBhbGwgdGhlIGNoaWxkcmVuIG9mIGFuIGVudGl0eS5cbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IGlkIENvbXBvbmVudCBpbnN0YW5jZSBpZC5cbiAgICovXG5cbiAgZnVuY3Rpb24gdXBkYXRlQ2hpbGRyZW4gKGVudGl0eUlkKSB7XG4gICAgZm9yRWFjaChjaGlsZHJlbltlbnRpdHlJZF0sIGZ1bmN0aW9uIChjaGlsZElkKSB7XG4gICAgICB1cGRhdGVFbnRpdHkoY2hpbGRJZClcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhbGwgb2YgdGhlIGNoaWxkIGVudGl0aWVzIG9mIGFuIGVudGl0eVxuICAgKlxuICAgKiBAcGFyYW0ge0VudGl0eX0gZW50aXR5XG4gICAqL1xuXG4gIGZ1bmN0aW9uIHVubW91bnRDaGlsZHJlbiAoZW50aXR5SWQpIHtcbiAgICBmb3JFYWNoKGNoaWxkcmVuW2VudGl0eUlkXSwgZnVuY3Rpb24gKGNoaWxkSWQpIHtcbiAgICAgIHVubW91bnRFbnRpdHkoY2hpbGRJZClcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSB0aGUgcm9vdCBlbGVtZW50LiBJZiB0aGlzIGlzIGNhbGxlZCBzeW5jaHJvbm91c2x5IHdlIG5lZWQgdG9cbiAgICogY2FuY2VsIGFueSBwZW5kaW5nIGZ1dHVyZSB1cGRhdGVzLlxuICAgKi9cblxuICBmdW5jdGlvbiByZW1vdmVOYXRpdmVFbGVtZW50ICgpIHtcbiAgICBjbGVhckZyYW1lKClcbiAgICByZW1vdmVFbGVtZW50KHJvb3RJZCwgJzAnLCBjdXJyZW50TmF0aXZlRWxlbWVudClcbiAgICBjdXJyZW50TmF0aXZlRWxlbWVudCA9IG51bGxcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuYXRpdmUgZWxlbWVudCBmcm9tIGEgdmlydHVhbCBlbGVtZW50LlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gZW50aXR5SWRcbiAgICogQHBhcmFtIHtTdHJpbmd9IHBhdGhcbiAgICogQHBhcmFtIHtPYmplY3R9IHZub2RlXG4gICAqXG4gICAqIEByZXR1cm4ge0hUTUxEb2N1bWVudEZyYWdtZW50fVxuICAgKi9cblxuICBmdW5jdGlvbiB0b05hdGl2ZSAoZW50aXR5SWQsIHBhdGgsIHZub2RlKSB7XG4gICAgc3dpdGNoICh2bm9kZS50eXBlKSB7XG4gICAgICBjYXNlICd0ZXh0JzogcmV0dXJuIHRvTmF0aXZlVGV4dCh2bm9kZSlcbiAgICAgIGNhc2UgJ2VsZW1lbnQnOiByZXR1cm4gdG9OYXRpdmVFbGVtZW50KGVudGl0eUlkLCBwYXRoLCB2bm9kZSlcbiAgICAgIGNhc2UgJ2NvbXBvbmVudCc6IHJldHVybiB0b05hdGl2ZUNvbXBvbmVudChlbnRpdHlJZCwgcGF0aCwgdm5vZGUpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5hdGl2ZSB0ZXh0IGVsZW1lbnQgZnJvbSBhIHZpcnR1YWwgZWxlbWVudC5cbiAgICpcbiAgICogQHBhcmFtIHtPYmplY3R9IHZub2RlXG4gICAqL1xuXG4gIGZ1bmN0aW9uIHRvTmF0aXZlVGV4dCAodm5vZGUpIHtcbiAgICByZXR1cm4gZG9jdW1lbnQuY3JlYXRlVGV4dE5vZGUodm5vZGUuZGF0YSlcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBuYXRpdmUgZWxlbWVudCBmcm9tIGEgdmlydHVhbCBlbGVtZW50LlxuICAgKi9cblxuICBmdW5jdGlvbiB0b05hdGl2ZUVsZW1lbnQgKGVudGl0eUlkLCBwYXRoLCB2bm9kZSkge1xuICAgIHZhciBhdHRyaWJ1dGVzID0gdm5vZGUuYXR0cmlidXRlc1xuICAgIHZhciBjaGlsZHJlbiA9IHZub2RlLmNoaWxkcmVuXG4gICAgdmFyIHRhZ05hbWUgPSB2bm9kZS50YWdOYW1lXG4gICAgdmFyIGVsXG5cbiAgICAvLyBjcmVhdGUgZWxlbWVudCBlaXRoZXIgZnJvbSBwb29sIG9yIGZyZXNoLlxuICAgIGlmICghb3B0aW9ucy5wb29saW5nIHx8ICFjYW5Qb29sKHRhZ05hbWUpKSB7XG4gICAgICBpZiAoc3ZnLmlzRWxlbWVudCh0YWdOYW1lKSkge1xuICAgICAgICBlbCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyhzdmcubmFtZXNwYWNlLCB0YWdOYW1lKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZWwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KHRhZ05hbWUpXG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBwb29sID0gZ2V0UG9vbCh0YWdOYW1lKVxuICAgICAgZWwgPSBjbGVhbnVwKHBvb2wucG9wKCkpXG4gICAgICBpZiAoZWwucGFyZW50Tm9kZSkgZWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbClcbiAgICB9XG5cbiAgICAvLyBzZXQgYXR0cmlidXRlcy5cbiAgICBmb3JFYWNoKGF0dHJpYnV0ZXMsIGZ1bmN0aW9uICh2YWx1ZSwgbmFtZSkge1xuICAgICAgc2V0QXR0cmlidXRlKGVudGl0eUlkLCBwYXRoLCBlbCwgbmFtZSwgdmFsdWUpXG4gICAgfSlcblxuICAgIC8vIHN0b3JlIGtleXMgb24gdGhlIG5hdGl2ZSBlbGVtZW50IGZvciBmYXN0IGV2ZW50IGhhbmRsaW5nLlxuICAgIGVsLl9fZW50aXR5X18gPSBlbnRpdHlJZFxuICAgIGVsLl9fcGF0aF9fID0gcGF0aFxuXG4gICAgLy8gYWRkIGNoaWxkcmVuLlxuICAgIGZvckVhY2goY2hpbGRyZW4sIGZ1bmN0aW9uIChjaGlsZCwgaSkge1xuICAgICAgdmFyIGNoaWxkRWwgPSB0b05hdGl2ZShlbnRpdHlJZCwgcGF0aCArICcuJyArIGksIGNoaWxkKVxuICAgICAgaWYgKCFjaGlsZEVsLnBhcmVudE5vZGUpIGVsLmFwcGVuZENoaWxkKGNoaWxkRWwpXG4gICAgfSlcblxuICAgIHJldHVybiBlbFxuICB9XG5cbiAgLyoqXG4gICAqIENyZWF0ZSBhIG5hdGl2ZSBlbGVtZW50IGZyb20gYSBjb21wb25lbnQuXG4gICAqL1xuXG4gIGZ1bmN0aW9uIHRvTmF0aXZlQ29tcG9uZW50IChlbnRpdHlJZCwgcGF0aCwgdm5vZGUpIHtcbiAgICB2YXIgY2hpbGQgPSBuZXcgRW50aXR5KHZub2RlLmNvbXBvbmVudCwgdm5vZGUucHJvcHMsIGVudGl0eUlkKVxuICAgIGNoaWxkcmVuW2VudGl0eUlkXVtwYXRoXSA9IGNoaWxkLmlkXG4gICAgcmV0dXJuIG1vdW50RW50aXR5KGNoaWxkKVxuICB9XG5cbiAgLyoqXG4gICAqIFBhdGNoIGFuIGVsZW1lbnQgd2l0aCB0aGUgZGlmZiBmcm9tIHR3byB0cmVlcy5cbiAgICovXG5cbiAgZnVuY3Rpb24gcGF0Y2ggKGVudGl0eUlkLCBwcmV2LCBuZXh0LCBlbCkge1xuICAgIHJldHVybiBkaWZmTm9kZSgnMCcsIGVudGl0eUlkLCBwcmV2LCBuZXh0LCBlbClcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYSBkaWZmIGJldHdlZW4gdHdvIHRyZWVzIG9mIG5vZGVzLlxuICAgKi9cblxuICBmdW5jdGlvbiBkaWZmTm9kZSAocGF0aCwgZW50aXR5SWQsIHByZXYsIG5leHQsIGVsKSB7XG4gICAgLy8gVHlwZSBjaGFuZ2VkLiBUaGlzIGNvdWxkIGJlIGZyb20gZWxlbWVudC0+dGV4dCwgdGV4dC0+Q29tcG9uZW50QSxcbiAgICAvLyBDb21wb25lbnRBLT5Db21wb25lbnRCIGV0Yy4gQnV0IE5PVCBkaXYtPnNwYW4uIFRoZXNlIGFyZSB0aGUgc2FtZSB0eXBlXG4gICAgLy8gKEVsZW1lbnROb2RlKSBidXQgZGlmZmVyZW50IHRhZyBuYW1lLlxuICAgIGlmIChwcmV2LnR5cGUgIT09IG5leHQudHlwZSkgcmV0dXJuIHJlcGxhY2VFbGVtZW50KGVudGl0eUlkLCBwYXRoLCBlbCwgbmV4dClcblxuICAgIHN3aXRjaCAobmV4dC50eXBlKSB7XG4gICAgICBjYXNlICd0ZXh0JzogcmV0dXJuIGRpZmZUZXh0KHByZXYsIG5leHQsIGVsKVxuICAgICAgY2FzZSAnZWxlbWVudCc6IHJldHVybiBkaWZmRWxlbWVudChwYXRoLCBlbnRpdHlJZCwgcHJldiwgbmV4dCwgZWwpXG4gICAgICBjYXNlICdjb21wb25lbnQnOiByZXR1cm4gZGlmZkNvbXBvbmVudChwYXRoLCBlbnRpdHlJZCwgcHJldiwgbmV4dCwgZWwpXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIERpZmYgdHdvIHRleHQgbm9kZXMgYW5kIHVwZGF0ZSB0aGUgZWxlbWVudC5cbiAgICovXG5cbiAgZnVuY3Rpb24gZGlmZlRleHQgKHByZXZpb3VzLCBjdXJyZW50LCBlbCkge1xuICAgIGlmIChjdXJyZW50LmRhdGEgIT09IHByZXZpb3VzLmRhdGEpIGVsLmRhdGEgPSBjdXJyZW50LmRhdGFcbiAgICByZXR1cm4gZWxcbiAgfVxuXG4gIC8qKlxuICAgKiBEaWZmIHRoZSBjaGlsZHJlbiBvZiBhbiBFbGVtZW50Tm9kZS5cbiAgICovXG5cbiAgZnVuY3Rpb24gZGlmZkNoaWxkcmVuIChwYXRoLCBlbnRpdHlJZCwgcHJldiwgbmV4dCwgZWwpIHtcbiAgICB2YXIgcG9zaXRpb25zID0gW11cbiAgICB2YXIgaGFzS2V5cyA9IGZhbHNlXG4gICAgdmFyIGNoaWxkTm9kZXMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuYXBwbHkoZWwuY2hpbGROb2RlcylcbiAgICB2YXIgbGVmdEtleXMgPSByZWR1Y2UocHJldi5jaGlsZHJlbiwga2V5TWFwUmVkdWNlciwge30pXG4gICAgdmFyIHJpZ2h0S2V5cyA9IHJlZHVjZShuZXh0LmNoaWxkcmVuLCBrZXlNYXBSZWR1Y2VyLCB7fSlcbiAgICB2YXIgY3VycmVudENoaWxkcmVuID0gYXNzaWduKHt9LCBjaGlsZHJlbltlbnRpdHlJZF0pXG5cbiAgICBmdW5jdGlvbiBrZXlNYXBSZWR1Y2VyIChhY2MsIGNoaWxkKSB7XG4gICAgICBpZiAoY2hpbGQua2V5ICE9IG51bGwpIHtcbiAgICAgICAgYWNjW2NoaWxkLmtleV0gPSBjaGlsZFxuICAgICAgICBoYXNLZXlzID0gdHJ1ZVxuICAgICAgfVxuICAgICAgcmV0dXJuIGFjY1xuICAgIH1cblxuICAgIC8vIERpZmYgYWxsIG9mIHRoZSBub2RlcyB0aGF0IGhhdmUga2V5cy4gVGhpcyBsZXRzIHVzIHJlLXVzZWQgZWxlbWVudHNcbiAgICAvLyBpbnN0ZWFkIG9mIG92ZXJyaWRpbmcgdGhlbSBhbmQgbGV0cyB1cyBtb3ZlIHRoZW0gYXJvdW5kLlxuICAgIGlmIChoYXNLZXlzKSB7XG5cbiAgICAgIC8vIFJlbW92YWxzXG4gICAgICBmb3JFYWNoKGxlZnRLZXlzLCBmdW5jdGlvbiAobGVmdE5vZGUsIGtleSkge1xuICAgICAgICBpZiAocmlnaHRLZXlzW2tleV0gPT0gbnVsbCkge1xuICAgICAgICAgIHZhciBsZWZ0UGF0aCA9IHBhdGggKyAnLicgKyBsZWZ0Tm9kZS5pbmRleFxuICAgICAgICAgIHJlbW92ZUVsZW1lbnQoXG4gICAgICAgICAgICBlbnRpdHlJZCxcbiAgICAgICAgICAgIGxlZnRQYXRoLFxuICAgICAgICAgICAgY2hpbGROb2Rlc1tsZWZ0Tm9kZS5pbmRleF1cbiAgICAgICAgICApXG4gICAgICAgIH1cbiAgICAgIH0pXG5cbiAgICAgIC8vIFVwZGF0ZSBub2Rlc1xuICAgICAgZm9yRWFjaChyaWdodEtleXMsIGZ1bmN0aW9uIChyaWdodE5vZGUsIGtleSkge1xuICAgICAgICB2YXIgbGVmdE5vZGUgPSBsZWZ0S2V5c1trZXldXG5cbiAgICAgICAgLy8gV2Ugb25seSB3YW50IHVwZGF0ZXMgZm9yIG5vd1xuICAgICAgICBpZiAobGVmdE5vZGUgPT0gbnVsbCkgcmV0dXJuXG5cbiAgICAgICAgdmFyIGxlZnRQYXRoID0gcGF0aCArICcuJyArIGxlZnROb2RlLmluZGV4XG5cbiAgICAgICAgLy8gVXBkYXRlZFxuICAgICAgICBwb3NpdGlvbnNbcmlnaHROb2RlLmluZGV4XSA9IGRpZmZOb2RlKFxuICAgICAgICAgIGxlZnRQYXRoLFxuICAgICAgICAgIGVudGl0eUlkLFxuICAgICAgICAgIGxlZnROb2RlLFxuICAgICAgICAgIHJpZ2h0Tm9kZSxcbiAgICAgICAgICBjaGlsZE5vZGVzW2xlZnROb2RlLmluZGV4XVxuICAgICAgICApXG4gICAgICB9KVxuXG4gICAgICAvLyBVcGRhdGUgdGhlIHBvc2l0aW9ucyBvZiBhbGwgY2hpbGQgY29tcG9uZW50cyBhbmQgZXZlbnQgaGFuZGxlcnNcbiAgICAgIGZvckVhY2gocmlnaHRLZXlzLCBmdW5jdGlvbiAocmlnaHROb2RlLCBrZXkpIHtcbiAgICAgICAgdmFyIGxlZnROb2RlID0gbGVmdEtleXNba2V5XVxuXG4gICAgICAgIC8vIFdlIGp1c3Qgd2FudCBlbGVtZW50cyB0aGF0IGhhdmUgbW92ZWQgYXJvdW5kXG4gICAgICAgIGlmIChsZWZ0Tm9kZSA9PSBudWxsIHx8IGxlZnROb2RlLmluZGV4ID09PSByaWdodE5vZGUuaW5kZXgpIHJldHVyblxuXG4gICAgICAgIHZhciByaWdodFBhdGggPSBwYXRoICsgJy4nICsgcmlnaHROb2RlLmluZGV4XG4gICAgICAgIHZhciBsZWZ0UGF0aCA9IHBhdGggKyAnLicgKyBsZWZ0Tm9kZS5pbmRleFxuXG4gICAgICAgIC8vIFVwZGF0ZSBhbGwgdGhlIGNoaWxkIGNvbXBvbmVudCBwYXRoIHBvc2l0aW9ucyB0byBtYXRjaFxuICAgICAgICAvLyB0aGUgbGF0ZXN0IHBvc2l0aW9ucyBpZiB0aGV5J3ZlIGNoYW5nZWQuIFRoaXMgaXMgYSBiaXQgaGFja3kuXG4gICAgICAgIGZvckVhY2goY3VycmVudENoaWxkcmVuLCBmdW5jdGlvbiAoY2hpbGRJZCwgY2hpbGRQYXRoKSB7XG4gICAgICAgICAgaWYgKGxlZnRQYXRoID09PSBjaGlsZFBhdGgpIHtcbiAgICAgICAgICAgIGRlbGV0ZSBjaGlsZHJlbltlbnRpdHlJZF1bY2hpbGRQYXRoXVxuICAgICAgICAgICAgY2hpbGRyZW5bZW50aXR5SWRdW3JpZ2h0UGF0aF0gPSBjaGlsZElkXG4gICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgfSlcblxuICAgICAgLy8gTm93IGFkZCBhbGwgb2YgdGhlIG5ldyBub2RlcyBsYXN0IGluIGNhc2UgdGhlaXIgcGF0aFxuICAgICAgLy8gd291bGQgaGF2ZSBjb25mbGljdGVkIHdpdGggb25lIG9mIHRoZSBwcmV2aW91cyBwYXRocy5cbiAgICAgIGZvckVhY2gocmlnaHRLZXlzLCBmdW5jdGlvbiAocmlnaHROb2RlLCBrZXkpIHtcbiAgICAgICAgdmFyIHJpZ2h0UGF0aCA9IHBhdGggKyAnLicgKyByaWdodE5vZGUuaW5kZXhcbiAgICAgICAgaWYgKGxlZnRLZXlzW2tleV0gPT0gbnVsbCkge1xuICAgICAgICAgIHBvc2l0aW9uc1tyaWdodE5vZGUuaW5kZXhdID0gdG9OYXRpdmUoXG4gICAgICAgICAgICBlbnRpdHlJZCxcbiAgICAgICAgICAgIHJpZ2h0UGF0aCxcbiAgICAgICAgICAgIHJpZ2h0Tm9kZVxuICAgICAgICAgIClcbiAgICAgICAgfVxuICAgICAgfSlcblxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgbWF4TGVuZ3RoID0gTWF0aC5tYXgocHJldi5jaGlsZHJlbi5sZW5ndGgsIG5leHQuY2hpbGRyZW4ubGVuZ3RoKVxuXG4gICAgICAvLyBOb3cgZGlmZiBhbGwgb2YgdGhlIG5vZGVzIHRoYXQgZG9uJ3QgaGF2ZSBrZXlzXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IG1heExlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBsZWZ0Tm9kZSA9IHByZXYuY2hpbGRyZW5baV1cbiAgICAgICAgdmFyIHJpZ2h0Tm9kZSA9IG5leHQuY2hpbGRyZW5baV1cblxuICAgICAgICAvLyBSZW1vdmFsc1xuICAgICAgICBpZiAocmlnaHROb2RlID09IG51bGwpIHtcbiAgICAgICAgICByZW1vdmVFbGVtZW50KFxuICAgICAgICAgICAgZW50aXR5SWQsXG4gICAgICAgICAgICBwYXRoICsgJy4nICsgbGVmdE5vZGUuaW5kZXgsXG4gICAgICAgICAgICBjaGlsZE5vZGVzW2xlZnROb2RlLmluZGV4XVxuICAgICAgICAgIClcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIE5ldyBOb2RlXG4gICAgICAgIGlmIChsZWZ0Tm9kZSA9PSBudWxsKSB7XG4gICAgICAgICAgcG9zaXRpb25zW3JpZ2h0Tm9kZS5pbmRleF0gPSB0b05hdGl2ZShcbiAgICAgICAgICAgIGVudGl0eUlkLFxuICAgICAgICAgICAgcGF0aCArICcuJyArIHJpZ2h0Tm9kZS5pbmRleCxcbiAgICAgICAgICAgIHJpZ2h0Tm9kZVxuICAgICAgICAgIClcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIFVwZGF0ZWRcbiAgICAgICAgaWYgKGxlZnROb2RlICYmIHJpZ2h0Tm9kZSkge1xuICAgICAgICAgIHBvc2l0aW9uc1tsZWZ0Tm9kZS5pbmRleF0gPSBkaWZmTm9kZShcbiAgICAgICAgICAgIHBhdGggKyAnLicgKyBsZWZ0Tm9kZS5pbmRleCxcbiAgICAgICAgICAgIGVudGl0eUlkLFxuICAgICAgICAgICAgbGVmdE5vZGUsXG4gICAgICAgICAgICByaWdodE5vZGUsXG4gICAgICAgICAgICBjaGlsZE5vZGVzW2xlZnROb2RlLmluZGV4XVxuICAgICAgICAgIClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFJlcG9zaXRpb24gYWxsIHRoZSBlbGVtZW50c1xuICAgIGZvckVhY2gocG9zaXRpb25zLCBmdW5jdGlvbiAoY2hpbGRFbCwgbmV3UG9zaXRpb24pIHtcbiAgICAgIHZhciB0YXJnZXQgPSBlbC5jaGlsZE5vZGVzW25ld1Bvc2l0aW9uXVxuICAgICAgaWYgKGNoaWxkRWwgIT09IHRhcmdldCkge1xuICAgICAgICBpZiAodGFyZ2V0KSB7XG4gICAgICAgICAgZWwuaW5zZXJ0QmVmb3JlKGNoaWxkRWwsIHRhcmdldClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBlbC5hcHBlbmRDaGlsZChjaGlsZEVsKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBEaWZmIHRoZSBhdHRyaWJ1dGVzIGFuZCBhZGQvcmVtb3ZlIHRoZW0uXG4gICAqL1xuXG4gIGZ1bmN0aW9uIGRpZmZBdHRyaWJ1dGVzIChwcmV2LCBuZXh0LCBlbCwgZW50aXR5SWQsIHBhdGgpIHtcbiAgICB2YXIgbmV4dEF0dHJzID0gbmV4dC5hdHRyaWJ1dGVzXG4gICAgdmFyIHByZXZBdHRycyA9IHByZXYuYXR0cmlidXRlc1xuXG4gICAgLy8gYWRkIG5ldyBhdHRyc1xuICAgIGZvckVhY2gobmV4dEF0dHJzLCBmdW5jdGlvbiAodmFsdWUsIG5hbWUpIHtcbiAgICAgIGlmIChldmVudHNbbmFtZV0gfHwgIShuYW1lIGluIHByZXZBdHRycykgfHwgcHJldkF0dHJzW25hbWVdICE9PSB2YWx1ZSkge1xuICAgICAgICBzZXRBdHRyaWJ1dGUoZW50aXR5SWQsIHBhdGgsIGVsLCBuYW1lLCB2YWx1ZSlcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gcmVtb3ZlIG9sZCBhdHRyc1xuICAgIGZvckVhY2gocHJldkF0dHJzLCBmdW5jdGlvbiAodmFsdWUsIG5hbWUpIHtcbiAgICAgIGlmICghKG5hbWUgaW4gbmV4dEF0dHJzKSkge1xuICAgICAgICByZW1vdmVBdHRyaWJ1dGUoZW50aXR5SWQsIHBhdGgsIGVsLCBuYW1lKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIGEgY29tcG9uZW50IHdpdGggdGhlIHByb3BzIGZyb20gdGhlIG5leHQgbm9kZS4gSWZcbiAgICogdGhlIGNvbXBvbmVudCB0eXBlIGhhcyBjaGFuZ2VkLCB3ZSdsbCBqdXN0IHJlbW92ZSB0aGUgb2xkIG9uZVxuICAgKiBhbmQgcmVwbGFjZSBpdCB3aXRoIHRoZSBuZXcgY29tcG9uZW50LlxuICAgKi9cblxuICBmdW5jdGlvbiBkaWZmQ29tcG9uZW50IChwYXRoLCBlbnRpdHlJZCwgcHJldiwgbmV4dCwgZWwpIHtcbiAgICBpZiAobmV4dC5jb21wb25lbnQgIT09IHByZXYuY29tcG9uZW50KSB7XG4gICAgICByZXR1cm4gcmVwbGFjZUVsZW1lbnQoZW50aXR5SWQsIHBhdGgsIGVsLCBuZXh0KVxuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgdGFyZ2V0SWQgPSBjaGlsZHJlbltlbnRpdHlJZF1bcGF0aF1cblxuICAgICAgLy8gVGhpcyBpcyBhIGhhY2sgZm9yIG5vd1xuICAgICAgaWYgKHRhcmdldElkKSB7XG4gICAgICAgIHVwZGF0ZUVudGl0eVByb3BzKHRhcmdldElkLCBuZXh0LnByb3BzKVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gZWxcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRGlmZiB0d28gZWxlbWVudCBub2Rlcy5cbiAgICovXG5cbiAgZnVuY3Rpb24gZGlmZkVsZW1lbnQgKHBhdGgsIGVudGl0eUlkLCBwcmV2LCBuZXh0LCBlbCkge1xuICAgIGlmIChuZXh0LnRhZ05hbWUgIT09IHByZXYudGFnTmFtZSkgcmV0dXJuIHJlcGxhY2VFbGVtZW50KGVudGl0eUlkLCBwYXRoLCBlbCwgbmV4dClcbiAgICBkaWZmQXR0cmlidXRlcyhwcmV2LCBuZXh0LCBlbCwgZW50aXR5SWQsIHBhdGgpXG4gICAgZGlmZkNoaWxkcmVuKHBhdGgsIGVudGl0eUlkLCBwcmV2LCBuZXh0LCBlbClcbiAgICByZXR1cm4gZWxcbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGFuIGVsZW1lbnQgZnJvbSB0aGUgRE9NIGFuZCB1bm1vdW50cyBhbmQgY29tcG9uZW50c1xuICAgKiB0aGF0IGFyZSB3aXRoaW4gdGhhdCBicmFuY2hcbiAgICpcbiAgICogc2lkZSBlZmZlY3RzOlxuICAgKiAgIC0gcmVtb3ZlcyBlbGVtZW50IGZyb20gdGhlIERPTVxuICAgKiAgIC0gcmVtb3ZlcyBpbnRlcm5hbCByZWZlcmVuY2VzXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBlbnRpdHlJZFxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbFxuICAgKi9cblxuICBmdW5jdGlvbiByZW1vdmVFbGVtZW50IChlbnRpdHlJZCwgcGF0aCwgZWwpIHtcbiAgICB2YXIgY2hpbGRyZW5CeVBhdGggPSBjaGlsZHJlbltlbnRpdHlJZF1cbiAgICB2YXIgY2hpbGRJZCA9IGNoaWxkcmVuQnlQYXRoW3BhdGhdXG4gICAgdmFyIGVudGl0eUhhbmRsZXJzID0gaGFuZGxlcnNbZW50aXR5SWRdIHx8IHt9XG4gICAgdmFyIHJlbW92YWxzID0gW11cblxuICAgIC8vIElmIHRoZSBwYXRoIHBvaW50cyB0byBhIGNvbXBvbmVudCB3ZSBzaG91bGQgdXNlIHRoYXRcbiAgICAvLyBjb21wb25lbnRzIGVsZW1lbnQgaW5zdGVhZCwgYmVjYXVzZSBpdCBtaWdodCBoYXZlIG1vdmVkIGl0LlxuICAgIGlmIChjaGlsZElkKSB7XG4gICAgICB2YXIgY2hpbGQgPSBlbnRpdGllc1tjaGlsZElkXVxuICAgICAgZWwgPSBjaGlsZC5uYXRpdmVFbGVtZW50XG4gICAgICB1bm1vdW50RW50aXR5KGNoaWxkSWQpXG4gICAgICByZW1vdmFscy5wdXNoKHBhdGgpXG4gICAgfSBlbHNlIHtcblxuICAgICAgLy8gSnVzdCByZW1vdmUgdGhlIHRleHQgbm9kZVxuICAgICAgaWYgKCFpc0VsZW1lbnQoZWwpKSByZXR1cm4gZWwgJiYgZWwucGFyZW50Tm9kZS5yZW1vdmVDaGlsZChlbClcblxuICAgICAgLy8gVGhlbiB3ZSBuZWVkIHRvIGZpbmQgYW55IGNvbXBvbmVudHMgd2l0aGluIHRoaXNcbiAgICAgIC8vIGJyYW5jaCBhbmQgdW5tb3VudCB0aGVtLlxuICAgICAgZm9yRWFjaChjaGlsZHJlbkJ5UGF0aCwgZnVuY3Rpb24gKGNoaWxkSWQsIGNoaWxkUGF0aCkge1xuICAgICAgICBpZiAoY2hpbGRQYXRoID09PSBwYXRoIHx8IGlzV2l0aGluUGF0aChwYXRoLCBjaGlsZFBhdGgpKSB7XG4gICAgICAgICAgdW5tb3VudEVudGl0eShjaGlsZElkKVxuICAgICAgICAgIHJlbW92YWxzLnB1c2goY2hpbGRQYXRoKVxuICAgICAgICB9XG4gICAgICB9KVxuXG4gICAgICAvLyBSZW1vdmUgYWxsIGV2ZW50cyBhdCB0aGlzIHBhdGggb3IgYmVsb3cgaXRcbiAgICAgIGZvckVhY2goZW50aXR5SGFuZGxlcnMsIGZ1bmN0aW9uIChmbiwgaGFuZGxlclBhdGgpIHtcbiAgICAgICAgaWYgKGhhbmRsZXJQYXRoID09PSBwYXRoIHx8IGlzV2l0aGluUGF0aChwYXRoLCBoYW5kbGVyUGF0aCkpIHtcbiAgICAgICAgICByZW1vdmVFdmVudChlbnRpdHlJZCwgaGFuZGxlclBhdGgpXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuXG4gICAgLy8gUmVtb3ZlIHRoZSBwYXRocyBmcm9tIHRoZSBvYmplY3Qgd2l0aG91dCB0b3VjaGluZyB0aGVcbiAgICAvLyBvbGQgb2JqZWN0LiBUaGlzIGtlZXBzIHRoZSBvYmplY3QgdXNpbmcgZmFzdCBwcm9wZXJ0aWVzLlxuICAgIGZvckVhY2gocmVtb3ZhbHMsIGZ1bmN0aW9uIChwYXRoKSB7XG4gICAgICBkZWxldGUgY2hpbGRyZW5bZW50aXR5SWRdW3BhdGhdXG4gICAgfSlcblxuICAgIC8vIFJlbW92ZSBpdCBmcm9tIHRoZSBET01cbiAgICBlbC5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKGVsKVxuXG4gICAgLy8gUmV0dXJuIGFsbCBvZiB0aGUgZWxlbWVudHMgaW4gdGhpcyBub2RlIHRyZWUgdG8gdGhlIHBvb2xcbiAgICAvLyBzbyB0aGF0IHRoZSBlbGVtZW50cyBjYW4gYmUgcmUtdXNlZC5cbiAgICBpZiAob3B0aW9ucy5wb29saW5nKSB7XG4gICAgICB3YWxrKGVsLCBmdW5jdGlvbiAobm9kZSkge1xuICAgICAgICBpZiAoIWlzRWxlbWVudChub2RlKSB8fCAhY2FuUG9vbChub2RlLnRhZ05hbWUpKSByZXR1cm5cbiAgICAgICAgZ2V0UG9vbChub2RlLnRhZ05hbWUudG9Mb3dlckNhc2UoKSkucHVzaChub2RlKVxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVwbGFjZSBhbiBlbGVtZW50IGluIHRoZSBET00uIFJlbW92aW5nIGFsbCBjb21wb25lbnRzXG4gICAqIHdpdGhpbiB0aGF0IGVsZW1lbnQgYW5kIHJlLXJlbmRlcmluZyB0aGUgbmV3IHZpcnR1YWwgbm9kZS5cbiAgICpcbiAgICogQHBhcmFtIHtFbnRpdHl9IGVudGl0eVxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbFxuICAgKiBAcGFyYW0ge09iamVjdH0gdm5vZGVcbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG5cbiAgZnVuY3Rpb24gcmVwbGFjZUVsZW1lbnQgKGVudGl0eUlkLCBwYXRoLCBlbCwgdm5vZGUpIHtcbiAgICB2YXIgcGFyZW50ID0gZWwucGFyZW50Tm9kZVxuICAgIHZhciBpbmRleCA9IEFycmF5LnByb3RvdHlwZS5pbmRleE9mLmNhbGwocGFyZW50LmNoaWxkTm9kZXMsIGVsKVxuXG4gICAgLy8gcmVtb3ZlIHRoZSBwcmV2aW91cyBlbGVtZW50IGFuZCBhbGwgbmVzdGVkIGNvbXBvbmVudHMuIFRoaXNcbiAgICAvLyBuZWVkcyB0byBoYXBwZW4gYmVmb3JlIHdlIGNyZWF0ZSB0aGUgbmV3IGVsZW1lbnQgc28gd2UgZG9uJ3RcbiAgICAvLyBnZXQgY2xhc2hlcyBvbiB0aGUgY29tcG9uZW50IHBhdGhzLlxuICAgIHJlbW92ZUVsZW1lbnQoZW50aXR5SWQsIHBhdGgsIGVsKVxuXG4gICAgLy8gdGhlbiBhZGQgdGhlIG5ldyBlbGVtZW50IGluIHRoZXJlXG4gICAgdmFyIG5ld0VsID0gdG9OYXRpdmUoZW50aXR5SWQsIHBhdGgsIHZub2RlKVxuICAgIHZhciB0YXJnZXQgPSBwYXJlbnQuY2hpbGROb2Rlc1tpbmRleF1cblxuICAgIGlmICh0YXJnZXQpIHtcbiAgICAgIHBhcmVudC5pbnNlcnRCZWZvcmUobmV3RWwsIHRhcmdldClcbiAgICB9IGVsc2Uge1xuICAgICAgcGFyZW50LmFwcGVuZENoaWxkKG5ld0VsKVxuICAgIH1cblxuICAgIC8vIHdhbGsgdXAgdGhlIHRyZWUgYW5kIHVwZGF0ZSBhbGwgYGVudGl0eS5uYXRpdmVFbGVtZW50YCByZWZlcmVuY2VzLlxuICAgIGlmIChlbnRpdHlJZCAhPT0gJ3Jvb3QnICYmIHBhdGggPT09ICcwJykge1xuICAgICAgdXBkYXRlTmF0aXZlRWxlbWVudChlbnRpdHlJZCwgbmV3RWwpXG4gICAgfVxuXG4gICAgcmV0dXJuIG5ld0VsXG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIGFsbCBlbnRpdGllcyBpbiBhIGJyYW5jaCB0aGF0IGhhdmUgdGhlIHNhbWUgbmF0aXZlRWxlbWVudC4gVGhpc1xuICAgKiBoYXBwZW5zIHdoZW4gYSBjb21wb25lbnQgaGFzIGFub3RoZXIgY29tcG9uZW50IGFzIGl0J3Mgcm9vdCBub2RlLlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gZW50aXR5SWRcbiAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gbmV3RWxcbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG5cbiAgZnVuY3Rpb24gdXBkYXRlTmF0aXZlRWxlbWVudCAoZW50aXR5SWQsIG5ld0VsKSB7XG4gICAgdmFyIHRhcmdldCA9IGVudGl0aWVzW2VudGl0eUlkXVxuICAgIGlmICh0YXJnZXQub3duZXJJZCA9PT0gJ3Jvb3QnKSByZXR1cm5cbiAgICBpZiAoY2hpbGRyZW5bdGFyZ2V0Lm93bmVySWRdWycwJ10gPT09IGVudGl0eUlkKSB7XG4gICAgICBlbnRpdGllc1t0YXJnZXQub3duZXJJZF0ubmF0aXZlRWxlbWVudCA9IG5ld0VsXG4gICAgICB1cGRhdGVOYXRpdmVFbGVtZW50KHRhcmdldC5vd25lcklkLCBuZXdFbClcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogU2V0IHRoZSBhdHRyaWJ1dGUgb2YgYW4gZWxlbWVudCwgcGVyZm9ybWluZyBhZGRpdGlvbmFsIHRyYW5zZm9ybWF0aW9uc1xuICAgKiBkZXBlbmRuaW5nIG9uIHRoZSBhdHRyaWJ1dGUgbmFtZVxuICAgKlxuICAgKiBAcGFyYW0ge0hUTUxFbGVtZW50fSBlbFxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICAgKiBAcGFyYW0ge1N0cmluZ30gdmFsdWVcbiAgICovXG5cbiAgZnVuY3Rpb24gc2V0QXR0cmlidXRlIChlbnRpdHlJZCwgcGF0aCwgZWwsIG5hbWUsIHZhbHVlKSB7XG4gICAgaWYgKGV2ZW50c1tuYW1lXSkge1xuICAgICAgYWRkRXZlbnQoZW50aXR5SWQsIHBhdGgsIGV2ZW50c1tuYW1lXSwgdmFsdWUpXG4gICAgICByZXR1cm5cbiAgICB9XG4gICAgc3dpdGNoIChuYW1lKSB7XG4gICAgICBjYXNlICdjaGVja2VkJzpcbiAgICAgIGNhc2UgJ2Rpc2FibGVkJzpcbiAgICAgIGNhc2UgJ3NlbGVjdGVkJzpcbiAgICAgICAgZWxbbmFtZV0gPSB0cnVlXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlICdpbm5lckhUTUwnOlxuICAgICAgY2FzZSAndmFsdWUnOlxuICAgICAgICBlbFtuYW1lXSA9IHZhbHVlXG4gICAgICAgIGJyZWFrXG4gICAgICBjYXNlIHN2Zy5pc0F0dHJpYnV0ZShuYW1lKTpcbiAgICAgICAgZWwuc2V0QXR0cmlidXRlTlMoc3ZnLm5hbWVzcGFjZSwgbmFtZSwgdmFsdWUpXG4gICAgICAgIGJyZWFrXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBlbC5zZXRBdHRyaWJ1dGUobmFtZSwgdmFsdWUpXG4gICAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhbiBhdHRyaWJ1dGUsIHBlcmZvcm1pbmcgYWRkaXRpb25hbCB0cmFuc2Zvcm1hdGlvbnNcbiAgICogZGVwZW5kbmluZyBvbiB0aGUgYXR0cmlidXRlIG5hbWVcbiAgICpcbiAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxcbiAgICogQHBhcmFtIHtTdHJpbmd9IG5hbWVcbiAgICovXG5cbiAgZnVuY3Rpb24gcmVtb3ZlQXR0cmlidXRlIChlbnRpdHlJZCwgcGF0aCwgZWwsIG5hbWUpIHtcbiAgICBpZiAoZXZlbnRzW25hbWVdKSB7XG4gICAgICByZW1vdmVFdmVudChlbnRpdHlJZCwgcGF0aCwgZXZlbnRzW25hbWVdKVxuICAgICAgcmV0dXJuXG4gICAgfVxuICAgIHN3aXRjaCAobmFtZSkge1xuICAgICAgY2FzZSAnY2hlY2tlZCc6XG4gICAgICBjYXNlICdkaXNhYmxlZCc6XG4gICAgICBjYXNlICdzZWxlY3RlZCc6XG4gICAgICAgIGVsW25hbWVdID0gZmFsc2VcbiAgICAgICAgYnJlYWtcbiAgICAgIGNhc2UgJ2lubmVySFRNTCc6XG4gICAgICBjYXNlICd2YWx1ZSc6XG4gICAgICAgIGVsW25hbWVdID0gXCJcIlxuICAgICAgICBicmVha1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgZWwucmVtb3ZlQXR0cmlidXRlKG5hbWUpXG4gICAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENoZWNrcyB0byBzZWUgaWYgb25lIHRyZWUgcGF0aCBpcyB3aXRoaW5cbiAgICogYW5vdGhlciB0cmVlIHBhdGguIEV4YW1wbGU6XG4gICAqXG4gICAqIDAuMSB2cyAwLjEuMSA9IHRydWVcbiAgICogMC4yIHZzIDAuMy41ID0gZmFsc2VcbiAgICpcbiAgICogQHBhcmFtIHtTdHJpbmd9IHRhcmdldFxuICAgKiBAcGFyYW0ge1N0cmluZ30gcGF0aFxuICAgKlxuICAgKiBAcmV0dXJuIHtCb29sZWFufVxuICAgKi9cblxuICBmdW5jdGlvbiBpc1dpdGhpblBhdGggKHRhcmdldCwgcGF0aCkge1xuICAgIHJldHVybiBwYXRoLmluZGV4T2YodGFyZ2V0ICsgJy4nKSA9PT0gMFxuICB9XG5cbiAgLyoqXG4gICAqIElzIHRoZSBET00gbm9kZSBhbiBlbGVtZW50IG5vZGVcbiAgICpcbiAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxcbiAgICpcbiAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICovXG5cbiAgZnVuY3Rpb24gaXNFbGVtZW50IChlbCkge1xuICAgIHJldHVybiAhIShlbCAmJiBlbC50YWdOYW1lKVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcG9vbCBmb3IgYSB0YWdOYW1lLCBjcmVhdGluZyBpdCBpZiBpdFxuICAgKiBkb2Vzbid0IGV4aXN0LlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gdGFnTmFtZVxuICAgKlxuICAgKiBAcmV0dXJuIHtQb29sfVxuICAgKi9cblxuICBmdW5jdGlvbiBnZXRQb29sICh0YWdOYW1lKSB7XG4gICAgdmFyIHBvb2wgPSBwb29sc1t0YWdOYW1lXVxuICAgIGlmICghcG9vbCkge1xuICAgICAgdmFyIHBvb2xPcHRzID0gc3ZnLmlzRWxlbWVudCh0YWdOYW1lKSA/XG4gICAgICAgIHsgbmFtZXNwYWNlOiBzdmcubmFtZXNwYWNlLCB0YWdOYW1lOiB0YWdOYW1lIH0gOlxuICAgICAgICB7IHRhZ05hbWU6IHRhZ05hbWUgfVxuICAgICAgcG9vbCA9IHBvb2xzW3RhZ05hbWVdID0gbmV3IFBvb2wocG9vbE9wdHMpXG4gICAgfVxuICAgIHJldHVybiBwb29sXG4gIH1cblxuICAvKipcbiAgICogQ2xlYW4gdXAgcHJldmlvdXNseSB1c2VkIG5hdGl2ZSBlbGVtZW50IGZvciByZXVzZS5cbiAgICpcbiAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxcbiAgICovXG5cbiAgZnVuY3Rpb24gY2xlYW51cCAoZWwpIHtcbiAgICByZW1vdmVBbGxDaGlsZHJlbihlbClcbiAgICByZW1vdmVBbGxBdHRyaWJ1dGVzKGVsKVxuICAgIHJldHVybiBlbFxuICB9XG5cbiAgLyoqXG4gICAqIFJlbW92ZSBhbGwgdGhlIGF0dHJpYnV0ZXMgZnJvbSBhIG5vZGVcbiAgICpcbiAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxcbiAgICovXG5cbiAgZnVuY3Rpb24gcmVtb3ZlQWxsQXR0cmlidXRlcyAoZWwpIHtcbiAgICBmb3IgKHZhciBpID0gZWwuYXR0cmlidXRlcy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgICAgdmFyIG5hbWUgPSBlbC5hdHRyaWJ1dGVzW2ldLm5hbWVcbiAgICAgIGVsLnJlbW92ZUF0dHJpYnV0ZShuYW1lKVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBSZW1vdmUgYWxsIHRoZSBjaGlsZCBub2RlcyBmcm9tIGFuIGVsZW1lbnRcbiAgICpcbiAgICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWxcbiAgICovXG5cbiAgZnVuY3Rpb24gcmVtb3ZlQWxsQ2hpbGRyZW4gKGVsKSB7XG4gICAgd2hpbGUgKGVsLmZpcnN0Q2hpbGQpIGVsLnJlbW92ZUNoaWxkKGVsLmZpcnN0Q2hpbGQpXG4gIH1cblxuICAvKipcbiAgICogVHJpZ2dlciBhIGhvb2sgb24gYSBjb21wb25lbnQuXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBuYW1lIE5hbWUgb2YgaG9vay5cbiAgICogQHBhcmFtIHtFbnRpdHl9IGVudGl0eSBUaGUgY29tcG9uZW50IGluc3RhbmNlLlxuICAgKiBAcGFyYW0ge0FycmF5fSBhcmdzIFRvIHBhc3MgYWxvbmcgdG8gaG9vay5cbiAgICovXG5cbiAgZnVuY3Rpb24gdHJpZ2dlciAobmFtZSwgZW50aXR5LCBhcmdzKSB7XG4gICAgaWYgKHR5cGVvZiBlbnRpdHkuY29tcG9uZW50W25hbWVdICE9PSAnZnVuY3Rpb24nKSByZXR1cm5cbiAgICByZXR1cm4gZW50aXR5LmNvbXBvbmVudFtuYW1lXS5hcHBseShudWxsLCBhcmdzKVxuICB9XG5cbiAgLyoqXG4gICAqIFRyaWdnZXIgYSBob29rIG9uIHRoZSBjb21wb25lbnQgYW5kIGFsbG93IHN0YXRlIHRvIGJlXG4gICAqIHVwZGF0ZWQgdG9vLlxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICAgKiBAcGFyYW0ge09iamVjdH0gZW50aXR5XG4gICAqIEBwYXJhbSB7QXJyYXl9IGFyZ3NcbiAgICpcbiAgICogQHJldHVybiB7dm9pZH1cbiAgICovXG5cbiAgZnVuY3Rpb24gdHJpZ2dlclVwZGF0ZSAobmFtZSwgZW50aXR5LCBhcmdzKSB7XG4gICAgdmFyIHVwZGF0ZSA9IHNldFN0YXRlKGVudGl0eSlcbiAgICBhcmdzLnB1c2godXBkYXRlKVxuICAgIHZhciByZXN1bHQgPSB0cmlnZ2VyKG5hbWUsIGVudGl0eSwgYXJncylcbiAgICBpZiAocmVzdWx0KSB7XG4gICAgICB1cGRhdGVFbnRpdHlTdGF0ZUFzeW5jKGVudGl0eSwgcmVzdWx0KVxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBVcGRhdGUgdGhlIGVudGl0eSBzdGF0ZSB1c2luZyBhIHByb21pc2VcbiAgICpcbiAgICogQHBhcmFtIHtFbnRpdHl9IGVudGl0eVxuICAgKiBAcGFyYW0ge1Byb21pc2V9IHByb21pc2VcbiAgICovXG5cbiAgZnVuY3Rpb24gdXBkYXRlRW50aXR5U3RhdGVBc3luYyAoZW50aXR5LCB2YWx1ZSkge1xuICAgIGlmIChpc1Byb21pc2UodmFsdWUpKSB7XG4gICAgICB2YWx1ZS50aGVuKGZ1bmN0aW9uIChuZXdTdGF0ZSkge1xuICAgICAgICB1cGRhdGVFbnRpdHlTdGF0ZShlbnRpdHksIG5ld1N0YXRlKVxuICAgICAgfSlcbiAgICB9IGVsc2Uge1xuICAgICAgdXBkYXRlRW50aXR5U3RhdGUoZW50aXR5LCB2YWx1ZSlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVXBkYXRlIGFuIGVudGl0eSB0byBtYXRjaCB0aGUgbGF0ZXN0IHJlbmRlcmVkIHZvZGUuIFdlIGFsd2F5c1xuICAgKiByZXBsYWNlIHRoZSBwcm9wcyBvbiB0aGUgY29tcG9uZW50IHdoZW4gY29tcG9zaW5nIHRoZW0uIFRoaXNcbiAgICogd2lsbCB0cmlnZ2VyIGEgcmUtcmVuZGVyIG9uIGFsbCBjaGlsZHJlbiBiZWxvdyB0aGlzIHBvaW50LlxuICAgKlxuICAgKiBAcGFyYW0ge0VudGl0eX0gZW50aXR5XG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAqIEBwYXJhbSB7T2JqZWN0fSB2bm9kZVxuICAgKlxuICAgKiBAcmV0dXJuIHt2b2lkfVxuICAgKi9cblxuICBmdW5jdGlvbiB1cGRhdGVFbnRpdHlQcm9wcyAoZW50aXR5SWQsIG5leHRQcm9wcykge1xuICAgIHZhciBlbnRpdHkgPSBlbnRpdGllc1tlbnRpdHlJZF1cbiAgICBlbnRpdHkucGVuZGluZ1Byb3BzID0gbmV4dFByb3BzXG4gICAgZW50aXR5LmRpcnR5ID0gdHJ1ZVxuICAgIGludmFsaWRhdGUoKVxuICB9XG5cbiAgLyoqXG4gICAqIFVwZGF0ZSBjb21wb25lbnQgaW5zdGFuY2Ugc3RhdGUuXG4gICAqL1xuXG4gIGZ1bmN0aW9uIHVwZGF0ZUVudGl0eVN0YXRlIChlbnRpdHksIG5leHRTdGF0ZSkge1xuICAgIGVudGl0eS5wZW5kaW5nU3RhdGUgPSBhc3NpZ24oZW50aXR5LnBlbmRpbmdTdGF0ZSwgbmV4dFN0YXRlKVxuICAgIGVudGl0eS5kaXJ0eSA9IHRydWVcbiAgICBpbnZhbGlkYXRlKClcbiAgfVxuXG4gIC8qKlxuICAgKiBDb21taXQgcHJvcHMgYW5kIHN0YXRlIGNoYW5nZXMgdG8gYW4gZW50aXR5LlxuICAgKi9cblxuICBmdW5jdGlvbiBjb21taXQgKGVudGl0eSkge1xuICAgIGVudGl0eS5jb250ZXh0ID0ge1xuICAgICAgc3RhdGU6IGVudGl0eS5wZW5kaW5nU3RhdGUsXG4gICAgICBwcm9wczogZW50aXR5LnBlbmRpbmdQcm9wcyxcbiAgICAgIGlkOiBlbnRpdHkuaWRcbiAgICB9XG4gICAgZW50aXR5LnBlbmRpbmdTdGF0ZSA9IGFzc2lnbih7fSwgZW50aXR5LmNvbnRleHQuc3RhdGUpXG4gICAgZW50aXR5LnBlbmRpbmdQcm9wcyA9IGFzc2lnbih7fSwgZW50aXR5LmNvbnRleHQucHJvcHMpXG4gICAgdmFsaWRhdGVQcm9wcyhlbnRpdHkuY29udGV4dC5wcm9wcywgZW50aXR5LnByb3BUeXBlcylcbiAgICBlbnRpdHkuZGlydHkgPSBmYWxzZVxuICB9XG5cbiAgLyoqXG4gICAqIFRyeSB0byBhdm9pZCBjcmVhdGluZyBuZXcgdmlydHVhbCBkb20gaWYgcG9zc2libGUuXG4gICAqXG4gICAqIExhdGVyIHdlIG1heSBleHBvc2UgdGhpcyBzbyB5b3UgY2FuIG92ZXJyaWRlLCBidXQgbm90IHRoZXJlIHlldC5cbiAgICovXG5cbiAgZnVuY3Rpb24gc2hvdWxkVXBkYXRlIChlbnRpdHkpIHtcbiAgICBpZiAoIWVudGl0eS5kaXJ0eSkgcmV0dXJuIGZhbHNlXG4gICAgaWYgKCFlbnRpdHkuY29tcG9uZW50LnNob3VsZFVwZGF0ZSkgcmV0dXJuIHRydWVcbiAgICB2YXIgbmV4dFByb3BzID0gZW50aXR5LnBlbmRpbmdQcm9wc1xuICAgIHZhciBuZXh0U3RhdGUgPSBlbnRpdHkucGVuZGluZ1N0YXRlXG4gICAgdmFyIGJvb2wgPSBlbnRpdHkuY29tcG9uZW50LnNob3VsZFVwZGF0ZShlbnRpdHkuY29udGV4dCwgbmV4dFByb3BzLCBuZXh0U3RhdGUpXG4gICAgcmV0dXJuIGJvb2xcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBhbiBlbnRpdHkuXG4gICAqXG4gICAqIFRoaXMgaXMgbW9zdGx5IHRvIHByZS1wcmVwcm9jZXNzIGNvbXBvbmVudCBwcm9wZXJ0aWVzIGFuZCB2YWx1ZXMgY2hhaW5zLlxuICAgKlxuICAgKiBUaGUgZW5kIHJlc3VsdCBpcyBmb3IgZXZlcnkgY29tcG9uZW50IHRoYXQgZ2V0cyBtb3VudGVkLFxuICAgKiB5b3UgY3JlYXRlIGEgc2V0IG9mIElPIG5vZGVzIGluIHRoZSBuZXR3b3JrIGZyb20gdGhlIGB2YWx1ZWAgZGVmaW5pdGlvbnMuXG4gICAqXG4gICAqIEBwYXJhbSB7Q29tcG9uZW50fSBjb21wb25lbnRcbiAgICovXG5cbiAgZnVuY3Rpb24gcmVnaXN0ZXIgKGVudGl0eSkge1xuICAgIHJlZ2lzdGVyRW50aXR5KGVudGl0eSlcbiAgICB2YXIgY29tcG9uZW50ID0gZW50aXR5LmNvbXBvbmVudFxuICAgIGlmIChjb21wb25lbnQucmVnaXN0ZXJlZCkgcmV0dXJuXG5cbiAgICAvLyBpbml0aWFsaXplIHNvdXJjZXMgb25jZSBmb3IgYSBjb21wb25lbnQgdHlwZS5cbiAgICByZWdpc3RlclNvdXJjZXMoZW50aXR5KVxuICAgIGNvbXBvbmVudC5yZWdpc3RlcmVkID0gdHJ1ZVxuICB9XG5cbiAgLyoqXG4gICAqIEFkZCBlbnRpdHkgdG8gZGF0YS1zdHJ1Y3R1cmVzIHJlbGF0ZWQgdG8gY29tcG9uZW50cy9lbnRpdGllcy5cbiAgICpcbiAgICogQHBhcmFtIHtFbnRpdHl9IGVudGl0eVxuICAgKi9cblxuICBmdW5jdGlvbiByZWdpc3RlckVudGl0eShlbnRpdHkpIHtcbiAgICB2YXIgY29tcG9uZW50ID0gZW50aXR5LmNvbXBvbmVudFxuICAgIC8vIGFsbCBlbnRpdGllcyBmb3IgdGhpcyBjb21wb25lbnQgdHlwZS5cbiAgICB2YXIgZW50aXRpZXMgPSBjb21wb25lbnQuZW50aXRpZXMgPSBjb21wb25lbnQuZW50aXRpZXMgfHwge31cbiAgICAvLyBhZGQgZW50aXR5IHRvIGNvbXBvbmVudCBsaXN0XG4gICAgZW50aXRpZXNbZW50aXR5LmlkXSA9IGVudGl0eVxuICAgIC8vIG1hcCB0byBjb21wb25lbnQgc28geW91IGNhbiByZW1vdmUgbGF0ZXIuXG4gICAgY29tcG9uZW50c1tlbnRpdHkuaWRdID0gY29tcG9uZW50XG4gIH1cblxuICAvKipcbiAgICogSW5pdGlhbGl6ZSBzb3VyY2VzIGZvciBhIGNvbXBvbmVudCBieSB0eXBlLlxuICAgKlxuICAgKiBAcGFyYW0ge0VudGl0eX0gZW50aXR5XG4gICAqL1xuXG4gIGZ1bmN0aW9uIHJlZ2lzdGVyU291cmNlcyhlbnRpdHkpIHtcbiAgICB2YXIgY29tcG9uZW50ID0gY29tcG9uZW50c1tlbnRpdHkuaWRdXG4gICAgLy8gZ2V0ICdjbGFzcy1sZXZlbCcgc291cmNlcy5cbiAgICAvLyBpZiB3ZSd2ZSBhbHJlYWR5IGhvb2tlZCBpdCB1cCwgdGhlbiB3ZSdyZSBnb29kLlxuICAgIHZhciBzb3VyY2VzID0gY29tcG9uZW50LnNvdXJjZXNcbiAgICBpZiAoc291cmNlcykgcmV0dXJuXG4gICAgdmFyIGVudGl0aWVzID0gY29tcG9uZW50LmVudGl0aWVzXG5cbiAgICAvLyBob29rIHVwIHNvdXJjZXMuXG4gICAgdmFyIG1hcCA9IGNvbXBvbmVudC5zb3VyY2VUb1Byb3BlcnR5TmFtZSA9IHt9XG4gICAgY29tcG9uZW50LnNvdXJjZXMgPSBzb3VyY2VzID0gW11cbiAgICB2YXIgcHJvcFR5cGVzID0gY29tcG9uZW50LnByb3BUeXBlc1xuICAgIGZvciAodmFyIG5hbWUgaW4gcHJvcFR5cGVzKSB7XG4gICAgICB2YXIgZGF0YSA9IHByb3BUeXBlc1tuYW1lXVxuICAgICAgaWYgKCFkYXRhKSBjb250aW51ZVxuICAgICAgaWYgKCFkYXRhLnNvdXJjZSkgY29udGludWVcbiAgICAgIHNvdXJjZXMucHVzaChkYXRhLnNvdXJjZSlcbiAgICAgIG1hcFtkYXRhLnNvdXJjZV0gPSBuYW1lXG4gICAgfVxuXG4gICAgLy8gc2VuZCB2YWx1ZSB1cGRhdGVzIHRvIGFsbCBjb21wb25lbnQgaW5zdGFuY2VzLlxuICAgIHNvdXJjZXMuZm9yRWFjaChmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgICBjb25uZWN0aW9uc1tzb3VyY2VdID0gY29ubmVjdGlvbnNbc291cmNlXSB8fCBbXVxuICAgICAgY29ubmVjdGlvbnNbc291cmNlXS5wdXNoKHVwZGF0ZSlcblxuICAgICAgZnVuY3Rpb24gdXBkYXRlIChkYXRhKSB7XG4gICAgICAgIHZhciBwcm9wID0gbWFwW3NvdXJjZV1cbiAgICAgICAgZm9yICh2YXIgZW50aXR5SWQgaW4gZW50aXRpZXMpIHtcbiAgICAgICAgICB2YXIgZW50aXR5ID0gZW50aXRpZXNbZW50aXR5SWRdXG4gICAgICAgICAgdmFyIGNoYW5nZXMgPSB7fVxuICAgICAgICAgIGNoYW5nZXNbcHJvcF0gPSBkYXRhXG4gICAgICAgICAgdXBkYXRlRW50aXR5UHJvcHMoZW50aXR5SWQsIGFzc2lnbihlbnRpdHkucGVuZGluZ1Byb3BzLCBjaGFuZ2VzKSlcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogU2V0IHRoZSBpbml0aWFsIHNvdXJjZSB2YWx1ZSBvbiB0aGUgZW50aXR5XG4gICAqXG4gICAqIEBwYXJhbSB7RW50aXR5fSBlbnRpdHlcbiAgICovXG5cbiAgZnVuY3Rpb24gc2V0U291cmNlcyAoZW50aXR5KSB7XG4gICAgdmFyIGNvbXBvbmVudCA9IGVudGl0eS5jb21wb25lbnRcbiAgICB2YXIgbWFwID0gY29tcG9uZW50LnNvdXJjZVRvUHJvcGVydHlOYW1lXG4gICAgdmFyIHNvdXJjZXMgPSBjb21wb25lbnQuc291cmNlc1xuICAgIHNvdXJjZXMuZm9yRWFjaChmdW5jdGlvbiAoc291cmNlKSB7XG4gICAgICB2YXIgbmFtZSA9IG1hcFtzb3VyY2VdXG4gICAgICBpZiAoZW50aXR5LnBlbmRpbmdQcm9wc1tuYW1lXSAhPSBudWxsKSByZXR1cm5cbiAgICAgIGVudGl0eS5wZW5kaW5nUHJvcHNbbmFtZV0gPSBhcHAuc291cmNlc1tzb3VyY2VdIC8vIGdldCBsYXRlc3QgdmFsdWUgcGx1Z2dlZCBpbnRvIGdsb2JhbCBzdG9yZVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogQWRkIGFsbCBvZiB0aGUgRE9NIGV2ZW50IGxpc3RlbmVyc1xuICAgKi9cblxuICBmdW5jdGlvbiBhZGROYXRpdmVFdmVudExpc3RlbmVycyAoKSB7XG4gICAgZm9yRWFjaChldmVudHMsIGZ1bmN0aW9uIChldmVudFR5cGUpIHtcbiAgICAgIGRvY3VtZW50LmJvZHkuYWRkRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIGhhbmRsZUV2ZW50LCB0cnVlKVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogQWRkIGFsbCBvZiB0aGUgRE9NIGV2ZW50IGxpc3RlbmVyc1xuICAgKi9cblxuICBmdW5jdGlvbiByZW1vdmVOYXRpdmVFdmVudExpc3RlbmVycyAoKSB7XG4gICAgZm9yRWFjaChldmVudHMsIGZ1bmN0aW9uIChldmVudFR5cGUpIHtcbiAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIGhhbmRsZUV2ZW50LCB0cnVlKVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogSGFuZGxlIGFuIGV2ZW50IHRoYXQgaGFzIG9jY3VyZWQgd2l0aGluIHRoZSBjb250YWluZXJcbiAgICpcbiAgICogQHBhcmFtIHtFdmVudH0gZXZlbnRcbiAgICovXG5cbiAgZnVuY3Rpb24gaGFuZGxlRXZlbnQgKGV2ZW50KSB7XG4gICAgdmFyIHRhcmdldCA9IGV2ZW50LnRhcmdldFxuICAgIHZhciBldmVudFR5cGUgPSBldmVudC50eXBlXG5cbiAgICAvLyBXYWxrIHVwIHRoZSBET00gdHJlZSBhbmQgc2VlIGlmIHRoZXJlIGlzIGEgaGFuZGxlclxuICAgIC8vIGZvciB0aGlzIGV2ZW50IHR5cGUgaGlnaGVyIHVwLlxuICAgIHdoaWxlICh0YXJnZXQpIHtcbiAgICAgIHZhciBmbiA9IGtleXBhdGguZ2V0KGhhbmRsZXJzLCBbdGFyZ2V0Ll9fZW50aXR5X18sIHRhcmdldC5fX3BhdGhfXywgZXZlbnRUeXBlXSlcbiAgICAgIGlmIChmbikge1xuICAgICAgICBldmVudC5kZWxlZ2F0ZVRhcmdldCA9IHRhcmdldFxuICAgICAgICBmbihldmVudClcbiAgICAgICAgYnJlYWtcbiAgICAgIH1cbiAgICAgIHRhcmdldCA9IHRhcmdldC5wYXJlbnROb2RlXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEJpbmQgZXZlbnRzIGZvciBhbiBlbGVtZW50LCBhbmQgYWxsIGl0J3MgcmVuZGVyZWQgY2hpbGQgZWxlbWVudHMuXG4gICAqXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBwYXRoXG4gICAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICAgKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICAgKi9cblxuICBmdW5jdGlvbiBhZGRFdmVudCAoZW50aXR5SWQsIHBhdGgsIGV2ZW50VHlwZSwgZm4pIHtcbiAgICBrZXlwYXRoLnNldChoYW5kbGVycywgW2VudGl0eUlkLCBwYXRoLCBldmVudFR5cGVdLCBmdW5jdGlvbiAoZSkge1xuICAgICAgdmFyIGVudGl0eSA9IGVudGl0aWVzW2VudGl0eUlkXVxuICAgICAgaWYgKGVudGl0eSkge1xuICAgICAgICB2YXIgdXBkYXRlID0gc2V0U3RhdGUoZW50aXR5KVxuICAgICAgICB2YXIgcmVzdWx0ID0gZm4uY2FsbChudWxsLCBlLCBlbnRpdHkuY29udGV4dCwgdXBkYXRlKVxuICAgICAgICBpZiAocmVzdWx0KSB7XG4gICAgICAgICAgdXBkYXRlRW50aXR5U3RhdGVBc3luYyhlbnRpdHksIHJlc3VsdClcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZm4uY2FsbChudWxsLCBlKVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICAvKipcbiAgICogVW5iaW5kIGV2ZW50cyBmb3IgYSBlbnRpdHlJZFxuICAgKlxuICAgKiBAcGFyYW0ge1N0cmluZ30gZW50aXR5SWRcbiAgICovXG5cbiAgZnVuY3Rpb24gcmVtb3ZlRXZlbnQgKGVudGl0eUlkLCBwYXRoLCBldmVudFR5cGUpIHtcbiAgICB2YXIgYXJncyA9IFtlbnRpdHlJZF1cbiAgICBpZiAocGF0aCkgYXJncy5wdXNoKHBhdGgpXG4gICAgaWYgKGV2ZW50VHlwZSkgYXJncy5wdXNoKGV2ZW50VHlwZSlcbiAgICBrZXlwYXRoLmRlbChoYW5kbGVycywgYXJncylcbiAgfVxuXG4gIC8qKlxuICAgKiBVbmJpbmQgYWxsIGV2ZW50cyBmcm9tIGFuIGVudGl0eVxuICAgKlxuICAgKiBAcGFyYW0ge0VudGl0eX0gZW50aXR5XG4gICAqL1xuXG4gIGZ1bmN0aW9uIHJlbW92ZUFsbEV2ZW50cyAoZW50aXR5SWQpIHtcbiAgICBrZXlwYXRoLmRlbChoYW5kbGVycywgW2VudGl0eUlkXSlcbiAgfVxuXG4gIC8qKlxuICAgKiBWYWxpZGF0ZSB0aGUgY3VycmVudCBwcm9wZXJ0aWVzLiBUaGVzZSBzaW1wbGUgdmFsaWRhdGlvbnNcbiAgICogbWFrZSBpdCBlYXNpZXIgdG8gZW5zdXJlIHRoZSBjb3JyZWN0IHByb3BzIGFyZSBwYXNzZWQgaW4uXG4gICAqXG4gICAqIEF2YWlsYWJsZSBydWxlcyBpbmNsdWRlOlxuICAgKlxuICAgKiB0eXBlOiB7U3RyaW5nfSBzdHJpbmcgfCBhcnJheSB8IG9iamVjdCB8IGJvb2xlYW4gfCBudW1iZXIgfCBkYXRlIHwgZnVuY3Rpb25cbiAgICogICAgICAge0FycmF5fSBBbiBhcnJheSBvZiB0eXBlcyBtZW50aW9uZWQgYWJvdmVcbiAgICogICAgICAge0Z1bmN0aW9ufSBmbih2YWx1ZSkgc2hvdWxkIHJldHVybiBgdHJ1ZWAgdG8gcGFzcyBpblxuICAgKiBleHBlY3RzOiBbXSBBbiBhcnJheSBvZiB2YWx1ZXMgdGhpcyBwcm9wIGNvdWxkIGVxdWFsXG4gICAqIG9wdGlvbmFsOiBCb29sZWFuXG4gICAqL1xuXG4gIGZ1bmN0aW9uIHZhbGlkYXRlUHJvcHMgKHByb3BzLCBydWxlcywgb3B0UHJlZml4KSB7XG4gICAgdmFyIHByZWZpeCA9IG9wdFByZWZpeCB8fCAnJ1xuICAgIGlmICghb3B0aW9ucy52YWxpZGF0ZVByb3BzKSByZXR1cm5cbiAgICBmb3JFYWNoKHJ1bGVzLCBmdW5jdGlvbiAob3B0aW9ucywgbmFtZSkge1xuICAgICAgaWYgKCFvcHRpb25zKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignZGVrdTogcHJvcFR5cGVzIHNob3VsZCBoYXZlIGFuIG9wdGlvbnMgb2JqZWN0IGZvciBlYWNoIHR5cGUnKVxuICAgICAgfVxuXG4gICAgICB2YXIgcHJvcE5hbWUgPSBwcmVmaXggPyBwcmVmaXggKyAnLicgKyBuYW1lIDogbmFtZVxuICAgICAgdmFyIHZhbHVlID0ga2V5cGF0aC5nZXQocHJvcHMsIG5hbWUpXG4gICAgICB2YXIgdmFsdWVUeXBlID0gdHlwZSh2YWx1ZSlcbiAgICAgIHZhciB0eXBlRm9ybWF0ID0gdHlwZShvcHRpb25zLnR5cGUpXG4gICAgICB2YXIgb3B0aW9uYWwgPSAob3B0aW9ucy5vcHRpb25hbCA9PT0gdHJ1ZSlcblxuICAgICAgLy8gSWYgaXQncyBvcHRpb25hbCBhbmQgZG9lc24ndCBleGlzdFxuICAgICAgaWYgKG9wdGlvbmFsICYmIHZhbHVlID09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuXG4gICAgICB9XG5cbiAgICAgIC8vIElmIGl0J3MgcmVxdWlyZWQgYW5kIGRvZXNuJ3QgZXhpc3RcbiAgICAgIGlmICghb3B0aW9uYWwgJiYgdmFsdWUgPT0gbnVsbCkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdNaXNzaW5nIHByb3BlcnR5OiAnICsgcHJvcE5hbWUpXG4gICAgICB9XG5cbiAgICAgIC8vIEl0J3MgYSBuZXN0ZWQgdHlwZVxuICAgICAgaWYgKHR5cGVGb3JtYXQgPT09ICdvYmplY3QnKSB7XG4gICAgICAgIHZhbGlkYXRlUHJvcHModmFsdWUsIG9wdGlvbnMudHlwZSwgcHJvcE5hbWUpXG4gICAgICAgIHJldHVyblxuICAgICAgfVxuXG4gICAgICAvLyBJZiBpdCdzIHRoZSBpbmNvcnJlY3QgdHlwZVxuICAgICAgaWYgKHR5cGVGb3JtYXQgPT09ICdzdHJpbmcnICYmIHZhbHVlVHlwZSAhPT0gb3B0aW9ucy50eXBlKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgcHJvcGVydHkgdHlwZTogJyArIHByb3BOYW1lKVxuICAgICAgfVxuXG4gICAgICAvLyBJZiB0eXBlIGlzIHZhbGlkYXRlIGZ1bmN0aW9uXG4gICAgICBpZiAodHlwZUZvcm1hdCA9PT0gJ2Z1bmN0aW9uJyAmJiAhb3B0aW9ucy50eXBlKHZhbHVlKSkge1xuICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIHByb3BlcnR5IHR5cGU6ICcgKyBwcm9wTmFtZSlcbiAgICAgIH1cblxuICAgICAgLy8gaWYgdHlwZSBpcyBhcnJheSBvZiBwb3NzaWJsZSB0eXBlc1xuICAgICAgaWYgKHR5cGVGb3JtYXQgPT09ICdhcnJheScgJiYgb3B0aW9ucy50eXBlLmluZGV4T2YodmFsdWVUeXBlKSA8IDApIHtcbiAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBwcm9wZXJ0eSB0eXBlOiAnICsgcHJvcE5hbWUpXG4gICAgICB9XG5cbiAgICAgIC8vIElmIGl0J3MgYW4gaW52YWxpZCB2YWx1ZVxuICAgICAgaWYgKG9wdGlvbnMuZXhwZWN0cyAmJiBvcHRpb25zLmV4cGVjdHMuaW5kZXhPZih2YWx1ZSkgPCAwKSB7XG4gICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgcHJvcGVydHkgdmFsdWU6ICcgKyBwcm9wTmFtZSlcbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gTm93IGNoZWNrIGZvciBwcm9wcyB0aGF0IGhhdmVuJ3QgYmVlbiBkZWZpbmVkXG4gICAgZm9yRWFjaChwcm9wcywgZnVuY3Rpb24gKHZhbHVlLCBrZXkpIHtcbiAgICAgIC8vIHByb3BzLmNoaWxkcmVuIGlzIGFsd2F5cyBwYXNzZWQgaW4sIGV2ZW4gaWYgaXQncyBub3QgZGVmaW5lZFxuICAgICAgaWYgKGtleSA9PT0gJ2NoaWxkcmVuJykgcmV0dXJuXG4gICAgICBpZiAoIXJ1bGVzW2tleV0pIHRocm93IG5ldyBFcnJvcignVW5leHBlY3RlZCBwcm9wZXJ0eTogJyArIGtleSlcbiAgICB9KVxuICB9XG5cbiAgLyoqXG4gICAqIFVzZWQgZm9yIGRlYnVnZ2luZyB0byBpbnNwZWN0IHRoZSBjdXJyZW50IHN0YXRlIHdpdGhvdXRcbiAgICogdXMgbmVlZGluZyB0byBleHBsaWNpdGx5IG1hbmFnZSBzdG9yaW5nL3VwZGF0aW5nIHJlZmVyZW5jZXMuXG4gICAqXG4gICAqIEByZXR1cm4ge09iamVjdH1cbiAgICovXG5cbiAgZnVuY3Rpb24gaW5zcGVjdCAoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGVudGl0aWVzOiBlbnRpdGllcyxcbiAgICAgIHBvb2xzOiBwb29scyxcbiAgICAgIGhhbmRsZXJzOiBoYW5kbGVycyxcbiAgICAgIGNvbm5lY3Rpb25zOiBjb25uZWN0aW9ucyxcbiAgICAgIGN1cnJlbnRFbGVtZW50OiBjdXJyZW50RWxlbWVudCxcbiAgICAgIG9wdGlvbnM6IG9wdGlvbnMsXG4gICAgICBhcHA6IGFwcCxcbiAgICAgIGNvbnRhaW5lcjogY29udGFpbmVyLFxuICAgICAgY2hpbGRyZW46IGNoaWxkcmVuXG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIFJldHVybiBhbiBvYmplY3QgdGhhdCBsZXRzIHVzIGNvbXBsZXRlbHkgcmVtb3ZlIHRoZSBhdXRvbWF0aWNcbiAgICogRE9NIHJlbmRlcmluZyBhbmQgZXhwb3J0IGRlYnVnZ2luZyB0b29scy5cbiAgICovXG5cbiAgcmV0dXJuIHtcbiAgICByZW1vdmU6IHRlYXJkb3duLFxuICAgIGluc3BlY3Q6IGluc3BlY3RcbiAgfVxufVxuXG4vKipcbiAqIEEgcmVuZGVyZWQgY29tcG9uZW50IGluc3RhbmNlLlxuICpcbiAqIFRoaXMgbWFuYWdlcyB0aGUgbGlmZWN5Y2xlLCBwcm9wcyBhbmQgc3RhdGUgb2YgdGhlIGNvbXBvbmVudC5cbiAqIEl0J3MgYmFzaWNhbGx5IGp1c3QgYSBkYXRhIG9iamVjdCBmb3IgbW9yZSBzdHJhaWdodGZvd2FyZCBsb29rdXAuXG4gKlxuICogQHBhcmFtIHtDb21wb25lbnR9IGNvbXBvbmVudFxuICogQHBhcmFtIHtPYmplY3R9IHByb3BzXG4gKi9cblxuZnVuY3Rpb24gRW50aXR5IChjb21wb25lbnQsIHByb3BzLCBvd25lcklkKSB7XG4gIHRoaXMuaWQgPSB1aWQoKVxuICB0aGlzLm93bmVySWQgPSBvd25lcklkXG4gIHRoaXMuY29tcG9uZW50ID0gY29tcG9uZW50XG4gIHRoaXMucHJvcFR5cGVzID0gY29tcG9uZW50LnByb3BUeXBlcyB8fCB7fVxuICB0aGlzLmNvbnRleHQgPSB7fVxuICB0aGlzLmNvbnRleHQuaWQgPSB0aGlzLmlkO1xuICB0aGlzLmNvbnRleHQucHJvcHMgPSBkZWZhdWx0cyhwcm9wcyB8fCB7fSwgY29tcG9uZW50LmRlZmF1bHRQcm9wcyB8fCB7fSlcbiAgdGhpcy5jb250ZXh0LnN0YXRlID0gdGhpcy5jb21wb25lbnQuaW5pdGlhbFN0YXRlID8gdGhpcy5jb21wb25lbnQuaW5pdGlhbFN0YXRlKHRoaXMuY29udGV4dC5wcm9wcykgOiB7fVxuICB0aGlzLnBlbmRpbmdQcm9wcyA9IGFzc2lnbih7fSwgdGhpcy5jb250ZXh0LnByb3BzKVxuICB0aGlzLnBlbmRpbmdTdGF0ZSA9IGFzc2lnbih7fSwgdGhpcy5jb250ZXh0LnN0YXRlKVxuICB0aGlzLmRpcnR5ID0gZmFsc2VcbiAgdGhpcy52aXJ0dWFsRWxlbWVudCA9IG51bGxcbiAgdGhpcy5uYXRpdmVFbGVtZW50ID0gbnVsbFxuICB0aGlzLmRpc3BsYXlOYW1lID0gY29tcG9uZW50Lm5hbWUgfHwgJ0NvbXBvbmVudCdcbn1cblxuLyoqXG4gKiBTaG91bGQgd2UgcG9vbCBhbiBlbGVtZW50P1xuICovXG5cbmZ1bmN0aW9uIGNhblBvb2wodGFnTmFtZSkge1xuICByZXR1cm4gYXZvaWRQb29saW5nLmluZGV4T2YodGFnTmFtZSkgPCAwXG59XG5cbi8qKlxuICogR2V0IGEgbmVzdGVkIG5vZGUgdXNpbmcgYSBwYXRoXG4gKlxuICogQHBhcmFtIHtIVE1MRWxlbWVudH0gZWwgICBUaGUgcm9vdCBub2RlICcwJ1xuICogQHBhcmFtIHtTdHJpbmd9IHBhdGggVGhlIHBhdGggc3RyaW5nIGVnLiAnMC4yLjQzJ1xuICovXG5cbmZ1bmN0aW9uIGdldE5vZGVBdFBhdGgoZWwsIHBhdGgpIHtcbiAgdmFyIHBhcnRzID0gcGF0aC5zcGxpdCgnLicpXG4gIHBhcnRzLnNoaWZ0KClcbiAgd2hpbGUgKHBhcnRzLmxlbmd0aCkge1xuICAgIGVsID0gZWwuY2hpbGROb2Rlc1twYXJ0cy5wb3AoKV1cbiAgfVxuICByZXR1cm4gZWxcbn1cbiIsInZhciB1dGlscyA9IHJlcXVpcmUoJy4vdXRpbHMnKVxudmFyIGV2ZW50cyA9IHJlcXVpcmUoJy4vZXZlbnRzJylcbnZhciBkZWZhdWx0cyA9IHV0aWxzLmRlZmF1bHRzXG5cbi8qKlxuICogRXhwb3NlIGBzdHJpbmdpZnlgLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFwcCkge1xuICBpZiAoIWFwcC5lbGVtZW50KSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdObyBlbGVtZW50IG1vdW50ZWQnKVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbmRlciB0byBzdHJpbmcuXG4gICAqXG4gICAqIEBwYXJhbSB7Q29tcG9uZW50fSBjb21wb25lbnRcbiAgICogQHBhcmFtIHtPYmplY3R9IFtwcm9wc11cbiAgICogQHJldHVybiB7U3RyaW5nfVxuICAgKi9cblxuICBmdW5jdGlvbiBzdHJpbmdpZnkgKGNvbXBvbmVudCwgb3B0UHJvcHMpIHtcbiAgICB2YXIgcHJvcFR5cGVzID0gY29tcG9uZW50LnByb3BUeXBlcyB8fCB7fVxuICAgIHZhciBwcm9wcyA9IGRlZmF1bHRzKG9wdFByb3BzIHx8IHt9LCBjb21wb25lbnQuZGVmYXVsdFByb3BzIHx8IHt9KVxuICAgIHZhciBzdGF0ZSA9IGNvbXBvbmVudC5pbml0aWFsU3RhdGUgPyBjb21wb25lbnQuaW5pdGlhbFN0YXRlKHByb3BzKSA6IHt9XG5cbiAgICBmb3IgKHZhciBuYW1lIGluIHByb3BUeXBlcykge1xuICAgICAgdmFyIG9wdGlvbnMgPSBwcm9wVHlwZXNbbmFtZV1cbiAgICAgIGlmIChvcHRpb25zLnNvdXJjZSkge1xuICAgICAgICBwcm9wc1tuYW1lXSA9IGFwcC5zb3VyY2VzW29wdGlvbnMuc291cmNlXVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChjb21wb25lbnQuYmVmb3JlTW91bnQpIGNvbXBvbmVudC5iZWZvcmVNb3VudCh7IHByb3BzOiBwcm9wcywgc3RhdGU6IHN0YXRlIH0pXG4gICAgaWYgKGNvbXBvbmVudC5iZWZvcmVSZW5kZXIpIGNvbXBvbmVudC5iZWZvcmVSZW5kZXIoeyBwcm9wczogcHJvcHMsIHN0YXRlOiBzdGF0ZSB9KVxuICAgIHZhciBub2RlID0gY29tcG9uZW50LnJlbmRlcih7IHByb3BzOiBwcm9wcywgc3RhdGU6IHN0YXRlIH0pXG4gICAgcmV0dXJuIHN0cmluZ2lmeU5vZGUobm9kZSwgJzAnKVxuICB9XG5cbiAgLyoqXG4gICAqIFJlbmRlciBhIG5vZGUgdG8gYSBzdHJpbmdcbiAgICpcbiAgICogQHBhcmFtIHtOb2RlfSBub2RlXG4gICAqIEBwYXJhbSB7VHJlZX0gdHJlZVxuICAgKlxuICAgKiBAcmV0dXJuIHtTdHJpbmd9XG4gICAqL1xuXG4gIGZ1bmN0aW9uIHN0cmluZ2lmeU5vZGUgKG5vZGUsIHBhdGgpIHtcbiAgICBzd2l0Y2ggKG5vZGUudHlwZSkge1xuICAgICAgY2FzZSAndGV4dCc6IHJldHVybiBub2RlLmRhdGFcbiAgICAgIGNhc2UgJ2VsZW1lbnQnOlxuICAgICAgICB2YXIgY2hpbGRyZW4gPSBub2RlLmNoaWxkcmVuXG4gICAgICAgIHZhciBhdHRyaWJ1dGVzID0gbm9kZS5hdHRyaWJ1dGVzXG4gICAgICAgIHZhciB0YWdOYW1lID0gbm9kZS50YWdOYW1lXG4gICAgICAgIHZhciBpbm5lckhUTUwgPSBhdHRyaWJ1dGVzLmlubmVySFRNTFxuICAgICAgICB2YXIgc3RyID0gJzwnICsgdGFnTmFtZSArIGF0dHJzKGF0dHJpYnV0ZXMpICsgJz4nXG5cbiAgICAgICAgaWYgKGlubmVySFRNTCkge1xuICAgICAgICAgIHN0ciArPSBpbm5lckhUTUxcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBmb3IgKHZhciBpID0gMCwgbiA9IGNoaWxkcmVuLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgc3RyICs9IHN0cmluZ2lmeU5vZGUoY2hpbGRyZW5baV0sIHBhdGggKyAnLicgKyBpKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHN0ciArPSAnPC8nICsgdGFnTmFtZSArICc+J1xuICAgICAgICByZXR1cm4gc3RyXG4gICAgICBjYXNlICdjb21wb25lbnQnOiByZXR1cm4gc3RyaW5naWZ5KG5vZGUuY29tcG9uZW50LCBub2RlLnByb3BzKVxuICAgIH1cblxuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCB0eXBlJylcbiAgfVxuXG4gIHJldHVybiBzdHJpbmdpZnlOb2RlKGFwcC5lbGVtZW50LCAnMCcpXG59XG5cbi8qKlxuICogSFRNTCBhdHRyaWJ1dGVzIHRvIHN0cmluZy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gYXR0cmlidXRlc1xuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gYXR0cnMgKGF0dHJpYnV0ZXMpIHtcbiAgdmFyIHN0ciA9ICcnXG4gIGZvciAodmFyIGtleSBpbiBhdHRyaWJ1dGVzKSB7XG4gICAgaWYgKGtleSA9PT0gJ2lubmVySFRNTCcpIGNvbnRpbnVlXG4gICAgaWYgKGV2ZW50c1trZXldKSBjb250aW51ZVxuICAgIHN0ciArPSBhdHRyKGtleSwgYXR0cmlidXRlc1trZXldKVxuICB9XG4gIHJldHVybiBzdHJcbn1cblxuLyoqXG4gKiBIVE1MIGF0dHJpYnV0ZSB0byBzdHJpbmcuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGtleVxuICogQHBhcmFtIHtTdHJpbmd9IHZhbFxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gYXR0ciAoa2V5LCB2YWwpIHtcbiAgcmV0dXJuICcgJyArIGtleSArICc9XCInICsgdmFsICsgJ1wiJ1xufVxuIiwidmFyIGluZGV4T2YgPSByZXF1aXJlKCdmYXN0LmpzL2FycmF5L2luZGV4T2YnKVxuXG4vKipcbiAqIFRoaXMgZmlsZSBsaXN0cyB0aGUgc3VwcG9ydGVkIFNWRyBlbGVtZW50cyB1c2VkIGJ5IHRoZVxuICogcmVuZGVyZXIuIFdlIG1heSBhZGQgYmV0dGVyIFNWRyBzdXBwb3J0IGluIHRoZSBmdXR1cmVcbiAqIHRoYXQgZG9lc24ndCByZXF1aXJlIHdoaXRlbGlzdGluZyBlbGVtZW50cy5cbiAqL1xuXG5leHBvcnRzLm5hbWVzcGFjZSA9ICdodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZydcblxuLyoqXG4gKiBTdXBwb3J0ZWQgU1ZHIGVsZW1lbnRzXG4gKlxuICogQHR5cGUge0FycmF5fVxuICovXG5cbmV4cG9ydHMuZWxlbWVudHMgPSBbXG4gICdhbmltYXRlJyxcbiAgJ2NpcmNsZScsXG4gICdkZWZzJyxcbiAgJ2VsbGlwc2UnLFxuICAnZycsXG4gICdsaW5lJyxcbiAgJ2xpbmVhckdyYWRpZW50JyxcbiAgJ21hc2snLFxuICAncGF0aCcsXG4gICdwYXR0ZXJuJyxcbiAgJ3BvbHlnb24nLFxuICAncG9seWxpbmUnLFxuICAncmFkaWFsR3JhZGllbnQnLFxuICAncmVjdCcsXG4gICdzdG9wJyxcbiAgJ3N2ZycsXG4gICd0ZXh0JyxcbiAgJ3RzcGFuJ1xuXVxuXG4vKipcbiAqIFN1cHBvcnRlZCBTVkcgYXR0cmlidXRlc1xuICovXG5cbmV4cG9ydHMuYXR0cmlidXRlcyA9IFtcbiAgJ2N4JyxcbiAgJ2N5JyxcbiAgJ2QnLFxuICAnZHgnLFxuICAnZHknLFxuICAnZmlsbCcsXG4gICdmaWxsT3BhY2l0eScsXG4gICdmb250RmFtaWx5JyxcbiAgJ2ZvbnRTaXplJyxcbiAgJ2Z4JyxcbiAgJ2Z5JyxcbiAgJ2dyYWRpZW50VHJhbnNmb3JtJyxcbiAgJ2dyYWRpZW50VW5pdHMnLFxuICAnbWFya2VyRW5kJyxcbiAgJ21hcmtlck1pZCcsXG4gICdtYXJrZXJTdGFydCcsXG4gICdvZmZzZXQnLFxuICAnb3BhY2l0eScsXG4gICdwYXR0ZXJuQ29udGVudFVuaXRzJyxcbiAgJ3BhdHRlcm5Vbml0cycsXG4gICdwb2ludHMnLFxuICAncHJlc2VydmVBc3BlY3RSYXRpbycsXG4gICdyJyxcbiAgJ3J4JyxcbiAgJ3J5JyxcbiAgJ3NwcmVhZE1ldGhvZCcsXG4gICdzdG9wQ29sb3InLFxuICAnc3RvcE9wYWNpdHknLFxuICAnc3Ryb2tlJyxcbiAgJ3N0cm9rZURhc2hhcnJheScsXG4gICdzdHJva2VMaW5lY2FwJyxcbiAgJ3N0cm9rZU9wYWNpdHknLFxuICAnc3Ryb2tlV2lkdGgnLFxuICAndGV4dEFuY2hvcicsXG4gICd0cmFuc2Zvcm0nLFxuICAndmVyc2lvbicsXG4gICd2aWV3Qm94JyxcbiAgJ3gxJyxcbiAgJ3gyJyxcbiAgJ3gnLFxuICAneTEnLFxuICAneTInLFxuICAneSdcbl1cblxuLyoqXG4gKiBJcyBlbGVtZW50J3MgbmFtZXNwYWNlIFNWRz9cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gbmFtZVxuICovXG5cbmV4cG9ydHMuaXNFbGVtZW50ID0gZnVuY3Rpb24gKG5hbWUpIHtcbiAgcmV0dXJuIGluZGV4T2YoZXhwb3J0cy5lbGVtZW50cywgbmFtZSkgIT09IC0xXG59XG5cbi8qKlxuICogQXJlIGVsZW1lbnQncyBhdHRyaWJ1dGVzIFNWRz9cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gYXR0clxuICovXG5cbmV4cG9ydHMuaXNBdHRyaWJ1dGUgPSBmdW5jdGlvbiAoYXR0cikge1xuICByZXR1cm4gaW5kZXhPZihleHBvcnRzLmF0dHJpYnV0ZXMsIGF0dHIpICE9PSAtMVxufVxuXG4iLCIvKipcbiAqIFRoZSBucG0gJ2RlZmF1bHRzJyBtb2R1bGUgYnV0IHdpdGhvdXQgY2xvbmUgYmVjYXVzZVxuICogaXQgd2FzIHJlcXVpcmluZyB0aGUgJ0J1ZmZlcicgbW9kdWxlIHdoaWNoIGlzIGh1Z2UuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9wdGlvbnNcbiAqIEBwYXJhbSB7T2JqZWN0fSBkZWZhdWx0c1xuICpcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqL1xuXG5leHBvcnRzLmRlZmF1bHRzID0gZnVuY3Rpb24ob3B0aW9ucywgZGVmYXVsdHMpIHtcbiAgT2JqZWN0LmtleXMoZGVmYXVsdHMpLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKHR5cGVvZiBvcHRpb25zW2tleV0gPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBvcHRpb25zW2tleV0gPSBkZWZhdWx0c1trZXldXG4gICAgfVxuICB9KVxuICByZXR1cm4gb3B0aW9uc1xufVxuIiwiLyoqXG4gKiBNb2R1bGUgZGVwZW5kZW5jaWVzLlxuICovXG5cbnZhciB0eXBlID0gcmVxdWlyZSgnY29tcG9uZW50LXR5cGUnKVxudmFyIHNsaWNlID0gcmVxdWlyZSgnc2xpY2VkJylcbnZhciBmbGF0dGVuID0gcmVxdWlyZSgnYXJyYXktZmxhdHRlbicpXG5cbi8qKlxuICogVGhpcyBmdW5jdGlvbiBsZXRzIHVzIGNyZWF0ZSB2aXJ0dWFsIG5vZGVzIHVzaW5nIGEgc2ltcGxlXG4gKiBzeW50YXguIEl0IGlzIGNvbXBhdGlibGUgd2l0aCBKU1ggdHJhbnNmb3JtcyBzbyB5b3UgY2FuIHVzZVxuICogSlNYIHRvIHdyaXRlIG5vZGVzIHRoYXQgd2lsbCBjb21waWxlIHRvIHRoaXMgZnVuY3Rpb24uXG4gKlxuICogbGV0IG5vZGUgPSB2aXJ0dWFsKCdkaXYnLCB7IGlkOiAnZm9vJyB9LCBbXG4gKiAgIHZpcnR1YWwoJ2EnLCB7IGhyZWY6ICdodHRwOi8vZ29vZ2xlLmNvbScgfSwgJ0dvb2dsZScpXG4gKiBdKVxuICpcbiAqIFlvdSBjYW4gbGVhdmUgb3V0IHRoZSBhdHRyaWJ1dGVzIG9yIHRoZSBjaGlsZHJlbiBpZiBlaXRoZXJcbiAqIG9mIHRoZW0gYXJlbid0IG5lZWRlZCBhbmQgaXQgd2lsbCBmaWd1cmUgb3V0IHdoYXQgeW91J3JlXG4gKiB0cnlpbmcgdG8gZG8uXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSB2aXJ0dWFsXG5cbi8qKlxuICogQ3JlYXRlIHZpcnR1YWwgRE9NIHRyZWVzLlxuICpcbiAqIFRoaXMgY3JlYXRlcyB0aGUgbmljZXIgQVBJIGZvciB0aGUgdXNlci5cbiAqIEl0IHRyYW5zbGF0ZXMgdGhhdCBmcmllbmRseSBBUEkgaW50byBhbiBhY3R1YWwgdHJlZSBvZiBub2Rlcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xGdW5jdGlvbn0gdHlwZVxuICogQHBhcmFtIHtPYmplY3R9IHByb3BzXG4gKiBAcGFyYW0ge0FycmF5fSBjaGlsZHJlblxuICogQHJldHVybiB7Tm9kZX1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gdmlydHVhbCAodHlwZSwgcHJvcHMsIGNoaWxkcmVuKSB7XG4gIC8vIERlZmF1bHQgdG8gZGl2IHdpdGggbm8gYXJnc1xuICBpZiAoIXR5cGUpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2Rla3U6IEVsZW1lbnQgbmVlZHMgYSB0eXBlLiBSZWFkIG1vcmU6IGh0dHA6Ly9jbC5seS9iMEtaJylcbiAgfVxuXG4gIC8vIFNraXBwZWQgYWRkaW5nIGF0dHJpYnV0ZXMgYW5kIHdlJ3JlIHBhc3NpbmdcbiAgLy8gaW4gY2hpbGRyZW4gaW5zdGVhZC5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDIgJiYgKHR5cGVvZiBwcm9wcyA9PT0gJ3N0cmluZycgfHwgQXJyYXkuaXNBcnJheShwcm9wcykpKSB7XG4gICAgY2hpbGRyZW4gPSBwcm9wc1xuICAgIHByb3BzID0ge31cbiAgfVxuXG4gIC8vIEFjY291bnQgZm9yIEpTWCBwdXR0aW5nIHRoZSBjaGlsZHJlbiBhcyBtdWx0aXBsZSBhcmd1bWVudHMuXG4gIC8vIFRoaXMgaXMgZXNzZW50aWFsbHkganVzdCB0aGUgRVM2IHJlc3QgcGFyYW1cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPiAyICYmIEFycmF5LmlzQXJyYXkoYXJndW1lbnRzWzJdKSA9PT0gZmFsc2UpIHtcbiAgICBjaGlsZHJlbiA9IHNsaWNlKGFyZ3VtZW50cywgMilcbiAgfVxuXG4gIGNoaWxkcmVuID0gY2hpbGRyZW4gfHwgW11cbiAgcHJvcHMgPSBwcm9wcyB8fCB7fVxuXG4gIC8vIHBhc3NpbmcgaW4gYSBzaW5nbGUgY2hpbGQsIHlvdSBjYW4gc2tpcFxuICAvLyB1c2luZyB0aGUgYXJyYXlcbiAgaWYgKCFBcnJheS5pc0FycmF5KGNoaWxkcmVuKSkge1xuICAgIGNoaWxkcmVuID0gWyBjaGlsZHJlbiBdXG4gIH1cblxuICBjaGlsZHJlbiA9IGZsYXR0ZW4oY2hpbGRyZW4sIDEpLnJlZHVjZShub3JtYWxpemUsIFtdKVxuXG4gIC8vIHB1bGwgdGhlIGtleSBvdXQgZnJvbSB0aGUgZGF0YS5cbiAgdmFyIGtleSA9ICdrZXknIGluIHByb3BzID8gU3RyaW5nKHByb3BzLmtleSkgOiBudWxsXG4gIGRlbGV0ZSBwcm9wc1sna2V5J11cblxuICAvLyBpZiB5b3UgcGFzcyBpbiBhIGZ1bmN0aW9uLCBpdCdzIGEgYENvbXBvbmVudGAgY29uc3RydWN0b3IuXG4gIC8vIG90aGVyd2lzZSBpdCdzIGFuIGVsZW1lbnQuXG4gIHZhciBub2RlXG4gIGlmICh0eXBlb2YgdHlwZSA9PT0gJ3N0cmluZycpIHtcbiAgICBub2RlID0gbmV3IEVsZW1lbnROb2RlKHR5cGUsIHByb3BzLCBrZXksIGNoaWxkcmVuKVxuICB9IGVsc2Uge1xuICAgIG5vZGUgPSBuZXcgQ29tcG9uZW50Tm9kZSh0eXBlLCBwcm9wcywga2V5LCBjaGlsZHJlbilcbiAgfVxuXG4gIC8vIHNldCB0aGUgdW5pcXVlIElEXG4gIG5vZGUuaW5kZXggPSAwXG5cbiAgcmV0dXJuIG5vZGVcbn1cblxuLyoqXG4gKiBQYXJzZSBub2RlcyBpbnRvIHJlYWwgYE5vZGVgIG9iamVjdHMuXG4gKlxuICogQHBhcmFtIHtNaXhlZH0gbm9kZVxuICogQHBhcmFtIHtJbnRlZ2VyfSBpbmRleFxuICogQHJldHVybiB7Tm9kZX1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZSAoYWNjLCBub2RlKSB7XG4gIGlmIChub2RlID09IG51bGwpIHtcbiAgICByZXR1cm4gYWNjXG4gIH1cbiAgaWYgKHR5cGVvZiBub2RlID09PSAnc3RyaW5nJyB8fCB0eXBlb2Ygbm9kZSA9PT0gJ251bWJlcicpIHtcbiAgICB2YXIgbmV3Tm9kZSA9IG5ldyBUZXh0Tm9kZShTdHJpbmcobm9kZSkpXG4gICAgbmV3Tm9kZS5pbmRleCA9IGFjYy5sZW5ndGhcbiAgICBhY2MucHVzaChuZXdOb2RlKVxuICB9IGVsc2Uge1xuICAgIG5vZGUuaW5kZXggPSBhY2MubGVuZ3RoXG4gICAgYWNjLnB1c2gobm9kZSlcbiAgfVxuICByZXR1cm4gYWNjXG59XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBhIG5ldyBgQ29tcG9uZW50Tm9kZWAuXG4gKlxuICogQHBhcmFtIHtDb21wb25lbnR9IGNvbXBvbmVudFxuICogQHBhcmFtIHtPYmplY3R9IHByb3BzXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5IFVzZWQgZm9yIHNvcnRpbmcvcmVwbGFjaW5nIGR1cmluZyBkaWZmaW5nLlxuICogQHBhcmFtIHtBcnJheX0gY2hpbGRyZW4gQ2hpbGQgdmlydHVhbCBub2Rlc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBDb21wb25lbnROb2RlIChjb21wb25lbnQsIHByb3BzLCBrZXksIGNoaWxkcmVuKSB7XG4gIHRoaXMua2V5ID0ga2V5XG4gIHRoaXMucHJvcHMgPSBwcm9wc1xuICB0aGlzLnR5cGUgPSAnY29tcG9uZW50J1xuICB0aGlzLmNvbXBvbmVudCA9IGNvbXBvbmVudFxuICB0aGlzLnByb3BzLmNoaWxkcmVuID0gY2hpbGRyZW4gfHwgW11cbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBFbGVtZW50Tm9kZWAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IHRhZ05hbWVcbiAqIEBwYXJhbSB7T2JqZWN0fSBhdHRyaWJ1dGVzXG4gKiBAcGFyYW0ge1N0cmluZ30ga2V5IFVzZWQgZm9yIHNvcnRpbmcvcmVwbGFjaW5nIGR1cmluZyBkaWZmaW5nLlxuICogQHBhcmFtIHtBcnJheX0gY2hpbGRyZW4gQ2hpbGQgdmlydHVhbCBkb20gbm9kZXMuXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIEVsZW1lbnROb2RlICh0YWdOYW1lLCBhdHRyaWJ1dGVzLCBrZXksIGNoaWxkcmVuKSB7XG4gIHRoaXMudHlwZSA9ICdlbGVtZW50J1xuICB0aGlzLmF0dHJpYnV0ZXMgPSBwYXJzZUF0dHJpYnV0ZXMoYXR0cmlidXRlcylcbiAgdGhpcy50YWdOYW1lID0gdGFnTmFtZVxuICB0aGlzLmNoaWxkcmVuID0gY2hpbGRyZW4gfHwgW11cbiAgdGhpcy5rZXkgPSBrZXlcbn1cblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBUZXh0Tm9kZWAuXG4gKlxuICogVGhpcyBpcyBqdXN0IGEgdmlydHVhbCBIVE1MIHRleHQgb2JqZWN0LlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSB0ZXh0XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIFRleHROb2RlICh0ZXh0KSB7XG4gIHRoaXMudHlwZSA9ICd0ZXh0J1xuICB0aGlzLmRhdGEgPSBTdHJpbmcodGV4dClcbn1cblxuLyoqXG4gKiBQYXJzZSBhdHRyaWJ1dGVzIGZvciBzb21lIHNwZWNpYWwgY2FzZXMuXG4gKlxuICogVE9ETzogVGhpcyBjb3VsZCBiZSBtb3JlIGZ1bmN0aW9uYWwgYW5kIGFsbG93IGhvb2tzXG4gKiBpbnRvIHRoZSBwcm9jZXNzaW5nIG9mIHRoZSBhdHRyaWJ1dGVzIGF0IGEgY29tcG9uZW50LWxldmVsXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGF0dHJpYnV0ZXNcbiAqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKi9cblxuZnVuY3Rpb24gcGFyc2VBdHRyaWJ1dGVzIChhdHRyaWJ1dGVzKSB7XG4gIC8vIHN0eWxlOiB7ICd0ZXh0LWFsaWduJzogJ2xlZnQnIH1cbiAgaWYgKGF0dHJpYnV0ZXMuc3R5bGUpIHtcbiAgICBhdHRyaWJ1dGVzLnN0eWxlID0gcGFyc2VTdHlsZShhdHRyaWJ1dGVzLnN0eWxlKVxuICB9XG5cbiAgLy8gY2xhc3M6IHsgZm9vOiB0cnVlLCBiYXI6IGZhbHNlLCBiYXo6IHRydWUgfVxuICAvLyBjbGFzczogWydmb28nLCAnYmFyJywgJ2JheiddXG4gIGlmIChhdHRyaWJ1dGVzLmNsYXNzKSB7XG4gICAgYXR0cmlidXRlcy5jbGFzcyA9IHBhcnNlQ2xhc3MoYXR0cmlidXRlcy5jbGFzcylcbiAgfVxuXG4gIC8vIFJlbW92ZSBhdHRyaWJ1dGVzIHdpdGggZmFsc2UgdmFsdWVzXG4gIHZhciBmaWx0ZXJlZEF0dHJpYnV0ZXMgPSB7fVxuICBmb3IgKHZhciBrZXkgaW4gYXR0cmlidXRlcykge1xuICAgIHZhciB2YWx1ZSA9IGF0dHJpYnV0ZXNba2V5XVxuICAgIGlmICh2YWx1ZSA9PSBudWxsIHx8IHZhbHVlID09PSBmYWxzZSkgY29udGludWVcbiAgICBmaWx0ZXJlZEF0dHJpYnV0ZXNba2V5XSA9IHZhbHVlXG4gIH1cblxuICByZXR1cm4gZmlsdGVyZWRBdHRyaWJ1dGVzXG59XG5cbi8qKlxuICogUGFyc2UgYSBibG9jayBvZiBzdHlsZXMgaW50byBhIHN0cmluZy5cbiAqXG4gKiBUT0RPOiB0aGlzIGNvdWxkIGRvIGEgbG90IG1vcmUgd2l0aCB2ZW5kb3IgcHJlZml4aW5nLFxuICogbnVtYmVyIHZhbHVlcyBldGMuIE1heWJlIHRoZXJlJ3MgYSB3YXkgdG8gYWxsb3cgdXNlcnNcbiAqIHRvIGhvb2sgaW50byB0aGlzP1xuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBzdHlsZXNcbiAqXG4gKiBAcmV0dXJuIHtTdHJpbmd9XG4gKi9cblxuZnVuY3Rpb24gcGFyc2VTdHlsZSAoc3R5bGVzKSB7XG4gIGlmICh0eXBlKHN0eWxlcykgPT09ICdzdHJpbmcnKSB7XG4gICAgcmV0dXJuIHN0eWxlc1xuICB9XG4gIHZhciBzdHIgPSAnJ1xuICBmb3IgKHZhciBuYW1lIGluIHN0eWxlcykge1xuICAgIHZhciB2YWx1ZSA9IHN0eWxlc1tuYW1lXVxuICAgIHN0ciA9IHN0ciArIG5hbWUgKyAnOicgKyB2YWx1ZSArICc7J1xuICB9XG4gIHJldHVybiBzdHI7XG59XG5cbi8qKlxuICogUGFyc2UgdGhlIGNsYXNzIGF0dHJpYnV0ZSBzbyBpdCdzIGFibGUgdG8gYmVcbiAqIHNldCBpbiBhIG1vcmUgdXNlci1mcmllbmRseSB3YXlcbiAqXG4gKiBAcGFyYW0ge1N0cmluZ3xPYmplY3R8QXJyYXl9IHZhbHVlXG4gKlxuICogQHJldHVybiB7U3RyaW5nfVxuICovXG5cbmZ1bmN0aW9uIHBhcnNlQ2xhc3MgKHZhbHVlKSB7XG4gIC8vIHsgZm9vOiB0cnVlLCBiYXI6IGZhbHNlLCBiYXo6IHRydWUgfVxuICBpZiAodHlwZSh2YWx1ZSkgPT09ICdvYmplY3QnKSB7XG4gICAgdmFyIG1hdGNoZWQgPSBbXVxuICAgIGZvciAodmFyIGtleSBpbiB2YWx1ZSkge1xuICAgICAgaWYgKHZhbHVlW2tleV0pIG1hdGNoZWQucHVzaChrZXkpXG4gICAgfVxuICAgIHZhbHVlID0gbWF0Y2hlZFxuICB9XG5cbiAgLy8gWydmb28nLCAnYmFyJywgJ2JheiddXG4gIGlmICh0eXBlKHZhbHVlKSA9PT0gJ2FycmF5Jykge1xuICAgIGlmICh2YWx1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVyblxuICAgIH1cbiAgICB2YWx1ZSA9IHZhbHVlLmpvaW4oJyAnKVxuICB9XG5cbiAgcmV0dXJuIHZhbHVlXG59XG4iLCIndXNlIHN0cmljdCdcblxuLyoqXG4gKiBFeHBvc2UgYGFycmF5RmxhdHRlbmAuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gYXJyYXlGbGF0dGVuXG5cbi8qKlxuICogUmVjdXJzaXZlIGZsYXR0ZW4gZnVuY3Rpb24gd2l0aCBkZXB0aC5cbiAqXG4gKiBAcGFyYW0gIHtBcnJheX0gIGFycmF5XG4gKiBAcGFyYW0gIHtBcnJheX0gIHJlc3VsdFxuICogQHBhcmFtICB7TnVtYmVyfSBkZXB0aFxuICogQHJldHVybiB7QXJyYXl9XG4gKi9cbmZ1bmN0aW9uIGZsYXR0ZW5XaXRoRGVwdGggKGFycmF5LCByZXN1bHQsIGRlcHRoKSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgdmFsdWUgPSBhcnJheVtpXVxuXG4gICAgaWYgKGRlcHRoID4gMCAmJiBBcnJheS5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgZmxhdHRlbldpdGhEZXB0aCh2YWx1ZSwgcmVzdWx0LCBkZXB0aCAtIDEpXG4gICAgfSBlbHNlIHtcbiAgICAgIHJlc3VsdC5wdXNoKHZhbHVlKVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXN1bHRcbn1cblxuLyoqXG4gKiBSZWN1cnNpdmUgZmxhdHRlbiBmdW5jdGlvbi4gT21pdHRpbmcgZGVwdGggaXMgc2xpZ2h0bHkgZmFzdGVyLlxuICpcbiAqIEBwYXJhbSAge0FycmF5fSBhcnJheVxuICogQHBhcmFtICB7QXJyYXl9IHJlc3VsdFxuICogQHJldHVybiB7QXJyYXl9XG4gKi9cbmZ1bmN0aW9uIGZsYXR0ZW5Gb3JldmVyIChhcnJheSwgcmVzdWx0KSB7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcbiAgICB2YXIgdmFsdWUgPSBhcnJheVtpXVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICBmbGF0dGVuRm9yZXZlcih2YWx1ZSwgcmVzdWx0KVxuICAgIH0gZWxzZSB7XG4gICAgICByZXN1bHQucHVzaCh2YWx1ZSlcbiAgICB9XG4gIH1cblxuICByZXR1cm4gcmVzdWx0XG59XG5cbi8qKlxuICogRmxhdHRlbiBhbiBhcnJheSwgd2l0aCB0aGUgYWJpbGl0eSB0byBkZWZpbmUgYSBkZXB0aC5cbiAqXG4gKiBAcGFyYW0gIHtBcnJheX0gIGFycmF5XG4gKiBAcGFyYW0gIHtOdW1iZXJ9IGRlcHRoXG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqL1xuZnVuY3Rpb24gYXJyYXlGbGF0dGVuIChhcnJheSwgZGVwdGgpIHtcbiAgaWYgKGRlcHRoID09IG51bGwpIHtcbiAgICByZXR1cm4gZmxhdHRlbkZvcmV2ZXIoYXJyYXksIFtdKVxuICB9XG5cbiAgcmV0dXJuIGZsYXR0ZW5XaXRoRGVwdGgoYXJyYXksIFtdLCBkZXB0aClcbn1cbiIsIlxuLyoqXG4gKiBFeHBvc2UgYEVtaXR0ZXJgLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gRW1pdHRlcjtcblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBFbWl0dGVyYC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIEVtaXR0ZXIob2JqKSB7XG4gIGlmIChvYmopIHJldHVybiBtaXhpbihvYmopO1xufTtcblxuLyoqXG4gKiBNaXhpbiB0aGUgZW1pdHRlciBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIG1peGluKG9iaikge1xuICBmb3IgKHZhciBrZXkgaW4gRW1pdHRlci5wcm90b3R5cGUpIHtcbiAgICBvYmpba2V5XSA9IEVtaXR0ZXIucHJvdG90eXBlW2tleV07XG4gIH1cbiAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBMaXN0ZW4gb24gdGhlIGdpdmVuIGBldmVudGAgd2l0aCBgZm5gLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLm9uID1cbkVtaXR0ZXIucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG4gICh0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdID0gdGhpcy5fY2FsbGJhY2tzWyckJyArIGV2ZW50XSB8fCBbXSlcbiAgICAucHVzaChmbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBBZGRzIGFuIGBldmVudGAgbGlzdGVuZXIgdGhhdCB3aWxsIGJlIGludm9rZWQgYSBzaW5nbGVcbiAqIHRpbWUgdGhlbiBhdXRvbWF0aWNhbGx5IHJlbW92ZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKGV2ZW50LCBmbil7XG4gIGZ1bmN0aW9uIG9uKCkge1xuICAgIHRoaXMub2ZmKGV2ZW50LCBvbik7XG4gICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIG9uLmZuID0gZm47XG4gIHRoaXMub24oZXZlbnQsIG9uKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgZm9yIGBldmVudGAgb3IgYWxsXG4gKiByZWdpc3RlcmVkIGNhbGxiYWNrcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vZmYgPVxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPVxuRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID1cbkVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG5cbiAgLy8gYWxsXG4gIGlmICgwID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICB0aGlzLl9jYWxsYmFja3MgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIHNwZWNpZmljIGV2ZW50XG4gIHZhciBjYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdO1xuICBpZiAoIWNhbGxiYWNrcykgcmV0dXJuIHRoaXM7XG5cbiAgLy8gcmVtb3ZlIGFsbCBoYW5kbGVyc1xuICBpZiAoMSA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgZGVsZXRlIHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyByZW1vdmUgc3BlY2lmaWMgaGFuZGxlclxuICB2YXIgY2I7XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgY2FsbGJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgY2IgPSBjYWxsYmFja3NbaV07XG4gICAgaWYgKGNiID09PSBmbiB8fCBjYi5mbiA9PT0gZm4pIHtcbiAgICAgIGNhbGxiYWNrcy5zcGxpY2UoaSwgMSk7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEVtaXQgYGV2ZW50YCB3aXRoIHRoZSBnaXZlbiBhcmdzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtNaXhlZH0gLi4uXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbihldmVudCl7XG4gIHRoaXMuX2NhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrcyB8fCB7fTtcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSlcbiAgICAsIGNhbGxiYWNrcyA9IHRoaXMuX2NhbGxiYWNrc1snJCcgKyBldmVudF07XG5cbiAgaWYgKGNhbGxiYWNrcykge1xuICAgIGNhbGxiYWNrcyA9IGNhbGxiYWNrcy5zbGljZSgwKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gY2FsbGJhY2tzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICBjYWxsYmFja3NbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybiBhcnJheSBvZiBjYWxsYmFja3MgZm9yIGBldmVudGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24oZXZlbnQpe1xuICB0aGlzLl9jYWxsYmFja3MgPSB0aGlzLl9jYWxsYmFja3MgfHwge307XG4gIHJldHVybiB0aGlzLl9jYWxsYmFja3NbJyQnICsgZXZlbnRdIHx8IFtdO1xufTtcblxuLyoqXG4gKiBDaGVjayBpZiB0aGlzIGVtaXR0ZXIgaGFzIGBldmVudGAgaGFuZGxlcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5oYXNMaXN0ZW5lcnMgPSBmdW5jdGlvbihldmVudCl7XG4gIHJldHVybiAhISB0aGlzLmxpc3RlbmVycyhldmVudCkubGVuZ3RoO1xufTtcbiIsIi8qKlxuICogRXhwb3NlIGByZXF1ZXN0QW5pbWF0aW9uRnJhbWUoKWAuXG4gKi9cblxuZXhwb3J0cyA9IG1vZHVsZS5leHBvcnRzID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lXG4gIHx8IHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWVcbiAgfHwgZmFsbGJhY2s7XG5cbi8qKlxuICogRmFsbGJhY2sgaW1wbGVtZW50YXRpb24uXG4gKi9cblxudmFyIHByZXYgPSBuZXcgRGF0ZSgpLmdldFRpbWUoKTtcbmZ1bmN0aW9uIGZhbGxiYWNrKGZuKSB7XG4gIHZhciBjdXJyID0gbmV3IERhdGUoKS5nZXRUaW1lKCk7XG4gIHZhciBtcyA9IE1hdGgubWF4KDAsIDE2IC0gKGN1cnIgLSBwcmV2KSk7XG4gIHZhciByZXEgPSBzZXRUaW1lb3V0KGZuLCBtcyk7XG4gIHByZXYgPSBjdXJyO1xuICByZXR1cm4gcmVxO1xufVxuXG4vKipcbiAqIENhbmNlbC5cbiAqL1xuXG52YXIgY2FuY2VsID0gd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lXG4gIHx8IHdpbmRvdy53ZWJraXRDYW5jZWxBbmltYXRpb25GcmFtZVxuICB8fCB3aW5kb3cubW96Q2FuY2VsQW5pbWF0aW9uRnJhbWVcbiAgfHwgd2luZG93LmNsZWFyVGltZW91dDtcblxuZXhwb3J0cy5jYW5jZWwgPSBmdW5jdGlvbihpZCl7XG4gIGNhbmNlbC5jYWxsKHdpbmRvdywgaWQpO1xufTtcbiIsIi8qKlxuICogdG9TdHJpbmcgcmVmLlxuICovXG5cbnZhciB0b1N0cmluZyA9IE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmc7XG5cbi8qKlxuICogUmV0dXJuIHRoZSB0eXBlIG9mIGB2YWxgLlxuICpcbiAqIEBwYXJhbSB7TWl4ZWR9IHZhbFxuICogQHJldHVybiB7U3RyaW5nfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKHZhbCl7XG4gIHN3aXRjaCAodG9TdHJpbmcuY2FsbCh2YWwpKSB7XG4gICAgY2FzZSAnW29iamVjdCBEYXRlXSc6IHJldHVybiAnZGF0ZSc7XG4gICAgY2FzZSAnW29iamVjdCBSZWdFeHBdJzogcmV0dXJuICdyZWdleHAnO1xuICAgIGNhc2UgJ1tvYmplY3QgQXJndW1lbnRzXSc6IHJldHVybiAnYXJndW1lbnRzJztcbiAgICBjYXNlICdbb2JqZWN0IEFycmF5XSc6IHJldHVybiAnYXJyYXknO1xuICAgIGNhc2UgJ1tvYmplY3QgRXJyb3JdJzogcmV0dXJuICdlcnJvcic7XG4gIH1cblxuICBpZiAodmFsID09PSBudWxsKSByZXR1cm4gJ251bGwnO1xuICBpZiAodmFsID09PSB1bmRlZmluZWQpIHJldHVybiAndW5kZWZpbmVkJztcbiAgaWYgKHZhbCAhPT0gdmFsKSByZXR1cm4gJ25hbic7XG4gIGlmICh2YWwgJiYgdmFsLm5vZGVUeXBlID09PSAxKSByZXR1cm4gJ2VsZW1lbnQnO1xuXG4gIHZhbCA9IHZhbC52YWx1ZU9mXG4gICAgPyB2YWwudmFsdWVPZigpXG4gICAgOiBPYmplY3QucHJvdG90eXBlLnZhbHVlT2YuYXBwbHkodmFsKVxuXG4gIHJldHVybiB0eXBlb2YgdmFsO1xufTtcbiIsImZ1bmN0aW9uIFBvb2wocGFyYW1zKSB7XHJcbiAgICBpZiAodHlwZW9mIHBhcmFtcyAhPT0gJ29iamVjdCcpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQbGVhc2UgcGFzcyBwYXJhbWV0ZXJzLiBFeGFtcGxlIC0+IG5ldyBQb29sKHsgdGFnTmFtZTogXFxcImRpdlxcXCIgfSlcIik7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHR5cGVvZiBwYXJhbXMudGFnTmFtZSAhPT0gJ3N0cmluZycpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJQbGVhc2Ugc3BlY2lmeSBhIHRhZ05hbWUuIEV4YW1wbGUgLT4gbmV3IFBvb2woeyB0YWdOYW1lOiBcXFwiZGl2XFxcIiB9KVwiKTtcclxuICAgIH1cclxuXHJcbiAgICB0aGlzLnN0b3JhZ2UgPSBbXTtcclxuICAgIHRoaXMudGFnTmFtZSA9IHBhcmFtcy50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XHJcbiAgICB0aGlzLm5hbWVzcGFjZSA9IHBhcmFtcy5uYW1lc3BhY2U7XHJcbn1cclxuXHJcblBvb2wucHJvdG90eXBlLnB1c2ggPSBmdW5jdGlvbihlbCkge1xyXG4gICAgaWYgKGVsLnRhZ05hbWUudG9Mb3dlckNhc2UoKSAhPT0gdGhpcy50YWdOYW1lKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICB0aGlzLnN0b3JhZ2UucHVzaChlbCk7XHJcbn07XHJcblxyXG5Qb29sLnByb3RvdHlwZS5wb3AgPSBmdW5jdGlvbihhcmd1bWVudCkge1xyXG4gICAgaWYgKHRoaXMuc3RvcmFnZS5sZW5ndGggPT09IDApIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5jcmVhdGUoKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RvcmFnZS5wb3AoKTtcclxuICAgIH1cclxufTtcclxuXHJcblBvb2wucHJvdG90eXBlLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xyXG4gICAgaWYgKHRoaXMubmFtZXNwYWNlKSB7XHJcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyh0aGlzLm5hbWVzcGFjZSwgdGhpcy50YWdOYW1lKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQodGhpcy50YWdOYW1lKTtcclxuICAgIH1cclxufTtcclxuXHJcblBvb2wucHJvdG90eXBlLmFsbG9jYXRlID0gZnVuY3Rpb24oc2l6ZSkge1xyXG4gICAgaWYgKHRoaXMuc3RvcmFnZS5sZW5ndGggPj0gc2l6ZSkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB2YXIgZGlmZmVyZW5jZSA9IHNpemUgLSB0aGlzLnN0b3JhZ2UubGVuZ3RoO1xyXG4gICAgZm9yICh2YXIgcG9vbEFsbG9jSXRlciA9IDA7IHBvb2xBbGxvY0l0ZXIgPCBkaWZmZXJlbmNlOyBwb29sQWxsb2NJdGVyKyspIHtcclxuICAgICAgICB0aGlzLnN0b3JhZ2UucHVzaCh0aGlzLmNyZWF0ZSgpKTtcclxuICAgIH1cclxufTtcclxuXHJcbmlmICh0eXBlb2YgbW9kdWxlICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgIT09ICd1bmRlZmluZWQnKSB7XHJcbiAgICBtb2R1bGUuZXhwb3J0cyA9IFBvb2w7XHJcbn1cclxuIiwidmFyIHNsaWNlID0gQXJyYXkucHJvdG90eXBlLnNsaWNlXG5cbm1vZHVsZS5leHBvcnRzID0gaXRlcmF0aXZlbHlXYWxrXG5cbmZ1bmN0aW9uIGl0ZXJhdGl2ZWx5V2Fsayhub2RlcywgY2IpIHtcbiAgICBpZiAoISgnbGVuZ3RoJyBpbiBub2RlcykpIHtcbiAgICAgICAgbm9kZXMgPSBbbm9kZXNdXG4gICAgfVxuICAgIFxuICAgIG5vZGVzID0gc2xpY2UuY2FsbChub2RlcylcblxuICAgIHdoaWxlKG5vZGVzLmxlbmd0aCkge1xuICAgICAgICB2YXIgbm9kZSA9IG5vZGVzLnNoaWZ0KCksXG4gICAgICAgICAgICByZXQgPSBjYihub2RlKVxuXG4gICAgICAgIGlmIChyZXQpIHtcbiAgICAgICAgICAgIHJldHVybiByZXRcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChub2RlLmNoaWxkTm9kZXMgJiYgbm9kZS5jaGlsZE5vZGVzLmxlbmd0aCkge1xuICAgICAgICAgICAgbm9kZXMgPSBzbGljZS5jYWxsKG5vZGUuY2hpbGROb2RlcykuY29uY2F0KG5vZGVzKVxuICAgICAgICB9XG4gICAgfVxufVxuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYmluZEludGVybmFsMyA9IHJlcXVpcmUoJy4uL2Z1bmN0aW9uL2JpbmRJbnRlcm5hbDMnKTtcblxuLyoqXG4gKiAjIEZvciBFYWNoXG4gKlxuICogQSBmYXN0IGAuZm9yRWFjaCgpYCBpbXBsZW1lbnRhdGlvbi5cbiAqXG4gKiBAcGFyYW0gIHtBcnJheX0gICAgc3ViamVjdCAgICAgVGhlIGFycmF5IChvciBhcnJheS1saWtlKSB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm4gICAgICAgICAgVGhlIHZpc2l0b3IgZnVuY3Rpb24uXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgdGhpc0NvbnRleHQgVGhlIGNvbnRleHQgZm9yIHRoZSB2aXNpdG9yLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZhc3RGb3JFYWNoIChzdWJqZWN0LCBmbiwgdGhpc0NvbnRleHQpIHtcbiAgdmFyIGxlbmd0aCA9IHN1YmplY3QubGVuZ3RoLFxuICAgICAgaXRlcmF0b3IgPSB0aGlzQ29udGV4dCAhPT0gdW5kZWZpbmVkID8gYmluZEludGVybmFsMyhmbiwgdGhpc0NvbnRleHQpIDogZm4sXG4gICAgICBpO1xuICBmb3IgKGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpdGVyYXRvcihzdWJqZWN0W2ldLCBpLCBzdWJqZWN0KTtcbiAgfVxufTtcbiIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiAjIEluZGV4IE9mXG4gKlxuICogQSBmYXN0ZXIgYEFycmF5LnByb3RvdHlwZS5pbmRleE9mKClgIGltcGxlbWVudGF0aW9uLlxuICpcbiAqIEBwYXJhbSAge0FycmF5fSAgc3ViamVjdCAgIFRoZSBhcnJheSAob3IgYXJyYXktbGlrZSkgdG8gc2VhcmNoIHdpdGhpbi5cbiAqIEBwYXJhbSAge21peGVkfSAgdGFyZ2V0ICAgIFRoZSB0YXJnZXQgaXRlbSB0byBzZWFyY2ggZm9yLlxuICogQHBhcmFtICB7TnVtYmVyfSBmcm9tSW5kZXggVGhlIHBvc2l0aW9uIHRvIHN0YXJ0IHNlYXJjaGluZyBmcm9tLCBpZiBrbm93bi5cbiAqIEByZXR1cm4ge051bWJlcn0gICAgICAgICAgIFRoZSBwb3NpdGlvbiBvZiB0aGUgdGFyZ2V0IGluIHRoZSBzdWJqZWN0LCBvciAtMSBpZiBpdCBkb2VzIG5vdCBleGlzdC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBmYXN0SW5kZXhPZiAoc3ViamVjdCwgdGFyZ2V0LCBmcm9tSW5kZXgpIHtcbiAgdmFyIGxlbmd0aCA9IHN1YmplY3QubGVuZ3RoLFxuICAgICAgaSA9IDA7XG5cbiAgaWYgKHR5cGVvZiBmcm9tSW5kZXggPT09ICdudW1iZXInKSB7XG4gICAgaSA9IGZyb21JbmRleDtcbiAgICBpZiAoaSA8IDApIHtcbiAgICAgIGkgKz0gbGVuZ3RoO1xuICAgICAgaWYgKGkgPCAwKSB7XG4gICAgICAgIGkgPSAwO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZvciAoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBpZiAoc3ViamVjdFtpXSA9PT0gdGFyZ2V0KSB7XG4gICAgICByZXR1cm4gaTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIC0xO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGJpbmRJbnRlcm5hbDQgPSByZXF1aXJlKCcuLi9mdW5jdGlvbi9iaW5kSW50ZXJuYWw0Jyk7XG5cbi8qKlxuICogIyBSZWR1Y2VcbiAqXG4gKiBBIGZhc3QgYC5yZWR1Y2UoKWAgaW1wbGVtZW50YXRpb24uXG4gKlxuICogQHBhcmFtICB7QXJyYXl9ICAgIHN1YmplY3QgICAgICBUaGUgYXJyYXkgKG9yIGFycmF5LWxpa2UpIHRvIHJlZHVjZS5cbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSBmbiAgICAgICAgICAgVGhlIHJlZHVjZXIgZnVuY3Rpb24uXG4gKiBAcGFyYW0gIHttaXhlZH0gICAgaW5pdGlhbFZhbHVlIFRoZSBpbml0aWFsIHZhbHVlIGZvciB0aGUgcmVkdWNlciwgZGVmYXVsdHMgdG8gc3ViamVjdFswXS5cbiAqIEBwYXJhbSAge09iamVjdH0gICB0aGlzQ29udGV4dCAgVGhlIGNvbnRleHQgZm9yIHRoZSByZWR1Y2VyLlxuICogQHJldHVybiB7bWl4ZWR9ICAgICAgICAgICAgICAgICBUaGUgZmluYWwgcmVzdWx0LlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZhc3RSZWR1Y2UgKHN1YmplY3QsIGZuLCBpbml0aWFsVmFsdWUsIHRoaXNDb250ZXh0KSB7XG4gIHZhciBsZW5ndGggPSBzdWJqZWN0Lmxlbmd0aCxcbiAgICAgIGl0ZXJhdG9yID0gdGhpc0NvbnRleHQgIT09IHVuZGVmaW5lZCA/IGJpbmRJbnRlcm5hbDQoZm4sIHRoaXNDb250ZXh0KSA6IGZuLFxuICAgICAgaSwgcmVzdWx0O1xuXG4gIGlmIChpbml0aWFsVmFsdWUgPT09IHVuZGVmaW5lZCkge1xuICAgIGkgPSAxO1xuICAgIHJlc3VsdCA9IHN1YmplY3RbMF07XG4gIH1cbiAgZWxzZSB7XG4gICAgaSA9IDA7XG4gICAgcmVzdWx0ID0gaW5pdGlhbFZhbHVlO1xuICB9XG5cbiAgZm9yICg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIHJlc3VsdCA9IGl0ZXJhdG9yKHJlc3VsdCwgc3ViamVjdFtpXSwgaSwgc3ViamVjdCk7XG4gIH1cblxuICByZXR1cm4gcmVzdWx0O1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIGZvckVhY2hBcnJheSA9IHJlcXVpcmUoJy4vYXJyYXkvZm9yRWFjaCcpLFxuICAgIGZvckVhY2hPYmplY3QgPSByZXF1aXJlKCcuL29iamVjdC9mb3JFYWNoJyk7XG5cbi8qKlxuICogIyBGb3JFYWNoXG4gKlxuICogQSBmYXN0IGAuZm9yRWFjaCgpYCBpbXBsZW1lbnRhdGlvbi5cbiAqXG4gKiBAcGFyYW0gIHtBcnJheXxPYmplY3R9IHN1YmplY3QgICAgIFRoZSBhcnJheSBvciBvYmplY3QgdG8gaXRlcmF0ZSBvdmVyLlxuICogQHBhcmFtICB7RnVuY3Rpb259ICAgICBmbiAgICAgICAgICBUaGUgdmlzaXRvciBmdW5jdGlvbi5cbiAqIEBwYXJhbSAge09iamVjdH0gICAgICAgdGhpc0NvbnRleHQgVGhlIGNvbnRleHQgZm9yIHRoZSB2aXNpdG9yLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZhc3RGb3JFYWNoIChzdWJqZWN0LCBmbiwgdGhpc0NvbnRleHQpIHtcbiAgaWYgKHN1YmplY3QgaW5zdGFuY2VvZiBBcnJheSkge1xuICAgIHJldHVybiBmb3JFYWNoQXJyYXkoc3ViamVjdCwgZm4sIHRoaXNDb250ZXh0KTtcbiAgfVxuICBlbHNlIHtcbiAgICByZXR1cm4gZm9yRWFjaE9iamVjdChzdWJqZWN0LCBmbiwgdGhpc0NvbnRleHQpO1xuICB9XG59OyIsIid1c2Ugc3RyaWN0JztcblxuLyoqXG4gKiBJbnRlcm5hbCBoZWxwZXIgdG8gYmluZCBhIGZ1bmN0aW9uIGtub3duIHRvIGhhdmUgMyBhcmd1bWVudHNcbiAqIHRvIGEgZ2l2ZW4gY29udGV4dC5cbiAqL1xubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBiaW5kSW50ZXJuYWwzIChmdW5jLCB0aGlzQ29udGV4dCkge1xuICByZXR1cm4gZnVuY3Rpb24gKGEsIGIsIGMpIHtcbiAgICByZXR1cm4gZnVuYy5jYWxsKHRoaXNDb250ZXh0LCBhLCBiLCBjKTtcbiAgfTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogSW50ZXJuYWwgaGVscGVyIHRvIGJpbmQgYSBmdW5jdGlvbiBrbm93biB0byBoYXZlIDQgYXJndW1lbnRzXG4gKiB0byBhIGdpdmVuIGNvbnRleHQuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gYmluZEludGVybmFsNCAoZnVuYywgdGhpc0NvbnRleHQpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uIChhLCBiLCBjLCBkKSB7XG4gICAgcmV0dXJuIGZ1bmMuY2FsbCh0aGlzQ29udGV4dCwgYSwgYiwgYywgZCk7XG4gIH07XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEFuYWxvZ3VlIG9mIE9iamVjdC5hc3NpZ24oKS5cbiAqIENvcGllcyBwcm9wZXJ0aWVzIGZyb20gb25lIG9yIG1vcmUgc291cmNlIG9iamVjdHMgdG9cbiAqIGEgdGFyZ2V0IG9iamVjdC4gRXhpc3Rpbmcga2V5cyBvbiB0aGUgdGFyZ2V0IG9iamVjdCB3aWxsIGJlIG92ZXJ3cml0dGVuLlxuICpcbiAqID4gTm90ZTogVGhpcyBkaWZmZXJzIGZyb20gc3BlYyBpbiBzb21lIGltcG9ydGFudCB3YXlzOlxuICogPiAxLiBXaWxsIHRocm93IGlmIHBhc3NlZCBub24tb2JqZWN0cywgaW5jbHVkaW5nIGB1bmRlZmluZWRgIG9yIGBudWxsYCB2YWx1ZXMuXG4gKiA+IDIuIERvZXMgbm90IHN1cHBvcnQgdGhlIGN1cmlvdXMgRXhjZXB0aW9uIGhhbmRsaW5nIGJlaGF2aW9yLCBleGNlcHRpb25zIGFyZSB0aHJvd24gaW1tZWRpYXRlbHkuXG4gKiA+IEZvciBtb3JlIGRldGFpbHMsIHNlZTpcbiAqID4gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvSmF2YVNjcmlwdC9SZWZlcmVuY2UvR2xvYmFsX09iamVjdHMvT2JqZWN0L2Fzc2lnblxuICpcbiAqXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSB0YXJnZXQgICAgICBUaGUgdGFyZ2V0IG9iamVjdCB0byBjb3B5IHByb3BlcnRpZXMgdG8uXG4gKiBAcGFyYW0gIHtPYmplY3R9IHNvdXJjZSwgLi4uIFRoZSBzb3VyY2UocykgdG8gY29weSBwcm9wZXJ0aWVzIGZyb20uXG4gKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICAgICAgIFRoZSB1cGRhdGVkIHRhcmdldCBvYmplY3QuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZmFzdEFzc2lnbiAodGFyZ2V0KSB7XG4gIHZhciB0b3RhbEFyZ3MgPSBhcmd1bWVudHMubGVuZ3RoLFxuICAgICAgc291cmNlLCBpLCB0b3RhbEtleXMsIGtleXMsIGtleSwgajtcblxuICBmb3IgKGkgPSAxOyBpIDwgdG90YWxBcmdzOyBpKyspIHtcbiAgICBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG4gICAga2V5cyA9IE9iamVjdC5rZXlzKHNvdXJjZSk7XG4gICAgdG90YWxLZXlzID0ga2V5cy5sZW5ndGg7XG4gICAgZm9yIChqID0gMDsgaiA8IHRvdGFsS2V5czsgaisrKSB7XG4gICAgICBrZXkgPSBrZXlzW2pdO1xuICAgICAgdGFyZ2V0W2tleV0gPSBzb3VyY2Vba2V5XTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHRhcmdldDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBiaW5kSW50ZXJuYWwzID0gcmVxdWlyZSgnLi4vZnVuY3Rpb24vYmluZEludGVybmFsMycpO1xuXG4vKipcbiAqICMgRm9yIEVhY2hcbiAqXG4gKiBBIGZhc3Qgb2JqZWN0IGAuZm9yRWFjaCgpYCBpbXBsZW1lbnRhdGlvbi5cbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgc3ViamVjdCAgICAgVGhlIG9iamVjdCB0byBpdGVyYXRlIG92ZXIuXG4gKiBAcGFyYW0gIHtGdW5jdGlvbn0gZm4gICAgICAgICAgVGhlIHZpc2l0b3IgZnVuY3Rpb24uXG4gKiBAcGFyYW0gIHtPYmplY3R9ICAgdGhpc0NvbnRleHQgVGhlIGNvbnRleHQgZm9yIHRoZSB2aXNpdG9yLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZhc3RGb3JFYWNoT2JqZWN0IChzdWJqZWN0LCBmbiwgdGhpc0NvbnRleHQpIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhzdWJqZWN0KSxcbiAgICAgIGxlbmd0aCA9IGtleXMubGVuZ3RoLFxuICAgICAgaXRlcmF0b3IgPSB0aGlzQ29udGV4dCAhPT0gdW5kZWZpbmVkID8gYmluZEludGVybmFsMyhmbiwgdGhpc0NvbnRleHQpIDogZm4sXG4gICAgICBrZXksIGk7XG4gIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgIGtleSA9IGtleXNbaV07XG4gICAgaXRlcmF0b3Ioc3ViamVjdFtrZXldLCBrZXksIHN1YmplY3QpO1xuICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgYmluZEludGVybmFsNCA9IHJlcXVpcmUoJy4uL2Z1bmN0aW9uL2JpbmRJbnRlcm5hbDQnKTtcblxuLyoqXG4gKiAjIFJlZHVjZVxuICpcbiAqIEEgZmFzdCBvYmplY3QgYC5yZWR1Y2UoKWAgaW1wbGVtZW50YXRpb24uXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSAgIHN1YmplY3QgICAgICBUaGUgb2JqZWN0IHRvIHJlZHVjZSBvdmVyLlxuICogQHBhcmFtICB7RnVuY3Rpb259IGZuICAgICAgICAgICBUaGUgcmVkdWNlciBmdW5jdGlvbi5cbiAqIEBwYXJhbSAge21peGVkfSAgICBpbml0aWFsVmFsdWUgVGhlIGluaXRpYWwgdmFsdWUgZm9yIHRoZSByZWR1Y2VyLCBkZWZhdWx0cyB0byBzdWJqZWN0WzBdLlxuICogQHBhcmFtICB7T2JqZWN0fSAgIHRoaXNDb250ZXh0ICBUaGUgY29udGV4dCBmb3IgdGhlIHJlZHVjZXIuXG4gKiBAcmV0dXJuIHttaXhlZH0gICAgICAgICAgICAgICAgIFRoZSBmaW5hbCByZXN1bHQuXG4gKi9cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZmFzdFJlZHVjZU9iamVjdCAoc3ViamVjdCwgZm4sIGluaXRpYWxWYWx1ZSwgdGhpc0NvbnRleHQpIHtcbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhzdWJqZWN0KSxcbiAgICAgIGxlbmd0aCA9IGtleXMubGVuZ3RoLFxuICAgICAgaXRlcmF0b3IgPSB0aGlzQ29udGV4dCAhPT0gdW5kZWZpbmVkID8gYmluZEludGVybmFsNChmbiwgdGhpc0NvbnRleHQpIDogZm4sXG4gICAgICBpLCBrZXksIHJlc3VsdDtcblxuICBpZiAoaW5pdGlhbFZhbHVlID09PSB1bmRlZmluZWQpIHtcbiAgICBpID0gMTtcbiAgICByZXN1bHQgPSBzdWJqZWN0W2tleXNbMF1dO1xuICB9XG4gIGVsc2Uge1xuICAgIGkgPSAwO1xuICAgIHJlc3VsdCA9IGluaXRpYWxWYWx1ZTtcbiAgfVxuXG4gIGZvciAoOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICBrZXkgPSBrZXlzW2ldO1xuICAgIHJlc3VsdCA9IGl0ZXJhdG9yKHJlc3VsdCwgc3ViamVjdFtrZXldLCBrZXksIHN1YmplY3QpO1xuICB9XG5cbiAgcmV0dXJuIHJlc3VsdDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciByZWR1Y2VBcnJheSA9IHJlcXVpcmUoJy4vYXJyYXkvcmVkdWNlJyksXG4gICAgcmVkdWNlT2JqZWN0ID0gcmVxdWlyZSgnLi9vYmplY3QvcmVkdWNlJyk7XG5cbi8qKlxuICogIyBSZWR1Y2VcbiAqXG4gKiBBIGZhc3QgYC5yZWR1Y2UoKWAgaW1wbGVtZW50YXRpb24uXG4gKlxuICogQHBhcmFtICB7QXJyYXl8T2JqZWN0fSBzdWJqZWN0ICAgICAgVGhlIGFycmF5IG9yIG9iamVjdCB0byByZWR1Y2Ugb3Zlci5cbiAqIEBwYXJhbSAge0Z1bmN0aW9ufSAgICAgZm4gICAgICAgICAgIFRoZSByZWR1Y2VyIGZ1bmN0aW9uLlxuICogQHBhcmFtICB7bWl4ZWR9ICAgICAgICBpbml0aWFsVmFsdWUgVGhlIGluaXRpYWwgdmFsdWUgZm9yIHRoZSByZWR1Y2VyLCBkZWZhdWx0cyB0byBzdWJqZWN0WzBdLlxuICogQHBhcmFtICB7T2JqZWN0fSAgICAgICB0aGlzQ29udGV4dCAgVGhlIGNvbnRleHQgZm9yIHRoZSByZWR1Y2VyLlxuICogQHJldHVybiB7QXJyYXl8T2JqZWN0fSAgICAgICAgICAgICAgVGhlIGFycmF5IG9yIG9iamVjdCBjb250YWluaW5nIHRoZSByZXN1bHRzLlxuICovXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIGZhc3RSZWR1Y2UgKHN1YmplY3QsIGZuLCBpbml0aWFsVmFsdWUsIHRoaXNDb250ZXh0KSB7XG4gIGlmIChzdWJqZWN0IGluc3RhbmNlb2YgQXJyYXkpIHtcbiAgICByZXR1cm4gcmVkdWNlQXJyYXkoc3ViamVjdCwgZm4sIGluaXRpYWxWYWx1ZSwgdGhpc0NvbnRleHQpO1xuICB9XG4gIGVsc2Uge1xuICAgIHJldHVybiByZWR1Y2VPYmplY3Qoc3ViamVjdCwgZm4sIGluaXRpYWxWYWx1ZSwgdGhpc0NvbnRleHQpO1xuICB9XG59OyIsIi8qKiBnZW5lcmF0ZSB1bmlxdWUgaWQgZm9yIHNlbGVjdG9yICovXHJcbnZhciBjb3VudGVyID0gRGF0ZS5ub3coKSAlIDFlOTtcclxuXHJcbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gZ2V0VWlkKCl7XHJcblx0cmV0dXJuIChNYXRoLnJhbmRvbSgpICogMWU5ID4+PiAwKSArIChjb3VudGVyKyspO1xyXG59OyIsIi8qZ2xvYmFsIHdpbmRvdyovXG5cbi8qKlxuICogQ2hlY2sgaWYgb2JqZWN0IGlzIGRvbSBub2RlLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSB2YWxcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaXNOb2RlKHZhbCl7XG4gIGlmICghdmFsIHx8IHR5cGVvZiB2YWwgIT09ICdvYmplY3QnKSByZXR1cm4gZmFsc2U7XG4gIGlmICh3aW5kb3cgJiYgJ29iamVjdCcgPT0gdHlwZW9mIHdpbmRvdy5Ob2RlKSByZXR1cm4gdmFsIGluc3RhbmNlb2Ygd2luZG93Lk5vZGU7XG4gIHJldHVybiAnbnVtYmVyJyA9PSB0eXBlb2YgdmFsLm5vZGVUeXBlICYmICdzdHJpbmcnID09IHR5cGVvZiB2YWwubm9kZU5hbWU7XG59XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGlzUHJvbWlzZTtcblxuZnVuY3Rpb24gaXNQcm9taXNlKG9iaikge1xuICByZXR1cm4gb2JqICYmICh0eXBlb2Ygb2JqID09PSAnb2JqZWN0JyB8fCB0eXBlb2Ygb2JqID09PSAnZnVuY3Rpb24nKSAmJiB0eXBlb2Ygb2JqLnRoZW4gPT09ICdmdW5jdGlvbic7XG59XG4iLCIoZnVuY3Rpb24gKHJvb3QsIGZhY3Rvcnkpe1xuICAndXNlIHN0cmljdCc7XG5cbiAgLyppc3RhbmJ1bCBpZ25vcmUgbmV4dDpjYW50IHRlc3QqL1xuICBpZiAodHlwZW9mIG1vZHVsZSA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG1vZHVsZS5leHBvcnRzID09PSAnb2JqZWN0Jykge1xuICAgIG1vZHVsZS5leHBvcnRzID0gZmFjdG9yeSgpO1xuICB9IGVsc2UgaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIC8vIEFNRC4gUmVnaXN0ZXIgYXMgYW4gYW5vbnltb3VzIG1vZHVsZS5cbiAgICBkZWZpbmUoW10sIGZhY3RvcnkpO1xuICB9IGVsc2Uge1xuICAgIC8vIEJyb3dzZXIgZ2xvYmFsc1xuICAgIHJvb3Qub2JqZWN0UGF0aCA9IGZhY3RvcnkoKTtcbiAgfVxufSkodGhpcywgZnVuY3Rpb24oKXtcbiAgJ3VzZSBzdHJpY3QnO1xuXG4gIHZhclxuICAgIHRvU3RyID0gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZyxcbiAgICBfaGFzT3duUHJvcGVydHkgPSBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5O1xuXG4gIGZ1bmN0aW9uIGlzRW1wdHkodmFsdWUpe1xuICAgIGlmICghdmFsdWUpIHtcbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cbiAgICBpZiAoaXNBcnJheSh2YWx1ZSkgJiYgdmFsdWUubGVuZ3RoID09PSAwKSB7XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgZm9yICh2YXIgaSBpbiB2YWx1ZSkge1xuICAgICAgICBpZiAoX2hhc093blByb3BlcnR5LmNhbGwodmFsdWUsIGkpKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiB0b1N0cmluZyh0eXBlKXtcbiAgICByZXR1cm4gdG9TdHIuY2FsbCh0eXBlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzTnVtYmVyKHZhbHVlKXtcbiAgICByZXR1cm4gdHlwZW9mIHZhbHVlID09PSAnbnVtYmVyJyB8fCB0b1N0cmluZyh2YWx1ZSkgPT09IFwiW29iamVjdCBOdW1iZXJdXCI7XG4gIH1cblxuICBmdW5jdGlvbiBpc1N0cmluZyhvYmope1xuICAgIHJldHVybiB0eXBlb2Ygb2JqID09PSAnc3RyaW5nJyB8fCB0b1N0cmluZyhvYmopID09PSBcIltvYmplY3QgU3RyaW5nXVwiO1xuICB9XG5cbiAgZnVuY3Rpb24gaXNPYmplY3Qob2JqKXtcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdG9TdHJpbmcob2JqKSA9PT0gXCJbb2JqZWN0IE9iamVjdF1cIjtcbiAgfVxuXG4gIGZ1bmN0aW9uIGlzQXJyYXkob2JqKXtcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ29iamVjdCcgJiYgdHlwZW9mIG9iai5sZW5ndGggPT09ICdudW1iZXInICYmIHRvU3RyaW5nKG9iaikgPT09ICdbb2JqZWN0IEFycmF5XSc7XG4gIH1cblxuICBmdW5jdGlvbiBpc0Jvb2xlYW4ob2JqKXtcbiAgICByZXR1cm4gdHlwZW9mIG9iaiA9PT0gJ2Jvb2xlYW4nIHx8IHRvU3RyaW5nKG9iaikgPT09ICdbb2JqZWN0IEJvb2xlYW5dJztcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEtleShrZXkpe1xuICAgIHZhciBpbnRLZXkgPSBwYXJzZUludChrZXkpO1xuICAgIGlmIChpbnRLZXkudG9TdHJpbmcoKSA9PT0ga2V5KSB7XG4gICAgICByZXR1cm4gaW50S2V5O1xuICAgIH1cbiAgICByZXR1cm4ga2V5O1xuICB9XG5cbiAgZnVuY3Rpb24gc2V0KG9iaiwgcGF0aCwgdmFsdWUsIGRvTm90UmVwbGFjZSl7XG4gICAgaWYgKGlzTnVtYmVyKHBhdGgpKSB7XG4gICAgICBwYXRoID0gW3BhdGhdO1xuICAgIH1cbiAgICBpZiAoaXNFbXB0eShwYXRoKSkge1xuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG4gICAgaWYgKGlzU3RyaW5nKHBhdGgpKSB7XG4gICAgICByZXR1cm4gc2V0KG9iaiwgcGF0aC5zcGxpdCgnLicpLm1hcChnZXRLZXkpLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgICB9XG4gICAgdmFyIGN1cnJlbnRQYXRoID0gcGF0aFswXTtcblxuICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMSkge1xuICAgICAgdmFyIG9sZFZhbCA9IG9ialtjdXJyZW50UGF0aF07XG4gICAgICBpZiAob2xkVmFsID09PSB2b2lkIDAgfHwgIWRvTm90UmVwbGFjZSkge1xuICAgICAgICBvYmpbY3VycmVudFBhdGhdID0gdmFsdWU7XG4gICAgICB9XG4gICAgICByZXR1cm4gb2xkVmFsO1xuICAgIH1cblxuICAgIGlmIChvYmpbY3VycmVudFBhdGhdID09PSB2b2lkIDApIHtcbiAgICAgIC8vY2hlY2sgaWYgd2UgYXNzdW1lIGFuIGFycmF5XG4gICAgICBpZihpc051bWJlcihwYXRoWzFdKSkge1xuICAgICAgICBvYmpbY3VycmVudFBhdGhdID0gW107XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBvYmpbY3VycmVudFBhdGhdID0ge307XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHNldChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGRlbChvYmosIHBhdGgpIHtcbiAgICBpZiAoaXNOdW1iZXIocGF0aCkpIHtcbiAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgfVxuXG4gICAgaWYgKGlzRW1wdHkob2JqKSkge1xuICAgICAgcmV0dXJuIHZvaWQgMDtcbiAgICB9XG5cbiAgICBpZiAoaXNFbXB0eShwYXRoKSkge1xuICAgICAgcmV0dXJuIG9iajtcbiAgICB9XG4gICAgaWYoaXNTdHJpbmcocGF0aCkpIHtcbiAgICAgIHJldHVybiBkZWwob2JqLCBwYXRoLnNwbGl0KCcuJykpO1xuICAgIH1cblxuICAgIHZhciBjdXJyZW50UGF0aCA9IGdldEtleShwYXRoWzBdKTtcbiAgICB2YXIgb2xkVmFsID0gb2JqW2N1cnJlbnRQYXRoXTtcblxuICAgIGlmKHBhdGgubGVuZ3RoID09PSAxKSB7XG4gICAgICBpZiAob2xkVmFsICE9PSB2b2lkIDApIHtcbiAgICAgICAgaWYgKGlzQXJyYXkob2JqKSkge1xuICAgICAgICAgIG9iai5zcGxpY2UoY3VycmVudFBhdGgsIDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlbGV0ZSBvYmpbY3VycmVudFBhdGhdO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIGlmIChvYmpbY3VycmVudFBhdGhdICE9PSB2b2lkIDApIHtcbiAgICAgICAgcmV0dXJuIGRlbChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gb2JqO1xuICB9XG5cbiAgdmFyIG9iamVjdFBhdGggPSB7fTtcblxuICBvYmplY3RQYXRoLmhhcyA9IGZ1bmN0aW9uIChvYmosIHBhdGgpIHtcbiAgICBpZiAoaXNFbXB0eShvYmopKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuXG4gICAgaWYgKGlzTnVtYmVyKHBhdGgpKSB7XG4gICAgICBwYXRoID0gW3BhdGhdO1xuICAgIH0gZWxzZSBpZiAoaXNTdHJpbmcocGF0aCkpIHtcbiAgICAgIHBhdGggPSBwYXRoLnNwbGl0KCcuJyk7XG4gICAgfVxuXG4gICAgaWYgKGlzRW1wdHkocGF0aCkgfHwgcGF0aC5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhdGgubGVuZ3RoOyBpKyspIHtcbiAgICAgIHZhciBqID0gcGF0aFtpXTtcbiAgICAgIGlmICgoaXNPYmplY3Qob2JqKSB8fCBpc0FycmF5KG9iaikpICYmIF9oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgaikpIHtcbiAgICAgICAgb2JqID0gb2JqW2pdO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9O1xuXG4gIG9iamVjdFBhdGguZW5zdXJlRXhpc3RzID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgdmFsdWUpe1xuICAgIHJldHVybiBzZXQob2JqLCBwYXRoLCB2YWx1ZSwgdHJ1ZSk7XG4gIH07XG5cbiAgb2JqZWN0UGF0aC5zZXQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgZG9Ob3RSZXBsYWNlKXtcbiAgICByZXR1cm4gc2V0KG9iaiwgcGF0aCwgdmFsdWUsIGRvTm90UmVwbGFjZSk7XG4gIH07XG5cbiAgb2JqZWN0UGF0aC5pbnNlcnQgPSBmdW5jdGlvbiAob2JqLCBwYXRoLCB2YWx1ZSwgYXQpe1xuICAgIHZhciBhcnIgPSBvYmplY3RQYXRoLmdldChvYmosIHBhdGgpO1xuICAgIGF0ID0gfn5hdDtcbiAgICBpZiAoIWlzQXJyYXkoYXJyKSkge1xuICAgICAgYXJyID0gW107XG4gICAgICBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGFycik7XG4gICAgfVxuICAgIGFyci5zcGxpY2UoYXQsIDAsIHZhbHVlKTtcbiAgfTtcblxuICBvYmplY3RQYXRoLmVtcHR5ID0gZnVuY3Rpb24ob2JqLCBwYXRoKSB7XG4gICAgaWYgKGlzRW1wdHkocGF0aCkpIHtcbiAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuICAgIGlmIChpc0VtcHR5KG9iaikpIHtcbiAgICAgIHJldHVybiB2b2lkIDA7XG4gICAgfVxuXG4gICAgdmFyIHZhbHVlLCBpO1xuICAgIGlmICghKHZhbHVlID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKSkpIHtcbiAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuXG4gICAgaWYgKGlzU3RyaW5nKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgJycpO1xuICAgIH0gZWxzZSBpZiAoaXNCb29sZWFuKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIG9iamVjdFBhdGguc2V0KG9iaiwgcGF0aCwgZmFsc2UpO1xuICAgIH0gZWxzZSBpZiAoaXNOdW1iZXIodmFsdWUpKSB7XG4gICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCAwKTtcbiAgICB9IGVsc2UgaWYgKGlzQXJyYXkodmFsdWUpKSB7XG4gICAgICB2YWx1ZS5sZW5ndGggPSAwO1xuICAgIH0gZWxzZSBpZiAoaXNPYmplY3QodmFsdWUpKSB7XG4gICAgICBmb3IgKGkgaW4gdmFsdWUpIHtcbiAgICAgICAgaWYgKF9oYXNPd25Qcm9wZXJ0eS5jYWxsKHZhbHVlLCBpKSkge1xuICAgICAgICAgIGRlbGV0ZSB2YWx1ZVtpXTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gb2JqZWN0UGF0aC5zZXQob2JqLCBwYXRoLCBudWxsKTtcbiAgICB9XG4gIH07XG5cbiAgb2JqZWN0UGF0aC5wdXNoID0gZnVuY3Rpb24gKG9iaiwgcGF0aCAvKiwgdmFsdWVzICovKXtcbiAgICB2YXIgYXJyID0gb2JqZWN0UGF0aC5nZXQob2JqLCBwYXRoKTtcbiAgICBpZiAoIWlzQXJyYXkoYXJyKSkge1xuICAgICAgYXJyID0gW107XG4gICAgICBvYmplY3RQYXRoLnNldChvYmosIHBhdGgsIGFycik7XG4gICAgfVxuXG4gICAgYXJyLnB1c2guYXBwbHkoYXJyLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpKTtcbiAgfTtcblxuICBvYmplY3RQYXRoLmNvYWxlc2NlID0gZnVuY3Rpb24gKG9iaiwgcGF0aHMsIGRlZmF1bHRWYWx1ZSkge1xuICAgIHZhciB2YWx1ZTtcblxuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBwYXRocy5sZW5ndGg7IGkgPCBsZW47IGkrKykge1xuICAgICAgaWYgKCh2YWx1ZSA9IG9iamVjdFBhdGguZ2V0KG9iaiwgcGF0aHNbaV0pKSAhPT0gdm9pZCAwKSB7XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICB9O1xuXG4gIG9iamVjdFBhdGguZ2V0ID0gZnVuY3Rpb24gKG9iaiwgcGF0aCwgZGVmYXVsdFZhbHVlKXtcbiAgICBpZiAoaXNOdW1iZXIocGF0aCkpIHtcbiAgICAgIHBhdGggPSBbcGF0aF07XG4gICAgfVxuICAgIGlmIChpc0VtcHR5KHBhdGgpKSB7XG4gICAgICByZXR1cm4gb2JqO1xuICAgIH1cbiAgICBpZiAoaXNFbXB0eShvYmopKSB7XG4gICAgICByZXR1cm4gZGVmYXVsdFZhbHVlO1xuICAgIH1cbiAgICBpZiAoaXNTdHJpbmcocGF0aCkpIHtcbiAgICAgIHJldHVybiBvYmplY3RQYXRoLmdldChvYmosIHBhdGguc3BsaXQoJy4nKSwgZGVmYXVsdFZhbHVlKTtcbiAgICB9XG5cbiAgICB2YXIgY3VycmVudFBhdGggPSBnZXRLZXkocGF0aFswXSk7XG5cbiAgICBpZiAocGF0aC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGlmIChvYmpbY3VycmVudFBhdGhdID09PSB2b2lkIDApIHtcbiAgICAgICAgcmV0dXJuIGRlZmF1bHRWYWx1ZTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBvYmpbY3VycmVudFBhdGhdO1xuICAgIH1cblxuICAgIHJldHVybiBvYmplY3RQYXRoLmdldChvYmpbY3VycmVudFBhdGhdLCBwYXRoLnNsaWNlKDEpLCBkZWZhdWx0VmFsdWUpO1xuICB9O1xuXG4gIG9iamVjdFBhdGguZGVsID0gZnVuY3Rpb24ob2JqLCBwYXRoKSB7XG4gICAgcmV0dXJuIGRlbChvYmosIHBhdGgpO1xuICB9O1xuXG4gIHJldHVybiBvYmplY3RQYXRoO1xufSk7XG4iLCJtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSByZXF1aXJlKCcuL2xpYi9zbGljZWQnKTtcbiIsIlxuLyoqXG4gKiBBbiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpIGFsdGVybmF0aXZlXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IGFyZ3Mgc29tZXRoaW5nIHdpdGggYSBsZW5ndGhcbiAqIEBwYXJhbSB7TnVtYmVyfSBzbGljZVxuICogQHBhcmFtIHtOdW1iZXJ9IHNsaWNlRW5kXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gKGFyZ3MsIHNsaWNlLCBzbGljZUVuZCkge1xuICB2YXIgcmV0ID0gW107XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcblxuICBpZiAoMCA9PT0gbGVuKSByZXR1cm4gcmV0O1xuXG4gIHZhciBzdGFydCA9IHNsaWNlIDwgMFxuICAgID8gTWF0aC5tYXgoMCwgc2xpY2UgKyBsZW4pXG4gICAgOiBzbGljZSB8fCAwO1xuXG4gIGlmIChzbGljZUVuZCAhPT0gdW5kZWZpbmVkKSB7XG4gICAgbGVuID0gc2xpY2VFbmQgPCAwXG4gICAgICA/IHNsaWNlRW5kICsgbGVuXG4gICAgICA6IHNsaWNlRW5kXG4gIH1cblxuICB3aGlsZSAobGVuLS0gPiBzdGFydCkge1xuICAgIHJldFtsZW4gLSBzdGFydF0gPSBhcmdzW2xlbl07XG4gIH1cblxuICByZXR1cm4gcmV0O1xufVxuXG4iLCJpbXBvcnQgeyBlbGVtZW50IH0gZnJvbSAnZGVrdSdcblxuZnVuY3Rpb24gcmVuZGVyKGNvbXBvbmVudCkge1xuICAgIHJldHVybiAoXG4gICAgICAgIDxkaXYgY2xhc3M9XCJtZGwtbGF5b3V0X19kcmF3ZXJcIj5cbiAgICAgICAgICAgIDxzcGFuIGNsYXNzPVwibWRsLWxheW91dC10aXRsZVwiPkZvb2QnbiBTdHVmZjwvc3Bhbj5cbiAgICAgICAgICAgIDxuYXYgY2xhc3M9XCJtZGwtbmF2aWdhdGlvblwiPlxuICAgICAgICAgICAgICAgIDxhIGNsYXNzPVwibWRsLW5hdmlnYXRpb25fX2xpbmtcIiBocmVmPVwiaHR0cHM6Ly9naXRodWIuY29tL0NhbHZlaW4vZm9vZC1uLXN0dWZmXCI+UmVwbzwvYT5cbiAgICAgICAgICAgIDwvbmF2PlxuICAgICAgICA8L2Rpdj5cbiAgICApXG59XG5cblxuZXhwb3J0IGRlZmF1bHQgeyByZW5kZXIgfSIsImltcG9ydCB7IGVsZW1lbnQgfSBmcm9tICdkZWt1J1xuaW1wb3J0IHsgZXZlbnREaXNwYXRjaGVyIH0gZnJvbSAnLi4vLi4nXG5cbmxldCBkZWZhdWx0UHJvcHMgPSB7XG4gICAgdHlwZXM6IFsnZm9vZCcsICdkcmlua3MnXVxufVxuXG5mdW5jdGlvbiByZW5kZXIoY29tcG9uZW50KSB7XG4gICAgcmV0dXJuIChcbiAgICAgICAgPGhlYWRlciBjbGFzcz1cIm1kbC1sYXlvdXRfX2hlYWRlclwiPlxuICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1kbC1sYXlvdXRfX2hlYWRlci1yb3dcIj5cbiAgICAgICAgICAgICAgICA8c3BhbiBjbGFzcz1cIm1kbC1sYXlvdXQtdGl0bGVcIj5Gb29kJ24gU3R1ZmY8L3NwYW4+XG4gICAgICAgICAgICAgICAgPGRpdiBjbGFzcz1cIm1kbC1sYXlvdXQtc3BhY2VyXCI+PC9kaXY+XG4gICAgICAgICAgICAgICAgPGxhYmVsIGNsYXNzPVwibWRsLWljb24tdG9nZ2xlIG1kbC1qcy1pY29uLXRvZ2dsZSBtZGwtanMtcmlwcGxlLWVmZmVjdFwiPlxuICAgICAgICAgICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU9XCJmb29kXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXtjaGFuZ2VUeXBlfVxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImNoZWNrYm94XCJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwibWRsLWljb24tdG9nZ2xlX19pbnB1dFwiXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja2VkXG4gICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwibWRsLWljb24tdG9nZ2xlX19sYWJlbCBtYXRlcmlhbC1pY29uc1wiPmxvY2FsX2RpbmluZzwvaT5cbiAgICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzcz1cIm1kbC1pY29uLXRvZ2dsZSBtZGwtanMtaWNvbi10b2dnbGUgbWRsLWpzLXJpcHBsZS1lZmZlY3RcIj5cbiAgICAgICAgICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgICAgICAgICAgICBuYW1lPVwiZHJpbmtzXCJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9uQ2hhbmdlPXtjaGFuZ2VUeXBlfVxuICAgICAgICAgICAgICAgICAgICAgICAgdHlwZT1cImNoZWNrYm94XCJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsYXNzPVwibWRsLWljb24tdG9nZ2xlX19pbnB1dFwiXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja2VkXG4gICAgICAgICAgICAgICAgICAgIC8+XG4gICAgICAgICAgICAgICAgICAgIDxpIGNsYXNzPVwibWRsLWljb24tdG9nZ2xlX19sYWJlbCBtYXRlcmlhbC1pY29uc1wiPmxvY2FsX2JhcjwvaT5cbiAgICAgICAgICAgICAgICA8L2xhYmVsPlxuICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgIDwvaGVhZGVyPlxuICAgIClcblxuXG4gICAgLyogRXZlbnRzICovXG4gICAgZnVuY3Rpb24gY2hhbmdlVHlwZShlLCB7IHByb3BzIH0pIHtcbiAgICAgICAgbGV0IGVsID0gZS5kZWxlZ2F0ZVRhcmdldFxuICAgICAgICBpZiAoZWwuY2hlY2tlZCkge1xuICAgICAgICAgICAgcHJvcHMudHlwZXMucHVzaChlbC5uYW1lKVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcHJvcHMudHlwZXMgPSBwcm9wcy50eXBlcy5maWx0ZXIoKHR5cGUpID0+IHR5cGUgIT09IGVsLm5hbWUpXG4gICAgICAgIH1cbiAgICAgICAgZXZlbnREaXNwYXRjaGVyLmVtaXQoJ2NoYW5nZXM6dHlwZXMnLCBwcm9wcy50eXBlcylcbiAgICB9XG59XG5cblxuZXhwb3J0IGRlZmF1bHQgeyBkZWZhdWx0UHJvcHMsIHJlbmRlciB9IiwiaW1wb3J0IHsgZWxlbWVudCB9IGZyb20gJ2Rla3UnXG5pbXBvcnQgeyBldmVudERpc3BhdGNoZXIgfSBmcm9tICcuLi8uLidcbmltcG9ydCB7IGdldENvb3JkcyB9IGZyb20gJy4uLy4uL21vZHVsZXMvZ2VvbG9jYXRpb24nXG5cblxuY29uc3QgVEFCTEVfSUQgPSAnMUJIbmFhbjNZZlNEcTlfTHpqdGhEWGpqNWR6SlpBTmpMU2I4SkhQbDUnXG5cbmxldCBkZWZhdWx0UHJvcHMgPSB7XG4gICAgbGF0OiAwXG4gICwgbG5nOiAwXG4gICwgcmFkaXVzOiAwXG4gICwgdHlwZXM6IFsnZm9vZCcsICdkcmlua3MnXVxuICAsIHF1ZXJ5OiB7XG4gICAgICAgIHNlbGVjdDogJ2FkZHJlc3MnXG4gICAgICAsIGZyb206IFRBQkxFX0lEXG4gICAgICAsIHdoZXJlOiBudWxsXG4gICAgfVxufVxuXG5mdW5jdGlvbiByZW5kZXIoeyBwcm9wcyB9KSB7XG4gICAgcmV0dXJuIDxkaXYgY2xhc3M9XCJtYXBcIj48L2Rpdj5cbn1cblxuZnVuY3Rpb24gYWZ0ZXJSZW5kZXIoeyBwcm9wcyB9LCBlbCkge1xuICAgIGdldE1hcChlbCwgcHJvcHMpLnRoZW4oKCkgPT4gZ2V0U3BlY2lhbHMocHJvcHMpKVxuXG4gICAgLy8gTGlzdGVuZXJzXG4gICAgZXZlbnREaXNwYXRjaGVyLm9uKCdjaGFuZ2VzOnR5cGVzJywgKHR5cGVzKSA9PiB7XG4gICAgICAgIHByb3BzLnR5cGVzID0gdHlwZXNcbiAgICAgICAgZ2V0U3BlY2lhbHMocHJvcHMpXG4gICAgfSlcbiAgICBldmVudERpc3BhdGNoZXIub24oJ2NoYW5nZTpyYWRpdXMnLCAocmFkaXVzKSA9PiB7XG4gICAgICAgIHByb3BzLnJhZGl1cyA9IHJhZGl1c1xuICAgICAgICBnZXRTcGVjaWFscyhwcm9wcylcbiAgICB9KVxufVxuXG5mdW5jdGlvbiBnZXRTcGVjaWFscyhwcm9wcykge1xuICAgIHByb3BzLnF1ZXJ5LndoZXJlID0gYFNUX0lOVEVSU0VDVFMoYWRkcmVzcyxcbiAgICAgICAgQ0lSQ0xFKExBVExORygke3Byb3BzLmxhdH0sICR7cHJvcHMubG5nfSksICR7cHJvcHMucmFkaXVzfSkpXG4gICAgICAgIEFORCB0eXBlIElOICgnJHtwcm9wcy50eXBlcy5qb2luKCdcXCcsXFwnJyl9JylcbiAgICBgXG4gICAgdXBkYXRlTWFwKHByb3BzKVxufVxuXG5sZXQgbWFwXG5mdW5jdGlvbiBnZXRNYXAoZWwsIHByb3BzKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4gICAgICAgIGlmIChlbCkge1xuICAgICAgICAgICAgZ2V0Q29vcmRzKCkudGhlbigoY29vcmRzKSA9PiB7XG4gICAgICAgICAgICAgICAgcHJvcHMubGF0ID0gY29vcmRzLmxhdFxuICAgICAgICAgICAgICAgIHByb3BzLmxuZyA9IGNvb3Jkcy5sbmdcbiAgICAgICAgICAgICAgICBtYXAgPSBuZXcgZ29vZ2xlLm1hcHMuTWFwKGVsLCB7XG4gICAgICAgICAgICAgICAgICAgIGNlbnRlcjogeyBsYXQ6IHByb3BzLmxhdCwgbG5nOiBwcm9wcy5sbmcgfVxuICAgICAgICAgICAgICAgICAgLCB6b29tOiAxNlxuICAgICAgICAgICAgICAgIH0pXG5cbiAgICAgICAgICAgICAgICBnb29nbGUubWFwcy5ldmVudC5hZGRMaXN0ZW5lck9uY2UobWFwLCAnaWRsZScsICgpID0+IHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShtYXApXG4gICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXNvbHZlKG1hcClcbiAgICAgICAgfVxuICAgIH0pXG59XG5cbmxldCBmdXNpb25UYWJsZXNMYXllclxubGV0IHBvc01hcmtlclxubGV0IGNpcmNsZUxheWVyXG5mdW5jdGlvbiB1cGRhdGVNYXAocHJvcHMpIHtcbiAgICBnZXRNYXAoKS50aGVuKChtYXApID0+IHtcbiAgICAgICAgaWYgKCFmdXNpb25UYWJsZXNMYXllcikge1xuICAgICAgICAgICAgZnVzaW9uVGFibGVzTGF5ZXIgPSBuZXcgZ29vZ2xlLm1hcHMuRnVzaW9uVGFibGVzTGF5ZXIoe1xuICAgICAgICAgICAgICAgIG1hcDogbWFwXG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgZnVzaW9uVGFibGVzTGF5ZXIuYWRkTGlzdGVuZXIoJ2NsaWNrJywgKGUpID0+IHtcbiAgICAgICAgICAgICAgICBsZXQgZ2V0VmFsID0gKGNvbCkgPT4ge1xuICAgICAgICAgICAgICAgICAgICBsZXQgdmFsdWUgPSBlLnJvd1tjb2xdLnZhbHVlXG4gICAgICAgICAgICAgICAgICAgIGlmIChjb2wgPT09ICdmcm9tJyB8fCBjb2wgPT09ICd0bycpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhbHVlID0gdmFsdWUucmVwbGFjZSgvKC4uKSQvLCAnOiQxJylcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGUuaW5mb1dpbmRvd0h0bWwgPSBgXG4gICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpbmZvd2luZG93XCI+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaW5mb3dpbmRvd19fbmFtZVwiPiR7Z2V0VmFsKCdlc3RhYmxpc2htZW50Jyl9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaW5mb3dpbmRvd19fYWRkcmVzc1wiPiR7Z2V0VmFsKCdhZGRyZXNzJyl9PC9kaXY+XG4gICAgICAgICAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwiaW5mb3dpbmRvd19fZGVzY3JpcHRpb25cIj4ke2dldFZhbCgnZGVzY3JpcHRpb24nKX08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJpbmZvd2luZG93X190aW1lXCI+RnJvbSAke2dldFZhbCgnZnJvbScpfSB0byAke2dldFZhbCgndG8nKX08L2Rpdj5cbiAgICAgICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICAgICAgYFxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgcG9zTWFya2VyID0gbmV3IGdvb2dsZS5tYXBzLk1hcmtlcih7XG4gICAgICAgICAgICAgICAgbWFwOiBtYXBcbiAgICAgICAgICAgICAgLCBjbGlja2FibGU6IGZhbHNlXG4gICAgICAgICAgICAgICwgZHJhZ2dhYmxlOiB0cnVlXG4gICAgICAgICAgICAgICwgYW5pbWF0aW9uOiBnb29nbGUubWFwcy5BbmltYXRpb24uRFJPUFxuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIHBvc01hcmtlci5hZGRMaXN0ZW5lcignZHJhZ2VuZCcsIChlKSA9PiB7XG4gICAgICAgICAgICAgICAgcHJvcHMubGF0ID0gZS5sYXRMbmcubGF0KClcbiAgICAgICAgICAgICAgICBwcm9wcy5sbmcgPSBlLmxhdExuZy5sbmcoKVxuICAgICAgICAgICAgICAgIGdldFNwZWNpYWxzKHByb3BzKVxuICAgICAgICAgICAgfSlcblxuICAgICAgICAgICAgY2lyY2xlTGF5ZXIgPSBuZXcgZ29vZ2xlLm1hcHMuQ2lyY2xlKHtcbiAgICAgICAgICAgICAgICBtYXA6IG1hcFxuICAgICAgICAgICAgICAsIHN0cm9rZUNvbG9yOiAnIzNmNTFiNSdcbiAgICAgICAgICAgICAgLCBzdHJva2VXZWlnaHQ6IDJcbiAgICAgICAgICAgICAgLCBmaWxsQ29sb3I6ICcjM2Y1MWI1J1xuICAgICAgICAgICAgICAsIGZpbGxPcGFjaXR5OiAuMzVcbiAgICAgICAgICAgICAgLCBjbGlja2FibGU6IGZhbHNlXG4gICAgICAgICAgICB9KVxuICAgICAgICB9XG4gICAgICAgIGZ1c2lvblRhYmxlc0xheWVyLnNldFF1ZXJ5KHByb3BzLnF1ZXJ5KVxuXG4gICAgICAgIHBvc01hcmtlci5zZXRQb3NpdGlvbihuZXcgZ29vZ2xlLm1hcHMuTGF0TG5nKHByb3BzLmxhdCwgcHJvcHMubG5nKSlcblxuICAgICAgICBjaXJjbGVMYXllci5zZXRDZW50ZXIobmV3IGdvb2dsZS5tYXBzLkxhdExuZyhwcm9wcy5sYXQsIHByb3BzLmxuZykpXG4gICAgICAgIGNpcmNsZUxheWVyLnNldFJhZGl1cyhwcm9wcy5yYWRpdXMpXG5cbiAgICAgICAgbWFwLmZpdEJvdW5kcyhjaXJjbGVMYXllci5nZXRCb3VuZHMoKSlcbiAgICB9KVxufVxuXG5cbmV4cG9ydCBkZWZhdWx0IHsgZGVmYXVsdFByb3BzLCByZW5kZXIsIGFmdGVyUmVuZGVyIH0iLCJpbXBvcnQgeyBlbGVtZW50IH0gZnJvbSAnZGVrdSdcbmltcG9ydCB7IGV2ZW50RGlzcGF0Y2hlciB9IGZyb20gJy4uLy4uJ1xuXG5cbmxldCBkZWZhdWx0UHJvcHMgPSB7XG4gICAgcmFkaXVzOiAwXG59XG5mdW5jdGlvbiByZW5kZXIoeyBwcm9wcyB9KSB7XG4gICAgcmV0dXJuIChcbiAgICAgICAgPGRpdiBjbGFzcz1cInJhZGl1c1wiPlxuICAgICAgICAgICAgPGlucHV0XG4gICAgICAgICAgICAgICAgb25JbnB1dD17Y2hhbmdlUmFkaXVzUmFuZ2V9XG4gICAgICAgICAgICAgICAgbmFtZT1cInJhZGl1cy1yYW5nZVwiXG4gICAgICAgICAgICAgICAgY2xhc3M9XCJtZGwtc2xpZGVyIG1kbC1qcy1zbGlkZXJcIlxuICAgICAgICAgICAgICAgIHR5cGU9XCJyYW5nZVwiXG4gICAgICAgICAgICAgICAgc3RlcD1cIjEwMFwiXG4gICAgICAgICAgICAgICAgbWluPVwiMTAwXCJcbiAgICAgICAgICAgICAgICBtYXg9XCI1MDAwXCJcbiAgICAgICAgICAgICAgICB2YWx1ZT17cHJvcHMucmFkaXVzfVxuICAgICAgICAgICAgLz5cbiAgICAgICAgICAgIDxkaXYgY2xhc3M9XCJtZGwtdGV4dGZpZWxkIG1kbC1qcy10ZXh0ZmllbGQgbWRsLXRleHRmaWVsZC0tZmxvYXRpbmctbGFiZWxcIj5cbiAgICAgICAgICAgICAgICA8aW5wdXRcbiAgICAgICAgICAgICAgICAgICAgY2xhc3M9XCJtZGwtdGV4dGZpZWxkX19pbnB1dFwiXG4gICAgICAgICAgICAgICAgICAgIG9uSW5wdXQ9e2NoYW5nZVJhZGl1c0lucHV0fVxuICAgICAgICAgICAgICAgICAgICBuYW1lPVwicmFkaXVzLW51bWJlclwiXG4gICAgICAgICAgICAgICAgICAgIHR5cGU9XCJudW1iZXJcIlxuICAgICAgICAgICAgICAgICAgICBzdGVwPVwiNTBcIlxuICAgICAgICAgICAgICAgICAgICBtaW49XCIxMDBcIlxuICAgICAgICAgICAgICAgICAgICBtYXg9XCI1MDAwXCJcbiAgICAgICAgICAgICAgICAgICAgdmFsdWU9e3Byb3BzLnJhZGl1c31cbiAgICAgICAgICAgICAgICAvPlxuICAgICAgICAgICAgICAgIDxsYWJlbCBjbGFzcz1cIm1kbC10ZXh0ZmllbGRfX2xhYmVsXCI+RGlzdGFuY2UgKG0pPC9sYWJlbD5cbiAgICAgICAgICAgIDwvZGl2PlxuICAgICAgICA8L2Rpdj5cbiAgICApXG5cblxuICAgIC8qIEV2ZW50cyAqL1xuICAgIGZ1bmN0aW9uIGNoYW5nZVJhZGl1c1JhbmdlKGUpIHtcbiAgICAgICAgcHJvcHMucmFkaXVzID0gcmFkaXVzU2xpZGVyLnZhbHVlQXNOdW1iZXJcbiAgICAgICAgcmFkaXVzTnVtYmVyLnZhbHVlID0gcHJvcHMucmFkaXVzXG5cbiAgICAgICAgc2VuZFJhZGl1cyhwcm9wcy5yYWRpdXMpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2hhbmdlUmFkaXVzSW5wdXQoZSkge1xuICAgICAgICBsZXQgdmFsdWUgPSByYWRpdXNOdW1iZXIudmFsdWVBc051bWJlclxuXG4gICAgICAgIC8vIFByZXZlbnQgbm9uIG51bWJlcnMgdmFsdWVzXG4gICAgICAgIGlmIChpc05hTih2YWx1ZSkpIHtcbiAgICAgICAgICAgIHJhZGl1c051bWJlci52YWx1ZSA9IHJhZGl1c051bWJlci52YWx1ZVxuICAgICAgICAgICAgcmV0dXJuXG4gICAgICAgIH1cblxuICAgICAgICAvLyBDbGFtcCB2YWx1ZVxuICAgICAgICBpZiAodmFsdWUgPiByYWRpdXNOdW1iZXIubWF4KSB2YWx1ZSA9ICtyYWRpdXNOdW1iZXIubWF4XG4gICAgICAgIGlmICh2YWx1ZSA8IHJhZGl1c051bWJlci5taW4pIHZhbHVlID0gK3JhZGl1c051bWJlci5taW5cbiAgICAgICAgcHJvcHMucmFkaXVzID0gdmFsdWVcblxuICAgICAgICByYWRpdXNOdW1iZXIudmFsdWUgPSBwcm9wcy5yYWRpdXNcbiAgICAgICAgcmFkaXVzU2xpZGVyLk1hdGVyaWFsU2xpZGVyLmNoYW5nZShwcm9wcy5yYWRpdXMpXG5cbiAgICAgICAgc2VuZFJhZGl1cyhwcm9wcy5yYWRpdXMpXG4gICAgfVxufVxuXG5sZXQgcmFkaXVzU2xpZGVyXG5sZXQgcmFkaXVzTnVtYmVyXG5mdW5jdGlvbiBhZnRlclJlbmRlcihjb21wb25lbnQsIGVsKSB7XG4gICAgcmFkaXVzU2xpZGVyID0gZWwucXVlcnlTZWxlY3RvcignW25hbWU9cmFkaXVzLXJhbmdlXScpXG4gICAgcmFkaXVzTnVtYmVyID0gZWwucXVlcnlTZWxlY3RvcignW25hbWU9cmFkaXVzLW51bWJlcl0nKVxufVxuXG5mdW5jdGlvbiBzZW5kUmFkaXVzKHJhZGl1cykge1xuICAgIGV2ZW50RGlzcGF0Y2hlci5lbWl0KCdjaGFuZ2U6cmFkaXVzJywgcmFkaXVzKVxufVxuXG5cbmV4cG9ydCBkZWZhdWx0IHsgZGVmYXVsdFByb3BzLCByZW5kZXIsIGFmdGVyUmVuZGVyIH0iLCJpbXBvcnQgeyBFdmVudEVtaXR0ZXIgfSBmcm9tICdldmVudHMnXG5pbXBvcnQgSGVhZGVyIGZyb20gJy4vY29tcG9uZW50cy9oZWFkZXInXG5pbXBvcnQgRHJhd2VyIGZyb20gJy4vY29tcG9uZW50cy9kcmF3ZXInXG5pbXBvcnQgTWFwQ29tcG9uZW50IGZyb20gJy4vY29tcG9uZW50cy9tYXAnXG5pbXBvcnQgUmFkaXVzIGZyb20gJy4vY29tcG9uZW50cy9yYWRpdXMnXG5pbXBvcnQgeyBlbGVtZW50IH0gZnJvbSAnZGVrdSdcblxuZnVuY3Rpb24gcmVuZGVyKGNvbXBvbmVudCkge1xuICAgIGxldCByYWRpdXMgPSAzMDBcblxuICAgIHJldHVybiAoXG4gICAgICAgIDxkaXYgY2xhc3M9XCJtZGwtbGF5b3V0IG1kbC1qcy1sYXlvdXQgbWRsLWxheW91dC0tZml4ZWQtaGVhZGVyXCI+XG4gICAgICAgICAgICA8SGVhZGVyIC8+XG4gICAgICAgICAgICA8RHJhd2VyIC8+XG4gICAgICAgICAgICA8bWFpbiBjbGFzcz1cIm1kbC1sYXlvdXRfX2NvbnRlbnRcIj5cbiAgICAgICAgICAgICAgICA8ZGl2IGNsYXNzPVwicGFnZS1jb250ZW50XCI+XG4gICAgICAgICAgICAgICAgICAgIDxNYXBDb21wb25lbnQgcmFkaXVzPXtyYWRpdXN9IC8+XG4gICAgICAgICAgICAgICAgICAgIDxSYWRpdXMgcmFkaXVzPXtyYWRpdXN9IC8+XG4gICAgICAgICAgICAgICAgPC9kaXY+XG4gICAgICAgICAgICA8L21haW4+XG4gICAgICAgIDwvZGl2PlxuICAgIClcbn1cblxuLy8gR2xvYmFsIGV2ZW50IGVtaXR0ZXJcbmxldCBlbWl0dGVyID0gbmV3IEV2ZW50RW1pdHRlclxuXG5leHBvcnQgeyBlbWl0dGVyIGFzIGV2ZW50RGlzcGF0Y2hlciB9XG5leHBvcnQgZGVmYXVsdCB7IHJlbmRlciB9IiwiZnVuY3Rpb24gZ2V0Q29vcmRzKCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSkgPT4ge1xuICAgICAgICBuYXZpZ2F0b3IuZ2VvbG9jYXRpb24uZ2V0Q3VycmVudFBvc2l0aW9uKGZ1bmN0aW9uKGdlbykge1xuICAgICAgICAgICAgbGV0IHsgbGF0aXR1ZGUsIGxvbmdpdHVkZSB9ID0gZ2VvLmNvb3Jkc1xuICAgICAgICAgICAgcmVzb2x2ZSh7IGxhdDogbGF0aXR1ZGUsIGxuZzogbG9uZ2l0dWRlIH0pXG4gICAgICAgIH0pXG4gICAgfSlcbn1cblxuXG5leHBvcnQgeyBnZXRDb29yZHMgfSIsImltcG9ydCBBcHAgZnJvbSAnLi9hcHAnXG5pbXBvcnQgeyByZW5kZXIsIHRyZWUsIGVsZW1lbnQgfSBmcm9tICdkZWt1J1xuXG5cbi8vIENyZWF0ZSB0aGUgYXBwXG52YXIgYXBwID0gdHJlZSg8QXBwIC8+KVxuXG4vLyBSZW5kZXIgaW50byB0aGUgRE9NXG5yZW5kZXIoYXBwLCBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuYXBwJykpIl19
