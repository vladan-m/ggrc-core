# Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: miha@reciprocitylabs.com
# Maintained By: miha@reciprocitylabs.com

import random
from tests.ggrc import TestCase
from freezegun import freeze_time
from datetime import date, datetime

import os
from ggrc import db
from ggrc.models import Notification, Person
from ggrc import notification
from ggrc_workflows.models import Cycle
from tests.ggrc_workflows.generator import WorkflowsGenerator
from tests.ggrc.api_helper import Api
from tests.ggrc.generator import ObjectGenerator


if os.environ.get('TRAVIS', False):
  random.seed(1)  # so we can reproduce the tests if needed


class TestOneTimeWorkflowNotification(TestCase):

  """ This class contains simple one time workflow tests that are not
  in the gsheet test grid
  """

  def setUp(self):
    TestCase.setUp(self)
    self.api = Api()
    self.wf_generator = WorkflowsGenerator()
    self.object_generator = ObjectGenerator()

    self.random_objects = self.object_generator.generate_random_objects()
    self.random_people = self.object_generator.generate_random_people(
        user_role="gGRC Admin"
    )
    self.create_test_cases()

    def init_decorator(init):
      def new_init(self, *args, **kwargs):
        init(self, *args, **kwargs)
        if hasattr(self, "created_at"):
          self.created_at = datetime.now()
      return new_init

    Notification.__init__ = init_decorator(Notification.__init__)

  def test_one_time_wf_activate(self):
    def get_person(person_id):
      return db.session.query(Person).filter(Person.id == person_id).one()

    with freeze_time("2015-04-10"):
      _, wf = self.wf_generator.generate_workflow(self.one_time_workflow_1)

      _, cycle = self.wf_generator.generate_cycle(wf)
      self.wf_generator.activate_workflow(wf)

      person_1 = get_person(self.random_people[0].id)

    with freeze_time("2015-04-11"):
      _, notif_data = notification.get_todays_notifications()
      self.assertIn("cycle_started", notif_data[person_1.email])
      self.assertIn(cycle.id, notif_data[person_1.email]["cycle_started"])
      self.assertIn("my_tasks",
                    notif_data[person_1.email]["cycle_started"][cycle.id])

    with freeze_time("2015-05-03"):  # two days befor due date
      _, notif_data = notification.get_todays_notifications()
      self.assertIn(person_1.email, notif_data)
      self.assertNotIn("due_in", notif_data[person_1.email])
      self.assertNotIn("due_today", notif_data[person_1.email])

    with freeze_time("2015-05-04"):  # one day befor due date
      _, notif_data = notification.get_todays_notifications()
      self.assertEqual(len(notif_data[person_1.email]["due_in"]), 2)

    with freeze_time("2015-05-05"):  # due date
      _, notif_data = notification.get_todays_notifications()
      self.assertEqual(len(notif_data[person_1.email]["due_today"]), 2)

  def test_one_time_wf_activate_single_person(self):

    with freeze_time("2015-04-10"):
      user = "user@example.com"
      _, wf = self.wf_generator.generate_workflow(
        self.one_time_workflow_single_person)

      _, cycle = self.wf_generator.generate_cycle(wf)
      self.wf_generator.activate_workflow(wf)

    with freeze_time("2015-04-11"):
      _, notif_data = notification.get_todays_notifications()
      self.assertIn("cycle_started", notif_data[user])
      self.assertIn(cycle.id, notif_data[user]["cycle_started"])
      self.assertIn("my_tasks", notif_data[user]["cycle_started"][cycle.id])
      self.assertIn("cycle_tasks", notif_data[user]["cycle_started"][cycle.id])
      self.assertIn("my_task_groups", notif_data[user]["cycle_started"][cycle.id])
      self.assertIn("cycle_url", notif_data[user]["cycle_started"][cycle.id])

      cycle = Cycle.query.get(cycle.id)
      cycle_data = notif_data[user]["cycle_started"][cycle.id]
      for task in cycle.cycle_task_group_object_tasks:
        self.assertIn(task.id, cycle_data["my_tasks"])
        self.assertIn(task.id, cycle_data["cycle_tasks"])
        self.assertIn("title", cycle_data["my_tasks"][task.id])
        self.assertIn("title", cycle_data["cycle_tasks"][task.id])
        self.assertIn("cycle_task_url", cycle_data["cycle_tasks"][task.id])

    with freeze_time("2015-05-03"):  # two days befor due date
      _, notif_data = notification.get_todays_notifications()
      self.assertIn(user, notif_data)
      self.assertNotIn("due_in", notif_data[user])
      self.assertNotIn("due_today", notif_data[user])

    with freeze_time("2015-05-04"):  # one day befor due date
      _, notif_data = notification.get_todays_notifications()
      self.assertEqual(len(notif_data[user]["due_in"]), 3)

    with freeze_time("2015-05-05"):  # due date
      _, notif_data = notification.get_todays_notifications()
      self.assertEqual(len(notif_data[user]["due_today"]), 3)

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
        "notify_on_change": True,
        "owners": [person_dict(self.random_people[3].id)],
        "task_groups": [{
            "title": "one time task group",
            "contact": person_dict(self.random_people[2].id),
            "task_group_tasks": [{
                "title": "task 1",
                "description": "some task",
                "contact": person_dict(self.random_people[0].id),
                "start_date": date(2015, 5, 1),  # friday
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
            "contact": person_dict(self.random_people[2].id),
            "task_group_tasks": [{
                "title": "task 1 in tg 2",
                "description": "some task",
                "contact": person_dict(self.random_people[0].id),
                "start_date": date(2015, 5, 8),  # friday
                "end_date": date(2015, 5, 12),
            }, {
                "title": "task 2 in tg 2",
                "description": "some task",
                "contact": person_dict(self.random_people[2].id),
                "start_date": date(2015, 5, 1),  # friday
                "end_date": date(2015, 5, 5),
            }],
            "task_group_objects": []
        }]
    }

    user = Person.query.filter(Person.email == "user@example.com").one().id

    self.one_time_workflow_single_person = {
        "title": "one time test workflow",
        "notify_on_change": True,
        "description": "some test workflow",
        "owners": [person_dict(user)],
        "task_groups": [{
            "title": "one time task group",
            "contact": person_dict(user),
            "task_group_tasks": [{
                "title": "task 1",
                "description": "some task",
                "contact": person_dict(user),
                "start_date": date(2015, 5, 1),  # friday
                "end_date": date(2015, 5, 5),
            }, {
                "title": "task 2",
                "description": "some task",
                "contact": person_dict(user),
                "start_date": date(2015, 5, 4),
                "end_date": date(2015, 5, 7),
            }],
            "task_group_objects": self.random_objects[:2]
        }, {
            "title": "another one time task group",
            "contact": person_dict(user),
            "task_group_tasks": [{
                "title": "task 1 in tg 2",
                "description": "some task",
                "contact": person_dict(user),
                "start_date": date(2015, 5, 8),  # friday
                "end_date": date(2015, 5, 12),
            }, {
                "title": "task 2 in tg 2",
                "description": "some task",
                "contact": person_dict(user),
                "start_date": date(2015, 5, 1),  # friday
                "end_date": date(2015, 5, 5),
            }],
            "task_group_objects": []
        }]
    }
