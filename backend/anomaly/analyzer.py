# backend/anomaly/analyzer.py
from .ml_models import anomaly_detector
from documents.access_log import get_access_logs
from db import get_db_connection
from typing import Dict, List
import pandas as pd
from datetime import datetime, timedelta
import pytz # Import pytz

INDIA_TIMEZONE = pytz.timezone('Asia/Kolkata') # Define Indian timezone

def analyze_access_pattern(user_id: int, action: str, department: str = None) -> float:
    """Analyze access pattern and return risk score"""
    
    # Get recent access logs for training/analysis
    recent_logs = get_access_logs(limit=1000)
    
    if len(recent_logs) < 50:
        # Not enough data for meaningful analysis
        return 0.0
    
    # Train model if not already trained
    if not anomaly_detector.is_trained:
        anomaly_detector.train(recent_logs)
    
    # Create current access log entry with IST timestamp
    current_log = {
        'user_id': user_id,
        'action': action,
        'timestamp': datetime.now(INDIA_TIMEZONE).isoformat(), # Use IST for current log
        'department': department or 'Unknown'
    }
    
    # Predict anomaly
    is_anomaly, risk_score = anomaly_detector.predict_anomaly(current_log)
    
    return risk_score

def get_user_behavior_baseline(user_id: int) -> Dict:
    """Get user's typical behavior pattern"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get user's access history
        cursor.execute('''
            SELECT * FROM access_logs 
            WHERE user_id = ? 
            ORDER BY timestamp DESC 
            LIMIT 100
        ''', (user_id,))
        
        logs = [dict(row) for row in cursor.fetchall()]
        
        if not logs:
            return {}
        
        df = pd.DataFrame(logs)
        # Convert timestamp to timezone-aware IST
        df['timestamp'] = pd.to_datetime(df['timestamp']).dt.tz_localize(pytz.utc).dt.tz_convert(INDIA_TIMEZONE)
        df['hour'] = df['timestamp'].dt.hour
        
        # Calculate baseline metrics
        baseline = {
            'avg_daily_accesses': len(df) / max(1, df['timestamp'].dt.date.nunique()),
            'common_hours': df['hour'].mode().tolist(),
            'common_actions': df['action'].value_counts().to_dict(),
            'avg_risk_score': df['risk_score'].mean()
        }
        
        return baseline
        
    finally:
        conn.close()

def detect_bulk_operations(user_id: int, time_window_minutes: int = 30) -> Dict:
    """Detect if user is performing bulk operations"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get recent activities within time window (convert to UTC for comparison with DB)
        since_time = datetime.now(INDIA_TIMEZONE) - timedelta(minutes=time_window_minutes)
        
        cursor.execute('''
            SELECT action, COUNT(*) as count
            FROM access_logs 
            WHERE user_id = ? AND timestamp >= ?
            GROUP BY action
        ''', (user_id, since_time.isoformat())) # Store in ISO format
        
        activities = dict(cursor.fetchall())
        
        # Define thresholds for bulk operations
        thresholds = {
            'read': 20,
            'upload': 10,
            'delete': 5
        }
        
        bulk_detected = False
        risk_factors = []
        
        for action, count in activities.items():
            threshold = thresholds.get(action, 15)
            if count >= threshold:
                bulk_detected = True
                risk_factors.append(f"{count} {action} operations in {time_window_minutes} minutes")
        
        return {
            'bulk_detected': bulk_detected,
            'activities': activities,
            'risk_factors': risk_factors,
            'risk_score': 0.8 if bulk_detected else 0.0
        }
        
    finally:
        conn.close()

def check_department_access_violations(user_id: int) -> List[Dict]:
    """Check for cross-department access violations"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get user's department
        cursor.execute("SELECT department FROM users WHERE id = ?", (user_id,))
        user_dept = cursor.fetchone()
        
        if not user_dept:
            return []
        
        user_department = user_dept['department']
        
        # Find access to other departments
        cursor.execute('''
            SELECT al.*, d.department as doc_department
            FROM access_logs al
            LEFT JOIN documents d ON al.doc_id = d.id
            WHERE al.user_id = ? 
            AND d.department IS NOT NULL 
            AND d.department != ?
            ORDER BY al.timestamp DESC
            LIMIT 10
        ''', (user_id, user_department))
        
        violations = [dict(row) for row in cursor.fetchall()]
        
        return violations
        
    finally:
        conn.close()

def generate_risk_report(user_id: int) -> Dict:
    """Generate comprehensive risk report for user"""
    baseline = get_user_behavior_baseline(user_id)
    bulk_ops = detect_bulk_operations(user_id)
    violations = check_department_access_violations(user_id)
    
    # Calculate overall risk score
    risk_factors = []
    total_risk = 0.0
    
    if bulk_ops['bulk_detected']:
        risk_factors.extend(bulk_ops['risk_factors'])
        total_risk += bulk_ops['risk_score']
    
    if violations:
        risk_factors.append(f"{len(violations)} cross-department access violations")
        total_risk += len(violations) * 0.2
    
    if baseline.get('avg_risk_score', 0) > 0.5:
        risk_factors.append("Consistently high individual risk scores")
        total_risk += 0.3
    
    # Cap risk score at 1.0
    total_risk = min(1.0, total_risk)
    
    return {
        'user_id': user_id,
        'overall_risk_score': total_risk,
        'risk_factors': risk_factors,
        'baseline': baseline,
        'bulk_operations': bulk_ops,
        'department_violations': violations,
        'timestamp': datetime.now(INDIA_TIMEZONE).isoformat() # Use IST
    }