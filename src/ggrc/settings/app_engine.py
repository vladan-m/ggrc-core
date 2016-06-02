# Copyright (C) 2013 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: dan@reciprocitylabs.com
# Maintained By: dan@reciprocitylabs.com

APP_ENGINE = True
ENABLE_JASMINE = False
LOGIN_MANAGER = 'ggrc.login.appengine'
FULLTEXT_INDEXER = 'ggrc.fulltext.mysql.MysqlIndexer'
# Cannot access filesystem on AppEngine or when using SDK
AUTOBUILD_ASSETS = False
SQLALCHEMY_RECORD_QUERIES = False
MEMCACHE_MECHANISM = True
CALENDAR_MECHANISM = False
BACKGROUND_COLLECTION_POST_SLEEP = 2.5  # seconds
