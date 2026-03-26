from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class Message(BaseModel):
    id: Optional[int] = Field(default=None, alias="_id")
    user_id: int
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_bot: bool = False
    is_email: bool = False
    is_response: bool = False
    
    class Config:
        populate_by_name = True
        
class User(BaseModel):
    id: Optional[int] = Field(default=None, alias="_id")
    email: str
    username: str
    password: str
    name: str
    
    class Config:
        populate_by_name = True

class LoginRequest(BaseModel):
    email: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"    
