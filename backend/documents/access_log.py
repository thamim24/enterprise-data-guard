# backend/documents/access_log.py - Fixed Version with Proper Connection Management

from db import get_db_connection, execute_db_query, get_current_ist_timestamp
from datetime import datetime, timedelta
from typing import Optional
import pytz
import sqlite3
import time

INDIA_TIMEZONE = pytz.timezone('Asia/Kolkata')

def log_access(user_id: int, doc_id: Optional[int], document_name: str, 
               action: str, anomaly_flag: bool = False, risk_score: float = 0.0):
    """Enhanced log document access/modification with cross-department tracking"""
    try:
        # Get user department
        user_dept = execute_db_query(
            "SELECT department FROM users WHERE id = ?", 
            (user_id,), fetch_one=True
        )
        user_department = user_dept['department'] if user_dept else 'Unknown'
        
        # Get document department if doc_id is provided
        document_department = None
        if doc_id:
            doc_dept = execute_db_query(
                "SELECT department FROM documents WHERE id = ?", 
                (doc_id,), fetch_one=True
            )
            document_department = doc_dept['department'] if doc_dept else None
        
        # Enhanced logging with department tracking
        log_id = execute_db_query('''
            INSERT INTO access_logs 
            (user_id, doc_id, document_name, action, anomaly_flag, risk_score, timestamp, user_department, document_department)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, doc_id, document_name, action, anomaly_flag, risk_score, 
              get_current_ist_timestamp(), user_department, document_department))
        
        return log_id
                
    except Exception as e:
        # Log to file as fallback
        with open("access_logs_fallback.log", "a") as f:
            f.write(f"{get_current_ist_timestamp()}: User {user_id} - {action} on {document_name}\n")
        print(f"Failed to log access: {e}")
        return None

def create_alert(user_id: int, document_name: str, alert_type: str, 
                 description: str, risk_score: float = 0.0):
    """Enhanced create security alert with severity classification"""
    try:
        # Determine severity based on alert type and risk score
        severity = "low"
        if alert_type in ['data_leak_attempt', 'data_sabotage_attempt'] or risk_score >= 0.8:
            severity = "critical"
        elif alert_type in ['document_tampering', 'unauthorized_access'] or risk_score >= 0.6:
            severity = "high"
        elif risk_score >= 0.4:
            severity = "medium"
        
        alert_id = execute_db_query('''
            INSERT INTO alerts (user_id, document_name, alert_type, description, risk_score, timestamp, severity)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (user_id, document_name, alert_type, description, risk_score, 
              get_current_ist_timestamp(), severity))
        
        return alert_id
                
    except Exception as e:
        # Log to file as fallback
        with open("alerts_fallback.log", "a") as f:
            f.write(f"{get_current_ist_timestamp()}: Alert {alert_type} for user {user_id} - {description}\n")
        print(f"Failed to create alert: {e}")
        return None

def get_access_logs(limit: int = 100, user_id: Optional[int] = None, 
                   department: Optional[str] = None, anomalies_only: bool = False):
    """Get access logs with enhanced filtering options"""
    try:
        query = '''
            SELECT al.*, u.username, u.department
            FROM access_logs al
            JOIN users u ON al.user_id = u.id
        '''
        params = []
        conditions = []
        
        if user_id:
            conditions.append("al.user_id = ?")
            params.append(user_id)
        
        if department:
            conditions.append("u.department = ?")
            params.append(department)
        
        if anomalies_only:
            conditions.append("al.anomaly_flag = 1")
        
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        
        query += " ORDER BY al.timestamp DESC LIMIT ?"
        params.append(limit)
        
        return execute_db_query(query, params, fetch_all=True) or []
            
    except Exception as e:
        print(f"Error getting access logs: {e}")
        return []  # Return empty list on persistent database issues

def get_alerts(resolved: bool = False, limit: int = 100, severity: Optional[str] = None,
               alert_type: Optional[str] = None):
    """Get security alerts with enhanced filtering"""
    try:
        query = '''
            SELECT a.*, u.username, u.department
            FROM alerts a
            JOIN users u ON a.user_id = u.id
        '''
        params = []
        conditions = ["a.resolved = ?"]
        params.append(resolved)
        
        if severity:
            conditions.append("a.severity = ?")
            params.append(severity)
        
        if alert_type:
            conditions.append("a.alert_type = ?")
            params.append(alert_type)
        
        query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY a.timestamp DESC LIMIT ?"
        params.append(limit)
        
        return execute_db_query(query, params, fetch_all=True) or []
            
    except Exception as e:
        print(f"Error getting alerts: {e}")
        return []

def get_cross_department_access_summary(days: int = 7):
    """Get summary of cross-department access attempts"""
    try:
        query = '''
            SELECT 
                user_department,
                document_department,
                COUNT(*) as access_count,
                AVG(risk_score) as avg_risk_score,
                MAX(risk_score) as max_risk_score,
                COUNT(CASE WHEN anomaly_flag = 1 THEN 1 END) as anomaly_count
            FROM access_logs
            WHERE user_department != document_department
            AND document_department IS NOT NULL
            AND datetime(timestamp) >= datetime('now', '-{} days')
            GROUP BY user_department, document_department
            ORDER BY access_count DESC
        '''.format(days)
        
        return execute_db_query(query, fetch_all=True) or []
            
    except Exception as e:
        print(f"Error getting cross-department access summary: {e}")
        return []

def get_document_modification_timeline(doc_id: int):
    """Get modification timeline for a specific document"""
    try:
        query = '''
            SELECT 
                al.*,
                u.username,
                u.department,
                d.name as document_name
            FROM access_logs al
            JOIN users u ON al.user_id = u.id
            LEFT JOIN documents d ON al.doc_id = d.id
            WHERE al.doc_id = ? AND al.action IN ('upload', 'update', 'modify')
            ORDER BY al.timestamp DESC
        '''
        
        return execute_db_query(query, (doc_id,), fetch_all=True) or []
            
    except Exception as e:
        print(f"Error getting document modification timeline: {e}")
        return []

def get_user_access_pattern(user_id: int, days: int = 30):
    """Analyze user access patterns for anomaly detection"""
    try:
        # Get user's access history
        query = '''
            SELECT 
                action,
                document_department,
                user_department,
                risk_score,
                anomaly_flag,
                timestamp,
                strftime('%H', timestamp) as hour,
                strftime('%w', timestamp) as day_of_week
            FROM access_logs al
            WHERE al.user_id = ?
            AND datetime(timestamp) >= datetime('now', '-{} days')
            ORDER BY timestamp DESC
        '''.format(days)
        
        access_logs = execute_db_query(query, (user_id,), fetch_all=True) or []
        
        # Calculate patterns
        total_access = len(access_logs)
        cross_dept_access = len([log for log in access_logs 
                                if log.get('document_department') and 
                                log.get('document_department') != log.get('user_department')])
        
        anomaly_count = len([log for log in access_logs if log.get('anomaly_flag')])
        avg_risk_score = sum(log.get('risk_score', 0) for log in access_logs) / max(1, total_access)
        
        # Most active hours
        hour_counts = {}
        for log in access_logs:
            hour = log.get('hour')
            if hour:
                hour_counts[hour] = hour_counts.get(hour, 0) + 1
        
        most_active_hours = sorted(hour_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        
        return {
            'total_access': total_access,
            'cross_department_access': cross_dept_access,
            'cross_dept_percentage': (cross_dept_access / max(1, total_access)) * 100,
            'anomaly_count': anomaly_count,
            'anomaly_percentage': (anomaly_count / max(1, total_access)) * 100,
            'avg_risk_score': avg_risk_score,
            'most_active_hours': most_active_hours,
            'recent_logs': access_logs[:10]
        }
            
    except Exception as e:
        print(f"Error getting user access pattern: {e}")
        # Return default pattern on database issues
        return {
            'total_access': 0,
            'cross_department_access': 0,
            'cross_dept_percentage': 0,
            'anomaly_count': 0,
            'anomaly_percentage': 0,
            'avg_risk_score': 0,
            'most_active_hours': [],
            'recent_logs': []
        }

def create_tamper_detection_alert(user_id: int, document_name: str, 
                                 old_hash: str, new_hash: str, diff_stats: dict):
    """Create specific alert for document tampering with detailed information"""
    
    # Calculate severity based on changes
    change_percentage = diff_stats.get('change_percentage', 0)
    lines_changed = diff_stats.get('total_changes', 0)
    
    risk_score = min(1.0, (change_percentage / 100) + (lines_changed / 100))
    
    description = (f"Document tampering detected in {document_name}. "
                  f"Changes: {diff_stats.get('added_lines', 0)} lines added, "
                  f"{diff_stats.get('removed_lines', 0)} lines removed "
                  f"({change_percentage:.1f}% of document modified)")
    
    create_alert(
        user_id=user_id,
        document_name=document_name,
        alert_type="document_tampering",
        description=description,
        risk_score=risk_score
    )
    
    return risk_score
