(function (GGRC, Generator) {
  GGRC.Bootstrap.Mockups = GGRC.Bootstrap.Mockups || {};
  GGRC.Bootstrap.Mockups.Workflow2 = GGRC.Bootstrap.Mockups.Workflow2 || {};

  GGRC.Bootstrap.Mockups.Workflow2.Template = {
    title: "Template",
    icon: "cycle",
    template: "/workflow-v2.2/template.mustache",
    sprints: [{
      value: 'Monthly Sprint 1 - ENDS ON 03/31/2016'
    }],
    children: Generator.create({
      title: "%title",
      type: "workflow",
      due_on: '12/31/2017',
      id: "%id",
      children: Generator.create({
        title: "Task Group",
        type: "task_group",
        icon: "task_group",
        id: "%id",
        children: Generator.get("task")
      })
    })
  };
})(GGRC || {}, GGRC.Mockup.Generator);
