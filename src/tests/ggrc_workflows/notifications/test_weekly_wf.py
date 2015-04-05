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
from ggrc_workflows.models import Workflow, TaskGroup, CycleTaskGroupObjectTask, Cycle
from tests.ggrc.generators.person import PersonGenerator
from tests.ggrc_workflows.generator import WorkflowsGenerator
from tests.ggrc.api_helper import Api
from tests.ggrc.generator import GgrcGenerator
from nose.plugins.skip import SkipTest
from ggrc_workflows import start_recurring_cycles

if os.environ.get('TRAVIS', False):
  random.seed(1)  # so we can reproduce the tests if needed


class TestOneTimeWorkflowNotification(TestCase):

  def setUp(self):
    self.api = Api()
    self.generator = WorkflowsGenerator()
    self.ggrc_generator = GgrcGenerator()

    # self.random_objects = self.generator.generate_random_objects()
    self.random_objects = []
    self.create_test_cases()

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
    self.person_guest = PersonGenerator(role='reader')
    self.person_reader = PersonGenerator(role='program_reader')
    self.person_owner = PersonGenerator(role='program_owner')

    self.weekly_wf_1 = {
      "title": "weekly thingy",
      "description": "start this many a time",
      "frequency": "weekly",
      "task_groups": [{
          "title": "tg_2",
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


