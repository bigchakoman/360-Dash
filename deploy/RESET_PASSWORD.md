# Reset Admin Password

Use this when the client is locked out or needs their password reset.

## On the VPS (production)

SSH into the server, then run:

```bash
cd /opt/360dash/repo/backend

/opt/360dash/.venv/bin/python -c "
from app.db import SessionLocal
from app.models import AdminUser
from app.auth import hash_password
db = SessionLocal()
u = db.query(AdminUser).first()
u.password_hash = hash_password('new-temp-password')
u.must_change_password = True
db.commit()
print('Done — tell the client to log in with: new-temp-password')
"
```

After running this, give the client the temporary password.
They will be forced to set their own new password on next login.

## Locally (dev / SQLite)

Same script, just run from the `backend/` folder using the local venv:

```bash
cd backend

.venv/Scripts/python -c "
from app.db import SessionLocal
from app.models import AdminUser
from app.auth import hash_password
db = SessionLocal()
u = db.query(AdminUser).first()
u.password_hash = hash_password('new-temp-password')
u.must_change_password = True
db.commit()
print('Done')
"
```

## Notes

- Replace `new-temp-password` with any password you choose (min 8 characters).
- `must_change_password = True` means the client must set a new password before
  they can access the dashboard — they cannot skip this step.
- All event, crew, and equipment data is untouched by this operation.
