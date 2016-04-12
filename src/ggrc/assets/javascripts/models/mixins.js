/*!
    Copyright (C) 2014 Google Inc., authors, and contributors <see AUTHORS file>
    Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
    Created By: brad@reciprocitylabs.com
    Maintained By: brad@reciprocitylabs.com
*/

(function (can) {
  can.Construct('can.Model.Mixin', {
    extend: function (fullName, klass, proto) {
      var tempname;
      var parts;
      var shortName;
      var Constructor;

      if (typeof fullName === "string") {
        // Mixins do not go into the global namespace.
        tempname = fullName;
        fullName = '';
      }
      Constructor = this._super(fullName, klass, proto);

      // instead mixins sit under CMS.Models.Mixins
      if (tempname) {
        parts = tempname.split('.');
        shortName = parts.pop();
        Constructor.fullName = tempname;
      } else {
        Constructor.fullName = shortName =
          'Mixin_' + Math.floor(Math.random() * Math.pow(36, 8)).toString(36);
        parts = [];
      }
      can.getObject('CMS.Models.Mixins' + (parts.length ? '.' + parts.join('.') : ''), window, true)[shortName] = Constructor;
      return Constructor;
    },
    newInstance: function () {
      throw 'Mixins cannot be directly instantiated';
    },
    add_to: function (cls) {
      var setupfns;
      if (this === can.Model.Mixin) {
        throw 'Must only add a subclass of Mixin to an object, not Mixin itself';
      }
      setupfns = function (obj) {
        return function (fn, key) {
          var blockedKeys = ['fullName', 'defaults', '_super', 'constructor'];
          var aspect = ~key.indexOf(':') ? key.substr(0, key.indexOf(':')) : 'after';
          var oldfn;

          key = ~key.indexOf(':') ? key.substr(key.indexOf(':') + 1) : key;
          if (fn !== can.Model.Mixin[key] && !~can.inArray(key, blockedKeys)) {
            oldfn = obj[key];
            // TODO support other ways of adding functions.
            //  E.g. "override" (doesn't call super fn at all)
            //       "sub" (sets this._super for mixin function)
            //       "chain" (pushes result of oldfn onto args)
            //       "before"/"after" (overridden function)
            // TODO support extension for objects.
            //   Necessary for "attributes"/"serialize"/"convert"
            // Defaults will always be "after" for functions
            //  and "override" for non-function values
            if (oldfn && typeof oldfn === 'function') {
              switch (aspect) {
                case 'before':
                  obj[key] = function () {
                    fn.apply(this, arguments);
                    return oldfn.apply(this, arguments);
                  };
                  break;
                case 'after':
                  obj[key] = function () {
                    oldfn.apply(this, arguments);
                    return fn.apply(this, arguments);
                  };
                  break;
                default:
                  break;
              }
            } else if (aspect === 'extend') {
              obj[key] = $.extend(obj[key], fn);
            } else {
              obj[key] = fn;
            }
          }
        };
      };
      if (!~can.inArray(this.fullName, cls._mixins)) {
        cls._mixins = cls._mixins || [];
        cls._mixins.push(this.fullName);

        can.each(this, setupfns(cls));
        can.each(this.prototype, setupfns(cls.prototype));
      }
    }
  }, {
  });

  can.Model.Mixin('ownable', {
    'after:init': function () {
      if (!this.owners) {
        this.attr('owners', []);
      }
    }
  });

  can.Model.Mixin('contactable', {
    // NB : Because the attributes object
    //  isn't automatically cloned into subclasses by CanJS (this is an intentional
    //  exception), when subclassing a class that uses this mixin, be sure to pull in the
    //  parent class's attributes using `can.extend(this.attributes, <parent_class>.attributes);`
    //  in the child class's static init function.
    'extend:attributes': {
      contact: 'CMS.Models.Person.stub',
      secondary_contact: 'CMS.Models.Person.stub'
    }
  }, {
    before_create: function () {
      if (!this.contact) {
        this.attr('contact', {
          id: GGRC.current_user.id,
          type: 'Person'
        });
      }
    },
    form_preload: function (newObjectForm) {
      if (newObjectForm && !this.contact) {
        this.attr('contact', {
          id: GGRC.current_user.id, type: 'Person'
        });
      }
    }
  });

  can.Model.Mixin('unique_title', {
    'after:init': function () {
      this.validate(['title', '_transient:title'], function (newVal, prop) {
        if (prop === 'title') {
          return this.attr('_transient:title');
        } else if (prop === '_transient:title') {
          return newVal; // the title error is the error
        }
      });
    }
  }, {
    save_error: function (val) {
      if (/title values must be unique\.$/.test(val)) {
        this.attr('_transient:title', val);
      }
    },
    after_save: function () {
      this.removeAttr('_transient:title');
    },
    'before:attr': function (key, val) {
      if (key === 'title' && arguments.length > 1) {
        this.attr('_transient:title', null);
      }
    }
  });

  can.Model.Mixin('relatable', {
  }, {
    related_self: function () {
      var model = CMS.Models[this.type];
      return this._related(
        model.relatable_options.relevantTypes,
        model.relatable_options.threshold
      );
    },
    /**
     * Return objects of single type above threshold that are
     * mapped to specified mapped objects.
     *
     * @param {Object} relevantTypes - object with specified first degree
     *   binding (objectBinding), second degree binding (relatableBinding) and
     *   weights that individual second degree bindings are carrying.
     *
     *   relevantTypes = {
     *     @ObjectType: {
     *       objectBinding: @first-degree-mapping,
     *       relatableBinding: @second-degree-mapping,
     *       weight: @weight-of-objects
     *     },
     *     Audit: {
     *       objectBinding: 'audits',
     *       relatableBinding: 'program_requests',
     *       weight: 5
     *     },
     *     Regulation: {
     *       objectBinding: 'related_regulations',
     *       relatableBinding: 'related_requests',
     *       weight: 3
     *     }, ...
     *   }
     * @param {Number} threshold - minimum weight required to render related
     *   object
     *
     */
    _related: function (relevantTypes, threshold) {
      var that = this;
      var relatable = $.Deferred();
      var connectionsCount = {};
      var relatedObjectsDeferreds = [];
      var mappedObjectDeferreds = _.map(relevantTypes, function (rtype) {
        return this.get_binding(rtype.objectBinding).refresh_instances();
      }.bind(this));

      $.when.apply($, mappedObjectDeferreds).done(function () {
        _.each(_.toArray(arguments), function (mappedObjectInstances) {
          if (!mappedObjectInstances.length) {
            return;
          }
          relatedObjectsDeferreds = relatedObjectsDeferreds.concat(
            _.map(mappedObjectInstances, function (mappedObj) {
              var insttype = mappedObj.instance.type;
              var binding = relevantTypes[insttype].relatableBinding;
              return mappedObj.instance.get_binding(
                binding).refresh_instances();
            }));
        });
        $.when.apply($, relatedObjectsDeferreds).done(function () {
          _.each(_.toArray(arguments), function (relatedObjects) {
            _.each(relatedObjects, function (relObj) {
              var type = relObj.binding.instance.type;
              var weight = relevantTypes[type].weight;
              if (relObj.instance.id !== that.id) {
                if (connectionsCount[relObj.instance.id] === undefined) {
                  connectionsCount[relObj.instance.id] = {
                    count: weight,
                    object: relObj
                  };
                } else {
                  connectionsCount[relObj.instance.id].count += weight;
                }
              }
            });
          });
          relatable.resolve(
            _.map(_.sortBy(_.filter(connectionsCount, function (item) {
                if (item.count >= threshold) {
                  return item;
                }
              }), 'count').reverse(),
              function (item) {
                return item.object;
              }));
        });
      });
      return relatable;
    }
  });
})(this.can);
