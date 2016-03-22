(function (GGRC, Generator) {
  GGRC.Bootstrap.Mockups = GGRC.Bootstrap.Mockups || {};
  GGRC.Bootstrap.Mockups.QDashboard = GGRC.Bootstrap.Mockups.QDashboard || {};

  GGRC.Bootstrap.Mockups.QDashboard.Tasks = {
    title: 'Tasks',
    icon: 'cycle_task_group_object_task',
    template: '/quick-workflow-v2.1-dashboard/widget.mustache',
    tasks: Generator.create({
      type: 'task'
    }),
    mapped_workflow: [{
      icon: 'workflow',
      title: 'Backlog'
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
    }, {
      title: Generator.title(1),
      description: Generator.paragraph(7),
      state: 'Draft',
      state_color: 'draft',
      type: 'my_task',
      workflow_title: Generator.title(1),
      obj_title: Generator.title(1),
      status: 'Draft',
      id: '2'
    }, {
      title: Generator.title(1),
      description: Generator.paragraph(7),
      state: 'Draft',
      state_color: 'draft',
      type: 'my_task',
      workflow_title: Generator.title(1),
      obj_title: Generator.title(1),
      status: 'Draft',
      id: '3'
    }]
  };
})(GGRC || {}, GGRC.Mockup.Generator);
