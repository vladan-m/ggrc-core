/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: brad@reciprocitylabs.com
    Maintained By: brad@reciprocitylabs.com
*/

(function (namespace, $, can) {

//chrome likes to cache AJAX requests for Mustaches.
var mustache_urls = {};
$.ajaxPrefilter(function ( options, originalOptions, jqXHR ) {
  if ( /\.mustache$/.test(options.url) ) {
    if (mustache_urls[options.url]) {
      options.url = mustache_urls[options.url];
    } else {
      mustache_urls[options.url] = options.url += "?r=" + Math.random();
    }
  }
});

function get_template_path(url) {
  var match;
  match = url.match(/\/static\/(mustache|mockups)\/(.*)\.mustache/);
  return match && match[2];
}

// Check if the template is available in "GGRC.Templates", and if so,
//   short-circuit the request.

$.ajaxTransport("text", function (options, _originalOptions, _jqXHR) {
  var template_path = get_template_path(options.url),
      template = template_path && GGRC.Templates[template_path];

  // Show template path in HTML comment before every use
  var path = '<!-- Template: ' + options.url.split('?')[0] + '-->';

  if (template) {
    return {
      send: function (headers, completeCallback) {
        function done() {
          if (template) {
            completeCallback(200, "success", { text: path+template });
          }
        }
        if (options.async) {
          //Use requestAnimationFrame where possible because we want
          // these to run as quickly as possible but still release
          // the thread.
          (window.requestAnimationFrame || window.setTimeout)(done, 0);
        } else {
          done();
        }
      },

      abort: function () {
        template = null;
      }
    };
  }
});

var quickHash = function (str, seed) {
  var bitval = seed || 1;
  str = str || "";
  for (var i = 0; i < str.length; i++)
  {
    bitval *= str.charCodeAt(i);
    bitval = Math.pow(bitval, 7);
    bitval %= Math.pow(7, 37);
  }
  return bitval;
};


var getParentNode = function (el, defaultParentNode) {
  return defaultParentNode && el.parentNode.nodeType === 11 ? defaultParentNode : el.parentNode;
};


function isExtendedFalsy(obj) {
  return !obj
    || (typeof obj === "object" && can.isEmptyObject(obj))
    || (obj.length != null && obj.length === 0)
    || (obj.serialize && can.isEmptyObject(obj.serialize()));
}

function preprocessClassString(str) {
  var ret = []
  , src = str.split(" ");

  for (var i = 0; i < src.length; i++) {
    var expr = src[i].trim();
    if (expr.charAt(0) === "=") {
      ret.push({ attr : src[i].trim().substr(1) });
    } else if (expr.indexOf(":") > -1) {
      var spl = expr.split(":");
      var arr = [];
      for (var j = 0; j < spl.length - 1; j ++) {
        var inverse = spl[j].trim()[0] === "!"
        , attr_name = spl[j].trim().substr(inverse ? 1 : 0);

        arr.push({attr : attr_name, inverse : inverse});
      }
      arr.value = spl[spl.length - 1];
      ret.push(arr);
    } else {
      ret.push(expr);
    }
  }
  return ret;
}

function buildClassString(arr, context) {
  var ret = [];
  for (var i = 0; i < arr.length; i++) {
    if (typeof arr[i] === "string") {
      ret.push(arr[i]);
    } else if (typeof arr[i] === "object" && arr[i].attr) {
      ret.push(can.getObject(arr[i].attr, context));
    } else if (can.isArray(arr[i]) && arr[i].value) {
      var p = true;
      for (var j = 0; j < arr[i].length; j ++) {
        var attr = can.getObject(arr[i][j].attr, context);
        if (arr[i][j].inverse ? !isExtendedFalsy(attr) : isExtendedFalsy(attr)) {
          p = false;
          break;
        }
      }
      if (p) {
        ret.push(arr[i].value);
      }
    } else {
      throw "Unsupported class building expression: " + JSON.stringify(arr[i]);
    }
  }

  return ret.join(" ");
}

Mustache.registerHelper("addclass", function (prefix, compute, options) {
  prefix = resolve_computed(prefix);
  var separator = 'separator' in (options.hash || {}) ? options.hash.separator : '-';
  return function (el) {
    var curClass = null
      , wasAttached = false
      , callback
      ;

    callback = function (_ev, newVal, _oldVal) {
      var nowAttached = $(el).closest('body').length > 0
        , newClass = null
        ;

      //  If we were once attached and now are not, unbind this callback.
      if (wasAttached && !nowAttached) {
        compute.unbind('change', callback);
        return;
      } else if (nowAttached && !wasAttached) {
        wasAttached = true;
      }
      if (newVal && newVal.toLowerCase) {
        newClass = prefix + newVal.toLowerCase().replace(/[\s\t]+/g, separator);
      }
      if (curClass) {
        $(el).removeClass(curClass);
        curClass = null;
      }
      if (newClass) {
        $(el).addClass(newClass);
        curClass = newClass;
      }
    };

    compute.bind('change', callback);
    callback(null, resolve_computed(compute));
  };
});

/**
  Add a live bound attribute to an element, avoiding buggy CanJS attribute interpolations.
  Usage:
  {{#withattr attrname attrvalue attrname attrvalue...}}<element/>{{/withattr}} to apply to the child element
  {{{withattr attrname attrvalue attrname attrvalue...}}} to apply to the parent element a la XSLT <xsl:attribute>. Note the triple braces!
  attrvalue can take mustache tokens, but they should be backslash escaped.
*/
Mustache.registerHelper("withattr", function () {
  var args = can.makeArray(arguments).slice(0, arguments.length - 1)
  , options = arguments[arguments.length - 1]
  , attribs = []
  , that = this.___st4ck ? this[this.length-1] : this
  , data = can.extend({}, that)
  , hash = quickHash(args.join("-"), quickHash(that._cid)).toString(36)
  , attr_count = 0;

  var hook = can.view.hook(function (el, parent, view_id) {
    var content = options.fn(that);

    if (content) {
      var frag = can.view.frag(content, parent);
      var $newel = $(frag.querySelector("*"));
      var newel = $newel[0];

      el.parentNode ? el.parentNode.replaceChild(newel, el) : $(parent).append($newel);
      el = newel;
    } else {
      //we are inside the element we want to add attrs to.
      var p = el.parentNode;
      p.removeChild(el);
      el = p;
    }

    function sub_all(el, ev, newVal, oldVal) {
      var $el = $(el);
      can.each(attribs, function (attrib) {
        $el.attr(attrib.name, $("<div>").html(can.view.render(attrib.value, data)).html());
      });
    }

    for (var i = 0; i < args.length - 1; i += 2) {
      var attr_name = args[i];
      var attr_tmpl = args[i + 1];
      //set up bindings where appropriate
      attr_tmpl = attr_tmpl.replace(/\{[^\}]*\}/g, function (match, offset, string) {
        var token = match.substring(1, match.length - 1);
        if (typeof data[token] === "function") {
          data[token].bind && data[token].bind("change." + hash, $.proxy(sub_all, that, el));
          data[token] = data[token].call(that);
        }

        that.bind && that.bind(token + "." + hash, $.proxy(sub_all, that, el));

        return "{" + match + "}";
      });
      can.view.mustache("withattr_" + hash + "_" + (++attr_count), attr_tmpl);
      attribs.push({name : attr_name, value : "withattr_" + hash + "_" + attr_count });
    }

    sub_all(el);

  });

  return "<div"
  + hook
  + " data-replace='true'/>";
});

Mustache.registerHelper("if_equals", function (val1, val2, options) {
  var that = this, _val1, _val2;
  function exec() {
    if (_val1 && val2 && options.hash && options.hash.insensitive) {
      _val1 = _val1.toLowerCase();
      _val2 = _val2.toLowerCase();
    }
    if (_val1 == _val2) return options.fn(options.contexts);
    else return options.inverse(options.contexts);
  }
    if (typeof val1 === "function") {
      if (val1.isComputed) {
        val1.bind("change", function (ev, newVal, oldVal) {
          _val1 = newVal;
          return exec();
        });
      }
      _val1 = val1.call(this);
    } else {
      _val1 = val1;
    }
    if (typeof val2 === "function") {
      if (val2.isComputed) {
        val2.bind("change", function (ev, newVal, oldVal) {
          _val2 = newVal;
          exec();
        });
      }
      _val2 = val2.call(this);
    } else {
      _val2 = val2;
    }

  return exec();
});

Mustache.registerHelper("if_match", function (val1, val2, options) {
  var that = this
  , _val1 = resolve_computed(val1)
  , _val2 = resolve_computed(val2);
  function exec() {
    var re = new RegExp(_val2);
    if (re.test(_val1)) return options.fn(options.contexts);
    else return options.inverse(options.contexts);
  }
  return exec();
});

Mustache.registerHelper("in_array", function (needle, haystack, options) {
  needle = resolve_computed(needle);
  haystack = resolve_computed(haystack);

  return options[~can.inArray(needle, haystack) ? "fn" : "inverse"](options.contexts);
});

Mustache.registerHelper("if_null", function (val1, options) {
  var that = this, _val1;
  function exec() {
    if (_val1 == null) return options.fn(that);
    else return options.inverse(that);
  }
    if (typeof val1 === "function") {
      if (val1.isComputed) {
        val1.bind("change", function (ev, newVal, oldVal) {
          _val1 = newVal;
          return exec();
        });
      }
      _val1 = val1.call(this);
    } else {
      _val1 = val1;
    }
  return exec();
});

  /**
   * Check if the given argument is a string and render the corresponding
   * block in the template.
   *
   * Example usage:
   *
   *   {{#if_string someValue}}
   *      {{someValue}} is a string
   *   {{else}}
   *     {{someValue}} is NOT a string
   *   {{/if_string}}
   *
   * @param {*} thing - the argument to check
   * @param {Object} options - a CanJS options argument passed to every helper
   *
   */
  Mustache.registerHelper('if_string', function (thing, options) {
    var resolved;

    if (arguments.length !== 2) {
      throw new Error(
        'Invalid number of arguments (' +
        (arguments.length - 1) +  // do not count the auto-provided options arg
        '), expected 1.');
    }

    resolved = Mustache.resolve(thing);

    if (_.isString(resolved)) {
      return options.fn(options.context);
    }

    return options.inverse(options.context);
  });

// Resolve and return the first computed value from a list
Mustache.registerHelper("firstexist", function () {
  var args = can.makeArray(arguments).slice(0, arguments.length - 1);  // ignore the last argument (some Can object)
  for (var i = 0; i < args.length; i++) {
    var v = resolve_computed(args[i]);
    if (v && v.length) {
      return v.toString();
    }
  }
  return "";
});

// Return the first value from a list that computes to a non-empty string
Mustache.registerHelper("firstnonempty", function () {
  var args = can.makeArray(arguments).slice(0, arguments.length - 1);  // ignore the last argument (some Can object)
  for (var i = 0; i < args.length; i++) {
    var v = resolve_computed(args[i]);
    if (v != null && !!v.toString().trim().replace(/&nbsp;|\s|<br *\/?>/g, "")) return v.toString();
  }
  return "";
});

Mustache.registerHelper("pack", function () {
  var options = arguments[arguments.length - 1];
  var objects = can.makeArray(arguments).slice(0, arguments.length - 1);
  var pack = {};
  can.each(objects, function (obj, i) {
      if (typeof obj === "function") {
        objects[i] = obj = obj();
      }

    if (obj._data) {
      obj = obj._data;
    }
    for (var k in obj) {
      if (obj.hasOwnProperty(k)) {
        pack[k] = obj[k];
      }
    }
  });
  if (options.hash) {
    for (var k in options.hash) {
      if (options.hash.hasOwnProperty(k)) {
        pack[k] = options.hash[k];
      }
    }
  }
  pack = new can.Observe(pack);
  return options.fn(pack);
});


Mustache.registerHelper("is_beta", function () {
  var options = arguments[arguments.length - 1];
  if ($(document.body).hasClass('BETA')) return options.fn(this);
  else return options.inverse(this);
});

Mustache.registerHelper("if_page_type", function (page_type, options) {
  var options = arguments[arguments.length - 1];
  if (window.location.pathname.split('/')[1] == page_type)
    return options.fn(this);
  else
    return options.inverse(this);
});

// Render a named template with the specified context, serialized and
// augmented by 'options.hash'
Mustache.registerHelper("render", function (template, context, options) {
  if (!options) {
    options = context;
    context = this;
  }

  if (typeof context === "function") {
    context = context();
  }

  if (typeof template === "function") {
    template = template();
  }

  context = $.extend({}, context.serialize ? context.serialize() : context);

  if (options.hash) {
    for (var k in options.hash) {
      if (options.hash.hasOwnProperty(k)) {
        context[k] = options.hash[k];
        if (typeof context[k] == "function")
          context[k] = context[k]();
      }
    }
  }

  var ret = can.view.render(template, context instanceof can.view.Scope ? context : new can.view.Scope(context));
  //can.view.hookup(ret);
  return ret;
});

// Like 'render', but doesn't serialize the 'context' object, and doesn't
// apply options.hash
Mustache.registerHelper("renderLive", function (template, context, options) {
  if (!options) {
    options = context;
    context = this;
  } else {
    options.contexts = options.contexts.add(context);
  }

  if (typeof context === "function") {
    context = context();
  }

  if (typeof template === "function") {
    template = template();
  }

  if (options.hash) {
    options.contexts = options.contexts.add(options.hash);
  }

  return can.view.render(template, options.contexts);
});

// Renders one or more "hooks", which are templates registered under a
//  particular key using GGRC.register_hook(), using the current context.
//  Hook keys can be composed with dot separators by passing in multiple
//  positional parameters.
//
// Example: {{{render_hooks 'Audit' 'test_info'}}}  renders all hooks registered
//  with GGRC.register_hook("Audit.test_info", <template path>)
Mustache.registerHelper("render_hooks", function () {
  var args = can.makeArray(arguments),
      options = args.splice(args.length - 1, 1)[0],
      hook = can.map(args, Mustache.resolve).join(".");

  return can.map(can.getObject(hook, GGRC.hooks) || [], function (hook_tmpl) {
    return can.Mustache.getHelper("renderLive", options.contexts).fn(hook_tmpl, options.contexts, options);
  }).join("\n");
});

// Checks whether any hooks are registered for a particular key
Mustache.registerHelper("if_hooks", function () {
  var args = can.makeArray(arguments),
      options = args.splice(args.length - 1, 1)[0],
      hook = can.map(args, Mustache.resolve).join(".");

  if ((can.getObject(hook, GGRC.hooks) || []).length > 0) {
    return options.fn(options.contexts);
  } else {
    return options.inverse(options.contexts);
  }
});

var defer_render = Mustache.defer_render = function defer_render(tag_prefix, funcs, deferred) {
  var hook
    , tag_name = tag_prefix.split(" ")[0]
    ;

  tag_name = tag_name || "span";

  if (typeof funcs === "function") {
    funcs = { done : funcs };
  }

  function hookup(element, parent, view_id) {
    var $element = $(element)
    , f = function () {
      var g = deferred && deferred.state() === "rejected" ? funcs.fail : funcs.done
        , args = arguments
        , term = element.nextSibling
        , compute = can.compute(function () { return g.apply(this, args) || ""; }, this)
        ;

      if (element.parentNode) {
        can.view.live.html(element, compute, parent);
      } else {
        $element.after(compute());
        if ($element.next().get(0)) {
          can.view.nodeLists.update($element.get(), $element.nextAll().get());
          $element.remove();
        }
      }
    };
    if (deferred) {
      deferred.done(f);
      if (funcs.fail) {
        deferred.fail(f);
      }
    }
    else
      setTimeout(f, 13);

    if (funcs.progress) {
      // You would think that we could just do $element.append(funcs.progress()) here
      //  but for some reason we have to hookup our own fragment.
      $element.append(can.view.hookup($("<div>").html(funcs.progress())).html());
    }
  }

  hook = can.view.hook(hookup);
  return ["<", tag_prefix, " ", hook, ">", "</", tag_name, ">"].join("");
};

Mustache.registerHelper("defer", function (prop, deferred, options) {
  var context = this;
  var tag_name;
  if (!options) {
    options = prop;
    prop = "result";
  }

  tag_name = (options.hash || {}).tag_name || "span";
  allow_fail = (options.hash || {}).allow_fail || false;

  deferred = resolve_computed(deferred);
  if (typeof deferred === "function") deferred = deferred();
  function finish(items) {
    var ctx = {};
    ctx[prop] = items;
    return options.fn(options.contexts.add(ctx));
  }
  function progress() {
    return options.inverse(options.contexts);
  }

  return defer_render(tag_name, { done: finish, fail: allow_fail ? finish : null, progress: progress }, deferred);
});

Mustache.registerHelper("allow_help_edit", function () {
  var options = arguments[arguments.length - 1];
  var instance = this && this.instance ? this.instance : options.context.instance;
  if (instance) {
    var action = instance.isNew() ? "create" : "update";
    if (Permission.is_allowed(action, "Help", null)) {
      return options.fn(this);
    } else {
      return options.inverse(this);
    }
  }
  return options.inverse(this);
});

Mustache.registerHelper("all", function (type, params, options) {
  var model = CMS.Models[type] || GGRC.Models[type]
  , $dummy_content = $(options.fn({}).trim()).first()
  , tag_name = $dummy_content.prop("tagName")
  , context = this.instance ? this.instance : this instanceof can.Model.Cacheable ? this : null
  , require_permission = ""
  , items_dfd, hook;

  if (!options) {
    options = params;
    params = {};
  } else {
    params = JSON.parse(resolve_computed(params));
  }
  if ("require_permission" in params) {
    require_permission = params.require_permission;
    delete params.require_permission;
  }

  function hookup(element, parent, view_id) {
    items_dfd.done(function (items) {
      var val
      , $parent = $(element.parentNode)
      , $el = $(element);
      items = can.map(items, function (item) {
        if (require_permission === "" || Permission.is_allowed(require_permission, type, item.context.id)) {
          return item;
        }
      });
      can.each(items, function (item) {
        $(can.view.frag(options.fn(item), parent)).appendTo(element.parentNode);
      });
      if ($parent.is("select")
        && $parent.attr("name")
        && context
      ) {
        val = context.attr($parent.attr("name"));
        if (val) {
          $parent.find("option[value=" + val + "]").attr("selected", true);
        } else {
          context.attr($parent.attr("name").substr(0, $parent.attr("name").lastIndexOf(".")), items[0] || null);
        }
      }
      $parent.parent().find(":data(spinner)").each(function (i, el) {
        var spinner = $(el).data("spinner");
        if (spinner) spinner.stop();
      });
      $el.remove();
      //since we are removing the original live bound element, replace the
      // live binding reference to it, with a reference to the new
      // child nodes. We assume that at least one new node exists.
      can.view.nodeLists.update($el.get(), $parent.children().get());
    });
    return element.parentNode;
  }

  if ($dummy_content.attr("data-view-id")) {
    can.view.hookups[$dummy_content.attr("data-view-id")] = hookup;
  } else {
    hook = can.view.hook(hookup);
    $dummy_content.attr.apply($dummy_content, can.map(hook.split('='), function (s) { return s.replace(/'|"| /, "");}));
  }

  items_dfd = model.findAll(params);
  return "<" + tag_name + " data-view-id='" + $dummy_content.attr("data-view-id") + "'></" + tag_name + ">";
});

can.each(["with_page_object_as", "with_current_user_as"], function (fname) {
  Mustache.registerHelper(fname, function (name, options) {
    if (!options) {
      options = name;
      name = fname.replace(/with_(.*)_as/, "$1");
    }
    var page_object = (fname === "with_current_user_as"
                       ? (CMS.Models.Person.findInCacheById(GGRC.current_user.id)
                          || CMS.Models.Person.model(GGRC.current_user))
                       : GGRC.page_instance()
                       );
    if (page_object) {
      var p = {};
      p[name] = page_object;
      options.contexts = options.contexts.add(p);
      return options.fn(options.contexts);
    } else {
      return options.inverse(options.contexts);
    }
  });
});

Mustache.registerHelper("iterate", function () {
  var i = 0, j = 0
  , args = can.makeArray(arguments).slice(0, arguments.length - 1)
  , options = arguments[arguments.length - 1]
  , step = options.hash && options.hash.step || 1
  , ctx = {}
  , ret = [];

  options.hash && options.hash.listen && Mustache.resolve(options.hash.listen);

  for (; i < args.length; i += step) {
    ctx.iterator = typeof args[i] === "string" ? new String(args[i]) : args[i];
    for (j = 0; j < step; j++) {
      ctx["iterator_" + j] = typeof args[i + j] === "string" ? new String(args[i + j]) : args[i + j];
    }
    ret.push(options.fn(options.contexts.add(ctx)));
  }

  return ret.join("");
});

// Iterate over a string by spliting it by a separator
Mustache.registerHelper("iterate_string", function (str, separator, options) {
  var i = 0, args, ctx = {}, ret = [];

  str = Mustache.resolve(str);
  separator = Mustache.resolve(separator);
  args = str.split(separator);
  for (; i < args.length; i += 1) {
    ctx.iterator = typeof args[i] === "string" ? new String(args[i]) : args[i];
    ret.push(options.fn(options.contexts.add(ctx)));
  }

  return ret.join("");
});

Mustache.registerHelper("is_private", function (options) {
  var context = this;
  if (options.isComputed) {
    context = resolve_computed(options);
    options = arguments[1];
  }
  if (context && context.attr('private')) {
    return options.fn(context);
  }
  return options.inverse(context);
});

Mustache.registerHelper("option_select", function (object, attr_name, role, options) {
  var selected_option = object.attr(attr_name)
    , selected_id = selected_option ? selected_option.id : null
    , options_dfd = CMS.Models.Option.for_role(role)
    , tabindex = options.hash && options.hash.tabindex
    , tag_prefix = 'select class="span12"'
    ;

  function get_select_html(options) {
    return [
        '<select class="span12" model="Option" name="' + attr_name + '"'
      ,   tabindex ? ' tabindex=' + tabindex : ''
      , '>'
      , '<option value=""'
      ,   !selected_id ? ' selected=selected' : ''
      , '>---</option>'
      , can.map(options, function (option) {
          return [
            '<option value="', option.id, '"'
          ,   selected_id == option.id ? ' selected=selected' : ''
          , '>'
          ,   option.title
          , '</option>'
          ].join('');
        }).join('\n')
      , '</select>'
    ].join('');
  }

  return defer_render(tag_prefix, get_select_html, options_dfd);
});

Mustache.registerHelper("category_select", function (object, attr_name, category_type, options) {
  var selected_options = object[attr_name] || [] //object.attr(attr_name) || []
    , selected_ids = can.map(selected_options, function (selected_option) {
        return selected_option.id;
      })
    , options_dfd = CMS.Models[category_type].findAll()
    , tab_index = options.hash && options.hash.tabindex
    , tag_prefix = 'select class="span12" multiple="multiple"'
    ;

  tab_index = typeof tab_index !== 'undefined' ? ' tabindex="' + tab_index + '"' : '';
  function get_select_html(options) {
    return [
        '<select class="span12" multiple="multiple"'
      ,   ' model="' + category_type + '"'
      ,   ' name="' + attr_name + '"'
      ,   tab_index
      , '>'
      , can.map(options, function (option) {
          return [
            '<option value="', option.id, '"'
          ,   selected_ids.indexOf(option.id) > -1 ? ' selected=selected' : ''
          , '>'
          ,   option.name
          , '</option>'
          ].join('');
        }).join('\n')
      , '</select>'
    ].join('');
  }

  return defer_render(tag_prefix, get_select_html, options_dfd);
});

Mustache.registerHelper("get_permalink_url", function () {
  return window.location.href;
});

Mustache.registerHelper("get_permalink_for_object", function (instance, options) {
  instance = resolve_computed(instance);
  if (!instance.viewLink) {
    return "";
  }
  return window.location.origin + instance.viewLink;
});

Mustache.registerHelper("get_view_link", function (instance, options) {
  function finish(link) {
    return "<a href=" + link + " target=\"_blank\"><i class=\"fa fa-long-arrow-right\"></i></a>";
  }
  instance = resolve_computed(instance);
  if (!instance.viewLink && !instance.get_permalink) {
    return "";
  }
  return defer_render("a", finish, instance.get_permalink());
});

Mustache.registerHelper("schemed_url", function (url) {
  var domain, max_label, url_split;

  url = Mustache.resolve(url);
  if (!url) {
    return;
  }

  if (!url.match(/^[a-zA-Z]+:/)) {
    url = (window.location.protocol === "https:" ? 'https://' : 'http://') + url;
  }

  // Make sure we can find the domain part of the url:
  url_split = url.split('/');
  if (url_split.length < 3) {
    return 'javascript://';
  }

  domain = url_split[2];
  max_label = _.max(domain.split('.').map(function(u) { return u.length; }));
  if (max_label > 63 || domain.length > 253) {
    // The url is invalid and might crash user's chrome tab
    return "javascript://";
  }
  return url;
});

function when_attached_to_dom(el, cb) {
  // Trigger the "more" toggle if the height is the same as the scrollable area
  el = $(el);
  return !function poll() {
    if (el.closest(document.documentElement).length) {
      cb();
    }
    else {
      setTimeout(poll, 100);
    }
  }();
}

Mustache.registerHelper("open_on_create", function (style) {
  return function (el) {
    when_attached_to_dom(el, function () {
      $(el).openclose("open");
    });
  };
});

Mustache.registerHelper("trigger_created", function () {
  return function (el) {
    when_attached_to_dom(el, function () {
      $(el).trigger("contentAttached");
    });
  };
});

Mustache.registerHelper("show_long", function () {
  return  [
      '<a href="javascript://" class="show-long"'
    , can.view.hook(function (el, parent, view_id) {
        el = $(el);

        var content = el.prevAll('.short');
        if (content.length) {
          return !function hide() {
            // Trigger the "more" toggle if the height is the same as the scrollable area
            if (el[0].offsetHeight) {
              if (content[0].offsetHeight === content[0].scrollHeight) {
                el.trigger('click');
              }
            }
            else {
              // If there is an open/close toggle, wait until "that" is triggered
              var root = el.closest('.tree-item')
                , toggle;
              if (root.length && !root.hasClass('item-open') && (toggle = root.find('.openclose')) && toggle.length) {
                // Listen for the toggle instead of timeouts
                toggle.one('click', function () {
                  // Delay to ensure all event handlers have fired
                  setTimeout(hide, 0);
                });
              }
              // Otherwise just detect visibility
              else {
                setTimeout(hide, 100);
              }
            }
          }();
        }
      })
    , ">...more</a>"
  ].join('');
});

Mustache.registerHelper('expose', function (options) {
  var frame = new can.Observe();
  if (options.hash) {
    can.each(options.hash, function (val, prop) {
      frame.attr(prop, Mustache.resolve(val));
    });
  }
  return options.fn(options.contexts.add(frame));
});

Mustache.registerHelper("using", function (options) {
  var refresh_queue = new RefreshQueue()
    , context
    , frame = new can.Observe()
    , args = can.makeArray(arguments)
    , i, arg;

  options = args.pop();
  context = options.contexts || this;

  if (options.hash) {
    for (i in options.hash) {
      if (options.hash.hasOwnProperty(i)) {
        arg = options.hash[i];
        arg = Mustache.resolve(arg);
        if (arg && arg.reify) {
          refresh_queue.enqueue(arg.reify());
          frame.attr(i, arg.reify());
        } else {
          frame.attr(i, arg);
        }
      }
    }
  }

  function finish() {
    return options.fn(options.contexts.add(frame));
  }

  return defer_render('span', finish, refresh_queue.trigger());
});

Mustache.registerHelper("with_mapping", function (binding, options) {
  var context = arguments.length > 2 ? resolve_computed(options) : this
    , frame = new can.Observe()
    , loader
    , stack;

  if (!context) // can't find an object to map to.  Do nothing;
    return;
  binding = Mustache.resolve(binding);
  loader = context.get_binding(binding);
  if (!loader)
    return;
  frame.attr(binding, loader.list);

  options = arguments[2] || options;

  function finish(list) {
    return options.fn(options.contexts.add(_.extend({}, frame, {results: list})));
  }
  function fail(error) {
    return options.inverse(options.contexts.add({error : error}));
  }

  return defer_render('span', { done : finish, fail : fail }, loader.refresh_instances());
});


Mustache.registerHelper("person_roles", function (person, scope, options) {
  var roles_deferred = new $.Deferred()
    , refresh_queue = new RefreshQueue()
    ;

  if (!options) {
    options = scope;
    scope = null;
  }

  person = Mustache.resolve(person);
  person = person.reify();
  refresh_queue.enqueue(person);
  // Force monitoring of changes to `person.user_roles`
  person.attr("user_roles");
  refresh_queue.trigger().then(function () {
    var user_roles = person.user_roles.reify()
      , user_roles_refresh_queue = new RefreshQueue()
      ;
    user_roles_refresh_queue.enqueue(user_roles);
    user_roles_refresh_queue.trigger().then(function () {
      var roles = can.map(
        can.makeArray(user_roles),
        function (user_role) {
          if (user_role.role) {
            return user_role.role.reify();
          }
        })
        , roles_refresh_queue = new RefreshQueue()
        ;
      roles_refresh_queue.enqueue(roles.splice());
      roles_refresh_queue.trigger().then(function () {
        roles = can.map(can.makeArray(roles), function (role) {
          if (!scope || new RegExp(scope).test(role.scope)) {
            return role;
          }
        });

        //  "Superuser" roles are determined from config
        //  FIXME: Abstraction violation
        if ((!scope || new RegExp(scope).test("System"))
            && GGRC.config.BOOTSTRAP_ADMIN_USERS
            && ~GGRC.config.BOOTSTRAP_ADMIN_USERS.indexOf(person.email)) {
          roles.unshift({
            permission_summary: "Superuser",
            name: "Superuser"
          });
        }
        roles_deferred.resolve(roles);
      });
    });
  });

  function finish(roles) {
    return options.fn({ roles: roles });
  }

  return defer_render('span', finish, roles_deferred);
});

Mustache.registerHelper("unmap_or_delete", function (instance, mappings) {
    instance = resolve_computed(instance);
    mappings = resolve_computed(mappings);
  if (mappings.indexOf(instance) > -1) {
    if (mappings.length == 1) {
      if (mappings[0] instanceof CMS.Models.Control)
        return "Unmap";
      else
        return "Delete";
    }
    else
      return "Unmap";// "Unmap and Delete"
  } else
    return "Unmap";
});

Mustache.registerHelper("with_direct_mappings_as",
    function (var_name, parent_instance, instance, options) {
  // Finds the mapping, if any, between `parent_object` and `instance`, then
  // renders the block with those mappings available in the scope as `var_name`

  parent_instance = Mustache.resolve(parent_instance);
  instance = Mustache.resolve(instance);

  if (!instance) {
      instance = [];
  } else if (typeof instance.length === "number") {
      instance = can.map(instance, function (inst) {
        return inst.instance ? inst.instance : inst;
      });
  } else if (instance.instance) {
      instance = [instance.instance];
  } else {
      instance = [instance];
  }

  var frame = new can.Observe();
  frame.attr(var_name, []);
  GGRC.all_local_results(parent_instance).then(function (results) {
    var instance_only = options.hash && options.hash.instances_only;
    can.each(results, function (result) {
      if (~can.inArray(result.instance, instance)) {
        frame.attr(var_name).push(instance_only ? result.instance : result);
      }
    });
  });

  return options.fn(options.contexts.add(frame));
});

Mustache.registerHelper("has_mapped_objects", function (selected, instance, options) {
  selected = resolve_computed(selected);
  instance = resolve_computed(instance);
  if (!selected.objects) {
    options.inverse(options.contexts);
  }
  var isMapped = _.some(selected.objects, function (el) {
        return el.id === instance.id && el.type === instance.type;
      });
  return options[isMapped ? "fn" : "inverse"](options.contexts);
});

Mustache.registerHelper("result_direct_mappings", function (bindings, parent_instance, options) {
  bindings = Mustache.resolve(bindings);
  bindings = resolve_computed(bindings);
  parent_instance = Mustache.resolve(parent_instance);
  var has_direct_mappings = false
    , has_external_mappings = false
    , mappings_type = ""
    , i
    ;

  if (bindings && bindings.length > 0) {
    for (i=0; i<bindings.length; i++) {
      if (bindings[i].instance && parent_instance
          && bindings[i].instance.reify() === parent_instance.reify())
        has_direct_mappings = true;
      else {
        has_external_mappings = true;
      }
    }
  }

  mappings_type = has_direct_mappings ?
      (has_external_mappings ? "Dir & Ext" : "Dir") : "Ext";
  options.context.mappings_type = mappings_type;

  return options.fn(options.contexts);
});

Mustache.registerHelper("if_result_has_extended_mappings", function (
    bindings, parent_instance, options) {
  //  Render the `true` / `fn` block if the `result` exists (in this list)
  //  due to mappings other than directly to the `parent_instance`.  Otherwise
  //  Render the `false` / `inverse` block.
  bindings = Mustache.resolve(bindings);
  bindings = resolve_computed(bindings);
  parent_instance = Mustache.resolve(parent_instance);
  var has_extended_mappings = false
    , i
    ;

  if (bindings && bindings.length > 0) {
    for (i=0; i<bindings.length; i++) {
      if (bindings[i].instance && parent_instance
          && bindings[i].instance.reify() !== parent_instance.reify())
        has_extended_mappings = true;
    }
  }

  if (has_extended_mappings)
    return options.fn(options.contexts);
  else
    return options.inverse(options.contexts);
});

Mustache.registerHelper("each_with_extras_as", function (name, list, options) {
  //  Iterate over `list` and render the provided block with additional
  //  variables available in the context, specifically to enable joining with
  //  commas and using "and" in the right place.
  //
  //  * `<name>`: Instead of rendering with the item as the current context,
  //      make the item available at the specified `name`
  //  * index
  //  * length
  //  * isFirst
  //  * isLast
  name = Mustache.resolve(name);
  list = Mustache.resolve(list);
  list = resolve_computed(list);
  var i
    , output = []
    , frame
    , length = list.length
    ;
  for (i=0; i<length; i++) {
    frame = {
      index : i
      , isFirst : i === 0
      , isLast : i === length - 1
      , isSecondToLast : i === length - 2
      , length : length
    };
    frame[name] = list[i];
    output.push(options.fn(new can.Observe(frame)));

    //  FIXME: Is this legit?  It seems necessary in some cases.
    //context = $.extend([], options.contexts, options.contexts.concat([frame]));
    //output.push(options.fn(context));
    // ...or...
    //contexts = options.contexts.concat([frame]);
    //contexts.___st4ck3d = true;
    //output.push(options.fn(contexts));
  }
  return output.join("");
});

Mustache.registerHelper("link_to_tree", function () {
  var args = [].slice.apply(arguments)
    , options = args.pop()
    , link = []
    ;

  args = can.map(args, Mustache.resolve);
  args = can.map(args, function (stub) { return stub.reify(); });
  link.push("#" + args[0].constructor.table_singular + "_widget");
  //  FIXME: Add this back when extended-tree-routing is enabled
  //for (i=0; i<args.length; i++)
  //  link.push(args[i].constructor.table_singular + "-" + args[i].id);
  return link.join("/");
});

/**
 *  Helper for rendering date or datetime values in current local time
 *
 *  @param {boolean} hideTime - if set to true, render date only
 *  @return {String} - date or datetime string in the following format:
 *    * date: MM/DD/YYYY),
 *    * datetime (MM/DD/YYYY hh:mm:ss [PM|AM] [local timezone])
 */
Mustache.registerHelper('date', function (date, hideTime) {
  return GGRC.Utils.formatDate(date, hideTime);
});

/**
 * Checks permissions.
 * Usage:
 *  {{#is_allowed ACTION [ACTION2 ACTION3...] RESOURCE_TYPE_STRING context=CONTEXT_ID}} content {{/is_allowed}}
 *  {{#is_allowed ACTION RESOURCE_INSTANCE}} content {{/is_allowed}}
 */
var allowed_actions = ["create", "read", "update", "delete", "view_object_page", "__GGRC_ADMIN__"];
Mustache.registerHelper("is_allowed", function () {
  var args = Array.prototype.slice.call(arguments, 0)
    , actions = []
    , resource
    , resource_type
    , context_unset = {}
    , context_id = context_unset
    , context_override
    , options = args[args.length-1]
    , passed = true
    ;

  // Resolve arguments
  can.each(args, function (arg, i) {
    while (typeof arg === 'function' && arg.isComputed) {
      arg = arg();
    }

    if (typeof arg === 'string' && can.inArray(arg, allowed_actions) > -1) {
      actions.push(arg);
    }
    else if (typeof arg === 'string') {
      resource_type = arg;
    }
    else if (typeof arg === 'object' && arg instanceof can.Model) {
      resource = arg;
    }
  });
  if (options.hash && options.hash.hasOwnProperty("context")) {
    context_id = options.hash.context;
    if (typeof context_id === 'function' && context_id.isComputed) {
      context_id = context_id();
    }
    if (context_id && typeof context_id === "object" && context_id.id) {
      // Passed in the context object instead of the context ID, so use the ID
      context_id = context_id.id;
    }
    //  Using `context=null` in Mustache templates, when `null` is not defined,
    //  causes `context_id` to be `""`.
    if (context_id === "" || context_id === undefined) {
      context_id = null;
    } else if (context_id === 'for' || context_id === 'any') {
      context_override = context_id;
      context_id = undefined;
    }
  }

  if (resource_type && context_id === context_unset) {
    throw new Error(
        "If `resource_type` is a string, `context` must be explicit");
  }
  if (actions.length === 0) {
    throw new Error(
        "Must specify at least one action");
  }

  if (resource) {
    resource_type = resource.constructor.shortName;
    context_id = resource.context ? resource.context.id : null;
  }

  // Check permissions
  can.each(actions, function (action) {
    if (resource && Permission.is_allowed_for(action, resource)) {
      passed = true;
      return;
    }
    if (context_id !== undefined) {
      passed = passed && Permission.is_allowed(action, resource_type, context_id);
    }
    if (passed && context_override === 'for' && resource) {
      passed = passed && Permission.is_allowed_for(action, resource);
    }
    else if (passed && context_override === 'any' && resource_type) {
      passed = passed && Permission.is_allowed_any(action, resource_type);
    }
  });

  return passed
    ? options.fn(options.contexts || this)
    : options.inverse(options.contexts || this)
    ;
});

Mustache.registerHelper('any_allowed', function (action, data, options) {
  var passed = [],
      hasPassed;
  data = resolve_computed(data);

  data.forEach(function (item) {
    passed.push(Permission.is_allowed_any(action, item.model_name));
  });
  hasPassed = passed.some(function (val) {
    return val;
  });
  return options[hasPassed ? 'fn' : 'inverse'](options.contexts || this);
});

Mustache.registerHelper('system_role', function (role, options) {
  role = role.toLowerCase();
  // If there is no user, it's same as No Access
  var user_role = (GGRC.current_user ? GGRC.current_user.system_wide_role : 'no access').toLowerCase();
      isValid = role === user_role;

  return options[isValid ? 'fn' : 'inverse'](options.contexts || this);
});

Mustache.registerHelper("is_allowed_all", function (action, instances, options) {
  var passed = true;

  action = resolve_computed(action);
  instances = resolve_computed(instances);

  can.each(instances, function (instance) {
    var resource_type
      , context_id
      , base_mappings = []
      ;

    if (instance instanceof GGRC.ListLoaders.MappingResult) {
      instance.walk_instances(function (inst, mapping) {
        if (can.reduce(mapping.mappings, function (a, b) { return a || (b.instance === true); }, false)) {
          base_mappings.push(inst);
        }
      });
    } else {
      base_mappings.push(instance);
    }

    can.each(base_mappings, function (instance) {
      resource_type = instance.constructor.shortName;
      context_id = instance.context ? instance.context.id : null;
      passed = passed && Permission.is_allowed(action, resource_type, context_id);
    });
  });

  if (passed)
    return options.fn(options.contexts || this);
  else
    return options.inverse(options.contexts || this);
});

Mustache.registerHelper("is_allowed_to_map", function (source, target, options) {
  //  For creating mappings, we only care if the user has update permission on
  //  source and/or target.
  //  - `source` must be a model instance
  //  - `target` can be the name of the target model or the target instance
  var target_type, resource_type, context_id, can_map;

  source = resolve_computed(source);
  target = resolve_computed(target);
  can_map = GGRC.Utils.allowed_to_map(source, target, options);

  if (can_map) {
    return options.fn(options.contexts || this);
  }
  return options.inverse(options.contexts || this);
});

function resolve_computed(maybe_computed, always_resolve) {
  return (typeof maybe_computed === "function"
    && (maybe_computed.isComputed || always_resolve)) ? resolve_computed(maybe_computed(), always_resolve) : maybe_computed;
}

Mustache.registerHelper("attach_spinner", function (spin_opts, styles) {
  spin_opts = Mustache.resolve(spin_opts);
  styles = Mustache.resolve(styles);
  spin_opts = typeof spin_opts === "string" ? JSON.parse(spin_opts) : {};
  styles = typeof styles === "string" ? styles : "";
  return function (el) {
    var spinner = new Spinner(spin_opts).spin();
    $(el).append($(spinner.el).attr("style", $(spinner.el).attr("style") + ";" + styles)).data("spinner", spinner);
  };
});

Mustache.registerHelper("determine_context", function (page_object, target) {
  if (page_object.constructor.shortName == "Program") {
    return page_object.context ? page_object.context.id : null;
  } else if (target.constructor.shortName == "Program") {
    return target.context ? target.context.id : null;
  }
  return page_object.context ? page_object.context.id : null;
});

Mustache.registerHelper("json_escape", function (obj, options) {
  var s = JSON.stringify("" + (resolve_computed(obj) || ""));
  return s.substr(1, s.length - 2);
  /*return (""+(resolve_computed(obj) || ""))
    .replace(/\\/g, '\\')
    .replace(/"/g, '\\"')
    //  FUNFACT: JSON does not allow wrapping strings with single quotes, and
    //    thus does not allow backslash-escaped single quotes within strings.
    //    E.g., make sure attributes use double quotes, or use character
    //    entities instead -- but these aren't replaced by the JSON parser, so
    //    the output is not identical to input (hence, not using them now.)
    //.replace(/'/g, "\\'")
    //.replace(/"/g, '&#34;').replace(/'/g, "&#39;")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\u2028/g, "\\u2028") // Line separator
    .replace(/\u2029/g, "\\u2029") // Paragraph separator
    .replace(/\t/g, "\\t")
    .replace(/[\b]/g, "\\b")
    .replace(/\f/g, "\\f")
    .replace(/\v/g, "\\v");
  */
});

can.each({
  "localize_date" : "MM/DD/YYYY"
  , "localize_datetime" : "MM/DD/YYYY hh:mm:ss A"
}, function (tmpl, fn) {
  Mustache.registerHelper(fn, function (date, options) {
    if (!options) {
      date = new Date();
    } else {
      date = resolve_computed(date);
    }
    return date ? moment(date).format(tmpl) : "";
  });
});

Mustache.registerHelper("capitalize", function (value, options) {
  value = resolve_computed(value) || "";
  return can.capitalize(value);
});

Mustache.registerHelper("lowercase", function (value, options) {
  value = resolve_computed(value) || "";
  return value.toLowerCase();
});

Mustache.registerHelper("assignee_types", function (value, options) {
  value = resolve_computed(value) || "";
  value = _.first(_.map(value.split(","), function (type) {
    return _.trim(type).toLowerCase();
  }));
  return _.isEmpty(value) ? "none" : value;
});

Mustache.registerHelper("local_time_range", function (value, start, end, options) {
  var tokens = [];
  var sod;
  value = resolve_computed(value) || undefined;
  //  Calculate "start of day" in UTC and offsets in local timezone
  sod = moment(value).startOf("day").utc();
  start = moment(value).startOf("day").add(moment(start, "HH:mm").diff(moment("0", "Y")));
  end = moment(value).startOf("day").add(moment(end, "HH:mm").diff(moment("0", "Y")));

  function selected(time) {
    if (time
      && value
      && time.hours() === value.getHours()
      && time.minutes() === value.getMinutes()
    ) {
      return " selected='true'";
    } else {
      return "";
    }
  }

  while(start.isBefore(end) || start.isSame(end)) {
    tokens.push("<option value='", start.diff(sod), "'", selected(start), ">", start.format("hh:mm A"), "</option>\n");
    start.add(1, "hour");
  }
  return new Mustache.safeString(tokens.join(""));
});

Mustache.registerHelper("mapping_count", function (instance) {
  var args = can.makeArray(arguments)
    , mappings = args.slice(1, args.length - 1)
    , options = args[args.length-1]
    , root = options.contexts.attr('__mapping_count')
    , refresh_queue = new RefreshQueue()
    , mapping
    , dfd
    ;
  instance = resolve_computed(args[0]);

  // Find the most appropriate mapping
  for (var i = 0; i < mappings.length; i++) {
    if (instance.get_binding(mappings[i])) {
      mapping = mappings[i];
      break;
    }
  }

  if (!root) {
    root = new can.Observe();
    get_observe_context(options.contexts).attr("__mapping_count", root);
  }

  function update() {
    return options.fn(''+root.attr(mapping).attr('length'));
  }

  if (!mapping) {
    return "";
  }

  if (!root[mapping]) {
    root.attr(mapping, new can.Observe.List());
    root.attr(mapping).attr('loading', true);
    refresh_queue.enqueue(instance);
    dfd = refresh_queue.trigger()
      .then(function (instances) { return instances[0]; })
      .done(function (refreshed_instance) {
        if (refreshed_instance && refreshed_instance.get_binding(mapping)) {
          refreshed_instance.get_list_loader(mapping).done(function (list) {
            root.attr(mapping, list);
          });
        }
        else
          root.attr(mapping).attr('loading', false);
    });
  }

  var ret = defer_render('span', { done : update, progress : function () { return options.inverse(options.contexts); } }, dfd);
  return ret;
});

Mustache.registerHelper("visibility_delay", function (delay, options) {
  delay = resolve_computed(delay);

  return function (el) {
    setTimeout(function () {
      if ($(el.parentNode).is(':visible')) {
        $(el).append(options.fn(options.contexts));
      }
        can.view.hookup($(el).children());  // FIXME dubious indentation - was this intended to be in the 'if'?
    }, delay);
    return el;
  };
});


Mustache.registerHelper("with_program_roles_as", function (
      var_name, result, options) {
  var dfd = $.when()
    , frame = new can.Observe()
    , user_roles = []
    , mappings
    , refresh_queue = new RefreshQueue()
    ;

  result = resolve_computed(result);
  mappings = resolve_computed(result.get_mappings_compute());

  frame.attr("roles", []);

  can.each(mappings, function (mapping) {
    if (mapping instanceof CMS.Models.UserRole) {
      refresh_queue.enqueue(mapping.role);
    }
  });

  dfd = refresh_queue.trigger().then(function (roles) {
    can.each(mappings, function (mapping) {
      if (mapping instanceof CMS.Models.UserRole) {
        frame.attr("roles").push({
          user_role: mapping,
          role: mapping.role.reify()
        });
      } else {
        frame.attr("roles").push({
          role: {
            "permission_summary": "Mapped"
          }
        });
      }
    });
  });

  function finish(list) {
    return options.fn(options.contexts.add(frame));
  }
  function fail(error) {
    return options.inverse(options.contexts.add({error : error}));
  }

  return defer_render('span', { done : finish, fail : fail }, dfd);
});


// Determines and serializes the roles for a user
var program_roles;
Mustache.registerHelper("infer_roles", function (instance, options) {
  instance = resolve_computed(instance);
  var state = options.contexts.attr("__infer_roles")
    , page_instance = GGRC.page_instance()
    , person = page_instance instanceof CMS.Models.Person ? page_instance : null
    , init_state = function () {
        if (!state.roles) {
          state.attr({
            status: 'loading'
            , count: 0
            , roles: new can.Observe.List()
          });
        }
      }
    ;

  if (!state) {
    state = new can.Observe();
    options.context.attr("__infer_roles", state);
  }

  if (!state.attr('status')) {
    if (person) {
      init_state();

      // Check whether current user is audit lead (for audits) or contact (for everything else)
      if (instance.contact && instance.contact.id === person.id) {
        if (instance instanceof CMS.Models.Audit) {
          state.attr('roles').push('Audit Lead');
        } else {
          state.attr('roles').push('Contact');
        }
      }

      // Check for Audit roles
      if (instance instanceof CMS.Models.Audit) {
        var requests = instance.requests || new can.Observe.List()
          , refresh_queue = new RefreshQueue()
          ;

        refresh_queue.enqueue(requests.reify());
        refresh_queue.trigger().then(function (requests) {
          can.each(requests, function (request) {
            if (request.assignee && request.assignee.id === person.id
                && !~can.inArray('Request Assignee', state.attr('roles'))) {
              state.attr('roles').push('Request Assignee');
            };
          });
        });
      }

      // Check for assessor roles
      if (instance.attr('principal_assessor') && instance.principal_assessor.id === person.id) {
        state.attr('roles').push('Principal Assessor');
      }
      if (instance.attr('secondary_assessor') && instance.secondary_assessor.id === person.id) {
        state.attr('roles').push('Secondary Assessor');
      }

      // Check for people
      if (instance.people && ~can.inArray(person.id, $.map(instance.people, function (person) { return person.id; }))) {
        state.attr('roles').push('Mapped');
      }

      if (instance instanceof CMS.Models.Audit) {
        $.when(
          instance.reify().get_binding('authorizations').refresh_list(),
          instance.findAuditors()
        ).then(function (authorizations, auditors) {
          if (~can.inArray(person.id, $.map(auditors, function (p) { return p.person.id; }))) {
            state.attr('roles').push('Auditor');
          }
          authorizations.bind("change", function () {
            state.attr('roles', can.map(state.attr('roles'), function (role) {
              if (role != 'Auditor')
                return role;
            }));
            instance.findAuditors().then(function (auds) {
              if (~can.inArray(person.id, $.map(auds, function (p) { return p.person.id; }))) {
                state.attr('roles').push('Auditor');
              }
            });
          });
        });
      }

      // Check for ownership
      if (instance.owners && ~can.inArray(person.id, $.map(instance.owners, function (person) { return person.id; }))) {// && !~can.inArray("Auditor", state.attr('roles'))) {
        state.attr('roles').push('Owner');
      }

      // Check for authorizations
      if (instance instanceof CMS.Models.Program && instance.context && instance.context.id) {
        person.get_list_loader("authorizations").done(function (authorizations) {
          authorizations = can.map(authorizations, function (auth) {
            if (auth.instance.context && auth.instance.context.id === instance.context.id) {
              return auth.instance;
            }
          });
          !program_roles && (program_roles = CMS.Models.Role.findAll({ scope__in: "Private Program,Audit" }));
          program_roles.done(function (roles) {
            can.each(authorizations, function (auth) {
              var role = CMS.Models.Role.findInCacheById(auth.role.id);
              if (role) {
                state.attr('roles').push(role.name);
              }
            });
          });
        });
      }
    }
    // When we're not on a profile page
    else {
      // Check for ownership
      if (instance.owners && ~can.inArray(GGRC.current_user.id, $.map(instance.owners, function (person) { return person.id; }))) {
        init_state();
        state.attr('roles').push('Yours');
      }
    }
  }

  // Return the result
  if (!state.attr('roles') || state.attr('status') === 'failed') {
    return '';
  }
  else if (state.attr('roles').attr('length') === 0 && state.attr('status') === 'loading') {
    return options.inverse(options.contexts);
  }
  else {
    if (state.attr('roles').attr('length')) {
      return options.fn(options.contexts.add(state.attr('roles').join(', ')));
    }
  }
});

function get_observe_context(scope) {
  if (!scope) return null;
  if (scope._context instanceof can.Observe) return scope._context;
  return get_observe_context(scope._parent);
}

// Uses search to find the counts for a model type
Mustache.registerHelper("global_count", function (model_type, options) {
  model_type = resolve_computed(model_type);
  var state = options.contexts.attr("__global_count")
    ;

  if (!state) {
    state = new can.Observe();
    get_observe_context(options.contexts).attr("__global_count", state);
  }

  if (!state.attr('status')) {
    state.attr('status', 'loading');

    if (!GGRC._search_cache_deferred) {
      //  TODO: This should really be RefreshQueue-style
      var models = [
          "Program", "Regulation", "Contract", "Policy", "Standard"
        , "Section", "Objective", "Control"
        , "System", "Process"
        , "DataAsset", "Product", "Project", "Facility", "OrgGroup"
        , "Audit", "AccessGroup"
        ];
      GGRC._search_cache_deferred = GGRC.Models.Search.counts_for_types(null, models);
    }

    var model = CMS.Models[model_type]
      , update_count = function (ev, instance) {
          if (!instance || instance instanceof model) {
            GGRC._search_cache_deferred.then(function (result) {
              if (!result.counts.hasOwnProperty(model_type)) {
                return GGRC.Models.Search.counts_for_types(null, [model_type]);
              }
              else {
                return result;
              }
            }).then(function (result) {
              state.attr({
                  status: 'loaded'
                , count: result.counts[model_type]
              });
            });
          }
        }
      ;

    update_count();
    if (model) {
      model.bind('created', update_count);
      model.bind('destroyed', update_count);
    }
  }

  // Return the result
  if (state.attr('status') === 'failed') {
    return '';
  }
  else if (state.attr('status') === 'loading' || state.attr('count') === undefined) {
    return options.inverse(options.contexts);
  }
  else {
    return options.fn(state.attr('count'));
  }
});

Mustache.registerHelper("is_dashboard", function (options) {
  if (/dashboard/.test(window.location))
    return options.fn(options.contexts);
  else
    return options.inverse(options.contexts);
});

Mustache.registerHelper("is_allobjectview", function (options) {
  if (/objectBrowser/.test(window.location))
    return options.fn(options.contexts);
  else
    return options.inverse(options.contexts);
});

Mustache.registerHelper("is_dashboard_or_all", function (options) {
  if (/dashboard/.test(window.location) || /objectBrowser/.test(window.location))
    return options.fn(options.contexts);
  else
    return options.inverse(options.contexts);
});

Mustache.registerHelper("is_profile", function (parent_instance, options) {
  var instance;
  if (options)
    instance = resolve_computed(parent_instance);
  else
    options = parent_instance;

  if (GGRC.page_instance() instanceof CMS.Models.Person && (!instance || instance.constructor.shortName !== 'DocumentationResponse'))
    return options.fn(options.contexts);
  else
    return options.inverse(options.contexts);
});

Mustache.registerHelper("is_parent_of_type", function (type_options, options) {
  /*
  Determines if parent instance is of specified type.
  Input:   type_options = 'TypeA,TypeB,TypeC'
  Returns: Boolean
  */
  var types = type_options.split(","),
      parent = GGRC.page_instance(),
      parent_type = parent.type;

  if ($.inArray(parent_type, types) !== -1) {
    return options.fn(options.contexts);
  }
  return options.inverse(options.contexts);
});

Mustache.registerHelper("current_user_is_admin", function (options) {
  if (Permission.is_allowed("__GGRC_ADMIN__")) {
  return options.fn(options.contexts);
  }
  return options.inverse(options.contexts);
});

Mustache.registerHelper("owned_by_current_user", function (instance, options) {
  var current_user_id = GGRC.current_user.id;
  instance = Mustache.resolve(instance);
  owners = instance.attr('owners');
  if (owners) {
    for (var i = 0; i < owners.length; i++) {
      if (current_user_id == owners[i].id) {
        return options.fn(options.contexts);
      }
    }
  }
  return options.inverse(options.contexts);
});

Mustache.registerHelper("current_user_is_contact", function (instance, options) {
  var current_user_id = GGRC.current_user.id;
  instance = Mustache.resolve(instance);
  var contact = instance.contact;
  if (current_user_id == contact.id) {
    return options.fn(options.contexts);
  } else {
    return options.inverse(options.contexts);
  }
});

Mustache.registerHelper("last_approved", function (instance, options) {
  var loader, frame = new can.Observe();
  instance = Mustache.resolve(instance);
  loader = instance.get_binding("approval_tasks");

  frame.attr(instance, loader.list);
  function finish(list) {
    var item;
    list = list.serialize();
    if (list.length > 1) {
      var biggest = Math.max.apply(Math, list.map(function (item) {
            return item.instance.id;
          }));
      item = list.filter(function (item) {
        return item.instance.id === biggest;
      });
    }
    item = item ? item[0] : list[0];
    return options.fn(item ? item : options.contexts);
  }
  function fail(error) {
    return options.inverse(options.contexts.add({error: error}));
  }

  return defer_render("span", {done: finish, fail: fail}, loader.refresh_instances());
});

Mustache.registerHelper("with_is_reviewer", function (review_task, options) {
  review_task = Mustache.resolve(review_task);
  var current_user_id = GGRC.current_user.id;
  var is_reviewer = review_task &&
      (current_user_id == review_task.contact.id ||
      Permission.is_allowed("__GGRC_ADMIN__"));
  return options.fn(options.contexts.add({is_reviewer: is_reviewer}));
});

Mustache.registerHelper("with_review_task", function (options) {
  var tasks = options.contexts.attr('approval_tasks');
  tasks = Mustache.resolve(tasks);
  if (tasks) {
    for (var i = 0; i < tasks.length; i++) {
      return options.fn(options.contexts.add({review_task: tasks[i].instance}));
    }
  }
  return options.fn(options.contexts.add({review_task: undefined}));
});

Mustache.registerHelper("default_audit_title", function (instance, options) {
  var index,
      program,
      default_title,
      current_title,
      title;

  instance = Mustache.resolve(instance);
  program = instance.attr("program");

  if (!instance._transient) {
    instance.attr("_transient", new can.Observe({}));
  }

  if (program == null) {
    // Mark the title to be populated when computed_program is defined,
    // returning an empty string here would disable the save button.
    instance.attr("title", "");
    instance.attr("_transient.default_title", instance.title);
    return;
  }
  if (instance._transient.default_title !== instance.title) {
    return;
  }

  program = program.reify();
  new RefreshQueue().enqueue(program).trigger().then(function () {
    title = (new Date()).getFullYear() + ": " + program.title + " - Audit";
    default_title = title;

    GGRC.Models.Search.counts_for_types(title, ["Audit"]).then(function (result) {
      // Next audit index should be bigger by one than previous, we have unique name policy
      index = result.getCountFor("Audit") + 1;
      title = title + " " + index;
      instance.attr("title", title);
      // this needs to be different than above, otherwise CanJS throws a strange error
      instance.attr("_transient", {default_title: instance.title});
    });
  });
});

Mustache.registerHelper('param_current_location', function () {
  return GGRC.current_url_compute();
});

Mustache.registerHelper("sum", function () {
  var sum = 0;
  for (var i = 0; i < arguments.length - 1; i++) {
    sum += parseInt(resolve_computed(arguments[i]), 10);
  }
  return ''+sum;
});

Mustache.registerHelper("to_class", function (prop, delimiter, options) {
  prop = resolve_computed(prop) || "";
  delimiter = (arguments.length > 2 && resolve_computed(delimiter)) || '-';
  return prop.toLowerCase().replace(/[\s\t]+/g, delimiter);
});

/*
  Evaluates multiple helpers as if they were a single condition

  Each new statement is begun with a newline-prefixed string. The type of logic
  to apply as well as whether it should be a truthy or falsy evaluation may also
  be included with the statement in addition to the helper name.

  Currently, if_helpers only supports Disjunctive Normal Form. All "and" statements are grouped,
  groups are split by "or" statements.

  All hash arguments (some_val=37) must go in the last line and should be prefixed by the
  zero-based index of the corresponding helper. This is necessary because all hash arguments
  are required to be the final arguments for a helper. Here's an example:
    _0_some_val=37 would pass some_val=37 to the first helper.

  Statement syntax:
    '\
    [LOGIC] [TRUTHY_FALSY]HELPER_NAME' arg1 arg2 argN

  Defaults:
    LOGIC = and (accepts: and or)
    TRUTHY_FALSEY = # (accepts: # ^)
    HELPER_NAME = some_helper_name

  Example:
    {{#if_helpers '\
      #if_match' page_object.constructor.shortName 'Project' '\
      and ^if_match' page_object.constructor.shortName 'Audit|Program|Person' '\
    ' _1_hash_arg_for_second_statement=something}}
      matched all conditions
    {{else}}
      failed
    {{/if_helpers}}

  FIXME: Only synchronous helpers (those which call options.fn() or options.inverse()
    without yielding the thread through defer_render or otherwise) can currently be used
    with if_helpers.  if_helpers should support all helpers by changing the walk through
    conjunctions and disjunctions to one using a can.reduce(Array, function (Deferred, item) {}, $.when())
    pattern instead of can.reduce(Array, function (Boolean, item) {}, Boolean) pattern. --BM 8/29/2014
*/
Mustache.registerHelper("if_helpers", function () {
  var args = arguments
    , options = arguments[arguments.length - 1]
    , helper_result
    , helper_options = can.extend({}, options, {
        fn: function () { helper_result = 'fn'; }
      , inverse: function () { helper_result = 'inverse'; }
      })
    ;

  // Parse statements
  var statements = []
    , statement
    , match
    , disjunctions = []
    , index = 0
    ;
  can.each(args, function (arg, i) {
    if (i < args.length - 1) {
      if (typeof arg === 'string' && arg.match(/^\n\s*/)) {
        if (statement) {
          if (statement.logic === "or") {
            disjunctions.push(statements);
            statements = [];
          }
          statements.push(statement);
          index = index + 1;
        }
        if (match = arg.match(/^\n\s*((and|or) )?([#^])?(\S+?)$/)) {
          statement = {
              fn_name: match[3] === '^' ? 'inverse' : 'fn'
            , helper: Mustache.getHelper(match[4], options.contexts)
            , args: []
            , logic: match[2] === 'or' ? 'or' : 'and'
          };

          // Add hash arguments
          if (options.hash) {
            var hash = {}
              , prefix = '_' + index + '_'
              , prop
              ;
            for (prop in options.hash) {
              if (prop.indexOf(prefix) === 0) {
                hash[prop.substr(prefix.length)] = options.hash[prop];
              }
            }
            for (prop in hash) {
              statement.hash = hash;
              break;
            }
          }
        }
        else
          statement = null;
      }
      else if (statement) {
        statement.args.push(arg);
      }
    }
  });
  if (statement) {
    if (statement.logic === "or") {
      disjunctions.push(statements);
      statements = [];
    }
    statements.push(statement);
  }
  disjunctions.push(statements);

  if (disjunctions.length) {
    // Evaluate statements
    var result = can.reduce(disjunctions, function (disjunctive_result, conjunctions) {
      if (disjunctive_result)
        return true;

      var conjunctive_result = can.reduce(conjunctions, function (current_result, stmt) {
        if (!current_result)
          return false; //short circuit

        helper_result = null;
        stmt.helper.fn.apply(stmt.helper, stmt.args.concat([
          can.extend({}, helper_options, { hash: stmt.hash || helper_options.hash })
        ]));
        helper_result = helper_result === stmt.fn_name;
        return current_result && helper_result;
      }, true);
      return disjunctive_result || conjunctive_result;
    }, false);

    // Execute based on the result
    if (result) {
      return options.fn(options.contexts);
    }
    else {
      return options.inverse(options.contexts);
    }
  }
});

Mustache.registerHelper("with_model_as", function (var_name, model_name, options) {
  var frame = {};
  model_name = resolve_computed(Mustache.resolve(model_name));
  frame[var_name] = CMS.Models[model_name];
  return options.fn(options.contexts.add(frame));
});

Mustache.registerHelper("private_program_owner", function (instance, modal_title, options) {
  var state = options.contexts.attr('__private_program_owner');
  if (resolve_computed(modal_title).indexOf('New ') === 0) {
    return GGRC.current_user.email;
  }
  else {
    var loader = resolve_computed(instance).get_binding('authorizations');
    return $.map(loader.list, function (binding) {
      if (binding.instance.role && binding.instance.role.reify().attr('name') === 'ProgramOwner') {
        return binding.instance.person.reify().attr('email');
      }
    }).join(', ');
  }
});

// Verify if the Program has multiple owners
// Usage: {{#if_multi_owner instance modal_title}}
Mustache.registerHelper("if_multi_owner", function (instance, modal_title, options) {
  var owner_count = 0;

  if (resolve_computed(modal_title).indexOf('New ') === 0) {
    return options.inverse(options.contexts);
  }

  var loader = resolve_computed(instance).get_binding('authorizations');
  can.each(loader.list, function(binding){
    if (binding.instance.role && binding.instance.role.reify().attr('name') === 'ProgramOwner') {
      owner_count += 1;
    }
  });

  if (owner_count > 1) {
    return options.fn(options.contexts);
  } else {
    return options.inverse(options.contexts);
  }
});

// Determines whether the value matches one in the $.map'd list
// {{#if_in_map roles 'role.permission_summary' 'Mapped'}}
Mustache.registerHelper("if_in_map", function (list, path, value, options) {
  list = resolve_computed(list);

  if (!list.attr || list.attr('length')) {
    path = path.split('.');
    var map = $.map(list, function (obj) {
      can.each(path, function (prop) {
        obj = (obj && obj[prop]) || null;
      });
      return obj;
    });

    if (map.indexOf(value) > -1)
      return options.fn(options.contexts);
  }
  return options.inverse(options.contexts);
});

Mustache.registerHelper("if_in", function (needle, haystack, options) {
  needle = resolve_computed(needle);
  haystack = resolve_computed(haystack).split(",");

  var found = haystack.some(function (h) {
    return h.trim() === needle;
  });
  return options[found ? "fn" : "inverse"](options.contexts);
});

Mustache.registerHelper("with_auditors", function (instance, options) {
  var auditors, auditors_dfd
    , decoy
    ;

  instance = resolve_computed(instance);
  if (options.hash && options.hash.decoy) {
    decoy = Mustache.resolve(options.hash.decoy);
    decoy.attr();
  }

  if (!instance)
    return "";

  auditors_dfd = Mustache.resolve(instance).findAuditors().done(function (aud) {
    auditors = aud;
  });
  return defer_render("span", function () {
    if (auditors && auditors.attr("length") > 0) {
      return options.fn(options.contexts.add({"auditors": auditors}));
    }
    else{
      return options.inverse(options.contexts);
    }
  }, auditors_dfd);
});

Mustache.registerHelper("if_instance_of", function (inst, cls, options) {
  var result;
  cls = resolve_computed(cls);
  inst = resolve_computed(inst);

  if (typeof cls === "string") {
    cls = cls.split("|").map(function (c) {
      return CMS.Models[c];
    });
  } else if (typeof cls !== "function") {
    cls = [cls.constructor];
  } else {
    cls = [cls];
  }

  result = can.reduce(cls, function (res, c) {
    return res || inst instanceof c;
  }, false);

  return options[result ? "fn" : "inverse"](options.contexts);
});

Mustache.registerHelper("prune_context", function (options) {
  return options.fn(new can.view.Scope(options.context));
});

// Turns DocumentationResponse to Response
Mustache.registerHelper("type_to_readable", function (str, options) {
  return resolve_computed(str, true).replace(/([A-Z])/g, ' $1').split(' ').pop();
});

Mustache.registerHelper("mixed_content_check", function (url, options) {
  url = Mustache.getHelper("schemed_url", options.contexts).fn(url);
  if (window.location.protocol === "https:" && !/^https:/.test(url)) {
    return options.inverse(options.contexts);
  } else {
    return options.fn(options.contexts);
  }
});

/**
  scriptwrap - create live-bound content contained within a <script> tag as CDATA
  to prevent, e.g. iframes being rendered in hidden fields, or temporary storage
  of markup being found by $().

  Usage
  -----
  To render a section of markup in a script tag:
  {{#scriptwrap}}<section content>{{/scriptwrap}}

  To render the output of another helper in a script tag:
  {{scriptwrap "name_of_other_helper" helper_arg helper_arg... hashkey=hashval}}

  Hash keys starting with "attr_" will be treated as attributes to place on the script tag itself.
  e.g. {{#scriptwrap attr_class="data-popover-content" attr_aria_
*/
Mustache.registerHelper("scriptwrap", function (helper) {
  var extra_attrs = ""
  , args = can.makeArray(arguments).slice(1, arguments.length)
  , options = args[args.length - 1] || helper
  , ret = "<script type='text/html'" + can.view.hook(function (el, parent, view_id) {
    var c = can.compute(function () {
      var $d = $("<div>").html(
        helper === options
        ? options.fn(options.contexts)  //not calling a separate helper case
        : Mustache.getHelper(helper, options.contexts).fn.apply(options.context, args));
      can.view.hookup($d);
      return "<script type='text/html'" + extra_attrs + ">" + $d.html() + "</script>";
    });

    can.view.live.html(el, c, parent);
  });

  if (options.hash) {
    can.each(Object.keys(options.hash), function (key) {
      if (/^attr_/.test(key)) {
        extra_attrs += " " + key.substr(5).replace("_", "-") + "='" + resolve_computed(options.hash[key]) + "'";
        delete options.hash[key];
      }
    });
  }

  ret += "></script>";
  return new Mustache.safeString(ret);
});

Mustache.registerHelper("ggrc_config_value", function (key, default_, options) {
  key = resolve_computed(key);
  if (!options) {
    options = default_;
    default_ = null;
  }
  default_ = resolve_computed(default_);
  default_ = default_ || "";
  return can.getObject(key, [GGRC.config]) || default_;
});

Mustache.registerHelper("is_page_instance", function (instance, options) {
  var instance = resolve_computed(instance)  // FIXME duplicate declaration
    , page_instance = GGRC.page_instance()
    ;

  if (instance && instance.type === page_instance.type && instance.id === page_instance.id) {
    return options.fn(options.contexts);
  }
  else{
    return options.inverse(options.contexts);
  }
});

Mustache.registerHelper("remove_space", function (str, options) {
  return resolve_computed(str, true).replace(' ', '');
});

Mustache.registerHelper("if_auditor", function (instance, options) {
  var audit, auditors_dfd, auditors
    , admin = Permission.is_allowed("__GGRC_ADMIN__")
    , editor = GGRC.current_user.system_wide_role === "Editor"
    , include_admin = !options.hash || options.hash.include_admin !== false;

  instance = Mustache.resolve(instance);
  instance = (!instance || instance instanceof CMS.Models.Request) ? instance : instance.reify();

  if (!instance) {
    return '';
  }

  audit = instance instanceof CMS.Models.Request ? instance.attr("audit") : instance;

  if (!audit) {
    return '';  // take no action until audit is available
  }

  audit = audit instanceof CMS.Models.Audit ? audit : audit.reify();
  auditors = audit.findAuditors(true); // immediate-mode findAuditors

  if ((include_admin && (admin|| editor)) ||
      can.map(
          auditors,
          function (auditor) {
            if (auditor.person.id === GGRC.current_user.id) {
              return auditor;
            }
        }).length) {
    return options.fn(options.contexts);
  }
  return options.inverse(options.contexts);
});

Mustache.registerHelper("if_verifiers_defined", function (instance, options) {
  var verifiers;

  instance = Mustache.resolve(instance);
  instance = (!instance || instance instanceof CMS.Models.Request) ? instance : instance.reify();

  if (!instance) {
    return '';
  }

  verifiers = instance.get_binding('related_verifiers');

  return defer_render('span', function(list) {
    if (list.length) {
      return options.fn(options.contexts);
    }
    return options.inverse(options.contexts);
  }, verifiers.refresh_instances());
});

Mustache.registerHelper("if_verifier", function (instance, options) {
  var user = GGRC.current_user,
      verifiers;

  instance = Mustache.resolve(instance);
  instance = (!instance || instance instanceof CMS.Models.Request) ? instance : instance.reify();

  if (!instance) {
    return '';
  }

  verifiers = instance.get_binding('related_verifiers');

  return defer_render('span', function(list) {
    var llist = _.filter(list, function(item) {
      if (item.instance.email == user.email) {
        return true;
      }
      return false;
    });

    if (llist.length) {
      return options.fn(options.contexts);
    }
    return options.inverse(options.contexts);
  }, verifiers.refresh_instances());
});

can.each({
  "if_can_edit_request": {
    assignee_states: ["Requested", "Amended Request"],
    auditor_states: ["Draft", "Responded", "Updated Response"],
    program_editor_states: ["Requested", "Amended Request"],
    predicate: function(options) {
      return options.admin
          || options.editor
          || options.can_assignee_edit
          || options.can_program_editor_edit
          || options.can_auditor_edit
          || (!options.accepted
              && (options.update
                  || options.map
                  || options.create
                  || options.program_owner));
    }
  },
  "if_can_reassign_request": {
    auditor_states: ["Responded", "Updated Response"],
    assignee_states: ["Requested", "Amended Request", "Responded", "Updated Response"],
    program_editor_states: ["Requested", "Amended Request"],
    predicate: function(options) {
      return options.admin
          || options.editor
          || options.can_auditor_edit
          || options.can_assignee_edit
          || options.can_program_editor_edit
          || (!options.accepted
              && (options.update
                || options.map
                || options.create));
    }
  },
  "if_can_create_response": {
    assignee_states: ["Requested", "Amended Request"],
    program_editor_states: ["Requested", "Amended Request"],
    predicate: function(options) {
      return (!options.draft && (options.admin || options.editor))
          || options.can_assignee_edit
          || options.can_program_editor_edit
          || (!options.accepted
              && !options.draft
              && (options.update
                || options.map
                || options.create));
    }
  }
}, function(fn_opts, name) {

  Mustache.registerHelper(name, function(instance, options){

      var audit, auditors_dfd, accepted, prog_roles_dfd,
          admin = Permission.is_allowed("__GGRC_ADMIN__"),
          editor = GGRC.current_user.system_wide_role === "Editor";

      instance = resolve_computed(instance);
      instance = (!instance || instance instanceof CMS.Models.Request) ? instance : instance.reify();

      if(!instance)
        return "";

      audit = instance.attr("audit");

      if(!audit)
        return "";  //take no action until audit is available

      audit = audit.reify();
      auditors_dfd = audit.findAuditors();
      prog_roles_dfd = audit.refresh_all('program').then(function(program) {
                         //debugger;
                         return program.get_binding("program_authorizations").refresh_instances();
                       }).then(function(user_role_bindings) {
                          var rq = new RefreshQueue();
                          can.each(user_role_bindings, function(urb) {
                            if(urb.instance.person && urb.instance.person.id === GGRC.current_user.id) {
                              rq.enqueue(urb.instance.role.reify());
                            }
                          });
                          return rq.trigger();
                       });

      return defer_render("span", function(auditors, program_roles) {
        var accepted = instance.status === "Accepted",
            draft = instance.status === "Draft",
            update = Permission.is_allowed("update", instance), //All-context allowance
            map = Permission.is_allowed("mapping", instance),   //All-context allowance
            create = Permission.is_allowed("creating", instance), //All-context allowance
            assignee = !!instance.assignee && instance.assignee.id === GGRC.current_user.id, // User is request assignee
            audit_lead = !!audit.contact && audit.contact.id === GGRC.current_user.id,  // User is audit lead
            auditor = can.map(  // User has auditor role in audit
                        auditors || [],
                        function(auditor) {
                          if(auditor.person.id === GGRC.current_user.id) {
                            return auditor;
                          }
                      }).length > 0,
            program_owner = can.reduce(  //user is owner of the audit's parent program
                              program_roles,
                              function(cur, role) { return cur || role.name === "ProgramOwner"; },
                              false
                              ),
            program_editor = can.reduce(  //user is editor of the audit's parent program
                              program_roles,
                              function(cur, role) { return cur || role.name === "ProgramEditor"; },
                              false
                              ),
            auditor_states = fn_opts.auditor_states || [], // States in which an auditor can edit a request
            assignee_states = fn_opts.assignee_states || [], // " for assignee of request
            program_editor_states = fn_opts.program_editor_states || [], // " for program editor
            // Program owner currently has nearly the same state allowances as Admin --BM 2014-12-16
            can_auditor_edit = auditor && ~can.inArray(instance.attr("status"), auditor_states),
            can_assignee_edit = (audit_lead || assignee) && ~can.inArray(instance.attr("status"), assignee_states),
            can_program_editor_edit = (program_editor || program_owner) && ~can.inArray(instance.attr("status"), program_editor_states)
            ;

        if(fn_opts.predicate({
          admin: admin,
          editor: editor,
          can_auditor_edit: can_auditor_edit,
          can_assignee_edit: can_assignee_edit,
          can_program_editor_edit: can_program_editor_edit,
          accepted: accepted,
          draft: draft,
          update: update,
          map: map,
          create: create,
          program_owner: program_owner,
          auditor: auditor,
          audit_lead: audit_lead
        })) {
          return options.fn(options.contexts);
        }
        else{
          return options.inverse(options.contexts);
        }
      }, $.when(auditors_dfd, prog_roles_dfd));
  });
});

Mustache.registerHelper("strip_html_tags", function (str) {
  return resolve_computed(str).replace(/<(?:.|\n)*?>/gm, '');
});

Mustache.registerHelper("truncate", function (len, str) {
  // find a good source
  str = can.makeArray(arguments).reduce(function (res, arg, i) {
      var s = resolve_computed(arg);
      if (typeof s === "string") {
          return s;
      }else{
          return res;
      }
  }, "");

  if (typeof len === "number") {
      // max len characters
      if (str.length > len) {
          str = str.substr(0, str.lastIndexOf(len, ' '));
          str += " &hellip;";
      }
  }else{
      // first line of input
      var strs = str.split(/<br[^>]*>|\n/gm);
      if (strs.length > 1) {
          str = strs[0];
          str += " &hellip;";
      }
  }

  return str;
});

Mustache.registerHelper("switch", function (value, options) {
  var frame = new can.Observe({});
  value = resolve_computed(value);
  frame.attr(value || "default", true);
  frame.attr("default", true);
  return options.fn(options.contexts.add(frame), {
    helpers : {
      case : function (val, options) {
        val = resolve_computed(val);
        if (options.context[val]) {
          options.context.attr ? options.context.attr("default", false) : (options.context.default = false);
          return options.fn(options.contexts);
        }
      }
    }
  });
});


Mustache.registerHelper("fadein", function (delay, prop, options) {
  switch(arguments.length) {
    case 1:
    options = delay;
    delay = 500;
    break;
    case 2:
    options = prop;
    prop = null;
    break;
  }
  resolve_computed(prop);
  return function (el) {
    var $el = $(el);
    $el.css("display", "none");
    if (!prop || resolve_computed(prop)) {
      setTimeout(function () {
        $el.fadeIn({
          duration : (options.hash && options.hash.duration) || 500
          , complete : function () {
            return typeof prop === "function" && prop(true);
          }
        });
      }, delay);
    }
  };
});

Mustache.registerHelper("fadeout", function (delay, prop, options) {
  switch(arguments.length) {
    case 1:
    options = delay;
    delay = 500;
    break;
    case 2:
    options = prop;
    prop = null;
    break;
  }
  if (resolve_computed(prop)) {
    return function (el) {
      var $el = $(el);
      setTimeout(function () {
        $el.fadeOut({
          duration : (options.hash && options.hash.duration) || 500
          , complete : function () {
            return typeof prop === "function" && prop(null);
          }
        });
      }, delay);
    };
  }
});

Mustache.registerHelper("with_mapping_count", function (instance, mapping_names, options) {
  var args = can.makeArray(arguments)
    , options = args[args.length-1]  // FIXME duplicate declaration
    , mapping_name
    ;

  mapping_names = args.slice(1, args.length - 1);

  instance = Mustache.resolve(instance);

  // Find the most appropriate mapping
  for (var i = 0; i < mapping_names.length; i++) {
    mapping_name = Mustache.resolve(mapping_names[i]);
    if (instance.get_binding(mapping_name)) {
      break;
    }
  }

  var finish = function (count) {
    return options.fn(options.contexts.add({ count: count }));
  };

  var progress = function () {
    return options.inverse(options.contexts);
  };

  return defer_render(
    "span",
    { done: finish, progress: progress },
    instance.get_list_counter(mapping_name)
  );
});

Mustache.registerHelper("is_overdue", function (_date, status, options) {
  options = arguments.length === 2 ? arguments[1] : options;
  status = arguments.length === 2 ? "" : resolve_computed(status);
  var date = moment(resolve_computed(_date));
  if (status !== 'Verified' && date && date.isBefore(new Date())) {
    return options.fn(options.contexts);
  }
  else {
    return options.inverse(options.contexts);
  }
});

Mustache.registerHelper("with_mappable_instances_as", function (name, list, options) {
  var ctx = new can.Observe()
    , page_inst = GGRC.page_instance()
    , page_context = page_inst.context ? page_inst.context.id : null
    ;

  list = Mustache.resolve(list);

  if (list) {
    list.attr("length"); //setup live.
    list = can.map(list, function (item, key) {
      var inst = item.instance || item;
      var jds = GGRC.Mappings.join_model_name_for (page_inst.constructor.shortName, inst.constructor.shortName);
      if (inst !== page_inst
         && jds
         && Permission.is_allowed("create", jds, page_context)
      ) {
        return inst;
      }
    });
  }

  ctx.attr(name, list);

  return options.fn(options.contexts.add(ctx));
});

Mustache.registerHelper("with_subtracted_list_as", function (name, haystack, needles, options) {
  var ctx = new can.Observe();

  haystack = Mustache.resolve(haystack);
  needles = Mustache.resolve(needles);

  if (haystack) {
    haystack.attr("length"); //setup live.
    needles.attr("length");
    haystack = can.map(haystack, function (item, key) {
      return ~can.inArray(item, needles) ? undefined : item;
    });
  }

  ctx.attr(name, haystack);

  return options.fn(options.contexts.add(ctx));
});

Mustache.registerHelper("with_mapping_instances_as", function (name, mappings, options) {
  var ctx = new can.Observe();

  mappings = Mustache.resolve(mappings);

  if (!(mappings instanceof can.List || can.isArray(mappings))) {
    mappings = [mappings];
  }

  if (mappings) {
    //  Setup decoy for live binding
    mappings.attr && mappings.attr("length");
    mappings = can.map(mappings, function (item, key) {
      return item.instance;
    });
  }
  ctx.attr(name, mappings);

  return options.fn(options.contexts.add(ctx));
});


Mustache.registerHelper("with_allowed_as", function (name, action, mappings, options) {
  var ctx = new can.Observe();

  mappings = Mustache.resolve(mappings);

  if (!(mappings instanceof can.List || can.isArray(mappings))) {
    mappings = [mappings];
  }

  if (mappings) {
    //  Setup decoy for live binding
    mappings.attr && mappings.attr("length");
    mappings = can.map(mappings, function (item, key) {
      var mp = item.get_mappings()[0]
        , context_id = mp.context ? mp.context.id : null
        ;
      if (Permission.is_allowed(action, mp.constructor.shortName, context_id)) {
        return item;
      }
    });
  }
  ctx.attr(name, mappings);

  return options.fn(options.contexts.add(ctx));
});

Mustache.registerHelper("log", function () {
  var args = can.makeArray(arguments).slice(0, arguments.length - 1);
  console.log.apply(console, ["Mustache log"].concat(_.map(args, function (arg) {
    return resolve_computed(arg);
  })));
});

Mustache.registerHelper("autocomplete_select", function (options) {
  var cls;
  if (options.hash && options.hash.controller) {
    cls = Mustache.resolve(cls);
    if (typeof cls === "string") {
      cls = can.getObject(cls);
    }
  }
  return function (el) {
    $(el).bind("inserted", function () {
      var $ctl = $(this).parents(":data(controls)");
      $(this).ggrc_autocomplete($.extend({}, options.hash, {
        controller : cls ? $ctl.control(cls) : $ctl.control()
      }));
    });
  };
});

Mustache.registerHelper("find_template", function (base_name, instance, options) {
  var tmpl;

  base_name = Mustache.resolve(base_name);
  if (!options) {
    options = instance;
    instance = options.context;
  }
  instance = Mustache.resolve(instance);
  if (instance.instance) {
    //binding result case
    instance = instance.instance;
  }
  if (GGRC.Templates[instance.constructor.table_plural + "/" + base_name]) {
    tmpl = "/static/mustache/" + instance.constructor.table_plural + "/" + base_name + ".mustache";
  } else if (GGRC.Templates["base_objects/" + base_name]) {
    tmpl = "/static/mustache/base_objects/" + base_name + ".mustache";
  } else {
    tmpl = null;
  }

  if (tmpl) {
    return options.fn(options.contexts.add({ template : tmpl }));
  } else {
    return options.inverse(options.contexts);
  }
});

// Append string to source if the string isn't already present,
//   remove the string from source if it is present.
Mustache.registerHelper("toggle_string", function (source, str) {
  source = Mustache.resolve(source);
  str = Mustache.resolve(str);
  var re = new RegExp('.*' + str);
  if (re.test(source)) {
    return source.replace(str, '');
  }

  return source + str;
});

Mustache.registerHelper("grdive_msg_to_id", function (message) {
  var msg = Mustache.resolve(message);

  if (!msg) {
    return;
  }

  msg = msg.split(' ');
  return msg[msg.length-1];
});

Mustache.registerHelper("disable_if_errors", function (instance) {
  var ins,
      res;
  ins = Mustache.resolve(instance);
  res = ins.computed_unsuppressed_errors();
  if (res == null ) {
    return "";
  }
  else {
    return "disabled" ;
  }
});

/*
  toggle mustache helper

  An extended "if" that sets up a "toggle_button" trigger, which can
  be applied to any button rendered within the section bounded by the
  toggle call.  toggle_buttons set the value of the toggle value to its
  boolean opposite.  Note that external forces can also set this value
  and thereby flip the toggle -- this helper is friendly to those cases.

  @helper_type section -- use outside of element tags.

  @param compute some computed value to flip between true and false
*/
Mustache.registerHelper("toggle", function (compute, options) {
  function toggle(trigger) {
    if (typeof trigger === "function") {
      trigger = Mustache.resolve(trigger);
    }
    if (typeof trigger !== "string") {
      trigger = "click";
    }
    return function (el) {
      $(el).bind(trigger, function () {
        compute(compute() ? false : true);
      });
    };
  }

  if (compute()) {
    return options.fn(
      options.contexts, { helpers: { toggle_button: toggle }});
  } else {
    return options.inverse(
      options.contexts, { helpers: { toggle_button: toggle }});
  }
});

can.each({
  "has_pending_addition": "add",
  "has_pending_removal": "remove"
}, function (how, fname) {
  Mustache.registerHelper(fname, function (object, option_instance, options) {
    if (!options) {
      options = option_instance;
      option_instance = object;
      object = options.context;
    }
    option_instance = Mustache.resolve(option_instance);
    object = Mustache.resolve(object);

    if (object._pending_joins && can.map(
      object._pending_joins,
      function (pj) {
        return pj.how === how && pj.what === option_instance ? option_instance : undefined;
      }).length > 0) {
      return options.fn(options.contexts);
    } else {
      return options.inverse(options.contexts);
    }
  });
});

Mustache.registerHelper("iterate_by_two", function (list, options) {
  var i, arr, output = [];
  list = Mustache.resolve(list);

  for (i = 0; i < list.length; i+=2) {
    if ((i + 1) === list.length) {
      arr = [list[i]];
    } else {
      arr = [list[i], list[i+1]];
    }
    output.push(options.fn(
      options.contexts.add({list: arr})));
  }
  return output.join("");
});

/**
 * Helper method for determining the file type of a Document object from its
 * file name extension.
 *
 * @param {Object} instance - an instance of a model object of type "Document"
 * @return {String} - determined file type or "default" for unknown/missing
 *   file name extensions.
 *
 * @throws {String} If the type of the `instance` is not "Document" or if its
 *   "title" attribute is empty.
 */
Mustache.registerHelper("file_type", function (instance) {
  var extension,
      filename,
      parts,
      DEFAULT_VALUE = "default",
      FILE_EXTENSION_TYPES,
      FILE_TYPES;

  FILE_TYPES = Object.freeze({
    PLAIN_TXT: "txt",
    IMAGE: "img",
    PDF: "pdf",
    OFFICE_DOC: "doc",
    OFFICE_SHEET: "xls",
    ARCHIVE: "zip"
  });

  FILE_EXTENSION_TYPES = Object.freeze({
    // plain text files
    txt: FILE_TYPES.PLAIN_TXT,

    // image files
    jpg: FILE_TYPES.IMAGE,
    jpeg: FILE_TYPES.IMAGE,
    png: FILE_TYPES.IMAGE,
    gif: FILE_TYPES.IMAGE,
    bmp: FILE_TYPES.IMAGE,
    tiff: FILE_TYPES.IMAGE,

    // PDF documents
    pdf: FILE_TYPES.PDF,

    // Office-like text documents
    doc: FILE_TYPES.OFFICE_DOC,
    docx: FILE_TYPES.OFFICE_DOC,
    odt: FILE_TYPES.OFFICE_DOC,

    // Office-like spreadsheet documents
    xls: FILE_TYPES.OFFICE_SHEET,
    xlsx: FILE_TYPES.OFFICE_SHEET,
    ods: FILE_TYPES.OFFICE_SHEET,

    // archive files
    zip: FILE_TYPES.ARCHIVE,
    rar: FILE_TYPES.ARCHIVE,
    "7z": FILE_TYPES.ARCHIVE,
    gz: FILE_TYPES.ARCHIVE,
    tar: FILE_TYPES.ARCHIVE
  });

  if (instance.type !== "Document") {
    throw "Cannot determine file type for a non-document object";
  }

  filename = instance.title || "";
  if (!filename) {
    throw "Cannot determine the object's file name";
  }

  parts = filename.split(".");
  extension = (parts.length === 1) ? "" : parts[parts.length - 1];
  extension = extension.toLowerCase();

  return FILE_EXTENSION_TYPES[extension] || DEFAULT_VALUE;
});

Mustache.registerHelper("debugger", function () {
  // This just gives you a helper that you can wrap around some code in a
  // template to see what's in the context. Dev tools need to be open for this
  // to work (in Chrome at least).
  debugger;

  var options = arguments[arguments.length - 1];
  return options.fn(options.contexts);
});

Mustache.registerHelper("update_link", function(instance, options) {

  instance = Mustache.resolve(instance);
  if (instance.viewLink) {
    var link = window.location.host + instance.viewLink;
    instance.attr('link', link);
  }
  return options.fn(options.contexts);
});

Mustache.registerHelper("with_most_recent_declining_task_entry", function (review_task, options) {
  var entries = review_task.get_mapping("declining_cycle_task_entries");
  var most_recent_entry;

  if(entries) {
    for (var i = entries.length - 1; i >= 0; i--) {
      var entry = entries[i];
      if ('undefined' !== typeof most_recent_entry) {
        if (moment(most_recent_entry.created_at).isBefore(moment(entry.created_at))) {
          most_recent_entry = entry;
        }
      } else {
        most_recent_entry = entry;
      }
    }
  }

  if(most_recent_entry) {
    return options.fn(options.contexts.add({'most_recent_declining_task_entry': most_recent_entry}));
  }
  return options.fn(options.contexts.add({'most_recent_declining_task_entry': {}}));
});
Mustache.registerHelper("inject_parent_instance", function(instance, options) {
  return options.fn(options.contexts.add($.extend({parent_instance: Mustache.resolve(instance)}, options.contexts._context)));
});

Mustache.registerHelper("if_less", function (a, b, options) {
  a = Mustache.resolve(a);
  b = Mustache.resolve(b);

  if (a < b) {
    return options.fn(options.contexts);
  } else {
    return options.inverse(options.contexts);
  }
});

Mustache.registerHelper("add_index", function(index, increment, options) {
  index = Mustache.resolve(index);
  increment = Mustache.resolve(increment);

  return (index + increment);
});

function get_proper_url (url) {
  var domain, max_label, url_split;

  if (!url) {
    return '';
  }

  if (!url.match(/^[a-zA-Z]+:/)) {
    url = (window.location.protocol === "https:" ? 'https://' : 'http://') + url;
  }

  // Make sure we can find the domain part of the url:
  url_split = url.split('/');
  if (url_split.length < 3) {
    return 'javascript://';
  }

  domain = url_split[2];
  max_label = _.max(domain.split('.').map(function(u) { return u.length; }));
  if (max_label > 63 || domain.length > 253) {
    // The url is invalid and might crash user's chrome tab
    return "javascript://";
  }
  return url;
}

Mustache.registerHelper('get_url_value', function (attr_name, instance) {
  instance = Mustache.resolve(instance);
  attr_name = Mustache.resolve(attr_name);

  if (instance[attr_name]) {
    if(['url', 'reference_url'].indexOf(attr_name) !== -1) {
      return get_proper_url(instance[attr_name]);
    }
  }
  return '';
});

  /**
   * Retrieve the string value of an attribute of the given instance.
   *
   * The method only supports instance attributes categorized as "default",
   * and does not support (read: not work for) nested object references.
   *
   * If the attribute does not exist, has a falsy value, or is not considered
   * to be a "default" attribute, an empty string is returned.
   *
   * If the attribue represents a date information, it is returned in the
   * MM/DD/YYYY format.
   *
   * @param {String} attrName - the name of the attribute to retrieve
   * @param {Object} instance - an instance of a model object
   * @return {String} - the retrieved attribute's value
   */
  Mustache.registerHelper('get_default_attr_value',
    function (attrName, instance) {
      // attribute names considered "default" and representing a date
      var DATE_ATTRS = Object.freeze({
        due_on: 1,
        end_date: 1,
        finished_date: 1,
        requested_on: 1,
        start_date: 1,
        updated_at: 1,
        verified_date: 1
      });

      // attribute names considered "default" and not representing a date
      var NON_DATE_ATTRS = Object.freeze({
        kind: 1,
        reference_url: 1,
        request_type: 1,
        slug: 1,
        status: 1,
        url: 1,
        verified: 1
      });

      var res;

      instance = Mustache.resolve(instance);
      attrName = Mustache.resolve(attrName);

      res = instance.attr(attrName);

      if (res !== undefined && res !== null) {
        if (attrName in NON_DATE_ATTRS) {
          if ($.type(res) === 'boolean') {
            res = String(res);
          }
          return res;
        }
        if (attrName in DATE_ATTRS) {
          // convert to a localized date
          return moment(res).format('MM/DD/YYYY');
        }
      }

      return '';
    }
  );

/*
  Used to get the string value for custom attributes
*/
Mustache.registerHelper('get_custom_attr_value', function (attr, instance, options) {
  var value = '';
  var definition;

  attr = Mustache.resolve(attr);
  instance = Mustache.resolve(instance);

  can.each(GGRC.custom_attr_defs, function (item) {
    if (item.definition_type === instance.class.table_singular &&
        item.title === attr.attr_name) {
      definition = item;
    }
  });

  if (definition) {
    can.each(instance.custom_attribute_values, function (item) {
      item = item.reify();
      if (item.custom_attribute_id === definition.id) {
        if (definition.attribute_type.startsWith('Map:')) {
          value = options.fn(options.contexts.add({
            object: item.attribute_object.reify()
          }));
        } else {
          value = item.attribute_value;
        }
      }
    });
  }

  return value;
});

Mustache.registerHelper("with_create_issue_json", function (instance, options) {
  instance = Mustache.resolve(instance);

  var audits = instance.get_mapping("related_audits"),
      audit, programs, program, control, json, related_controls;

  if (!audits.length) {
    return "";
  }

  audit = audits[0].instance.reify();
  programs = audit.get_mapping("_program");
  program = programs.length ? programs[0].instance.reify() : {};
  control = instance.control ? instance.control.reify() : {};
  related_controls = instance.get_mapping('related_controls');

  if (!control.id && related_controls.length) {
    control = related_controls[0].instance;
  }
  json = {
    audit: {title: audit.title, id: audit.id, type: audit.type},
    program: {title: program.title, id: program.id, type: program.type},
    control: {title: control.title, id: control.id, type: control.type},
    context: {type: audit.context.type, id: audit.context.id},
    assessment: {
      title: instance.title,
      id: instance.id,
      type: instance.type,
      title_singular: instance.class.title_singular,
      table_singular: instance.class.table_singular
    }
  };

  return options.fn(options.contexts.add({'create_issue_json': JSON.stringify(json)}));
});

Mustache.registerHelper("pretty_role_name", function (name) {
  name = Mustache.resolve(name);
  var ROLE_LIST = {
    "ProgramOwner": "Program Manager",
    "ProgramEditor": "Program Editor",
    "ProgramReader": "Program Reader",
    "WorkflowOwner": "Workflow Manager",
    "WorkflowMember": "Workflow Member",
    "Mapped": "No Access",
    "Owner": "Manager",
  };
  if (ROLE_LIST[name]) {
    return ROLE_LIST[name];
  }
  return name;
});


/*
Add new variables to current scope. This is useful for passing variables
to intialize a tree view.

Example:
  {{#add_to_current_scope example1="a" example2="b"}}
    {{log .}} // {example1: "a", example2: "b"}
  {{/add_to_current_scope}}
*/
Mustache.registerHelper("add_to_current_scope", function (options) {
  return options.fn(options.contexts.add(_.extend({}, options.context, options.hash)));
});

  /**
   * Return a value of a CMS.Model constructor's property.
   *
   * If a Model is not found, an error is raised. If a property does not exist
   * on the model, undefined is returned.
   *
   * @param {String} modelName - the name of the Model to inspect
   * @param {String} attr - the name of a modelName's property
   *
   * @return {*} - the value of the modelName[attr]
   */
  Mustache.registerHelper('model_info', function (modelName, attr, options) {
    var model;

    if (arguments.length !== 3) {
      throw new Error(
        'Invalid number of arguments (' +
        (arguments.length - 1) +  // do not count the auto-provided options arg
        '), expected 2.');
    }

    model = CMS.Models[modelName];

    if (typeof model === 'undefined') {
      throw new Error('Model not found (' + modelName + ').');
    }

    return model[attr];
  });

/*
Add spaces to a CamelCase string.

Example:
{{un_camel_case "InProgress"}} becomes "In Progress"
*/
Mustache.registerHelper("un_camel_case", function (str, options) {
  var val = Mustache.resolve(str);
  if (!val || val == "") {
    return val;
  }
  var newval = val[0];
  for (var i=1; i<val.length; i++) {
    if (val[i] == val[i].toUpperCase()) {
      newval += " ";
    }
    newval += val[i];
  }
  return newval;
});
})(this, jQuery, can);
