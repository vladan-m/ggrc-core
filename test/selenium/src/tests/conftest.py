# Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: jernej@reciprocitylabs.com
# Maintained By: jernej@reciprocitylabs.com

"""PyTest fixtures"""

import pytest   # pylint: disable=import-error

from lib import constants
from lib.page.widget import info_widget
from lib.constants.test import batch
from lib.utils import conftest_utils
from lib.utils import test_utils

# pylint: disable=redefined-outer-name
pytest_plugins = "selenium", "xdist", "xvfb", "timeout", "flask", \
                 "rerunfailures", "timeout", "repeat", "pycharm"


@pytest.yield_fixture(scope="session")
def db_drop():
  """Reset the DB"""
  # todo
  pass


@pytest.yield_fixture(scope="session")
def db_migrate():
  """Make sure the DB is up to date"""
  # todo
  pass


@pytest.yield_fixture(scope="function")
def selenium(selenium):
  """Setup test resources for running test in headless mode"""

  # todo: here we should use selenium.maximize_window() and env variables to
  #  set xvfb resolution in the docker container. Setting the env vars
  # currently doesn't work for selenium-docker
  selenium.set_window_size(1440, 900)
  yield selenium


@pytest.yield_fixture(scope="function")
def custom_program_attribute(selenium):
  """Creates a custom attribute for a program object"""
  # pylint: disable=redefined-outer-name
  cust_attr_widget = conftest_utils.create_custom_program_attribute(
      selenium)
  yield cust_attr_widget
  # todo: delete this custom attribute


@pytest.yield_fixture(scope="function")
def new_control(selenium):
  """Creates a new control object.

  Returns:
      lib.page.widget.Controls
  """
  control_info_page = conftest_utils.create_lhn_object(
      selenium, constants.element.Lhn.CONTROLS)
  yield control_info_page


@pytest.yield_fixture(scope="function")
def new_program(selenium, new_control):
  """Creates a new program object and returns the program info page with the
  saved modal"""
  # pylint: disable=redefined-outer-name
  modal = conftest_utils.get_lhn_accordion(
      selenium, constants.element.Lhn.PROGRAMS)\
      .create_new()
  test_utils.ModalNewPrograms.enter_test_data(modal)
  modal.save_and_close()
  program_info_page = info_widget.Programs(selenium)
  yield modal, program_info_page


@pytest.yield_fixture(scope="function")
def new_org_group(selenium):
  """Creates a new org group object.

  Returns:
      lib.page.widget.OrgGroupInfo
  """
  org_group_page = conftest_utils.create_lhn_object(
      selenium, constants.element.Lhn.ORG_GROUPS)
  yield org_group_page


@pytest.yield_fixture(scope="function")
def new_risk(selenium):
  """Creates a new risk group object.

  Returns:
      lib.page.widget.Risks
  """
  risk_page = conftest_utils.create_lhn_object(
      selenium, constants.element.Lhn.RISKS)
  yield risk_page


@pytest.yield_fixture(scope="function")
def new_request(selenium):
  """Creates a new request object.

  Returns:
      lib.page.widget.Requests
  """
  request_page = conftest_utils.create_lhn_object(
      selenium, constants.element.Lhn.REQUESTS)
  yield request_page


@pytest.yield_fixture(scope="function")
def new_issue(selenium):
  """Creates a new request object.

  Returns:
      lib.page.widget.IssueInfo
  """
  issue_info_page = conftest_utils.create_lhn_object(
      selenium, constants.element.Lhn.ISSUES)
  yield issue_info_page


@pytest.yield_fixture(scope="function")
def new_process(selenium):
  """Creates a new request object.

  Returns:
      lib.page.widget.Processes
  """
  process_info_page = conftest_utils.create_lhn_object(
      selenium, constants.element.Lhn.PROCESSES)
  yield process_info_page


@pytest.yield_fixture(scope="function")
def new_data_asset(selenium):
  """Creates a new data asset object.

  Returns:
      lib.page.widget.DataAssetInfo
  """
  data_asset_page = conftest_utils.create_lhn_object(
      selenium, constants.element.Lhn.DATA_ASSETS)
  yield data_asset_page


@pytest.yield_fixture(scope="function")
def new_system(selenium):
  """Creates a new system object.

  Returns:
      lib.page.widget.IssueInfo
  """
  system_page = conftest_utils.create_lhn_object(
      selenium, constants.element.Lhn.SYSTEMS)
  yield system_page


@pytest.yield_fixture(scope="function")
def new_product(selenium):
  """Creates a new request object.

  Returns:
      lib.page.widget.Product
  """
  product_page = conftest_utils.create_lhn_object(
      selenium, constants.element.Lhn.PRODUCTS)
  yield product_page


@pytest.yield_fixture(scope="function")
def new_project(selenium):
  """Creates a new project object.

  Returns:
      lib.page.widget.ProjectInfo
  """
  project_page = conftest_utils.create_lhn_object(
      selenium, constants.element.Lhn.PROJECTS)
  yield project_page


@pytest.yield_fixture(scope="function")
def battery_of_controls(selenium):
  """Creates 3 control objects"""
  controls = []

  for _ in xrange(batch.BATTERY):
    controls.append(conftest_utils.create_lhn_object(
        selenium, constants.element.Lhn.CONTROLS))

  yield controls
