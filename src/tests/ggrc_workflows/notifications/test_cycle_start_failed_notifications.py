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
from ggrc.models import Notification
from ggrc_workflows.views import send_todays_digest_notifications
from tests.ggrc_workflows.generator import WorkflowsGenerator
from tests.ggrc.api_helper import Api
from tests.ggrc.generator import ObjectGenerator


if os.environ.get('TRAVIS', False):
  random.seed(1)  # so we can reproduce the tests if needed


class TestCycleStartFailed(TestCase):

  """ This class contains simple one time workflow tests that are not
  in the gsheet test grid
  """

  def setUp(self):
    TestCase.setUp(self)
    self.api = Api()
    self.wf_generator = WorkflowsGenerator()
    self.object_generator = ObjectGenerator()
    Notification.query.delete()

    self.random_objects = self.object_generator.generate_random_objects(2)
    _, self.user = self.object_generator.generate_person(user_role="gGRC Admin")
    self.create_test_cases()

    def init_decorator(init):
      def new_init(self, *args, **kwargs):
        init(self, *args, **kwargs)
        if hasattr(self, "created_at"):
          self.created_at = datetime.now()
      return new_init

    Notification.__init__ = init_decorator(Notification.__init__)

  @patch("ggrc.notification.email.send_email")
  def test_start_failed(self, mock_mail):

    wf_owner = "user@example.com"

    with freeze_time("2015-02-01 13:39:20"):
      _, wf = self.wf_generator.generate_workflow(self.quarterly_wf)
      response, wf = self.wf_generator.activate_workflow(wf)
      print wf.next_cycle_start_date

      self.assert200(response)

    with freeze_time("2015-01-01 13:39:20"):
      _, notif_data = notification.get_todays_notifications()
      self.assertNotIn(wf_owner, notif_data)

    with freeze_time("2015-01-29 13:39:20"):
      _, notif_data = notification.get_todays_notifications()
      self.assertIn(wf_owner, notif_data)
      self.assertIn("cycle_starts_in", notif_data[wf_owner])

    with freeze_time("2015-03-05 13:39:20"):
      _, notif_data = notification.get_todays_notifications()
      self.assertIn(wf_owner, notif_data)
      self.assertNotIn("cycle_started", notif_data[wf_owner])
      self.assertIn(wf_owner, notif_data)
      self.assertIn("cycle_start_failed", notif_data[wf_owner])

      send_todays_digest_notifications()

      _, notif_data = notification.get_todays_notifications()
      self.assertNotIn(wf_owner, notif_data)

  # TODO: investigate why next_cycle_start date remains the same after
  # start_recurring_cycles

  # @patch("ggrc.notification.email.send_email")
  # def test_start_failed_send_notifications(self, mock_mail):

  #   wf_owner = "user@example.com"

  #   with freeze_time("2015-02-01 13:39:20"):
  #     _, wf = self.wf_generator.generate_workflow(self.quarterly_wf)
  #     response, wf = self.wf_generator.activate_workflow(wf)
  #     print wf.next_cycle_start_date

  #     self.assert200(response)

  #   with freeze_time("2015-01-01 13:39:20"):
  #     _, notif_data = notification.get_todays_notifications()
  #     self.assertNotIn(wf_owner, notif_data)

  #   with freeze_time("2015-01-29 13:39:20"):
  #     _, notif_data = notification.get_todays_notifications()
  #     self.assertIn(wf_owner, notif_data)
  #     self.assertIn("cycle_starts_in", notif_data[wf_owner])

  #   with freeze_time("2015-02-05 13:39:20"):
  #     _, notif_data = notification.get_todays_notifications()
  #     self.assertIn(wf_owner, notif_data)
  #     self.assertNotIn("cycle_started", notif_data[wf_owner])
  #     self.assertIn(wf_owner, notif_data)
  #     self.assertIn("cycle_start_failed", notif_data[wf_owner])

  #     start_recurring_cycles()
  #     _, notif_data = notification.get_todays_notifications()
  #     self.assertIn(wf_owner, notif_data)
  #     self.assertIn("cycle_started", notif_data[wf_owner])
  #     self.assertIn(wf_owner, notif_data)
  #     self.assertNotIn("cycle_start_failed", notif_data[wf_owner])

  #     send_todays_digest_notifications()

  #     _, notif_data = notification.get_todays_notifications()
  #     self.assertNotIn(wf_owner, notif_data)

  # @patch("ggrc.notification.email.send_email")
  # def test_start_failed_send_notifications_monthly(self, mock_mail):

  #   wf_owner = "user@example.com"

  #   with freeze_time("2015-05-12 13:39:20"):
  #     _, wf = self.wf_generator.generate_workflow(self.monthly)
  #     response, wf = self.wf_generator.activate_workflow(wf)

  #   with freeze_time("2015-05-14 13:39:20"):
  #     _, wf = self.wf_generator.generate_workflow(self.monthly)
  #     response, wf = self.wf_generator.activate_workflow(wf)

  #     self.assert200(response)

  #     _, notif_data = notification.get_todays_notifications()
  #     self.assertIn(wf_owner, notif_data)
  #     self.assertNotIn("cycle_started", notif_data[wf_owner])
  #     self.assertIn(wf_owner, notif_data)
  #     self.assertIn("cycle_start_failed", notif_data[wf_owner])

  #     start_recurring_cycles()
  #     _, notif_data = notification.get_todays_notifications()
  #     self.assertIn(wf_owner, notif_data)
  #     self.assertIn("cycle_started", notif_data[wf_owner])
  #     self.assertIn(wf_owner, notif_data)
  #     self.assertNotIn("cycle_start_failed", notif_data[wf_owner])

  #     send_todays_digest_notifications()

  #     _, notif_data = notification.get_todays_notifications()
  #     self.assertNotIn(wf_owner, notif_data)

  def create_test_cases(self):
    def person_dict(person_id):
      return {
          "href": "/api/people/%d" % person_id,
          "id": person_id,
          "type": "Person"
      }

    self.quarterly_wf = {
        "title": "quarterly wf forced notification",
        "notify_on_change": True,
        "description": "",
        "owners": [person_dict(self.user.id)],
        "frequency": "quarterly",
        "task_groups": [{
            "title": "tg_1",
            "contact": person_dict(self.user.id),
            "task_group_tasks": [{
                "contact": person_dict(self.user.id),
                "description": self.wf_generator.random_str(100),
                "relative_start_day": 5,
                "relative_start_month": 2,
                "relative_end_day": 25,
                "relative_end_month": 2,
            },
            ],
        },
        ]
    }
    self.monthly = {
        "title": "monthly",
        "notify_on_change": True,
        "description": "",
        "owners": [person_dict(self.user.id)],
        "frequency": "monthly",
        "task_groups": [{
            "title": "tg_1",
            "contact": person_dict(self.user.id),
            "task_group_tasks": [{
                "contact": person_dict(self.user.id),
                "description": self.wf_generator.random_str(100),
                "relative_start_day": 14,
                "relative_end_day": 25,
            },
            ],
        },
        ]
    }
