# Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: miha@reciprocitylabs.com
# Maintained By: miha@reciprocitylabs.com

from integration.ggrc import TestCase
from freezegun import freeze_time
from datetime import datetime
from mock import patch

from ggrc.notifications import common
from ggrc.models import Notification, Person
from ggrc_workflows.models import Workflow
from integration.ggrc_workflows.generator import WorkflowsGenerator
from integration.ggrc.api_helper import Api
from integration.ggrc.generator import ObjectGenerator


class TestNotificationsForDeletedObjects(TestCase):

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
    _, self.user = self.object_generator.generate_person(
        user_role="gGRC Admin")
    self.create_test_cases()

    def init_decorator(init):
      def new_init(self, *args, **kwargs):
        init(self, *args, **kwargs)
        if hasattr(self, "created_at"):
          self.created_at = datetime.now()
      return new_init

    Notification.__init__ = init_decorator(Notification.__init__)

  @patch("ggrc.notifications.common.send_email")
  def test_delete_activated_workflow(self, mock_mail):

    with freeze_time("2015-02-01 13:39:20"):
      _, wf = self.wf_generator.generate_workflow(self.quarterly_wf_1)
      response, wf = self.wf_generator.activate_workflow(wf)

      self.assert200(response)

      user = Person.query.get(self.user.id)

    with freeze_time("2015-01-01 13:39:20"):
      _, notif_data = common.get_todays_notifications()
      self.assertNotIn(user.email, notif_data)

    with freeze_time("2015-01-29 13:39:20"):
      _, notif_data = common.get_todays_notifications()
      self.assertIn(user.email, notif_data)
      self.assertIn("cycle_starts_in", notif_data[user.email])

      workflow = Workflow.query.get(wf.id)

      response = self.wf_generator.api.delete(workflow)
      self.assert200(response)

      _, notif_data = common.get_todays_notifications()
      user = Person.query.get(self.user.id)

      self.assertNotIn(user.email, notif_data)

  def create_test_cases(self):
    def person_dict(person_id):
      return {
          "href": "/api/people/%d" % person_id,
          "id": person_id,
          "type": "Person"
      }

    self.quarterly_wf_1 = {
        "title": "quarterly wf 1",
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
