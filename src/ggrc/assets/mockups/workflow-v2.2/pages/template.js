(function (GGRC, Generator) {
  GGRC.Bootstrap.Mockups = GGRC.Bootstrap.Mockups || {};
  GGRC.Bootstrap.Mockups.Workflow2 = GGRC.Bootstrap.Mockups.Workflow2 || {};

  GGRC.Bootstrap.Mockups.Workflow2.Template = {
    title: 'Template',
    icon: 'cycle',
    template: '/workflow-v2.2/template.mustache',
    type: 'my_task_readonly',
    children: [{
      title: 'Update contacts for SOX controls',
      description: 'Verify if all SOX controls have accurate control primary and secondary contact',
      state: 'Draft',
      state_color: 'draft',
      type: 'my_task_readonly',
      workflow_title: Generator.title(1),
      obj_title: Generator.title(1),
      status: 'Draft',
      id: '1'
    }, {
      title: Generator.title(1),
      description: Generator.paragraph(7),
      state: 'Draft',
      state_color: 'draft',
      type: 'my_task_readonly',
      workflow_title: Generator.title(1),
      obj_title: Generator.title(1),
      status: 'Draft',
      id: '2'
    }, {
      title: Generator.title(1),
      description: Generator.paragraph(7),
      state: 'Draft',
      state_color: 'draft',
      type: 'my_task_readonly',
      workflow_title: Generator.title(1),
      obj_title: Generator.title(1),
      status: 'Draft',
      id: '3'
    }],
    template_info: [{
      title: 'Next sprint template: STARTS ON',
      start_date: '04/01/2016',
      text: 'All tasks will be cloned in the current sprint when either:',
      list_item: [{
        item: 'the current sprint is ended, or'
      }, {
        item: 'on the date of when the next sprint starts.'
      }]
    }]
  };
})(GGRC || {}, GGRC.Mockup.Generator);
