# Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: urban@reciprocitylabs.com
# Maintained By: urban@reciprocitylabs.com

import datetime
from dateutil import relativedelta

from cycle_calculator import CycleCalculator

class WeeklyCycleCalculator(CycleCalculator):
  """CycleCalculator implementation for weekly workflows.

  Weekly workflows have a date domain of workdays (Monday - Friday),
  calculations are based on relative_start_day and relative_end_day.
  """
  time_delta = datetime.timedelta(weeks=1)
  date_domain = set({1,2,3,4,5})

  def __init__(self, workflow, base_date=None):
    if not base_date:
      base_date = datetime.date.today()

    super(WeeklyCycleCalculator, self).__init__(workflow)
    self.tasks.sort(key=lambda t: t.relative_start_day)

    self.reified_tasks = {}
    for task in self.tasks:
      start_date, end_date = self.task_date_range(task, base_date)
      self.reified_tasks[task.id] = {
        'start_date': start_date,
        'end_date': end_date,
        'relative_start': task.relative_start_day,
        'relative_end': task.relative_end_day
      }

  @staticmethod
  def relative_day_to_date(relative_day, relative_month=None, base_date=None):
    """Converts a weekly representation of a day into concrete date object.

    Weekly relative days are represented as days in the week (1 Monday,
    5 Friday); we calculate a concrete date by adding the difference between
    target relative day and iso weekeday of the base_date.

    Example:
      If relative day is Friday (5) and base_date (cycle start date) is
      Wednesday, we don't want need to do Wednesday + 5 but Wednesday + 2 to
      get back Friday.
    """
    today = datetime.date.today()
    relative_day = int(relative_day)
    if relative_day not in WeeklyCycleCalculator.date_domain:
      raise ValueError(
        "Weekly recurring cycles can only have relative day in 1-5 "
        "(Monday-Friday) range")

    if not base_date:
      base_date = today

    # If somebody is working during weekend we don't want to calculate
    # for previous week but for the next week.
    if base_date == today and base_date.isoweekday() >= 6:
      base_date = base_date + WeeklyCycleCalculator.time_delta

    return base_date + relativedelta.relativedelta(
      days=relative_day - base_date.isoweekday())