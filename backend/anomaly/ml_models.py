# backend/anomaly/ml_models.py

from sklearn.ensemble import IsolationForest
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
import pandas as pd
import numpy as np
from typing import List, Dict, Tuple
import pickle
import os
from datetime import datetime
import pytz # Import pytz

INDIA_TIMEZONE = pytz.timezone('Asia/Kolkata') # Define Indian timezone

class AnomalyDetector:
    def __init__(self):
        self.isolation_forest = IsolationForest(contamination=0.1, random_state=42)
        self.kmeans = KMeans(n_clusters=3, random_state=42)
        self.scaler = StandardScaler()
        self.is_trained = False
        
    def prepare_features(self, access_logs: List[Dict]) -> pd.DataFrame:
        """Prepare features for ML models"""
        df = pd.DataFrame(access_logs)
        
        if df.empty:
            return pd.DataFrame()
        
        # Convert timestamp to datetime objects, coercing errors to NaT
        df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce', format='mixed')

        # Drop rows where timestamp couldn't be parsed
        df.dropna(subset=['timestamp'], inplace=True)
        
        # Function to convert individual datetime object to IST
        def convert_to_ist(dt_obj):
            if dt_obj.tzinfo is None:
                # If naive, assume UTC and localize, then convert
                return pytz.utc.localize(dt_obj).astimezone(INDIA_TIMEZONE)
            else:
                # If already timezone-aware, just convert
                return dt_obj.astimezone(INDIA_TIMEZONE)

        # Apply the conversion function to the timestamp series
        df['timestamp'] = df['timestamp'].apply(convert_to_ist)

        df['hour'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        
        # Create binary features for actions
        actions = df['action'].unique()
        for action in actions:
            df[f'action_{action}'] = (df['action'] == action).astype(int)
        
        # Department mismatch feature (if available)
        if 'department' in df.columns and 'user_department' in df.columns:
            df['dept_mismatch'] = (df['department'] != df['user_department']).astype(int)
        else:
            df['dept_mismatch'] = 0 
        
        # Select features for ML
        feature_cols = ['user_id', 'hour', 'day_of_week', 'dept_mismatch'] + \
                       [col for col in df.columns if col.startswith('action_')]
        
        # Ensure all feature columns exist, fill missing with 0
        for col in feature_cols:
            if col not in df.columns:
                df[col] = 0
        
        return df[feature_cols].fillna(0) # fillna(0) for any remaining NaNs
    
    def train(self, access_logs: List[Dict]):
        """Train anomaly detection models"""
        features_df = self.prepare_features(access_logs)
        
        if features_df.empty or len(features_df) < 10:
            print("Insufficient data for training")
            return
        
        # Scale features
        features_scaled = self.scaler.fit_transform(features_df)
        
        # Train models
        self.isolation_forest.fit(features_scaled)
        self.kmeans.fit(features_scaled)
        
        self.is_trained = True
        
        # Save models
        self.save_models()
    
    def predict_anomaly(self, access_log: Dict) -> Tuple[bool, float]:
        """Predict if access log is anomalous"""
        if not self.is_trained:
            self.load_models()
            
        if not self.is_trained:
            return False, 0.0
        
        # Prepare features
        features_df = self.prepare_features([access_log])
        if features_df.empty:
            return False, 0.0
        
        features_scaled = self.scaler.transform(features_df)
        
        # Isolation Forest prediction
        anomaly_score = self.isolation_forest.decision_function(features_scaled)[0]
        is_anomaly = self.isolation_forest.predict(features_scaled)[0] == -1
        
        # Convert anomaly score to risk score (0-1)
        risk_score = max(0, min(1, (0.5 - anomaly_score) / 1.0))
        
        return is_anomaly, risk_score
    
    def save_models(self):
        """Save trained models to disk"""
        models_dir = "models"
        os.makedirs(models_dir, exist_ok=True)
        
        with open(os.path.join(models_dir, "isolation_forest.pkl"), "wb") as f:
            pickle.dump(self.isolation_forest, f)
        
        with open(os.path.join(models_dir, "kmeans.pkl"), "wb") as f:
            pickle.dump(self.kmeans, f)
        
        with open(os.path.join(models_dir, "scaler.pkl"), "wb") as f:
            pickle.dump(self.scaler, f)
    
    def load_models(self):
        """Load trained models from disk"""
        models_dir = "models"
        
        try:
            with open(os.path.join(models_dir, "isolation_forest.pkl"), "rb") as f:
                self.isolation_forest = pickle.load(f)
            
            with open(os.path.join(models_dir, "kmeans.pkl"), "rb") as f:
                self.kmeans = pickle.load(f)
            
            with open(os.path.join(models_dir, "scaler.pkl"), "rb") as f:
                self.scaler = pickle.load(f)
            
            self.is_trained = True
        except FileNotFoundError:
            print("No trained models found")

# Global anomaly detector instance
anomaly_detector = AnomalyDetector()