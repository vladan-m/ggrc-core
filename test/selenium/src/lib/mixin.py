# Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: jernej@reciprocitylabs.com
# Maintained By: jernej@reciprocitylabs.com

from lib import meta


class MetaTestDecorator(meta.RequireDocs, meta.DecorateFlakyTests):
  """Composition of multiple metaclasses"""
