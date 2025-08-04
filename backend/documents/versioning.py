import hashlib
import os
from typing import Optional, Dict
import difflib
from datetime import datetime
import pytz # Import pytz

INDIA_TIMEZONE = pytz.timezone('Asia/Kolkata') # Define Indian timezone

def calculate_file_hash(filepath: str) -> str:
    """Calculate MD5 hash of file content"""
    try:
        with open(filepath, 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()
    except FileNotFoundError:
        return ""

def get_file_diff(old_content: str, new_content: str) -> Dict:
    """Get diff between two file contents"""
    diff_lines = list(difflib.unified_diff(
        old_content.splitlines(keepends=True),
        new_content.splitlines(keepends=True),
        fromfile='Original',
        tofile='Modified',
        lineterm=''
    ))
    
    added_lines = sum(1 for line in diff_lines if line.startswith('+') and not line.startswith('+++'))
    removed_lines = sum(1 for line in diff_lines if line.startswith('-') and not line.startswith('---'))
    
    return {
        'diff_lines': diff_lines,
        'added_lines': added_lines,
        'removed_lines': removed_lines,
        'total_changes': added_lines + removed_lines
    }

def check_version_change(filepath: str, stored_hash: str) -> Dict:
    """Check if file has been modified"""
    current_hash = calculate_file_hash(filepath)
    
    if current_hash != stored_hash:
        return {
            'changed': True,
            'old_hash': stored_hash,
            'new_hash': current_hash,
            'file_exists': os.path.exists(filepath)
        }
    
    return {
        'changed': False,
        'old_hash': stored_hash,
        'new_hash': current_hash,
        'file_exists': os.path.exists(filepath)
    }

def backup_file(filepath: str) -> str:
    """Create backup of file with timestamp"""
    if not os.path.exists(filepath):
        return ""
    
    backup_dir = os.path.join(os.path.dirname(filepath), 'backups')
    os.makedirs(backup_dir, exist_ok=True)
    
    filename = os.path.basename(filepath)
    timestamp = datetime.now(INDIA_TIMEZONE).strftime("%Y%m%d_%H%M%S") # Use IST for backup filename
    backup_path = os.path.join(backup_dir, f"{filename}.{timestamp}.bak")
    
    import shutil
    shutil.copy2(filepath, backup_path)
    return backup_path