/*!
    Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: brad@reciprocitylabs.com
    Maintained By: brad@reciprocitylabs.com
*/

(function (GGRC, can) {

  var Proxy = GGRC.MapperHelpers.Proxy,
    Direct = GGRC.MapperHelpers.Direct,
    Indirect = GGRC.MapperHelpers.Indirect,
    Search = GGRC.MapperHelpers.Search,
    Multi = GGRC.MapperHelpers.Multi,
    TypeFilter = GGRC.MapperHelpers.TypeFilter,
    CustomFilter = GGRC.MapperHelpers.CustomFilter,
    Cross = GGRC.MapperHelpers.Cross;
  /*
    class GGRC.Mappings
    represents everything known about how GGRC objects connect to each other.

    a Mappings instance contains the set of known mappings for a module, such as "ggrc_core"
    or "ggrc_gdrive_integration".  The set of all Mappings instances is used throughout the
    system to build widgets, map and unmap objects, etc.

    To configure a new Mappings instance, use the following format :
    { <mixin name or source object type> : {
        _mixins : [ <mixin name>, ... ],
        _canonical : { <option type> : <name of mapping in parent object>, ... }
        <mapping name> : GGRC.Mappings.Proxy(...) | GGRC.Mappings.Direct(...) | GGRC.Mappings.Indirect(...)
                        | GGRC.Mappings.Multi(...) | GGRC.Mappings.TypeFilter(...) | GGRC.Mappings.Cross(...)
                        | GGRC.Mappings.CustomFilter(...),
        ...
      }
    }
  */
  can.Construct("GGRC.Mappings", {
    // Convenience properties for building mappings types.
    Proxy: Proxy,
    Direct: Direct,
    Indirect: Indirect,
    Search: Search,
    Multi: Multi,
    TypeFilter: TypeFilter,
    CustomFilter: CustomFilter,
    Cross: Cross,
    modules: {},

    /*
      return all mappings from all modules for an object type.
      object - a string representing the object type's shortName

      return: a keyed object of all mappings (instances of GGRC.ListLoaders.BaseListLoader) by mapping name
      Example: GGRC.Mappings.get_mappings_for('Program')
    */
    get_mappings_for: function (object) {
      var mappings = {};
      can.each(this.modules, function (mod, name) {
        if (mod[object]) {
          can.each(mod[object], function (mapping, mapping_name) {
            if (mapping_name === "_canonical")
              return;
            mappings[mapping_name] = mapping;
          });
        }
      });
      return mappings;
    },
    /*
      return the canonical mapping (suitable for joining) between two objects.
      object - the string type (shortName) of the "from" object's class
      option - the string type (shortName) of the "to" object's class

      return: an instance of GGRC.ListLoaders.BaseListLoader (mappings are implemented as ListLoaders)
    */
    get_canonical_mapping: function (object, option) {
      var mapping = null;
      can.each(this.modules, function (mod, name) {
        if (mod._canonical_mappings && mod._canonical_mappings[object] && mod._canonical_mappings[object][option]) {
          mapping = CMS.Models[object].get_mapper(mod._canonical_mappings[object][option]);
          return false;
        }
      });
      return mapping;
    },
    /*
      return the defined name of the canonical mapping between two objects.
      object - the string type (shortName) of the "from" object's class
      option - the string type (shortName) of the "to" object's class

      return: an instance of GGRC.ListLoaders.BaseListLoader (mappings are implemented as ListLoaders)
    */
    get_canonical_mapping_name: function (object, option) {
      var mapping_name = null;
      can.each(this.modules, function (mod, name) {
        if (mod._canonical_mappings && mod._canonical_mappings[object] && mod._canonical_mappings[object][option]) {
          mapping_name = mod._canonical_mappings[object][option];
          return false;
        }
      });
      return mapping_name;
    },
    /*
      return all canonical mappings (suitable for joining) from all modules for an object type.
      object - a string representing the object type's shortName

      return: a keyed object of all mappings (instances of GGRC.ListLoaders.BaseListLoader) by option type
    */
    get_canonical_mappings_for: function (object) {
      var mappings = {};
      can.each(this.modules, function (mod, name) {
        if (mod._canonical_mappings && mod._canonical_mappings[object]) {
          can.each(mod._canonical_mappings[object], function (mapping_name, option) {
            mappings[option] = CMS.Models[object].get_mapper(mapping_name);
          });
        }
      });
      return mappings;
    },
    /*
      return the join model for the canonical mapping between two objects if and only if the canonical mapping is a Proxy.
      model_name_a - the string type (shortName) of the "from" object's class
      model_name_b - the string type (shortName) of the "to" object's class

      return: a string of the shortName of the join model (subclass of can.Model.Join) or null
    */
    join_model_name_for: function (model_name_a, model_name_b) {
      var join_descriptor = this.get_canonical_mapping(model_name_a, model_name_b);
      if (join_descriptor instanceof GGRC.ListLoaders.ProxyListLoader) {
        return join_descriptor.model_name;
      } else {
        return null;
      }
    },
    /*
      make a new instance of the join model for the canonical mapping between two objects
       if and only if the canonical mapping is a Proxy.
      object - the string type (shortName) of the "from" object's class
      option - the string type (shortName) of the "to" object's class
      join_attrs - any other attributes to add to the new instance

      return: an instance of the join model (subclass of can.Model.Join) or null
    */
    make_join_object: function (object, option, join_attrs) {
      var join_model, join_mapping = this.get_canonical_mapping(object.constructor.shortName, option.constructor.shortName),
        object_attrs = {
          id: object.id,
          type: object.constructor.shortName
        },
        option_attrs = {
          id: option.id,
          type: option.constructor.shortName
        };

      if (join_mapping) {
        join_model = CMS.Models[join_mapping.model_name];
        join_attrs = $.extend({}, join_attrs || {});
        join_attrs[join_mapping.option_attr] = option_attrs;
        join_attrs[join_mapping.object_attr] = object_attrs;

        return new join_model(join_attrs);
      } else {
        return null;
      }
    }
  }, {
    /*
      On init:
      kick off the application of mixins to the mappings and resolve canonical mappings
    */
    init: function (name, opts) {
      var created_mappings, that = this;
      this.constructor.modules[name] = this;
      this._canonical_mappings = {};
      if (this.groups) {
        can.each(this.groups, function (group, name) {
          if (typeof group === "function") {
            that.groups[name] = $.proxy(group, that.groups);
          }
        });
      }
      created_mappings = this.create_mappings(opts);
      can.each(created_mappings, function (mappings, object_type) {
        if (mappings._canonical) {
          if (!that._canonical_mappings[object_type]) {
            that._canonical_mappings[object_type] = {};
          }

          can.each(mappings._canonical || [], function (option_types, mapping_name) {
            if (!can.isArray(option_types)) {
              option_types = [option_types];
            }
            can.each(option_types, function (option_type) {
              that._canonical_mappings[object_type][option_type] = mapping_name;
            });
          });
        }
      });
      $.extend(this, created_mappings);
    },
    // Recursively handle mixins -- this function should not be called directly.
    reify_mixins: function (definition, definitions) {
      var that = this,
        final_definition = {};
      if (definition._mixins) {
        can.each(definition._mixins, function (mixin) {
          if (typeof (mixin) === "string") {
            // If string, recursive lookup
            if (!definitions[mixin])
              console.debug("Undefined mixin: " + mixin, definitions);
            else
              can.extend(true, final_definition, that.reify_mixins(definitions[mixin], definitions));
          } else if (can.isFunction(mixin)) {
            // If function, call with current definition state
            mixin(final_definition);
          } else {
            // Otherwise, assume object and extend
            if (final_definition._canonical && mixin._canonical) {
              mixin = can.extend({}, mixin);
              can.each(mixin._canonical, function (types, mapping) {
                if (final_definition._canonical[mapping]) {
                  if (!can.isArray(final_definition._canonical[mapping])) {
                    final_definition._canonical[mapping] = [final_definition._canonical[mapping]];
                  }
                  final_definition._canonical[mapping] = can.unique(final_definition._canonical[mapping].concat(types));
                } else {
                  final_definition._canonical[mapping] = types;
                }
              });
              final_definition._canonical = can.extend({}, mixin._canonical, final_definition._canonical);
              delete mixin._canonical;
            }
            can.extend(final_definition, mixin);
          }
        });
      }
      can.extend(true, final_definition, definition);
      delete final_definition._mixins;
      return final_definition;
    },

    // create mappings for definitions -- this function should not be called directly/
    create_mappings: function (definitions) {
      var mappings = {};

      can.each(definitions, function (definition, name) {
        // Only output the mappings if it's a model, e.g., uppercase first letter
        if (name[0] === name[0].toUpperCase())
          mappings[name] = this.reify_mixins(definition, definitions);
      }, this);
      return mappings;
    }
  });

  new GGRC.Mappings("ggrc_core", {
    base: {},

    // Governance
    Control: {
      _mixins: ["personable", "ownable"], //controllable
      _canonical: {
        "related_objects": ["DataAsset", "Facility", "Market", "OrgGroup", "Vendor", "Process", "Product",
          "Project", "System"
        ],
        "related_objects_as_source": ["Issue", "Program"],
        "objectives": "Objective",
        "implemented_controls": "Control",
        "_sections_base": ["Section", "Clause"],
        "joined_directives": ["Regulation", "Policy", "Contract", "Standard"]
      },
      related_objects: Proxy(
          null, "controllable", "ObjectControl", "control", "object_controls"), //control_objects
      related_data_assets: TypeFilter("related_objects", "DataAsset"),
      related_facilities: TypeFilter("related_objects", "Facility"),
      related_markets: TypeFilter("related_objects", "Market"),
      related_org_groups: TypeFilter("related_objects", "OrgGroup"),
      related_vendors: TypeFilter("related_objects", "Vendor"),
      related_processes: TypeFilter("related_objects", "Process"),
      related_products: TypeFilter("related_objects", "Product"),
      related_projects: TypeFilter("related_objects", "Project"),
      related_systems: TypeFilter("related_objects", "System"),
      related_business_objects: Multi([
        "related_data_assets", "related_facilities", "related_markets",
        "related_org_groups", "related_vendors", "related_processes", "related_products",
        "related_projects", "related_systems"
      ]),
      related_and_able_objects: Multi([
        "objectives", "implemented_controls", "related_business_objects",
        "people", "joined_directives", "programs", "sections", "clauses"
      ]),
      related_documentation_responses: TypeFilter("related_objects", "DocumentationResponse"),
      related_interview_responses: TypeFilter("related_objects", "InterviewResponse"),
      related_population_sample_responses: TypeFilter("related_objects", "PopulationSampleResponse"),
      related_responses: Multi(["related_documentation_responses", "related_interview_responses", "related_population_sample_responses"]),
      related_audits_via_related_responses: Cross("related_responses", "audit_via_request"),
      audits: Proxy(
        "Audit", "audit", "AuditObject", "auditable", "audit_objects"),
      potential_requests: Cross("audits", "active_requests"),
      open_requests: CustomFilter("potential_requests", function(binding) {
        var audit_object = binding.instance.audit_object && binding.instance.audit_object.reify(),
            control = binding.binding.instance;
        if (!audit_object) {
          return;
        }
        return audit_object.auditable && audit_object.auditable.type === 'Control' && audit_object.auditable.id === control.id;
      }),
      controls: Multi(["implemented_controls", "implementing_controls"]),
      objectives: Proxy(
        "Objective", "objective", "ObjectiveControl", "control", "objective_controls"),
      _sections_base: Proxy(
        null, "section", "ControlSection", "control", "control_sections"),
      sections: TypeFilter("_sections_base", "Section"),
      clauses: TypeFilter("_sections_base", "Clause"),
      implemented_controls: Proxy(
        "Control", "implemented_control", "ControlControl", "control", "control_controls"),
      implementing_controls: Proxy(
          "Control", "control", "ControlControl", "implemented_control", "implementing_control_controls"),
        //  FIXME: Cannot currently represent singular foreign-key references
        //    with Mappers/ListLoaders
        //, direct_directives: ForeignKey("Directive", "directive", "controls")
      joined_directives: Proxy(
        null, "directive", "DirectiveControl", "control", "directive_controls"),
      directives: Multi(["joined_directives"]), // "direct_directives"
      contracts: TypeFilter("directives", "Contract"),
      policies: TypeFilter("directives", "Policy"),
      standards: TypeFilter("directives", "Standard"),
      regulations: TypeFilter("directives", "Regulation"),
      related_objects_as_source: Proxy(
        null, "destination", "Relationship", "source", "related_destinations"),
      related_objects_as_destination: Proxy(
        null, "source", "Relationship", "destination", "related_sources"),
      related_objects_via_relationship: Multi(["related_objects_as_source", "related_objects_as_destination"]),
      related_control_assessments: TypeFilter("related_objects_via_relationship", "ControlAssessment"),
      related_issues: TypeFilter("related_objects_via_relationship", "Issue"),
      programs: TypeFilter("related_objects_via_relationship", "Program"),
      orphaned_objects: Multi([
        "related_objects", "sections", "clauses", "controls", "programs", "objectives", "implemented_controls", "implementing_controls", "joined_directives", "people"
      ])
    },
    Objective: {
      _mixins: ["personable", "ownable"], //objectiveable
      _canonical: {
        "related_objects": ["DataAsset", "Facility", "Market", "OrgGroup", "Vendor", "Process", "Product", "Project", "System",
          "Regulation", "Contract", "Policy", "Standard", "Program", "Issue"
        ],
        "objectives": "Objective",
        "controls": "Control",
        "_sections_base": ["Section", "Clause"]
      },
      related_objects: Proxy(
        null, "objectiveable", "ObjectObjective", "objective", "objective_objects"),
      related_and_able_objects: Multi([
        "controls", "objectives", "related_objects", "people",
        "sections", "clauses"
      ]),
      related_data_assets: TypeFilter("related_objects", "DataAsset"),
      related_facilities: TypeFilter("related_objects", "Facility"),
      related_markets: TypeFilter("related_objects", "Market"),
      related_org_groups: TypeFilter("related_objects", "OrgGroup"),
      related_vendors: TypeFilter("related_objects", "Vendor"),
      related_processes: TypeFilter("related_objects", "Process"),
      related_products: TypeFilter("related_objects", "Product"),
      related_projects: TypeFilter("related_objects", "Project"),
      related_systems: TypeFilter("related_objects", "System"),
      related_issues: TypeFilter("related_objects", "Issue"),
      regulations: TypeFilter("related_objects", "Regulation"),
      contracts: TypeFilter("related_objects", "Contract"),
      policies: TypeFilter("related_objects", "Policy"),
      standards: TypeFilter("related_objects", "Standard"),
      programs: TypeFilter("related_objects", "Program"),
      objectives: Proxy(
        "Objective", "objective", "ObjectObjective", "objectiveable", "object_objectives"),
      controls: Proxy(
        "Control", "control", "ObjectiveControl", "objective", "objective_controls"),
      _sections_base: Proxy(
        null, "section", "SectionObjective", "objective", "section_objectives"),
      sections: TypeFilter("_sections_base", "Section"),
      clauses: TypeFilter("_sections_base", "Clause"),
      orphaned_objects: Multi([
        "related_objects", "clauses", "contracts", "controls", "objectives", "people", "policies", "programs", "regulations", "sections", "standards"
      ])
    },
    section_base: {
      _mixins: ["personable", "ownable"], //sectionable
      _canonical: {
        "related_objects": ["DataAsset", "Facility", "Market", "OrgGroup", "Vendor", "Process", "Product", "Project", "System", "Issue"],
        "objectives": "Objective",
        "controls": "Control"
      },
      related_objects: Proxy(
          null, "sectionable", "ObjectSection", "section", "object_sections"), //section_objects
      related_and_able_objects: Multi([
        "objectives", "controls", "related_objects", "people"
      ]),
      related_data_assets: TypeFilter("related_objects", "DataAsset"),
      related_facilities: TypeFilter("related_objects", "Facility"),
      related_markets: TypeFilter("related_objects", "Market"),
      related_org_groups: TypeFilter("related_objects", "OrgGroup"),
      related_vendors: TypeFilter("related_objects", "Vendor"),
      related_processes: TypeFilter("related_objects", "Process"),
      related_products: TypeFilter("related_objects", "Product"),
      related_projects: TypeFilter("related_objects", "Project"),
      related_systems: TypeFilter("related_objects", "System"),
      related_issues: TypeFilter("related_objects", "Issue"),
        //, sections: Proxy(
        //    "Section", "section", "ObjectSection", "sectionable", "object_sections")
      objectives: Proxy(
        "Objective", "objective", "SectionObjective", "section", "section_objectives"),
      controls: Proxy(
        "Control", "control", "ControlSection", "section", "control_sections"),
      orphaned_objects: Multi([
        "related_objects", "controls", "objectives", "people"
      ])
    },
    Section: {
      _mixins: ["section_base"],
      _canonical: {
        directive: ["Regulation", "Policy", "Standard"]
      },
      directive: Direct("Directive", "sections", "directive")
    },
    Clause: {
      _mixins: ["section_base"],
      _canonical: {
        contracts: "Contract"
      },
      contracts: Proxy(
        "Contract", "directive", "DirectiveSection", "section", "directive_sections")
    },
    controllable: {
      _canonical: {
        "controls": "Control"
      },
      controls: Proxy(
        "Control", "control", "ObjectControl", "controllable", "object_controls")
    },
    objectiveable: {
      _canonical: {
        objectives: "Objective"
      },
      objectives: Proxy(
        "Objective", "objective", "ObjectObjective", "objectiveable", "object_objectives")
    },
    sectionable: {
      _canonical: {
        _sections_base: ["Section", "Clause"]
      },
      _sections_base: Proxy(
        null, "section", "ObjectSection", "sectionable", "object_sections"),
      sections: TypeFilter("_sections_base", "Section"),
      clauses: TypeFilter("_sections_base", "Clause")
    },
    personable: {
      _canonical: {
        "people": "Person"
      },
      people: Proxy(
        "Person", "person", "ObjectPerson", "personable", "object_people")
    },
    ownable: {
      owners: Proxy(
        "Person", "person", "ObjectOwner", "ownable", "object_owners")
    },
    documentable: {
      _canonical: {
        "documents": "Document"
      },
      documents: Proxy(
        "Document", "document", "ObjectDocument", "documentable", "object_documents")
    },
    related_object: {
      _canonical: {
        "related_objects_as_source": [
          "DataAsset", "Facility", "Market", "OrgGroup", "Vendor", "Process", "Product",
          "Project", "System", "Regulation", "Policy", "Contract", "Standard",
          "Program", "Issue", "Control"
        ]
      },
      related_objects_as_source: Proxy(
        null, "destination", "Relationship", "source", "related_destinations"),
      related_objects_as_destination: Proxy(
        null, "source", "Relationship", "destination", "related_sources"),
      related_objects: Multi(["related_objects_as_source", "related_objects_as_destination"]),
      related_data_assets: TypeFilter("related_objects", "DataAsset"),
      related_facilities: TypeFilter("related_objects", "Facility"),
      related_markets: TypeFilter("related_objects", "Market"),
      related_org_groups: TypeFilter("related_objects", "OrgGroup"),
      related_vendors: TypeFilter("related_objects", "Vendor"),
      related_processes: TypeFilter("related_objects", "Process"),
      related_products: TypeFilter("related_objects", "Product"),
      related_projects: TypeFilter("related_objects", "Project"),
      related_systems: TypeFilter("related_objects", "System"),
      related_issues: TypeFilter("related_objects", "Issue"),
      regulations: TypeFilter("related_objects", "Regulation"),
      contracts: TypeFilter("related_objects", "Contract"),
      policies: TypeFilter("related_objects", "Policy"),
      standards: TypeFilter("related_objects", "Standard"),
      programs: TypeFilter("related_objects", "Program"),
      controls: TypeFilter("related_objects", "Control"),
      related_documentation_responses: TypeFilter("related_objects", "DocumentationResponse"),
      related_interview_responses: TypeFilter("related_objects", "InterviewResponse"),
      related_population_sample_responses: TypeFilter("related_objects", "PopulationSampleResponse"),
      related_responses: Multi(["related_documentation_responses", "related_interview_responses", "related_population_sample_responses"]),
      related_requests_via_related_responses: Cross("related_responses", "_request"),
      related_audits_via_related_responses: Cross("related_responses", "audit_via_request")
    },
    // Program
    Program: {
      _mixins: [
        "related_object", "personable", "objectiveable"
      ],
      _canonical: {
        "audits": "Audit",
        "context": "Context"
      },
      related_issues: TypeFilter("related_objects", "Issue"),
      audits: Direct("Audit", "program", "audits"),
      related_people_via_audits: TypeFilter("related_objects_via_audits", "Person"),
      authorizations_via_audits: Cross("audits", "authorizations"),
      context: Direct("Context", "related_object", "context"),
      contexts_via_audits: Cross("audits", "context"),
      program_authorized_people: Cross("context", "authorized_people"),
      program_authorizations: Cross("context", "user_roles"),
      authorization_contexts: Multi(["context", "contexts_via_audits"]),
      authorizations_via_contexts: Cross("authorization_contexts", "user_roles"),
      authorizations: Cross("authorization_contexts", "user_roles"),
      authorized_people: Cross("authorization_contexts", "authorized_people"),
      mapped_and_or_authorized_people: Multi([
        "people", "authorized_people"
      ]),
      owner_authorizations: CustomFilter("program_authorizations", function (auth_binding) {
        return new RefreshQueue().enqueue(auth_binding.instance.role.reify()).trigger().then(function (roles) {
          return roles[0].name === "ProgramOwner";
        });
      }),
      program_owners: Cross("owner_authorizations", "person"),
      owners_via_object_owners: Proxy(
        "Person", "person", "ObjectOwner", "ownable", "object_owners"),
      owners: Multi(["program_owners", "owners_via_object_owners"]),
      orphaned_objects: Multi([
        "related_objects", "people"
      ])
    },
    directive_object: {
      _mixins: [
        "related_object", "personable", "objectiveable", "ownable"
      ],
      _canonical: {
        "sections": "Section",
        "clauses": "Clause",
        "joined_controls": "Control",
      },
      sections: Direct("Section", "directive", "sections"),
      joined_sections: Proxy(
        "Section", "section", "DirectiveSection", "directive", "directive_sections"),
      clauses: Proxy(
          "Clause", "section", "DirectiveSection", "directive", "directive_sections"),
      direct_controls: Direct("Control", "directive", "controls"),
      joined_controls: Proxy(
        "Control", "control", "DirectiveControl", "directive", "directive_controls"),
      controls: Multi(["direct_controls", "joined_controls"]),
      orphaned_objects: Multi([
        "sections", "clauses", "people", "controls", "objectives", "related_objects"
      ])
    },

    // Directives
    Regulation: {
      _mixins: ["directive_object"]
    },
    Contract: {
      _mixins: ["directive_object"]
    },
    Standard: {
      _mixins: ["directive_object"]
    },
    Policy: {
      _mixins: ["directive_object"]
    },

    // Business objects
    business_object: {
      _mixins: [
        "related_object", "personable",
        "controllable", "objectiveable", "sectionable",
        "ownable"
      ],
      orphaned_objects: Multi([
        "related_objects", "people", "controls", "objectives", "sections", "clauses"
      ])
    },
    DataAsset: {
      _mixins: ["business_object"]
    },
    Facility: {
      _mixins: ["business_object"]
    },
    Market: {
      _mixins: ["business_object"]
    },
    OrgGroup: {
      _mixins: ["business_object"]
    },
    Vendor: {
      _mixins: ["business_object"]
    },
    Product: {
      _mixins: ["business_object"]
    },
    Project: {
      _mixins: ["business_object"]
    },
    System: {
      _mixins: ["business_object"]
    },
    Process: {
      _mixins: ["business_object"]
    },
    Person: {
      _canonical: {
        "related_objects": [
          "Program", "Regulation", "Contract", "Policy", "Standard",
          "Objective", "Control", "Section", "Clause", "DataAsset", "Facility", "Market",
          "OrgGroup", "Vendor", "Process", "Product", "Project", "System", "Issue"
        ],
        "authorizations": "UserRole"
      },
      owned_programs: Indirect("Program", "contact"),
      owned_regulations: Indirect("Regulation", "contact"),
      owned_contracts: Indirect("Contract", "contact"),
      owned_policies: Indirect("Policy", "contact"),
      owned_standards: Indirect("Standard", "contact"),
      owned_objectives: Indirect("Objective", "contact"),
      owned_controls: Indirect("Control", "contact"),
      owned_sections: Indirect("Section", "contact"),
      owned_clauses: Indirect("Clause", "contact"),
      owned_data_assets: Indirect("DataAsset", "contact"),
      owned_facilities: Indirect("Facility", "contact"),
      owned_markets: Indirect("Market", "contact"),
      owned_org_groups: Indirect("OrgGroup", "contact"),
      owned_vendors: Indirect("Vendor", "contact"),
      owned_processes: Indirect("Process", "contact"),
      owned_products: Indirect("Product", "contact"),
      owned_projects: Indirect("Project", "contact"),
      owned_systems: Indirect("System", "contact"),
      related_objects: Proxy(
        null, "personable", "ObjectPerson", "person", "object_people"),
      related_programs: TypeFilter("related_objects", "Program"),
      related_regulations: TypeFilter("related_objects", "Regulation"),
      related_contracts: TypeFilter("related_objects", "Contract"),
      related_policies: TypeFilter("related_objects", "Policy"),
      related_standards: TypeFilter("related_objects", "Standard"),
      related_objectives: TypeFilter("related_objects", "Objective"),
      related_controls: TypeFilter("related_objects", "Control"),
      related_sections: TypeFilter("related_objects", "Section"),
      related_clauses: TypeFilter("related_objects", "Clause"),
      related_data_assets: TypeFilter("related_objects", "DataAsset"),
      related_facilities: TypeFilter("related_objects", "Facility"),
      related_markets: TypeFilter("related_objects", "Market"),
      related_org_groups: TypeFilter("related_objects", "OrgGroup"),
      related_vendors: TypeFilter("related_objects", "Vendor"),
      related_processes: TypeFilter("related_objects", "Process"),
      related_products: TypeFilter("related_objects", "Product"),
      related_projects: TypeFilter("related_objects", "Project"),
      related_systems: TypeFilter("related_objects", "System"),
      related_issues: TypeFilter("related_objects", "Issue"),
      authorizations: Direct("UserRole", "person", "user_roles"),
      programs_via_authorizations: Cross("authorizations", "program_via_context"),
      extended_related_programs: Multi(["related_programs", "owned_programs", "programs_via_authorizations"]),
      extended_related_regulations: Multi(["related_regulations", "owned_regulations"]),
      extended_related_contracts: Multi(["related_contracts", "owned_contracts"]),
      extended_related_policies: Multi(["related_policies", "owned_policies"]),
      extended_related_objectives: Multi(["related_objectives", "owned_objectives"]),
      extended_related_controls: Multi(["related_controls", "owned_controls"]),
      extended_related_sections: Multi(["related_sections", "owned_sections"]),
      extended_related_clauses: Multi(["related_clauses", "owned_clauses"]),
      extended_related_data_assets: Multi(["related_data_assets", "owned_data_assets"]),
      extended_related_facilities: Multi(["related_facilities", "owned_facilities"]),
      extended_related_markets: Multi(["related_markets", "owned_markets"]),
      extended_related_org_groups: Multi(["related_org_groups", "owned_org_groups"]),
      extended_related_vendors: Multi(["related_vendors", "owned_vendors"]),
      extended_related_processes: Multi(["related_processes", "owned_processes"]),
      extended_related_products: Multi(["related_products", "owned_products"]),
      extended_related_projects: Multi(["related_projects", "owned_projects"]),
      extended_related_systems: Multi(["related_systems", "owned_systems"]),
      related_objects_via_search: Search(function (binding) {
        var types = [
          "Program", "Regulation", "Contract", "Policy", "Standard",
          "Section", "Clause", "Objective", "Control",
          "System", "Process", "DataAsset", "Product", "Project", "Facility",
          "Market", "OrgGroup", "Vendor", "Audit" //, "Request", "Response"
        ];

        return GGRC.Models.Search.search_for_types(
          "", types, {
            contact_id: binding.instance.id
          }
        ).pipe(function (mappings) {
          return mappings.entries;
        });
      }, "Program,Regulation,Contract,Policy,Standard,Section,Clause,Objective,Control,System,Process,DataAsset,Product,Project,Facility,Market,OrgGroup,Vendor,Audit"),
      extended_related_programs_via_search: TypeFilter("related_objects_via_search", "Program"),
      extended_related_regulations_via_search: TypeFilter("related_objects_via_search", "Regulation"),
      extended_related_contracts_via_search: TypeFilter("related_objects_via_search", "Contract"),
      extended_related_policies_via_search: TypeFilter("related_objects_via_search", "Policy"),
      extended_related_standards_via_search: TypeFilter("related_objects_via_search", "Standard"),
      extended_related_objectives_via_search: TypeFilter("related_objects_via_search", "Objective"),
      extended_related_controls_via_search: TypeFilter("related_objects_via_search", "Control"),
      extended_related_sections_via_search: TypeFilter("related_objects_via_search", "Section"),
      extended_related_clauses_via_search: TypeFilter("related_objects_via_search", "Clause"),
      extended_related_data_assets_via_search: TypeFilter("related_objects_via_search", "DataAsset"),
      extended_related_facilities_via_search: TypeFilter("related_objects_via_search", "Facility"),
      extended_related_markets_via_search: TypeFilter("related_objects_via_search", "Market"),
      extended_related_org_groups_via_search: TypeFilter("related_objects_via_search", "OrgGroup"),
      extended_related_vendors_via_search: TypeFilter("related_objects_via_search", "Vendor"),
      extended_related_processes_via_search: TypeFilter("related_objects_via_search", "Process"),
      extended_related_products_via_search: TypeFilter("related_objects_via_search", "Product"),
      extended_related_projects_via_search: TypeFilter("related_objects_via_search", "Project"),
      extended_related_systems_via_search: TypeFilter("related_objects_via_search", "System"),
      extended_related_audits_via_search: TypeFilter("related_objects_via_search", "Audit"),
      audit_requests: Search(function (binding) {
        return CMS.Models.Request.findAll({
          'assignee_id': binding.instance.id
        });
      }, 'Request'),
      open_audit_requests: CustomFilter('audit_requests', function (result) {
        return result.instance.status !== 'Accepted';
      })
    },
    Context: {
      _canonical: {
        "user_roles": "UserRole",
        "authorized_people": "Person"
      },
      user_roles: Direct("UserRole", "context", "user_roles"),
      authorized_people: Proxy("Person", "person", "UserRole", "context", "user_roles")
    },
    UserRole: {
      // FIXME: These should not need to be `Indirect` --
      //   `context.related_object` *should* point to the right object.
      program_via_context: Indirect("Program", "context"),
      audit_via_context: Indirect("Audit", "context"),
      person: Direct("Person", "user_roles", "person"),
      role: Direct("Role", "user_roles", "role")
    },
    Audit: {
      _canonical: {
        "requests": "Request",
        "_program": "Program",
        "context": "Context",
        "related_objects_as_source": ["ControlAssessment", "Issue"]
      },
      requests: Direct("Request", "audit", "requests"),
      active_requests: CustomFilter('requests', function (result) {
        return result.instance.status !== 'Accepted';
      }),
      history: CustomFilter('requests', function (result) {
        return result.instance.status === 'Accepted';
      }),
      _program: Direct("Program", "audits", "program"),
      program_controls: Cross("_program", "controls"),
      objects: Proxy(null, "auditable", "AuditObject", "audit", "audit_objects"),
      objectives: TypeFilter("objects", "Objective"),
      objectives_via_program: Cross("_program", "objectives"),
      responses_via_requests: Cross("requests", "responses"),
      related_objects: Multi(['requests', 'responses_via_requests']),
      context: Direct("Context", "related_object", "context"),
      authorizations: Cross("context", "user_roles"),
      authorized_program_people: Cross("_program", 'authorized_people'),
      authorized_audit_people: Cross("authorizations", "person"),
      authorized_people: Multi(['authorized_audit_people', 'authorized_program_people']),
      auditor_authorizations: CustomFilter("authorizations", function (result) {
        return new RefreshQueue().enqueue(result.instance.role.reify()).trigger().then(function (roles) {
          return roles[0].name === "Auditor";
        });
      }),
      auditors: Cross("auditor_authorizations", "person"),
      related_owned_objects: CustomFilter("related_objects", function (result) {
        var person = GGRC.page_instance() instanceof CMS.Models.Person && GGRC.page_instance();
        return !person || (result.instance.attr("contact") && result.instance.contact.id === person.id) || (result.instance.attr("assignee") && result.instance.assignee.id === person.id) || (result.instance.attr("requestor") && result.instance.requestor.id === person.id);
      }),
      related_owned_requests: TypeFilter("related_owned_objects", "Request"),
      related_owned_documentation_responses: TypeFilter("related_owned_objects", "DocumentationResponse"),
      related_owned_interview_responses: TypeFilter("related_owned_objects", "InterviewResponse"),
      related_owned_population_sample_responses: TypeFilter("related_owned_objects", "PopulationSampleResponse"),
      related_owned_responses: Multi(["related_owned_documentation_responses", "related_owned_interview_responses", "related_owned_population_sample_responses"]),
      related_mapped_objects: CustomFilter("related_objects", function (result) {
        var page_instance = GGRC.page_instance(),
          instance = result.instance,
          is_mapped = function (responses) {
            var i, j, response, relationships, relationship;
            for (i = 0; response = responses[i]; i++) {
              //  FIXME: This avoids script errors due to stubs, but causes
              //    incorrect results.  `CustomFilter.filter_fn` should be
              //    refactored to return a deferred, and then this function
              //    should be cleaned up.
              if (!('related_sources' in response)) continue;
              relationships = new can.Observe.List().concat(response.related_sources.reify(), response.related_destinations.reify());
              for (j = 0; relationship = relationships[j]; j++) {
                if (relationship.source && relationship.source.reify && relationship.source.reify() === page_instance || relationship.destination && relationship.destination.reify() === page_instance) {
                  return true;
                }
              }
            }
            return false;
          };

        if (instance instanceof CMS.Models.Request && instance.responses)
          return is_mapped(instance.responses.reify());
        else if (instance instanceof CMS.Models.Response)
          return is_mapped([instance]);
        else
          return false;
      }),
      related_mapped_requests: TypeFilter("related_mapped_objects", "Request"),
      related_mapped_documentation_responses: TypeFilter("related_mapped_objects", "DocumentationResponse"),
      related_mapped_interview_responses: TypeFilter("related_mapped_objects", "InterviewResponse"),
      related_mapped_population_sample_responses: TypeFilter("related_mapped_objects", "PopulationSampleResponse"),
      related_mapped_responses: Multi(["related_mapped_documentation_responses", "related_mapped_interview_responses", "related_mapped_population_sample_responses"]),
      extended_related_objects: Cross("requests", "extended_related_objects"),
      related_objects_as_source: Proxy(
        null, "destination", "Relationship", "source", "related_destinations"),
      related_objects_as_destination: Proxy(
        null, "source", "Relationship", "destination", "related_sources"),
      related_objects_via_relationship: Multi(["related_objects_as_source", "related_objects_as_destination"]),
      related_control_assessments: TypeFilter("related_objects_via_relationship", "ControlAssessment"),
      related_issues: TypeFilter("related_objects_via_relationship", "Issue")
    },
    ControlAssessment: {
      _mixins: [
        "related_object", "personable", "ownable"
      ],
      _canonical: {
        "control": "Control",
        "related_objects": [
          "Section", "Clause", "Audit"
        ],
      },
      control: Direct("Control", "controls", "control_assessment"),
      related_audits: TypeFilter("related_objects", "Audit"),
      related_controls: TypeFilter("related_objects", "Control"),
      related_sections: TypeFilter("related_objects", "Section"),
      related_clauses: TypeFilter("related_objects", "Clause")
    },
    Issue: {
      _mixins: [
        "related_object", "personable", "ownable", "objectiveable"
      ],
      _canonical: {
        "related_objects_as_source": [
          "Program", "ControlAssessment", "Audit", "Control",
          "DataAsset", "Facility", "OrgGroup", "Market"
        ],
      },
      related_audits: TypeFilter("related_objects", "Audit"),
      related_controls: TypeFilter("related_objects", "Control"),
      related_control_assessments: TypeFilter("related_objects", "ControlAssessment")
    },
    Request: {
      _canonical: {
        "responses": ["DocumentationResponse", "InterviewResponse", "PopulationSampleResponse"],
        "_audit": "Audit"
      },
      responses: Direct("Response", "request", "responses"),
      _audit: Direct("Audit", "requests", "audit"),
      _audit_object: Direct("AuditObject", "auditable", "audit_object"),
      audit_object_object: Cross("_audit_object", "_auditable"),
      audit_objects_via_audit: Cross("_audit", "objects"),
      objectives_via_audit: Cross("_audit", "objectives"),
      _objective: TypeFilter("audit_object_object", "Objective"),
      documentation_responses: TypeFilter("responses", "DocumentationResponse"),
      interview_responses: TypeFilter("responses", "InterviewResponse"),
      population_sample_responses: TypeFilter("responses", "PopulationSampleResponse"),
      related_objects_via_responses: Cross("responses", "business_objects"),
      extended_related_objects: Multi(["related_objects_via_responses"]),
      orphaned_objects: Multi(["responses"])
        //, responses : Multi(["documentation_responses", "interview_responses", "population_sample_responses"])
    },
    response: {
      _mixins: ["business_object", "documentable"],
      _request: Direct("Request", "responses", "request"),
      audit_via_request: Cross("_request", "_audit")
    },
    Response: {
      _mixins: ["response"]
    },
    DocumentationResponse: {
      _mixins: ["response"],
      business_objects: Multi(["related_objects", "controls", "objectives", "people", "sections", "clauses"])
    },
    InterviewResponse: {
      _canonical: {
        "meetings": "Meeting"
      },
      _mixins: ["response"],
      meetings: Direct("Meeting", "response", "meetings"),
      business_objects: Multi(["related_objects", "controls", "documents", "sections", "clauses"])
    },
    PopulationSampleResponse: {
      _canonical: {
        "population_samples": "PopulationSample"
      },
      _mixins: ["response"],
      business_objects: Multi(["related_objects", "controls", "people", "documents", "sections", "clauses"]),
      population_samples: Direct("PopulationSample", "response", "population_samples")
    },
    Meeting: {
      _mixins: ["personable"]
    },
    MultitypeSearch: {
      _mixins: ['directive_object'],
      _canonical: {
        'audits': 'Audit',
        'workflows': 'Workflow'
      },
      audits: Proxy(
        "Audit", "audit", "MultitypeSearchJoin"),
      workflows: Proxy(
        "Workflow", "workflow", "MultitypeSearchJoin"),
      sections: Proxy(
        "Section", "section", "MultitypeSearchJoin"),
    },
    AuditObject: {
      _auditable: Direct(null, null, "auditable")
    },
    // Used by Custom Attributes widget
    CustomAttributable: {
      custom_attribute_definitions: Search(function (binding) {
        return CMS.Models.CustomAttributeDefinition.findAll({
          definition_type: binding.instance.root_object
        });
      }, 'CustomAttributeDefinition')
    }
  });
})(GGRC, can);
