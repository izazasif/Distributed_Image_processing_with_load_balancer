from fastapi import FastAPI, HTTPException
from datetime import datetime, timedelta
from typing import List
from fastapi.middleware.cors import CORSMiddleware
from fastapi.params import Depends
from .db.MessageCRUD import MessageCRUD
from .db.UserCRUD import UserCRUD
from .db.database import close_mongo_connection, connect_to_mongo, settings
from .models import Message, User, LoginRequest, TokenResponse
import re
import os
from jose import jwt, JWTError
import socket 


request_count = 0
hostname = socket.gethostname() 
# Create FastAPI instance
app = FastAPI(title="My API", version="1.0.0")



def clean_text(text):
    text = str(text).lower()  # lowercase
    text = re.sub(r'[^a-zA-Z0-9\s]', '', text)  # remove punctuation
    text = re.sub(r'\s+', ' ', text).strip()  # remove extra spaces
    return text 

# JWT config (put in .env in real project)
SECRET_KEY = "CHANGE_ME_TO_LONG_RANDOM_SECRET"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60

def create_access_token(sub: str):
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": sub, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Database events
@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()
    
# Dependency injection
def get_message_crud():
    return MessageCRUD()

def get_user_crud():
    return UserCRUD()

@app.get("/")
def read_root():
    return {"message": "Welcome to My API"}
@app.get("/api/whoami")
def whoami():
    global request_count
    request_count += 1

    return {
        "container": hostname,
        "requests_handled": request_count
    }
# Message Routes
@app.get("/api/messages", response_model=List[Message])
async def get_messages(crud: MessageCRUD = Depends(get_message_crud)):
    try:
        messages = await crud.get_all_messages()
        return messages
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching messages: {str(e)}")

@app.get("/api/messages/{message_id}", response_model=Message)
async def get_message(message_id: int, crud: MessageCRUD = Depends(get_message_crud)):
    message = await crud.get_message(message_id)
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    return message

@app.get("/api/messages/byUserId/{user_id}", response_model=List[Message])
async def get_message(user_id: int, crud: MessageCRUD = Depends(get_message_crud)):
    messages = await crud.get_messages_by_user(user_id)
    print(messages)
    if not messages:
        raise HTTPException(status_code=404, detail="Message not found")
    return messages

@app.post("/api/messages", response_model=Message)
async def create_message(message: Message, crud: MessageCRUD = Depends(get_message_crud)):
    try:
        created_message = await crud.create_message(message)
        return created_message
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating message: {str(e)}")

@app.post("/api/chat/{user_id}", response_model=Message)
async def chat_endpoint(user_id: int, message: Message, crud: MessageCRUD = Depends(get_message_crud)):
    print("Received message:", user_id)
    try:
        user_message = message.message
        
        # Save user message
        user_msg = Message(
            user_id=message.user_id,
            message=message.message,
            is_bot=message.is_bot,
            is_email=message.is_email,
            is_response=message.is_response,
            timestamp=message.timestamp
        )
        saved_user_msg = await crud.create_message(user_msg)
        
        # Generate AI response
        ai_response = generate_ai_response(user_message)
        
        # Save AI response
        bot_msg = Message(
            user_id=message.user_id,
            message=ai_response,
            is_bot=True,
            is_email=False,
            is_response=True,
            timestamp= datetime.now()
        )
        saved_bot_msg = await crud.create_message(bot_msg)
        
        return saved_bot_msg
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing chat: {str(e)}")

@app.put("/api/messages/{message_id}", response_model=Message)
async def update_message(message_id: int, message: Message, crud: MessageCRUD = Depends(get_message_crud)):
    # Don't allow changing the ID
    update_data = message.dict(exclude={'id'}, exclude_none=True)
    updated_message = await crud.update_message(message_id, update_data)
    if not updated_message:
        raise HTTPException(status_code=404, detail="Message not found")
    return updated_message

@app.delete("/api/messages/{message_id}")
async def delete_message(message_id: int, crud: MessageCRUD = Depends(get_message_crud)):
    success = await crud.delete_message(message_id)
    if not success:
        raise HTTPException(status_code=404, detail="Message not found")
    return {"message": "Message deleted successfully"}

# User Routes
@app.post("/api/login")
async def login(data: LoginRequest, crud: UserCRUD = Depends(get_user_crud)):
    user = await crud.authenticate_user(data.email, data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(sub=str(user.id))
    return {"message": "Login success", "access_token": token,"token_type": "bearer","user": user}

@app.post("/api/users", response_model=User)
async def create_user(user: User, crud: UserCRUD = Depends(get_user_crud)):
    try:
        created_user = await crud.create_user(user)
        return created_user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating user: {str(e)}")

@app.get("/api/users", response_model=List[User])
async def get_all_users(crud: UserCRUD = Depends(get_user_crud)):
    try:
        users = await crud.get_all_users()
        return users
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching users: {str(e)}")

@app.get("/api/users/{user_id}", response_model=User)
async def get_user(user_id: int, crud: UserCRUD = Depends(get_user_crud)):
    user = await crud.get_user(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/api/users/email/{email}", response_model=User)
async def get_user_by_email(email: str, crud: UserCRUD = Depends(get_user_crud)):
    user = await crud.get_user_by_email(email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/api/users/username/{username}", response_model=User)
async def get_user_by_username(username: str, crud: UserCRUD = Depends(get_user_crud)):
    user = await crud.get_user_by_username(username)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.put("/api/users/{user_id}", response_model=User)
async def update_user(user_id: int, user: User, crud: UserCRUD = Depends(get_user_crud)):
    update_data = user.dict(exclude={'id'}, exclude_none=True)
    updated_user = await crud.update_user(user_id, update_data)
    if not updated_user:
        raise HTTPException(status_code=404, detail="User not found")
    return updated_user

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: int, crud: UserCRUD = Depends(get_user_crud)):
    success = await crud.delete_user(user_id)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

@app.post("/api/users/authenticate", response_model=User)
async def authenticate_user(credentials: dict, crud: UserCRUD = Depends(get_user_crud)):
    email = credentials.get("email")
    password = credentials.get("password")
    
    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password are required")
    
    user = await crud.authenticate_user(email, password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return user


# Helper functions
def is_email_content(text: str) -> bool:
    return any(keyword in text for keyword in ['@', 'Subject:', 'From:', 'To:', 'CC:'])

def generate_ai_response(user_message: str) -> str:
    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "You are a helpful AI email assistant."},
            {"role": "user", "content": user_message}
        ]
    )
    return res.choices[0].message.content

  