(function (GGRC, Generator) {
  GGRC.Bootstrap.Mockups = GGRC.Bootstrap.Mockups || {};
  GGRC.Bootstrap.Mockups.Workflow2 = GGRC.Bootstrap.Mockups.Workflow2 || {};

  GGRC.Bootstrap.Mockups.Workflow2.Sprints = {
    title: 'Monthly sprints',
    icon: 'history',
    template: '/workflow-v2.2/sprints.mustache',
    sprints: [{
      value: 'Monthly Sprint 1 - ENDS ON 03/31/2016',
      archive: false
    }, {
      value: 'Monthly Sprint 2 - ENDS ON 02/31/2016',
      archive: true
    }, {
      value: 'Monthly Sprint 3 - ENDS ON 03/31/2015',
      archive: true
    }, {
      value: 'Monthly Sprint 4 - ENDS ON 03/31/2015',
      archive: true
    }],
    tasks: Generator.create({
      type: 'task',
      zero_state: true,
      task_group: true,
      help_text: 'Add task to sprint template'
    }),
    mapped_workflow: [{
      icon: 'workflow',
      title: 'SOX issues resolving',
      read_only: true
    }],
    children: [{
      zero_state: true,
      title: Generator.title(1),
      description: Generator.paragraph(7),
      state: 'Draft',
      state_color: 'draft',
      type: 'my_task',
      read_only: true,
      show_comments: true,
      task_group: [{
        visible: true,
        value: Generator.title(1)
      }],
      info_pane_button: true,
      assignee: 'Predrag Kanazir',
      verifier: 'Ken Lynch',
      due_date: Generator.get_date({today: true}),
      outdated: false,
      status: 'Draft',
      id: '1',
      mapped_workflow: [{
        icon: 'workflow',
        title: 'Backlog (One time)'
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
      }),
      children: [{
        title: 'Process for handling SOX',
        type: 'process',
        icon: 'process',
        id: '23',
        zero_state: true
      }, {
        title: 'Spare IT parts',
        icon: 'market',
        type: 'market',
        id: '24',
        zero_state: true
      }]
    }]
  };
})(GGRC || {}, GGRC.Mockup.Generator);
