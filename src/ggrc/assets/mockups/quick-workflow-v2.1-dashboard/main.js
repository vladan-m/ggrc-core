/*!
    Copyright (C) 2016 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: vladan@reciprocitylabs.com
    Maintained By: vladan@reciprocitylabs.com
*/

(function (can, $) {
  // Only load this file when the URL is mockups/sample:
  if (window.location.pathname !== '/mockups/quick-workflow-v2.1-dashboard') {
    return;
  }

  // Setup the object page:
  var mockup = new CMS.Controllers.MockupHelper($('body'), {
    // Object:
    object: {
      title: 'My Work'
    },
    // Views:
    views: _.values(GGRC.Bootstrap.Mockups.QDashboard)
  });
})(this.can, this.can.$);