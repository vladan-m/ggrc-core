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
from ggrc.models import Person, Notification
from ggrc import notification
from ggrc_workflows.models import Workflow, TaskGroup, CycleTaskGroupObjectTask, Cycle
from tests.ggrc_workflows.generator import WorkflowsGenerator
from tests.ggrc.api_helper import Api
from tests.ggrc.generator import GgrcGenerator
from nose.plugins.skip import SkipTest


if os.environ.get('TRAVIS', False):
  random.seed(1)  # so we can reproduce the tests if needed

@SkipTest
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

    db.session.query(Notification).delete()

  def tearDown(self):
    pass

  def test_one_time_wf_activate(self):
    def get_person(person_id):
      return db.session.query(Person).filter(Person.id == person_id).one()

    with freeze_time("2015-04-10"):
      wf_dict = copy.deepcopy(self.one_time_workflow_1)
      _, wf = self.wf_generator.generate_workflow(wf_dict)

      _, cycle = self.wf_generator.generate_cycle(wf)
      self.wf_generator.activate_workflow(wf)

      notifications = notification.get_pending_notifications()

      person_1 = get_person(self.random_people[0].id)
      person_2 = get_person(self.random_people[1].id)

      self.assertEqual(len(notifications["assigned_tasks"][person_1.email]), 3)
      self.assertEqual(len(notifications["assigned_tasks"][person_2.email]), 2)

    with freeze_time("2015-05-03"):  # two days befor due date
      notifications = notification.get_pending_notifications()
      self.assertEqual(len(notifications["due_tasks"][person_1.email]), 0)
      self.assertEqual(len(notifications["due_tasks"][person_2.email]), 0)

    with freeze_time("2015-05-04"):  # one day befor due date
      notifications = notification.get_pending_notifications()
      self.assertEqual(len(notifications["due_tasks"][person_1.email]), 2)
      self.assertEqual(len(notifications["due_tasks"][person_2.email]), 0)

    with freeze_time("2015-05-05"):  # due date
      notifications = notification.get_pending_notifications()

      self.assertEqual(len(notifications["due_tasks"][person_1.email]), 2)
      self.assertEqual(len(notifications["due_tasks"][person_2.email]), 0)

    # person_1 and person_2 should have 2 notifications for tasks

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
        "frequency": "monthly",
        "owners": [person_dict(self.random_people[3].id)],
        "task_groups": [{
            "title": "monthly task group",
            "task_group_tasks": [{
                "title": "task 1",
                "description": "some task",
                "contact": person_dict(self.random_people[0].id),
                "relative_start_day": 2,
                "relative_end_day": 22,
            }, {
                "title": "task 2",
                "description": "some task",
                "contact": person_dict(self.random_people[1].id),
                "relative_start_day": 22,
                "relative_end_day": 26,
            }],
            "task_group_objects": self.random_objects[:2]
        }, {
            "title": "another monthly task group",
            "task_group_tasks": [{
                "title": "task 1 in tg 2",
                "description": "some task",
                "contact": person_dict(self.random_people[0].id),
                "relative_start_day": 4,
                "relative_end_day": 7,
            }, {
                "title": "task 2 in tg 2",
                "description": "some task",
                "contact": person_dict(self.random_people[2].id),
                "relative_end_day": 11,
                "relative_start_day": 22,
            }],
            "task_group_objects": []
        }]
    }
