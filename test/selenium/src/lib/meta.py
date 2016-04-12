# Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: jernej@reciprocitylabs.com
# Maintained By: jernej@reciprocitylabs.com
"""Metaclasses module"""

from lib import exception


class RequireDocs(type):
  """
  Requires from all methods to include docstrings.
  """

  def __new__(mcs, name, bases, dct):
    for attr_name, value in dct.items():
      if callable(value) and not hasattr(value, "__doc__"):
        raise exception.DocstringsMissing(attr_name)

    return super(RequireDocs, mcs).__new__(mcs, name, bases, dct)
