# Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: miha@reciprocitylabs.com
# Maintained By: miha@reciprocitylabs.com

from ggrc.app import app
from ggrc.login import login_required
from flask import render_template
from ggrc import settings


def init_mockup_views():

  # Do not load mockup views in production
  if settings.PRODUCTION:
    return

  @app.route("/mockups/request")
  @login_required
  def mockup_request():
    return render_template("mockups/request.haml")

  @app.route("/mockups/assessor")
  @login_required
  def mockup_assessor():
    return render_template("mockups/assessor.haml")

  @app.route("/mockups/workflow")
  @login_required
  def mockup_workflow():
    return render_template("mockups/workflow.haml")

  @app.route("/mockups/reporting-dashboard")
  @login_required
  def mockup_reporting_dashboard():
    return render_template("mockups/reporting-dashboard.haml")
