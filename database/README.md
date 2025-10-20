# KOCO X-ray Analysis Database Setup

## 📋 Prerequisites

- AWS RDS MySQL 8.0+ instance
- Database admin credentials
- MySQL client or workbench

## 🚀 Setup Instructions

### 1. Create RDS Instance

1. Log into AWS Console
2. Navigate to RDS → Create database
3. Select MySQL 8.0
4. Choose appropriate instance class (t3.micro for dev, t3.medium for prod)
5. Configure security group to allow connections from your IP

### 2. Create Database

Connect to your RDS instance and create the database:

```sql
CREATE DATABASE koco_xray CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Run Schema Script

Execute the schema script to create all tables:

```bash
mysql -h your-rds-endpoint.amazonaws.com -u admin -p koco_xray < database/schema.sql
```

### 4. Configure Environment Variables

Copy `.env.example` to `.env` and update with your RDS credentials:

```env
DATABASE_URL="mysql://admin:password@your-endpoint.amazonaws.com:3306/koco_xray"
```

### 5. Run Prisma Migrations

If using Prisma ORM:

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# Or run migrations
npx prisma migrate dev --name init
```

## 📊 Database Structure

### Main Tables

1. **clinics** - Hospital/clinic information
2. **users** - System users (doctors, staff)
3. **patients** - Patient records
4. **xray_analyses** - Main analysis records
5. **landmarks** - Landmark coordinates
6. **angle_measurements** - Calculated angles
7. **analysis_history** - Audit trail
8. **export_logs** - Export tracking

### Relationships

- Each analysis belongs to a user, clinic, and optionally a patient
- Landmarks and angles are linked to analyses
- Full audit trail with analysis_history

## 🔒 Security Considerations

1. Use IAM database authentication when possible
2. Encrypt database at rest
3. Enable automated backups
4. Configure security groups properly
5. Use SSL/TLS for connections
6. Implement proper user roles and permissions

## 🔧 Maintenance

### Backup Strategy

```sql
-- Create backup user
CREATE USER 'backup_user'@'%' IDENTIFIED BY 'secure_password';
GRANT SELECT, LOCK TABLES ON koco_xray.* TO 'backup_user'@'%';
```

### Monitoring

- Enable CloudWatch metrics
- Set up alarms for:
  - High CPU usage
  - Low storage space
  - Connection count

## 📝 Sample Queries

### Get analysis summary
```sql
SELECT * FROM v_analysis_summary
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY);
```

### Get user activity
```sql
SELECT u.username, COUNT(xa.id) as analysis_count
FROM users u
LEFT JOIN xray_analyses xa ON u.id = xa.user_id
GROUP BY u.id
ORDER BY analysis_count DESC;
```