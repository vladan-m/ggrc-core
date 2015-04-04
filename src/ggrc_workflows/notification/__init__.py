# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: mouli@meics.org
# Maintained By: dan@reciprocitylabs.com


from datetime import timedelta
from datetime import datetime
from math import floor

from flask import current_app, request
from sqlalchemy import inspect

import ggrc_workflows.models as models
from ggrc.services.common import Resource
from ggrc.models import Notification, NotificationType, NotificationConfig
from ggrc_basic_permissions.models import Role, UserRole
from ggrc import db
from ggrc import settings
from ggrc.login import get_current_user



@Resource.model_put.connect_via(models.Workflow)
def handle_workflow_put(sender, obj=None, src=None, service=None):
  pass


@Resource.model_posted.connect_via(models.Cycle)
def handle_cycle_post(sender, obj=None, src=None, service=None):
  obj_type = db.session.query(ObjectType).filter(ObjectType.name == 'Cycle')

  import ipdb; ipdb.set_trace()



