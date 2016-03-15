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
      title: 'Small Sledgehammer',
      type: 'control',
      id: '3',
      frequency: 'Weekly',
      status: 'Draft',
      state: 'Draft'
    }, {
      title: 'Lonesome Dusty Butter',
      type: 'control',
      id: '5',
      frequency: 'Weekly',
      status: 'Draft',
      state: 'Draft'
    }]
  };
})(GGRC || {}, GGRC.Mockup.Generator);
