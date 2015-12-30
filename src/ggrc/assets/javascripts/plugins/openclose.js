/*!
    Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: ivan@reciprocitylabs.com
    Maintained By: ivan@reciprocitylabs.com
*/
(function ($) {
  function openclose(command) {
    var $that = $(this);
    var use_slide = $that.length < 100;

    $that.each(function () {
      var $this = $(this);
      var $main = $this.closest('.item-main');
      var $li = $main.closest('li');
      var $content = $li.children('.item-content');
      var $icon = $main.find('.openclose');
      var $parentTree = $this.closest('ul.new-tree');
      var cmd = command;
      var callback;

      callback = function () {
        //  Trigger update for sticky headers and footers
        $this.trigger('updateSticky');
      };

      if (typeof cmd !== 'string' || cmd === 'toggle') {
        cmd = $icon.hasClass('active') ? 'close' : 'open';
      }

      if (cmd === 'close') {
        if (use_slide) {
          $content.slideUp('fast', callback);
        } else {
          $content.css('display', 'none');
          callback();
        }
        $icon.removeClass('active');
        $li.removeClass('item-open');
        // Only remove tree open if there are no open siblings
        if (!$li.siblings('.item-open').length) {
          $parentTree.removeClass('tree-open');
        }
        $content.removeClass('content-open');
      } else if (cmd === 'open') {
        if (use_slide) {
          $content.slideDown('fast', callback);
        } else {
          $content.css('display', 'block');
          callback();
        }
        $icon.addClass('active');
        $li.addClass('item-open');
        $parentTree.addClass('tree-open');
        $content.addClass('content-open');
      }
    });

    return this;
  }
  $.fn.openclose = openclose;
})(jQuery);
