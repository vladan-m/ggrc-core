/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: brad@reciprocitylabs.com
    Maintained By: brad@reciprocitylabs.com
*/

(function(can, $) {

can.Control("CMS.Controllers.Dashboard", {
    defaults: {
      widget_descriptors: null
      //, widget_listeners: null
      //, widget_containers: null
      //
    }

}, {
    init: function(el, options) {
      CMS.Models.DisplayPrefs.getSingleton().then(function (prefs) {
        this.display_prefs = prefs;

        this.init_page_title();
        this.init_page_help();
        this.init_page_header();
        this.init_widget_descriptors();
        if (!this.inner_nav_controller) {
          this.init_inner_nav();
        }
        this.update_inner_nav();

        // Before initializing widgets, hide the container to not show
        // loading state of multiple widgets before reducing to one.
        this.hide_widget_area();
        this.init_default_widgets();
        this.init_widget_area();
        this.init_info_pin();
      }.bind(this));
    }

  , init_page_title: function() {
      var page_title = null;
      if (typeof(this.options.page_title) === "function")
        page_title = this.options.page_title(this);
      else if (this.options.page_title)
        page_title = this.options.page_title;
      if (page_title)
        $("head > title").text(page_title);
    }

  , init_page_help: function() {
      var page_help = null;
      if (typeof(this.options.page_help) === "function")
        page_help = this.options.page_help(this);
      else if (this.options.page_help)
        page_help = this.options.page_help;
      if (page_help)
        this.element.find("#page-help").attr("data-help-slug", page_help);
    }

  , init_page_header: function() {
      var that = this;
      if (this.options.header_view) {
        can.view(this.options.header_view, this.options, function(frag) {
          that.element.find("#page-header").html(frag);
        });
      }
    }

  , init_widget_area: function() {
      if (!this.inner_nav_controller) {
        //  If there is no inner-nav, then ensure widgets are shown
        //  FIXME: This is a workaround because widgets and widget-areas are
        //    hidden, assuming InnerNav controller will show() them
        this.get_active_widget_containers()
          .show()
          .find('.widget').show()
          .find('> section.content').show();
      }
    }

  , init_inner_nav: function() {
      var $internav = this.element.find('.internav');
      if ($internav.length) {
        this.inner_nav_controller = new CMS.Controllers.InnerNav(
          this.element.find('.internav'), {
              dashboard_controller: this
          });
      }

      if (this.display_prefs.getTopNavHidden()) {
        // page needs time to render
        setTimeout(this.close_nav.bind(this), 500);
      }
    }

  , init_info_pin: function() {
    this.info_pin = new CMS.Controllers.InfoPin(this.element.find('.pin-content'));
  }

  , ".nav-trigger click": function(el, ev) {
      if(el.hasClass("active")) {
        this.close_nav(el);
      } else {
        this.open_nav(el);
      }
    }

  , '.user-dropdown click': function (el, ev) {
    var email_now = el.find('input[value="Email_Now"]'),
        email_digest = el.find('input[value="Email_Digest"]'),
        email_now_label = email_now.closest('label');

    if (email_digest[0].checked) {
      email_now_label.removeClass('disabled');
      email_now.prop('disabled', false);
    }
  }

  , open_nav: function (el) {
    el || (el = $(".nav-trigger"));
    var options = {
        duration: 800,
        easing: 'easeOutExpo'
    },
        $nav = el.closest("body").find(".top-inner-nav"),
        $lhn_nav = el.closest("body").find(".lhs-holder"),
        $lhn_type = el.closest("body").find(".lhn-type"),
        $content = el.closest("body").find(".object-area");

    el.addClass("active");
    $nav.animate({top: "48"}, options);
    $lhn_type.animate({top: "94"}, options);
    $lhn_nav.animate({top: "128"}, options);
    $content.animate({top: "78"}, options);

    this.display_prefs.setTopNavHidden("", false);
    $(window).trigger("resize");
  }

  , close_nav: function (el) {
    el || (el = $(".nav-trigger"));
    var options = {
        duration: 800,
        easing: 'easeOutExpo'
    },
        $nav = el.closest("body").find(".top-inner-nav"),
        $lhn_nav = el.closest("body").find(".lhs-holder"),
        $lhn_type = el.closest("body").find(".lhn-type"),
        $content = el.closest("body").find(".object-area");

    el.removeClass("active");
    $nav.animate({top: "18"}, options);
    $lhn_type.animate({top: "65"}, options);
    $lhn_nav.animate({top: "99"}, options);
    $content.animate({top: "49"}, options);

    this.display_prefs.setTopNavHidden("", true);
    $(window).trigger("resize");
  }

  , init_widget_descriptors: function() {
      var that = this;

      this.options.widget_descriptors = this.options.widget_descriptors || {};
    }

  , init_default_widgets: function() {
        can.each(this.options.default_widgets, function (name) {
          this.add_dashboard_widget_from_descriptor(this.options.widget_descriptors[name]);
      }.bind(this));
    }

  , hide_widget_area: function() {
      this.get_active_widget_containers().hide();
    }

  , show_widget_area: function() {
      this.get_active_widget_containers().show();
    }

  , " widgets_updated" : "update_inner_nav"

  , " updateCount": function(el, ev, count) {
      this.inner_nav_controller.update_widget_count($(ev.target), count);
    }

  , update_inner_nav: function(el, ev, data) {
      if (this.inner_nav_controller) {
        if(data) {
          this.inner_nav_controller.update_widget(data.widget || data, data.index);
        } else {
          this.inner_nav_controller.update_widget_list(
            this.get_active_widget_elements());
        }
      }
    }

  , get_active_widget_containers: function() {
      return this.element.find(".widget-area");
    }

  , get_active_widget_elements: function() {
      return this.element.find("section.widget[id]:not([id=])").toArray();
    }

  , add_widget_from_descriptor: function() {
      var descriptor = {}
        , that = this
        ;

      // Construct the final descriptor from one or more arguments
      can.each(arguments, function(name_or_descriptor) {
        if (typeof(name_or_descriptor) === "string")
          name_or_descriptor =
            that.options.widget_descriptors[name_or_descriptor];
        $.extend(descriptor, name_or_descriptor || {});
      });

      // Create widget in container?
      //return this.options.widget_container[0].add_widget(descriptor);

      if ($('#' + descriptor.controller_options.widget_id + '_widget').length > 0)
        return;

      // FIXME: This should be in some Widget superclass
      if (descriptor.controller_options.widget_guard
          && !descriptor.controller_options.widget_guard())
        return;

      var $element = $("<section class='widget'>")
        , control = new descriptor.controller(
            $element, descriptor.controller_options)
        ;

      // FIXME: This should be elsewhere -- currently required so TreeView can
      //   initialize ObjectNav with counts
      control.prepare();

      // FIXME: Abstraction violation: Sortable/DashboardWidget/ResizableWidget
      //   controllers should maybe handle this?
      var $container = this.get_active_widget_containers().eq(0)
        , $last_widget = $container.find('section.widget').last()
        ;

      if ($last_widget.length > 0)
        $last_widget.after($element);
      else
        $container.append($element);

      $element
        .trigger("sortreceive")
        .trigger("section_created")
        .trigger("widgets_updated", $element);

      return control;
    }

  , add_dashboard_widget_from_descriptor: function(descriptor) {
      return this.add_widget_from_descriptor({
        controller: CMS.Controllers.DashboardWidgets,
        controller_options: $.extend(descriptor, { dashboard_controller: this })
      });
    }

  , add_dashboard_widget_from_name: function(name) {
      var descriptor = this.options.widget_descriptors[name];
      if (!descriptor)
        console.debug("Unknown descriptor: ", name);
      else
        return this.add_dashboard_widget_from_descriptor(descriptor);
    }

  , make_tree_view_descriptor_from_model_descriptor: function(descriptor) {
      // possibly never used
      return {
        content_controller: CMS.Controllers.TreeView,
        content_controller_options: descriptor,
        content_controller_selector: "ul",
        widget_initial_content: '<ul class="tree-structure new-tree"></ul>',
        widget_id: descriptor.model.table_singular,
        widget_name: descriptor.widget_name || function() {
          var $objectArea = $(".object-area");
          if ( $objectArea.hasClass("dashboard-area") ) {
            return descriptor.model.title_plural;
          } else if (/people/.test(window.location)) {
            return "My " + descriptor.model.title_plural;
          } else {
            return "Mapped " + descriptor.model.title_plural;
          }
        },
        widget_info : descriptor.widget_info,
        widget_icon: descriptor.model.table_singular,
        object_category: descriptor.model.category || descriptor.object_category
      }
    }

  , make_list_view_descriptor_from_model_descriptor: function(descriptor) {
      return {
        content_controller: GGRC.Controllers.ListView,
        content_controller_options: descriptor,
        widget_id: descriptor.model.table_singular,
        widget_name: descriptor.widget_name || function() {
          var $objectArea = $(".object-area");
          if ( $objectArea.hasClass("dashboard-area") ) {
            return descriptor.model.title_plural;
          } else if (/people/.test(window.location)) {
            return "My " + descriptor.model.title_plural;
          } else {
            return "Mapped " + descriptor.model.title_plural;
          }
        },
        widget_info : descriptor.widget_info,
        widget_icon: descriptor.model.table_singular,
        object_category: descriptor.model.category || descriptor.object_category
      }
    }
});


CMS.Controllers.Dashboard("CMS.Controllers.PageObject", {

}, {
    init: function() {
      this.options.model = this.options.instance.constructor;
      this._super();
    }

  , init_page_title: function() {
      // Reset title when page object is modified
      var that = this
        , that_super = this._super
        ;
      this.options.instance.bind("change", function() {
        that_super.apply(that);
      });
      this._super();
    }

  , init_widget_descriptors: function() {
      var that = this;

      this.options.widget_descriptors = this.options.widget_descriptors || {};
    }
});


can.Control("CMS.Controllers.InnerNav", {
  defaults: {
      internav_view : "/static/mustache/dashboard/internav_list.mustache"
    , pin_view : ".pin-content"
    , widget_list : null
    , spinners : {}
    , contexts : null
    , instance : null
  }
}, {
    init: function(options) {
      CMS.Models.DisplayPrefs.getSingleton().then(function (prefs) {
        this.display_prefs = prefs;

        if (!this.options.widget_list) {
          this.options.widget_list = new can.Observe.List([]);
        }

        this.options.instance = GGRC.page_instance();
        if (!(this.options.contexts instanceof can.Observe)) {
          this.options.contexts = new can.Observe(this.options.contexts);
        }

        // FIXME: Initialize from `*_widget` hash when hash has no `#!`
        can.bind.call(window, 'hashchange', function() {
          this.route(window.location.hash);
        }.bind(this));

        can.view(this.options.internav_view, this.options, function(frag) {
          var fn = function () {
            this.element.append(frag);
            this.route(window.location.hash);
            delete this.delayed_display;
          }.bind(this);

          this.delayed_display = {
            fn : fn
            , timeout : setTimeout(fn, 50)
          };
        }.bind(this));

        this.on();
      }.bind(this));
    }

  , route: function(path) {
      if (path.substr(0, 2) === "#!") {
        path = path.substr(2);
      } else if (path.substr(0, 1) === "#") {
        path = path.substr(1);
      }

      window.location.hash = path;

      this.display_path(path.length ? path : "info_widget");
    }

  , display_path: function (path) {
      var step = path.split("/")[0],
          rest = path.substr(step.length + 1),
          widget_list = this.options.widget_list;

      // Find and make active the widget specified by `step`
      var widget = this.find_widget_by_target("#" + step);
      if (!widget && widget_list.length) {
        // Target was not found, but we can select the first widget in the list
        widget = widget_list[0];
      }
      if (widget) {
        this.set_active_widget(widget);
        return this.display_widget_path(rest);
      }
      return new $.Deferred().resolve();
    }

  , display_widget_path: function (path) {
      var active_widget_selector = this.options.contexts.active_widget.selector,
          $active_widget = $(active_widget_selector),
          widget_controller = $active_widget.control();

      if (widget_controller && widget_controller.display_path) {
        return widget_controller.display_path(path);
      }
      return new $.Deferred().resolve();
    }

  , set_active_widget: function (widget) {
    if (typeof widget === "string") {
      widget = this.widget_by_selector(widget);
    }

    if (widget !== this.options.contexts.attr("active_widget")) {
      widget.attr("force_show", true);
      this.update_add_more_link();
      this.options.contexts.attr("active_widget", widget);
      this.show_active_widget();
    }
  }

  , show_active_widget: function (selector) {
    var panel_selector = selector || this.options.contexts.attr('active_widget').selector,
        widget = $(panel_selector),
        dashboard_controller = this.options.dashboard_controller,
        info_pin_controller = dashboard_controller.info_pin.element.control();

    if (info_pin_controller) {
      info_pin_controller.hideInstance();
    }

    if (widget.length) {
      dashboard_controller.show_widget_area();
      widget.siblings(':visible').hide().end().show();
      $("[href=" + panel_selector + "]")
        .closest("li").addClass("active")
        .siblings().removeClass("active");
    }
  }

  , find_widget_by_target: function(target) {
      var i
        , widget
        ;
      for (i=0; i<this.options.widget_list.length; i++) {
        widget = this.options.widget_list[i];
        if (widget.selector === target)
          return widget;
      }
    }

  , widget_by_selector : function(selector) {
    return $.map(this.options.widget_list, function(widget) {
      return widget.selector === selector ? widget : undefined;
    })[0] || undefined;
  }

  , update_widget_list : function(widget_elements) {
      var starttime = Date.now()
        , widget_list = this.options.widget_list.slice(0)
        , that = this
        ;

      can.each(widget_elements, function(widget_element, index) {
        widget_list.splice(
          can.inArray(
            that.update_widget(widget_element, index)
            , widget_list)
          , 1);
      });

      can.each(widget_list, function(widget) {
        that.options.widget_list.splice(can.inArray(widget, that.options.widget_list), 1);
      });
    }

  , update_widget : function(widget_element, index) {
      var $widget = $(widget_element)
        , widget = this.widget_by_selector("#" + $widget.attr("id"))
        , $header = $widget.find(".header h2")
        , icon = $header.find("i").attr("class")
        , menuItem = $header.text().trim()
        , match = menuItem ? menuItem.match(/\s*(\S.*?)\s*(?:\((?:(\d+)|\.*)(\/\d+)?\))?$/) : {}
        , title = match[1]
        , count = match[2] || undefined
        , existing_index
        ;

      index = this.saved_widget_index($widget, index);

      if(this.delayed_display) {
        clearTimeout(this.delayed_display.timeout);
        this.delayed_display.timeout = setTimeout(this.delayed_display.fn, 50);
      }


      // If the metadata is unrendered, find it via options
      if (!title) {
        var widget_options = $widget.control("dashboard_widgets").options
          , widget_name = widget_options.widget_name;
        icon = icon || widget_options.widget_icon;
        // Strips html
        title = $('<div>').html(typeof widget_name === 'function' ? widget_name() : (''+widget_name)).text();
      }
      title = title.replace(/^(Mapped|Linked|My)\s+/,'');

      // Only create the observable once, this gets updated elsewhere
      if (!widget) {
        widget = new can.Observe({
            selector: "#" + $widget.attr("id")
          , count: count
          , has_count: count != null
        });
      }
      existing_index = this.options.widget_list.indexOf(widget);

      widget.attr({
        internav_icon: icon
      , internav_display: title
      , spinner : this.options.spinners["#" + $widget.attr("id")]
      });

      index = (index == null) ? this.options.widget_list.length : index;

      if(existing_index !== index) {
        if(existing_index > -1) {
          if (index >= this.options.widget_list.length) {
            this.options.widget_list.splice(existing_index, 1);
            this.options.widget_list.push(widget);
          } else {
            this.options.widget_list.splice(existing_index, 1, this.options.widget_list[index]);
            this.options.widget_list.splice(index, 1, widget);
          }
        } else {
          this.options.widget_list.push(widget);
        }
      }
      return widget;
  }

  , saved_widget_index: function ($widget, index) {
    var widgets = this.display_prefs.getTopNavWidgets(window.getPageToken()),
        id = $widget.attr("id");

    if (widgets[id]) {
      index = widgets[id];
    }else{
      widgets[id] = index;
      this.display_prefs.setTopNavWidgets(window.getPageToken(), widgets);
      this.display_prefs.save();
    }

    return index;
  }

  , update_widget_count : function($el, count) {
      var widget_id = $el.closest('.widget').attr('id'),
          widget = this.widget_by_selector("#" + widget_id);

      if (widget) {
        widget.attr({
            count: count
          , has_count: true
        });
      }
      this.update_add_more_link();
    },

    update_add_more_link: function() {
      var has_hidden_widgets = false,
          $hidden_widgets = $('.hidden-widgets-list:not(.top-space)'),
          instance = this.options.instance || {},
          model = instance.constructor,
          show_all_tabs = false;

      if (model.obj_nav_options) {
        show_all_tabs = model.obj_nav_options.show_all_tabs;
      }

      // Update has hidden widget attr
      $.map(this.options.widget_list, function(widget){
        if (widget.has_count && widget.count === 0 &&
            !widget.force_show && !show_all_tabs) {
          has_hidden_widgets = true;
        }
      });
      if (has_hidden_widgets) {
        $hidden_widgets.show();
      } else {
        $hidden_widgets.hide();
      }
      this.show_hide_titles();
    },
    "{window} resize" : function(el, ev) {
      this.show_hide_titles();
    },
    show_hide_titles: _.debounce(function() {
      var $el = this.element,
          widgets = this.options.widget_list;

      // first expand all
      widgets.forEach(function(widget) {
        widget.attr('show_title', true);
      });

      // see if too wide
      var widths = _.map($el.children(':visible'),
                         function (el) {
                           return $(el).width();
                         }).reduce(function (m, w) {
                           return m+w;
                         }, 0);

      // adjust
      if (widths > $el.width()) {
        widgets.forEach(function (widget) {
          widget.attr('show_title', false);
        });
      }
    }, 100),
    '.closed click' : function(el, ev) {
      var $link = el.closest('a'),
          widget = this.widget_by_selector($link.attr('href')),
          active_widget = this.options.contexts.attr("active_widget"),
          widgets = this.options.widget_list;

      widget.attr('force_show', false);
      this.route(widgets[0].selector); // Switch to the first widget
      return false; // Prevent the url change back to the widget we are hiding
    },

    // top nav dropdown position
    ".dropdown-toggle click": function(el, ev) {
      var $dropdown = el.closest(".hidden-widgets-list").find(".dropdown-menu"),
        $menu_item = $dropdown.find(".inner-nav-item").find("a"),
        offset = el.offset(),
        top_pos = offset.top + 36,
        left_pos = offset.left,
        win = $(window),
        win_height = win.height(),
        footer_height = $(".footer").outerHeight(),
        remain_height = win_height - footer_height,
        win_width = win.width();

      if(win_width - left_pos < 322) {
        $dropdown.addClass("right-pos");
      } else {
        $dropdown.removeClass("right-pos");
      }
      if($menu_item.length === 1) {
        $dropdown.addClass("one-item");
      } else {
        $dropdown.removeClass("one-item");
      }
    }
});

})(this.can, this.can.$);
