$(document).ready(function() {

  can.Component.extend({
    tag: "program-info",
    scope: {
    },
    template: "<content/>",
    helpers: {
    },
    events: {
    }
  });
  $(".object-wrap-info").html(can.view("/static/mockups/mustache/subtree/info.mustache",{}));

  can.Component.extend({
    tag: "control",
    scope: {
    },
    template: "<content/>",
    helpers: {
    },
    events: {
    }
  });
  $(".object-wrap-control").html(can.view("/static/mockups/mustache/subtree/control.mustache",{}));

  function innerNavTrigger() {
    var $this = $(this),
        $allList = $this.closest(".nav").children("li"),
        $list = $this.closest("li"),
        aId = $this.attr("href"),
        $element = $("div"+aId);

    $allList.removeClass('active');
    $list.addClass('active');

    $(".object-wrap").hide();
    $(".object-wrap"+aId).show();
  }

  $(".top-inner-nav a").on("click", innerNavTrigger);

});
