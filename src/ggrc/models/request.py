# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: urban@reciprocitylabs.com

"""A module for Request object"""

# pylint: disable=fixme

from sqlalchemy import orm

from ggrc import db
from ggrc.models import audit
from ggrc.models import reflection
from ggrc.models.mixins_assignable import Assignable
from ggrc.models.mixin_autostatuschangable import AutoStatusChangable
from ggrc.models.mixins import Base
from ggrc.models.mixins import CustomAttributable
from ggrc.models.mixins import Described
from ggrc.models.mixins import FinishedDate
from ggrc.models.mixins import Slugged
from ggrc.models.mixins import Titled
from ggrc.models.mixins import VerifiedDate
from ggrc.models.mixins import deferred
from ggrc.models.object_document import Documentable
from ggrc.models.object_person import Personable
from ggrc.models.comment import Commentable
from ggrc.models import relationship


class Request(AutoStatusChangable, Assignable, Documentable, Personable,
              CustomAttributable, relationship.Relatable, Titled, Slugged,
              Described, Commentable, FinishedDate, VerifiedDate, Base,
              db.Model):
  """Class representing Requests.

  Request is an object representing a request from a Requester to Assignee
  to provide feedback, evidence or attachment in the form of comments,
  documents or URLs that (if specified) Verifier has to approve of
  before Request is considered finished.
  """
  __tablename__ = 'requests'
  _title_uniqueness = False

  VALID_TYPES = (u'documentation', u'interview')

  START_STATE = {u'Open'}
  PROGRESS_STATE = {u'In Progress'}
  DONE_STATE = {u'Finished'}
  END_STATES = {u'Verified', u'Final'}

  NOT_DONE_STATES = START_STATE | PROGRESS_STATE
  DONE_STATES = DONE_STATE | END_STATES
  VALID_STATES = tuple(NOT_DONE_STATES | DONE_STATES)
  ASSIGNEE_TYPES = (u'Assignee', u'Requester', u'Verifier')

  FIRST_CLASS_EDIT = START_STATE | END_STATES
  ASSIGNABLE_EDIT = END_STATES

  # TODO Remove requestor and requestor_id on database cleanup
  requestor_id = db.Column(db.Integer, db.ForeignKey('people.id'))
  requestor = db.relationship('Person', foreign_keys=[requestor_id])

  # TODO Remove request_type on database cleanup
  request_type = deferred(db.Column(db.Enum(*VALID_TYPES), nullable=False),
                          'Request')
  # TODO Make status via Stateful Mixin
  status = deferred(db.Column(db.Enum(*VALID_STATES), nullable=False,
                              default=tuple(START_STATE)[0]), 'Request')
  requested_on = deferred(db.Column(db.Date, nullable=False), 'Request')
  due_on = deferred(db.Column(db.Date, nullable=False), 'Request')
  # TODO Remove audit_id audit_object_id on database cleanup
  audit_id = db.Column(db.Integer, db.ForeignKey('audits.id'), nullable=True)
  audit_object_id = db.Column(db.Integer, db.ForeignKey('audit_objects.id'),
                              nullable=True)
  gdrive_upload_path = deferred(db.Column(db.String, nullable=True),
                                'Request')
  # TODO Remove test and notes columns on database cleanup
  test = deferred(db.Column(db.Text, nullable=True), 'Request')
  notes = deferred(db.Column(db.Text, nullable=True), 'Request')
  # TODO Remove responses on database cleanup
  responses = db.relationship('Response', backref='request',
                              cascade='all, delete-orphan')

  _publish_attrs = [
      'requestor',
      'request_type',
      'gdrive_upload_path',
      'requested_on',
      'due_on',
      'status',
      'audit',
      'test',
      'notes',
      'title',
      'description'
  ]

  _tracked_attrs = ((set(_publish_attrs) | {'slug'}) -
                    {'status'})

  _sanitize_html = [
      'gdrive_upload_path',
      'test',
      'notes',
      'description',
      'title'
  ]

  _aliases = {
      "request_audit": {
          "display_name": "Audit",
          "filter_by": "_filter_by_request_audit",
          "mandatory": True,
      },
      "due_on": "Due On",
      "notes": "Notes",
      "request_type": "Request Type",
      "requested_on": "Requested On",
      "status": {
          "display_name": "Status",
          "handler_key": "request_status",
      },
      "test": "Test",
      "related_assignees": {
          "display_name": "Assignee",
          "mandatory": True,
          "filter_by": "_filter_by_related_assignees",
          "type": reflection.AttributeInfo.Type.MAPPING,
      },
      "related_requesters": {
          "display_name": "Requester",
          "mandatory": True,
          "filter_by": "_filter_by_related_requesters",
          "type": reflection.AttributeInfo.Type.MAPPING,
      },
      "related_verifiers": {
          "display_name": "Verifier",
          "filter_by": "_filter_by_related_verifiers",
          "type": reflection.AttributeInfo.Type.MAPPING,
      },
  }

  def _display_name(self):
    # pylint: disable=unsubscriptable-object
    if len(self.title) > 32:
      display_string = self.description[:32] + u'...'
    elif self.title:
      display_string = self.title
    elif len(self.description) > 32:
      display_string = self.description[:32] + u'...'
    else:
      display_string = self.description
    return u'Request with id {0} "{1}" for Audit "{2}"'.format(
        self.id,
        display_string,
        self.audit.display_name
    )

  @classmethod
  def eager_query(cls):
    query = super(Request, cls).eager_query()
    return query.options(
        orm.joinedload('audit'),
        orm.subqueryload('responses'))

  @classmethod
  def _filter_by_related_assignees(cls, predicate):
    return cls._get_relate_filter(predicate, "Assignee")

  @classmethod
  def _filter_by_related_requesters(cls, predicate):
    return cls._get_relate_filter(predicate, "Requester")

  @classmethod
  def _filter_by_related_verifiers(cls, predicate):
    return cls._get_relate_filter(predicate, "Verifier")

  @classmethod
  def _filter_by_request_audit(cls, predicate):
    return cls.query.filter(
        (audit.Audit.id == cls.audit_id) &
        (predicate(audit.Audit.slug) | predicate(audit.Audit.title))
    ).exists()

  @classmethod
  def default_request_type(cls):
    return cls.VALID_TYPES[0]
