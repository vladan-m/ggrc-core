(function (GGRC, Generator) {
  GGRC.Bootstrap.Mockups = GGRC.Bootstrap.Mockups || {};
  GGRC.Bootstrap.Mockups.QTask = GGRC.Bootstrap.Mockups.QTask || {};

  GGRC.Bootstrap.Mockups.QTask.Systems = {
    title: 'Systems',
    icon: 'system',
    template: '/quick-workflow-v2.1/widget.mustache',
    tasks: Generator.create({
      type: 'task'
    }),
    mapped_workflow: [{
      icon: 'workflow',
      title: 'Backlog (One time)',
      read_only: false
    }],
    children: [{
      title: 'SOX 1',
      info_title: 'SOX 1',
      description: 'All employees and external party users shall return all of the organizational assets in their possession upon termination of their employment, contract or agreement.',
      state: 'Draft',
      state_color: 'draft',
      type: 'system',
      status: 'Draft',
      owner: 'sblancha@Reciprocity.com',
      primary_contact: 'sblancha@Reciprocity.com',
      id: '2'
    }, {
      title: 'SOX 2',
      info_title: 'SOX 2',
      type: 'system',
      description: 'The automated backup systems are configured to send alerts notifications to IT personnel regarding backup job status.  Backup failures are reviewed and managed per documented procedures.',
      id: '3',
      status: 'Draft',
      owner: 'sblancha@Reciprocity.com',
      primary_contact: 'sblancha@Reciprocity.com',
      state: 'Draft'
    }, {
      title: 'SOX 3',
      info_title: 'SOX 3',
      type: 'system',
      description: 'Information Security audits are performed on new devices prior to deployment into the environment and in accordance with defined configuration standards.',
      owner: 'sblancha@Reciprocity.com',
      primary_contact: 'sblancha@Reciprocity.com',
      id: '5',
      status: 'Draft',
      state: 'Draft'
    }]
  };
})(GGRC || {}, GGRC.Mockup.Generator);
