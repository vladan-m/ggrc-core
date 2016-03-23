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
    mapped_workflow: [{
      icon: 'workflow',
      title: 'Backlog (One time)'
    }]
  };
})(GGRC || {}, GGRC.Mockup.Generator);
