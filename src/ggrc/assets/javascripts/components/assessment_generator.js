/*!
    Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: swizec@reciprocitylabs.com
    Maintained By: swizec@reciprocitylabs.com
*/

(function (can, $) {
  'use strict';

  GGRC.Components('assessmentGeneratorButton', {
    tag: 'assessment-generator-button',
    template: '{{{> /static/mustache/base_objects/generate_assessments_button.mustache}}}',
    scope: {
      audit: null
    },
    events: {
      'a click': function (el, ev) {
        var instance = this.scope.attr('audit') || GGRC.page_instance();
        this._results = null;
        GGRC.Controllers.MapperModal.launch(el, {
          object: 'Audit',
          type: 'Control',
          'join-object-id': instance.id,
          'join-mapping': 'program_controls',
          getList: true,
          useTemplates: true,
          assessmentGenerator: true,
          relevantTo: [{
            type: instance.type,
            id: instance.id
          }],
          template: {
            title: '/static/mustache/assessments/generator_title.mustache',
            submitButton: 'Generate Assessments',
            count: 'assessment(s) will be generated'
          },
          callback: this.generateAssessments.bind(this)
        });
      },
      showFlash: function (statuses) {
        var flash = {};
        var type;
        var messages = {
          error: 'Assessment generation has failed.',
          progress: 'Assessment generation is in process. This may take ' +
                    'multiple hours depending on the volume.',
          success: 'Assessment generation successful. {reload_link}'
        };
        if (statuses.Failure > 0) {
          type = 'error';
        } else if (statuses.Pending > 0 || statuses.Running > 0) {
          type = 'progress';
        } else {
          type = 'success';
        }

        flash[type] = messages[type];
        $('body').trigger('ajax:flash', flash);
      },
      updateStatus: function (ids, count) {
        var wait = [2, 4, 8, 16, 32, 64];
        if (count >= wait.length) {
          count = wait.length - 1;
        }
        CMS.Models.BackgroundTask.findAll({
          id__in: ids.join(',')
        }).then(function (tasks) {
          var statuses = _.countBy(tasks, function (task) {
            return task.status;
          });
          this.showFlash(statuses);
          if (statuses.Pending || statuses.Running) {
            setTimeout(function () {
              this.updateStatus(ids, ++count);
            }.bind(this), wait[count] * 1000);
          }
        }.bind(this));
      },
      generateAssessments: function (list, options) {
        var que = new RefreshQueue();

        this._results = null;
        que.enqueue(list).trigger().then(function (items) {
          var results = _.map(items, function (item) {
            var id = options.assessmentTemplate.split('-')[0];
            return this.generateModel(item, id);
          }.bind(this));
          this._results = results;
          $.when.apply($, results)
            .then(function () {
              var tasks = arguments;
              var ids;
              this.showFlash({Pending: 1});
              options.context.closeModal();
              if (!tasks.length || tasks[0] instanceof CMS.Models.Assessment) {
                // We did not create a task
                window.location.reload();
                return;
              }
              ids = _.uniq(_.map(arguments, function (task) {
                return task.id;
              }));
              this.updateStatus(ids, 0);
            }.bind(this));
        }.bind(this));
      },
      generateModel: function (object, template) {
        var assessmentTemplate = CMS.Models.AssessmentTemplate.findInCacheById(
          template);
        var title = object.title + ' assessment for ' + this.scope.audit.title;
        var data = {
          _generated: true,
          audit: this.scope.audit,
          object: object.stub(),
          context: this.scope.audit.context,
          template: assessmentTemplate && assessmentTemplate.stub(),
          title: title,
          owners: [CMS.Models.Person.findInCacheById(GGRC.current_user.id)]
        };

        if (assessmentTemplate) {
          if (_.exists(assessmentTemplate, 'procedure_description.length')) {
            data.test_plan = assessmentTemplate.procedure_description;
          }
          if (_.exists(assessmentTemplate, 'test_plan_procedure') &&
              _.exists(object, 'test_plan.length')) {
            data.test_plan = object.test_plan;
          }
        }
        data.run_in_background = true;
        return new CMS.Models.Assessment(data).save();
      },
      notify: function () {
        var success;
        var errors;
        var msg;

        if (!this._results) {
          return;
        }
        success = _.filter(this._results, function (assessment) {
          return !_.isNull(assessment) &&
            !(assessment.state && assessment.state() === 'rejected');
        }).length;
        errors = _.filter(this._results, function (assessment) {
          return assessment.state && assessment.state() === 'rejected';
        }).length;

        if (errors < 1) {
          if (success === 0) {
            msg = {
              success: 'Every Control already has an Assessment!'
            };
          } else {
            msg = {
              success: success + ' Assessments successfully created.'
            };
          }
        } else {
          msg = {
            error: 'An error occured when creating Assessments.'
          };
        }

        $(document.body).trigger('ajax:flash', msg);
      }
    }
  });
})(window.can, window.can.$);
