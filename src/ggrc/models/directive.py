# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: vraj@reciprocitylabs.com

from ggrc import db
from .associationproxy import association_proxy
from .mixins import deferred, BusinessObject, Timeboxed, CustomAttributable
from .object_document import Documentable
from .object_person import Personable
from .object_objective import Objectiveable
from .object_owner import Ownable
from .relationship import Relatable
from .reflection import PublishOnly
from .utils import validate_option

from sqlalchemy.orm import validates
from .track_object_state import HasObjectState, track_state_for_class

class Directive(HasObjectState, Timeboxed, BusinessObject, db.Model):
  __tablename__ = 'directives'

  version = deferred(db.Column(db.String), 'Directive')
  organization = deferred(db.Column(db.String), 'Directive')
  scope = deferred(db.Column(db.Text), 'Directive')
  kind_id = deferred(db.Column(db.Integer), 'Directive')
  audit_start_date = deferred(db.Column(db.DateTime), 'Directive')
  audit_frequency_id = deferred(db.Column(db.Integer), 'Directive')
  audit_duration_id = deferred(db.Column(db.Integer), 'Directive')
  meta_kind = db.Column(db.String)
  kind = deferred(db.Column(db.String), 'Directive')

  sections = db.relationship(
      'SectionBase', backref='directive', order_by='SectionBase.slug', cascade='all, delete-orphan')
  controls = db.relationship( 'Control', backref='directive', order_by='Control.slug')
  directive_controls = db.relationship(
      'DirectiveControl', backref='directive', cascade='all, delete-orphan')
  # Not needed for the client at this time
  #mapped_controls = association_proxy(
  #    'directive_controls', 'control', 'DirectiveControl')
  directive_sections = db.relationship(
      'DirectiveSection', backref='directive', cascade='all, delete-orphan')
  joined_sections = association_proxy(
      'directive_sections', 'section', 'DirectiveSection')
  audit_frequency = db.relationship(
      'Option',
      primaryjoin='and_(foreign(Directive.audit_frequency_id) == Option.id, '\
                       'Option.role == "audit_frequency")',
      uselist=False,
      )
  audit_duration = db.relationship(
      'Option',
      primaryjoin='and_(foreign(Directive.audit_duration_id) == Option.id, '\
                       'Option.role == "audit_duration")',
      uselist=False,
      )

  __mapper_args__ = {
      'polymorphic_on': meta_kind
      }

  _publish_attrs = [
      'audit_start_date',
      'audit_frequency',
      'audit_duration',
      'controls',
      'kind',
      'organization',
      PublishOnly('directive_controls'),
      PublishOnly('directive_sections'),
      'scope',
      'sections',
      'version',
      ]

  _sanitize_html = [
      'organization',
      'scope',
      'version',
      ]

  _include_links = []

  @validates('kind')
  def validate_kind(self, key, value):
    if not value:
      return None
    if value not in self.valid_kinds:
      message = "Invalid value '{}' for attribute {}.{}.".format(
        value, self.__class__.__name__, key)
      raise ValueError(message)
    return value

  @validates('audit_duration', 'audit_frequency')
  def validate_directive_options(self, key, option):
    return validate_option(self.__class__.__name__, key, option, key)

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(Directive, cls).eager_query()
    return cls.eager_inclusions(query, Directive._include_links).options(
        orm.joinedload('audit_frequency'),
        orm.joinedload('audit_duration'),
        orm.subqueryload('controls'),
        orm.subqueryload('directive_controls'),
        orm.subqueryload('directive_sections'),
        orm.subqueryload('sections'))

  @staticmethod
  def _extra_table_args(cls):
    return (
        db.Index('ix_{}_meta_kind'.format(cls.__tablename__), 'meta_kind'),
        )


# FIXME: For subclasses, restrict kind
class Policy(
    CustomAttributable, Relatable, Objectiveable, Documentable, Personable,
    Ownable, Directive):
  __mapper_args__ = {
      'polymorphic_identity': 'Policy'
      }
  _table_plural = 'policies'
  valid_kinds = (
      "Company Policy", "Org Group Policy", "Data Asset Policy",
      "Product Policy", "Contract-Related Policy", "Company Controls Policy"
      )

  @validates('meta_kind')
  def validates_meta_kind(self, key, value):
    return 'Policy'

class Regulation(
    CustomAttributable, Relatable, Objectiveable, Documentable, Personable,
    Ownable, Directive):
  __mapper_args__ = {
      'polymorphic_identity': 'Regulation'
      }
  _table_plural = 'regulations'
  valid_kinds = ("Regulation",)

  @validates('meta_kind')
  def validates_meta_kind(self, key, value):
    return 'Regulation'

class Standard(
    CustomAttributable, Relatable, Objectiveable, Documentable, Personable,
    Ownable, Directive):
  __mapper_args__ = {
      'polymorphic_identity': 'Standard'
      }
  _table_plural = 'standards'
  valid_kinds = ("Standard",)

  @validates('meta_kind')
  def validates_meta_kind(self, key, value):
    return 'Standard'

class Contract(
    CustomAttributable, Relatable, Objectiveable, Documentable, Personable,
    Ownable, Directive):
  __mapper_args__ = {
      'polymorphic_identity': 'Contract'
      }
  _table_plural = 'contracts'
  valid_kinds = ("Contract",)

  @validates('meta_kind')
  def validates_meta_kind(self, key, value):
    return 'Contract'

track_state_for_class(Policy)
track_state_for_class(Regulation)
track_state_for_class(Standard)
track_state_for_class(Contract)
