# Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: miha@reciprocitylabs.com
# Maintained By: miha@reciprocitylabs.com

import random
import copy
from tests.ggrc import TestCase

import os
from freezegun import freeze_time

from ggrc import db
from ggrc.models import Person, Notification
from ggrc_workflows.models import Workflow, TaskGroup, CycleTaskGroupObjectTask, Cycle
from tests.ggrc.generators.person import PersonGenerator
from tests.ggrc_workflows.generator import WorkflowsGenerator
from tests.ggrc.api_helper import Api
from tests.ggrc.generator import GgrcGenerator
from nose.plugins.skip import SkipTest
from ggrc_workflows import start_recurring_cycles

if os.environ.get('TRAVIS', False):
  random.seed(1)  # so we can reproduce the tests if needed


@SkipTest
class TestOneTimeWorkflowNotification(TestCase):

  def setUp(self):
    self.api = Api()
    self.generator = WorkflowsGenerator()
    self.ggrc_generator = GgrcGenerator()

    # self.random_objects = self.generator.generate_random_objects()
    self.random_objects = []
    self.create_test_cases()
    self.create_users()

  def tearDown(self):
    pass

  def test_weekly_wf_activate(self):
    wf_dict = copy.deepcopy(self.weekly_wf_1)
    _, wf = self.generator.generate_workflow(wf_dict)

    # this happens when you clec activate workflow
    _, activated_wf = self.generator.activate_workflow(wf)

    # use this activated_wf.next_cycle_start_date and add timedelta to check x
    # days befor the next cycle
    with freeze_time("2012-01-14"): # test on the x days before the cycle starts
      start_recurring_cycles()

      #test if notifications have been made

  def create_test_cases(self):
    def person_dict(person_id):
      return {
          "href": "/api/people/%d" % person_id,
          "id": person_id,
          "type": "Person"
      }

    self.weekly_wf_1 = {
      "title": "Weekly WF",
      "description": "Hi all. Did you know that Elbrus is #10 world highiest mountain? It is a dormant volcano and it's hight 5642m.",
      "frequency": "weekly",
      "owners": [self.owner1.id],
      "task_groups": [{
          "title": "TG #1 for the Weekly WF",
          "task_group_tasks": [{
              "title": "monday to friday",
              "description": self.generator.random_str(100),
              "relative_end_day": 1,
              "relative_end_month": None,
              "relative_start_day": 5,
              "relative_start_month": None,
              "contact": {
                "href": self.person_guest.get_href(),
                "id": self.person_guest.get_id(),
                "type": "Person"
              },
            }, {
              "title": "monday task",
              "relative_end_day": 1,
              "relative_end_month": None,
              "relative_start_day": 1,
              "relative_start_month": None,
              "contact": {
                "href": self.person_reader.get_href(),
                "id": self.person_reader.get_id(),
                "type": "Person"
              },
            }, {
              "title": "weekend task",
              "relative_end_day": 4,
              "relative_end_month": None,
              "relative_start_day": 1,
              "relative_start_month": None,
              "contact": {
                "href": self.person_owner.get_href(),
                "id": self.person_owner.get_id(),
                "type": "Person"
              },
            },
          ],
          "task_group_objects": self.random_objects
        },
      ]
    }

    self.weekly_wf_2 = {
      "title": "Weekly WF",
      "description": "Hi all. Did you know that Elbrus is #10 world highiest mountain? It is a dormant volcano and it's hight 5642m.",
      "frequency": "weekly",
      "owners": [self.owner1.id],
      "task_groups": [{
          "title": "TG #1 for the Weekly WF",
          "contact": person_dict(self.tgassignee1.id),
          "task_group_tasks": [{
            "title": "task #1 for Weekly workflow",
            "description": self.generator.random_str(100),
            "relative_end_day": 3,
            "relative_start_day": 5,
            "contact": person_dict(self.member1.id),
          }],
          "task_group_objects": self.random_objects
        },
      ]
    }

    self.weekly_wf_3 = {
      "title": "Weekly WF",
      "description": "Hi all. Did you know that Elbrus is #10 world highiest mountain? It is a dormant volcano and it's hight 5642m.",
      "frequency": "weekly",
      "owners": [self.owner1.id],
      "task_groups": [{
          "title": "TG #1 for the Weekly WF",
          "contact": person_dict(self.tgassignee1.id),
          "task_group_tasks": [{
            "title": "task #1 for Weekly workflow",
            "description": self.generator.random_str(100),
            "relative_end_day": 2,
            "relative_start_day": 5,
            "contact": person_dict(self.member1.id),
          }],
          "task_group_objects": self.random_objects
        },
      ]
    }

  self.weekly_wf_4 = {
      "title": "Weekly WF",
      "description": "Hi all. Did you know that Elbrus is #10 world highiest mountain? It is a dormant volcano and it's hight 5642m.",
      "frequency": "weekly",
      "owners": [self.tgassignee1.id],
      "task_groups": [{
          "title": "TG #1 for the Weekly WF",
          "contact": person_dict(self.member2.id),
          "task_group_tasks": [{
            "title": "task #1 for Weekly workflow",
            "description": self.generator.random_str(100),
            "relative_end_day": 2,
            "relative_start_day": 5,
            "contact": person_dict(self.member1.id),
          }],
          "task_group_objects": self.random_objects
        },
      ]
    }


  def create_users(self):
    _, self.owner1 = self.ggrc_generator.generate_person(user_role="gGRC Admin")
    _, self.tgassignee1 = self.ggrc_generator.generate_person(user_role="gGRC Admin")
    _, self.member1 = self.ggrc_generator.generate_person(user_role="gGRC Admin")
    _, self.member2 = self.ggrc_generator.generate_person(user_role="gGRC Admin")

