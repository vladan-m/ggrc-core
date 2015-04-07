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

from ggrc_workflows.models import Workflow, Cycle, CycleTaskGroupObjectTask, TaskGroupTask
from ggrc.services.common import Resource
from ggrc.models import (
    Notification, NotificationType, NotificationConfig, ObjectType)
from ggrc_basic_permissions.models import Role, UserRole
from ggrc import db
from ggrc import settings
from ggrc.login import get_current_user


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

  return {
      "assigned_tasks": tasks,
      "due_tasks": due_tasks,
      "workflow_owners": owners
  }


def get_task_group_task_notification_data(notification):
  task_group_task = db.session.query(TaskGroupTask).filter(
      TaskGroupTask.id == notification.object_id).one()

  tasks = []

  task_assignee_email = task_group_task.contact.email
  task_group_assignee_email = task_group_task.task_group.contact.email
  workflow_owner = db.session.query(UserRole).filter(
      UserRole.context_id == task_group_task.task_group.workflow.context_id)
  # TODO: add tasks to workflow owner

  for task_group_object in task_group_task.task_group.task_group_objects:
    tasks.append({
        "task_title": task_group_task.title,
        "object_title": task_group_object.object.title,
        "task_id": task_group_task.id,
    })

  return {task_assignee_email: {
      "assigned_tasks": tasks
  },
      task_group_assignee_email: {},
      workflow_owner: {},
  }


def get_workflow_notification_data(notification):
  # return tasks that will be created
  return {}


def get_object_type(obj):
  return db.session.query(ObjectType)\
      .filter(ObjectType.name == obj.__class__.__name__).one()


def get_notification_type(name):
  return db.session.query(NotificationType)\
      .filter(NotificationType.name == name).one()


def get_notification(obj):
  result = db.session.query(Notification).join(ObjectType).filter(
      Notification.object_id == obj.id,
      ObjectType.name == obj.__class__.__name__)
  if result.count():
    return result.one()

  return None


def handle_task_group_task(obj, notification_type=None):
  if not notification_type:
    notification_type = get_notification_type(
        obj.task_group.workflow.frequency)

  notification = get_notification(obj)
  if not notification:
    notification = Notification(
        object_id=obj.id,
        object_type=get_object_type(obj),
        notification_type=notification_type,
        send_on=obj.task_group.workflow.next_cycle_start_date -
        timedelta(notification_type.advance_notice_start),
    )

  db.session.add(notification)


def handle_workflow_modify(sender, obj=None, src=None, service=None):
  if obj.status != "Active":
    return

  if not obj.next_cycle_start_date:
    obj.next_cycle_start_date = date.today()

  notification = get_notification(obj)

  if not notification:
    notification_type = get_notification_type(obj.frequency)
    notification = Notification(
        object_id=obj.id,
        object_type=get_object_type(obj),
        notification_type=notification_type,
        send_on=obj.next_cycle_start_date -
        timedelta(notification_type.advance_notice_start),
    )

  db.session.add(notification)

  for task_group in obj.task_groups:
    for task_group_task in task_group.task_group_tasks:
      handle_task_group_task(task_group_task, notification_type)


def handle_cycle_created(sender, obj=None, src=None, service=None):
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

    # db.session.add(notification)


def cycle_task_group_object_task_put_listener(sender, obj=None, src=None, service=None):
  pass


def register_listeners():

  @Resource.model_put.connect_via(Workflow)
  def workflow_put_listener(sender, obj=None, src=None, service=None):
    handle_workflow_modify(sender, obj, src, service)

  @Resource.model_put.connect_via(CycleTaskGroupObjectTask)
  def cycle_task_group_object_task_put_listener(sender, obj=None, src=None, service=None):
    handle_cycle_task_group_object_task_put(sender, obj, src, service)

  @Resource.model_posted.connect_via(Cycle)
  def cycle_post_listener(sender, obj=None, src=None, service=None):
    handle_cycle_created(sender, obj, src, service)
