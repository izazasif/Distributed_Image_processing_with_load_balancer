from .database import get_database
from ..models import Message
from typing import List, Optional

class MessageCRUD:
    def __init__(self):
        self.db = get_database()
        self.collection = self.db.message
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

    async def create_message(self, message: Message) -> Message:
        # Get next ID
        next_id = await self._get_next_sequence("message_id")
        
        
        # Create message with integer ID
        message_dict = message.dict(exclude={'id'}, by_alias=True)  # Remove the None id
        message_dict["_id"] = next_id  # MongoDB will use this as _id
        
        await self.collection.insert_one(message_dict)
        
        # Return the created message with the new ID
        created_message = message_dict.copy()
        created_message["_id"] = next_id
        return Message(**created_message)

    async def get_message(self, message_id: int) -> Optional[Message]:
        message_dict = await self.collection.find_one({"_id": message_id})
        return Message(**message_dict) if message_dict else None

    async def get_all_messages(self) -> List[Message]:
        messages_dict = await self.collection.find().sort("timestamp", 1).to_list(length=1000)
        return [Message(**msg) for msg in messages_dict]

    # async def get_messages_by_user(self, user_id: int) -> List[Message]:
    #     messages_dict = await self.collection.find({"user_id": user_id}).sort("timestamp", -1).to_list(length=1000)
    #     return [Message(**msg) for msg in messages_dict]

    async def get_messages_by_user(self, user_id: int) -> List[Message]:
        msgs = await self.collection.find({"user_id": user_id}) \
            .sort("timestamp", 1) \
            .to_list(length=1000)

        user_msgs = [m for m in msgs if not m.get("is_bot")]
        bot_msgs  = [m for m in msgs if m.get("is_bot")]

        ordered = []
        for i, u in enumerate(user_msgs):
            ordered.append(u)
            if i < len(bot_msgs):
                ordered.append(bot_msgs[i])

        return [Message(**m) for m in ordered]

    async def update_message(self, message_id: int, update_data: dict) -> Optional[Message]:
        await self.collection.update_one(
            {"_id": message_id}, 
            {"$set": update_data}
        )
        updated_message_dict = await self.collection.find_one({"_id": message_id})
        return Message(**updated_message_dict) if updated_message_dict else None

    async def delete_message(self, message_id: int) -> bool:
        result = await self.collection.delete_one({"_id": message_id})
        return result.deleted_count > 0