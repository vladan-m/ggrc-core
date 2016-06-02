# Copyright (C) 2016 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: urban@reciprocitylabs.com
# Maintained By: urban@reciprocitylabs.com

"""Integration test for AutoStatusChangable mixin"""

from ggrc import models

import integration.ggrc
from integration.ggrc import api_helper
from integration.ggrc import generator
from integration.ggrc.models import factories


class TestMixinAutoStatusChangable(integration.ggrc.TestCase):

  """Test case for AutoStatusChangable mixin"""

  # pylint: disable=invalid-name

  def setUp(self):
    integration.ggrc.TestCase.setUp(self)
    self.client.get("/login")
    self.api_helper = api_helper.Api()
    self.objgen = generator.ObjectGenerator()

  def test_open_to_in_progress_first_class_edit(self):
    """Test first class edit - it should move Assessment to Progress state"""
    assessment = self.create_assessment()

    self.assertEqual(assessment.status, models.Assessment.START_STATE)

    self.api_helper.modify_object(assessment, {
        "title": assessment.title + " modified, change #1"
    })
    assessment = self.refresh_object(assessment)
    self.assertEqual(assessment.status, models.Assessment.PROGRESS_STATE)

  def test_chaning_assignees_when_open_should_not_change_status(self):
    """Adding/chaning/removing assignees shouldn't change status when open"""
    people = [
        ("creator@example.com", "Creator"),
        ("assessor_1@example.com", "Assessor"),
        ("assessor_2@example.com", "Assessor"),
    ]

    assessment = self.create_assessment(people)

    assessment = self.refresh_object(assessment)
    self.assertEqual(assessment.status,
                     models.Assessment.START_STATE)

    self.modify_assignee(assessment,
                         "creator@example.com",
                         "Creator,Assessor")

    assessment = self.refresh_object(assessment)
    self.assertEqual(assessment.status,
                     models.Assessment.START_STATE)

    new_assessors = [("assessor_3_added_later@example.com", "Verifier")]
    self.create_assignees_restful(assessment, new_assessors)

    assessment = self.refresh_object(assessment)
    self.assertEqual(assessment.status,
                     models.Assessment.START_STATE)

    self.delete_assignee(assessment, "assessor_1@example.com")

    assessment = self.refresh_object(assessment)
    self.assertEqual(assessment.status,
                     models.Assessment.START_STATE)

  def test_assessment_verifiers_full_cycle_first_class_edit(self):
    """Test Assessment with verifiers full flow

    Test moving from START_STATE to PROGRESS_STATE to FINAL_STATE and back to
    PROGRESS_STATE on edit.
    """
    assessment = self.create_assessment()

    self.assertEqual(assessment.status,
                     models.Assessment.START_STATE)

    assessment = self.refresh_object(assessment)

    self.api_helper.modify_object(assessment, {
        "title": assessment.title + " modified, change #1"
    })

    assessment = self.refresh_object(assessment)

    self.assertEqual(assessment.status,
                     models.Assessment.PROGRESS_STATE)

    assessment = self.change_status(assessment, assessment.DONE_STATE)

    self.assertEqual(assessment.title.endswith("modified, change #1"),
                     True)

    self.assertEqual(assessment.status,
                     models.Assessment.DONE_STATE)

    self.api_helper.modify_object(assessment, {
        "title": assessment.title + " modified, change #2"
    })
    assessment = self.refresh_object(assessment)
    self.assertEqual(assessment.title.endswith("modified, change #2"),
                     True)
    self.assertEqual(assessment.status,
                     models.Assessment.DONE_STATE)

    assessment = self.change_status(assessment,
                                    assessment.VERIFIED_STATE,
                                    assessment.FINAL_STATE)

    self.assertEqual(assessment.status, assessment.FINAL_STATE)
    self.assertEqual(assessment.verified, True)

    self.api_helper.modify_object(assessment, {
        "title": assessment.title + "modified, change #3"
    })
    assessment = self.refresh_object(assessment)
    self.assertEqual(assessment.title.endswith("modified, change #3"),
                     True)
    self.assertEqual(assessment.status,
                     models.Assessment.PROGRESS_STATE)

  def test_adding_assignees(self):
    """Test that adding assignees reverts back to in progress"""
    assessment = self.create_simple_assessment()

    new_assessors = [("assessor_3_added_later@example.com", "Assessor")]
    self.create_assignees_restful(assessment, new_assessors)

    assessment = self.refresh_object(assessment)
    self.assertEqual(assessment.status,
                     models.Assessment.PROGRESS_STATE)

  def test_deleting_existing_assignees(self):
    """Test that deleting assignees reverts back to in progress"""

    assessment = self.create_simple_assessment()

    for_deletion = "assessor_2@example.com"
    self.delete_assignee(assessment, for_deletion)

    assessment = self.refresh_object(assessment)
    self.assertEqual(assessment.status,
                     models.Assessment.PROGRESS_STATE)

  def test_modifying_existing_assignees(self):
    """Test that adding assignee new role reverts back to in progress"""
    assessment = self.create_simple_assessment()

    self.modify_assignee(assessment,
                         "creator@example.com",
                         "Creator,Assessor")

    assessment = self.refresh_object(assessment)
    self.assertEqual(assessment.status,
                     models.Assessment.PROGRESS_STATE)

  @classmethod
  def create_assignees(cls, obj, persons):
    """Create assignees for object.

    This is used only during object creation because we cannot create
    assignees at that point yet.

    Args:
      obj: Assignable object.
      persons: [("(string) email", "Assignee roles"), ...] A list of people
        and their roles
    Returns:
      [(person, object-person relationship,
        object-person relationship attributes), ...] A list of persons with
      their relationships and relationship attributes.
    """
    assignees = []
    for person, roles in persons:
      person = factories.PersonFactory(email=person)

      object_person_rel = factories.RelationshipFactory(
          source=obj,
          destination=person
      )

      object_person_rel_attrs = factories.RelationshipAttrFactory(
          relationship_id=object_person_rel.id,
          attr_name="AssigneeType",
          attr_value=roles
      )
      assignees += [(person, object_person_rel, object_person_rel_attrs)]
    return assignees

  def create_assignees_restful(self, obj, persons):
    """Add assignees via RESTful API instead of directly via backend.

    Used for addind assignees after object has already been created.

    Args:
      obj: Assignable object.
      persons: [("(string) email", "Assignee roles"), ...] A list of people
        and their roles
    Returns:
      List of relationship.
    """

    relationships = []
    for person, roles in persons:
      person = factories.PersonFactory(email=person)

      attrs = {
          "AssigneeType": roles,
      }
      response, relationship = self.objgen.generate_relationship(
          person, obj, context=obj.context, attrs=attrs)
      self.assertEqual(response.status_code, 201)

      relationships += [relationship]
    return relationships

  @staticmethod
  def get_person_relationship(obj, email):
    """Return person's Relationship to object.

    Args:
      obj: object that is linked to person via Relationship
      email: email address of user
    Returns:
      Relationship that has as source object and as destination person
      (or vice versa).
    """
    object_relationships = obj.related_sources + obj.related_destinations

    person_rel = next(rel for rel in object_relationships
                      if email in {getattr(rel.source, "email", None),
                                   getattr(rel.destination, "email", None)})
    return person_rel

  def modify_assignee(self, obj, email, new_role):
    """Modfiy assignee type.

    Args:
      obj: Object
      email: Person's email
      new_role: New roles for AssigneeType
    """
    person_rel = self.get_person_relationship(obj, email)

    self.api_helper.modify_object(person_rel, {
        "attrs": {
            "AssigneeType": new_role
        }
    })

  def delete_assignee(self, obj, email):
    """Deletes user-object relationship user when no more assignee roles.

    This operation is equal to deleting user from a role when that is his only
    role left on the object.

    Args:
      obj: object
      email: assignee's email
    """
    person_rel = self.get_person_relationship(obj, email)
    self.api_helper.delete(person_rel)

  def create_assessment(self, people=None):
    """Create default assessment with some default assignees in all roles.
    Args:
      people: List of tuples with email address and their assignee roles for
              Assessments.
    Returns:
      Assessment object.
    """
    assessment = factories.AssessmentFactory()
    context = factories.ContextFactory(related_object=assessment)
    assessment.context = context

    if not people:
      people = [
          ("creator@example.com", "Creator"),
          ("assessor_1@example.com", "Assessor"),
          ("assessor_2@example.com", "Assessor"),
          ("verifier_1@example.com", "Verifier"),
          ("verifier_2@example.com", "Verifier"),
      ]

    defined_assessors = len([1 for _, role in people
                             if "Assessor" in role])
    defined_creators = len([1 for _, role in people
                            if "Creator" in role])
    defined_verifiers = len([1 for _, role in people
                             if "Verifier" in role])

    self.create_assignees(assessment, people)

    creators = [assignee for assignee, roles in assessment.assignees
                if "Creator" in roles]
    assignees = [assignee for assignee, roles in assessment.assignees
                 if "Assessor" in roles]
    verifiers = [assignee for assignee, roles in assessment.assignees
                 if "Verifier" in roles]

    self.assertEqual(len(creators), defined_creators)
    self.assertEqual(len(assignees), defined_assessors)
    self.assertEqual(len(verifiers), defined_verifiers)
    return assessment

  @classmethod
  def refresh_object(cls, obj):
    """Returns a new instance of a model, fresh and warm from the database."""
    return obj.query.filter_by(id=obj.id).first()

  def change_status(self, obj, status,
                    expected_status=None, check_verified=False):
    """Change status of an object."""
    self.api_helper.modify_object(obj, {
        "status": status
    })
    obj = self.refresh_object(obj)
    if expected_status:
      self.assertEqual(obj.status, expected_status)
    else:
      self.assertEqual(obj.status, status)

    if check_verified:
      self.assertEqual(obj.verified, True)
    return obj

  def create_simple_assessment(self):
    """Create simple assessment with some assessors and in FINAL state."""
    people = [
        ("creator@example.com", "Creator"),
        ("assessor_1@example.com", "Assessor"),
        ("assessor_2@example.com", "Assessor"),
    ]

    assessment = self.create_assessment(people)
    assessment = self.refresh_object(assessment)

    self.api_helper.modify_object(assessment, {
        "title": assessment.title + " modified, change #1"
    })

    assessment = self.refresh_object(assessment)

    self.assertEqual(assessment.status,
                     models.Assessment.PROGRESS_STATE)

    assessment = self.change_status(assessment, assessment.FINAL_STATE)

    assessment = self.refresh_object(assessment)

    self.assertEqual(assessment.status,
                     models.Assessment.FINAL_STATE)
    return assessment
