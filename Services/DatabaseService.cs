using Dapper;
using HemaSense.Models;
using MySql.Data.MySqlClient;
using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;

namespace HemaSense.Services
{
    /// <summary>
    /// Database service – direct equivalent of database/database.py.
    /// </summary>
    public class DatabaseService
    {
        private readonly string _connectionString;

        public DatabaseService(string connectionString)
        {
            _connectionString = connectionString;
        }

        private IDbConnection CreateConnection() =>
            new MySqlConnection(_connectionString);

        // ─────────────────────────────────────────────────────────────
        // PATIENT
        // ─────────────────────────────────────────────────────────────

        public async Task<IEnumerable<Patient>> GetAllPatientsAsync()
        {
            const string sql = """
                SELECT p.patient_id       AS PatientId,
                       p.name             AS Name,
                       p.age              AS Age,
                       p.phone            AS Phone,
                       p.total_payment    AS TotalPayment,
                       p.remaining        AS Remaining,
                       p.secertary_id     AS SecretaryId,
                       p.now_date         AS NowDate,
                       s.name             AS SecretaryName
                FROM patients p
                LEFT JOIN secertary s ON p.secertary_id = s.secertary_id
                where p.now_date = @NowDate
                ORDER BY p.patient_id DESC
                """;
            using var conn = CreateConnection();
            return await conn.QueryAsync<Patient>(sql, new { NowDate = DateTime.Now.ToString("yyyy-MM-dd") });
        }

        public async Task<IEnumerable<Patient>> GetPagedPatientsAsync(int offset, int limit)
        {
            const string sql = """
                SELECT p.patient_id       AS PatientId,
                       p.name             AS Name,
                       p.age              AS Age,
                       p.phone            AS Phone,
                       p.total_payment    AS TotalPayment,
                       p.remaining        AS Remaining,
                       p.secertary_id     AS SecretaryId,
                       p.now_date         AS NowDate,
                       s.name             AS SecretaryName
                FROM patients p
                LEFT JOIN secertary s ON p.secertary_id = s.secertary_id
                ORDER BY p.patient_id DESC
                LIMIT @Limit OFFSET @Offset
                """;
            using var conn = CreateConnection();
            return await conn.QueryAsync<Patient>(sql, new { Limit = limit, Offset = offset });
        }

        public async Task<IEnumerable<Patient>> SearchPatientsAsync(string query, int limit = 20)
        {
            bool isId = int.TryParse(query.Trim(), out int patientId);
            string sql;
            object param;

            if (isId)
            {
                sql = """
                    SELECT p.patient_id       AS PatientId,
                           p.name             AS Name,
                           p.age              AS Age,
                           p.phone            AS Phone,
                           p.total_payment    AS TotalPayment,
                           p.remaining        AS Remaining,
                           p.secertary_id     AS SecretaryId,
                           p.now_date         AS NowDate,
                           s.name             AS SecretaryName
                    FROM patients p
                    LEFT JOIN secertary s ON p.secertary_id = s.secertary_id
                    WHERE p.patient_id = @PatientId
                    ORDER BY p.patient_id DESC
                    LIMIT @Limit
                    """;
                param = new { PatientId = patientId, Limit = limit };
            }
            else
            {
                sql = """
                    SELECT p.patient_id       AS PatientId,
                           p.name             AS Name,
                           p.age              AS Age,
                           p.phone            AS Phone,
                           p.total_payment    AS TotalPayment,
                           p.remaining        AS Remaining,
                           p.secertary_id     AS SecretaryId,
                           p.now_date         AS NowDate,
                           s.name             AS SecretaryName
                    FROM patients p
                    LEFT JOIN secertary s ON p.secertary_id = s.secertary_id
                    WHERE p.name LIKE @Name
                    ORDER BY p.patient_id DESC
                    LIMIT @Limit
                    """;
                param = new { Name = "%" + query.Trim() + "%", Limit = limit };
            }

            using var conn = CreateConnection();
            return await conn.QueryAsync<Patient>(sql, param);
        }

        public async Task<Patient?> GetPatientByIdAsync(int patientId)
        {
            const string sql = """
                SELECT p.patient_id       AS PatientId,
                       p.name             AS Name,
                       p.age              AS Age,
                       p.phone            AS Phone,
                       p.total_payment    AS TotalPayment,
                       p.remaining        AS Remaining,
                       p.secertary_id     AS SecretaryId,
                       p.now_date         AS NowDate,
                       s.name             AS SecretaryName
                FROM patients p
                LEFT JOIN secertary s ON p.secertary_id = s.secertary_id
                WHERE p.patient_id = @PatientId
                """;
            using var conn = CreateConnection();
            return await conn.QueryFirstOrDefaultAsync<Patient>(sql, new { PatientId = patientId });
        }

        public async Task<int> CreatePatientAsync(Patient patient)
        {
            const string sql = """
                INSERT INTO patients (name, age, phone, total_payment, remaining, secertary_id)
                VALUES (@Name, @Age, @Phone, @TotalPayment, @TotalPayment, @SecretaryId);
                SELECT LAST_INSERT_ID();
                """;
            using var conn = CreateConnection();
            return await conn.ExecuteScalarAsync<int>(sql, new
            {
                patient.Name,
                patient.Age,
                patient.Phone,
                patient.TotalPayment,
                patient.SecretaryId
            });
        }

        public async Task<bool> UpdatePatientAsync(Patient patient)
        {
            // Preserve paid amount when changing total
            const string fetchSql = "SELECT total_payment, remaining FROM patients WHERE patient_id = @Id";
            const string updateSql = """
                UPDATE patients
                SET name = @Name, age = @Age, phone = @Phone,
                    total_payment = @TotalPayment, remaining = @Remaining
                WHERE patient_id = @PatientId
                """;
            using var conn = CreateConnection();
            var row = await conn.QueryFirstOrDefaultAsync<(decimal total, decimal remaining)>(
                fetchSql, new { Id = patient.PatientId });

            decimal paidAmount = row.total - row.remaining;
            decimal newRemaining = patient.TotalPayment - paidAmount;

            int rows = await conn.ExecuteAsync(updateSql, new
            {
                patient.Name,
                patient.Age,
                patient.Phone,
                patient.TotalPayment,
                Remaining = newRemaining,
                patient.PatientId
            });
            return rows > 0;
        }

        public async Task<bool> DeletePatientAsync(int patientId)
        {
            using var conn = CreateConnection();
            int rows = await conn.ExecuteAsync(
                "DELETE FROM patients WHERE patient_id = @PatientId",
                new { PatientId = patientId });
            return rows > 0;
        }

        public async Task<decimal?> UpdatePaymentAsync(int patientId, decimal amount)
        {
            using var conn = CreateConnection();
            var current = await conn.ExecuteScalarAsync<decimal?>(
                "SELECT remaining FROM patients WHERE patient_id = @Id",
                new { Id = patientId });

            if (current is null) return null;

            decimal newRemaining = current.Value - amount;
            await conn.ExecuteAsync(
                "UPDATE patients SET remaining = @Remaining WHERE patient_id = @Id",
                new { Remaining = newRemaining, Id = patientId });

            return newRemaining;
        }

        // ─────────────────────────────────────────────────────────────
        // REPORTS
        // ─────────────────────────────────────────────────────────────

        public async Task<IEnumerable<Patient>> GetPatientsWithoutReportsAsync()
        {
            const string sql = """
                SELECT p.patient_id    AS PatientId,
                       p.name          AS Name,
                       p.age           AS Age,
                       p.phone         AS Phone,
                       p.total_payment AS TotalPayment,
                       p.remaining     AS Remaining,
                       p.secertary_id  AS SecretaryId,
                       p.now_date      AS NowDate,
                       s.name          AS SecretaryName
                FROM patients p
                LEFT JOIN secertary s ON p.secertary_id = s.secertary_id
                LEFT JOIN report r    ON p.patient_id   = r.patient_id
                WHERE r.report_id IS NULL
                ORDER BY p.now_date DESC
                """;
            using var conn = CreateConnection();
            return await conn.QueryAsync<Patient>(sql);
        }

        public async Task<IEnumerable<Report>> GetAllReportsAsync()
        {
            const string sql = """
                SELECT r.report_id     AS ReportId,
                       r.patient_id    AS PatientId,
                       r.WBC, r.RBC, r.HGB, r.HCT,
                       r.MCV, r.MCH, r.MCHC, r.PLT,
                       r.Diagnosis,
                       p.name          AS PatientName,
                       p.age           AS PatientAge,
                       p.phone         AS PatientPhone,
                       p.now_date      AS PatientDate
                FROM report r
                INNER JOIN patients p ON r.patient_id = p.patient_id
                ORDER BY r.report_id DESC
                """;
            using var conn = CreateConnection();
            return await conn.QueryAsync<Report>(sql);
        }

        public async Task<Report?> GetReportByPatientAsync(int patientId)
        {
            const string sql = """
                SELECT r.report_id     AS ReportId,
                       r.patient_id    AS PatientId,
                       r.WBC, r.RBC, r.HGB, r.HCT,
                       r.MCV, r.MCH, r.MCHC, r.PLT,
                       r.Diagnosis,
                       p.name          AS PatientName,
                       p.age           AS PatientAge,
                       p.phone         AS PatientPhone,
                       p.now_date      AS PatientDate
                FROM report r
                INNER JOIN patients p ON r.patient_id = p.patient_id
                WHERE r.patient_id = @PatientId
                """;
            using var conn = CreateConnection();
            return await conn.QueryFirstOrDefaultAsync<Report>(sql, new { PatientId = patientId });
        }

        public async Task<int> CreateReportAsync(Report report)
        {
            const string sql = """
                INSERT INTO report (patient_id, WBC, RBC, HGB, HCT, MCV, MCH, MCHC, PLT, Diagnosis)
                VALUES (@PatientId, @WBC, @RBC, @HGB, @HCT, @MCV, @MCH, @MCHC, @PLT, @Diagnosis);
                SELECT LAST_INSERT_ID();
                """;
            using var conn = CreateConnection();
            return await conn.ExecuteScalarAsync<int>(sql, report);
        }

        public async Task<Report?> GetReportByIdAsync(int reportId)
        {
            const string sql = """
                SELECT r.report_id     AS ReportId,
                       r.patient_id    AS PatientId,
                       r.WBC, r.RBC, r.HGB, r.HCT,
                       r.MCV, r.MCH, r.MCHC, r.PLT,
                       r.Diagnosis,
                       p.name          AS PatientName,
                       p.age           AS PatientAge,
                       p.phone         AS PatientPhone,
                       p.now_date      AS PatientDate
                FROM report r
                INNER JOIN patients p ON r.patient_id = p.patient_id
                WHERE r.report_id = @ReportId
                """;
            using var conn = CreateConnection();
            return await conn.QueryFirstOrDefaultAsync<Report>(sql, new { ReportId = reportId });
        }

        public async Task<bool> UpdateReportAsync(Report report)
        {
            const string sql = """
                UPDATE report
                SET WBC       = @WBC,
                    RBC       = @RBC,
                    HGB       = @HGB,
                    HCT       = @HCT,
                    MCV       = @MCV,
                    MCH       = @MCH,
                    MCHC      = @MCHC,
                    PLT       = @PLT,
                    Diagnosis = @Diagnosis
                WHERE report_id = @ReportId
                """;
            using var conn = CreateConnection();
            int rows = await conn.ExecuteAsync(sql, report);
            return rows > 0;
        }

        // ─────────────────────────────────────────────────────────────
        // AUTHENTICATION
        // ─────────────────────────────────────────────────────────────

        public async Task<Doctor?> AuthenticateDoctorAsync(string username, string password)
        {
            const string sql = """
                SELECT doctor_id AS DoctorId, name AS Name,
                       username AS Username, password AS Password
                FROM doctor
                WHERE username = @Username AND password = @Password
                """;
            using var conn = CreateConnection();
            return await conn.QueryFirstOrDefaultAsync<Doctor>(sql, new { Username = username, Password = password });
        }

        // ─────────────────────────────────────────────────────────────
        // SECRETARIES
        // ─────────────────────────────────────────────────────────────

        public async Task<IEnumerable<Secretary>> GetAllSecretariesAsync()
        {
            const string sql = "SELECT secertary_id AS SecretaryId, name AS Name FROM secertary ORDER BY secertary_id";
            using var conn = CreateConnection();
            return await conn.QueryAsync<Secretary>(sql);
        }

        public async Task<Secretary?> GetSecretaryByIdAsync(int secretaryId)
        {
            const string sql = "SELECT secertary_id AS SecretaryId, name AS Name FROM secertary WHERE secertary_id = @Id";
            using var conn = CreateConnection();
            return await conn.QueryFirstOrDefaultAsync<Secretary>(sql, new { Id = secretaryId });
        }

        // Secretary login (match by name, as in original Python code)
        public async Task<Secretary?> AuthenticateSecretaryAsync(string username, string password)
        {
             const string sql = """
                SELECT secertary_id AS SecretaryId, name AS Name,
                       username AS Username, password AS Password
                FROM secertary
                WHERE username = @Username AND password = @Password
                """;
            using var conn = CreateConnection();
            return await conn.QueryFirstOrDefaultAsync<Secretary>(sql, new { Username = username, Password = password });
        }

        // Secretary CRUD
        public async Task<Secretary?> GetSecretaryWithCredsByIdAsync(int id)
        {
            const string sql = """
                SELECT secertary_id AS SecretaryId, name AS Name,
                       username AS Username, password AS Password
                FROM secertary WHERE secertary_id = @Id
                """;
            using var conn = CreateConnection();
            return await conn.QueryFirstOrDefaultAsync<Secretary>(sql, new { Id = id });
        }

        public async Task<int> CreateSecretaryAsync(Secretary s)
        {
            const string sql = """
                INSERT INTO secertary (name, username, password)
                VALUES (@Name, @Username, @Password);
                SELECT LAST_INSERT_ID();
                """;
            using var conn = CreateConnection();
            return await conn.ExecuteScalarAsync<int>(sql, s);
        }

        public async Task<bool> UpdateSecretaryAsync(Secretary s)
        {
            const string sql = """
                UPDATE secertary
                SET name = @Name, username = @Username, password = @Password
                WHERE secertary_id = @SecretaryId
                """;
            using var conn = CreateConnection();
            return await conn.ExecuteAsync(sql, s) > 0;
        }

        public async Task<bool> DeleteSecretaryAsync(int id)
        {
            using var conn = CreateConnection();
            return await conn.ExecuteAsync(
                "DELETE FROM secertary WHERE secertary_id = @Id", new { Id = id }) > 0;
        }

        // ─────────────────────────────────────────────────────────────
        // DOCTORS CRUD
        // ─────────────────────────────────────────────────────────────

        public async Task<IEnumerable<Doctor>> GetAllDoctorsAsync()
        {
            const string sql = """
                SELECT doctor_id AS DoctorId, name AS Name,
                       username AS Username, password AS Password
                FROM doctor ORDER BY doctor_id
                """;
            using var conn = CreateConnection();
            return await conn.QueryAsync<Doctor>(sql);
        }

        public async Task<Doctor?> GetDoctorByIdAsync(int id)
        {
            const string sql = """
                SELECT doctor_id AS DoctorId, name AS Name,
                       username AS Username, password AS Password
                FROM doctor WHERE doctor_id = @Id
                """;
            using var conn = CreateConnection();
            return await conn.QueryFirstOrDefaultAsync<Doctor>(sql, new { Id = id });
        }

        public async Task<int> CreateDoctorAsync(Doctor d)
        {
            const string sql = """
                INSERT INTO doctor (name, username, password)
                VALUES (@Name, @Username, @Password);
                SELECT LAST_INSERT_ID();
                """;
            using var conn = CreateConnection();
            return await conn.ExecuteScalarAsync<int>(sql, d);
        }

        public async Task<bool> UpdateDoctorAsync(Doctor d)
        {
            const string sql = """
                UPDATE doctor
                SET name = @Name, username = @Username, password = @Password
                WHERE doctor_id = @DoctorId
                """;
            using var conn = CreateConnection();
            return await conn.ExecuteAsync(sql, d) > 0;
        }

        public async Task<bool> DeleteDoctorAsync(int id)
        {
            using var conn = CreateConnection();
            return await conn.ExecuteAsync(
                "DELETE FROM doctor WHERE doctor_id = @Id", new { Id = id }) > 0;
        }

        // ─────────────────────────────────────────────────────────────
        // DASHBOARD STATS
        // ─────────────────────────────────────────────────────────────

        public async Task<DashboardStats> GetDashboardStatsAsync()
        {
            var today = DateTime.Now.ToString("yyyy-MM-dd");
            using var conn = CreateConnection();

            int totalPatients = await conn.ExecuteScalarAsync<int>("""
                SELECT COUNT(*) FROM patients
                WHERE DATE(now_date) = @Today
                """, new { Today = today });

            int totalReports = await conn.ExecuteScalarAsync<int>("""
                SELECT COUNT(*) FROM report r
                INNER JOIN patients p ON r.patient_id = p.patient_id
                WHERE DATE(p.now_date) = @Today
                """, new { Today = today });

            int pending = await conn.ExecuteScalarAsync<int>("""
                SELECT COUNT(*) FROM patients p
                LEFT JOIN report r ON p.patient_id = r.patient_id
                WHERE r.report_id IS NULL
                  AND DATE(p.now_date) = @Today
                """, new { Today = today });

            return new DashboardStats
            {
                TotalPatients  = totalPatients,
                TotalReports   = totalReports,
                PendingReports = pending
            };
        }
    }
}
