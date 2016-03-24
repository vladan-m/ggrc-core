(function (GGRC, Generator) {
  GGRC.Bootstrap.Mockups = GGRC.Bootstrap.Mockups || {};
  GGRC.Bootstrap.Mockups.Workflow2 = GGRC.Bootstrap.Mockups.Workflow2 || {};

  GGRC.Bootstrap.Mockups.Workflow2.Sprints = {
    title: 'Sprints',
    icon: 'history',
    template: '/workflow-v2.2/sprints.mustache',
    sprints: [{
      value: 'Monthly Sprint 1 - ENDS ON 03/31/2016'
    }],
    tasks: Generator.create({
      type: 'task'
    }),
    mapped_workflow: [{
      icon: 'workflow',
      title: 'SOX issues resolving'
    }],
    children: [{
      title: Generator.title(1),
      description: Generator.paragraph(7),
      state: 'Draft',
      state_color: 'draft',
      type: 'my_task',
      workflow_title: Generator.title(1),
      obj_title: Generator.title(1),
      status: 'Draft',
      id: '1'
    }]
  };
})(GGRC || {}, GGRC.Mockup.Generator);
