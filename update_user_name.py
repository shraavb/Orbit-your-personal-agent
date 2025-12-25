#!/usr/bin/env python3
"""Update default user name to Shraav for local testing."""

import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent))

from backend.models.db import SessionLocal
from backend.models.database import User


def main():
    """Update user name to Shraav."""
    db = SessionLocal()

    try:
        # Get the first (and only) user
        user = db.query(User).first()

        if not user:
            print("No user found in database. Will be created as 'Shraav' on next API call.")
            return

        old_name = user.name

        # Update to Shraav if it's different
        if old_name != "Shraav":
            user.name = "Shraav"
            db.commit()
            print(f"✅ Updated user name: '{old_name}' → 'Shraav'")
        else:
            print(f"✅ User name is already 'Shraav'")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
