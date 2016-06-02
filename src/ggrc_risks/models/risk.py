# Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: anze@reciprocitylabs.com
# Maintained By: anze@reciprocitylabs.com

from sqlalchemy.ext.declarative import declared_attr

from ggrc import db
from ggrc.models.associationproxy import association_proxy
from ggrc.models import mixins
from ggrc.models.object_document import Documentable
from ggrc.models.object_owner import Ownable
from ggrc.models.reflection import PublishOnly
from ggrc.models.relationship import Relatable
from ggrc.models.track_object_state import HasObjectState


class Risk(HasObjectState, mixins.CustomAttributable, mixins.Stateful,
           Relatable, Documentable, mixins.Described, Ownable,
           mixins.WithContact, mixins.Titled, mixins.Timeboxed,
           mixins.Slugged, mixins.Noted, mixins.Hyperlinked, mixins.Base,
           db.Model):
  __tablename__ = 'risks'

  VALID_STATES = [
      'Draft',
      'Final',
      'Effective',
      'Ineffective',
      'Launched',
      'Not Launched',
      'In Scope',
      'Not in Scope',
      'Deprecated',
  ]

  # Overriding mixin to make mandatory
  @declared_attr
  def description(cls):
    return mixins.deferred(db.Column(db.Text, nullable=False), cls.__name__)

  risk_objects = db.relationship(
      'RiskObject', backref='risk', cascade='all, delete-orphan')
  objects = association_proxy('risk_objects', 'object', 'RiskObject')

  _publish_attrs = [
      'risk_objects',
      PublishOnly('objects'),
  ]

  _aliases = {
      "contact": {
          "display_name": "Contact",
          "filter_by": "_filter_by_contact",
      },
      "secondary_contact": None,
  }
