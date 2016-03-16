(function (GGRC, Generator) {
  GGRC.Bootstrap.Mockups = GGRC.Bootstrap.Mockups || {};
  GGRC.Bootstrap.Mockups.QTask = GGRC.Bootstrap.Mockups.QTask || {};

  GGRC.Bootstrap.Mockups.QTask.Info = {
    title: 'Control Info',
    info_title: 'AC01',
    icon: 'info-circle',
    template: '/quick-workflow-v2.1/info.mustache',
    description: 'Managers approve user requests for new and/or modified system access based on job responsibility, prior to granting access to the in-scope systems. Access approval is documented via a formal access request.',
    owner: 'andraz@reciprocitylabs.com',
    prime_contact: 'andraz@reciprocitylabs.com',
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
    url: 'None',
    ref_url: 'None'
  };
})(GGRC || {}, GGRC.Mockup.Generator);
