(function (GGRC, Generator) {
  GGRC.Bootstrap.Mockups = GGRC.Bootstrap.Mockups || {};
  GGRC.Bootstrap.Mockups.Request = GGRC.Bootstrap.Mockups.Request || {};

  GGRC.Bootstrap.Mockups.Request.InfoWorkflow = {
    title: "Workflow",
    icon: "grcicon-info",
    template: "/request/workflow.mustache",
    info_title: "Test structure flexibility",
    description: Generator.paragraph(7),
    state: {
      title: "Active",
      class_name: "inprogress"
    },
    people: {
      "manager": Generator.get("user", 1)
    }
  };
})(GGRC || {}, GGRC.Mockup.Generator);
