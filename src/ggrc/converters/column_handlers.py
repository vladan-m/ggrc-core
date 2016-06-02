# Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: miha@reciprocitylabs.com
# Maintained By: miha@reciprocitylabs.com

"""List of all column handlers for objects in the ggrc module."""

from ggrc.converters.handlers import handlers
from ggrc.converters.handlers import request
from ggrc.converters.handlers import related_person
from ggrc.converters.handlers import list_handlers
from ggrc.extensions import get_extension_modules

GGRC_COLUMN_HANDLERS = {
    "assertions": handlers.ControlAssertionColumnHandler,
    "assignee": handlers.UserColumnHandler,
    "audit": handlers.AuditColumnHandler,
    "categories": handlers.ControlCategoryColumnHandler,
    "company": handlers.TextColumnHandler,
    "contact": handlers.UserColumnHandler,
    "delete": handlers.DeleteColumnHandler,
    "description": handlers.TextareaColumnHandler,
    "design": handlers.ConclusionColumnHandler,
    "documents": handlers.DocumentsColumnHandler,
    "due_on": handlers.DateColumnHandler,
    "email": handlers.EmailColumnHandler,
    "end_date": handlers.DateColumnHandler,
    "fraud_related": handlers.CheckboxColumnHandler,
    "is_enabled": handlers.CheckboxColumnHandler,
    "key_control": handlers.CheckboxColumnHandler,
    "kind": handlers.OptionColumnHandler,
    "link": handlers.TextColumnHandler,
    "means": handlers.OptionColumnHandler,
    "name": handlers.TextColumnHandler,
    "network_zone": handlers.OptionColumnHandler,
    "notes": handlers.TextareaColumnHandler,
    "operationally": handlers.ConclusionColumnHandler,
    "owners": handlers.OwnerColumnHandler,
    "principal_assessor": handlers.UserColumnHandler,
    "private": handlers.CheckboxColumnHandler,
    "program": handlers.ProgramColumnHandler,
    "program_mapped": handlers.ObjectPersonColumnHandler,
    "recipients": list_handlers.ValueListHandler,
    "reference_url": handlers.TextColumnHandler,
    "related_creators": related_person.RelatedCreatorsColumnHandler,
    "related_assessors": related_person.RelatedAssessorsColumnHandler,
    "related_assignees": related_person.RelatedAssigneesColumnHandler,
    "related_requesters": related_person.RelatedRequestersColumnHandler,
    "related_verifiers": related_person.RelatedVerifiersColumnHandler,
    "report_end_date": handlers.DateColumnHandler,
    "report_start_date": handlers.DateColumnHandler,
    "request": handlers.RequestColumnHandler,
    "request_audit": handlers.RequestAuditColumnHandler,
    "request_status": request.RequestStatusColumnHandler,
    "request_type": handlers.RequestTypeColumnHandler,
    "requested_on": handlers.DateColumnHandler,
    "secondary_assessor": handlers.UserColumnHandler,
    "secondary_contact": handlers.UserColumnHandler,
    "send_by_default": handlers.CheckboxColumnHandler,
    "slug": handlers.SlugColumnHandler,
    "start_date": handlers.DateColumnHandler,
    "status": handlers.StatusColumnHandler,
    "test_plan": handlers.TextareaColumnHandler,
    "title": handlers.RequiredTextColumnHandler,
    "url": handlers.TextColumnHandler,
    "verify_frequency": handlers.OptionColumnHandler,

    # Mapping column handlers
    "__mapping__:person": handlers.PersonMappingColumnHandler,
    "__unmapping__:person": handlers.PersonUnmappingColumnHandler,
    "control": handlers.ControlColumnHandler,
    "directive": handlers.SectionDirectiveColumnHandler,
}


def get_all_column_handlers():
  """Search through all enabled modules for their contributed column handlers.

  Returns:
    extension_handlers (dict): dict of all extension handlers
  """
  extension_handlers = GGRC_COLUMN_HANDLERS
  for extension_module in get_extension_modules():
    contributed_handlers = getattr(
        extension_module, "contributed_column_handlers", None)
    if callable(contributed_handlers):
      extension_handlers.update(contributed_handlers())
    elif isinstance(contributed_handlers, dict):
      extension_handlers.update(contributed_handlers)
  return extension_handlers


COLUMN_HANDLERS = get_all_column_handlers()
