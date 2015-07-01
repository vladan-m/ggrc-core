# Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: miha@reciprocitylabs.com
# Maintained By: miha@reciprocitylabs.com

import random
from tests.ggrc import TestCase
from freezegun import freeze_time
from datetime import datetime
from mock import patch

import os
from ggrc import notification
from ggrc.models import Notification, Person
from ggrc_workflows import start_recurring_cycles
from ggrc_workflows.views import send_todays_digest_notifications
from tests.ggrc_workflows.generator import WorkflowsGenerator
from tests.ggrc.api_helper import Api
from tests.ggrc.generator import ObjectGenerator


if os.environ.get('TRAVIS', False):
  random.seed(1)  # so we can reproduce the tests if needed


class TestMonthlyWorkflowNotification(TestCase):

  """ This class contains simple one time workflow tests that are not
  in the gsheet test grid
  """

  def setUp(self):
    TestCase.setUp(self)
    self.api = Api()
    self.wf_generator = WorkflowsGenerator()
    self.object_generator = ObjectGenerator()

    self.random_objects = self.object_generator.generate_random_objects()
    _, self.person_1 = self.object_generator.generate_person(
        user_role="gGRC Admin")
    _, self.person_2 = self.object_generator.generate_person(
        user_role="gGRC Admin")
    self.create_test_cases()

    def init_decorator(init):
      def new_init(self, *args, **kwargs):
        init(self, *args, **kwargs)
        if hasattr(self, "created_at"):
          self.created_at = datetime.now()
      return new_init

    Notification.__init__ = init_decorator(Notification.__init__)

  @patch("ggrc.notification.email.send_email")
  def test_auto_generate_cycle(self, mock_mail):

    with freeze_time("2015-04-01"):
      _, wf = self.wf_generator.generate_workflow(self.monthly_workflow_1)
      self.wf_generator.activate_workflow(wf)

      person_1 = Person.query.get(self.person_1.id)

    with freeze_time("2015-04-02"):
      _, notif_data = notification.get_todays_notifications()
      self.assertIn(person_1.email, notif_data)
      self.assertIn("cycle_starts_in", notif_data[person_1.email])

    with freeze_time("2015-04-02"):
      send_todays_digest_notifications()
      _, notif_data = notification.get_todays_notifications()
      self.assertNotIn(person_1.email, notif_data)

    with freeze_time("2015-04-02"):
      start_recurring_cycles()
      _, notif_data = notification.get_todays_notifications()
      self.assertNotIn(person_1.email, notif_data)

    # cycle starts on monday - 6th, and not on 5th
    with freeze_time("2015-04-03"):
      start_recurring_cycles()


    with freeze_time("2015-04-15"):  # one day befor due date
      _, notif_data = notification.get_todays_notifications()
      person_1 = Person.query.get(self.person_1.id)
      self.assertIn(person_1.email, notif_data)

    with freeze_time("2015-04-25"):  # due date
      _, notif_data = notification.get_todays_notifications()
      person_1 = Person.query.get(self.person_1.id)
      self.assertIn(person_1.email, notif_data)

  @patch("ggrc.notification.email.send_email")
  def test_manual_generate_cycle(self, mock_mail):

    with freeze_time("2015-04-01"):
      _, wf = self.wf_generator.generate_workflow(self.monthly_workflow_1)
      self.wf_generator.activate_workflow(wf)

      person_1 = Person.query.get(self.person_1.id)

    with freeze_time("2015-04-03"):
      _, notif_data = notification.get_todays_notifications()

    with freeze_time("2015-04-03"):
      _, cycle = self.wf_generator.generate_cycle(wf)
      _, notif_data = notification.get_todays_notifications()
      person_1 = Person.query.get(self.person_1.id)
      self.assertIn("cycle_started", notif_data[person_1.email])

    with freeze_time("2015-05-03"):  # two days befor due date
      _, notif_data = notification.get_todays_notifications()
      person_1 = Person.query.get(self.person_1.id)
      self.assertIn(person_1.email, notif_data)

  def create_test_cases(self):
    def person_dict(person_id):
      return {
          "href": "/api/people/%d" % person_id,
          "id": person_id,
          "type": "Person"
      }

    self.monthly_workflow_1 = {
        "title": "test monthly wf notifications",
        "notify_on_change": True,
        "description": "some test workflow",
        "owners": [person_dict(self.person_2.id)],
        "frequency": "monthly",
        "task_groups": [{
            "title": "one time task group",
            "contact": person_dict(self.person_1.id),
            "task_group_tasks": [{
                "title": "task 1",
                "description": "some task",
                "contact": person_dict(self.person_1.id),
                "relative_start_day": 5,
                "relative_end_day": 25,
            }, {
                "title": "task 2",
                "description": "some task",
                "contact": person_dict(self.person_1.id),
                "relative_start_day": 10,
                "relative_end_day": 21,
            }],
            "task_group_objects": self.random_objects[:2]
        }, {
            "title": "another one time task group",
            "contact": person_dict(self.person_1.id),
            "task_group_tasks": [{
                "title": "task 1 in tg 2",
                "description": "some task",
                "contact": person_dict(self.person_1.id),
                "relative_start_day": 15,
                "relative_end_day": 15,
            }, {
                "title": "task 2 in tg 2",
                "description": "some task",
                "contact": person_dict(self.person_2.id),
                "relative_start_day": 15,
                "relative_end_day": 28,
            }],
            "task_group_objects": []
        }]
    }
