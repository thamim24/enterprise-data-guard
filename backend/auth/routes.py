from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .models import UserCreate, UserLogin, Token, User
from .auth_utils import hash_password, verify_password, create_access_token, verify_token
from db import get_db_connection
import sqlite3

router = APIRouter()
security = HTTPBearer()

@router.post("/register", response_model=dict)
async def register(user: UserCreate):
    """Register a new user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Check if username already exists
        cursor.execute("SELECT id FROM users WHERE username = ?", (user.username,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=400,
                detail="Username already registered"
            )
        
        # Hash password and create user
        hashed_password = hash_password(user.password)
        cursor.execute('''
            INSERT INTO users (username, password_hash, department, role)
            VALUES (?, ?, ?, ?)
        ''', (user.username, hashed_password, user.department, user.role))
        
        conn.commit()
        return {"message": "User registered successfully"}
        
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )
    finally:
        conn.close()

@router.post("/login", response_model=Token)
async def login(user: UserLogin):
    """Login user and return JWT token"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get user from database
        cursor.execute('''
            SELECT id, username, password_hash, department, role
            FROM users WHERE username = ?
        ''', (user.username,))
        
        db_user = cursor.fetchone()
        if not db_user or not verify_password(user.password, db_user['password_hash']):
            raise HTTPException(
                status_code=401,
                detail="Incorrect username or password"
            )
        
        # Create access token
        access_token = create_access_token(
            data={"sub": db_user['username'], "user_id": db_user['id']}
        )
        
        user_obj = User(
            id=db_user['id'],
            username=db_user['username'],
            department=db_user['department'],
            role=db_user['role']
        )
        
        return Token(
            access_token=access_token,
            token_type="bearer",
            user=user_obj
        )
        
    finally:
        conn.close()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    token = credentials.credentials
    payload = verify_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials"
        )
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('''
            SELECT id, username, department, role
            FROM users WHERE username = ?
        ''', (payload['sub'],))
        
        user = cursor.fetchone()
        if user is None:
            raise HTTPException(
                status_code=401,
                detail="User not found"
            )
        
        return User(
            id=user['id'],
            username=user['username'],
            department=user['department'],
            role=user['role']
        )
        
    finally:
        conn.close()