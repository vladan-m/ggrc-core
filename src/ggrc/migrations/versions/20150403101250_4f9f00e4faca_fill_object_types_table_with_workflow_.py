
"""fill object types table with workflow models

Revision ID: 4f9f00e4faca
Revises: 57cc398ad417
Create Date: 2015-04-03 10:12:50.583661

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import table, column

# revision identifiers, used by Alembic.
revision = '4f9f00e4faca'
down_revision = '57cc398ad417'


def upgrade():
  object_types_table = table(
      'object_types',
      column('id', sa.Integer),
      column('name', sa.String),
      column('description', sa.Text),
  )

  op.bulk_insert(
      object_types_table,
      [
          {"name": "Workflow", "description": ""},
          {"name": "TaskGroup", "description": ""},
          {"name": "TaskGroupTask", "description": ""},
          {"name": "TaskGroupObject", "description": ""},
          {"name": "Cycle", "description": ""},
          {"name": "CycleTaskGroup", "description": ""},
          {"name": "CycleTaskGroupObject", "description": ""},
          {"name": "CycleTaskGroupObjectTask", "description": ""},
      ]
  )


def downgrade():
  pass
