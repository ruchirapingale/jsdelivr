/**!
 * @fileOverview Kickass library to create and place poppers near their reference elements.
 * @version 1.0.0-alpha.8
 * @license
 * Copyright (c) 2016 Federico Zivolo and contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */    
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global.Popper = factory());
}(this, (function () { 'use strict';

/**
 * The Object.assign() method is used to copy the values of all enumerable own properties from one or more source
 * objects to a target object. It will return the target object.
 * This polyfill doesn't support symbol properties, since ES5 doesn't have symbols anyway
 * Source: https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
 * @function
 * @ignore
 */
if (!Object.assign) {
    Object.defineProperty(Object, 'assign', {
        enumerable: false,
        configurable: true,
        writable: true,
        value: function value(target) {
            if (target === undefined || target === null) {
                throw new TypeError('Cannot convert first argument to object');
            }

            var to = Object(target);
            for (var i = 1; i < arguments.length; i++) {
                var nextSource = arguments[i];
                if (nextSource === undefined || nextSource === null) {
                    continue;
                }
                nextSource = Object(nextSource);

                var keysArray = Object.keys(nextSource);
                for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
                    var nextKey = keysArray[nextIndex];
                    var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
                    if (desc !== undefined && desc.enumerable) {
                        to[nextKey] = nextSource[nextKey];
                    }
                }
            }
            return to;
        }
    });
}

/**
 * Polyfill for requestAnimationFrame
 * @function
 * @ignore
 */
if (!window.requestAnimationFrame) {
    var lastTime = 0;
    var vendors = ['ms', 'moz', 'webkit', 'o'];
    for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x] + 'RequestAnimationFrame'];
        window.cancelAnimationFrame = window[vendors[x] + 'CancelAnimationFrame'] || window[vendors[x] + 'CancelRequestAnimationFrame'];
    }

    if (!window.requestAnimationFrame) {
        window.requestAnimationFrame = function (callback) {
            var currTime = new Date().getTime();
            var timeToCall = Math.max(0, 16 - (currTime - lastTime));
            var id = window.setTimeout(function () {
                callback(currTime + timeToCall);
            }, timeToCall);
            lastTime = currTime + timeToCall;
            return id;
        };
    }

    if (!window.cancelAnimationFrame) {
        window.cancelAnimationFrame = function (id) {
            clearTimeout(id);
        };
    }
}

/**
 * Return the index of the matching object
 * @method
 * @memberof Popper.Utils
 * @argument {Array} arr
 * @argument prop
 * @argument value
 * @returns index or -1
 */
function findIndex(arr, prop, value) {
  // use filter instead of find because find has less cross-browser support
  var match = arr.filter(function (obj) {
    return obj[prop] === value;
  })[0];
  return arr.indexOf(match);
}

/**
 * Returns the offset parent of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} offset parent
 */
function getOffsetParent(element) {
  // NOTE: 1 DOM access here
  var offsetParent = element.offsetParent;
  return !offsetParent || offsetParent.nodeName === 'BODY' ? window.document.documentElement : offsetParent;
}

/**
 * Get CSS computed property of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Eement} element
 * @argument {String} property
 */
function getStyleComputedProperty(element, property) {
    if (element.nodeType !== 1) {
        return [];
    }
    // NOTE: 1 DOM access here
    var css = window.getComputedStyle(element, null);
    return css[property];
}

/**
 * Returns the parentNode or the host of the element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} parent
 */
function getParentNode(element) {
  return element.parentNode || element.host;
}

/**
 * Returns the scrolling parent of the given element
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Element} offset parent
 */
function getScrollParent(element) {
    if (element === window.document) {
        // Firefox puts the scrollTOp value on `documentElement` instead of `body`, we then check which of them is
        // greater than 0 and return the proper element
        if (window.document.body.scrollTop) {
            return window.document.body;
        } else {
            return window.document.documentElement;
        }
    }

    // Firefox want us to check `-x` and `-y` variations as well
    if (['scroll', 'auto'].indexOf(getStyleComputedProperty(element, 'overflow')) !== -1 || ['scroll', 'auto'].indexOf(getStyleComputedProperty(element, 'overflow-x')) !== -1 || ['scroll', 'auto'].indexOf(getStyleComputedProperty(element, 'overflow-y')) !== -1) {
        // If the detected scrollParent is body, we perform an additional check on its parentNode
        // in this way we'll get body if the browser is Chrome-ish, or documentElement otherwise
        // fixes issue #65
        return element === window.document.body ? getScrollParent(getParentNode(element)) : element;
    }
    return getParentNode(element) ? getScrollParent(getParentNode(element)) : element;
}

/**
 * Get the position of the given element, relative to its offset parent
 * @method
 * @memberof Popper.Utils
 * @param {Element} element
 * @return {Object} position - Coordinates of the element and its `scrollTop`
 */
function getOffsetRect(element) {
    var html = window.document.documentElement;

    var elementRect = void 0;
    if (element === html) {
        elementRect = {
            width: Math.max(html.clientWidth, window.innerWidth || 0),
            height: Math.max(html.clientHeight, window.innerHeight || 0),
            left: 0,
            top: 0
        };
    } else {
        elementRect = {
            width: element.offsetWidth,
            height: element.offsetHeight,
            left: element.offsetLeft,
            top: element.offsetTop
        };
    }

    elementRect.right = elementRect.left + elementRect.width;
    elementRect.bottom = elementRect.top + elementRect.height;

    // position
    return elementRect;
}

/**
 * Check if the given element is fixed or is inside a fixed parent
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @argument {Element} customContainer
 * @returns {Boolean} answer to "isFixed?"
 */
function isFixed(element) {
    if (element === window.document.body) {
        return false;
    }
    if (getStyleComputedProperty(element, 'position') === 'fixed') {
        return true;
    }
    return getParentNode(element) ? isFixed(getParentNode(element)) : element;
}

/**
 * Helper used to get the position which will be applied to the popper
 * @method
 * @memberof Popper.Utils
 * @param config {HTMLElement} popper element
 * @returns {HTMLElement} reference element
 */
function getPosition(element) {
  var container = getOffsetParent(element);

  // Decide if the popper will be fixed
  // If the reference element is inside a fixed context, the popper will be fixed as well to allow them to scroll together
  var isParentFixed = isFixed(container);
  return isParentFixed ? 'fixed' : 'absolute';
}

/**
 * Get bounding client rect of given element
 * @method
 * @memberof Popper.Utils
 * @param {HTMLElement} element
 * @return {Object} client rect
 */
function getBoundingClientRect(element) {
    var rect = element.getBoundingClientRect();

    // subtract scrollbar size from sizes
    var horizScrollbar = element.offsetWidth - element.clientWidth;
    var vertScrollbar = element.offsetHeight - element.clientHeight;

    return {
        left: rect.left,
        top: rect.top,
        right: rect.right - horizScrollbar,
        bottom: rect.bottom - vertScrollbar,
        width: rect.right - rect.left - horizScrollbar,
        height: rect.bottom - rect.top - vertScrollbar
    };
}

/**
 * Given an element and one of its parents, return the offset
 * @method
 * @memberof Popper.Utils
 * @param {HTMLElement} element
 * @param {HTMLElement} parent
 * @return {Object} rect
 */
function getOffsetRectRelativeToCustomParent(element, parent) {
    var fixed = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;
    var transformed = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : false;

    var elementRect = getBoundingClientRect(element);
    var parentRect = getBoundingClientRect(parent);

    if (fixed && !transformed) {
        var scrollParent = getScrollParent(parent);
        parentRect.top += scrollParent.scrollTop;
        parentRect.bottom += scrollParent.scrollTop;
        parentRect.left += scrollParent.scrollLeft;
        parentRect.right += scrollParent.scrollLeft;
    }

    var rect = {
        top: elementRect.top - parentRect.top,
        left: elementRect.left - parentRect.left,
        bottom: elementRect.top - parentRect.top + elementRect.height,
        right: elementRect.left - parentRect.left + elementRect.width,
        width: elementRect.width,
        height: elementRect.height
    };

    var scrollTop = parent.scrollTop,
        scrollLeft = parent.scrollLeft;

    rect.top += scrollTop;
    rect.bottom += scrollTop;
    rect.left += scrollLeft;
    rect.right += scrollLeft;
    return rect;
}

function getTotalScroll(element) {
    var side = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 'top';

    var body = window.document.body;
    var html = window.document.documentElement;

    var scrollParent = getScrollParent(element);
    var upperSide = side === 'top' ? 'scrollTop' : 'scrollLeft';
    var scroll = scrollParent[upperSide];

    if (scrollParent !== html && scrollParent !== body) {
        return scroll + getTotalScroll(scrollParent.parentNode);
    }
    return scroll;
}

/**
 * Computed the boundaries limits and return them
 * @method
 * @memberof Popper.Utils
 * @param {Object} data - Object containing the property "offsets" generated by `_getOffsets`
 * @param {Number} padding - Boundaries padding
 * @param {Element} boundariesElement - Element used to define the boundaries
 * @returns {Object} Coordinates of the boundaries
 */
function getBoundaries(popper, padding, boundariesElement) {
    // NOTE: 1 DOM access here
    var boundaries = {};
    var offsetParent = getOffsetParent(popper);
    var scrollParent = getScrollParent(popper);
    var body = window.document.body;
    var html = window.document.documentElement;

    if (boundariesElement === 'window') {
        // WINDOW
        var height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
        var width = Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth);

        boundaries = {
            top: 0,
            right: width,
            bottom: height,
            left: 0
        };
    } else if (boundariesElement === 'viewport') {
        // VIEWPORT
        var offsetParentRect = getOffsetRect(offsetParent);
        var position = getPosition(popper);

        if (position === 'fixed') {
            boundaries = {
                top: 0,
                right: window.document.documentElement.clientWidth,
                bottom: window.document.documentElement.clientHeight,
                left: 0
            };
        } else {
            boundaries = {
                top: 0 - offsetParentRect.top,
                right: window.document.documentElement.clientWidth - offsetParentRect.left,
                bottom: window.document.documentElement.clientHeight - offsetParentRect.top,
                left: 0 - offsetParentRect.left
            };
        }
    } else if (scrollParent === boundariesElement || boundariesElement === 'scrollParent') {
        // SCROLL PARENT IS BOUNDARIES ELEMENT
        boundaries = getOffsetRectRelativeToCustomParent(scrollParent, offsetParent);
    } else {
        // BOUNDARIES ELEMENT
        boundaries = getOffsetRectRelativeToCustomParent(boundariesElement, offsetParent);
    }

    if (offsetParent.contains(scrollParent)) {
        var scrollLeft = getTotalScroll(scrollParent, 'left');
        var scrollTop = getTotalScroll(scrollParent, 'top');
        boundaries.right += scrollLeft;
        boundaries.bottom += scrollTop;
    }

    // Add paddings
    boundaries.left += padding;
    boundaries.top += padding;
    boundaries.right -= padding;
    boundaries.bottom -= padding;

    return boundaries;
}

/**
 * Get the outer sizes of the given element (offset size + margins)
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element
 * @returns {Object} object containing width and height properties
 */
function getOuterSizes(element) {
    // NOTE: 1 DOM access here
    var display = element.style.display;
    var visibility = element.style.visibility;

    element.style.display = 'block';
    element.style.visibility = 'hidden';

    // original method
    var styles = window.getComputedStyle(element);
    var x = parseFloat(styles.marginTop) + parseFloat(styles.marginBottom);
    var y = parseFloat(styles.marginLeft) + parseFloat(styles.marginRight);
    var result = {
        width: element.offsetWidth + y,
        height: element.offsetHeight + x
    };

    // reset element styles
    element.style.display = display;
    element.style.visibility = visibility;

    return result;
}

/**
 * Given the popper offsets, generate an output similar to getBoundingClientRect
 * @method
 * @memberof Popper.Utils
 * @argument {Object} popperOffsets
 * @returns {Object} ClientRect like output
 */
function getPopperClientRect(popperOffsets) {
    return Object.assign({}, popperOffsets, {
        right: popperOffsets.left + popperOffsets.width,
        bottom: popperOffsets.top + popperOffsets.height
    });
}

/**
 * Get the prefixed supported property name
 * @method
 * @memberof Popper.Utils
 * @argument {String} property (camelCase)
 * @returns {String} prefixed property (camelCase)
 */
function getSupportedPropertyName(property) {
    var prefixes = ['', 'ms', 'webkit', 'moz', 'o'];

    for (var i = 0; i < prefixes.length; i++) {
        var toCheck = prefixes[i] ? prefixes[i] + property.charAt(0).toUpperCase() + property.slice(1) : property;
        if (typeof window.document.body.style[toCheck] !== 'undefined') {
            return toCheck;
        }
    }
    return null;
}

/**
 * Check if the given variable is a function
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element - Element to check
 * @returns {Boolean} answer to: is a function?
 */
function isFunction(functionToCheck) {
  var getType = {};
  return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

/**
 * Helper used to know if the given modifier depends from another one.
 * It checks if the needed modifier is listed and enabled.
 * @method
 * @memberof Popper.Utils
 * @returns {Boolean}
 */
function isModifierRequired(modifiers, requestingName, requestedName) {
  // find is not supported by IE
  var requesting = modifiers.filter(function (_ref) {
    var name = _ref.name;
    return name === requestingName;
  })[0];

  return !!requesting && modifiers.some(function (modifier) {
    return modifier.name === requestedName && modifier.enabled && modifier.order < requesting.order;
  });
}

/**
 * Tells if a given input is a number
 * @method
 * @memberof Popper.Utils
 * @param {*} input to check
 * @return {Boolean}
 */
function isNumeric(n) {
  return n !== '' && !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * Check if the given element has transforms applied to itself or a parent
 * @method
 * @memberof Popper.Utils
 * @param  {Element} element
 * @return {Boolean} answer to "isTransformed?"
 */
function isTransformed(element) {
    if (element === window.document.body) {
        return false;
    }
    if (getStyleComputedProperty(element, 'transform') !== 'none') {
        return true;
    }
    return getParentNode(element) ? isTransformed(getParentNode(element)) : element;
}

/**
 * Loop trough the list of modifiers and run them in order, each of them will then edit the data object
 * @method
 * @memberof Popper.Utils
 * @param {Object} data
 * @param {Array} modifiers
 * @param {Function} ends
 */
function runModifiers(modifiers, data, ends) {
    var modifiersToRun = ends === undefined ? modifiers : modifiers.slice(0, findIndex(modifiers, 'name', ends));

    modifiersToRun.forEach(function (modifier) {
        if (modifier.enabled && isFunction(modifier.function)) {
            data = modifier.function(data, modifier);
        }
    });

    return data;
}

/**
 * Set the style to the given popper
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element - Element to apply the style to
 * @argument {Object} styles - Object with a list of properties and values which will be applied to the element
 */
function setStyles(element, styles) {
    Object.keys(styles).forEach(function (prop) {
        var unit = '';
        // add unit if the value is numeric and is one of the following
        if (['width', 'height', 'top', 'right', 'bottom', 'left'].indexOf(prop) !== -1 && isNumeric(styles[prop])) {
            unit = 'px';
        }
        element.style[prop] = styles[prop] + unit;
    });
}

/** @namespace Popper.Utils */
var Utils = {
    findIndex: findIndex,
    getBoundaries: getBoundaries,
    getBoundingClientRect: getBoundingClientRect,
    getOffsetParent: getOffsetParent,
    getOffsetRectRelativeToCustomParent: getOffsetRectRelativeToCustomParent,
    getOuterSizes: getOuterSizes,
    getPopperClientRect: getPopperClientRect,
    getPosition: getPosition,
    getScrollParent: getScrollParent,
    getStyleComputedProperty: getStyleComputedProperty,
    getSupportedPropertyName: getSupportedPropertyName,
    isFixed: isFixed,
    isFunction: isFunction,
    isModifierRequired: isModifierRequired,
    isNumeric: isNumeric,
    isTransformed: isTransformed,
    runModifiers: runModifiers,
    setStyles: setStyles
};

var nativeHints = ['native code', '[object MutationObserverConstructor]' // for mobile safari iOS 9.0
];

/**
 * Determine if a function is implemented natively (as opposed to a polyfill).
 * @argument {Function | undefined} fn the function to check
 * @returns {boolean}
 */
var isNative = (function (fn) {
  return nativeHints.some(function (hint) {
    return (fn || '').toString().indexOf(hint) > -1;
  });
});

var longerTimeoutBrowsers = ['Edge', 'Trident', 'Firefox'];
var timeoutDuration = 0;
for (var i = 0; i < longerTimeoutBrowsers.length; i += 1) {
  if (navigator.userAgent.indexOf(longerTimeoutBrowsers[i]) >= 0) {
    timeoutDuration = 1;
    break;
  }
}

function microtaskDebounce(fn) {
  var scheduled = false;
  var i = 0;
  var elem = document.createElement('span');

  // MutationObserver provides a mechanism for scheduling microtasks, which
  // are scheduled *before* the next task. This gives us a way to debounce
  // a function but ensure it's called *before* the next paint.
  var observer = new MutationObserver(function () {
    fn();
    scheduled = false;
  });

  observer.observe(elem, { childList: true });

  return function () {
    if (!scheduled) {
      scheduled = true;
      elem.textContent = '' + i;
      i += 1;
    }
  };
}

function taskDebounce(fn) {
  var scheduled = false;
  return function () {
    if (!scheduled) {
      scheduled = true;
      setTimeout(function () {
        scheduled = false;
        fn();
      }, timeoutDuration);
    }
  };
}

// It's common for MutationObserver polyfills to be seen in the wild, however
// these rely on Mutation Events which only occur when an element is connected
// to the DOM. The algorithm used in this module does not use a connected element,
// and so we must ensure that a *native* MutationObserver is available.
var supportsNativeMutationObserver = isNative(window.MutationObserver);

/**
 * Create a debounced version of a method, that's asynchronously deferred
 * but called in the minimum time possible.
 *
 * @method
 * @memberof Popper.Utils
 * @argument {Function} fn
 * @returns {Function}
 */
var debounce = supportsNativeMutationObserver ? microtaskDebounce : taskDebounce;

/**
 * Get offsets to the popper
 * @method
 * @memberof Popper.Utils
 * @param {Element} popper - the popper element
 * @param {Element} reference - the reference element (the popper will be relative to this)
 * @returns {Object} An object containing the offsets which will be applied to the popper
 */
function getOffsets(state, popper, reference, placement) {
    placement = placement.split('-')[0];

    var popperOffsets = {};
    popperOffsets.position = state.position;

    var isParentFixed = popperOffsets.position === 'fixed';
    var isParentTransformed = state.isParentTransformed;

    //
    // Get reference element position
    //
    var offsetParent = getOffsetParent(isParentFixed && isParentTransformed ? reference : popper);
    var referenceOffsets = getOffsetRectRelativeToCustomParent(reference, offsetParent, isParentFixed, isParentTransformed);

    //
    // Get popper sizes
    //
    var popperRect = getOuterSizes(popper);

    //
    // Compute offsets of popper
    //

    // depending by the popper placement we have to compute its offsets slightly differently
    if (['right', 'left'].indexOf(placement) !== -1) {
        popperOffsets.top = referenceOffsets.top + referenceOffsets.height / 2 - popperRect.height / 2;
        if (placement === 'left') {
            popperOffsets.left = referenceOffsets.left - popperRect.width;
        } else {
            popperOffsets.left = referenceOffsets.right;
        }
    } else {
        popperOffsets.left = referenceOffsets.left + referenceOffsets.width / 2 - popperRect.width / 2;
        if (placement === 'top') {
            popperOffsets.top = referenceOffsets.top - popperRect.height;
        } else {
            popperOffsets.top = referenceOffsets.bottom;
        }
    }

    // Add width and height to our offsets object
    popperOffsets.width = popperRect.width;
    popperOffsets.height = popperRect.height;

    return {
        popper: popperOffsets,
        reference: referenceOffsets
    };
}

/**
 * Setup needed event listeners used to update the popper position
 * @method
 * @memberof Popper.Utils
 * @private
 */
function setupEventListeners(reference, options, state, updateBound) {
    // NOTE: 1 DOM access here
    state.updateBound = updateBound;
    window.addEventListener('resize', state.updateBound, { passive: true });
    // if the boundariesElement is window we don't need to listen for the scroll event
    if (options.boundariesElement !== 'window') {
        var target = getScrollParent(reference);
        // here it could be both `body` or `documentElement` thanks to Firefox, we then check both
        if (target === window.document.body || target === window.document.documentElement) {
            target = window;
        }
        target.addEventListener('scroll', state.updateBound, { passive: true });
        state.scrollElement = target;
    }
}

/**
 * Remove event listeners used to update the popper position
 * @method
 * @memberof Popper.Utils
 * @private
 */
function removeEventListeners(reference, state) {
    // NOTE: 1 DOM access here
    window.removeEventListener('resize', state.updateBound);
    if (state.scrollElement) {
        state.scrollElement.removeEventListener('scroll', state.updateBound);
    }
    state.updateBound = null;
    state.scrollElement = null;
    return state;
}

/**
 * Sorts the modifiers based on their `order` property
 * @method
 * @memberof Popper.Utils
 */
function sortModifiers(a, b) {
    if (a.order < b.order) {
        return -1;
    } else if (a.order > b.order) {
        return 1;
    }
    return 0;
}

/**
 * Helper used to know if the given modifier is enabled.
 * @method
 * @memberof Popper.Utils
 * @returns {Boolean}
 */
function isModifierEnabled(modifiers, modifierName) {
  return modifiers.some(function (_ref) {
    var name = _ref.name,
        enabled = _ref.enabled;
    return name === modifierName && enabled;
  });
}

/**
 * Set the attributes to the given popper
 * @method
 * @memberof Popper.Utils
 * @argument {Element} element - Element to apply the attributes to
 * @argument {Object} styles - Object with a list of properties and values which will be applied to the element
 */
function setAttributes(element, attributes) {
    Object.keys(attributes).forEach(function (prop) {
        var value = attributes[prop];
        if (value !== false) {
            element.setAttribute(prop, attributes[prop]);
        } else {
            element.removeAttribute(prop);
        }
    });
}

/**
 * Apply the computed styles to the popper element
 * @method
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} data.styles - List of style properties - values to apply to popper element
 * @argument {Object} data.attributes - List of attribute properties - values to apply to popper element
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The same data object
 */
function applyStyle(data) {
    // apply the final offsets to the popper
    // NOTE: 1 DOM access here
    var styles = {
        position: data.offsets.popper.position
    };

    var attributes = {
        'x-placement': data.placement
    };

    // round top and left to avoid blurry text
    var left = Math.round(data.offsets.popper.left);
    var top = Math.round(data.offsets.popper.top);

    // if gpuAcceleration is set to true and transform is supported, we use `translate3d` to apply the position to the popper
    // we automatically use the supported prefixed version if needed
    var prefixedProperty = getSupportedPropertyName('transform');
    if (data.instance.options.gpuAcceleration && prefixedProperty) {
        styles[prefixedProperty] = 'translate3d(' + left + 'px, ' + top + 'px, 0)';
        styles.top = 0;
        styles.left = 0;
    }
    // othwerise, we use the standard `left` and `top` properties
    else {
            styles.left = left;
            styles.top = top;
        }

    // any property present in `data.styles` will be applied to the popper,
    // in this way we can make the 3rd party modifiers add custom styles to it
    // Be aware, modifiers could override the properties defined in the previous
    // lines of this modifier!
    Object.assign(styles, data.styles);
    setStyles(data.instance.popper, styles);

    // any property present in `data.attributes` will be applied to the popper,
    // they will be set as HTML attributes of the element
    Object.assign(attributes, data.attributes);
    setAttributes(data.instance.popper, attributes);

    // if the arrow style has been computed, apply the arrow style
    if (data.offsets.arrow) {
        setStyles(data.arrowElement, data.offsets.arrow);
    }

    return data;
}

/**
 * Set the x-placement attribute before everything else because it could be used to add margins to the popper
 * margins needs to be calculated to get the correct popper offsets
 * @method
 * @memberof Popper.modifiers
 * @param {HTMLElement} reference - The reference element used to position the popper
 * @param {HTMLElement} popper - The HTML element used as popper.
 * @param {Object} options - Popper.js options
 */
function applyStyleOnLoad(reference, popper, options) {
    popper.setAttribute('x-placement', options.placement);
    return options;
}

/**
 * Modifier used to move the arrowEls on the edge of the popper to make sure them are always between the popper and the reference element
 * It will use the CSS outer size of the arrowEl element to know how many pixels of conjuction are needed
 * @method
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function arrow(data, options) {
    var arrowEl = options.element;

    // if the arrowElElement is a string, suppose it's a CSS selector
    if (typeof arrowEl === 'string') {
        arrowEl = data.instance.popper.querySelector(arrowEl);
    }

    // if arrowEl element is not found, don't run the modifier
    if (!arrowEl) {
        return data;
    }

    // the arrowEl element must be child of its popper
    if (!data.instance.popper.contains(arrowEl)) {
        console.warn('WARNING: `arrowElElement` must be child of its popper element!');
        return data;
    }

    // arrowEl depends on keepTogether in order to work
    if (!isModifierRequired(data.instance.modifiers, 'arrow', 'keepTogether')) {
        console.warn('WARNING: keepTogether modifier is required by arrow modifier in order to work, be sure to include it before arrow!');
        return data;
    }

    var arrowElStyle = {};
    var placement = data.placement.split('-')[0];
    var popper = getPopperClientRect(data.offsets.popper);
    var reference = data.offsets.reference;
    var isVertical = ['left', 'right'].indexOf(placement) !== -1;

    var len = isVertical ? 'height' : 'width';
    var side = isVertical ? 'top' : 'left';
    var altSide = isVertical ? 'left' : 'top';
    var opSide = isVertical ? 'bottom' : 'right';
    var arrowElSize = getOuterSizes(arrowEl)[len];

    //
    // extends keepTogether behavior making sure the popper and its reference have enough pixels in conjuction
    //

    // top/left side
    if (reference[opSide] - arrowElSize < popper[side]) {
        data.offsets.popper[side] -= popper[side] - (reference[opSide] - arrowElSize);
    }
    // bottom/right side
    if (reference[side] + arrowElSize > popper[opSide]) {
        data.offsets.popper[side] += reference[side] + arrowElSize - popper[opSide];
    }

    // compute center of the popper
    var center = reference[side] + reference[len] / 2 - arrowElSize / 2;

    // Compute the sideValue using the updated popper offsets
    var sideValue = center - getPopperClientRect(data.offsets.popper)[side];

    // prevent arrowEl from being placed not contiguously to its popper
    sideValue = Math.max(Math.min(popper[len] - arrowElSize, sideValue), 0);
    arrowElStyle[side] = sideValue;
    arrowElStyle[altSide] = ''; // make sure to remove any old style from the arrowEl

    data.offsets.arrow = arrowElStyle;
    data.arrowElement = arrowEl;

    return data;
}

/**
 * Get the opposite placement of the given one/
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement
 * @returns {String} flipped placement
 */
function getOppositePlacement(placement) {
  var hash = { left: 'right', right: 'left', bottom: 'top', top: 'bottom' };
  return placement.replace(/left|right|bottom|top/g, function (matched) {
    return hash[matched];
  });
}

/**
 * Get the opposite placement variation of the given one/
 * @method
 * @memberof Popper.Utils
 * @argument {String} placement variation
 * @returns {String} flipped placement variation
 */
function getOppositeVariation(variation) {
    if (variation === 'end') {
        return 'start';
    } else if (variation === 'start') {
        return 'end';
    }
    return variation;
}

/**
 * Modifier used to flip the placement of the popper when the latter is starting overlapping its reference element.
 * Requires the `preventOverflow` modifier before it in order to work.
 * **NOTE:** data.instance modifier will run all its previous modifiers everytime it tries to flip the popper!
 * @method
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function flip(data, options) {
    if (data.flipped && data.placement === data.originalPlacement) {
        // seems like flip is trying to loop, probably there's not enough space on any of the flippable sides
        return data;
    }

    var boundaries = getBoundaries(data.instance.popper, options.padding, options.boundariesElement);

    var placement = data.placement.split('-')[0];
    var placementOpposite = getOppositePlacement(placement);
    var variation = data.placement.split('-')[1] || '';

    var flipOrder = [];

    if (options.behavior === 'flip') {
        flipOrder = [placement, placementOpposite];
    } else {
        flipOrder = options.behavior;
    }

    flipOrder.forEach(function (step, index) {
        if (placement !== step || flipOrder.length === index + 1) {
            return data;
        }

        placement = data.placement.split('-')[0];
        placementOpposite = getOppositePlacement(placement);

        var popperOffsets = getPopperClientRect(data.offsets.popper);

        // using Math.floor because the reference offsets may contain decimals we are not going to consider here
        var flippedPosition = placement === 'left' && Math.floor(popperOffsets.left) < Math.floor(boundaries.left) || placement === 'right' && Math.floor(popperOffsets.right) > Math.floor(boundaries.right) || placement === 'top' && Math.floor(popperOffsets.top) < Math.floor(boundaries.top) || placement === 'bottom' && Math.floor(popperOffsets.bottom) > Math.floor(boundaries.bottom);

        // flip the variation if required
        var isVertical = ['top', 'bottom'].indexOf(placement) !== -1;
        var flippedVariation = !!options.flipVariations && (isVertical && variation === 'start' && Math.floor(popperOffsets.left) < Math.floor(boundaries.left) || isVertical && variation === 'end' && Math.floor(popperOffsets.right) > Math.floor(boundaries.right) || !isVertical && variation === 'start' && Math.floor(popperOffsets.top) < Math.floor(boundaries.top) || !isVertical && variation === 'end' && Math.floor(popperOffsets.bottom) > Math.floor(boundaries.bottom));

        if (flippedPosition || flippedVariation) {
            // this boolean to detect any flip loop
            data.flipped = true;

            if (flippedPosition) {
                placement = flipOrder[index + 1];
            }

            if (flippedVariation) {
                variation = getOppositeVariation(variation);
            }

            data.placement = placement + (variation ? '-' + variation : '');
            data.offsets.popper = getOffsets(data.instance.state, data.instance.popper, data.instance.reference, data.placement).popper;

            data = runModifiers(data.instance.modifiers, data, 'flip');
        }
    });
    return data;
}

/**
 * Modifier used to make sure the popper is always near its reference element
 * It cares only about the first axis, you can still have poppers with margin
 * between the popper and its reference element.
 * @method
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function keepTogether(data) {
    var popper = getPopperClientRect(data.offsets.popper);
    var reference = data.offsets.reference;
    var f = Math.floor;
    var placement = data.placement.split('-')[0];

    if (['top', 'bottom'].indexOf(placement) !== -1) {
        if (popper.right < f(reference.left)) {
            data.offsets.popper.left = f(reference.left) - popper.width;
        }
        if (popper.left > f(reference.right)) {
            data.offsets.popper.left = f(reference.right);
        }
    } else {
        if (popper.bottom < f(reference.top)) {
            data.offsets.popper.top = f(reference.top) - popper.height;
        }
        if (popper.top > f(reference.bottom)) {
            data.offsets.popper.top = f(reference.bottom);
        }
    }

    return data;
}

/**
 * Modifier used to add an offset to the popper, useful if you more granularity positioning your popper.
 * The offsets will shift the popper on the side of its reference element.
 * @method
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @argument {Number|String} options.offset=0
 *      Basic usage allows a number used to nudge the popper by the given amount of pixels.
 *      You can pass a percentage value as string (eg. `20%`) to nudge by the given percentage (relative to reference element size)
 *      Other supported units are `vh` and `vw` (relative to viewport)
 *      Additionally, you can pass a pair of values (eg. `10 20` or `2vh 20%`) to nudge the popper
 *      on both axis.
 *      A note about percentage values, if you want to refer a percentage to the popper size instead of the reference element size,
 *      use `%p` instead of `%` (eg: `20%p`). To make it clearer, you can replace `%` with `%r` and use eg.`10%p 25%r`.
 *      > **Heads up!** The order of the axis is relative to the popper placement: `bottom` or `top` are `X,Y`, the other are `Y,X`
 * @returns {Object} The data object, properly modified
 */
function offset(data, options) {
    var placement = data.placement;
    var popper = data.offsets.popper;

    var offsets = void 0;
    if (isNumeric(options.offset)) {
        offsets = [options.offset, 0];
    } else {
        // split the offset in case we are providing a pair of offsets separated
        // by a blank space
        offsets = options.offset.split(' ');

        // itherate through each offset to compute them in case they are percentages
        offsets = offsets.map(function (offset, index) {
            // separate value from unit
            var split = offset.match(/(\d*\.?\d*)(.*)/);
            var value = +split[1];
            var unit = split[2];

            // use height if placement is left or right and index is 0
            // otherwise use height
            // in this way the first offset will use an axis and the second one
            // will use the other one
            var useHeight = placement.indexOf('right') !== -1 || placement.indexOf('left') !== -1;

            if (index === 1) {
                useHeight = !useHeight;
            }

            // if is a percentage, we calculate the value of it using as base the
            // sizes of the reference element
            if (unit === '%' || unit === '%r') {
                var referenceRect = getPopperClientRect(data.offsets.reference);
                var len = void 0;
                if (useHeight) {
                    len = referenceRect.height;
                } else {
                    len = referenceRect.width;
                }
                return len / 100 * value;
            }
            // if is a percentage relative to the popper, we calculate the value of it using
            // as base the sizes of the popper
            else if (unit === '%p') {
                    var popperRect = getPopperClientRect(data.offsets.popper);
                    var _len = void 0;
                    if (useHeight) {
                        _len = popperRect.height;
                    } else {
                        _len = popperRect.width;
                    }
                    return _len / 100 * value;
                }
                // if is a vh or vw, we calculate the size based on the viewport
                else if (unit === 'vh' || unit === 'vw') {
                        var size = void 0;
                        if (unit === 'vh') {
                            size = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
                        } else {
                            size = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
                        }
                        return size / 100 * value;
                    }
                    // if is an explicit pixel unit, we get rid of the unit and keep the value
                    else if (unit === 'px') {
                            return +value;
                        }
                        // if is an implicit unit, it's px, and we return just the value
                        else {
                                return +offset;
                            }
        });
    }

    if (data.placement.indexOf('left') !== -1) {
        popper.top += offsets[0];
        popper.left -= offsets[1] || 0;
    } else if (data.placement.indexOf('right') !== -1) {
        popper.top += offsets[0];
        popper.left += offsets[1] || 0;
    } else if (data.placement.indexOf('top') !== -1) {
        popper.left += offsets[0];
        popper.top -= offsets[1] || 0;
    } else if (data.placement.indexOf('bottom') !== -1) {
        popper.left += offsets[0];
        popper.top += offsets[1] || 0;
    }
    return data;
}

/**
 * Modifier used to prevent the popper from being positioned outside the boundary.
 *
 * An scenario exists where the reference itself is not within the boundaries. We can
 * say it has "escaped the boundaries" — or just "escaped". In this case we need to
 * decide whether the popper should either:
 *
 * - detach from the reference and remain "trapped" in the boundaries, or
 * - if it should be ignore the boundary and "escape with the reference"
 *
 * When `escapeWithReference` is `true`, and reference is completely outside the
 * boundaries, the popper will overflow (or completely leave) the boundaries in order
 * to remain attached to the edge of the reference.
 *
 * @method
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function preventOverflow(data, options) {
    var boundariesElement = options.boundariesElement || getOffsetParent(data.instance.popper);
    var boundaries = getBoundaries(data.instance.popper, options.padding, boundariesElement);
    options.boundaries = boundaries;

    var order = options.priority;
    var popper = getPopperClientRect(data.offsets.popper);

    var check = {
        left: function left() {
            var left = popper.left;
            if (popper.left < boundaries.left && !shouldOverflowBoundary(data, options, 'left')) {
                left = Math.max(popper.left, boundaries.left);
            }
            return { left: left };
        },
        right: function right() {
            var left = popper.left;
            if (popper.right > boundaries.right && !shouldOverflowBoundary(data, options, 'right')) {
                left = Math.min(popper.left, boundaries.right - popper.width);
            }
            return { left: left };
        },
        top: function top() {
            var top = popper.top;
            if (popper.top < boundaries.top && !shouldOverflowBoundary(data, options, 'top')) {
                top = Math.max(popper.top, boundaries.top);
            }
            return { top: top };
        },
        bottom: function bottom() {
            var top = popper.top;
            if (popper.bottom > boundaries.bottom && !shouldOverflowBoundary(data, options, 'bottom')) {
                top = Math.min(popper.top, boundaries.bottom - popper.height);
            }
            return { top: top };
        }
    };

    order.forEach(function (direction) {
        data.offsets.popper = Object.assign(popper, check[direction]());
    });

    return data;
}

/**
 * Determine if the popper should overflow a boundary edge to stay together with the reference.
 */
function shouldOverflowBoundary(data, options, overflowDirection) {
    if (!options.escapeWithReference) {
        return false;
    }

    if (data.flipped && isSameAxis(data.originalPlacement, overflowDirection)) {
        return true;
    }

    if (!isSameAxis(data.originalPlacement, overflowDirection)) {
        return true;
    }

    return true;
}

/**
 * Determine if two placement values are on the same axis.
 */
function isSameAxis(a, b) {
    // placement syntax:
    //
    //     ( "top" | "right" | "bottom" | "left" ) ( "-start" | "" | "-end" )
    //     |------------- Direction -------------|
    //
    var aDirection = a.split('-')[0];
    var bDirection = b.split('-')[0];

    return aDirection === bDirection || aDirection === getOppositePlacement(b);
}

/**
 * Modifier used to shift the popper on the start or end of its reference element side
 * @method
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by `update` method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function shift(data) {
    var placement = data.placement;
    var basePlacement = placement.split('-')[0];
    var shiftvariation = placement.split('-')[1];

    // if shift shiftvariation is specified, run the modifier
    if (shiftvariation) {
        var reference = data.offsets.reference;
        var popper = getPopperClientRect(data.offsets.popper);

        var shiftOffsets = {
            y: {
                start: { top: reference.top },
                end: { top: reference.top + reference.height - popper.height }
            },
            x: {
                start: { left: reference.left },
                end: { left: reference.left + reference.width - popper.width }
            }
        };

        var axis = ['bottom', 'top'].indexOf(basePlacement) !== -1 ? 'x' : 'y';

        data.offsets.popper = Object.assign(popper, shiftOffsets[axis][shiftvariation]);
    }

    return data;
}

/**
 * Modifier used to hide the popper when its reference element is outside of the
 * popper boundaries. It will set an x-hidden attribute which can be used to hide
 * the popper when its reference is out of boundaries.
 * @method
 * @memberof Modifiers
 * @argument {Object} data - The data object generated by update method
 * @argument {Object} options - Modifiers configuration and options
 * @returns {Object} The data object, properly modified
 */
function hide(data) {
    if (!isModifierRequired(data.instance.modifiers, 'hide', 'preventOverflow')) {
        console.warn('WARNING: preventOverflow modifier is required by hide modifier in order to work, be sure to include it before hide!');
        return data;
    }

    var refRect = data.offsets.reference;
    var bound = data.instance.modifiers.filter(function (modifier) {
        return modifier.name === 'preventOverflow';
    })[0].boundaries;

    if (refRect.bottom < bound.top || refRect.left > bound.right || refRect.top > bound.bottom || refRect.right < bound.left) {
        // Avoid unnecessary DOM access if visibility hasn't changed
        if (data.hide === true) {
            return data;
        }

        data.hide = true;
        data.attributes['x-out-of-boundaries'] = '';
    } else {
        // Avoid unnecessary DOM access if visibility hasn't changed
        if (data.hide === false) {
            return data;
        }

        data.hide = false;
        data.attributes['x-out-of-boundaries'] = false;
    }

    return data;
}

/**
 * Modifiers are plugins used to alter the behavior of your poppers.
 * Popper.js uses a set of 7 modifiers to provide all the basic functionalities
 * needed by the library.
 *
 * Each modifier is an object containing several properties listed below.
 * @namespace Modifiers
 * @param {Object} modifier - Modifier descriptor
 * @param {Integer} modifier.order
 *      The `order` property defines the execution order of the modifiers.
 *      The built-in modifiers have orders with a gap of 100 units in between,
 *      this allows you to inject additional modifiers between the existing ones
 *      without having to redefine the order of all of them.
 *      The modifiers are executed starting from the one with the lowest order.
 * @param {Boolean} modifier.enabled - When `true`, the modifier will be used.
 * @param {Modifiers~modifier} modifier.function - Modifier function.
 * @param {Modifiers~onLoad} modifier.onLoad - Function executed on popper initalization
 * @return {Object} data - Each modifier must return the modified `data` object.
 */

var modifiersFunctions = {
  applyStyle: applyStyle,
  arrow: arrow,
  flip: flip,
  keepTogether: keepTogether,
  offset: offset,
  preventOverflow: preventOverflow,
  shift: shift,
  hide: hide
};

var modifiersOnLoad = {
  applyStyleOnLoad: applyStyleOnLoad
};

/**
 * Modifiers can edit the `data` object to change the beheavior of the popper.
 * This object contains all the informations used by Popper.js to compute the
 * popper position.
 * The modifier can edit the data as needed, and then `return` it as result.
 *
 * @callback Modifiers~modifier
 * @param {dataObject} data
 * @return {dataObject} modified data
 */

/**
 * The `dataObject` is an object containing all the informations used by Popper.js
 * this object get passed to modifiers and to the `onCreate` and `onUpdate` callbacks.
 * @name dataObject
 * @property {Object} data.instance The Popper.js instance
 * @property {String} data.placement Placement applied to popper
 * @property {String} data.originalPlacement Placement originally defined on init
 * @property {Boolean} data.flipped True if popper has been flipped by flip modifier
 * @property {Boolean} data.hide True if the reference element is out of boundaries, useful to know when to hide the popper.
 * @property {HTMLElement} data.arrowElement Node used as arrow by arrow modifier
 * @property {Object} data.styles Any CSS property defined here will be applied to the popper, it expects the JavaScript nomenclature (eg. `marginBottom`)
 * @property {Object} data.boundaries Offsets of the popper boundaries
 * @property {Object} data.offsets The measurements of popper, reference and arrow elements.
 * @property {Object} data.offsets.popper `top`, `left`, `width`, `height` values
 * @property {Object} data.offsets.reference `top`, `left`, `width`, `height` values
 * @property {Object} data.offsets.arro] `top` and `left` offsets, only one of them will be different from 0
 */

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();







var get = function get(object, property, receiver) {
  if (object === null) object = Function.prototype;
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent === null) {
      return undefined;
    } else {
      return get(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;

    if (getter === undefined) {
      return undefined;
    }

    return getter.call(receiver);
  }
};

















var set = function set(object, property, value, receiver) {
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent !== null) {
      set(parent, property, value, receiver);
    }
  } else if ("value" in desc && desc.writable) {
    desc.value = value;
  } else {
    var setter = desc.set;

    if (setter !== undefined) {
      setter.call(receiver, value);
    }
  }

  return value;
};

// Polyfills
// Utils
// Modifiers
// default options
var DEFAULTS = {
    // placement of the popper
    placement: 'bottom',

    // if true, it uses the CSS 3d transformation to position the popper
    gpuAcceleration: true,

    // list of functions used to modify the offsets before they are applied to the popper
    modifiers: {
        shift: {
            order: 100,
            enabled: true,
            function: modifiersFunctions.shift
        },
        offset: {
            order: 200,
            enabled: true,
            function: modifiersFunctions.offset,
            // nudges popper from its origin by the given amount of pixels (can be negative)
            offset: 0
        },
        preventOverflow: {
            order: 300,
            enabled: true,
            function: modifiersFunctions.preventOverflow,
            // popper will try to prevent overflow following these priorities
            //  by default, then, it could overflow on the left and on top of the boundariesElement
            priority: ['left', 'right', 'top', 'bottom'],
            // amount of pixel used to define a minimum distance between the boundaries and the popper
            // this makes sure the popper has always a little padding between the edges of its container
            padding: 5,
            boundariesElement: 'scrollParent'
        },
        keepTogether: {
            order: 400,
            enabled: true,
            function: modifiersFunctions.keepTogether
        },
        arrow: {
            order: 500,
            enabled: true,
            function: modifiersFunctions.arrow,
            // selector or node used as arrow
            element: '[x-arrow]'
        },
        flip: {
            order: 600,
            enabled: true,
            function: modifiersFunctions.flip,
            // the behavior used to change the popper's placement
            behavior: 'flip',
            // the popper will flip if it hits the edges of the boundariesElement - padding
            padding: 5,
            boundariesElement: 'viewport'
        },
        hide: {
            order: 700,
            enabled: true,
            function: modifiersFunctions.hide
        },
        applyStyle: {
            order: 800,
            enabled: true,
            function: modifiersFunctions.applyStyle,
            onLoad: modifiersOnLoad.applyStyleOnLoad
        }
    }
};

/**
 * Create a new Popper.js instance
 * @class Popper
 * @param {HTMLElement} reference - The reference element used to position the popper
 * @param {HTMLElement} popper - The HTML element used as popper.
 * @param {Object} options
 * @param {String} options.placement=bottom
 *      Placement of the popper accepted values: `top(-start, -end), right(-start, -end), bottom(-start, -right),
 *      left(-start, -end)`
 *
 * @param {Boolean} options.gpuAcceleration=true
 *      When this property is set to true, the popper position will be applied using CSS3 translate3d, allowing the
 *      browser to use the GPU to accelerate the rendering.
 *      If set to false, the popper will be placed using `top` and `left` properties, not using the GPU.
 *
 * @param {Number} options.boundariesPadding=5
 *      Additional padding for the boundaries
 *
 * @param {Boolean} options.removeOnDestroy=false
 *      Set to true if you want to automatically remove the popper when you call the `destroy` method.
 *
 * @param {Object} options.modifiers
 *      List of functions used to modify the data before they are applied to the popper (see source code for default values)
 *
 * @param {Object} options.modifiers.arrow - Arrow modifier configuration
 * @param {HTMLElement|String} options.modifiers.arrow.element='[x-arrow]'
 *      The DOM Node used as arrow for the popper, or a CSS selector used to get the DOM node. It must be child of
 *      its parent Popper. Popper.js will apply to the given element the style required to align the arrow with its
 *      reference element.
 *      By default, it will look for a child node of the popper with the `x-arrow` attribute.
 *
 * @param {Object} options.modifiers.offset - Offset modifier configuration
 * @param {Number} options.modifiers.offset.offset=0
 *      Amount of pixels the popper will be shifted (can be negative).
 *
 * @param {Object} options.modifiers.preventOverflow - PreventOverflow modifier configuration
 * @param {Array} [options.modifiers.preventOverflow.priority=['left', 'right', 'top', 'bottom']]
 *      Priority used when Popper.js tries to avoid overflows from the boundaries, they will be checked in order,
 *      this means that the last one will never overflow
 * @param {Number} options.modifiers.preventOverflow.padding=5
 *      Amount of pixel used to define a minimum distance between the boundaries and the popper
 *      this makes sure the popper has always a little padding between the edges of its container.
 *
 * @param {Object} options.modifiers.flip - Flip modifier configuration
 * @param {String|Array} options.modifiers.flip.behavior='flip'
 *      The behavior used by the `flip` modifier to change the placement of the popper when the latter is trying to
 *      overlap its reference element. Defining `flip` as value, the placement will be flipped on
 *      its axis (`right - left`, `top - bottom`).
 *      You can even pass an array of placements (eg: `['right', 'left', 'top']` ) to manually specify
 *      how alter the placement when a flip is needed. (eg. in the above example, it would first flip from right to left,
 *      then, if even in its new placement, the popper is overlapping its reference element, it will be moved to top)
 * @param {String|Element} options.modifiers.flip.boundariesElement='viewport'
 *      The element which will define the boundaries of the popper position, the popper will never be placed outside
 *      of the defined boundaries (except if `keepTogether` is enabled)
 *
 * @param {Number} options.modifiers.flip.padding=5
 *      Amount of pixel used to define a minimum distance between the boundaries and the popper
 *      this makes sure the popper has always a little padding between the edges of its container.
 *
 * @return {Object} instance - The generated Popper.js instance
 */

var Popper = function () {
    function Popper(reference, popper) {
        var _this = this;

        var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
        classCallCheck(this, Popper);
        this.Defaults = DEFAULTS;

        // make update() debounced, so that it only runs at most once-per-tick
        this.update = debounce(this.update.bind(this));
        // create a throttled version of update() that is scheduled based on UI updates
        this.scheduleUpdate = function () {
            return _this.scheduledUpdate = requestAnimationFrame(_this.update);
        };

        // init state
        this.state = {
            isDestroyed: false,
            isCreated: false
        };

        // get reference and popper elements (allow jQuery wrappers)
        this.reference = reference.jquery ? reference[0] : reference;
        this.popper = popper.jquery ? popper[0] : popper;

        // with {} we create a new object with the options inside it
        this.options = Object.assign({}, DEFAULTS, options);

        // refactoring modifiers' list (Object => Array)
        this.modifiers = Object.keys(DEFAULTS.modifiers).map(function (name) {
            return Object.assign({ name: name }, DEFAULTS.modifiers[name]);
        });

        // assign default values to modifiers, making sure to override them with
        // the ones defined by user
        this.modifiers = this.modifiers.map(function (defaultConfig) {
            var userConfig = options.modifiers && options.modifiers[defaultConfig.name] || {};
            var finalConfig = Object.assign({}, defaultConfig, userConfig);
            return finalConfig;
        });

        // add custom modifiers to the modifiers list
        if (options.modifiers) {
            this.options.modifiers = Object.assign({}, DEFAULTS.modifiers, options.modifiers);
            Object.keys(options.modifiers).forEach(function (name) {
                // take in account only custom modifiers
                if (DEFAULTS.modifiers[name] === undefined) {
                    var modifier = options.modifiers[name];
                    modifier.name = name;
                    _this.modifiers.push(modifier);
                }
            });
        }

        // sort the modifiers by order
        this.modifiers = this.modifiers.sort(sortModifiers);

        // modifiers have the ability to execute arbitrary code when Popper.js get inited
        // such code is executed in the same order of its modifier
        // they could add new properties to their options configuration
        // BE AWAARE: don't add options to `options.modifiers.name` but to `modifierOptions`!
        this.modifiers.forEach(function (modifier) {
            if (modifier.enabled && isFunction(modifier.onLoad)) {
                //              reference       popper       options       modifierOptions
                modifier.onLoad(_this.reference, _this.popper, _this.options, modifier);
            }
        });

        // get the popper position type
        this.state.position = getPosition(this.reference);

        // determine how we should set the origin of offsets
        this.state.isParentTransformed = isTransformed(this.popper.parentNode);

        // fire the first update to position the popper in the right place
        this.update();

        // setup event listeners, they will take care of update the position in specific situations
        setupEventListeners(this.reference, this.options, this.state, this.scheduleUpdate);

        // make it chainable
        return this;
    }

    //
    // Methods
    //

    /**
     * Updates the position of the popper, computing the new offsets and applying the new style
     * @method
     * @memberof Popper
     */


    createClass(Popper, [{
        key: 'update',
        value: function update() {
            var data = {
                instance: this,
                styles: {},
                attributes: {},
                flipped: false
            };

            // make sure to apply the popper position before any computation
            this.state.position = getPosition(this.reference);
            setStyles(this.popper, { position: this.state.position });

            // if popper is destroyed, don't perform any further update
            if (this.state.isDestroyed) {
                return;
            }

            // store placement inside the data object, modifiers will be able to edit `placement` if needed
            // and refer to originalPlacement to know the original value
            data.placement = this.options.placement;
            data.originalPlacement = this.options.placement;

            // compute the popper and reference offsets and put them inside data.offsets
            data.offsets = getOffsets(this.state, this.popper, this.reference, data.placement);

            // run the modifiers
            data = runModifiers(this.modifiers, data);

            // the first `update` will call `onCreate` callback
            // the other ones will call `onUpdate` callback
            if (!this.state.isCreated) {
                this.state.isCreated = true;
                if (isFunction(this.state.createCallback)) {
                    this.state.createCallback(data);
                }
            } else if (isFunction(this.state.updateCallback)) {
                this.state.updateCallback(data);
            }
        }

        /**
         * If a function is passed, it will be executed after the initialization of popper with as first argument the Popper instance.
         * @method
         * @memberof Popper
         * @param {createCallback} callback
         */

    }, {
        key: 'onCreate',
        value: function onCreate(callback) {
            // the createCallbacks return as first argument the popper instance
            this.state.createCallback = callback;
            return this;
        }

        /**
         * Callback called when the popper is created.
         * Access Popper.js instance with `data.instance`.
         * @callback createCallback
         * @static
         * @param {dataObject} data
         */

        /**
         * If a function is passed, it will be executed after each update of popper with as first argument the set of coordinates and informations
         * used to style popper and its arrow.
         * NOTE: it doesn't get fired on the first call of the `Popper.update()` method inside the `Popper` constructor!
         * @method
         * @memberof Popper
         * @param {updateCallback} callback
         */

    }, {
        key: 'onUpdate',
        value: function onUpdate(callback) {
            this.state.updateCallback = callback;
            return this;
        }

        /**
         * Callback called when the popper is updated, this callback is not called
         * on the initialization/creation of the popper, but only on subsequent
         * updates.
         * Access Popper.js instance with `data.instance`.
         * @callback updateCallback
         * @static
         * @param {dataObject} data
         */

        /**
         * Destroy the popper
         * @method
         * @memberof Popper
         */

    }, {
        key: 'destroy',
        value: function destroy() {
            this.state.isDestroyed = true;

            // touch DOM only if `applyStyle` modifier is enabled
            if (isModifierEnabled(this.modifiers, 'applyStyle')) {
                this.popper.removeAttribute('x-placement');
                this.popper.style.left = '';
                this.popper.style.position = '';
                this.popper.style.top = '';
                this.popper.style[getSupportedPropertyName('transform')] = '';
            }

            cancelAnimationFrame(this.scheduledUpdate);
            this.state = removeEventListeners(this.reference, this.state);

            // remove the popper if user explicity asked for the deletion on destroy
            // do not use `remove` because IE11 doesn't support it
            if (this.options.removeOnDestroy) {
                this.popper.parentNode.removeChild(this.popper);
            }
            return this;
        }

        /**
         * Collection of utilities useful when writing custom modifiers
         * @memberof Popper
         */


        /**
         * List of accepted placements to use as values of the `placement` option
         * @memberof Popper
         */


        /**
         * Default Popper.js options
         * @memberof Popper
         */

    }]);
    return Popper;
}();

Popper.Utils = Utils;
Popper.placements = ['top', 'top-start', 'top-end', 'right', 'right-start', 'right-end', 'bottom', 'bottom-start', 'bottom-end', 'left', 'left-start', 'left-end'];

return Popper;

})));
//# sourceMappingURL=popper.js.map
