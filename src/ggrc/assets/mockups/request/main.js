/*!
    Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: anze@reciprocitylabs.com
    Maintained By: anze@reciprocitylabs.com
*/


(function (can, $) {

  // Only load this file when the URL is mockups/sample:
  if (window.location.pathname !== "/mockups/request") {
    return;
  }

  // Setup the object page:
  var mockup = new CMS.Controllers.MockupHelper($('body'), {
    // Object:
    object: {
      icon: "grciconlarge-audit",
      title: "My new request",
    },
    // Views:
    views: [{
        // Example on how to use an existing template:
        title: "Info",
        icon: "grcicon-info",
        template: "/request/info.mustache",
        info_title: "My new request",
        description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras vitae ante dapibus lacus dictum vestibulum. Nullam finibus semper convallis. Ut libero mauris, viverra nec augue eget, congue viverra felis. Aenean ut arcu vel tortor rhoncus dictum id vel urna. Sed a enim laoreet diam lacinia euismod.",
        state: "In Progress",
        people_assignee: "Martin L.K.",
        people_requester: "Josh Smith",
        people_verifier: "Prasanna V.",
        created_on: "12/03/14",
        due_on: "12/31/15",
        type_a: "assignee",
        type_r: "requester",
        type_v: "verifier",
        files: [{
          icon: "pdf",
          date: "04/05/2010",
          name: "MTV_001_SIGNED_LoginAccess_List.pdf",
          url: "http://google.com/"
        }, {
          icon: "doc",
          date: "04/15/2014",
          name: "Simple_Word_document.doc",
          url: "http://google.com/"
        }, {
          icon: "xls",
          date: "04/18/2015",
          name: "Simple_Excel_document.xls",
          url: "http://google.com/"
        }, {
          icon: "image",
          date: "09/19/2015",
          name: "Image_of_nature.png",
          url: "http://google.com/"
        }, {
          icon: "",
          date: "09/21/2015",
          name: "canjs-observe-bug.txt",
          url: "http://google.com/"
        }]
      }, {
        title: "Audits",
        icon: "grcicon-audit-color",
        template: "/base_objects/tree.mustache"
      }
    ]
  });
})(this.can, this.can.$);