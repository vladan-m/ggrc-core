# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: david@reciprocitylabs.com
# Maintained By: david@reciprocitylabs.com

"""Initialize RBAC"""

import datetime
import sqlalchemy.orm
from flask import Blueprint
from flask import g
from sqlalchemy import and_
from sqlalchemy import case
from sqlalchemy import literal
from sqlalchemy import or_
from sqlalchemy.orm import aliased
from sqlalchemy.orm.attributes import get_history
from ggrc import db, settings
from ggrc.app import app
from ggrc_basic_permissions import basic_roles
from ggrc_basic_permissions.contributed_roles import lookup_role_implications
from ggrc_basic_permissions.contributed_roles import BasicRoleDeclarations
from ggrc_basic_permissions.contributed_roles import BasicRoleImplications
from ggrc_basic_permissions.converters.handlers import COLUMN_HANDLERS
from ggrc_basic_permissions.models import ContextImplication
from ggrc_basic_permissions.models import get_ids_related_to
from ggrc_basic_permissions.models import Role
from ggrc_basic_permissions.models import UserRole
from ggrc.login import get_current_user
from ggrc.models import all_models
from ggrc.models.audit import Audit
from ggrc.models.program import Program
from ggrc.rbac import permissions
from ggrc.rbac.permissions_provider import DefaultUserPermissions
from ggrc.services.common import _get_cache_manager
from ggrc.services.common import Resource
from ggrc.services.registry import service
from ggrc.utils import benchmark


blueprint = Blueprint(
    'permissions',
    __name__,
    template_folder='templates',
    static_folder='static',
    static_url_path='/static/ggrc_basic_permissions',
)


def get_public_config(_):
  """Expose additional permissions-dependent config to client.
    Specifically here, expose GGRC_BOOTSTRAP_ADMIN values to ADMIN users.
  """
  public_config = {}
  if permissions.is_admin():
    if hasattr(settings, 'BOOTSTRAP_ADMIN_USERS'):
      public_config['BOOTSTRAP_ADMIN_USERS'] = settings.BOOTSTRAP_ADMIN_USERS
  return public_config


def objects_via_assignable_query(user_id, context_not_role=True):
  """Creates a query that returns objects a user can access because she is
     assigned via the assignable mixin.

    Args:
        user_id (int): id of the user

    Returns:
        db.session.query object that selects the following columns:
            | id | type | context_id |
  """

  rel1 = aliased(all_models.Relationship, name="rel1")
  rel2 = aliased(all_models.Relationship, name="rel2")
  _attrs = aliased(all_models.RelationshipAttr, name="attrs")

  def assignable_join(query):
    """Joins relationship_attrs to the query. This filters out only the
       relationship objects where the user is mapped with an AssigneeType.
    """
    return query.join(
        _attrs, and_(
            _attrs.relationship_id == rel1.id,
            _attrs.attr_name == "AssigneeType",
            case([
                (rel1.destination_type == "Person",
                 rel1.destination_id)
            ], else_=rel1.source_id) == user_id))

  def related_assignables():
    """Header for the mapped_objects join"""
    return db.session.query(
        case([
            (rel2.destination_type == rel1.destination_type,
             rel2.source_id)
        ], else_=rel2.destination_id).label('id'),
        case([
            (rel2.destination_type == rel1.destination_type,
             rel2.source_type)
        ], else_=rel2.destination_type).label('type'),
        rel1.context_id if context_not_role else literal('R')
    ).select_from(rel1)

  # First we fetch objects where a user is mapped as an assignee
  assigned_objects = assignable_join(db.session.query(
      case([
          (rel1.destination_type == "Person",
           rel1.source_id)
      ], else_=rel1.destination_id),
      case([
          (rel1.destination_type == "Person",
           rel1.source_type)
      ], else_=rel1.destination_type),
      rel1.context_id if context_not_role else literal('RUD')))

  # The user should also have access to objects mapped to the assigned_objects
  # We accomplish this by filtering out relationships where the user is
  # assigned and then joining the relationship table for the second time,
  # retrieving the mapped objects.
  #
  # We have a union here because using or_ to join both by destination and
  # source was not performing well (8s+ query times)
  mapped_objects = assignable_join(
      # Join by destination:
      related_assignables()).join(rel2, and_(
          case([
              (rel1.destination_type == "Person",
               rel1.source_id)
          ], else_=rel1.destination_id) == rel2.destination_id,
          case([
              (rel1.destination_type == "Person",
               rel1.source_type)
          ], else_=rel1.destination_type) == rel2.destination_type)
  ).union(assignable_join(
      # Join by source:
      related_assignables()).join(rel2, and_(
          case([
              (rel1.destination_type == "Person",
               rel1.source_id)
          ], else_=rel1.destination_id) == rel2.source_id,
          case([
              (rel1.destination_type == "Person",
               rel1.source_type)
          ], else_=rel1.destination_type) == rel2.source_type))
  )
  return mapped_objects.union(assigned_objects)


def objects_via_relationships_query(model, roles, user_id, context_not_role):
  """Creates a query that returns objects a user can access via mappings.

    Args:
        model: base model upon the roles are given
        roles: list of roles names to check
        user_id: id of the user
        context_not_role: use context instead of the role for the third column
            in the search api we need to return (obj_id, obj_type, context_id),
            but in ggrc_basic_permissions we need a role instead of a
            context_id (obj_id, obj_type, role_name)

    Returns:
        db.session.query object that selects the following columns:
            | id | type | role_name or context |
        Rows represent objects that are mapped to objects of the given model
        (where the user has a listed role) and the corresponding relationships.
  """
  _role = aliased(all_models.Role, name="r")
  _implications = aliased(all_models.ContextImplication, name="ci")
  _model = aliased(model, name="p")
  _relationship = aliased(all_models.Relationship, name="rl")
  _user_role = aliased(all_models.UserRole, name="ur")

  def _join_filter(query, cond):
    """Filter a query based on user roles

    Args:
        query (sqlalchemy.orm.query.Query): query to be filtered
        cond (sqlalchemy.sql.elements.BooleanClauseList): condition used for
            the initial model query

    Returns:
        query (sqlalchemy.orm.query.Query): object with applied conditions
    """
    user_role_cond = and_(_user_role.person_id == user_id,
                          _user_role.context_id == _implications.context_id)
    role_cond = and_(_user_role.role_id == _role.id,
                     _role.name.in_(roles))
    return query.join(_model, cond).join(
        _implications, _model.context_id == _implications.source_context_id).\
        join(_user_role, user_role_cond).\
        join(_role, role_cond).\
        distinct().\
        union(query.join(_model, cond).join(_implications,
              _model.context_id == _implications.context_id).
              join(_user_role, user_role_cond).
              join(_role, role_cond).
              distinct())

  def _add_relationship_join(query):
    # We do a UNION here because using an OR to JOIN both destination
    # and source causes a full table scan
    return _join_filter(query,
                        and_(_relationship.source_type == model.__name__,
                             _model.id == _relationship.source_id))\
        .union(_join_filter(
            query,
            and_(_relationship.destination_type == model.__name__,
                 _model.id == _relationship.destination_id)
        ))

  objects = _add_relationship_join(db.session.query(
      case([
          (_relationship.destination_type == model.__name__,
           _relationship.source_id.label('id'))
      ], else_=_relationship.destination_id.label('id')),
      case([
          (_relationship.destination_type == model.__name__,
           _relationship.source_type.label('type'))
      ], else_=_relationship.destination_type.label('type')),
      literal(None).label('context_id') if context_not_role else _role.name))

  # We also need to return relationships themselves:
  relationships = _add_relationship_join(db.session.query(
      _relationship.id, literal("Relationship"), _relationship.context_id))
  return objects.union(relationships)


def program_relationship_query(user_id, context_not_role=False):
  """Creates a query that returns objects a user can access via program.

    Args:
        user_id: id of the user
        context_not_role: use context instead of the role for the third column
            in the search api we need to return (obj_id, obj_type, context_id),
            but in ggrc_basic_permissions we need a role instead of a
            context_id (obj_id, obj_type, role_name)

    Returns:
        db.session.query object that selects the following columns:
            | id | type | role_name or context |
  """
  return objects_via_relationships_query(
      model=all_models.Program,
      roles=('ProgramEditor', 'ProgramOwner', 'ProgramReader'),
      user_id=user_id,
      context_not_role=context_not_role
  )


def audit_relationship_query(user_id, context_not_role=False):
  """Creates a query that returns objects a user can access via audit.

    Args:
        user_id: id of the user
        context_not_role: use context instead of the role for the third column
            in the search api we need to return (obj_id, obj_type, context_id),
            but in ggrc_basic_permissions we need a role instead of a
            context_id (obj_id, obj_type, role_name)

    Returns:
        db.session.query object that selects the following columns:
            | id | type | role_name or context |
  """
  return objects_via_relationships_query(
      model=all_models.Audit,
      roles=('Auditor', 'ProgramEditor', 'ProgramOwner', 'ProgramReader'),
      user_id=user_id,
      context_not_role=context_not_role
  )


class CompletePermissionsProvider(object):
  def __init__(self, _):
    pass

  def permissions_for(self, user):
    ret = UserPermissions()
    # force the permissions to be loaded into session, otherwise templates
    # that depend on the permissions being available in session may assert
    # the user has no permissions!
    ret.check_permissions()
    return ret

  def handle_admin_user(self, user):
    pass


class BasicUserPermissions(DefaultUserPermissions):
  """User permissions that aren't kept in session."""
  def __init__(self, user):
    self.user = user
    with benchmark('BasicUserPermissions > load permissions for user'):
      self.permissions = load_permissions_for(user)

  def _permissions(self):
    return self.permissions


class UserPermissions(DefaultUserPermissions):
  @property
  def _request_permissions(self):
    return getattr(g, '_request_permissions', None)

  @_request_permissions.setter
  def _request_permissions(self, value):
    setattr(g, '_request_permissions', value)

  def _permissions(self):
    self.check_permissions()
    return self._request_permissions

  def check_permissions(self):
    if not self._request_permissions:
      self.load_permissions()

  def get_email_for(self, user):
    return user.email if hasattr(user, 'email') else 'ANONYMOUS'

  def load_permissions(self):
    user = get_current_user()
    email = self.get_email_for(user)
    self._request_permissions = {}
    self._request_permissions['__user'] = email
    if user is None or user.is_anonymous():
      self._request_permissions = {}
    else:
      with benchmark('load_permissions > load permissions for user'):
        self._request_permissions = load_permissions_for(user)


def collect_permissions(src_permissions, context_id, permissions):
  for action, resource_permissions in src_permissions.items():
    if not resource_permissions:
      permissions.setdefault(action, dict())
    for resource_permission in resource_permissions:
      if type(resource_permission) in [str, unicode]:
        resource_type = str(resource_permission)
        condition = None
      else:
        resource_type = str(resource_permission['type'])
        condition = resource_permission.get('condition', None)
        terms = resource_permission.get('terms', [])
      permissions.setdefault(action, {})\
          .setdefault(resource_type, dict())\
          .setdefault('contexts', list())
      if context_id is not None:
        permissions[action][resource_type]['contexts'].append(context_id)
      elif condition is None:
        permissions[action][resource_type]['contexts'].append(context_id)
      if condition:
        permissions[action][resource_type]\
            .setdefault('conditions', dict())\
            .setdefault(context_id, list())\
            .append({
                'condition': condition,
                'terms': terms,
            })


def load_permissions_for(user):  # noqa
  """Permissions is dictionary that can be exported to json to share with
  clients. Structure is:
  ..

    permissions[action][resource_type][contexts]
                                      [conditions][context][context_conditions]

  'action' is one of 'create', 'read', 'update', 'delete'.
  'resource_type' is the name of a valid gGRC resource type.
  'contexts' is a list of context_id where the action is allowed.
  'conditions' is a dictionary of 'context_conditions' indexed by 'context'
    where 'context' is a context_id.
  'context_conditions' is a list of dictionaries with 'condition' and 'terms'
    keys.
  'condition' is the string name of a conditional operator, such as 'contains'.
  'terms' are the arguments to the 'condition'.
  """
  PERMISSION_CACHE_TIMEOUT = 1800  # 30 minutes
  permissions = {}
  key = 'permissions:{}'.format(user.id)
  cache = None

  if getattr(settings, 'MEMCACHE_MECHANISM', False):
    cache = _get_cache_manager().cache_object.memcache_client
    cached_keys_set = cache.get('permissions:list') or set()
    if key not in cached_keys_set:
      # We set the permissions:list variable so that we are able to batch
      # remove all permissions related keys from memcache
      cached_keys_set.add(key)
      cache.set('permissions:list', cached_keys_set, PERMISSION_CACHE_TIMEOUT)
    else:
      permissions_cache = cache.get(key)
      if permissions_cache:
        # If the key is both in permissions:list and in memcache itself
        # it is safe to return the cached permissions
        return permissions_cache

  # Add default `Help` and `NotificationConfig` permissions for everyone
  # FIXME: This should be made into a global base role so it can be extended
  #   from extensions
  default_permissions = {
      "read": [
          "Help",
          "CustomAttributeDefinition",
          {
              "type": "CustomAttributeValue",
              "terms": {
                  "list_property": "owners",
                  "value": "$current_user"
              },
              "condition": "contains"
          },
          {
              "type": "NotificationConfig",
              "terms": {
                  "property_name": "person",
                  "value": "$current_user"
              },
              "condition": "is"
          },
      ],
      "create": [
          {
              "type": "NotificationConfig",
              "terms": {
                  "property_name": "person",
                  "value": "$current_user"
              },
              "condition": "is"
          },
      ],
      "update": [
          {
              "type": "NotificationConfig",
              "terms": {
                  "property_name": "person",
                  "value": "$current_user"
              },
              "condition": "is"
          },
      ]
  }
  collect_permissions(default_permissions, None, permissions)

  # Add `ADMIN_PERMISSION` for "bootstrap admin" users
  if hasattr(settings, 'BOOTSTRAP_ADMIN_USERS') \
     and user.email in settings.BOOTSTRAP_ADMIN_USERS:
    admin_permissions = {
        DefaultUserPermissions.ADMIN_PERMISSION.action: [
            DefaultUserPermissions.ADMIN_PERMISSION.resource_type
        ]
    }
    collect_permissions(
        admin_permissions,
        DefaultUserPermissions.ADMIN_PERMISSION.context_id,
        permissions)

  # Now add permissions from all DB-managed roles
  user_roles = db.session.query(UserRole)\
      .options(
          sqlalchemy.orm.undefer_group('UserRole_complete'),
          sqlalchemy.orm.undefer_group('Role_complete'),
          sqlalchemy.orm.joinedload('role'))\
      .filter(UserRole.person_id == user.id)\
      .order_by(UserRole.updated_at.desc())\
      .all()

  source_contexts_to_rolenames = {}
  for user_role in user_roles:
    source_contexts_to_rolenames.setdefault(
        user_role.context_id, list()).append(user_role.role.name)
    if isinstance(user_role.role.permissions, dict):
      collect_permissions(
          user_role.role.permissions, user_role.context_id, permissions)

  # apply role implications per context implication
  all_context_implications = db.session.query(ContextImplication)
  keys = [k for k in source_contexts_to_rolenames.keys() if k is not None]
  if keys and None in source_contexts_to_rolenames:
    all_context_implications = all_context_implications.filter(
        or_(
            ContextImplication.source_context_id is None,
            ContextImplication.source_context_id.in_(keys),
        )).all()
  elif keys:
    all_context_implications = all_context_implications.filter(
        ContextImplication.source_context_id.in_(keys)).all()
  elif None in source_contexts_to_rolenames:
    all_context_implications = all_context_implications.filter(
        ContextImplication.source_context_id is None).all()
  else:
    all_context_implications = []

  # Gather all roles required by context implications
  implied_context_to_implied_roles = {}
  all_implied_roles_set = set()
  for context_implication in all_context_implications:
    for rolename in source_contexts_to_rolenames.get(
            context_implication.source_context_id, []):
      implied_role_names_list = implied_context_to_implied_roles.setdefault(
          context_implication.context_id, list())
      implied_role_names = lookup_role_implications(
          rolename, context_implication)
      all_implied_roles_set.update(implied_role_names)
      implied_role_names_list.extend(implied_role_names)
  # If some roles are required, query for them in bulk
  all_implied_roles_by_name = {}
  if implied_context_to_implied_roles and all_implied_roles_set:
    implied_roles = db.session.query(Role)\
        .filter(Role.name.in_(all_implied_roles_set))\
        .options(sqlalchemy.orm.undefer_group('Role_complete'))\
        .all()
    for implied_role in implied_roles:
      all_implied_roles_by_name[implied_role.name] = implied_role
  # Now aggregate permissions resulting from these roles
  for implied_context_id, implied_rolenames \
          in implied_context_to_implied_roles.items():
    if implied_context_id is None:
      continue
    for implied_rolename in implied_rolenames:
      implied_role = all_implied_roles_by_name[implied_rolename]
      collect_permissions(
          implied_role.permissions, implied_context_id, permissions)

  # Agregate from owners:
  for object_owner in user.object_owners:
    for action in ["read", "create", "update", "delete", "view_object_page"]:
      permissions.setdefault(action, {})\
          .setdefault(object_owner.ownable_type, {})\
          .setdefault('resources', list())\
          .append(object_owner.ownable_id)

  for res in program_relationship_query(user.id):
    id_, type_, role_name = res
    actions = ["read", "view_object_page"]
    if role_name in ("ProgramEditor", "ProgramOwner"):
      actions += ["create", "update", "delete"]
    for action in actions:
      permissions.setdefault(action, {})\
          .setdefault(type_, {})\
          .setdefault('resources', list())\
          .append(id_)
  for res in audit_relationship_query(user.id):
    id_, type_, role_name = res
    actions = ["read", "view_object_page"]
    if role_name == "Auditor":
      if type_ in ("Assessment", "Request"):
        actions += ["create", "update", "delete"]
    if role_name in ("ProgramOwner", "ProgramEditor"):
      actions += ["create", "update", "delete"]
    for action in actions:
      permissions.setdefault(action, {})\
          .setdefault(type_, {})\
          .setdefault('resources', list())\
          .append(id_)
  for id_, type_, role_name in objects_via_assignable_query(user.id, False):
    actions = ["read", "view_object_page"]
    if role_name == "RUD":
      actions += ["update", "delete"]
    for action in actions:
      permissions.setdefault(action, {})\
          .setdefault(type_, {})\
          .setdefault('resources', list())\
          .append(id_)

  personal_context = _get_or_create_personal_context(user)

  permissions.setdefault('__GGRC_ADMIN__', {})\
      .setdefault('__GGRC_ALL__', dict())\
      .setdefault('contexts', list())\
      .append(personal_context.id)

  if cache is not None:
    cached_keys_set = cache.get('permissions:list') or set()
    if key in cached_keys_set:
      # We only add the permissions to the cache if the
      # key still exists in the permissions:list after
      # the query has executed.
      cache.set(key, permissions, PERMISSION_CACHE_TIMEOUT)

  # add permissions for backlog workflows to everyone
  actions = ["read", "edit", "update"]
  _types = ["Workflow", "Cycle", "CycleTaskGroup",
            "CycleTaskGroupObjectTask", "TaskGroup", "CycleTaskEntry"]
  for _, _, wf_context_id in backlog_workflows().all():
    for _type in _types:
      if _type == "CycleTaskGroupObjectTask":
        actions += ["delete"]
      if _type == "CycleTaskEntry":
        actions += ["create"]
      for action in actions:
        permissions.setdefault(action, {})\
            .setdefault(_type, {})\
            .setdefault('contexts', list())\
            .append(wf_context_id)
  return permissions


def backlog_workflows():
  """Creates a query that returns all backlog workflows which
  all users can access.

    Returns:
        db.session.query object that selects the following columns:
            | id | type | context_id |
  """
  _workflow = aliased(all_models.Workflow, name="wf")
  return db.session.query(_workflow.id,
                          literal("Workflow").label("type"),
                          _workflow.context_id)\
                   .filter(_workflow.kind == "Backlog")


def _get_or_create_personal_context(user):
  personal_context = user.get_or_create_object_context(
      context=1,
      name='Personal Context for {0}'.format(user.id),
      description='')
  personal_context.modified_by = get_current_user()
  db.session.add(personal_context)
  db.session.flush()
  return personal_context


@Resource.model_posted.connect_via(Program)
def handle_program_post(sender, obj=None, src=None, service=None):
  db.session.flush()
  # get the personal context for this logged in user
  user = get_current_user()
  personal_context = _get_or_create_personal_context(user)
  context = obj.build_object_context(
      context=personal_context,
      name='{object_type} Context {timestamp}'.format(
          object_type=service.model.__name__,
          timestamp=datetime.datetime.now()),
      description='',
  )
  context.modified_by = get_current_user()

  db.session.add(obj)
  db.session.flush()
  db.session.add(context)
  db.session.flush()
  obj.contexts.append(context)
  obj.context = context

  # add a user_roles mapping assigning the user creating the program
  # the ProgramOwner role in the program's context.
  program_owner_role = basic_roles.program_owner()
  user_role = UserRole(
      person=get_current_user(),
      role=program_owner_role,
      context=context,
      modified_by=get_current_user())
  # pass along a temporary attribute for logging the events.
  user_role._display_related_title = obj.title
  db.session.add(user_role)
  db.session.flush()

  # Create the context implication for Program roles to default context
  db.session.add(ContextImplication(
      source_context=context,
      context=None,
      source_context_scope='Program',
      context_scope=None,
      modified_by=get_current_user()))

  if not src.get('private'):
    # Add role implication - all users can read a public program
    add_public_program_context_implication(context)


def add_public_program_context_implication(context, check_exists=False):
  if check_exists and db.session.query(ContextImplication)\
      .filter(
          and_(ContextImplication.context_id == context.id,
               ContextImplication.source_context_id is None)).count() > 0:
    return
  db.session.add(ContextImplication(
      source_context=None,
      context=context,
      source_context_scope=None,
      context_scope='Program',
      modified_by=get_current_user(),
  ))


@Resource.model_put.connect_via(Program)
def handle_program_put(sender, obj=None, src=None, service=None):
  # Check to see if the private property of the program has changed
  if get_history(obj, 'private').has_changes():
    if obj.private:
      # Ensure that any implications from null context are removed
      db.session.query(ContextImplication)\
          .filter(
              ContextImplication.context_id == obj.context_id,
              ContextImplication.source_context_id is None)\
          .delete()
      db.session.flush()
    else:
      # ensure that implications from null are present
      add_public_program_context_implication(obj.context, check_exists=True)
      db.session.flush()


@Resource.model_posted.connect_via(Audit)
def handle_audit_post(sender, obj=None, src=None, service=None):
  db.session.flush()
  # Create an audit context
  context = obj.build_object_context(
      context=obj.context,
      name='Audit Context {timestamp}'.format(
          timestamp=datetime.datetime.now()),
      description='',
  )
  context.modified_by = get_current_user()
  db.session.add(context)
  db.session.flush()

  # Create the program -> audit implication
  db.session.add(ContextImplication(
      source_context=obj.context,
      context=context,
      source_context_scope='Program',
      context_scope='Audit',
      modified_by=get_current_user(),
  ))

  # Create the audit -> program implication
  db.session.add(ContextImplication(
      source_context=context,
      context=obj.context,
      source_context_scope='Audit',
      context_scope='Program',
      modified_by=get_current_user(),
  ))

  db.session.add(obj)

  # Create the role implication for Auditor from Audit for default context
  db.session.add(ContextImplication(
      source_context=context,
      context=None,
      source_context_scope='Audit',
      context_scope=None,
      modified_by=get_current_user(),
  ))
  db.session.flush()

  # Place the audit in the audit context
  obj.context = context


@Resource.model_deleted.connect
def handle_resource_deleted(sender, obj=None, service=None):
  if obj.context \
     and obj.context.related_object_id \
     and obj.id == obj.context.related_object_id \
     and obj.__class__.__name__ == obj.context.related_object_type:
    db.session.query(UserRole) \
        .filter(UserRole.context_id == obj.context_id) \
        .delete()
    db.session.query(ContextImplication) \
        .filter(
            or_(ContextImplication.context_id == obj.context_id,
                ContextImplication.source_context_id == obj.context_id))\
        .delete()
    # Deleting the context itself is problematic, because unattached objects
    #   may still exist and cause a database error.  Instead of implicitly
    #   cascading to delete those, just leave the `Context` object in place.
    #   It and its objects will be visible *only* to Admin users.
    # db.session.delete(obj.context)


# Removed because this is now handled purely client-side, but kept
# here as a reference for the next one.
# @BaseObjectView.extension_contributions.connect_via(Program)
def contribute_to_program_view(sender, obj=None, context=None):
  if obj.context_id is not None and \
     permissions.is_allowed_read('Role', None, 1) and \
     permissions.is_allowed_read('UserRole', None, obj.context_id) and \
     permissions.is_allowed_create('UserRole', None, obj.context_id) and \
     permissions.is_allowed_update('UserRole', None, obj.context_id) and \
     permissions.is_allowed_delete('UserRole', None, obj.context_id):
    return 'permissions/programs/_role_assignments.haml'
  return None


@app.context_processor
def authorized_users_for():
  return {'authorized_users_for': UserRole.role_assignments_for}


def contributed_services():
  """The list of all collections provided by this extension."""
  return [
      service('roles', Role),
      service('user_roles', UserRole),
  ]


def contributed_object_views():
  from ggrc.views.registry import object_view
  return [
      object_view(Role)
  ]


def contributed_column_handlers():
  return COLUMN_HANDLERS


ROLE_DECLARATIONS = BasicRoleDeclarations()
ROLE_IMPLICATIONS = BasicRoleImplications()

contributed_get_ids_related_to = get_ids_related_to
