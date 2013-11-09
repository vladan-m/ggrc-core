# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: silas@reciprocitylabs.com
# Maintained By: silas@reciprocitylabs.com

from .base import *
from ggrc.models import Request
from .base_row import *
from collections import OrderedDict

class RequestRowConverter(BaseRowConverter):
  model_class = Request

  def find_by_slug(self, slug):
    return self.model_class.query.filter_by(slug=slug).first()

  def setup_object(self):
    self.obj = self.setup_object_by_slug(self.attrs)
    if self.obj.id is not None:
      self.add_warning('slug', "Request already exists and will be updated")

  def reify(self):
    self.handle('objective_id', ObjectiveHandler)
    self.handle('request_type', RequestTypeColumnHandler)
    self.handle('status', RequestStatusColumnHandler)
    self.handle_date('requested_on')
    self.handle_date('due_on')
    self.handle_text_or_html('description')
    self.handle_text_or_html('test')
    self.handle_text_or_html('notes')
    self.handle_raw_attr('auditor_contact')  # default to audit lead
    self.handle(
        'assignee', AssigneeHandler, is_required=True,
        person_must_exist=True)

  def save_object(self, db_session, **options):
    if options.get('audit'):
      self.obj.audit_id = options.get('audit').id
      db_session.add(self.obj)

class RequestsConverter(BaseConverter):

  metadata_map = OrderedDict([
    ('Type', 'type'),
    ('Program Code', 'slug')
  ])

  object_map = OrderedDict([
    ('Request Type', 'request_type'),
    ('Request Description', 'description'),
    ('Objective Code', 'objective_id'),
    ('Notes', 'notes'),
    ('Test', 'test'),
    ('Assignee', 'assignee'),
    ('Audit Contact', 'auditor_contact'),
    ('Requested On', 'requested_on'),
    ('Due On', 'due_on'),
    ('Status', 'status'),
  ])

  row_converter = RequestRowConverter

  # Overwrite validate functions since they assume a program rather than a directive

  def validate_code(self, attrs):
    if not attrs.get('slug'):
      self.errors.append('Missing Program Code heading')
    elif attrs['slug'] != self.program().slug:
      self.errors.append('Program Code must be {}'.format(self.program().slug))

  def validate_metadata(self, attrs):
    self.validate_metadata_type(attrs, "Requests")
    self.validate_code(attrs)

  def program(self):
    return self.options['program']

  def do_export_metadata(self):
    yield self.metadata_map.keys()
    yield ['Requests', self.program().slug]
    yield[]
    yield[]
    yield self.object_map.keys()

