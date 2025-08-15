## Enterprise Data Guard: Secure Document Management System

-----

### Project Overview

**Enterprise Data Guard** is a robust and secure document management system designed to protect sensitive organizational data. It features a comprehensive backend built with **FastAPI** for secure API endpoints and an interactive frontend developed with **React**. The system integrates advanced security measures, including **JWT-based authentication**, **role-based access control**, **file integrity monitoring**, and **machine learning-powered anomaly detection** to identify and alert on suspicious activities.

This solution ensures that critical documents are managed securely, access is tightly controlled, and any unusual behavior is immediately flagged, providing a strong defense against insider threats and unauthorized data access.

### Key Features

  * **🔐 User Authentication & Authorization**: Secure login using JWT (JSON Web Tokens) with distinct roles (User, Admin) and role-based access control to documents and functionalities.
  * **📁 Secure Document Management**:
      * **Upload/Download**: Users can securely upload and download documents relevant to their department.
      * **Departmental Access**: Documents are categorized by department, ensuring users can only access files from their authorized departments.
      * **File Integrity Monitoring**: Automatically detects if a document has been tampered with outside the system by comparing file hashes.
  * **🤖 ML-Powered Anomaly Detection**:
      * Utilizes **Isolation Forest** and **K-Means clustering** to analyze user access patterns (time, action type, department).
      * Generates **risk scores** for each activity and flags **anomalous behavior** in real-time.
  * **📊 Real-time Monitoring & Alerting**:
      * **Admin Dashboard**: Provides administrators with a centralized view of system activities, including recent access logs and security alerts.
      * **Security Alerts**: Automated alerts are generated for suspicious activities such as unauthorized access attempts, document tampering, and unusual upload patterns.
  * **📈 Comprehensive Reporting**:
      * **Security Reports**: Admins can generate detailed PDF reports summarizing security incidents, alert statistics, and access patterns over a specified period.
      * **Document Diff Reports**: Provides visual HTML and PDF reports detailing changes between document versions, highlighting added/removed lines.
  * **🛡️ Robust Backend**: Built with FastAPI for high performance, ease of use, and automatic API documentation (Swagger UI).
  * **🎨 Intuitive Frontend**: A responsive React application provides a seamless user experience for document management and security monitoring.

-----

### Project Structure

```
enterprise-data-guard/
│
├── backend/
│   ├── app.py                     # Main FastAPI application
│   ├── db.py                      # Database initialization and utility functions (SQLite)
│   ├── requirements.txt           # Python dependencies
│   ├── auth/                      # User authentication and authorization module
│   │   ├── __init__.py
│   │   ├── routes.py              # Authentication API routes (login, register, user details)
│   │   ├── auth_utils.py          # Password hashing, JWT token creation/verification
│   │   └── models.py              # Pydantic models for user data
│   ├── documents/                 # Document management module
│   │   ├── __init__.py
│   │   ├── routes.py              # Document API routes (list, download, upload, delete)
│   │   ├── versioning.py          # File hashing, diffing, and backup utilities
│   │   └── access_log.py          # Functions for logging access and creating alerts
│   ├── anomaly/                   # Anomaly detection module
│   │   ├── __init__.py
│   │   ├── ml_models.py           # Machine learning models (IsolationForest, KMeans)
│   │   └── analyzer.py            # Logic for analyzing access patterns and generating risk scores
│   ├── reports/                   # Reporting module
│   │   ├── __init__.py
│   │   ├── report_generator.py    # Generates PDF security and document diff reports
│   │   └── diff_utils.py          # Utilities for generating HTML diffs and change statistics
│   └── static/                    # Static files served by FastAPI
│       └── docs/
│           ├── HR/
│           │   └── salary_policy_v1.txt
│           ├── Finance/
│           │   └── tax_rules_2024.txt
│           ├── Legal/
│           │   └── nda_contract_template.txt
│           └── uploads/           # Directory for user uploads
│
├── frontend/
│   ├── package.json               # Node.js dependencies for React app
│   ├── public/                    # Public assets (index.html, favicon)
│   │   └── index.html             # Main HTML file for the React app
│   └── src/                       # React source code
│       ├── App.js                 # Main React component, handles routing
│       ├── index.js               # React app entry point
│       ├── pages/                 # React page components
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── UserDashboard.jsx
│       │   ├── AdminDashboard.jsx
│       │   └── ReportView.jsx
│       └── components/            # Reusable React components
│           ├── UploadForm.jsx
│           ├── AlertBox.jsx
│           └── DiffViewer.jsx
│
├── datasets/                      # Sample data for initial setup (not used by app directly after init)
│   ├── sample_users.csv
│   ├── document_versions.csv
│   └── sample_access_logs.csv
│
├── run.sh                         # Script to set up and run both backend and frontend
└── README.md                      # Project documentation (this file)
```

-----

### Getting Started

Follow these steps to set up and run the Enterprise Data Guard system on your local machine.

#### Prerequisites

Before you begin, ensure you have the following installed:

1.  **Python 3.8+**:
      * [Download Python](https://www.python.org/downloads/)
2.  **Node.js 14+**:
      * [Download Node.js](https://nodejs.org/en/download/)
3.  **Git** (optional, for cloning the repository):
      * [Download Git](https://git-scm.com/downloads)

#### Setup Steps

1.  **Clone the repository (or create project directory manually):**

    ```bash
    git clone <repository-url> enterprise-data-guard
    cd enterprise-data-guard
    ```

    *If you prefer to set up manually, create the `enterprise-data-guard` directory and then follow the project structure to create subdirectories and files as provided in the problem statement.*

2.  **Set up the Backend:**

    Navigate to the `backend` directory, create a virtual environment, install dependencies, and initialize the database.

    ```bash
    cd backend
    python3 -m venv venv           # Create a virtual environment
    source venv/bin/activate       # Activate the virtual environment (on Windows: `venv\Scripts\activate`)
    pip install -r requirements.txt # Install Python dependencies
    python db.py                   # Initialize the SQLite database with sample data
    python app.py
    ```

3.  **Set up the Frontend:**

    Navigate to the `frontend` directory and install Node.js dependencies.

    ```bash
    cd ../frontend
    npm install                    # Install Node.js dependencies
    npm start
    ```

4.  **Make the `run.sh` script executable (Linux/macOS only):**

    ```bash
    cd .. # Go back to the root directory
    chmod +x run.sh
    ```

5.  **Start the System:**

    You can start both the backend and frontend simultaneously using the provided `run.sh` script (recommended for Linux/macOS):

    ```bash
    ./run.sh
    ```

    **Manual Startup (Alternative for all OS):**
    If the `run.sh` script doesn't work or if you're on Windows, you can start the backend and frontend separately in two different terminal windows:

    **Terminal 1 - Backend:**

    ```bash
    cd backend
    source venv/bin/activate # On Windows: `venv\Scripts\activate`
    uvicorn app:app --reload --host 0.0.0.0 --port 8000
    ```

    **Terminal 2 - Frontend:**

    ```bash
    cd frontend
    npm start
    ```

-----

### Access the System

Once the servers are running, you can access the application:

  * **Frontend Application**: [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000)
  * **Backend API**: [http://localhost:8000](https://www.google.com/search?q=http://localhost:8000)
  * **API Documentation (Swagger UI)**: [http://localhost:8000/docs](https://www.google.com/search?q=http://localhost:8000/docs)

### Demo Login Credentials

You can use these credentials to explore the system's functionalities:

  * **👨‍💼 Admin**:
      * Username: `admin`
      * Password: `admin123`
  * **👤 HR User**:
      * Username: `john_hr`
      * Password: `password123`
  * **👤 Finance User**:
      * Username: `sarah_finance`
      * Password: `password123`
  * **👤 Legal User**:
      * Username: `mike_legal`
      * Password: `password123`

-----

### Key Features to Test

  * **User Authentication**: Log in with different user roles (`admin`, `john_hr`, `sarah_finance`, `mike_legal`) to observe role-based access.
  * **Document Upload**:
      * As `john_hr`, try uploading a new document to the "HR" department.
      * As `john_hr`, try uploading a document to the "Finance" department and observe the access denied alert.
  * **Document Download**:
      * As `sarah_finance`, download `tax_rules_2024.txt`.
      * As `john_hr`, try downloading `tax_rules_2024.txt` (from Finance) and note the access denial and alert generation.
  * **Admin Dashboard**: Log in as `admin` and:
      * Review the "Security Alerts" tab for unauthorized access attempts and other incidents.
      * Check the "Access Logs" tab for a detailed history of user activities.
      * Click "Generate Report" to create a PDF summary of security events.
  * **Anomaly Detection**: Perform several rapid actions (e.g., multiple downloads or uploads) as a non-admin user to potentially trigger "suspicious activity" alerts.
  * **Document Tampering**:
    1.  Download a document (e.g., `salary_policy_v1.txt`).
    2.  Manually open and modify the downloaded file on your system (e.g., add a line of text).
    3.  Upload the modified file, overwriting the original.
    4.  Observe if a "tampering\_detected" alert is generated in the Admin Dashboard.
  * **Document Deletion**: As an admin, try deleting a document and observe the "document\_deletion" alert.

-----

### Development Notes

  * **Backend**: Developed using FastAPI, SQLite for the database, and `scikit-learn` for ML models.
  * **Frontend**: Developed with React, `axios` for API calls, and basic CSS for styling.
  * **Database**: SQLite is used for simplicity. The `db.py` script initializes the database and populates it with sample users and documents on startup (clearing previous data for a clean slate).
  * **Timezones**: All timestamps throughout the backend are consistently handled in Indian Standard Time (IST) using the `pytz` library for accurate local logging and display.
  * **Security**: While robust for a demo, a production system would require more advanced security hardening, comprehensive testing, and potentially a more scalable database solution.

-----

Enjoy exploring the Enterprise Data Guard\!