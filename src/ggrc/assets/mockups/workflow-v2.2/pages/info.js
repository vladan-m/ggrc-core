(function (GGRC, Generator) {
  GGRC.Bootstrap.Mockups = GGRC.Bootstrap.Mockups || {};
  GGRC.Bootstrap.Mockups.Workflow2 = GGRC.Bootstrap.Mockups.Workflow2 || {};

  GGRC.Bootstrap.Mockups.Workflow2.Info = {
    title: 'Info',
    icon: 'info-circle',
    template: '/workflow-v2.2/info.mustache',
    info_title: 'SOX issues resolving',
    state: 'Draft',
    state_color: 'draft',
    description: Generator.paragraph(7),
    manager: 'Predrag Kanazir',
    frequency: 'Monthly'
  };
})(GGRC || {}, GGRC.Mockup.Generator);
