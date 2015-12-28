/*!
    Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: anze@reciprocitylabs.com
    Maintained By: anze@reciprocitylabs.com
*/

/* eslint camelcase: 0 */

(function (CMS, GGRC, can, $) {
  can.Component.extend({
    tag: 'dashboard-widgets',
    template: '<content/>',
    scope: {
      initial_wf_size: 5,
      workflow_view:
        GGRC.mustache_path + '/dashboard/info/workflow_progress.mustache',
      workflow_data: {},
      workflow_count: 0,
      workflow_show_all: false
    },
    events: {
      // Click action to show all workflows
      'a.workflow-trigger.show-all click': function (el, ev) {
        this.scope.workflow_data.attr('list', this.scope.workflow_data.cur_wfs);

        el.text('Show top 5 workflows');
        el.removeClass('show-all');
        el.addClass('show-5');

        ev.stopPropagation();
      },
      // Show onlt top 5 workflows
      'a.workflow-trigger.show-5 click': function (el, ev) {
        this.scope.workflow_data.attr(
          'list', this.scope.workflow_data.cur_wfs5);

        el.text('Show all my workflows');
        el.removeClass('show-5');
        el.addClass('show-all');

        ev.stopPropagation();
      },

      // Show Workflows
      'li.workflow-tab click': function (el, ev) {
        el.addClass('active');
        this.element.find('.workflow-wrap-main').show();
        ev.stopPropagation();
      }
    },
    init: function () {
      this.init_my_workflows();
    },
    init_my_workflows: function () {
      var self = this;
      var workflowData = {};
      var wfs;              // list of all workflows
      var curWfs;          // list of workflows with current cycles
      var curWfs5;         // list of top 5 workflows with current cycle

      if (!GGRC.current_user) {
        return undefined;
      }

      GGRC.Models.Search.search_for_types(
        '', ['Workflow'], {contact_id: GGRC.current_user.id}
      )
      .then(function (resultSet) {
        var wfData = resultSet.getResultsForType('Workflow');
        var refreshQueue = new RefreshQueue();
        refreshQueue.enqueue(wfData);
        return refreshQueue.trigger();
      }).then(function (options) {
        wfs = options;

        return $.when.apply($, can.map(options, function (wf) {
          return self.update_tasks_for_workflow(wf);
        }));
      }).then(function () {
        if (wfs.length > 0) {
          // Filter workflows with a current cycle
          curWfs = self.filter_current_workflows(wfs);
          self.scope.attr('workflow_count', curWfs.length);
          // Sort the workflows in accending order by first_end_date
          curWfs.sort(self.sort_by_end_date);
          workflowData.cur_wfs = curWfs;

          if (curWfs.length > self.scope.initial_wf_size) {
            curWfs5 = curWfs.slice(0, self.scope.initial_wf_size);
            self.scope.attr('workflow_show_all', true);
          } else {
            curWfs5 = curWfs;
            self.scope.attr('workflow_show_all', false);
          }

          workflowData.cur_wfs5 = curWfs5;
          workflowData.list = curWfs5;
          self.scope.attr('workflow_data', workflowData);
        }
      });

      return 0;
    },
    update_tasks_for_workflow: function (workflow) {
      var dfd = $.Deferred();
      var taskCount = 0;
      var finished = 0;
      var inProgress = 0;
      var declined = 0;
      var verified = 0;
      var assigned = 0;
      var overDue = 0;
      var today = new Date();
      var firstEndDate;
      var taskData = {};

      workflow.get_binding('current_all_tasks')
        .refresh_instances()
        .then(function (newData) {
          var mydata = newData;
          var timeInterval;
          var dayInMilliSecs = 24 * 60 * 60 * 1000;
          var endDate;
          var data;
          var i;

          taskCount = mydata.length;
          for (i = 0; i < taskCount; i++) {
            data = mydata[i].instance;
            endDate = new Date(data.end_date || null);

            // Calculate firstEndDate for the workflow / earliest end for
            // all the tasks in a workflow
            if (i === 0) {
              firstEndDate = endDate;
            } else if (endDate.getTime() < firstEndDate.getTime()) {
              firstEndDate = endDate;
            }

            // Any task not verified is subject to overdue
            if (data.status === 'Verified') {
              verified++;
            } else if (endDate.getTime() < today.getTime()) {
              overDue++;
              $('dashboard-errors').control().scope.attr(
                'error_msg', 'Some tasks are overdue!');
            } else if (data.status === 'Finished') {
              finished++;
            } else if (data.status === 'InProgress') {
              inProgress++;
            } else if (data.status === 'Declined') {
              declined++;
            } else {
              assigned++;
            }
          }

          // Update TaskData object for workflow and Calculate %
          if (taskCount > 0) {
            taskData.task_count = taskCount;
            taskData.finished = finished;
            taskData.finished_percentage =
              ((finished * 100) / taskCount).toFixed(2);
            taskData.in_progress = inProgress;
            taskData.in_progress_percentage =
              ((inProgress * 100) / taskCount).toFixed(2);
            taskData.verified = verified;
            taskData.verified_percentage =
              ((verified * 100) / taskCount).toFixed(2);
            taskData.declined = declined;
            taskData.declined_percentage =
              ((declined * 100) / taskCount).toFixed(2);
            taskData.over_due = overDue;
            taskData.over_due_percentage =
              ((overDue * 100) / taskCount).toFixed(2);
            taskData.assigned = assigned;
            taskData.assigned_percentage =
              ((assigned * 100) / taskCount).toFixed(2);
            taskData.first_end_dateD = firstEndDate;
            taskData.first_end_date = firstEndDate.toLocaleDateString();

            // calculate days left for first_end_date
            if (today.getTime() >= firstEndDate.getTime()) {
              taskData.days_left_for_first_task = 0;
            } else {
              timeInterval = firstEndDate.getTime() - today.getTime();
              taskData.days_left_for_first_task = Math.floor(
                timeInterval / dayInMilliSecs);
            }

            // set overdue flag
            taskData.over_due_flag = !!overDue;
          }

          workflow.attr('task_data', new can.Map(taskData));
          dfd.resolve();
        });

      return dfd;
    },

    /*
      filter_current_workflows filters the workflows with current tasks in a
      new array and returns the new array. filter_current_workflows should be
      called after update_tasks_for_workflow.
      It looks at the task_data.task_count for each workflow
      For workflow with current tasks, task_data.task_count must be > 0;
    */
    filter_current_workflows: function (workflows) {
      var filteredWfs = [];

      can.each(workflows, function (item) {
        if (item.task_data && item.task_data.task_count > 0) {
          filteredWfs.push(item);
        }
      });
      return filteredWfs;
    },

    /*
      sort_by_end_date sorts workflows in assending order with respect to
      task_data.first_end_date
      This should be called with workflows with current tasks.
    */
    sort_by_end_date: function (first, second) {
      return (
        first.task_data.first_end_dateD.getTime() -
        second.task_data.first_end_dateD.getTime()
      );
    }

  });

  can.Component.extend({
    tag: 'dashboard-errors',
    template: '<content/>',
    scope: {
      error_msg: ''
    }
  });
})(this.CMS, this.GGRC, this.can, this.can.$);
