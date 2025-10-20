// Database connection test script
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testConnection() {
    console.log('🔍 Testing database connection...\n');

    // Parse DATABASE_URL
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('❌ DATABASE_URL not found in .env file');
        return;
    }

    // Parse connection string
    // Format: mysql://username:password@host:port/database
    const regex = /mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
    const match = dbUrl.match(regex);

    if (!match) {
        console.error('❌ Invalid DATABASE_URL format');
        return;
    }

    const [, user, password, host, port, database] = match;

    console.log('📊 Connection details:');
    console.log(`   Host: ${host}`);
    console.log(`   Port: ${port}`);
    console.log(`   Database: ${database}`);
    console.log(`   User: ${user}`);
    console.log('');

    try {
        // Create connection
        const connection = await mysql.createConnection({
            host: host,
            port: parseInt(port),
            user: user,
            password: password,
            database: database.split('?')[0] // Remove query params if any
        });

        console.log('✅ Successfully connected to RDS!\n');

        // Test query - check tables
        const [tables] = await connection.execute('SHOW TABLES');
        console.log(`📋 Found ${tables.length} tables:`);
        tables.forEach(table => {
            const tableName = Object.values(table)[0];
            console.log(`   - ${tableName}`);
        });

        // Check if our tables exist
        const expectedTables = [
            'clinics', 'users', 'patients', 'xray_analyses',
            'landmarks', 'angle_measurements', 'analysis_history', 'export_logs'
        ];

        const existingTables = tables.map(t => Object.values(t)[0]);
        const missingTables = expectedTables.filter(t => !existingTables.includes(t));

        console.log('');
        if (missingTables.length > 0) {
            console.log('⚠️  Missing tables:');
            missingTables.forEach(t => console.log(`   - ${t}`));
            console.log('\n💡 Run the schema.sql file to create missing tables');
        } else {
            console.log('✅ All required tables exist!');

            // Check sample data
            const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
            const [clinics] = await connection.execute('SELECT COUNT(*) as count FROM clinics');

            console.log('\n📊 Data statistics:');
            console.log(`   - Users: ${users[0].count}`);
            console.log(`   - Clinics: ${clinics[0].count}`);
        }

        await connection.end();
        console.log('\n✅ Connection test completed successfully!');

    } catch (error) {
        console.error('❌ Connection failed:', error.message);
        console.log('\n🔧 Troubleshooting tips:');
        console.log('   1. Check if RDS instance is running');
        console.log('   2. Verify security group allows your IP (port 3306)');
        console.log('   3. Confirm credentials are correct');
        console.log('   4. Ensure database name exists');
    }
}

testConnection();