(function (GGRC, Generator) {
  GGRC.Bootstrap.Mockups = GGRC.Bootstrap.Mockups || {};
  GGRC.Bootstrap.Mockups.QTask = GGRC.Bootstrap.Mockups.QTask || {};

  GGRC.Bootstrap.Mockups.QTask.Tasks = {
    title: 'Tasks',
    icon: 'task',
    template: '/task-creation-dashboard/widget.mustache',
    hide_filter: true,
    tasks: Generator.create({
      type: 'task'
    }),
    mapped_workflow: [{
      icon: 'workflow',
      title: 'Backlog (One time)',
      read_only: false
    }],
    children: [{
      title: Generator.title(1),
      description: Generator.paragraph(7),
      state: 'Draft',
      state_color: 'draft',
      type: 'my_task',
      read_only: true,
      show_comments: true,
      info_pane_button: true,
      assignee: 'Predrag Kanazir',
      verifier: 'Albert Chen',
      due_date: '01/20/2014',
      outdated: true,
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
        title: 'AC01',
        type: 'control',
        icon: 'control',
        id: '23'
      }]
    }]
  };
})(GGRC || {}, GGRC.Mockup.Generator);
