/*!
    Copyright (C) 2016 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: ivan@reciprocitylabs.com
    Maintained By: ivan@reciprocitylabs.com
*/

(function (can, $) {
  'use strict';

  /*
    Component abstracts <select> dropdown in HTML.

    It recieves `name` of the attribute that should be set and `optionsList`
    with titles and values
   */
  GGRC.Components('dropdown', {
    tag: 'dropdown',
    template: can.view(
      GGRC.mustache_path +
      '/components/dropdown/dropdown.mustache'
    ),
    scope: {
      name: '@',
      className: '@',
      onChange: $.noop,
      /*
        Options list should be an `array` of object containing `title` and `value`
        [{
          title: `title`
          value: `value`
        }]
       */
      optionsList: null
    }
  });
})(window.can, window.can.$);
