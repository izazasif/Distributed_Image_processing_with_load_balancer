from .database import get_database
from ..models import User
from typing import List, Optional

class UserCRUD:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.user
        self.counter_collection = self.db.counters

    async def _get_next_sequence(self, sequence_name: str) -> int:
        """Get the next auto-increment ID"""
        counter = await self.counter_collection.find_one_and_update(
            {"_id": sequence_name},
            {"$inc": {"sequence_value": 1}},
            upsert=True,
            return_document=True
        )
        return counter["sequence_value"]

    async def create_user(self, user: User) -> User:
        # Check if email already exists
        existing_user = await self.collection.find_one({"email": user.email})
        if existing_user:
            raise ValueError("User with this email already exists")
        
        # Check if username already exists
        existing_user = await self.collection.find_one({"username": user.username})
        if existing_user:
            raise ValueError("User with this username already exists")

        # Get next ID
        next_id = await self._get_next_sequence("user_id")
        
        # Create user with integer ID
        user_dict = user.dict(exclude={'id'}, by_alias=True)
        user_dict["_id"] = next_id
        
        await self.collection.insert_one(user_dict)
        
        # Return the created user with the new ID
        created_user = user_dict.copy()
        created_user["_id"] = next_id
        return User(**created_user)

    async def get_user(self, user_id: int) -> Optional[User]:
        user_dict = await self.collection.find_one({"_id": user_id})
        return User(**user_dict) if user_dict else None

    async def get_user_by_email(self, email: str) -> Optional[User]:
        user_dict = await self.collection.find_one({"email": email})
        return User(**user_dict) if user_dict else None
    
    async def get_user_by_username(self, username: str) -> Optional[User]:
        user_dict = await self.collection.find_one({"username": username})
        return User(**user_dict) if user_dict else None

    async def get_all_users(self) -> List[User]:
        users_dict = await self.collection.find().to_list(length=1000)
        return [User(**user) for user in users_dict]

    async def update_user(self, user_id: int, update_data: dict) -> Optional[User]:
        # Don't allow updating _id
        if '_id' in update_data:
            del update_data['_id']
            
        await self.collection.update_one(
            {"_id": user_id}, 
            {"$set": update_data}
        )
        updated_user_dict = await self.collection.find_one({"_id": user_id})
        return User(**updated_user_dict) if updated_user_dict else None

    async def delete_user(self, user_id: int) -> bool:
        result = await self.collection.delete_one({"_id": user_id})
        return result.deleted_count > 0

    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        user_dict = await self.collection.find_one({"email": email, "password": password})
        return User(**user_dict) if user_dict else None