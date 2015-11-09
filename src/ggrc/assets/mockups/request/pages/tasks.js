(function (GGRC, Generator) {
  GGRC.Bootstrap.Mockups = GGRC.Bootstrap.Mockups || {};
  GGRC.Bootstrap.Mockups.Request = GGRC.Bootstrap.Mockups.Request || {};

  GGRC.Bootstrap.Mockups.Request.Tasks = {
    title: "Tasks",
    icon: "grcicon-task-color",
    template: "/request/widget.mustache",
    children: [{
      title: "My new task",
      info_title: "My new task",
      description: Generator.paragraph(7),
      state: {
        title: "In Progress",
        class_name: "inprogress"
      },
      state_color: "inprogress",
      type: "task",
      status: "In Progress",
      id: "2",
      created_on: "12/03/14",
      due_on: "12/31/15",
      object_type: "program",
      object_title: "Google fiber Program",
      workflow: "Test structure flexibility",
      comment_text: "Some simple comment",
      children: [{
        title: "Other title",
        type: "process",
        id: "23"
      }, {
        title: "YOLO",
        type: "issue",
        id: "24"
      }, {
        title: "R U Talking to me",
        type: "system",
        id: "12"
      }]
    }, {
      title: "Simple Request for Programs",
      type: "issue",
      id: "3",
      status: "Draft",
      children: []
    }, {
      title: "Request made for Sections inspection",
      type: "audit",
      id: "5",
      status: "Draft",
      children: [{
        title: "Other title",
        type: "process",
        id: "63"
      }, {
        title: "YOLO",
        type: "issue",
        id: "344"
      }, {
        title: "R U Talking to me",
        type: "system",
        id: "342"
      }, {
        title: "Other title",
        type: "process",
        id: "33"
      }, {
        title: "YOLO",
        type: "issue",
        id: "54"
      }, {
        title: "R U Talking to me",
        type: "system",
        id: "62"
      }]
    }]
  };
})(GGRC || {}, GGRC.Mockup.Generator);
