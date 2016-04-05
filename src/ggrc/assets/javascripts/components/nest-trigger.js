/*!
  Copyright (C) 2016 Google Inc., authors, and contributors <see AUTHORS file>
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
  Created By: vladan@reciprocitylabs.com
  Maintained By: vladan@reciprocitylabs.com
*/

(function (can, $) {
  can.Component.extend({
    tag: 'nested-list',
    template: can.view(GGRC.mustache_path +
      '/base_objects/nested_list.mustache'),
    events: {
      '.nest-checkbox-trigger change': function (el, ev) {
        var isChecked = el.is(':checked');
        var nestedElement = el.closest('.nested-checkbox-wrap')
          .find('.checkbox-list');
        if (!isChecked) {
          nestedElement.hide();
        } else {
          nestedElement.show();
        }
      }
    }
  });
})(window.can, window.can.$);
