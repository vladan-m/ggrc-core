# Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: miha@reciprocitylabs.com
# Maintained By: miha@reciprocitylabs.com

import random
import copy
from tests.ggrc import TestCase
from freezegun import freeze_time
from datetime import date

import os
from ggrc import db
from ggrc.models import Person
from ggrc import notification
from ggrc_workflows.models import Workflow, TaskGroup, CycleTaskGroupObjectTask, Cycle
from tests.ggrc_workflows.generator import WorkflowsGenerator
from tests.ggrc.api_helper import Api
from tests.ggrc.generator import GgrcGenerator


if os.environ.get('TRAVIS', False):
  random.seed(1)  # so we can reproduce the tests if needed


class TestOneTimeWorkflowNotification(TestCase):

  def setUp(self):
    self.api = Api()
    self.wf_generator = WorkflowsGenerator()
    self.ggrc_generator = GgrcGenerator()

    self.random_objects = self.ggrc_generator.generate_random_objects()
    self.random_people = [
        self.ggrc_generator.generate_person(user_role="gGRC Admin")[1]
        for _ in range(5)]
    self.create_test_cases()

  def tearDown(self):
    pass

  def test_one_time_wf_activate(self):

    person_1 = self.random_people[0].id
    person_2 = self.random_people[1].id

    with freeze_time("2015-04-10"):
      wf_dict = copy.deepcopy(self.one_time_workflow_1)
      _, wf = self.wf_generator.generate_workflow(wf_dict)

      _, cycle = self.wf_generator.generate_cycle(wf)
      self.wf_generator.activate_workflow(wf)

      notifications = notification.get_pending_notifications()

      self.assertEqual(len(notifications[person_1.email]["assigned_tasks"]), 2)
      self.assertEqual(len(notifications[person_2.email]["assigned_tasks"]), 2)

    with freeze_time("2015-05-03"): # two days befor due date
      notifications = notification.get_pending_notifications()
      self.assertEqual(len(notifications[person_1.email]["due_tasks"]), 0)
      self.assertEqual(len(notifications[person_2.email]["due_tasks"]), 0)

    with freeze_time("2015-05-04"): # one day befor due date
      notifications = notification.get_pending_notifications()
      self.assertEqual(len(notifications[person_1.email]["due_tasks"]), 2)
      self.assertEqual(len(notifications[person_2.email]["due_tasks"]), 0)

    with freeze_time("2015-05-05"): # due date
      notifications = notification.get_pending_notifications()

      self.assertEqual(len(notifications[person_1.email]["due_tasks"]), 2)
      self.assertEqual(len(notifications[person_2.email]["due_tasks"]), 0)


    # person_1 and person_2 should have 2 notifications for tasks
    # import ipdb; ipdb.set_trace()



  def create_test_cases(self):
    def person_dict(person_id):
      return {
          "href": "/api/people/%d" % person_id,
          "id": person_id,
          "type": "Person"
      }

    self.one_time_workflow_1 = {
        "title": "one time test workflow",
        "description": "some test workflow",
        "owners": [person_dict(self.random_people[3].id)],
        "task_groups": [{
            "title": "one time task group",
            "task_group_tasks": [{
                "title": "task 1",
                "description": "some task",
                "contact": person_dict(self.random_people[0].id),
                "start_date": date(2015, 5, 1), # friday
                "end_date": date(2015, 5, 5),
            }, {
                "title": "task 2",
                "description": "some task",
                "contact": person_dict(self.random_people[1].id),
                "start_date": date(2015, 5, 4),
                "end_date": date(2015, 5, 7),
            }],
            "task_group_objects": self.random_objects[:2]
        }, {
            "title": "another one time task group",
            "task_group_tasks": [{
                "title": "task 1 in tg 2",
                "description": "some task",
                "contact": person_dict(self.random_people[0].id),
                "start_date": date(2015, 5, 8), # friday
                "end_date": date(2015, 5, 12),
            }, {
                "title": "task 2 in tg 2",
                "description": "some task",
                "contact": person_dict(self.random_people[2].id),
                "start_date": date(2015, 5, 1), # friday
                "end_date": date(2015, 5, 5),
            }],
            "task_group_objects": []
        }]
    }
