# Copyright (C) 2014 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: mouli@meics.org
# Maintained By: dan@reciprocitylabs.com

"""
 GGRC notification SQLAlchemy layer data model extensions
"""

from sqlalchemy.orm import backref
from sqlalchemy import event

from ggrc import db
from .mixins import Base, Stateful


class NotificationConfig(Base, db.Model):
  __tablename__ = 'notification_configs'
  name = db.Column(db.String, nullable=True)
  enable_flag = db.Column(db.Boolean)
  notif_type = db.Column(db.String)
  person_id = db.Column(db.Integer, db.ForeignKey('people.id'), nullable=False)
  person = db.relationship(
      'Person',
      backref=backref('notification_configs', cascade='all, delete-orphan'))

  _publish_attrs = [
      'person_id',
      'notif_type',
      'enable_flag',
  ]

  VALID_TYPES = [
      'Email_Now',
      'Email_Digest',
      'Calendar',
  ]


class NotificationType(Base, db.Model):
  __tablename__ = 'notification_types'

  name = db.Column(db.String, nullable=False)
  description = db.Column(db.String, nullable=True)
  advance_notice = db.Column(db.DateTime, nullable=True)
  template = db.Column(db.String, nullable=True)


class Notification(Base, db.Model):
  __tablename__ = 'notifications'

  object_id = db.Column(db.Integer, nullable=False)
  object_type_id = db.Column(
      db.Integer, db.ForeignKey('object_types.id'), nullable=False)
  notification_type_id = db.Column(
      db.Integer, db.ForeignKey('notification_types.id'), nullable=False)

  notification_type = db.relationship(
      'notification_types', foreign_keys='Notification.notification_type_id')
  sent_at = db.Column(db.DateTime, nullable=True)
  template = db.Column(db.String, nullable=False)
  custom_mesdb = db.Column(db.Text, nullable=True)
  force_notifications = db.Column(db.Boolean, nullable=True)
