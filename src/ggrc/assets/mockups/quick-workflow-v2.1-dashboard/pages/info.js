(function (GGRC, Generator) {
  GGRC.Bootstrap.Mockups = GGRC.Bootstrap.Mockups || {};
  GGRC.Bootstrap.Mockups.QDashboard = GGRC.Bootstrap.Mockups.QDashboard || {};

  GGRC.Bootstrap.Mockups.QDashboard.Info = {
    title: 'Info',
    icon: 'info-circle',
    template: '/quick-workflow-v2.1-dashboard/info.mustache',
    tasks: Generator.create({
      type: 'task'
    }),
    workflows: Generator.create({
      type: 'workflow'
    }),
    mapped_workflow: [{
      icon: 'workflow',
      title: 'Backlog (One time)'
    }],
    repeats: [{
      value: 'One time'
    }, {
      value: 'Weekly'
    }, {
      value: 'Monthly'
    }, {
      value: 'Quarterly'
    }, {
      value: 'Annually'
    }]
  };
})(GGRC || {}, GGRC.Mockup.Generator);
