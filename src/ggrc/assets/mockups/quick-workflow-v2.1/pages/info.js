(function (GGRC, Generator) {
  GGRC.Bootstrap.Mockups = GGRC.Bootstrap.Mockups || {};
  GGRC.Bootstrap.Mockups.QTask = GGRC.Bootstrap.Mockups.QTask || {};

  GGRC.Bootstrap.Mockups.QTask.Info = {
    title: 'Program Info',
    info_title: 'SOX',
    icon: 'info-circle',
    template: '/quick-workflow-v2.1/info.mustache',
    description: Generator.paragraph(8),
    notes: Generator.paragraph(5),
    manager: 'prasanna@reciprocitylabs.com',
    prime_contact: 'prasanna@reciprocitylabs.com',
    sec_contact: 'None',
    tasks: Generator.create({
      title: {
        value: 'Task for SOX'
      },
      assignee: {
        value: 'Predrag Kanazir'
      },
      end_date: {
        value: '22/03/18'
      }
    }),
    url: 'a private program a private program a private program a private program a private program a private program a private program a private program a private program a private program a private program a private program',
    ref_url: 'a private program a private program a private program a private program a private program a private program a private program a private program a private program a private program a private program a private program a private program a private progra'
  };
})(GGRC || {}, GGRC.Mockup.Generator);
