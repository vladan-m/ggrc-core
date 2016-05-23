/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: brad@reciprocitylabs.com
    Maintained By: brad@reciprocitylabs.com
*/

!function ($) {

  "use strict"; // jshint ;_;

  /* MODAL_FORM PUBLIC CLASS DEFINITION
   * =============================== */

  var ModalForm = function (element, options, trigger) {

    this.options = options;
    this.$element = $(element);
    this.$trigger = $(trigger);

    this.init();
  };

  /* NOTE: MODAL_FORM EXTENDS BOOTSTRAP-MODAL.js
   * ========================================== */

  ModalForm.prototype = new $.fn.modal.Constructor(null, {remote : false});

  $.extend(ModalForm.prototype, {

    init: function () {
      var that = this
        , $form;
      this.$element
        .on('preload', function () {
          that.is_form_dirty(true);
        })
        .on('keypress', 'form', $.proxy(this.keypress_submit, this))
        .on('keyup', 'form', $.proxy(this.keyup_escape, this))
        .on('click.modal-form.close', '[data-dismiss="modal"]', $.proxy(this.hide, this))
        .on('click.modal-form.reset', 'input[type=reset], [data-dismiss="modal-reset"]', $.proxy(this.reset, this))
        .on('click.modal-form.submit', 'input[type=submit], [data-toggle="modal-submit"]', $.proxy(this.submit, this))
        .on('shown.modal-form', $.proxy(this.focus_first_input, this))
        .on('loaded.modal-form', $.proxy(this.focus_first_input, this))
        .on('loaded.modal-form', function (ev) {
          $("a[data-wysihtml5-command], a[data-wysihtml5-action]", ev.target).attr('tabindex', "-1");
          $form = that.$form();
          $(this).trigger("shown"); // this will reposition the modal stack
        })
        .on('delete-object', $.proxy(this.delete_object, this))
        .draggable({handle: '.modal-header'});

    }

  , doNothing: function (e) {
    e.stopImmediatePropagation();
    e.stopPropagation();
    e.preventDefault();
  }

  , delete_object: function (e, data, xhr) {
      // If this modal is contained within another modal, pass the event onward
    var $trigger_modal = this.$trigger.closest('.modal')
        , delete_target
        ;

    if ($trigger_modal.length > 0) {
      $trigger_modal.trigger('delete-object', [data, xhr]);
    } else {
      delete_target = this.$trigger.data('delete-target');
      if (delete_target == 'refresh') {
          // Refresh the page
        GGRC.navigate(window.location.href.replace(/#.*/, ''));
      } else if (xhr && xhr.getResponseHeader('location')) {
          // Otherwise redirect if possible
        GGRC.navigate(xhr.getResponseHeader('location'));
      } else {
          // Otherwise refresh the page
        GGRC.navigate(window.location.href.replace(/#.*/, ''));
      }
    }
  }

  , $form: function () {
    return this.$element.find('form').first();
  }

  , is_form_dirty: function (cache_values) {
    var that = this
        , cache = {}
        , dirty = false
        ;

      // Generate a hash of the form values
    can.each(this.$form().serializeArray(), function (field) {
      cache[field.name] = cache[field.name] ? cache[field.name] + ',' + field.value : field.value;
    });

      // Cache the initial form values as requested
    if (cache_values || !this._cached_values) {
      this._cached_values = cache;
    }
      // Otherwise compute a diff to determine whether the form is dirty
    else {
      can.each(cache, function (value, key) {
        dirty = dirty || (value !== that._cached_values[key] && (!!value || that._cached_values[key] !== undefined));
      });
    }

    return dirty;
  }

  , submit: function (e) {
    var $form = this.$form()
      , that = this;

    if (!$form.data("submitpending")) {
      $("[data-toggle=modal-submit]", $form)
          .each(function () { $(this).data("origText", $(this).text()); })
          .addClass("disabled pending-ajax")
          .attr("disabled", true);

      $form.data("submitpending", true)
        .one("ajax:beforeSend", function (ev, _xhr) {
          that.xhr = _xhr;
        })
        .submit();
    }
    if (e.type == 'click')
      e.preventDefault();
  }

  , keypress_submit: function (e) {
    if (e.which == 13 && !$(e.target).is('textarea')) {
      if (!e.isDefaultPrevented()) {
        e.preventDefault();
        this.$form().submit();
      }
    }
  }

  , keyup_escape : function (e) {
    if ($(document.activeElement).is("select, [data-toggle=datepicker]") && e.which === 27) {
      this.$element.attr("tabindex", -1).focus();
      e.stopPropagation();
    }
  }

  , reset: function (e) {
    var form = this.$form()[0];
    form && form.reset();
    this.hide(e);
  }

  , hide: function (e) {
    var that = this,
      control = this.$element.control(),
      options = control && control.options;

      // If the hide was initiated by the backdrop, check for dirty form data before continuing
    if (e && $(e.target).is('.modal-backdrop')) {

      if ($(e.target).is(".disabled")) {
          // In the case of a disabled modal backdrop, treat it like any other disabled data-dismiss,
          //  i.e. do nothing.
        e.stopPropagation();
        return;
      }
      if (this.is_form_dirty()) {
          // Confirm that the user wants to lose the data prior to hiding
        GGRC.Controllers.Modals.confirm({
          modal_title : "Discard Changes"
            , modal_description : "Are you sure that you want to discard your changes?"
            , modal_confirm : "Discard"
            , instance : options.instance
            , model : options.model
            , skip_refresh : true
        }, function () {
          $.when(function () {
            can.trigger(options.instance, "modal:dismiss");
          }).then(function () {
            that.$element.find("[data-dismiss='modal'], [data-dismiss='modal-reset']").trigger("click");
            that.hide();
          });
        });
        return;
      }
    }

      // Hide the modal like normal
    $.when(function () {
      if (options) {
        return can.trigger(options.instance, "modal:dismiss");
      }
      return;
    }).then(function () {
      $.fn.modal.Constructor.prototype.hide.apply(this, [e]);
      this.$element.off('modal_form');
    }.bind(this));
  }

  , focus_first_input: function (ev) {
    var that = this;
    setTimeout(function () {
      var $first_input;
      $first_input = that.$element.find('*[autofocus]');
      if ($first_input.length == 0) {
        $first_input = that.$element
            .find('input[type="text"], input[type="checkbox"], select, textarea')
            .not('[placeholder*=autofill], label:contains(autofill) + *, [disabled]')
            .first();
      }
      if ($first_input.length > 0 && (!ev || that.$element.is(ev.target))) {
        $first_input.get(0).focus();
      }
    }, 100);
  }
  });

  $.fn.modal_form = function (option, trigger) {
    return this.each(function () {
      var $this = $(this)
        , data = $this.data('modal_form')
        , options = $.extend({}, $.fn.modal_form.defaults, $this.data(), typeof option == 'object' && option);
      if (!data) $this.data('modal_form', (data = new ModalForm(this, options, trigger)));
      if (typeof option == 'string') data[option]();
      else if (options.show) data.show();
    });
  };

  $.fn.modal_form.Constructor = ModalForm;

  $.fn.modal_form.defaults = $.extend({}, $.fn.modal.defaults, {

  });

  /* MODAL-FORM DATA-API
   * =================== */

  $(function () {
    $('body').on('click.modal-form.data-api', '[data-toggle="modal-form"]', function (e) {
      var $this = $(this), href
        , $target = $($this.attr('data-target') || (href = $this.attr('href')) && href.replace(/.*(?=#[^\s]+$)/, '')) // strip for ie7
        , option = $target.data('modal-form') ? 'toggle' : $.extend({}, $target.data(), $this.data());

      e.preventDefault();
      $target.modal_form(option);
    });
  });

  // Default flash handler
  $(function () {
    // Default form complete handler
    $('body').on('ajax:complete', function (e, xhr, status) {
      var data = null;
      try {
        data = JSON.parse(xhr.responseText);
      } catch (exc) {
        // console.debug('exc', exc);
      }

      if (!e.stopRedirect) {
        // Maybe handle AJAX/JSON redirect or refresh
        if (xhr.status == 278) {
          // Handle 278 redirect (AJAX redirect)
          GGRC.navigate(xhr.getResponseHeader('location'));
        } else if (xhr.status == 279) {
          // Handle 279 page refresh
          GGRC.navigate(window.location.href.replace(/#.*/, ''));
        }
        else {
          var modal_form = $(".modal:visible:last").data("modal_form");
          if (modal_form && xhr === modal_form.xhr) {
            delete modal_form.xhr;
            $("[data-toggle=modal-submit]", modal_form.$element)
            .removeAttr("disabled")
            .removeClass("disabled pending-ajax")
            .each(function () {
              $(this).text($(this).data("origText"));
            });
            $("form", modal_form.$element).data("submitpending", false);
          }
        }
      }

      if (data) {
        // Parse and dispatch JSON object
        $(e.target).trigger('ajax:json', [data, xhr]);
      } else if (xhr.responseText) {
        // Dispatch as html, if there is html to dispatch.  (no result should not blank out forms)
        $(e.target).trigger('ajax:html', [xhr.responseText, xhr]);
      }

      if (!e.stopFlash) {
        // Maybe handle AJAX flash messages
        var flash_types = ["error", "alert", "notice", "warning"]
          , type_i, message
          , flash;

        for (type_i in flash_types) {
          message = xhr.getResponseHeader('x-flash-' + flash_types[type_i]);
          message = JSON.parse(message);
          if (message) {
            if (!flash)
              flash = {};
            flash[flash_types[type_i]] = message;
          }
        }

        if (flash) {
          $(document.body).trigger('ajax:flash', flash);
        }
      }
    });

    $('body').on('ajax:flash', function (e, flash) {
      var $target;
      var $flashHolder;
      var type;
      var message;
      var messageI;
      var flashClass;
      var addLink;
      var $link;
      var flashClassMappings = {
        notice: 'success',
        Running: 'progress',
        Pending: 'progress'
      };
      var $html;
      var gotMessage = _.some(_.values(flash), function (msg) {
        return !!msg;
      });

      if (!gotMessage) {
        // sometimes ajax:flash is triggered with bad data
        return;
      }

      // Find or create the flash-message holder
      $target = $(e.target);
      if ($target.has('.modal-body').length < 1) {
        $target = $('body');
      }
      $flashHolder = $target.find('.flash');

      if ($flashHolder.length === 0) {
        $flashHolder = $('<div class="flash"></div>');
        $target.find('.modal-body').prepend($flashHolder);
      } else {
        $flashHolder.empty();
      }

      for (type in flash) {
        if (flash[type]) {
          if (_.isString(flash[type])) {
            flash[type] = [flash[type]];
          }

          flashClass = flashClassMappings[type] || type;

          $html = $('<div></div>');
          $html.addClass('alert').addClass('alert-' + flashClass);
          if (flashClass !== 'progress') {
            $html.addClass('alert-autohide');
          }
          $html.append('<a href="#" class="close" data-dismiss="alert">x</a>');

          for (messageI in flash[type]) {
            addLink = flash[type][messageI].indexOf('{reload_link}') > -1;
            message = flash[type][messageI].replace('{reload_link}', '');
            if (addLink) {
              $html.removeClass('alert-autohide');
            }
            // Skip error codes. To force display use String(...) when
            // triggering the flash.
            if (_.isString(message)) {
              $html.append($('<span></span>').text(message));
              if (addLink) {
                $link = $('<a href="javascript://">Show results</a>');
                $link.on('click', function () {
                  window.location.reload();
                });
                $html.append($link);
              }
            }
          }
          $flashHolder.append($html);
        }
      }
    });

    $('body').on('ajax:html', '.modal > form', function (e, html, xhr) {
      var sel = "script[type='text/javascript'], script[language='javascript'], script:not([type])";
      var $frag = $(html);
      $frag.filter(sel).add($frag.find(sel)).each(function () {
        $(this).remove();
        setTimeout($(this).html(), 10);
      });
      $(this).find('.modal-body').html($frag);
    });

  });
}(window.jQuery);
