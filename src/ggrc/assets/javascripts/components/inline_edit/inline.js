/*!
    Copyright (C) 2016 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: ivan@reciprocitylabs.com
    Maintained By: ivan@reciprocitylabs.com
*/

(function (can, $) {
  'use strict';

  GGRC.Components('inline-edit', {
    tag: 'inline-edit',
    template: can.view(
      GGRC.mustache_path +
      '/components/inline_edit/inline.mustache'
    ),
    scope: {
      instance: null,
      type: '@',
      caId: null,
      property: null,
      values: null,
      isSaving: false,
      context: {
        isEdit: false,
        value: null,
        values: null,
        title: null,
        label: null
      },
      enableEdit: function (ctx, el, ev) {
        ev.preventDefault();

        this.attr('context.isEdit', true);
      },
      onCancel: function (ctx, el, ev) {
        ev.preventDefault();
        this.attr('context.isEdit', false);
        this.attr('context.value', this.attr('property'));
      },
      onSave: function (ctx, el, ev) {
        var caid = this.attr('caId');
        var prop = this.attr('property');
        var instance = this.attr('instance');
        var value = this.attr('context.value');

        ev.preventDefault();

        if (this.attr('caId')) {
          instance.attr('custom_attributes.' + caid, value);
        } else {
          instance.attr(prop, value);
        }

        this.attr('context.isEdit', false);
        this.attr('isSaving', true);
        instance.save().then(function () {
          this.attr('isSaving', false);
        }.bind(this));
      }
    },
    init: function () {
      var scope = this.scope;

      if (!scope.instance.custom_attributes) {
        _.defer(scope.instance.setup_custom_attributes.bind(scope.instance));
      }

      scope.attr('context.value', scope.attr('property'));
      scope.attr('context.title', scope.attr('title'));
      scope.attr('context.label', scope.attr('label'));
      if (_.isString(scope.attr('values'))) {
        scope.attr('context.values', scope.attr('values').split(','));
      }
    },
    events: {
      click: function () {
        this.scope.attr('isInside', true);
      },
      '{window} click': function (el, ev) {
        if (this.scope.attr('context.isEdit') &&
            !this.scope.attr('isInside')) {
          this.scope.onSave(this.scope, el, ev);
        }
        this.scope.attr('isInside', false);
      }
    }
  });
})(window.can, window.can.$);