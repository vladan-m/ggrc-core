# Copyright (C) 2016 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: ivan@reciprocitylabs.com
# Maintained By: ivan@reciprocitylabs.com

"""
  Assessment generator hooks

  We are applying assessment template properties and make
  new relationships and custom attributes
"""

from ggrc import db
from ggrc.login import get_current_user_id
from ggrc.models import all_models
from ggrc.models import Assessment
from ggrc.models import Person
from ggrc.models import Relationship
from ggrc.services.common import Resource


def init_hook():
  """ Initialize hooks"""
  # pylint: disable=unused-variable
  @Resource.model_posted_after_commit.connect_via(Assessment)
  def handle_assessment_post(sender, obj=None, src=None, service=None):
    # pylint: disable=unused-argument
    """Apply custom attribute definitions and map people roles
    when generating Assessmet with template"""

    src_obj = src.get("object")
    audit = src.get("audit")
    program = src.get("program")
    map_assessment(obj, src_obj)
    map_assessment(obj, audit)
    # The program may also be set as the src_obj. If so then it should not be
    # mapped again.
    if (src_obj and program and
        (src_obj["id"] != program["id"] or
         src_obj["type"] != program["type"])):
      map_assessment(obj, program)

    if not src.get("_generated"):
      return

    related = {
        "template": get_by_id(src.get("template")),
        "obj": get_by_id(src.get("object")),
        "audit": get_by_id(src.get("audit")),
    }
    relate_assignees(obj, related)
    relate_ca(obj, related)


def map_assessment(assessment, obj):
  """Creates a relationship between an assessment and an object. This also
  generates automappings. Fails silently if obj dict does not have id and type
  keys.

  Args:
    assessment (models.Assessment): The assessment model
    obj (dict): A dict with `id` and `type`.
  Returns:
    None
  """
  obj = obj or {}
  if 'id' not in obj or 'type' not in obj:
    return
  rel = Relationship(**{
      "source": assessment,
      "destination_id": obj["id"],
      "destination_type": obj["type"],
      "context": assessment.context,
  })
  db.session.add(rel)


def get_by_id(obj):
  """Get object instance by id"""
  if not obj:
    return

  model = get_model_query(obj["type"])
  return model.get(obj["id"])


def get_model_query(model_type):
  """Get model query"""
  model = getattr(all_models, model_type, None)
  return db.session.query(model)


def get_value(people_group, audit, obj, template=None):
  """Return the people related to an Audit belonging to the given role group.

  Args:
    people_group: (string) the name of the group of people to return,
      e.g. "assessors"
    template: (ggrc.models.AssessmentTemplate) a template to take into
      consideration
    audit: (ggrc.models.Audit) an audit instance
    obj: an object related to `audit`, can be anything that can be mapped
      to an Audit, e.g. Control, Issue, Facility, etc.
  Returns:
    Either a Person object, a list of Person objects, or None if no people
    matching the criteria are found.
  """
  auditors = (
      user_role.person for user_role in audit.context.user_roles
      if user_role.role.name == u"Auditor"
  )

  if not template:
    if people_group == "creator":
      # don't use get_current_user because that returns a proxy
      return Person.query.get(get_current_user_id())
    elif people_group == "assessors":
      return list(auditors)

    return None

  types = {
      "Object Owners": [
          owner.person for owner in getattr(obj, 'object_owners', None)
      ],
      "Audit Lead": getattr(audit, 'contact', None),
      "Primary Contact": getattr(obj, 'contact', None),
      "Secondary Contact": getattr(obj, 'secondary_contact', None),
      "Primary Assessor": getattr(obj, 'principal_assessor', None),
      "Secondary Assessor": getattr(obj, 'secondary_assessor', None),
  }
  people = template.default_people.get(people_group)
  if not people:
    return None

  if isinstance(people, list):
    return [get_by_id({
        'type': 'Person',
        'id': person_id
    }) for person_id in people]

  # only consume the generator if it will be used in the return value
  if people == u"Auditors":
    types[u"Auditors"] = list(auditors)

  return types.get(people)


def assign_people(assignees, assignee_role, assessment, relationships):
  """Create a list of people with roles

      Args:
        assignees (list of model instances): List of people
        assignee_role (string): It can be either Assessor or Verifier
        assessment (model instance): Assessment model
        relationships (list): List relationships between assignees and
                              assessment with merged AssigneeType's
  """
  assignees = assignees if isinstance(assignees, list) else [assignees]
  assignees = [assignee for assignee in assignees if assignee is not None]

  if not assignees and assignee_role != "Verifier":
    assignees.append(assessment.modified_by)

  for assignee in assignees:
    rel = (val for val in relationships if val["source"] == assignee)
    rel = next(rel, None)
    if rel:
      values = rel["attrs"]["AssigneeType"].split(",")
      values.append(assignee_role)
      rel["attrs"]["AssigneeType"] = ",".join(set(values))
    else:
      relationships.append(
          get_relationship_dict(assignee, assessment, assignee_role))


def get_relationship_dict(source, destination, role):
  """ Returns relationship object with Assignee Type"""
  return {
      "source": source,
      "destination": destination,
      "context": destination.context,
      "attrs": {
          "AssigneeType": role,
      },
  }


def relate_assignees(assessment, related):
  """Generates assignee list and relates them to Assessment objects

    Args:
        assessment (model instance): Assessment model
        related (dict): Dict containing model instances related to assessment
                        - obj
                        - audit
                        - template (an AssessmentTemplate, can be None)
  """
  people_types = {
      "assessors": "Assessor",
      "verifiers": "Verifier",
      "creator": "Creator",
  }
  people_list = []

  for person_key, person_type in people_types.iteritems():
    assign_people(
        get_value(person_key, **related),
        person_type, assessment, people_list)

  for person in people_list:
    if person['source'] is not None and person['destination'] is not None:
      rel = Relationship(
          source=person['source'],
          destination=person['destination'],
          context=person['context'])
      rel.attrs = person['attrs']
      db.session.add(rel)


def relate_ca(assessment, related):
  """Generates custom attribute list and relates it to Assessment objects

    Args:
        assessment (model instance): Assessment model
        related (dict): Dict containing model instances related to assessment
                        - template
                        - obj
                        - audit
  """
  if not related["template"]:
    return

  ca_query = all_models.CustomAttributeDefinition.eager_query()
  ca_definitions = ca_query.filter_by(
      definition_id=related["template"].id,
      definition_type="assessment_template",
  )

  for definition in ca_definitions:
    db.make_transient(definition)
    definition.id = None
    definition.definition_id = assessment.id
    definition.definition_type = assessment._inflector.table_singular
    db.session.add(definition)
