# Copyright (C) 2014 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: laran@reciprocitylabs.com
# Maintained By: laran@reciprocitylabs.com

from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.sql.schema import UniqueConstraint

from ggrc import db
from ggrc.models import mixins
from ggrc.models.custom_attribute_value import CustomAttributeValue


class CustomAttributeDefinition(mixins.Base, mixins.Titled, db.Model):
  __tablename__ = 'custom_attribute_definitions'

  definition_type = db.Column(db.String, nullable=False)
  definition_id = db.Column(db.Integer)
  attribute_type = db.Column(db.String, nullable=False)
  multi_choice_options = db.Column(db.String)
  multi_choice_mandatory = db.Column(db.String)
  mandatory = db.Column(db.Boolean)
  helptext = db.Column(db.String)
  placeholder = db.Column(db.String)

  attribute_values = db.relationship('CustomAttributeValue',
                                     backref='custom_attribute')

  __table_args__ = (
      UniqueConstraint('definition_type', 'definition_id', 'title',
                       name='uq_custom_attribute'),
      db.Index('ix_custom_attributes_title', 'title'))

  _include_links = _publish_attrs = [
      'definition_type',
      'definition_id',
      'attribute_type',
      'multi_choice_options',
      'multi_choice_mandatory',
      'mandatory',
      'helptext',
      'placeholder',
  ]

  class ValidTypes(object):
    TEXT = "Text"
    RICH_TEXT = "Rich Text"
    DROPDOWN = "Dropdown"
    CHECKBOX = "Checkbox"
    DATE = "Date"
    MAP = "Map"


class CustomAttributeMapable(object):
  # pylint: disable=too-few-public-methods
  # because this is a mixin

  @declared_attr
  def related_custom_attributes(self):
    """CustomAttributeValues that directly map to this object.

    Used just to get the backrefs on the CustomAttributeValue object.

    Returns:
       a sqlalchemy relationship
    """
    return db.relationship(
        'CustomAttributeValue',
        primaryjoin=lambda: (
            (CustomAttributeValue.attribute_value == self.__name__) &
            (CustomAttributeValue.attribute_object_id == self.id)),
        foreign_keys="CustomAttributeValue.attribute_object_id",
        backref='attribute_{0}'.format(self.__name__),
        viewonly=True)
