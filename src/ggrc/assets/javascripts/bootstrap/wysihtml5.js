/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: brad@reciprocitylabs.com
    Maintained By: brad@reciprocitylabs.com
*/

(function ($) {
  'use strict';

  // Insert http:// before links
  var createLink = wysihtml5.commands.createLink;
  var old_exec = createLink.exec;
  var originalObserve = wysihtml5.views.Composer.prototype.observe;
  var browser = wysihtml5.browser;
  var handleUserInteraction = function (event) {
    this.parent.fire('beforeinteraction').fire('beforeinteraction:composer');
    setTimeout((function () {
      this.parent.fire('interaction').fire('interaction:composer');
    }).bind(this), 0);
  };
  var addListeners = function (target, events, callback) {
    var i = 0;
    var max = events.length;
    for (; i < max; i++) {
      target.addEventListener(events[i], callback, false);
    }
  };
  createLink.exec = function (composer, command, value) {
    var url = typeof (value) === 'object' ? value.href : value;

    // Inject the http:// if no prefix was included
    url = url.indexOf('//') > -1 ? url : 'http://' + url;

    // If there are multiple prefixes, remove the first http://
    // This can occur if the user pastes a URL without deleting the default "http://"
    if (url.match(/^http:\/\/.+?\/\//)) {
      url = url.replace(/^http:\/\//, '');
    }

    if (typeof (value) === 'object') {
      value.href = url;
    } else {
      value = url;
    }
    return old_exec.call(this, composer, command, value);
  };

  // Patch iframe issues
  // Sometimes the plugin will throw a "cannot read property document of null" error
  if (window.rangy) {
    rangy.addInitListener(function () {
      rangy.dom.getIframeDocument = function (iframeEl, no_recurse) {
        if (typeof iframeEl.contentDocument) {
          return iframeEl.contentDocument;
        } else if (typeof iframeEl.contentWindow) {
          return iframeEl.contentWindow.document;
        } else if (!no_recurse) {
          // Add the iframe to the DOM
          rangy.dom.getBody(document).appendChild(iframeEl);
          return rangy.dom.getIframeDocument(iframeEl, true);
        }
        throw new Error(
          'getIframeWindow: No Document object found for iframe element');
      };
      rangy.dom.getIframeWindow = function (iframeEl, no_recurse) {
        if (typeof iframeEl.contentWindow) {
          return iframeEl.contentWindow;
        } else if (typeof iframeEl.contentDocument) {
          return iframeEl.contentDocument.defaultView;
        } else if (!no_recurse) {
          // Add the iframe to the DOM
          rangy.dom.getBody(document).appendChild(iframeEl);
          return rangy.dom.getIframeWindow(iframeEl, true);
        }
        throw new Error(
          'getIframeWindow: No Window object found for iframe element');
      };
    });
  }

  // We took the implementation from https://github.com/Voog/wysihtml
  // We trigger events in fake textarea
  wysihtml5.views.Composer.prototype.observe = function () {
    var element = this.element;
    var focusBlurElement = browser.supportsEventsInIframeCorrectly() ?
      element : this.sandbox.getWindow();

    addListeners(focusBlurElement, ['focus', 'keyup'],
      handleUserInteraction.bind(this));
    return originalObserve.apply(this, arguments);
  };
})(window.jQuery);
