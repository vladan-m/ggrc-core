(function (GGRC, Generator) {
  GGRC.Bootstrap.Mockups = GGRC.Bootstrap.Mockups || {};
  GGRC.Bootstrap.Mockups.TestWorkflow = GGRC.Bootstrap.Mockups.TestWorkflow || {};

  GGRC.Bootstrap.Mockups.TestWorkflow.Info = {
    title: 'Issue',
    icon: 'issue',
    type: 'issue',
    template: '/test-workflow/info.mustache',
    description: Generator.paragraph(7),
    test_plan: Generator.paragraph(1),
    notes: Generator.paragraph(1),
    people: {
      owner: Generator.get('user', 1),
      'primary contact': Generator.get('user', 1),
      'secondary contact': Generator.get('user', 1)
    },
    owners: [{
      context_id: null,
      href: '/api/people/1',
      type: 'Person',
      id: 1
    }],
    contact: [{
      context_id: null,
      href: '/api/people/1',
      type: 'Person',
      id: 1
    }],
    secondary_contact: [{
      context_id: null,
      href: '/api/people/1',
      type: 'Person',
      id: 1
    }],
    reference_url: Generator.url().url,
    url: Generator.url().url,
    comments: Generator.get("comment", 10, {
      sort: "date", types: ["assessor", "creator", "verifier"]
    }),
    logs: Generator.create({
      author: '%user',
      timestamp: '%date',
      data: [{
        status: 'made changes',
        field: 'Comment',
        original: {
          text: '%text'
        },
        changed: {
          text: '%text'
        }
      }, {
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
        field: 'People - Requester',
        original: {
          author: '%user'
        },
        changed: {
          author: '%user'
        }
      }, {
        status: 'created request',
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
    mapped_objects: [{
      icon: 'objective',
      title: '090.7068 objective 1',
      state: 'Draft',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer bibendum sem id lectus porta, eu rutrum nunc commodo.'
    }, {
      icon: 'control',
      title: 'Access to the Private Network with expired Key v0906984',
      state: 'In Progress',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer bibendum sem id lectus porta, eu rutrum nunc commodo.'
    }, {
      icon: 'regulation',
      title: 'a regulation object',
      state: 'In Progress',
      description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer bibendum sem id lectus porta, eu rutrum nunc commodo.'
    }],
    past_requests: Generator.get('request', 5),
    created_at: '2016-04-11T13:14:01',
    updated_at: '2016-04-11T13:14:01'
  };
})(GGRC || {}, GGRC.Mockup.Generator);
