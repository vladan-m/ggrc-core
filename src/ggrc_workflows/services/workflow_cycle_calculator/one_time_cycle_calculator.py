# Copyright (C) 2015 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: urban@reciprocitylabs.com
# Maintained By: urban@reciprocitylabs.com
import datetime

from ggrc_workflows.services.workflow_cycle_calculator.cycle_calculator import CycleCalculator

class OneTimeCycleCalculator(CycleCalculator):
  """CycleCalculator implementation for one-time workflows

  Because one-time workflows have concrete start and end dates already specified
  for tasks, we don't have to implement relative_day_to_date function and
  we can return all values in their raw format (we don't need to adjust for
  holidays).
  """
  def __init__(self, workflow):
    super(OneTimeCycleCalculator, self).__init__(workflow)
    self.tasks.sort(key=lambda t: self._date_normalizer(t.start_date))

  def relative_day_to_date(self):
    raise NotImplemented("Relative days are not applicable "
                         "for one-time workflows.")

  def task_date_range(self, task, base_date=None):
    return task.start_date, task.end_date

  @staticmethod
  def _date_normalizer(d):
    if type(d) is datetime.datetime:
      return d.date()
    return d

  def workflow_date_range(self):
    tasks_start_dates = [self._date_normalizer(task.start_date) for task in self.tasks]
    tasks_end_dates = [self._date_normalizer(task.end_date) for task in self.tasks]
    return min(tasks_start_dates), max(tasks_end_dates)

  def next_cycle_start_date(self, base_date=None):
    return None
