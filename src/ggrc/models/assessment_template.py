# Copyright (C) 2016 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: peter@reciprocitylabs.com
# Maintained By: peter@reciprocitylabs.com

"""A module containing the implementation of the assessment template entity."""

from ggrc import db
from ggrc.models.mixins import Identifiable
from ggrc.models.relationship import Relatable


class AssessmentTemplate(Identifiable, Relatable, db.Model):
  """A class representing the assessment template entity.

  An Assessment Template is a template that allows users for easier creation of
  multiple Assessments that are somewhat similar to each other, avoiding the
  need to repeatedly define the same set of properties for every new Assessment
  object.
  """
  __tablename__ = "assessment_templates"

  # the audit related to this assessment template
  audit_id = db.Column(db.Integer, db.ForeignKey("audits.id"), nullable=True)

  # the type of the object under assessment
  template_object_type = db.Column(db.String, nullable=False)

  # whether to use the control test plan as a procedure
  test_plan_procedure = db.Column(db.Boolean, nullable=False)

  # procedure description
  description = db.Column(db.Text)

  # the people that should be assigned by default to each assessment created
  # within the releated audit
  default_people = db.Column(db.Text)
