# Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: miha@reciprocitylabs.com
# Maintained By: miha@reciprocitylabs.com

"""Test api helper.

This module contains an api helper that is used for simulating api calls to our
app. This api helper is used instead of the TestCase.client in cases where we
need to access the API during the class setup stage, when the default flaks
test client is not yet ready.

This api helper also helps with delete and put requests where it fetches the
latest etag needed for such requests.
"""

from ggrc import db
from ggrc import builder
from ggrc.app import app
from ggrc.services.common import Resource
import flask
import logging


# style: should the class name be all capitals?
class Api():

  def __init__(self):
    self.tc = app.test_client()
    self.tc.get("/login")
    self.resource = Resource()
    self.headers = {'Content-Type': 'application/json',
                    "X-Requested-By": "gGRC"
                    }
    self.user_headers = {}

  def set_user(self, person=None):
    # Refresh the person instance from the db:
    if person:
      person = person.__class__.query.get(person.id)
      self.user_headers = {
          "X-ggrc-user": self.resource.as_json({
              "name": person.name,
              "email": person.email,
          })
      }
    else:
      self.user_headers = {}

    self.tc.get("/logout")
    self.tc.get("/login", headers=self.user_headers)
    db.session.commit()
    db.session.flush()

  def api_link(self, obj, obj_id=None):
    obj_id = "" if obj_id is None else "/" + str(obj_id)
    return "/api/%s%s" % (obj._inflector.table_plural, obj_id)

  def data_to_json(self, response):
    """ add docoded json to response object """
    try:
      response.json = flask.json.loads(response.data)
    except:
      response.json = None
    return response

  def send_request(self, request, obj, data, headers={}, api_link=None):
    if api_link is None:
      api_link = self.api_link(obj)

    headers.update(self.headers)
    headers.update(self.user_headers)

    json_data = self.resource.as_json(data)
    logging.info("request json" + json_data)
    response = request(api_link, data=json_data, headers=headers.items())
    if response.status_code == 302:
      self.set_user()
      response = request(api_link, data=json_data, headers=headers.items())
    return self.data_to_json(response)

  def put(self, obj, data):
    response = self.get(obj, obj.id)
    headers = {
        "If-Match": response.headers.get("Etag"),
        "If-Unmodified-Since": response.headers.get("Last-Modified")
    }
    api_link = self.api_link(obj, obj.id)
    return self.send_request(
        self.tc.put, obj, data, headers=headers, api_link=api_link)

  def post(self, obj, data):
    return self.send_request(self.tc.post, obj, data)

  def get(self, obj, id):
    return self.data_to_json(self.tc.get(self.api_link(obj, id)))

  def get_collection(self, obj, ids):
    return self.data_to_json(self.tc.get(
        "{}?ids={}".format(self.api_link(obj), ids)))

  def get_query(self, obj, query):
    return self.data_to_json(self.tc.get(
        "{}?{}".format(self.api_link(obj), query)))

  def modify_object(self, obj, data=None):
    """Make a put call for a given object.

    Args:
      obj (db.Model): Object that should be modified, and it can also contain
        the changes that should be made.
      data (dict): dictionary containing the changed values for the object.
        This is not mandatory if the object itself has the given changes.

    Returns:
      response, db.Model: The put response from the server and the modified
        object if the put request was successful.
    """
    obj_dict = builder.json.publish(obj)
    builder.json.publish_representation(obj_dict)
    obj_dict.update(data)
    data = {obj._inflector.table_singular: obj_dict}
    return self.put(obj, data)

  def delete(self, obj):
    """Delete api call helper.

    This function helps creating delete calls for a specific object by fetching
    the data and setting the appropriate etag needed for the delete api calls.

    Args:
      obj (sqlalchemy model): object that we wish to delete.

    Returns:
      Server response.
    """
    response = self.get(obj, obj.id)
    headers = {
        "If-Match": response.headers.get("Etag"),
        "If-Unmodified-Since": response.headers.get("Last-Modified")
    }
    headers.update(self.headers)
    api_link = self.api_link(obj, obj.id)
    return self.tc.delete(api_link, headers=headers)

  def search(self, types, q="", counts=False, relevant_objects=None):
    query = '/search?q={}&types={}&counts_only={}'.format(q, types, counts)
    if relevant_objects is not None:
      query += '&relevant_objects=' + relevant_objects
    return (self.tc.get(query), self.headers)
