# backend/db.py - FIXED VERSION - Simplified and Working

import sqlite3
from typing import Optional
import os
from datetime import datetime
import pytz
import threading

DATABASE_PATH = "database.db"
INDIA_TIMEZONE = pytz.timezone('Asia/Kolkata')

# Global connection with proper locking
db_lock = threading.Lock()

def get_db_connection():
    """Get SQLite database connection with proper configuration"""
    conn = sqlite3.connect(
        DATABASE_PATH, 
        timeout=10.0,
        check_same_thread=False
    )
    conn.row_factory = sqlite3.Row
    return conn

def get_current_ist_timestamp():
    """Get current timestamp in Indian Time Zone (IST)"""
    return datetime.now(INDIA_TIMEZONE).strftime("%Y-%m-%d %H:%M:%S")

def execute_db_query(query, params=None, fetch_one=False, fetch_all=False):
    """Execute database query with proper error handling"""
    with db_lock:
        conn = None
        try:
            conn = get_db_connection()
            cursor = conn.cursor()
            
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            if fetch_one:
                result = cursor.fetchone()
                conn.close()
                return dict(result) if result else None
            elif fetch_all:
                result = cursor.fetchall()
                conn.close()
                return [dict(row) for row in result]
            else:
                conn.commit()
                lastrowid = cursor.lastrowid
                conn.close()
                return lastrowid
                
        except Exception as e:
            if conn:
                conn.rollback()
                conn.close()
            raise e

def init_database():
    """Initialize database with required tables"""
    # Users table
    execute_db_query('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            department TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Documents table
    execute_db_query('''
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            department TEXT NOT NULL,
            filepath TEXT NOT NULL,
            version_hash TEXT NOT NULL,
            modified_by INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (modified_by) REFERENCES users (id)
        )
    ''')
    
    # Access logs table with enhanced fields
    execute_db_query('''
        CREATE TABLE IF NOT EXISTS access_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            doc_id INTEGER,
            document_name TEXT,
            action TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            anomaly_flag BOOLEAN DEFAULT FALSE,
            risk_score REAL DEFAULT 0.0,
            user_department TEXT,
            document_department TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id),
            FOREIGN KEY (doc_id) REFERENCES documents (id)
        )
    ''')
    
    # Alerts table with severity field
    execute_db_query('''
        CREATE TABLE IF NOT EXISTS alerts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            document_name TEXT,
            alert_type TEXT NOT NULL,
            description TEXT,
            risk_score REAL DEFAULT 0.0,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved BOOLEAN DEFAULT FALSE,
            severity TEXT DEFAULT 'low',
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')
    
    # Create sample data
    create_sample_data()

def create_sample_data():
    """Create sample users and documents"""
    # Check if admin exists
    admin_count = execute_db_query(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin'", 
        fetch_one=True
    )
    
    if admin_count['count'] == 0:
        from auth.auth_utils import hash_password
        
        # Create admin user
        admin_hash = hash_password("admin123")
        execute_db_query('''
            INSERT INTO users (username, password_hash, department, role, created_at)
            VALUES (?, ?, ?, ?, ?)
        ''', ("admin", admin_hash, "IT", "admin", get_current_ist_timestamp()))
        
        # Create sample users
        users_data = [
            ("john_hr", hash_password("password123"), "HR", "user", get_current_ist_timestamp()),
            ("sarah_finance", hash_password("password123"), "Finance", "user", get_current_ist_timestamp()),
            ("mike_legal", hash_password("password123"), "Legal", "user", get_current_ist_timestamp()),
        ]
        
        for user_data in users_data:
            execute_db_query('''
                INSERT INTO users (username, password_hash, department, role, created_at)
                VALUES (?, ?, ?, ?, ?)
            ''', user_data)
    
    # Create sample documents
    create_sample_documents()

def create_sample_documents():
    """Create sample document files"""
    import hashlib
    
    documents = {
        "static/docs/HR/employee_handbook.txt": """
EMPLOYEE HANDBOOK - HR DEPARTMENT
=================================

1. Company Policies
2. Code of Conduct  
3. Leave Policies
4. Benefits Information

This is a sample HR document.
        """,
        
        "static/docs/Finance/budget_2024.txt": """
ANNUAL BUDGET 2024 - FINANCE DEPARTMENT
======================================

Q1 Budget: $100,000
Q2 Budget: $120,000
Q3 Budget: $110,000
Q4 Budget: $130,000

This is a sample Finance document.
        """,
        
        "static/docs/Legal/contract_template.txt": """
CONTRACT TEMPLATE - LEGAL DEPARTMENT
====================================

TERMS AND CONDITIONS
- Payment terms
- Delivery requirements
- Legal obligations

This is a sample Legal document.
        """
    }
    
    # Create directories and files
    for filepath, content in documents.items():
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, 'w') as f:
            f.write(content.strip())
    
    # Create uploads directory
    os.makedirs("static/docs/uploads", exist_ok=True)
    
    # Add documents to database
    for filepath, content in documents.items():
        # Extract department from filepath
        parts = filepath.split('/')
        department = parts[2]
        filename = parts[-1]
        
        # Calculate hash
        file_hash = hashlib.md5(content.encode()).hexdigest()
        
        # Check if document already exists
        existing = execute_db_query(
            "SELECT COUNT(*) as count FROM documents WHERE filepath = ?", 
            (filepath,), 
            fetch_one=True
        )
        
        if existing['count'] == 0:
            execute_db_query('''
                INSERT INTO documents (name, department, filepath, version_hash, modified_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (filename, department, filepath, file_hash, 1, get_current_ist_timestamp(), get_current_ist_timestamp()))

def log_access(user_id: int, doc_id: Optional[int], document_name: str, action: str, 
               anomaly_flag: bool = False, risk_score: float = 0.0):
    """Enhanced access logging with anomaly detection"""
    try:
        # Get user and document departments
        user_dept = execute_db_query(
            "SELECT department FROM users WHERE id = ?", 
            (user_id,), fetch_one=True
        )
        user_department = user_dept['department'] if user_dept else 'Unknown'
        
        doc_department = None
        if doc_id:
            doc_dept = execute_db_query(
                "SELECT department FROM documents WHERE id = ?", 
                (doc_id,), fetch_one=True
            )
            doc_department = doc_dept['department'] if doc_dept else None
        
        # Calculate risk score for unauthorized actions
        if action in ['unauthorized_upload_attempt', 'unauthorized_access_attempt']:
            risk_score = max(risk_score, 0.8)
            anomaly_flag = True
        elif doc_department and user_department != doc_department:
            risk_score = max(risk_score, 0.6)
            anomaly_flag = True
        
        execute_db_query('''
            INSERT INTO access_logs (user_id, doc_id, document_name, action, timestamp, 
                                   anomaly_flag, risk_score, user_department, document_department)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, doc_id, document_name, action, get_current_ist_timestamp(), 
              anomaly_flag, risk_score, user_department, doc_department))
    except Exception as e:
        print(f"Failed to log access: {e}")

def create_alert(user_id: int, document_name: str, alert_type: str, description: str, 
                 risk_score: float = 0.0):
    """Enhanced alert creation with risk scoring"""
    try:
        # Determine severity based on alert type and risk score
        severity = "low"
        if alert_type in ['unauthorized_upload', 'unauthorized_access', 'data_leak_attempt'] or risk_score >= 0.8:
            severity = "critical"
        elif alert_type in ['document_modified', 'cross_department_access'] or risk_score >= 0.6:
            severity = "high"
        elif risk_score >= 0.4:
            severity = "medium"
        
        execute_db_query('''
            INSERT INTO alerts (user_id, document_name, alert_type, description, timestamp, risk_score, severity)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, document_name, alert_type, description, get_current_ist_timestamp(), risk_score, severity))
    except Exception as e:
        print(f"Failed to create alert: {e}")

if __name__ == "__main__":
    init_database()
    print("Database initialized successfully!")