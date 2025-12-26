import mysql.connector 
from mysql.connector import Error
from typing import Optional, List, Dict, Any
from datetime import date

def create_connection():
    connection = None
    try:
        connection = mysql.connector.connect(
            host="127.0.0.1",
            port='3306',
            user="root",
            password="0000",
            database="lab",
            auth_plugin='mysql_native_password' 
        )
        print("Connection to MySQL DB successful")
    except Error as e:
        print(f"The error '{e}' occurred")
    return connection


# ============ PATIENT FUNCTIONS ============

def get_all_patients() -> List[Dict[str, Any]]:
    """Get all patients with secretary information"""
    try:
        conn = create_connection()
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT p.*, 
                   s.name as secretary_name,
                   (p.total_payment - p.remaining) as paid_amount
            FROM patients p 
            LEFT JOIN secertary s ON p.secertary_id = s.secertary_id
            ORDER BY p.patient_id DESC
        """
        cursor.execute(query)
        patients = cursor.fetchall()
        cursor.close()
        conn.close()
        return patients
    except Error as e:
        print(f"Error getting patients: {e}")
        return []


def get_patient_by_id(patient_id: int) -> Optional[Dict[str, Any]]:
    """Get single patient by ID"""
    try:
        conn = create_connection()
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT p.*, 
                   s.name as secretary_name,
                   (p.total_payment - p.remaining) as paid_amount
            FROM patients p 
            LEFT JOIN secertary s ON p.secertary_id = s.secertary_id
            WHERE p.patient_id = %s
        """
        cursor.execute(query, (patient_id,))
        patient = cursor.fetchone()
        cursor.close()
        conn.close()
        return patient
    except Error as e:
        print(f"Error getting patient: {e}")
        return None


def create_patient(name: str, age: int, phone: str, total_payment: int, secertary_id: int) -> Optional[int]:
    """Create new patient and return patient_id"""
    try:
        conn = create_connection()
        cursor = conn.cursor()
        query = """
            INSERT INTO patients (name, age, phone, total_payment, remaining, secertary_id) 
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (name, age, phone, total_payment, total_payment, secertary_id))
        conn.commit()
        patient_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return patient_id
    except Error as e:
        print(f"Error creating patient: {e}")
        return None


def update_patient(patient_id: int, name: str, age: int, phone: str, total_payment: int) -> bool:
    """Update patient information"""
    try:
        conn = create_connection()
        cursor = conn.cursor()
        
        # Get current remaining to calculate new remaining
        cursor.execute("SELECT total_payment, remaining FROM patients WHERE patient_id = %s", (patient_id,))
        result = cursor.fetchone()
        if result:
            old_total, old_remaining = result
            paid_amount = old_total - old_remaining
            new_remaining = total_payment - paid_amount
        else:
            new_remaining = total_payment
        
        query = """
            UPDATE patients 
            SET name = %s, age = %s, phone = %s, total_payment = %s, remaining = %s
            WHERE patient_id = %s
        """
        cursor.execute(query, (name, age, phone, total_payment, new_remaining, patient_id))
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Error as e:
        print(f"Error updating patient: {e}")
        return False


def delete_patient(patient_id: int) -> bool:
    """Delete patient by ID"""
    try:
        conn = create_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM patients WHERE patient_id = %s", (patient_id,))
        conn.commit()
        cursor.close()
        conn.close()
        return True
    except Error as e:
        print(f"Error deleting patient: {e}")
        return False


def update_payment(patient_id: int, payment_amount: float) -> Optional[float]:
    """Add payment and return new remaining balance"""
    try:
        conn = create_connection()
        cursor = conn.cursor()
        
        # Get current remaining
        cursor.execute("SELECT remaining FROM patients WHERE patient_id = %s", (patient_id,))
        result = cursor.fetchone()
        if not result:
            return None
        
        current_remaining = result[0]
        new_remaining = current_remaining - payment_amount
        
        cursor.execute("UPDATE patients SET remaining = %s WHERE patient_id = %s", 
                      (new_remaining, patient_id))
        conn.commit()
        cursor.close()
        conn.close()
        return new_remaining
    except Error as e:
        print(f"Error updating payment: {e}")
        return None


# ============ REPORT FUNCTIONS ============

def get_patients_without_reports() -> List[Dict[str, Any]]:
    """Get patients who don't have reports yet"""
    try:
        conn = create_connection()
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT p.*, s.name as secretary_name 
            FROM patients p 
            LEFT JOIN secertary s ON p.secertary_id = s.secertary_id
            LEFT JOIN report r ON p.patient_id = r.patient_id
            WHERE r.report_id IS NULL
            ORDER BY p.now_date DESC
        """
        cursor.execute(query)
        patients = cursor.fetchall()
        cursor.close()
        conn.close()
        return patients
    except Error as e:
        print(f"Error getting patients without reports: {e}")
        return []


def get_all_reports() -> List[Dict[str, Any]]:
    """Get all reports with patient information (Doctor only)"""
    try:
        conn = create_connection()
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT r.*, p.name as patient_name, p.age, p.phone, p.now_date
            FROM report r
            INNER JOIN patients p ON r.patient_id = p.patient_id
            ORDER BY r.report_id DESC
        """
        cursor.execute(query)
        reports = cursor.fetchall()
        cursor.close()
        conn.close()
        return reports
    except Error as e:
        print(f"Error getting reports: {e}")
        return []


def get_report_by_patient(patient_id: int) -> Optional[Dict[str, Any]]:
    """Get report for specific patient"""
    try:
        conn = create_connection()
        cursor = conn.cursor(dictionary=True)
        query = """
            SELECT r.*, p.name as patient_name, p.age, p.phone, p.now_date
            FROM report r
            INNER JOIN patients p ON r.patient_id = p.patient_id
            WHERE r.patient_id = %s
        """
        cursor.execute(query, (patient_id,))
        report = cursor.fetchone()
        cursor.close()
        conn.close()
        return report
    except Error as e:
        print(f"Error getting report: {e}")
        return None


def create_report(patient_id: int, wbc: float, rbc: float, hgb: float, hct: float,
                 mcv: float, mch: float, mchc: float, plt: float, diagnosis: str) -> Optional[int]:
    """Create new report and return report_id"""
    try:
        conn = create_connection()
        cursor = conn.cursor()
        query = """
            INSERT INTO report (patient_id, WBC, RBC, HGB, HCT, MCV, MCH, MCHC, PLT, Diagnosis) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        cursor.execute(query, (patient_id, wbc, rbc, hgb, hct, mcv, mch, mchc, plt, diagnosis))
        conn.commit()
        report_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return report_id
    except Error as e:
        print(f"Error creating report: {e}")
        return None


# ============ AUTHENTICATION FUNCTIONS ============

def authenticate_doctor(username: str, password: str) -> Optional[Dict[str, Any]]:
    """Authenticate doctor login"""
    try:
        conn = create_connection()
        cursor = conn.cursor(dictionary=True)
        query = "SELECT * FROM doctor WHERE username = %s AND password = %s"
        cursor.execute(query, (username, password))
        doctor = cursor.fetchone()
        cursor.close()
        conn.close()
        return doctor
    except Error as e:
        print(f"Error authenticating doctor: {e}")
        return None


# ============ SECRETARY FUNCTIONS ============

def get_all_secretaries() -> List[Dict[str, Any]]:
    """Get all secretaries"""
    try:
        conn = create_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM secertary ORDER BY secertary_id")
        secretaries = cursor.fetchall()
        cursor.close()
        conn.close()
        return secretaries
    except Error as e:
        print(f"Error getting secretaries: {e}")
        return []


def get_secretary_by_id(secretary_id: int) -> Optional[Dict[str, Any]]:
    """Get secretary by ID"""
    try:
        conn = create_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM secertary WHERE secertary_id = %s", (secretary_id,))
        secretary = cursor.fetchone()
        cursor.close()
        conn.close()
        return secretary
    except Error as e:
        print(f"Error getting secretary: {e}")
        return None


# ============ DASHBOARD STATS ============

def get_dashboard_stats() -> Dict[str, int]:
    """Get statistics for dashboard"""
    try:
        conn = create_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM patients")
        total_patients = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM report")
        total_reports = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT COUNT(*) FROM patients p 
            LEFT JOIN report r ON p.patient_id = r.patient_id 
            WHERE r.report_id IS NULL
        """)
        pending_reports = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        return {
            "total_patients": total_patients,
            "total_reports": total_reports,
            "pending_reports": pending_reports
        }
    except Error as e:
        print(f"Error getting dashboard stats: {e}")
        return {"total_patients": 0, "total_reports": 0, "pending_reports": 0}



















# def update_secretary(name):
#     try:
#         conn = create_connection()
#         cursor = conn.cursor()
#         cursor.execute("update secertary set name = %s where secertary_id = 1;", (name,))
#         conn.commit()
#         cursor.close()
#         conn.close()
#     except Error as e:
#         print(f"The error '{e}' occurred")


# def select_secretary():
#     try:
#         conn = create_connection()
#         cursor = conn.cursor(dictionary=True)
#         cursor.execute("select * from secertary;")

#         records = cursor.fetchall()
#         cursor.close()
#         conn.close()
#         return records
#     except Error as e:
#         print(f"The error '{e}' occurred")


# update_secretary("Anwar")

# print(select_secretary())
