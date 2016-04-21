# Copyright (C) 2016 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: miha@reciprocitylabs.com
# Maintained By: miha@reciprocitylabs.com

"""Tests for notifications for models with assignable mixin."""

from datetime import datetime
from mock import patch
from sqlalchemy import and_

from ggrc import db
from ggrc.models import Request
from ggrc.models import Notification
from ggrc.models import NotificationType
from integration.ggrc import converters
from integration.ggrc import generator


class TestCommentNotification(converters.TestCase):

  """Test notification on request comments."""

  def setUp(self):
    converters.TestCase.setUp(self)
    self.client.get("/login")
    self._fix_notification_init()
    self.generator = generator.ObjectGenerator()

  def _fix_notification_init(self):
    """Fix Notification object init function.

    This is a fix needed for correct created_at field when using freezgun. By
    default the created_at field is left empty and filed by database, which
    uses system time and not the fake date set by freezugun plugin. This fix
    makes sure that object created in feeze_time block has all dates set with
    the correct date and time.
    """

    def init_decorator(init):
      """Wrapper for Notification init function."""

      def new_init(self, *args, **kwargs):
        init(self, *args, **kwargs)
        if hasattr(self, "created_at"):
          self.created_at = datetime.now()
      return new_init

    Notification.__init__ = init_decorator(Notification.__init__)

  @classmethod
  def _get_notifications(cls, sent=False, notif_type=None):
    """Get a notification query.

    Args:
      sent (boolean): flag to filter out only notifications that have been
        sent.
      notif_type (string): name of the notification type.

    Returns:
      sqlalchemy query for selected notifications.
    """
    if sent:
      notif_filter = Notification.sent_at.isnot(None)
    else:
      notif_filter = Notification.sent_at.is_(None)

    if notif_type:
      notif_filter = and_(notif_filter, NotificationType.name == notif_type)

    return db.session.query(Notification).join(NotificationType).filter(
        notif_filter
    )

  @patch("ggrc.notifications.common.send_email")
  def test_notification_entries(self, _):
    """Test setting notification entries for request comments.

    Check if the correct notification entries are created when a comment gets
    posted.
    """

    self.import_file("request_full_no_warnings.csv")
    request1 = Request.query.filter_by(slug="Request 1").first()
    _, comment = self.generator.generate_comment(
        request1, "Verifier", "some comment", send_notification="true")

    self.assertEqual(
        self._get_notifications(notif_type="comment_created").count(),
        1,
        "Missing comment notification entry."
    )
    self.client.get("/_notifications/send_todays_digest")
    self.assertEqual(
        self._get_notifications(notif_type="comment_created").count(),
        0,
        "Found a comment notification that was not sent."
    )
