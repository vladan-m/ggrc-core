(function (GGRC, Generator) {
  GGRC.Bootstrap.Mockups = GGRC.Bootstrap.Mockups || {};
  GGRC.Bootstrap.Mockups.Workflow2 = GGRC.Bootstrap.Mockups.Workflow2 || {};

  GGRC.Bootstrap.Mockups.Workflow2.Sprints = {
    title: 'Sprints',
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
      zero_state: true
    }),
    mapped_workflow: [{
      icon: 'workflow',
      title: 'SOX issues resolving'
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
      workflow_title: Generator.title(1),
      obj_title: Generator.title(1),
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
      })
    }]
  };
})(GGRC || {}, GGRC.Mockup.Generator);
