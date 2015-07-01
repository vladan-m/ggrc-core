# Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: anze@reciprocitylabs.com
# Maintained By: anze@reciprocitylabs.com

"""
Test Creator role with Program scoped roles
"""

import unittest
from tests.ggrc import TestCase
from ggrc.models import all_models
from tests.ggrc.api_helper import Api
from tests.ggrc.generator import Generator
from tests.ggrc.generator import ObjectGenerator
from ggrc import db


class TestCreatorProgram(TestCase):
  """Set up necessary objects and test Creator role with Program roles"""

  def setUp(self):
    TestCase.setUp(self)
    self.generator = Generator()
    self.api = Api()
    self.object_generator = ObjectGenerator()
    self.init_users()
    self.init_roles()
    self.init_test_cases()
    self.objects = {}

  def init_test_cases(self):
    """ Create a dict of all possible test cases """
    self.test_cases = {
        "notmapped": {
            "objects": {
                "program": {
                    "get": 403,
                    "put": 403,
                    "delete": 403
                },
                "mapped_object": {
                    "get": 403,
                    "put": 403,
                    "delete": 403
                }
            }
        },
        "mapped": {
            "objects": {
                "program": {
                    "get": 403,
                    "put": 403,
                    "delete": 403
                },
                "mapped_object": {
                    "get": 403,
                    "put": 403,
                    "delete": 403
                }
            }
        },
        "ProgramReader": {
            "program_role": "ProgramReader",
            "objects": {
                "program": {
                    "get": 200,
                    "put": 403,
                    "delete": 403
                },
                "mapped_object": {
                    "get": 200,
                    "put": 403,
                    "delete": 403
                }
            }
        },
        "ProgramOwner": {
            "program_role": "ProgramOwner",
            "objects": {
                "program": {
                    "get": 200,
                    "put": 200,
                    "delete": 200
                },
                "mapped_object": {
                    "get": 200,
                    "put": 200,
                    "delete": 200,
                }
            }
        },
        "ProgramEditor": {
            "program_role": "ProgramEditor",
            "objects": {
                "program": {
                    "get": 200,
                    "put": 200,
                    "delete": 200
                },
                "mapped_object": {
                    "get": 200,
                    "put": 200,
                    "delete": 200
                }
            }
        },
    }

  def init_roles(self):
    """ Create a delete request for the given object """
    response = self.api.get_query(all_models.Role, "")
    self.roles = {}
    for role in response.json.get("roles_collection").get("roles"):
      self.roles[role.get("name")] = role

  def init_users(self):
    """ Create users used by test cases """
    users = [
        ("creator", "Creator"),
        ("notmapped", "Creator"),
        ("mapped", "Creator"),
        ("ProgramReader", "Creator"),
        ("ProgramEditor", "Creator"),
        ("ProgramOwner", "Creator")]
    self.people = {}
    for (name, role) in users:
      _, user = self.object_generator.generate_person(
          data={"name": name}, user_role=role)
      self.people[name] = user

  def delete(self, obj):
    """ Create a delete request for the given object """
    return self.api.delete(obj, obj.id).status_code

  def get(self, obj):
    """ Create a get request for the given object """
    return self.api.get(obj.__class__, obj.id).status_code

  def put(self, obj):
    """ Create a put request for the given object """
    response = self.api.get(obj.__class__, obj.id)
    if response.status_code == 200:
      return self.api.put(obj, response.json).status_code
    else:
      return response.status_code

  def init_objects(self, test_case_name):
    """ Create a Program and a Mapped object for a given test case """
    # Create a program
    test_case = self.test_cases[test_case_name]
    creator = self.people.get('creator')
    self.api.set_user(creator)
    random_title = self.object_generator.random_str()
    response = self.api.post(all_models.Program, {
        "program": {"title": random_title, "context": None},
    })
    self.assertEquals(response.status_code, 201)
    context_id = response.json.get("program").get("context").get("id")
    program_id = response.json.get("program").get("id")
    self.objects["program"] = all_models.Program.query.get(program_id)
    # Create an object:
    response = self.api.post(all_models.System, {
        "system": {"title": random_title, "context": None},
    })
    self.assertEquals(response.status_code, 201)
    system_id = response.json.get("system").get("id")
    self.objects["mapped_object"] = all_models.System.query.get(system_id)
    # Map Object to Program
    response = self.api.post(all_models.Relationship, {
        "relationship": {"source": {
            "id": program_id,
            "type": "Program"
        }, "destination": {
            "id": system_id,
            "type": "System"
        }, "context": None},
    })
    self.assertEquals(response.status_code, 201)

    # Map people to Program:
    if test_case_name != "notmapped":
      person = self.people.get(test_case_name)
      response = self.api.post(all_models.ObjectPerson, {"object_person": {
          "person": {
              "id": person.id,
              "type": "Person",
              "href": "/api/people/{}".format(person.id),
          }, "personable": {
              "type": "Program",
              "href": "/api/programs/{}".format(program_id),
              "id": program_id,
          }, "context": {
              "type": "Context",
              "id": context_id,
              "href": "/api/contexts/{}".format(context_id)
          }}})

    # Add roles to mapped users:
    if "program_role" in test_case:
      person = self.people.get(test_case_name)
      role = self.roles[test_case["program_role"]]
      response = self.api.post(all_models.UserRole, {"user_role": {
          "person": {
              "id": person.id,
              "type": "Person",
              "href": "/api/people/{}".format(person.id),
          }, "role": {
              "type": "Role",
              "href": "/api/roles/{}".format(role["id"]),
              "id": role["id"],
          }, "context": {
              "type": "Context",
              "id": context_id,
              "href": "/api/contexts/{}".format(context_id)
          }}})
      self.assertEquals(response.status_code, 201)

  def test_creator_program_roles(self):
    """ Test creator role with all program scoped roles """
    # Check permissions based on test_cases:
    errors = []
    for test_case in self.test_cases:
      self.init_objects(test_case)
      person = self.people.get(test_case)
      objects = self.test_cases.get(test_case).get('objects')
      self.api.set_user(person)
      for obj in ("mapped_object", "program"):
        actions = objects[obj]
        for action in ("get", "put", "delete"):
          # reset sesion:
          db.session.commit()
          func = getattr(self, action)
          if test_case == 'ProgramEditor' and action == "delete":
            res = func(self.objects[obj])
          else:
            res = func(self.objects[obj])
          if res != actions[action]:
            errors.append(
                "{}: Tried {} on {}, but received {} instead of {}".format(
                    test_case, action, obj, res, actions[action]))
    self.assertEquals(errors, [])
