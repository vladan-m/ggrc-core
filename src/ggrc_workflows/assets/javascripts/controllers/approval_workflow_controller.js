/*!
    Copyright (C) 2014 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: brad@reciprocitylabs.com
    Maintained By: brad@reciprocitylabs.com
*/

/* eslint camelcase: 0 */

(function (can, $, GGRC, CMS) {
  GGRC.Controllers.Modals('GGRC.Controllers.ApprovalWorkflow', {
    defaults: {
      original_object: null,
      new_object_form: true,
      model: CMS.ModelHelpers.ApprovalWorkflow,
      modal_title: 'Submit for review',
      custom_save_button_text: 'Submit',
      content_view:
        GGRC.mustache_path + '/wf_objects/approval_modal_content.mustache',
      button_view: GGRC.Controllers.Modals.BUTTON_VIEW_SAVE_CANCEL
    }
  }, {
    init: function () {
      this.options.button_view =
        GGRC.Controllers.Modals.BUTTON_VIEW_SAVE_CANCEL;

      this._super.apply(this, arguments);

      this.options.attr(
        'instance',
        new CMS.ModelHelpers.ApprovalWorkflow({
          original_object: this.options.instance
        }));
    },

    'input[null-if-empty] change': function (el, ev) {
      var attrName;

      if (el.val() === '') {
        attrName = el.attr('name').split('.').slice(0, -1).join('.');
        this.options.instance.attr(attrName, null);
      }
    }
  });

  GGRC.register_modal_hook(
    'approvalform',
    function ($target, $trigger, option) {
      var instance;
      var objectParams;

      if ($trigger.attr('data-object-id') === 'page') {
        instance = GGRC.page_instance();
      } else {
        instance = CMS.Models.get_instance(
          $trigger.data('object-singular'), $trigger.attr('data-object-id'));
      }

      objectParams = JSON.parse($trigger.attr('data-object-params') || '{}');

      $target
        .modal_form(option, $trigger)
        .ggrc_controllers_approval_workflow({
          object_params: objectParams,
          current_user: GGRC.current_user,
          instance: instance
        });
    }
  );
})(this.can, this.can.$, this.GGRC, this.CMS);

// Calendar authentication

jQuery(function ($) {
  $('body').on('click', '.calendar-auth', function (ev) {
    var calenderAuthWin = null;
    var name = 'Calendar Authentication';

    // "https://ggrc-dev.googleplex.com/calendar_oauth_request"
    var href = window.location.origin + '/calendar_oauth_request';

    if (calenderAuthWin === null || calenderAuthWin.closed) {
      calenderAuthWin = window.open(href, name);
      calenderAuthWin.focus();
    } else {
      calenderAuthWin.focus();
    }
  });
});
