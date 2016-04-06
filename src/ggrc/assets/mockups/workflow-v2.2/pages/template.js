(function (GGRC, Generator) {
  GGRC.Bootstrap.Mockups = GGRC.Bootstrap.Mockups || {};
  GGRC.Bootstrap.Mockups.Workflow2 = GGRC.Bootstrap.Mockups.Workflow2 || {};

  GGRC.Bootstrap.Mockups.Workflow2.Template = {
    title: 'Template',
    icon: 'cycle',
    template: '/workflow-v2.2/template.mustache',
    task_group: true,
    children: [{
      title: 'Update contacts for SOX controls',
      description: 'Verify if all SOX controls have accurate control primary and secondary contact',
      state: 'Draft',
      state_color: 'draft',
      type: 'my_task',
      tree_view_read_only: true,
      read_only: true,
      show_comments: false,
      info_pane_button: false,
      task_group: [{
        visible: true,
        value: 'Task Group 007'
      }],
      assignee: 'Albert Chen',
      verifier: 'Predrag Kanazir',
      status: 'Draft',
      id: '1',
      mapped_workflow: [{
        icon: 'workflow',
        title: 'SOX issues resolving',
        read_only: true
      }],
      comments: Generator.get('comment', 3, {sort: 'date'}),
      logs: Generator.create({
        author: '%user',
        timestamp: '%date',
        data: [{
          status: 'made changes',
          field: 'Evidence',
          original: {
            files: []
          },
          changed: {
            files: '%files'
          }
        }, {
          status: 'made changes',
          field: 'People - Assignee',
          original: {
            author: '%user'
          },
          changed: {
            author: '%user'
          }
        }, {
          status: 'created task',
          field: ''
        }, {
          status: 'made changes',
          field: 'Dates - Due on',
          original: {
            text: '%date'
          },
          changed: {
            text: '%date'
          }
        }, {
          status: 'made changes',
          field: 'Dates - Created on',
          original: {
            text: '%date'
          },
          changed: {
            text: '%date'
          }
        }, {
          status: 'made changes',
          field: 'Description',
          original: {
            text: '%text'
          },
          changed: {
            text: '%text'
          }
        }]
      }, {
        count: 5,
        randomize: 'data'
      })
    }, {
      title: Generator.title(1),
      description: Generator.paragraph(7),
      state: 'Draft',
      state_color: 'draft',
      type: 'my_task',
      read_only: true,
      show_comments: false,
      info_pane_button: false,
      tree_view_read_only: true,
      task_group: [{
        visible: true,
        value: Generator.title(1)
      }],
      assignee: 'Ken Lynch',
      verifier: 'Albert Chen',
      status: 'Draft',
      id: '2'
    }, {
      title: Generator.title(1),
      description: Generator.paragraph(7),
      state: 'Draft',
      state_color: 'draft',
      type: 'my_task',
      read_only: true,
      show_comments: false,
      info_pane_button: false,
      tree_view_read_only: true,
      task_group: [{
        visible: true,
        value: Generator.title(1)
      }],
      assignee: 'Predrag Kanazir',
      verifier: 'Albert Chen',
      status: 'Draft',
      id: '3'
    }],
    template_info: [{
      title: 'Next sprint starts on',
      start_date: '04/01/2016',
      text: 'All tasks will be cloned when:',
      list_item: [{
        item: 'the current sprint ends, or'
      }, {
        item: 'when the next sprint starts.'
      }]
    }]
  };
})(GGRC || {}, GGRC.Mockup.Generator);
