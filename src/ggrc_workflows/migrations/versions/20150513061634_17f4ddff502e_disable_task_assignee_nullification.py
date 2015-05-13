
"""Disable task assignee nullification

Revision ID: 17f4ddff502e
Revises: 2b89912f95f1
Create Date: 2015-05-13 06:16:34.895339

"""

# revision identifiers, used by Alembic.
revision = '17f4ddff502e'
down_revision = '2b89912f95f1'

from alembic import op
import sqlalchemy as sa

tables = ["cycle_task_group_object_tasks", "cycle_task_group_objects",
          "cycle_task_groups", "task_group_tasks", "task_groups"]

def upgrade():
    for table in tables:
        op.execute("""
        UPDATE %s
        SET contact_id=(
           SELECT person_id FROM user_roles
           WHERE role_id=(SELECT id FROM roles
                          WHERE name="gGRC Admin")
           ORDER BY created_at  ASC
           LIMIT 1
        )
        WHERE contact_id IS NULL;
        """ % table)

        op.execute("""
        ALTER TABLE %s MODIFY contact_id int(11) NOT NULL
        """ % table)


def downgrade():
    for table in tables:
        op.execute("""
        ALTER TABLE %s MODIFY contact_id int(11);
        """ % table)
