# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: mouli@meics.org
# Maintained By: dan@reciprocitylabs.com


from datetime import timedelta
from datetime import datetime
from collections import defaultdict
from math import floor

from flask import current_app, request
from sqlalchemy import inspect

from ggrc_workflows.models import Workflow, Cycle
from ggrc.services.common import Resource
from ggrc.models import (
    Notification, NotificationType, NotificationConfig, ObjectType)
from ggrc_basic_permissions.models import Role, UserRole
from ggrc import db
from ggrc import settings
from ggrc.login import get_current_user


def register_listeners():

  @Resource.model_put.connect_via(Workflow)
  def handle_workflow_put(sender, obj=None, src=None, service=None):
    pass


  @Resource.model_posted.connect_via(Cycle)
  def handle_cycle_post(sender, obj=None, src=None, service=None):
    object_type = db.session.query(ObjectType).filter(
        ObjectType.name == 'Cycle').one()

    notification_type = db.session.query(
        NotificationType).filter(NotificationType.name == 'instant').one()


    db.session.flush()

    existing_notifications = db.session.query(Notification).filter(
        Notification.object_type == object_type,
        Notification.object_id == obj.id,
        Notification.notification_type == notification_type,
        Notification.sent_at == None)

    if existing_notifications.count() == 0:
      notification = Notification(
          object_type=object_type,
          object_id=obj.id,
          notification_type=notification_type
      )

      db.session.add(notification)


def get_cycle_notification_data(cycle_id):
  cycle = db.session.query(Cycle).filter(Cycle.id == cycle_id).one()
  result = defaultdict(list)
  for task in cycle.cycle_task_group_object_tasks:
    result[task.contact].append(task)
  import ipdb; ipdb.set_trace()
  return "hello world"

def get_task_group_notification_data():
  return "hello world"
