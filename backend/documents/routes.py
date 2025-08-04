# backend/documents/routes.py - FIXED VERSION - Actually Working

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from auth.routes import get_current_user
from auth.models import User
from db import execute_db_query, get_current_ist_timestamp, log_access, create_alert
import os
import shutil
import hashlib

router = APIRouter()

def calculate_file_hash(filepath):
    """Calculate MD5 hash of file"""
    try:
        with open(filepath, 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()
    except:
        return ""

@router.get("/list")
async def list_documents(current_user: User = Depends(get_current_user)):
    """List documents accessible to user"""
    try:
        if current_user.role == "admin":
            documents = execute_db_query('''
                SELECT d.*, u.username as modified_by_username
                FROM documents d
                LEFT JOIN users u ON d.modified_by = u.id
                ORDER BY d.updated_at DESC
            ''', fetch_all=True)
        else:
            documents = execute_db_query('''
                SELECT d.*, u.username as modified_by_username
                FROM documents d
                LEFT JOIN users u ON d.modified_by = u.id
                WHERE d.department = ?
                ORDER BY d.updated_at DESC
            ''', (current_user.department,), fetch_all=True)
        
        log_access(current_user.id, None, "document_list", "list")
        return {"documents": documents}
        
    except Exception as e:
        print(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail="Failed to list documents")

@router.get("/download/{doc_id}")
async def download_document(doc_id: int, current_user: User = Depends(get_current_user)):
    """Download a document"""
    try:
        document = execute_db_query(
            "SELECT * FROM documents WHERE id = ?", 
            (doc_id,), 
            fetch_one=True
        )
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check permissions for non-admin users
        if current_user.role != "admin" and document['department'] != current_user.department:
            # Log potential data leak attempt
            log_access(current_user.id, doc_id, document['name'], "unauthorized_access_attempt")
            create_alert(
                current_user.id, 
                document['name'], 
                "unauthorized_access",
                f"User from {current_user.department} tried to access {document['department']} document"
            )
            raise HTTPException(status_code=403, detail="Access denied")
        
        filepath = document['filepath']
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Log successful access
        log_access(current_user.id, doc_id, document['name'], "download")
        
        return FileResponse(
            path=filepath,
            filename=document['name'],
            media_type='application/octet-stream'
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error downloading document: {e}")
        raise HTTPException(status_code=500, detail="Failed to download document")

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    department: str = Form(...),
    current_user: User = Depends(get_current_user)
):
    """Upload a document"""
    try:
        # Check permissions for non-admin users
        if current_user.role != "admin" and department != current_user.department:
            log_access(current_user.id, None, file.filename, "unauthorized_upload_attempt")
            create_alert(
                current_user.id,
                file.filename,
                "unauthorized_upload",
                f"User tried to upload to {department} department"
            )
            raise HTTPException(status_code=403, detail="Cannot upload to other departments")
        
        # Create department directory
        dept_dir = f"static/docs/{department}"
        os.makedirs(dept_dir, exist_ok=True)
        
        # Save file
        filepath = os.path.join(dept_dir, file.filename)
        
        # Check if file already exists
        file_exists = os.path.exists(filepath)
        old_hash = ""
        
        if file_exists:
            old_hash = calculate_file_hash(filepath)
            # Create backup
            backup_path = f"{filepath}.backup"
            shutil.copy2(filepath, backup_path)
        
        # Save uploaded file
        with open(filepath, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Calculate new hash
        new_hash = calculate_file_hash(filepath)
        
        if file_exists:
            # Update existing document
            if old_hash != new_hash:
                # Document was modified
                create_alert(
                    current_user.id,
                    file.filename,
                    "document_modified",
                    f"Document {file.filename} was modified"
                )
            
            execute_db_query('''
                UPDATE documents 
                SET version_hash = ?, modified_by = ?, updated_at = ?
                WHERE filepath = ?
            ''', (new_hash, current_user.id, get_current_ist_timestamp(), filepath))
            
            log_access(current_user.id, None, file.filename, "update")
        else:
            # Create new document record
            execute_db_query('''
                INSERT INTO documents (name, department, filepath, version_hash, modified_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (file.filename, department, filepath, new_hash, current_user.id, 
                  get_current_ist_timestamp(), get_current_ist_timestamp()))
            
            log_access(current_user.id, None, file.filename, "upload")
        
        return {"message": "File uploaded successfully", "filename": file.filename}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload document")

@router.delete("/delete/{doc_id}")
async def delete_document(doc_id: int, current_user: User = Depends(get_current_user)):
    """Delete a document"""
    try:
        document = execute_db_query(
            "SELECT * FROM documents WHERE id = ?", 
            (doc_id,), 
            fetch_one=True
        )
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Check permissions
        if current_user.role != "admin" and document['department'] != current_user.department:
            log_access(current_user.id, doc_id, document['name'], "unauthorized_delete_attempt")
            create_alert(
                current_user.id,
                document['name'],
                "unauthorized_delete",
                f"User tried to delete {document['department']} document"
            )
            raise HTTPException(status_code=403, detail="Cannot delete other department documents")
        
        # Create backup before deletion
        filepath = document['filepath']
        if os.path.exists(filepath):
            backup_dir = "static/docs/backups"
            os.makedirs(backup_dir, exist_ok=True)
            backup_path = os.path.join(backup_dir, f"deleted_{document['name']}")
            shutil.copy2(filepath, backup_path)
            os.remove(filepath)
        
        # Remove from database
        execute_db_query("DELETE FROM documents WHERE id = ?", (doc_id,))
        
        # Log deletion
        log_access(current_user.id, doc_id, document['name'], "delete")
        create_alert(
            current_user.id,
            document['name'],
            "document_deleted",
            f"Document {document['name']} was deleted"
        )
        
        return {"message": "Document deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete document")