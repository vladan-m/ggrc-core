/*!
    Copyright (C) 2016 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: ivan@reciprocitylabs.com
    Maintained By: ivan@reciprocitylabs.com
*/

(function (can, $) {
  'use strict';

  GGRC.Components('wrapper-assessment-template', {
    tag: 'wrapper-assessment-template',
    template: '<content></content>',
    scope: {
      instance: null
    },
    events: {
      '{scope.instance} template_object_type': function () {
        this.scope.attr('instance.test_plan_procedure', false);
      }
    }
  });
})(window.can, window.can.$);
