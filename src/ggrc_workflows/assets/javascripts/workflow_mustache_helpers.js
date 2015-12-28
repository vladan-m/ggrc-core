/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: dan@reciprocitylabs.com
    Maintained By: dan@reciprocitylabs.com
*/

(function (can, $, Mustache) {
  /**
   * sort_index_at_end mustache helper
   *
   * Given a list of items with a sort_index property, or a list of
   * bindings with instances having a sort_index property, return
   * a sort_index value suitable for placing a new item in the list
   * at the end when sorted.
   *
   * @helper_type string -- use within attribute or outside of element
   *
   * @param list a list of objects or bindings
   */
  Mustache.registerHelper('sort_index_at_end', function (list, options) {
    var maxInt = Number.MAX_SAFE_INTEGER.toString(10);
    var listMax = '0';

    list = Mustache.resolve(list);
    can.each(list, function (item) {
      var idx;

      if (item.reify) {
        item = item.reify();
      }

      if (item.attr) {
        idx = (item.attr('sort_index') || item.attr('instance.sort_index'));
      } else {
        idx = (item.sort_index || item.instance && (item.instance.attr) ?
          item.instance.attr('sort_index') :
          item.instance.sort_index);
      }

      if (typeof idx !== 'undefined') {
        listMax = GGRC.Math.string_max(idx, listMax);
      }
    });

    return GGRC.Math.string_half(GGRC.Math.string_add(listMax, maxInt));
  });

  /**
   * sortable_if mustache helper
   *
   * Apply jQuery-UI sortable to the parent element if the supplied value
   * is true, or false if the hash has an "inverse" key set to a truthy value
   *
   * in the other case (false for not inverse, true for inverse) the sortable
   * widget attached to the element will be destroyed if it exists.
   *
   * @helper_type attributes -- use within an element tag
   *
   * @param val some computed value with a truthy or falsy value
   * @param sortableOpts a JSON stringified object of options to pass to
   *   sortable
   * @hashbparam inverse whether to invert the boolean check of val.
   */
  Mustache.registerHelper('sortable_if', function () {
    var args = can.makeArray(arguments).slice(0, arguments.length - 1);
    var options = arguments[arguments.length - 1];
    var inverse = options.hash && options.hash.inverse;

    return function (el) {
      can.view.live.attributes(el, can.compute(function () {
        var val = Mustache.resolve(args[0]);
        var sortableOpts = args[1];

        // value XOR inverse, one must be true, one false
        if (val ^ inverse) {
          $(el).sortable(JSON.parse(sortableOpts || '{}'));
        } else if ($(el).is('.ui-sortable')) {
          $(el).sortable('destroy');
        }
      }));
    };
  });

  Mustache.registerHelper(
    'workflow_owner',
    function (instance, modalTitle, options) {
      var loader;

      if (resolve_computed(modalTitle).indexOf('New ') === 0) {
        return GGRC.current_user.email;
      }

      loader = resolve_computed(instance).get_binding('authorizations');
      return $.map(loader.list, function (binding) {
        if (binding.instance.role &&
            binding.instance.role.reify().attr('name') === 'WorkflowOwner') {
          return binding.instance.person.reify().attr('email');
        }
      }).join(', ');
    });

  Mustache.registerHelper(
    'if_cycle_assignee_privileges',
    function (instance, options) {
      var workflowDfd;
      var currentUser = GGRC.current_user;
      var admin = Permission.is_allowed('__GGRC_ADMIN__');

      if (!options) {
        options = instance;
        instance = options.context;
      }
      instance = Mustache.resolve(instance);

      // short-circuit if admin.
      if (admin) {
        return options.fn(options.contexts);
      }

      workflowDfd = instance.get_binding('cycle').refresh_instances()
      .then(function (cycleBindings) {
        return new RefreshQueue()
          .enqueue(cycleBindings[0].instance.workflow.reify())
          .trigger();
      }).then(function (workflows) {
        return $.when(
          workflows[0].get_binding('authorizations').refresh_instances(),
          workflows[0].get_binding('owner_authorizations').refresh_instances());
      });

      return Mustache.defer_render(
        'span',
        function (authorizations, ownerAuths) {
          var ownerAuthIds = can.map(ownerAuths, function (auth) {
            return auth.instance.person && auth.instance.person.id;
          });

          var allAuthIds = can.map(authorizations, function (auth) {
            return auth.instance.person && auth.instance.person.id;
          });

          if (~can.inArray(currentUser.id, ownerAuthIds) ||
              ~can.inArray(currentUser.id, allAuthIds) &&
              currentUser.id === instance.contact.id) {
            return options.fn(options.contexts);
          }

          return options.inverse(options.contexts);
        },
        workflowDfd);
    });

  Mustache.registerHelper(
    'if_task_group_assignee_privileges',
    function (instance, options) {
      var workflowDfd;
      var currentUser = GGRC.current_user;
      var admin = Permission.is_allowed('__GGRC_ADMIN__');

      if (!options) {
        options = instance;
        instance = options.context;
      }
      instance = Mustache.resolve(instance);

      // short-circuit if admin.
      if (admin) {
        return options.fn(options.contexts);
      }

      if (instance.workflow.id in CMS.Models.Workflow.cache) {
        workflowDfd = new $.Deferred().resolve(instance.workflow.reify());
      } else {
        workflowDfd = instance.workflow.reify().refresh();
      }

      workflowDfd = workflowDfd.then(function (workflow) {
        return $.when(
          workflow.get_binding('authorizations').refresh_instances(),
          workflow.get_binding('owner_authorizations').refresh_instances());
      });

      return Mustache.defer_render(
        'span',
        function (authorizations, ownerAuths) {
          var ownerAuthIds = can.map(ownerAuths, function (auth) {
            return auth.instance.person && auth.instance.person.id;
          });

          var allAuthIds = can.map(authorizations, function (auth) {
            return auth.instance.person && auth.instance.person.id;
          });

          var taskGroupContactId = instance.contact && instance.contact.id;

          if (~can.inArray(currentUser.id, ownerAuthIds) ||
              ~can.inArray(currentUser.id, allAuthIds) &&
              (currentUser.id === taskGroupContactId)) {
            return options.fn(options.contexts);
          }

          return options.inverse(options.contexts);
        },
        workflowDfd);
    });

  Mustache.registerHelper(
    'if_can_edit_response',
    function (instance, status, options) {
      var canEdit;
      var cycle;

      instance = Mustache.resolve(instance);
      status = Mustache.resolve(status);
      cycle = instance.cycle.reify();

      canEdit = (
        cycle.is_current &&
        ['Finished', 'Verified'].indexOf(status) === -1);

      if (canEdit) {
        return options.fn(options.contexts);
      }

      return options.inverse(options.contexts);
    });
})(this.can, this.can.$, this.Mustache);
