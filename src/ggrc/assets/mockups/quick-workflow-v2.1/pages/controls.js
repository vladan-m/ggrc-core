(function (GGRC, Generator) {
  GGRC.Bootstrap.Mockups = GGRC.Bootstrap.Mockups || {};
  GGRC.Bootstrap.Mockups.QTask = GGRC.Bootstrap.Mockups.QTask || {};

  GGRC.Bootstrap.Mockups.QTask.Controls = {
    title: 'Controls',
    icon: 'control',
    template: '/quick-workflow-v2.1/widget.mustache',
    children: [{
      title: 'AM01',
      info_title: 'AM01',
      description: 'All employees and external party users shall return all of the organizational assets in their possession upon termination of their employment, contract or agreement.',
      state: 'Draft',
      state_color: 'draft',
      type: 'control',
      status: 'Draft',
      frequency: 'Weekly',
      owner: 'sblancha@Reciprocity.com',
      primary_contact: 'sblancha@Reciprocity.com',
      id: '2'
    }, {
      title: 'BR01',
      info_title: 'BR01',
      type: 'control',
      description: 'The automated backup systems are configured to send alerts notifications to IT personnel regarding backup job status.  Backup failures are reviewed and managed per documented procedures.',
      id: '3',
      frequency: 'Weekly',
      status: 'Draft',
      owner: 'sblancha@Reciprocity.com',
      primary_contact: 'sblancha@Reciprocity.com',
      state: 'Draft'
    }, {
      title: 'TV06',
      info_title: 'TV06',
      type: 'control',
      description: 'Information Security audits are performed on new devices prior to deployment into the environment and in accordance with defined configuration standards.',
      owner: 'sblancha@Reciprocity.com',
      primary_contact: 'sblancha@Reciprocity.com',
      id: '5',
      frequency: 'Weekly',
      status: 'Draft',
      state: 'Draft'
    }]
  };
})(GGRC || {}, GGRC.Mockup.Generator);
