# Copyright (C) 2014 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: dan@reciprocitylabs.com


from collections import namedtuple


CacheEntry   = namedtuple('CacheEntry', 'model_plural class_name cache_type')
MappingEntry = namedtuple('MappingEntry', 'class_name attr polymorph')

def resource(model_plural, class_name, cache_type='memcache'):
  return CacheEntry(model_plural, class_name, cache_type)

def mapping(class_name, attr, polymorph=False):
  return MappingEntry(class_name, attr, polymorph)


def all_cache_entries():
  ret = [
    resource('audits','Audit'),
    resource('categorizations','Categorization'),
    resource('category_bases', 'CategoryBase'),
    resource('control_categories', 'ControlCategory'),
    resource('control_assertions', 'ControlAssertion'),
    resource('contexts', 'Context'),
    resource('controls', 'Control'),
    resource('control_assessments', 'ControlAssessments'),
    resource('control_controls', 'ControlControl'),
    resource('control_sections', 'ControlSection'),
    resource('data_assets', 'DataAsset'),
    resource('directives', 'Directive'),
    resource('directive_sections', 'DirectiveSection'),
    resource('contracts', 'Contract'),
    resource('policies', 'Policy'),
    resource('regulations', 'Regulation'),
    resource('standards', 'Standard'),
    resource('directive_controls', 'DirectiveControl'),
    resource('documents', 'Document'),
    resource('events', 'Event'),
    resource('facilities', 'Facility'),
    resource('helps', 'Help'),
    resource('markets', 'Market'),
    resource('meetings', 'Meeting'),
    resource('object_controls', 'ObjectControl'),
    resource('object_documents', 'ObjectDocument'),
    resource('object_objectives', 'ObjectObjective'),
    resource('object_owners', 'ObjectOwner'),
    resource('object_people', 'ObjectPerson'),
    resource('object_sections', 'ObjectSection'),
    resource('objectives', 'Objective'),
    resource('objective_controls', 'ObjectiveControl'),
    resource('options', 'Option'),
    resource('org_groups', 'OrgGroup'),
    resource('vendors', 'Vendor'),
    resource('people', 'Person'),
    resource('products', 'Product'),
    resource('projects', 'Project'),
    resource('programs', 'Program'),
    resource('relationships', 'Relationship'),
    resource('relationship_types', 'RelationshipType'),
    resource('requests', 'Request'),
    resource('responses', 'Response'),
    resource('documentation_responses', 'DocumentationResponse'),
    resource('interview_responses', 'InterviewResponse'),
    resource('population_sample_responses', 'PopulationSampleResponse'),
    resource('revisions', 'Revision'),
    resource('sections', 'Section'),
    resource('clauses', 'Clause'),
    resource('section_objectives', 'SectionObjective'),
    resource('systems_or_processes', 'SystemOrProcess'),
    resource('systems', 'System'),
    resource('processes', 'Process'),
    resource('issues', 'Issue'),

    # ggrc notification models
    resource('notification_configs', 'NotificationConfig'),
    resource('notifications', 'Notification'),
    resource('notification_recipients', 'NotificationRecipient'),
    resource('notification_objects', 'NotificationObject'),

    # ggrc custom attribuess
    resource('custom_attribute_definitions', 'CustomAttributeDefinition'),
    resource('custom_attribute_values', 'CustomAttributeValue'),

    # FIXME: Extension-defined models should be registered from the extensions.

    # ggrc_basic_permissions models
    resource('roles', 'Role'),
    resource('user_roles', 'UserRole'),

    # ggrc_gdrive_integration models
    resource('object_folders', 'ObjectFolder'),
    resource('object_files', 'ObjectFile'),
    resource('object_events', 'ObjectEvent'),

    # ggrc_risk_assessments models
    resource('templates', 'Template'),
    resource('risk_assessments', 'RiskAssessment'),
    resource('risk_assessment_mappings', 'RiskAssessmentMapping'),
    resource('risk_assessment_control_mappings', 'RiskAssessmentControlMapping'),
    resource('threats', 'Threat'),
    resource('vulnerabilities', 'Vulnerability'),

    # ggrc_workflows models
    resource('cycle_task_entries', 'CycleTaskEntry'),
    resource('cycle_task_group_object_tasks', 'CycleTaskGroupObjectTask'),
    resource('cycle_task_group_objects', 'CycleTaskGroupObject'),
    resource('cycle_task_groups', 'CycleTaskGroup'),
    resource('cycles', 'Cycle'),
    resource('task_group_objects', 'TaskGroupObject'),
    resource('task_group_tasks', 'TaskGroupTask'),
    resource('task_groups', 'TaskGroup'),
    resource('workflow_people', 'WorkflowPerson'),
    resource('workflows', 'Workflow'),
    ]

  return ret

def all_mapping_entries():
  ret = [
    mapping('Audit', 'requests'),
    mapping('Audit', 'program'),
    mapping('Request', 'audit'),
    mapping('Request', 'responses'),
    mapping('Response', 'request'),
    mapping('DocumentationResponse', 'request'),
    mapping('InterviewResponse', 'request'),
    mapping('PopulationSampleResponse', 'request'),
    mapping('ControlControl', 'control'),
    mapping('ControlControl', 'implemented_control'),
    mapping('ControlSection', 'control'),
    mapping('ControlSection', 'section'),
    mapping('DirectiveControl', 'directive'),
    mapping('DirectiveControl', 'control'),
    mapping('DirectiveSection', 'directive'),
    mapping('DirectiveSection', 'section'),
    mapping('ObjectControl', 'control'),
    mapping('ObjectControl', 'controllable', True),
    mapping('ObjectDocument', 'document'),
    mapping('ObjectDocument', 'documentable', True),
    mapping('ObjectObjective', 'objective'),
    mapping('ObjectObjective', 'objectiveable', True),
    mapping('ObjectOwner', 'person'),
    mapping('ObjectOwner', 'ownable', True),
    mapping('ObjectPerson', 'person'),
    mapping('ObjectPerson', 'personable', True),
    mapping('ObjectSection', 'section'),
    mapping('ObjectSection', 'sectionable', True),
    mapping('ObjectiveControl', 'objective'),
    mapping('ObjectiveControl', 'control'),
    mapping('SectionObjective', 'section'),
    mapping('SectionObjective', 'objective'),
    mapping('Section', 'directive'),
    mapping('Relationship', 'source', True),
    mapping('Relationship', 'destination', True),
    mapping('UserRole', 'context'),
    mapping('UserRole', 'person'),
    mapping('UserRole', 'role'),
    mapping('ObjectEvent', 'eventable', True),
    mapping('ObjectFolder', 'folderable', True),
    mapping('ObjectFile', 'fileable', True),
    mapping('Notification', 'recipients'),
    mapping('Notification', 'notification_object'),
    # ggrc_workflows mappings:
    mapping('TaskGroupObject', 'object', True),
    mapping('TaskGroupObject', 'task_group'),
    mapping('TaskGroupTask', 'task_group'),
    mapping('TaskGroup', 'workflow'),
    mapping('WorkflowPerson', 'context'),
    mapping('WorkflowPerson', 'person'),
    mapping('WorkflowPerson', 'workflow'),
    mapping('Cycle', 'workflow'),
    mapping('Cycle', 'cycle_task_groups'),
    mapping('Cycle', 'cycle_task_group_object_objects_for_cache'),
    mapping('CycleTaskGroup', 'cycle'),
    mapping('CycleTaskGroup', 'cycle_task_group_objects'),
    mapping('CycleTaskGroup', 'task_group'),
    mapping('CycleTaskGroupObject', 'cycle'),
    mapping('CycleTaskGroupObject', 'object'),
    mapping('CycleTaskGroupObject', 'task_group_object'),
    mapping('CycleTaskGroupObject', 'cycle_task_group'),
    mapping('CycleTaskGroupObject', 'cycle_task_group_object_tasks'),
    mapping('CycleTaskGroupObjectTask', 'cycle'),
    mapping('CycleTaskGroupObjectTask', 'cycle_task_entries'),
    mapping('CycleTaskGroupObjectTask', 'task_group_task'),
    mapping('CycleTaskGroupObjectTask', 'cycle_task_group_object'),
    mapping('CycleTaskEntry', 'cycle'),
    mapping('CycleTaskEntry', 'cycle_task_group_object_task'),
    #mapping('RiskAssessmentMapping'),
    #mapping('RiskAssessmentControlMapping'),
    ]

  return ret

class Cache:
  name = None
  supported_resources = {}

  def __init__(self):
    pass

  def get_name(self):
    return None

  def get(self, category, resource, filter):
    return None

  def add(self, category, resource, data, expiration_time=0):
    return None

  def update(self, category, resource, data, expiration_time=0):
    return None

  def remove(self, category, resource, data, lockadd_seconds=0):
    return None

  def get_multi(self, filter):
    return None

  def add_multi(self, data, expiration_time=0):
    return None

  def update_multi(self, data, expiration_time=0):
    return None

  def remove_multi(self, category, resource, data, lockadd_seconds=0):
    return None

  def clean(self):
    return False

  def get_key(self, category, resource):
    cache_key = category + ":" + resource
    return cache_key

  def parse_filter(self, filter):
    ids = None
    attrs = None

    ids_exist = filter.has_key('ids')
    attrs_exist = filter.has_key('attrs')

    if ids_exist or attrs_exist:
      if ids_exist and attrs_exist:
        ids=filter.get('ids')
        attrs=filter.get('attrs')
      elif ids_exist:
        ids=filter.get('ids')
      else:
        attrs=filter.get('attrs')

    return ids, attrs

  def is_caching_supported(self, category, resource):
    if category is 'collection':
      return self.supported_resources.has_key(resource)
    else:
      return False
