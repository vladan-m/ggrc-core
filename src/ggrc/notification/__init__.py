# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: mouli@meics.org
# Maintained By: dan@reciprocitylabs.com


from collections import defaultdict
from .email import *
from ggrc.extensions import get_extension_modules
from ggrc.models import Notification, NotificationType, NotificationConfig

class NotificationServices():

  def __init__(self):
    self.services = self.all_notifications()

  def all_notifications(self):
    services = {}
    for extension_module in get_extension_modules():
      contributions = getattr(
          extension_module, 'contributed_notifications', None)
      if contributions:
        if callable(contributions):
          contributions = contributions()
        services.update(contributions)
    return services

  def get_service_function(self, name):
    if name not in self.services:
      raise ValueError("unknown service name: %s" % name)

    return self.services[name]


  def call_service(self, name, pn):
    service = self.get_service_function(name)
    return service(pn)

services = NotificationServices()

def get_pending_notifications():
  """
  notifications = {
      "some@email.com": {

          "cycle_starts_in": {
              workflow.id : {
                  "custom_message": ""

                  "my_tasks" : # list of all tasks assigned to the user
                      { task.id: {task_info}, ...}

                  "my_task_groups" : # list of all task groups assigned to the user, including tasks
                      { task_group.id: { task.id: {task_info}, ... }, ... }

                  "workflow_tasks" : # list of all tasks in the workflow
                      { task.id: {task_info}, ...}
              }
          }

          "cycle_started": {

          }

          "due_in": # tasks due in X days (x depends on notification type)
              { task.id: {task_info}, ...}

          "due_today":
              { task.id: {task_info}, ...}

          "all_tasks_completed": # only workflow owner gets this
              { workflow.id: {workflow_info}, ... }
      }
  }

  """
  pending_notifications = db.session.query(Notification).filter(
      Notification.sent_at == None).all()

  aggregate_data = defaultdict(lambda: defaultdict(list))

  for pn in pending_notifications:
    data = services.call_service(pn.object_type.name, pn)
    for email, notification_data in data.items():
      for data_type, items in notification_data.items():
        aggregate_data[email][data_type] += items

  return aggregate_data

def generate_notification_email(data):
  return "hello world"

def dispatch_notifications():
  pass


