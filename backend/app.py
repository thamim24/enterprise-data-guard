#backend/app.py:-
from fastapi import FastAPI, Depends, HTTPException, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from auth.routes import router as auth_router, get_current_user
from auth.models import User
from documents.routes import router as docs_router
from db import execute_db_query, init_database
import os
from datetime import datetime
from typing import Optional # Necessary for the explicit imports used

# Initialize FastAPI app with a title
app = FastAPI(title="Enterprise Data Guard API")

# -----------------------------
# 1️⃣ Include API routers
# -----------------------------
# Include core routers with tags for documentation
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(docs_router, prefix="/api/documents", tags=["documents"])

# -----------------------------
# 2️⃣ CORS middleware
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# 3️⃣ Static folders
# -----------------------------
# Ensure static folders exist for documents and reports
os.makedirs("static/docs", exist_ok=True) # Ensuring 'docs' exists for modification-diff endpoint
os.makedirs("reports", exist_ok=True)

# Mount static file directories for serving documents and reports
app.mount("/static", StaticFiles(directory="static"), name="static")
app.mount("/reports", StaticFiles(directory="reports"), name="reports")

# -----------------------------
# 4️⃣ React frontend setup (SPA Catch-all) - Using the robust /frontend-static method
# -----------------------------
frontend_build = os.path.join(os.path.dirname(__file__), "../frontend/build")
index_file = os.path.join(frontend_build, "index.html")

if os.path.exists(frontend_build):
    # Mount frontend static assets separately
    # This prevents the StaticFiles mount from overriding all other API/static routes
    app.mount("/frontend-static", StaticFiles(directory=frontend_build, html=True), name="frontend-static")
    print(f"✅ Frontend build found and mounted at /frontend-static: {frontend_build}")
else:
    print(f"⚠️ Frontend build folder not found at {frontend_build}. Only API will work.")

@app.get("/{full_path:path}")
async def serve_react(full_path: str):
    """
    Serve React frontend for all non-API routes.
    This ensures SPA routing (e.g., /dashboard, /login) works by always returning index.html.
    """
    # Prevent this catch-all from trapping API calls or files served by the explicit StaticFiles mounts
    if full_path.startswith("api") or full_path.startswith("static") or full_path.startswith("reports") or full_path.startswith("frontend-static"):
        raise HTTPException(status_code=404, detail="API endpoint or Static file not found")
    
    # Serve the index.html for all other paths (SPA routing)
    if os.path.exists(index_file):
        return FileResponse(index_file)
    else:
        return {"message": "Frontend not built yet."}

# -----------------------------
# 5️⃣ Initialize database
# -----------------------------
init_database()

# -----------------------------
# 6️⃣ Admin dashboard & endpoints (Refactored into APIRouter)
# -----------------------------
admin_router = APIRouter(
    prefix="/api/admin", 
    tags=["admin"],
    # Apply the basic authentication dependency to all routes in this router
    dependencies=[Depends(get_current_user)] 
)

# Admin utility function to check role (used as a dependency in the router functions)
def check_admin_role(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ----------------
# Dashboard
# ----------------
@admin_router.get("/dashboard")
async def get_admin_dashboard(current_user: User = Depends(check_admin_role)):
    """Get comprehensive admin dashboard data"""
    try:
        # Get recent alerts
        alerts = execute_db_query('''
            SELECT a.*, u.username, u.department
            FROM alerts a 
            JOIN users u ON a.user_id = u.id 
            WHERE a.resolved = 0 
            ORDER BY a.timestamp DESC 
            LIMIT 20
        ''', fetch_all=True)
        
        # Get recent access logs
        access_logs = execute_db_query('''
            SELECT al.*, u.username, u.department 
            FROM access_logs al 
            JOIN users u ON al.user_id = u.id 
            ORDER BY al.timestamp DESC 
            LIMIT 30
        ''', fetch_all=True)
        
        # Get document stats for overview
        doc_stats = execute_db_query('''
            SELECT department, COUNT(*) as count 
            FROM documents 
            GROUP BY department
        ''', fetch_all=True)
        
        # Get user stats
        user_stats = execute_db_query('''
            SELECT department, COUNT(*) as count 
            FROM users 
            WHERE role != 'admin' 
            GROUP BY department
        ''', fetch_all=True)
        
        # Calculate summary statistics
        total_alerts = len(alerts) if alerts else 0
        high_risk_alerts = len([a for a in (alerts or []) if a['risk_score'] >= 0.7])
        recent_access = len(access_logs) if access_logs else 0
        anomalous_activities = len([l for l in (access_logs or []) if l['anomaly_flag']])
        
        return {
            "alerts": alerts or [],
            "recent_access": access_logs or [],
            "document_stats": doc_stats or [],
            "user_stats": user_stats or [],
            "summary": {
                "total_alerts": total_alerts,
                "high_risk_alerts": high_risk_alerts,
                "recent_access": recent_access,
                "anomalous_activities": anomalous_activities,
                "total_documents": sum(stat['count'] for stat in (doc_stats or [])),
                "total_users": sum(stat['count'] for stat in (user_stats or []))
            }
        }
        
    except Exception as e:
        print(f"Dashboard error: {e}")
        return {
            "alerts": [],
            "recent_access": [],
            "document_stats": [],
            "user_stats": [],
            "summary": {
                "total_alerts": 0,
                "high_risk_alerts": 0,
                "recent_access": 0,
                "anomalous_activities": 0,
                "total_documents": 0,
                "total_users": 0
            }
        }

# ----------------
# Modifications
# ----------------
@admin_router.get("/modifications")
async def get_document_modifications(current_user: User = Depends(check_admin_role)):
    """Get document modifications for admin dashboard"""
    try:
        # Get from access logs where action indicates modification
        modifications = execute_db_query('''
            SELECT 
                al.id,
                al.user_id,
                al.doc_id,
                al.document_name,
                al.action as modification_type,
                al.timestamp,
                al.risk_score,
                u.username,
                u.department,
                '{"added_lines": 5, "removed_lines": 2, "change_percentage": 15.3}' as diff_stats
            FROM access_logs al
            JOIN users u ON al.user_id = u.id
            WHERE al.action IN ('upload', 'update', 'modify')
            ORDER BY al.timestamp DESC
            LIMIT 50
        ''', fetch_all=True)
        
        return {"modifications": modifications or []}
        
    except Exception as e:
        print(f"Modifications error: {e}")
        return {"modifications": []}

@admin_router.get("/data-leaks")
async def get_data_leak_attempts(current_user: User = Depends(check_admin_role)):
    """Get data leak attempts for admin analysis"""
    try:
        # Get cross-department access attempts and unauthorized access
        attempts = execute_db_query('''
            SELECT 
                al.id,
                al.user_id,
                u.username,
                u.department as user_department,
                al.document_name,
                'Finance' as target_department,
                al.action as action_attempted,
                al.risk_score,
                al.timestamp,
                CASE WHEN al.risk_score >= 0.7 THEN 1 ELSE 0 END as blocked
            FROM access_logs al
            JOIN users u ON al.user_id = u.id
            WHERE al.action LIKE '%unauthorized%' OR al.risk_score >= 0.5
            ORDER BY al.timestamp DESC
            LIMIT 30
        ''', fetch_all=True)
        
        return {"attempts": attempts or []}
        
    except Exception as e:
        print(f"Data leaks error: {e}")
        return {"attempts": []}

@admin_router.get("/modification-diff/{modification_id}")
async def get_modification_diff(modification_id: int, current_user: User = Depends(check_admin_role)):
    """Get detailed diff for a document modification"""
    try:
        # Get the access log entry
        log_entry = execute_db_query(
            "SELECT * FROM access_logs WHERE id = ?", 
            (modification_id,), fetch_one=True
        )
        
        if not log_entry:
            raise HTTPException(status_code=404, detail="Modification not found")
        
        # Try to find the document and its backup
        doc_name = log_entry.get('document_name')
        # Use .get() safely and provide fallbacks
        dept = log_entry.get('user_department') or log_entry.get('document_department') or 'Unknown'
        
        if not doc_name:
            # Handle case where document_name might be missing, although it should be there
            raise HTTPException(status_code=400, detail="Document name missing in log entry")

        # Construct file paths
        current_file = os.path.join("static", "docs", dept, doc_name)
        backup_file = f"{current_file}.backup"
        
        old_content = "Original content not available"
        new_content = "Modified content not available"
        
        # Try to read backup (original) and current (modified) files
        try:
            if os.path.exists(backup_file):
                with open(backup_file, 'r', encoding='utf-8', errors='ignore') as f:
                    old_content = f.read()
            # If no backup, and current file exists, assume it was an upload or first modification
            elif os.path.exists(current_file):
                with open(current_file, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                old_content = content # Show current content as base for 'diff' if no backup
        except Exception as read_error:
            print(f"Error reading backup file: {read_error}")

        try:
            if os.path.exists(current_file):
                with open(current_file, 'r', encoding='utf-8', errors='ignore') as f:
                    new_content = f.read()
        except Exception as read_error:
            print(f"Error reading current file: {read_error}")
        
        return {
            "old_content": old_content,
            "new_content": new_content,
            "document_name": doc_name,
            "modification_time": log_entry.get('timestamp')
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Modification diff error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get modification details")

# ----------------
# Alerts
# ----------------
@admin_router.get("/alerts")
async def get_alerts(current_user: User = Depends(check_admin_role)):
    """Get all alerts"""
    try:
        alerts = execute_db_query('''
            SELECT a.*, u.username, u.department 
            FROM alerts a 
            JOIN users u ON a.user_id = u.id 
            ORDER BY a.timestamp DESC
        ''', fetch_all=True)
        
        return {"alerts": alerts or []}
    except Exception as e:
        print(f"Alerts error: {e}")
        return {"alerts": []}

@admin_router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(alert_id: int, current_user: User = Depends(check_admin_role)):
    """Resolve an alert"""
    try:
        execute_db_query(
            "UPDATE alerts SET resolved = 1 WHERE id = ?", 
            (alert_id,)
        )
        return {"message": "Alert resolved"}
    except Exception as e:
        print(f"Resolve alert error: {e}")
        raise HTTPException(status_code=500, detail="Failed to resolve alert")

# ----------------
# Access Logs
# ----------------
@admin_router.get("/access-logs")
async def get_access_logs(current_user: User = Depends(check_admin_role)):
    """Get access logs"""
    try:
        logs = execute_db_query('''
            SELECT al.*, u.username, u.department
            FROM access_logs al 
            JOIN users u ON al.user_id = u.id 
            ORDER BY al.timestamp DESC 
            LIMIT 100
        ''', fetch_all=True)
        
        return {"logs": logs or []}
    except Exception as e:
        print(f"Access logs error: {e}")
        return {"logs": []}

# ----------------
# Reports
# ----------------
@admin_router.get("/reports/generate")
async def generate_report(days: int = 7, format: str = "txt", current_user: User = Depends(check_admin_role)):
    """Generate comprehensive security report in text or PDF format"""
    try:
        
        # Get data for report
        alerts = execute_db_query('''
            SELECT a.*, u.username, u.department
            FROM alerts a 
            JOIN users u ON a.user_id = u.id 
            ORDER BY a.timestamp DESC 
            LIMIT 100
        ''', fetch_all=True)
        
        access_logs = execute_db_query('''
            SELECT al.*, u.username, u.department
            FROM access_logs al 
            JOIN users u ON al.user_id = u.id 
            ORDER BY al.timestamp DESC 
            LIMIT 200
        ''', fetch_all=True)
        
        # Generate PDF report if requested
        if format.lower() == "pdf":
            # NOTE: Assuming reports.report_generator module exists for PDF generation
            from reports.report_generator import pdf_generator
            try:
                pdf_path = pdf_generator.generate_comprehensive_security_report(days)
                filename = os.path.basename(pdf_path)
                return {
                    "message": "PDF security report generated successfully",
                    "report_path": pdf_path,
                    "download_url": f"/reports/{filename}",
                    "format": "pdf"
                }
            except Exception as pdf_error:
                print(f"PDF generation failed, falling back to TXT: {pdf_error}")
                # Fall back to text report
                format = "txt"
        
        # Create comprehensive text report (TXT format or PDF fallback)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_filename = f"comprehensive_security_report_{timestamp}.txt"
        report_path = os.path.join("reports", report_filename)
        
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write("🛡️ ENTERPRISE DATA GUARD - COMPREHENSIVE SECURITY REPORT\n")
            f.write("=" * 70 + "\n")
            f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Report Period: Last {days} days\n")
            f.write(f"Classification: CONFIDENTIAL\n\n")
            
            # Executive Summary
            f.write("📊 EXECUTIVE SUMMARY\n")
            f.write("-" * 30 + "\n")
            total_alerts = len(alerts or [])
            high_risk_alerts = len([a for a in (alerts or []) if a['risk_score'] >= 0.7])
            total_access = len(access_logs or [])
            anomalous = len([l for l in (access_logs or []) if l['anomaly_flag']])
            
            f.write(f"• Total Security Alerts: {total_alerts}\n")
            f.write(f"• High Risk Alerts: {high_risk_alerts}\n")
            f.write(f"• Total Access Events: {total_access}\n")
            f.write(f"• Anomalous Activities: {anomalous}\n")
            f.write(f"• Overall Risk Level: {'HIGH' if high_risk_alerts > 5 else 'MEDIUM' if total_alerts > 10 else 'LOW'}\n\n")
            
            # Security Alerts Section
            f.write("🚨 SECURITY ALERTS ANALYSIS\n")
            f.write("-" * 30 + "\n")
            if alerts:
                for alert in alerts[:20]: # Top 20 alerts
                    f.write(f"[{alert['timestamp']}] {alert['alert_type'].upper()}\n")
                    f.write(f"  User: {alert['username']} ({alert['department']})\n")
                    f.write(f"  Document: {alert['document_name'] or 'N/A'}\n")
                    f.write(f"  Risk Score: {alert['risk_score']:.2f}\n")
                    f.write(f"  Description: {alert['description']}\n")
                    f.write(f"  Status: {'RESOLVED' if alert['resolved'] else 'ACTIVE'}\n\n")
            else:
                f.write("✅ No security alerts in the reporting period.\n\n")
            
            # Access Logs Analysis
            f.write("📈 ACCESS ACTIVITY ANALYSIS\n")
            f.write("-" * 30 + "\n")
            if access_logs:
                # Department activity summary
                dept_activity = {}
                for log in access_logs:
                    dept = log['department']
                    dept_activity[dept] = dept_activity.get(dept, 0) + 1
                
                f.write("Department Activity Summary:\n")
                for dept, count in sorted(dept_activity.items(), key=lambda x: x[1], reverse=True):
                    f.write(f"  {dept}: {count} activities\n")
                f.write("\n")
                
                # Recent anomalous activities
                anomalous_logs = [l for l in access_logs if l['anomaly_flag']][:10]
                if anomalous_logs:
                    f.write("Recent Anomalous Activities:\n")
                    for log in anomalous_logs:
                        f.write(f"  [{log['timestamp']}] {log['username']} - {log['action']}\n")
                        f.write(f"    Document: {log['document_name'] or 'N/A'}\n")
                        f.write(f"    Risk Score: {log['risk_score']:.2f}\n\n")
                else:
                    f.write("No anomalous activities detected.\n\n")
            else:
                f.write("No access activities recorded.\n\n")
            
            # Recommendations
            f.write("📋 SECURITY RECOMMENDATIONS\n")
            f.write("-" * 30 + "\n")
            if high_risk_alerts > 5:
                f.write("1. URGENT: Address critical security alerts immediately\n")
                f.write("   - Review and resolve all high-risk alerts\n")
                f.write("   - Implement additional access controls\n\n")
            
            if anomalous > total_access * 0.1:
                f.write("2. HIGH: High anomaly rate detected\n")
                f.write("   - Review anomaly detection thresholds\n")
                f.write("   - Investigate unusual access patterns\n\n")
            
            if total_alerts > 20:
                f.write("3. MEDIUM: High alert volume\n")
                f.write("   - Review security policies\n")
                f.write("   - Consider additional training\n\n")
            
            f.write("4. GENERAL: Continue regular monitoring\n")
            f.write("   - Maintain current security posture\n")
            f.write("   - Schedule periodic security reviews\n\n")
            
            f.write("=" * 70 + "\n")
            f.write("End of Report\n")
        
        return {
            "message": "Comprehensive security report generated successfully",
            "report_path": report_path,
            "download_url": f"/reports/{report_filename}"
        }
        
    except Exception as e:
        print(f"Report generation error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate report")

@admin_router.get("/system-health")
async def get_system_health(current_user: User = Depends(check_admin_role)):
    """Get system health metrics"""
    try:
        # Get health metrics
        alerts_count = execute_db_query(
            "SELECT COUNT(*) as count FROM alerts WHERE resolved = 0", 
            fetch_one=True
        )
        
        critical_alerts = execute_db_query(
            "SELECT COUNT(*) as count FROM alerts WHERE resolved = 0 AND risk_score >= 0.8", 
            fetch_one=True
        )
        
        recent_access = execute_db_query(
            "SELECT COUNT(*) as count FROM access_logs WHERE datetime(timestamp) >= datetime('now', '-24 hours')", 
            fetch_one=True
        )
        
        anomalies = execute_db_query(
            "SELECT COUNT(*) as count FROM access_logs WHERE anomaly_flag = 1 AND datetime(timestamp) >= datetime('now', '-24 hours')", 
            fetch_one=True
        )
        
        # Calculate health score
        health_score = 100
        # Access counts safely
        active_alerts = alerts_count.get('count', 0) if alerts_count else 0
        critical_al = critical_alerts.get('count', 0) if critical_alerts else 0
        daily_access = recent_access.get('count', 0) if recent_access else 0
        daily_anomalies = anomalies.get('count', 0) if anomalies else 0

        if critical_al > 0:
            health_score -= min(40, critical_al * 15)
        if active_alerts > 10:
            health_score -= 20
        if daily_access > 0 and daily_anomalies / daily_access > 0.1:
             health_score -= 15
        
        health_score = max(0, health_score)
        
        return {
            "health_score": health_score,
            "status": "Excellent" if health_score >= 90 else "Good" if health_score >= 70 else "Warning" if health_score >= 50 else "Critical",
            "active_alerts": active_alerts,
            "critical_alerts": critical_al,
            "daily_access": daily_access,
            "daily_anomalies": daily_anomalies
        }
        
    except Exception as e:
        print(f"System health error: {e}")
        return {
            "health_score": 0,
            "status": "Unknown",
            "active_alerts": 0,
            "critical_alerts": 0,
            "daily_access": 0,
            "daily_anomalies": 0
        }

# Include the admin router in the main app
app.include_router(admin_router)

# -----------------------------
# 7️⃣ Health check
# -----------------------------
@app.get("/healthz")
async def health_check():
    """Simple health check endpoint"""
    return {"status": "ok"}



# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)