# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: dan@reciprocitylabs.com

from ggrc import db
from sqlalchemy.ext.associationproxy import association_proxy
from sqlalchemy.ext.declarative import declared_attr
from ggrc.models.mixins import deferred, Mapping, Timeboxed
from ggrc.models.reflection import PublishOnly


class ObjectDocument(Timeboxed, Mapping, db.Model):
  __tablename__ = 'object_documents'

  role = deferred(db.Column(db.String), 'ObjectDocument')
  notes = deferred(db.Column(db.Text), 'ObjectDocument')
  document_id = db.Column(db.Integer, db.ForeignKey('documents.id'),
                          nullable=False)
  documentable_id = db.Column(db.Integer, nullable=False)
  documentable_type = db.Column(db.String, nullable=False)

  @property
  def documentable_attr(self):
    return '{0}_documentable'.format(self.documentable_type)

  @property
  def documentable(self):
    return getattr(self, self.documentable_attr)

  @documentable.setter
  def documentable(self, value):
    self.documentable_id = value.id if value is not None else None
    self.documentable_type = value.__class__.__name__ if value is not None \
        else None
    return setattr(self, self.documentable_attr, value)

  # properties to integrate into revision indexing
  @property
  def source_type(self):
    return "Document"

  @property
  def source_id(self):
    return self.document_id

  @property
  def destination_type(self):
    return self.documentable_type

  @property
  def destination_id(self):
    return self.documentable_id

  @staticmethod
  def _extra_table_args(cls):
    return (
        db.UniqueConstraint('document_id',
                            'documentable_id',
                            'documentable_type'),
        db.Index('ix_document_id', 'document_id'),
    )

  _publish_attrs = [
      'role',
      'notes',
      'document',
      'documentable',
  ]
  _sanitize_html = [
      'notes',
  ]

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(ObjectDocument, cls).eager_query()
    return query.options(
        orm.subqueryload('document'))

  def _display_name(self):
    return self.documentable.display_name + '<->' + self.document.display_name


class Documentable(object):
  @declared_attr
  def object_documents(cls):
    cls.documents = association_proxy(
        'object_documents', 'document',
        creator=lambda document: ObjectDocument(
            document=document,
            documentable_type=cls.__name__,
        )
    )
    joinstr = ('and_(foreign(ObjectDocument.documentable_id) == {type}.id, '
               '     foreign(ObjectDocument.documentable_type) == "{type}")')
    joinstr = joinstr.format(type=cls.__name__)
    return db.relationship(
        'ObjectDocument',
        primaryjoin=joinstr,
        backref='{0}_documentable'.format(cls.__name__),
        cascade='all, delete-orphan',
    )

  _publish_attrs = [
      PublishOnly('documents'),
      'object_documents',
  ]

  _include_links = [
      # 'object_documents',
  ]

  @classmethod
  def eager_query(cls):
    from sqlalchemy import orm

    query = super(Documentable, cls).eager_query()
    return cls.eager_inclusions(query, Documentable._include_links).options(
        orm.subqueryload('object_documents'))
