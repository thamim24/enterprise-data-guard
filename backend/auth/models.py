from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    username: str
    password: str
    department: str
    role: str = "user"

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    id: int
    username: str
    department: str
    role: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User