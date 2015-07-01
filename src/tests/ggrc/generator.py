# Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: miha@reciprocitylabs.com
# Maintained By: miha@reciprocitylabs.com

from datetime import date, timedelta
from ggrc.services.common import Resource
from ggrc.models import *
from ggrc_basic_permissions.models import *
from ggrc.app import app
from ggrc import db
from tests.ggrc.api_helper import Api
import string
import random
import names


class Generator():

  def __init__(self):
    self.api = Api()
    self.resource = Resource()

  def random_str(self, length=8,
                 chars=string.ascii_uppercase + string.digits + "  _.-"):
    return ''.join(random.choice(chars) for _ in range(length))

  def random_date(self, start=date.today(), end=None):
    if not end or start > end:
      end = start + timedelta(days=7)
    return start + timedelta(
        seconds=random.randint(0, int((end - start).total_seconds())))

  def get_object(self, obj_class, obj_id):
    try:
      return db.session.query(obj_class).filter(obj_class.id == obj_id).one()
    except:
      return None

  def generate(self, obj_class, obj_name, data):
    response = self.api.post(obj_class, data)
    response_obj = None
    if response.json:
      response_obj = self.get_object(obj_class, response.json[obj_name]['id'])
    return response, response_obj

  def modify(self, obj, obj_name, data):
    obj_class = obj.__class__
    response = self.api.put(obj, data)
    response_obj = None
    if response.json:
      response_obj = self.get_object(obj_class, response.json[obj_name]['id'])
    return response, response_obj

  def obj_to_dict(self, obj, model_name=None):
    result = {}
    with app.app_context():
      result = self.resource.object_for_json(obj, model_name)
    return result


class ObjectGenerator(Generator):

  def generate_object(self, obj_class, obj_name, data={}):
    obj = obj_class(title=self.random_str())
    obj_dict = self.obj_to_dict(obj, obj_name)
    obj_dict[obj_name].update({"owners": [{
        "id": 1,
        "href": "/api/people/1",
        "type": "Person"
    }]})
    obj_dict[obj_name].update(data)
    return self.generate(obj_class, obj_name, obj_dict)


  def generate_policy(self, data={}):
    obj_name = "policy"
    default = {
        obj_name: {
            "title": "policy " + self.random_str(),
            "custom_attribute_definitions": [],
            "custom_attributes": {},
            "kind": "",
            "notes": "",
            "status": "Draft",
            "url": "",
            "end_date": "",
            "description": "",
            "context": None,
            "contact": {
                "id": 1,
                "href": "/api/people/1",
                "type": "Person"
            },
            "owners": [{
                "id": 1,
                "href": "/api/people/1",
                "type": "Person"
            }],
        }
    }
    default[obj_name].update(data)

    return self.generate(Policy, obj_name, default)

  def generate_user_role(self, person, role):
    data = {
        "user_role": {
            "context": None,
            "person": {
                "href": "/api/person/%d" % person.id,
                "id": person.id,
                "type": "Person"
            },
            "role": {
                "href": "/api/roles/%d" % role.id,
                "id": role.id,
                "type": "Role"
            }
        }
    }
    return self.generate(UserRole, "user_role", data)

  def generate_person(self, data={}, user_role=None):
    obj_name = 'person'
    name = names.get_full_name()
    default = {
        obj_name: {
            "context": None,
            "name": name,
            "email": "%s@test.com" % name.replace(" ", ".").lower(),
        }
    }
    default[obj_name].update(data)
    response, person = self.generate(Person, obj_name, default)

    if person and user_role:
      role = db.session.query(Role).filter(Role.name == user_role).first()
      self.generate_user_role(person, role)

    return response, person

  def generate_random_objects(self, count=5):
    random_objects = []
    classes = [Control, Objective, Standard, System]
    for _ in range(count):
      obj_class = random.choice(classes)
      obj_name = obj_class.__name__.lower()
      response, obj = self.generate_object(obj_class, obj_name)
      if obj:
        random_objects.append(obj)
    return random_objects

  def generate_random_people(self, count=5, **kwargs):
    random_people = []
    for _ in range(count):
      _, person = self.generate_person(**kwargs)
      if person:
        random_people.append(person)
    return random_people

  def generate_notification_setting(self, user_id, notif_type, enable_flag):
    obj_name = "notification_config"
    data = {
        obj_name: {
            "person_id": user_id,
            "notif_type": notif_type,
            "enable_flag": enable_flag,
            "context": None,
            "type": "NotificationConfig",
        }
    }
    return self.generate(NotificationConfig, obj_name, data)
