# Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: dan@reciprocitylabs.com

from uuid import uuid1
import collections
import datetime

from flask import current_app
from sqlalchemy import and_
from sqlalchemy import event
from sqlalchemy import orm
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.ext.hybrid import hybrid_property
from sqlalchemy.orm import foreign
from sqlalchemy.orm import relationship
from sqlalchemy.orm import validates
from sqlalchemy.orm.session import Session

from ggrc import db
from ggrc.models import reflection
from ggrc.models.computed_property import computed_property
from ggrc.models.inflector import ModelInflectorDescriptor
from ggrc.models.reflection import AttributeInfo
from ggrc.utils import underscore_from_camelcase

"""Mixins to add common attributes and relationships. Note, all model classes
must also inherit from ``db.Model``. For example:

  ..

     class Market(BusinessObject, db.Model):
       __tablename__ = 'markets'

"""


def deferred(column, classname):
  """Defer column loading for basic properties, such as boolean or string, so
  that they are not loaded on joins. However, Identifiable provides an
  eager_query implementation that will specify undefer in the options so that
  when the resource is loaded itself, rather than through a join, it is
  completely loaded.

  In join tables, this function should not wrap foreign keys nor should it wrap
  type properties for polymorphic relations.
  """
  return db.deferred(column, group=classname + '_complete')


class Identifiable(object):

  """A model with an ``id`` property that is the primary key."""
  id = db.Column(db.Integer, primary_key=True)  # noqa

  # REST properties
  _publish_attrs = ['id', 'type']
  _update_attrs = []
  _stub_attrs = ['id', 'type']

  _inflector = ModelInflectorDescriptor()

  @computed_property
  def type(self):
    return self.__class__.__name__

  @classmethod
  def eager_query(cls):
    mapper_class = cls._sa_class_manager.mapper.base_mapper.class_
    return db.session.query(cls).options(
        db.Load(mapper_class).undefer_group(
            mapper_class.__name__ + '_complete'),
    )

  @classmethod
  def eager_inclusions(cls, query, include_links):
    options = []
    for include_link in include_links:
      inclusion_class = getattr(cls, include_link).property.mapper.class_
      options.append(
          orm.subqueryload(include_link)
          .undefer_group(inclusion_class.__name__ + '_complete'))
    return query.options(*options)

  @declared_attr
  def __table_args__(cls):
    extra_table_args = AttributeInfo.gather_attrs(cls, '_extra_table_args')
    table_args = []
    table_dict = {}
    for table_arg in extra_table_args:
      if callable(table_arg):
        table_arg = table_arg()
      if isinstance(table_arg, (list, tuple, set)):
        if isinstance(table_arg[-1], (dict,)):
          table_dict.update(table_arg[-1])
          table_args.extend(table_arg[:-1])
        else:
          table_args.extend(table_arg)
      elif isinstance(table_arg, (dict,)):
        table_dict.update(table_arg)
      else:
        table_args.append(table_arg)
    if len(table_dict) > 0:
      table_args.append(table_dict)
    return tuple(table_args,)

  # FIXME: This is not the right place, but there is no better common base
  # FIXME: class. I don't know what copy_into is used for. My guess would
  # FIXME: be cloning of some sort. I'm not sure that this code will work
  # FIXME: with custom attributes.
  def copy_into(self, _other, columns, **kwargs):
    target = _other or type(self)()

    columns = set(columns).union(kwargs.keys())
    for name in columns:
      if name in kwargs:
        value = kwargs[name]
      else:
        value = getattr(self, name)
      setattr(target, name, value)

    return target


def created_at_args():
  """Sqlite doesn't have a server, per se, so the server_* args are useless."""
  return {'default': db.text('current_timestamp'), }


def updated_at_args():
  """Sqlite doesn't have a server, per se, so the server_* args are useless."""
  return {
      'default': db.text('current_timestamp'),
      'onupdate': db.text('current_timestamp'),
  }


class ChangeTracked(object):

  """A model with fields to tracked the last user to modify the model, the
  creation time of the model, and the last time the model was updated.
  """
  # FIXME: change modified_by_id to nullable=False when there is an Account
  # model
  @declared_attr
  def modified_by_id(cls):
    return deferred(db.Column(db.Integer), cls.__name__)

  @declared_attr
  def created_at(cls):
    return deferred(db.Column(
        db.DateTime,
        **created_at_args()), cls.__name__)

  @declared_attr
  def updated_at(cls):
    return deferred(db.Column(
        db.DateTime,
        **updated_at_args()), cls.__name__)

  @declared_attr
  def modified_by(cls):
    return db.relationship(
        'Person',
        primaryjoin='{0}.modified_by_id == Person.id'.format(cls.__name__),
        foreign_keys='{0}.modified_by_id'.format(cls.__name__),
        uselist=False,
    )

  @staticmethod
  def _extra_table_args(cls):
    return (
        db.Index('ix_{}_updated_at'.format(cls.__tablename__), 'updated_at'),
    )

  # TODO Add a transaction id, this will be handy for generating etags
  # and for tracking the changes made to several resources together.
  # transaction_id = db.Column(db.Integer)

  # REST properties
  _publish_attrs = [
      'modified_by',
      'created_at',
      'updated_at',
  ]
  _update_attrs = []


class Titled(object):

  @declared_attr
  def title(cls):
    return deferred(db.Column(db.String, nullable=False), cls.__name__)

  @staticmethod
  def _extra_table_args(cls):
    if getattr(cls, '_title_uniqueness', True):
      return (
          db.UniqueConstraint(
              'title', name='uq_t_{}'.format(cls.__tablename__)),
      )
    return ()

  # REST properties
  _publish_attrs = ['title']
  _fulltext_attrs = ['title']
  _sanitize_html = ['title']
  _aliases = {"title": "Title"}


class Described(object):

  @declared_attr
  def description(cls):
    return deferred(db.Column(db.Text), cls.__name__)

  # REST properties
  _publish_attrs = ['description']
  _fulltext_attrs = ['description']
  _sanitize_html = ['description']
  _aliases = {"description": "Description"}


class Noted(object):

  @declared_attr
  def notes(cls):
    return deferred(db.Column(db.Text), cls.__name__)

  # REST properties
  _publish_attrs = ['notes']
  _fulltext_attrs = ['notes']
  _sanitize_html = ['notes']
  _aliases = {"notes": "Notes"}


class Hyperlinked(object):

  @declared_attr
  def url(cls):
    return deferred(db.Column(db.String), cls.__name__)

  @declared_attr
  def reference_url(cls):
    return deferred(db.Column(db.String), cls.__name__)

  # REST properties
  _publish_attrs = ['url', 'reference_url']

  _aliases = {
      "url": "Url",
      "reference_url": "Reference URL",
  }


class Hierarchical(object):

  @declared_attr
  def parent_id(cls):
    return deferred(db.Column(
        db.Integer, db.ForeignKey('{0}.id'.format(cls.__tablename__))),
        cls.__name__)

  @declared_attr
  def children(cls):
    return db.relationship(
        cls.__name__,
        backref=db.backref(
            'parent', remote_side='{0}.id'.format(cls.__name__)),
    )

  # REST properties
  _publish_attrs = [
      'children',
      'parent',
  ]

  @classmethod
  def eager_query(cls):
    query = super(Hierarchical, cls).eager_query()
    return query.options(
        orm.subqueryload('children'),
        # orm.joinedload('parent'),
    )


class Timeboxed(object):

  @declared_attr
  def start_date(cls):
    return deferred(db.Column(db.Date), cls.__name__)

  @declared_attr
  def end_date(cls):
    return deferred(db.Column(db.Date), cls.__name__)

  # REST properties
  _publish_attrs = ['start_date', 'end_date']

  _aliases = {
      "start_date": "Effective Date",
      "end_date": "Stop Date",
  }


class Stateful(object):

  @declared_attr
  def status(cls):
    return deferred(
        db.Column(db.String, default=cls.default_status), cls.__name__)

  _publish_attrs = ['status']
  _aliases = {"status": "State"}

  @classmethod
  def default_status(cls):
    return cls.valid_statuses()[0]

  @classmethod
  def valid_statuses(cls):
    return cls.VALID_STATES

  @validates('status')
  def validate_status(self, key, value):
    # Sqlalchemy only uses one validator per status (not neccessarily the
    # first) and ignores others. This enables cooperation between validators
    # since there are other mixins that want to touch 'status'.
    if hasattr(super(Stateful, self), "validate_status"):
      value = super(Stateful, self).validate_status(key, value)
    if value is None:
      value = self.default_status()
    if value not in self.valid_statuses():
      message = u"Invalid state '{}'".format(value)
      raise ValueError(message)
    return value


class FinishedDate(object):
  """Adds 'Finished Date' which is set when status is set to a finished state.

  Requires Stateful to be mixed in as well.
  """

  NOT_DONE_STATES = None
  DONE_STATES = {}

  # pylint: disable=method-hidden
  # because validator only sets date per model instance
  @declared_attr
  def finished_date(self):
    return deferred(
        db.Column(db.Date, nullable=True),
        self.__name__
    )

  _publish_attrs = [
      reflection.PublishOnly('finished_date')
  ]

  _aliases = {
      "finished_date": "Finished Date"
  }

  @validates('status')
  def validate_status(self, key, value):
    """Update finished_date given the right status change."""
    # Sqlalchemy only uses one validator per status (not neccessarily the
    # first) and ignores others. This enables cooperation between validators
    # since 'status' is not defined here.
    if hasattr(super(FinishedDate, self), "validate_status"):
      value = super(FinishedDate, self).validate_status(key, value)
    # pylint: disable=unsupported-membership-test
    # short circuit
    if (value in self.DONE_STATES and
       (self.NOT_DONE_STATES is None or
           self.status in self.NOT_DONE_STATES)):
      self.finished_date = datetime.datetime.now()
    elif ((self.NOT_DONE_STATES is None or
           value in self.NOT_DONE_STATES) and
            self.status in self.DONE_STATES):
      self.finished_date = None
    return value


class VerifiedDate(object):
  """Adds 'Verified Date' which is set when status is set to 'Verified'.

  When object is verified the status is overriden to 'Final' and the
  information about verification exposed as the 'verified' boolean.
  Requires Stateful to be mixed in as well.
  """

  VERIFIED_STATES = {u"Verified"}
  DONE_STATES = {}

  # pylint: disable=method-hidden
  # because validator only sets date per model instance
  @declared_attr
  def verified_date(self):
    return deferred(
        db.Column(db.Date, nullable=True),
        self.__name__
    )

  @hybrid_property
  def verified(self):
    return self.verified_date != None  # noqa

  _publish_attrs = [
      reflection.PublishOnly('verified'),
      reflection.PublishOnly('verified_date'),
  ]

  _aliases = {
      "verified_date": "Verified Date"
  }

  @validates('status')
  def validate_status(self, key, value):
    """Update verified_date on status change, make verified status final."""
    # Sqlalchemy only uses one validator per status (not neccessarily the
    # first) and ignores others. This enables cooperation between validators
    # since 'status' is not defined here.
    if hasattr(super(VerifiedDate, self), "validate_status"):
      value = super(VerifiedDate, self).validate_status(key, value)
    if (value in self.VERIFIED_STATES and
       self.status not in self.VERIFIED_STATES):
      self.verified_date = datetime.datetime.now()
      value = self.FINAL_STATE
    elif (value not in self.VERIFIED_STATES and
          value not in self.DONE_STATES and
          (self.status in self.VERIFIED_STATES or
           self.status in self.DONE_STATES)):
      self.verified_date = None
    return value


class ContextRBAC(object):

  @declared_attr
  def context_id(cls):
    return db.Column(db.Integer, db.ForeignKey('contexts.id'))

  @declared_attr
  def context(cls):
    return db.relationship('Context', uselist=False)

  @staticmethod
  def _extra_table_args(cls):
    return (
        db.Index('fk_{}_contexts'.format(cls.__tablename__), 'context_id'),
    )

  _publish_attrs = ['context']

  # @classmethod
  # def eager_query(cls):
  # from sqlalchemy import orm

  # query = super(ContextRBAC, cls).eager_query()
  # return query.options(
  # orm.subqueryload('context'))


class Base(ChangeTracked, ContextRBAC, Identifiable):

  """Several of the models use the same mixins. This class covers that common
  case.
  """

  def log_json(self):
    # to integrate with CustomAttributable without order dependencies
    res = getattr(super(Base, self), "log_json", lambda: {})()
    for column in self.__table__.columns:
      try:
        res[column.name] = getattr(self, column.name)
      except AttributeError:
        pass
    res['display_name'] = self.display_name
    return res

  @computed_property
  def display_name(self):
    try:
      return self._display_name()
    except:
      current_app.logger.warn(
          "display_name error in {}".format(type(self)), exc_info=True)
      return ""

  def _display_name(self):
    return getattr(self, "title", None) or getattr(self, "name", "")


class Slugged(Base):

  """Several classes make use of the common mixins and additional are
  "slugged" and have additional fields related to their publishing in the
  system.
  """

  @declared_attr
  def slug(cls):
    return deferred(db.Column(db.String, nullable=False), cls.__name__)

  @staticmethod
  def _extra_table_args(cls):
    if getattr(cls, '_slug_uniqueness', True):
      return (
          db.UniqueConstraint('slug', name='uq_{}'.format(cls.__tablename__)),
      )
    return ()

  # REST properties
  _publish_attrs = ['slug']
  _fulltext_attrs = ['slug']
  _sanitize_html = ['slug']
  _aliases = {
      "slug": {
          "display_name": "Code",
          "description": ("Must be unique. Can be left empty for "
                          "autogeneration. If updating or deleting, "
                          "code is required"),
      }
  }

  @classmethod
  def generate_slug_for(cls, obj):
    _id = getattr(obj, 'id', uuid1())
    obj.slug = "{0}-{1}".format(cls.generate_slug_prefix_for(obj), _id)
    # We need to make sure the generated slug is not already present in the
    # database. If it is, we increment the id until we find a slug that is
    # unique.
    # A better approach would be to query the database for slug uniqueness
    # only if the there was a conflict, but because we can't easily catch a
    # session rollback at this point we are sticking with a
    # suboptimal solution for now.
    INCREMENT = 1000
    while cls.query.filter(cls.slug == obj.slug).count():
      _id += INCREMENT
      obj.slug = "{0}-{1}".format(cls.generate_slug_prefix_for(obj), _id)

  @classmethod
  def generate_slug_prefix_for(cls, obj):
    return obj.__class__.__name__.upper()

  @classmethod
  def ensure_slug_before_flush(cls, session, flush_context, instances):
    """Set the slug to a default string so we don't run afoul of the NOT NULL
    constraint.
    """
    for o in session.new:
      if isinstance(o, Slugged) and (o.slug is None or o.slug == ''):
        o.slug = str(uuid1())
        o._replace_slug = True

  @classmethod
  def ensure_slug_after_flush_postexec(cls, session, flush_context):
    """Replace the placeholder slug with a real slug that will be set on the
    next flush/commit.
    """
    for o in session.identity_map.values():
      if isinstance(o, Slugged) and hasattr(o, '_replace_slug'):
        o.generate_slug_for(o)
        delattr(o, '_replace_slug')

event.listen(Session, 'before_flush', Slugged.ensure_slug_before_flush)
event.listen(
    Session, 'after_flush_postexec', Slugged.ensure_slug_after_flush_postexec)


class Mapping(Stateful, Base):
  VALID_STATES = (
      'Draft',
      'Final',
  )


class WithContact(object):

  @declared_attr
  def contact_id(cls):
    return deferred(
        db.Column(db.Integer, db.ForeignKey('people.id')), cls.__name__)

  @declared_attr
  def secondary_contact_id(cls):
    return deferred(
        db.Column(db.Integer, db.ForeignKey('people.id')), cls.__name__)

  @declared_attr
  def contact(cls):
    return db.relationship(
        'Person',
        uselist=False,
        foreign_keys='{}.contact_id'.format(cls.__name__))

  @declared_attr
  def secondary_contact(cls):
    return db.relationship(
        'Person',
        uselist=False,
        foreign_keys='{}.secondary_contact_id'.format(cls.__name__))

  @staticmethod
  def _extra_table_args(cls):
    return (
        db.Index('fk_{}_contact'.format(cls.__tablename__), 'contact_id'),
        db.Index('fk_{}_secondary_contact'.format(
            cls.__tablename__), 'secondary_contact_id'),
    )

  _publish_attrs = ['contact', 'secondary_contact']
  _aliases = {
      "contact": {
          "display_name": "Primary Contact",
          "filter_by": "_filter_by_contact",
      },
      "secondary_contact": {
          "display_name": "Secondary Contact",
          "filter_by": "_filter_by_secondary_contact",
      },
  }

  @classmethod
  def _filter_by_contact(cls, predicate):
    # dependency cycle mixins.py <~> person.py
    from ggrc.models.person import Person
    return Person.query.filter(
        (Person.id == cls.contact_id) &
        (predicate(Person.name) | predicate(Person.email))
    ).exists()

  @classmethod
  def _filter_by_secondary_contact(cls, predicate):
    # dependency cycle mixins.py <~> person.py
    from ggrc.models.person import Person
    return Person.query.filter(
        (Person.id == cls.secondary_contact_id) &
        (predicate(Person.name) | predicate(Person.email))
    ).exists()


class BusinessObject(Stateful, Noted, Described, Hyperlinked, WithContact,
                     Titled, Slugged):
  VALID_STATES = (
      'Draft',
      'Final',
      'Effective',
      'Ineffective',
      'Launched',
      'Not Launched',
      'In Scope',
      'Not in Scope',
      'Deprecated',
  )

# This class is just a marker interface/mixin to indicate that a model type
# supports custom attributes.


class CustomAttributable(object):

  @declared_attr
  def custom_attribute_values(cls):
    from ggrc.models.custom_attribute_value import CustomAttributeValue

    def join_function():
      return and_(
          foreign(CustomAttributeValue.attributable_id) == cls.id,
          foreign(CustomAttributeValue.attributable_type) == cls.__name__)
    return relationship(
        "CustomAttributeValue",
        primaryjoin=join_function,
        backref='{0}_custom_attributable'.format(cls.__name__),
        cascade='all, delete-orphan',
    )

  def custom_attributes(cls, attributes):
    from ggrc.fulltext.mysql import MysqlRecordProperty
    from ggrc.models.custom_attribute_value import CustomAttributeValue
    from ggrc.services import signals

    if 'custom_attributes' not in attributes:
      return

    attributes = attributes['custom_attributes']

    old_values = collections.defaultdict(list)
    last_values = dict()

    # attributes looks like this:
    #    [ {<id of attribute definition> : attribute value, ... }, ... ]

    # 1) Get all custom attribute values for the CustomAttributable instance
    attr_values = db.session.query(CustomAttributeValue).filter(and_(
        CustomAttributeValue.attributable_type == cls.__class__.__name__,
        CustomAttributeValue.attributable_id == cls.id)).all()

    attr_value_ids = [v.id for v in attr_values]
    ftrp_properties = [
        "attribute_value_{id}".format(id=_id) for _id in attr_value_ids]

    # Save previous value of custom attribute. This is a bit complicated by
    # the fact that imports can save multiple values at the time of writing.
    # old_values holds all previous values of attribute, last_values holds
    # chronologically last value.
    for v in attr_values:
      old_values[v.custom_attribute_id] += [(v.created_at, v.attribute_value)]

    last_values = {str(key): max(old_vals,
                                 key=lambda (created_at, _): created_at)
                   for key, old_vals in old_values.iteritems()}

    # 2) Delete all fulltext_record_properties for the list of values
    if len(attr_value_ids) > 0:
      db.session.query(MysqlRecordProperty)\
          .filter(
              and_(
                  MysqlRecordProperty.type == cls.__class__.__name__,
                  MysqlRecordProperty.property.in_(ftrp_properties)))\
          .delete(synchronize_session='fetch')

      # 3) Delete the list of custom attribute values
      db.session.query(CustomAttributeValue)\
          .filter(CustomAttributeValue.id.in_(attr_value_ids))\
          .delete(synchronize_session='fetch')

      db.session.commit()

    # 4) Instantiate custom attribute values for each of the definitions
    #    passed in (keys)
    # pylint: disable=not-an-iterable
    definitions = {d.id: d for d in cls.get_custom_attribute_definitions()}
    for ad_id in attributes.keys():
      obj_type = cls.__class__.__name__
      obj_id = cls.id
      new_value = CustomAttributeValue(
          custom_attribute_id=ad_id,
          attributable_id=obj_id,
          attributable_type=obj_type,
          attribute_value=attributes[ad_id],
      )
      if definitions[int(ad_id)].attribute_type.startswith("Map:"):
        obj_type, obj_id = new_value.attribute_value.split(":")
        new_value.attribute_value = obj_type
        new_value.attribute_object_id = obj_id
      # 5) Set the context_id for each custom attribute value to the context id
      #    of the custom attributable.
      # TODO: We are ignoring contexts for now
      # new_value.context_id = cls.context_id
      cls.custom_attribute_values.append(new_value)
      if ad_id in last_values:
        ca, pv = last_values[ad_id]  # created_at, previous_value
        if pv != attributes[ad_id]:
          signals.Signals.custom_attribute_changed.send(
              cls.__class__,
              obj=cls,
              src={
                  "type": obj_type,
                  "id": obj_id,
                  "operation": "UPDATE",
                  "value": new_value,
                  "old": pv
              }, service=cls.__class__.__name__)
      else:
        signals.Signals.custom_attribute_changed.send(
            cls.__class__,
            obj=cls,
            src={
                "type": obj_type,
                "id": obj_id,
                "operation": "INSERT",
                "value": new_value,
            }, service=cls.__class__.__name__)

  _publish_attrs = ['custom_attribute_values']
  _update_attrs = ['custom_attributes']
  _include_links = []

  @classmethod
  def get_custom_attribute_definitions(cls):
    from ggrc.models.custom_attribute_definition import \
        CustomAttributeDefinition
    return CustomAttributeDefinition.query.filter(
        CustomAttributeDefinition.definition_type ==
        underscore_from_camelcase(cls.__name__)).all()

  @classmethod
  def eager_query(cls):
    query = super(CustomAttributable, cls).eager_query()
    return query.options(
        orm.subqueryload('custom_attribute_values')
    )

  def log_json(self):
    # pylint: disable=not-an-iterable
    from ggrc.models.custom_attribute_definition import \
        CustomAttributeDefinition
    # to integrate with Base mixin without order dependencies
    res = getattr(super(CustomAttributable, self), "log_json", lambda: {})()
    res["custom_attributes"] = [value.log_json()
                                for value in self.custom_attribute_values]
    # fetch definitions form database because `self.custom_attribute`
    # may not be populated
    defs = CustomAttributeDefinition.query.filter(
        CustomAttributeDefinition.definition_type == self.type,
        CustomAttributeDefinition.id.in_([
            value.custom_attribute_id for value in self.custom_attribute_values
        ])
    )
    # also log definitions to freeze field names in time
    res["custom_attribute_definitions"] = [definition.log_json()
                                           for definition in defs]
    return res


class TestPlanned(object):

  @declared_attr
  def test_plan(cls):
    return deferred(db.Column(db.Text), cls.__name__)

  # REST properties
  _publish_attrs = ['test_plan']
  _fulltext_attrs = ['test_plan']
  _sanitize_html = ['test_plan']
  _aliases = {"test_plan": "Test Plan"}
