# Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: jernej@reciprocitylabs.com
# Maintained By: jernej@reciprocitylabs.com

"""A module for extended info page models (visible in LHN on hover over
object members)"""

from selenium.common import exceptions

from lib import base
from lib.constants import locator
from lib.utils import selenium_utils


class ExtendedInfo(base.Component):
  """Model representing an extended info box that allows the object to be
  mapped"""
  locator_cls = locator.ExtendedInfo

  def __init__(self, driver):
    super(ExtendedInfo, self).__init__(driver)
    self.is_mapped = None
    self.button_map = None
    self.title = base.Label(driver, self.locator_cls.TITLE)

    self._set_is_mapped()

  def map_to_object(self):
    selenium_utils.click_on_staleable_element(
        self._driver,
        self.locator_cls.BUTTON_MAP_TO)
    self.is_mapped = True

  def _set_is_mapped(self):
    """Checks if the object is already mapped"""
    try:
      self._driver.find_element(*self.locator_cls.ALREADY_MAPPED)
      self.is_mapped = True
    except exceptions.NoSuchElementException:
      self.is_mapped = False
