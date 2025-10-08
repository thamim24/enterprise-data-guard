# backend/documents/routes.py - FIXED VERSION - Actually Working

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse
from auth.routes import get_current_user
from auth.models import User
from db import execute_db_query, get_current_ist_timestamp, log_access, create_alert
from anomaly.analyzer import analyze_access_pattern
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
            # Calculate ML-based risk score for unauthorized access
            risk_score = analyze_access_pattern(current_user.id, "unauthorized_access_attempt", current_user.department)
            risk_score = max(0.8, risk_score)  # Unauthorized access is always high risk
            
            # Log potential data leak attempt with ML risk score
            log_access(current_user.id, doc_id, document['name'], "unauthorized_access_attempt", 
                      anomaly_flag=True, risk_score=risk_score)
            create_alert(
                current_user.id, 
                document['name'], 
                "unauthorized_access",
                f"User from {current_user.department} tried to access {document['department']} document",
                risk_score
            )
            raise HTTPException(status_code=403, detail="Access denied")
        
        filepath = document['filepath']
        if not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Calculate ML-based risk score for legitimate access
        risk_score = analyze_access_pattern(current_user.id, "download", current_user.department)
        is_anomaly = risk_score >= 0.7
        
        # Log successful access with ML-calculated risk score
        log_access(current_user.id, doc_id, document['name'], "download", 
                  anomaly_flag=is_anomaly, risk_score=risk_score)
        
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
            # Calculate ML-based risk score for unauthorized upload
            risk_score = analyze_access_pattern(current_user.id, "unauthorized_upload_attempt", current_user.department)
            risk_score = max(0.8, risk_score)  # Unauthorized upload is always high risk
            
            log_access(current_user.id, None, file.filename, "unauthorized_upload_attempt", 
                      anomaly_flag=True, risk_score=risk_score)
            create_alert(
                current_user.id,
                file.filename,
                "unauthorized_upload",
                f"User tried to upload to {department} department",
                risk_score
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
            # Get existing document ID
            existing_doc = execute_db_query(
                "SELECT id FROM documents WHERE filepath = ?", 
                (filepath,), fetch_one=True
            )
            doc_id = existing_doc['id'] if existing_doc else None
            
            # Update existing document
            if old_hash != new_hash:
                # Document was modified - create diff analysis
                try:
                    with open(f"{filepath}.backup", 'r', encoding='utf-8') as f:
                        old_content = f.read()
                    with open(filepath, 'r', encoding='utf-8') as f:
                        new_content = f.read()
                    
                    # Calculate real diff stats
                    from reports.diff_utils import calculate_diff_stats
                    diff_stats = calculate_diff_stats(old_content, new_content)
                    
                    # Combine diff-based risk with ML-based risk
                    diff_risk = min(1.0, diff_stats['change_percentage'] / 100)
                    ml_risk = analyze_access_pattern(current_user.id, "update", current_user.department)
                    risk_score = max(diff_risk, ml_risk)
                    
                    create_alert(
                        current_user.id,
                        file.filename,
                        "document_modified",
                        f"Document {file.filename} was modified: {diff_stats['added_lines']} lines added, {diff_stats['removed_lines']} lines removed ({diff_stats['change_percentage']:.1f}% changed)",
                        risk_score
                    )
                except Exception as e:
                    print(f"Error analyzing diff: {e}")
                    # Use ML-based risk scoring as fallback
                    risk_score = analyze_access_pattern(current_user.id, "update", current_user.department)
                    create_alert(
                        current_user.id,
                        file.filename,
                        "document_modified",
                        f"Document {file.filename} was modified",
                        risk_score
                    )
            else:
                # No changes detected, use ML risk scoring
                risk_score = analyze_access_pattern(current_user.id, "update", current_user.department)
            
            execute_db_query('''
                UPDATE documents 
                SET version_hash = ?, modified_by = ?, updated_at = ?
                WHERE filepath = ?
            ''', (new_hash, current_user.id, get_current_ist_timestamp(), filepath))
            
            # Use calculated risk score and determine anomaly flag
            is_anomaly = risk_score >= 0.7 or old_hash != new_hash
            log_access(current_user.id, doc_id, file.filename, "update", 
                      anomaly_flag=is_anomaly, risk_score=risk_score)
        else:
            # Calculate ML-based risk score for new upload
            risk_score = analyze_access_pattern(current_user.id, "upload", current_user.department)
            is_anomaly = risk_score >= 0.7
            
            # Create new document record
            execute_db_query('''
                INSERT INTO documents (name, department, filepath, version_hash, modified_by, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (file.filename, department, filepath, new_hash, current_user.id, 
                  get_current_ist_timestamp(), get_current_ist_timestamp()))
            
            log_access(current_user.id, None, file.filename, "upload", 
                      anomaly_flag=is_anomaly, risk_score=risk_score)
        
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
            # Calculate ML-based risk score for unauthorized delete
            risk_score = analyze_access_pattern(current_user.id, "unauthorized_delete_attempt", current_user.department)
            risk_score = max(0.8, risk_score)  # Unauthorized delete is always high risk
            
            log_access(current_user.id, doc_id, document['name'], "unauthorized_delete_attempt", 
                      anomaly_flag=True, risk_score=risk_score)
            create_alert(
                current_user.id,
                document['name'],
                "unauthorized_delete",
                f"User tried to delete {document['department']} document",
                risk_score
            )
            raise HTTPException(status_code=403, detail="Cannot delete other department documents")
        
        # Calculate ML-based risk score for legitimate delete
        risk_score = analyze_access_pattern(current_user.id, "delete", current_user.department)
        is_anomaly = risk_score >= 0.7
        
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
        
        # Log deletion with ML-calculated risk score
        log_access(current_user.id, doc_id, document['name'], "delete", 
                  anomaly_flag=is_anomaly, risk_score=risk_score)
        create_alert(
            current_user.id,
            document['name'],
            "document_deleted",
            f"Document {document['name']} was deleted",
            risk_score
        )
        
        return {"message": "Document deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete document")
