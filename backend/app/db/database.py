from motor.motor_asyncio import AsyncIOMotorClient
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # ✅ read from env, with defaults
    mongodb_url: str = Field(default="mongodb://localhost:27017", alias="MONGODB_URL")
    database_name: str = Field(default="email_analyzer", alias="DATABASE_NAME")

    # ✅ add OpenAI key field so extra var won't crash
    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")

    # ✅ pydantic v2 config
    model_config = SettingsConfigDict(env_file=".env", extra="forbid")

settings = Settings()

class MongoDB:
    client: AsyncIOMotorClient | None = None
    database = None

mongodb = MongoDB()

async def connect_to_mongo():
    mongodb.client = AsyncIOMotorClient(settings.mongodb_url)
    mongodb.database = mongodb.client[settings.database_name]
    print("Connected to MongoDB")

async def close_mongo_connection():
    if mongodb.client:
        mongodb.client.close()
    print("Disconnected from MongoDB")

def get_database():
    return mongodb.database
