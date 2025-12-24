"""Script to view and update the user name in the database."""

from backend.models.db import get_db
from backend.models.database import User

def main():
    db = next(get_db())

    # Get the first (and only) user
    user = db.query(User).first()

    if user:
        print(f"Current user name: {user.name}")
        print(f"Current user ID: {user.id}")

        # Uncomment below to change the name
        # new_name = "Your Name Here"
        # user.name = new_name
        # db.commit()
        # print(f"Updated user name to: {new_name}")
    else:
        print("No user found in database")
        print("Creating default user...")
        new_user = User(name="User")
        db.add(new_user)
        db.commit()
        print(f"Created user with name: User")

if __name__ == "__main__":
    main()
