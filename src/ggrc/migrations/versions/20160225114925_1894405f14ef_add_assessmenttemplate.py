# Copyright (C) 2016 Google Inc., authors, and contributors <see AUTHORS file>
# Licensed under http://www.apache.org/licenses/LICENSE-2.0 <see LICENSE file>
# Created By: peter@reciprocitylabs.com
# Maintained By: peter@reciprocitylabs.com

"""Add AssessmentTemplate

Revision ID: 1894405f14ef
Revises: 4e989ef86619
Create Date: 2016-02-25 11:49:25.128231

"""

# pylint: disable=invalid-name

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision = '1894405f14ef'
down_revision = '4e989ef86619'


def upgrade():
  """Upgrade database schema to a new revision."""
  op.create_table(
      'assessment_templates',
      sa.Column('id', sa.Integer(), nullable=False),
      sa.Column('audit_id', sa.Integer(), nullable=True),
      sa.Column('template_object_type', sa.String(length=250), nullable=False),
      sa.Column('test_plan_procedure', sa.Boolean(), nullable=False),
      sa.Column('description', sa.Text(), nullable=True),
      sa.Column('default_people', sa.Text(), nullable=True),
      sa.ForeignKeyConstraint(['audit_id'], ['audits.id'], ),
      sa.PrimaryKeyConstraint('id')
  )


def downgrade():
  """Downgrade the database schema to the previous revision."""
  op.drop_table('assessment_templates')
