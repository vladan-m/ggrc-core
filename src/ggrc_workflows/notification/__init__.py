# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: mouli@meics.org
# Maintained By: dan@reciprocitylabs.com


from datetime import timedelta
from datetime import datetime, date
from math import floor
from collections import defaultdict

from flask import current_app, request
from sqlalchemy import inspect

from ggrc_workflows.models import Workflow, Cycle, CycleTaskGroupObjectTask
from ggrc.services.common import Resource
from ggrc.models import (
    Notification, NotificationType, NotificationConfig, ObjectType)
from ggrc_basic_permissions.models import Role, UserRole
from ggrc import db
from ggrc import settings
from ggrc.login import get_current_user


def register_listeners():

  def get_object_type(obj):
    return db.session.query(ObjectType)\
      .filter(ObjectType.name == obj.__class__.__name__).one()

  def get_notification_type(name):
    return db.session.query(NotificationType)\
      .filter(NotificationType.name = name).one()


  def get_notification(obj):
    result = db.session.query(Notification).join(ObjectType).filter(
        Notification.object_id == obj.id,
        ObjectType.name == obj.__class__.__name__)
    if result.count():
      return result.one()

    return None

  @Resource.model_put.connect_via(Workflow)
  def handle_workflow_put(sender, obj=None, src=None, service=None):
    if obj.status != "Active":
      return

    if get_notification(obj):
      return

    notification = Notification()
    notification.object_id = obj.id
    notification.object_type = get_object_type(obj)
    notification.notification_type = get_notification_type(obj.frequency)
    # on workflow activation
    import ipdb
    ipdb.set_trace()

    pass

  @Resource.model_put.connect_via(CycleTaskGroupObjectTask)
  def aaa(sender, obj=None, src=None, service=None):
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


def get_cycle_notification_data(notification):
  end_delta = timedelta(notification.notification_type.advance_notice_end)

  cycle_id = notification.object_id
  cycle = db.session.query(Cycle).filter(Cycle.id == cycle_id).one()
  tasks = defaultdict(list)
  due_tasks = defaultdict(list)
  for task in cycle.cycle_task_group_object_tasks:
    tasks[task.contact.email].append(task.__dict__)
    if date.today() + end_delta >= task.end_date:
      due_tasks[task.contact.email].append(task.__dict__)

  owners = {"mail": cycle.workflow.__dict__}

  return {"assigned_tasks": tasks,
          "due_tasks": due_tasks,
          "workflow_owners": owners
          }


def get_task_group_notification_data():
  return "hello world"
