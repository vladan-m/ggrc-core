# Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: anze@reciprocitylabs.com
# Maintained By: anze@reciprocitylabs.com

"""
Test Assignable RBAC
"""

from ggrc.models import all_models
from integration.ggrc import TestCase
from integration.ggrc.api_helper import Api
from integration.ggrc.generator import Generator
from integration.ggrc.generator import ObjectGenerator


class TestReader(TestCase):
  """Test Assignable RBAC"""

  def setUp(self):
    TestCase.setUp(self)
    self.generator = Generator()
    self.api = Api()
    self.object_generator = ObjectGenerator()
    self.init_users()
    self.init_assignable()

  def init_users(self):
    """ Init users needed by the test cases """
    users = [("creator", "Creator"), ("reader", "Reader"),
             ("editor", "Editor"), ("admin", "gGRC Admin")]
    self.users = {}
    for (name, role) in users:
      _, user = self.object_generator.generate_person(
          data={"name": name}, user_role=role)
      self.users[name] = user

  def init_assignable(self):
    """Creates the assignable object used by all the tests"""
    self.api.set_user(self.users["editor"])
    response = self.api.post(all_models.Assessment, {
        "assessment": {
            "title": "Assessment",
            "context": None,
        }
    })
    obj_id = response.json.get("assessment").get("id")
    self.assertEqual(response.status_code, 201, "Error setting up Assessment")
    self.obj_json = response.json
    self.obj = all_models.Assessment.query.get(obj_id)

  def _post_relationship(self, user, obj_id):
    """Helper method for creating assignees on an object"""
    return self.api.post(all_models.Relationship, {
        "relationship": {"source": {
            "id": obj_id,
            "type": "Assessment"
        }, "destination": {
            "id": user.id,
            "type": "Person"
        }, "attrs": {
            "AssigneeType": "Creator"
        }, "context": None},
    })

  def test_basic_operations_with_no_assignee(self):
    """Editor creates an Assessment, but doesn't assign Reader/Creator as
       assignee. Reader should have Read access, Creator should have no access
    """

    # Reader should have read access, but shouldn't be allowed to edit or
    # create another assingee
    self.api.set_user(self.users["reader"])
    response = self.api.get(all_models.Assessment, self.obj.id)
    self.assertEqual(response.status_code, 200)
    response = self.api.put(self.obj, self.obj_json)
    self.assertEqual(response.status_code, 403)
    response = self._post_relationship(self.users["reader"], self.obj.id)
    self.assertEqual(response.status_code, 403)

    # Creator should have no access. We skip the put request because we can't
    # get the object etag.
    self.api.set_user(self.users["creator"])
    response = self.api.get(all_models.Assessment, self.obj.id)
    self.assertEqual(response.status_code, 403)
    response = self._post_relationship(self.users["reader"], self.obj.id)
    self.assertEqual(response.status_code, 403)

  def test_basic_operations_with_assignee(self):
    """Test if Reader/Creator have CRUD access once they become assignees"""

    # Admin adds reader as an assignee
    self.api.set_user(self.users["admin"])
    response = self._post_relationship(self.users["reader"], self.obj.id)
    self.assertEqual(response.status_code, 201)

    # Reader is now allowed to update the object
    self.api.set_user(self.users["reader"])
    response = self.api.get(all_models.Assessment, self.obj.id)
    self.assertEqual(response.status_code, 200)
    response = self.api.put(self.obj, response.json)
    self.assertEqual(response.status_code, 200)

    # Reader adds creator as an assignee
    response = self._post_relationship(self.users["creator"], self.obj.id)
    self.assertEqual(response.status_code, 201)

    # Creator now has CRUD access
    self.api.set_user(self.users["creator"])
    response = self.api.get(all_models.Assessment, self.obj.id)
    self.assertEqual(response.status_code, 200)
    response = self.api.put(self.obj, response.json)

    # Creator should even be allowed to add new assignees
    response = self._post_relationship(self.users["admin"], self.obj.id)
    self.assertEqual(response.status_code, 201)

  def test_readability_of_mapped_objects(self):
    """Test if assignees get Read access on all mapped objects"""

    # Editor creates a System object and maps it to the assignable object
    self.api.set_user(self.users["editor"])
    response = self.api.post(all_models.System, {
        "system": {
            "title": "System",
            "context": None,
        }
    })
    system_id = response.json.get("system").get("id")
    system = all_models.System.query.get(system_id)
    self.api.post(all_models.Relationship, {
        "relationship": {"source": {
            "id": self.obj.id,
            "type": "Assessment"
        }, "destination": {
            "id": system_id,
            "type": "System"
        }, "context": None},
    })

    # Since creator is not an assignee she should not have access to any of the
    # two objects
    self.api.set_user(self.users["creator"])
    response = self.api.get(all_models.Assessment, self.obj.id)
    self.assertEqual(response.status_code, 403)
    response = self.api.get(all_models.System, system_id)
    self.assertEqual(response.status_code, 403)

    # Editor adds creator as an assignee
    self.api.set_user(self.users["editor"])
    response = self._post_relationship(self.users["creator"], self.obj.id)

    # Creator should now have read access on the mapped object
    self.api.set_user(self.users["creator"])
    response = self.api.get(all_models.System, system_id)
    self.assertEqual(response.status_code, 200)

    # But he should still not be allowed to update
    response = self.api.put(system, response.json)
    self.assertEqual(response.status_code, 403)
