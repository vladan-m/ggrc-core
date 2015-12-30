/*!
    Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: ivan@reciprocitylabs.com
    Maintained By: ivan@reciprocitylabs.com
*/
(function ($) {
  // Fix positioning of bootstrap tooltips when on left/right edge of screen
  // Possibly remove this when upgrade to Bootstrap 2.3.0 (which has edge detection)
  var _tooltip_show = $.fn.tooltip.Constructor.prototype.show;
  $.fn.tooltip.Constructor.prototype.show = function () {
    var margin = 10;
    var container_width = document.width;
    var tip_pos;
    var $arrow;
    var offset;
    var return_value;

    if (!this.hasContent() || !this.enabled) {
      return undefined; // because _tooltip_show will do this too
    }

    _tooltip_show.apply(this);

    return_value = this.$tip.css({
      'white-space': 'normal'
    });

    tip_pos = this.$tip.position();
    tip_pos.width = this.$tip.width();
    tip_pos.height = this.$tip.height();
    $arrow = this.$tip.find('.tooltip-arrow');

    offset = tip_pos.left + tip_pos.width - container_width + margin;
    if (offset > 0) {
      this.$tip.css({
        left: tip_pos.left - offset
      });
      $arrow.css({
        left: parseInt($arrow.css('left'), 10) + offset
      });
    } else if (tip_pos.left < margin) {
      this.$tip.css({
        left: margin
      });
      $arrow.css({
        left: parseInt($arrow.css('left'), 10) + tip_pos.left - margin
      });
    }

    return return_value;
  };

  // Monitor Bootstrap Tooltips to remove the tooltip if the triggering element
  // becomes hidden or removed.
  //
  // * $currentTip needed because tooltips don't fire events until Bootstrap
  //   2.3.0 and $currentTarget.tooltip('hide') doesn't seem to work when it's
  //   not in the DOM
  // * $currentTarget.data('tooltip-monitor') is a flag to ensure only one
  //   monitor per element
  function monitorTooltip($currentTarget) {
    var monitorPeriod = 500;
    var $currentTip;
    var dataTooltip;
    var monitorFn = function () {
      dataTooltip = dataTooltip || $currentTarget.data('tooltip');
      $currentTip = $currentTip || (dataTooltip && dataTooltip.$tip);

      if (!$currentTarget.is(':visible')) {
        if ($currentTip) {
          $currentTip.remove();
        }
        $currentTarget.data('tooltip-monitor', false);
      } else if ($currentTip && $currentTip.is(':visible')) {
        setTimeout(monitorFn, monitorPeriod);
      } else {
        $currentTarget.data('tooltip-monitor', false);
      }
    };

    if (!$currentTarget.data('tooltip-monitor')) {
      dataTooltip = $currentTarget.data('tooltip');
      $currentTip = dataTooltip && dataTooltip.$tip;
      setTimeout(monitorFn, monitorPeriod);
      $currentTarget.data('tooltip-monitor', true);
    }
  }

  $('body').on('shown', '.modal', function () {
    $('.tooltip').hide();
  });
  // Listeners for initial tooltip mouseovers
  $('body').on('mouseover', '[data-toggle="tooltip"], [rel=tooltip]',
    function (e) {
      var $currentTarget = $(e.currentTarget);
      if (!$currentTarget.data('tooltip')) {
        $currentTarget
          .tooltip({
            delay: {
              show: 500,
              hide: 0
            }
          })
          .triggerHandler(e);
      }

      monitorTooltip($currentTarget);
    });
})(jQuery);
