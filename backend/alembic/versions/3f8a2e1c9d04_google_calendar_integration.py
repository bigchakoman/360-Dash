"""google calendar integration

Revision ID: 3f8a2e1c9d04
Revises: 0e65ba81fcf9
Create Date: 2026-04-25 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '3f8a2e1c9d04'
down_revision: Union[str, None] = '0e65ba81fcf9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # crew_member: drop phone, add email
    with op.batch_alter_table('crew_member') as batch_op:
        batch_op.add_column(sa.Column('email', sa.String(255), nullable=True))
        batch_op.drop_column('phone')

    # event: add google_calendar_event_id
    with op.batch_alter_table('event') as batch_op:
        batch_op.add_column(sa.Column('google_calendar_event_id', sa.String(255), nullable=True))

    # event_crew: rename notification columns to calendar equivalents
    with op.batch_alter_table('event_crew') as batch_op:
        batch_op.alter_column('notified_at', new_column_name='invited_at')
        batch_op.alter_column('notification_sid', new_column_name='cal_invite_status')
        batch_op.alter_column('notification_error', new_column_name='calendar_error')

    # google_oauth: stores owner's OAuth tokens (single row)
    op.create_table(
        'google_oauth',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('access_token', sa.Text(), nullable=False),
        sa.Column('refresh_token', sa.Text(), nullable=False),
        sa.Column('token_expiry', sa.DateTime(), nullable=True),
        sa.Column('calendar_id', sa.String(255), nullable=False, server_default='primary'),
        sa.Column('owner_email', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )


def downgrade() -> None:
    op.drop_table('google_oauth')

    with op.batch_alter_table('event_crew') as batch_op:
        batch_op.alter_column('invited_at', new_column_name='notified_at')
        batch_op.alter_column('cal_invite_status', new_column_name='notification_sid')
        batch_op.alter_column('calendar_error', new_column_name='notification_error')

    with op.batch_alter_table('event') as batch_op:
        batch_op.drop_column('google_calendar_event_id')

    with op.batch_alter_table('crew_member') as batch_op:
        batch_op.add_column(sa.Column('phone', sa.String(32), nullable=True))
        batch_op.drop_column('email')
