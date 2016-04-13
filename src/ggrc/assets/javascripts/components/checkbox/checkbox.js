/*!
  Copyright (C) 2016 Google Inc., authors, and contributors <see AUTHORS file>
  Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
  Created By: vladan@reciprocitylabs.com
  Maintained By: vladan@reciprocitylabs.com
*/

(function (can, $) {
  'use strict';

  GGRC.Components('checkbox', {
    tag: 'checkbox',
    template: can.view(
      GGRC.mustache_path +
      '/components/checkbox/checkbox.mustache'
    ),
    scope: {
      label: '@',
      property: '@'
    }
  });
})(window.can, window.can.$);
