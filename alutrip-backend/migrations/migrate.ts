import fs from 'fs';
import path from 'path';
import { query, initializeDatabase } from '../src/config/database';
import { logger } from '../src/config/logger';

interface Migration {
  id: number;
  filename: string;
  content: string;
}

class MigrationRunner {
  private migrationsDir: string;

  constructor() {
    this.migrationsDir = path.join(__dirname);
  }

  // Create migrations table if it doesn't exist
  private async createMigrationsTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      )
    `;
    
    await query(sql);
    logger.info('Migrations table created or already exists');
  }

  // Get executed migrations from database
  private async getExecutedMigrations(): Promise<number[]> {
    const sql = 'SELECT id FROM migrations ORDER BY id';
    const result = await query(sql);
    type RowWithId = { id: number };
    const rows = result.rows as RowWithId[];
    return rows.map(row => row.id);
  }

  // Get all migration files
  private getMigrationFiles(): Migration[] {
    const files = fs.readdirSync(this.migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    return files.map(filename => {
      const [idPart] = filename.split('_');
      if (!idPart) {
        throw new Error(`Invalid migration filename: ${filename}`);
      }
      const id = Number.parseInt(idPart, 10);
      const content = fs.readFileSync(path.join(this.migrationsDir, filename), 'utf8');
      
      return { id, filename, content };
    });
  }

  // Execute a single migration
  private async executeMigration(migration: Migration): Promise<void> {
    try {
      logger.info(`Executing migration: ${migration.filename}`);
      
      // Execute the migration SQL
      await query(migration.content);
      
      // Record the migration as executed
      await query(
        'INSERT INTO migrations (id, filename) VALUES ($1, $2)',
        [migration.id, migration.filename]
      );
      
      logger.info(`Migration completed: ${migration.filename}`);
    } catch (error) {
      logger.error(`Migration failed: ${migration.filename}`, {
        error: (error as Error).message
      });
      throw error;
    }
  }

  // Run all pending migrations
  async runMigrations(): Promise<void> {
    try {
      logger.info('Starting database migrations');
      
      // Initialize database connection
      await initializeDatabase();
      
      // Create migrations table
      await this.createMigrationsTable();
      
      // Get executed migrations
      const executedMigrations = await this.getExecutedMigrations();
      
      // Get all migration files
      const allMigrations = this.getMigrationFiles();
      
      // Filter pending migrations
      const pendingMigrations = allMigrations.filter(
        migration => !executedMigrations.includes(migration.id)
      );
      
      if (pendingMigrations.length === 0) {
        logger.info('No pending migrations to execute');
        return;
      }
      
      logger.info(`Found ${pendingMigrations.length} pending migrations`);
      
      // Execute pending migrations
      for (const migration of pendingMigrations) {
        await this.executeMigration(migration);
      }
      
      logger.info(`Successfully executed ${pendingMigrations.length} migrations`);
      
    } catch (error) {
      logger.error('Migration process failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  // Rollback last migration (for development)
  async rollbackLastMigration(): Promise<void> {
    try {
      logger.info('Rolling back last migration');
      
      const lastMigrationResult = await query(
        'SELECT * FROM migrations ORDER BY id DESC LIMIT 1'
      );
      
      if (lastMigrationResult.rows.length === 0) {
        logger.info('No migrations to rollback');
        return;
      }
      
      const lastMigration = lastMigrationResult.rows[0];
      
      // Remove migration record
      await query('DELETE FROM migrations WHERE id = $1', [lastMigration.id]);
      
      logger.warn(`Rolled back migration: ${lastMigration.filename}`, {
        migrationId: lastMigration.id,
        warning: 'Manual database cleanup may be required'
      });
      
    } catch (error) {
      logger.error('Migration rollback failed', {
        error: (error as Error).message
      });
      throw error;
    }
  }

  // Get migration status
  async getMigrationStatus(): Promise<void> {
    try {
      await this.createMigrationsTable();
      
      const executedMigrations = await this.getExecutedMigrations();
      const allMigrations = this.getMigrationFiles();
      
      logger.info('Migration Status:');
      
      for (const migration of allMigrations) {
        const status = executedMigrations.includes(migration.id) ? 'EXECUTED' : 'PENDING';
        logger.info(`  ${migration.filename}: ${status}`);
      }
      
      const pending = allMigrations.filter(m => !executedMigrations.includes(m.id));
      logger.info(
        `Total migrations: ${allMigrations.length}, Executed: ${executedMigrations.length}, ` +
        `Pending: ${pending.length}`
      );
      
    } catch (error) {
      logger.error('Failed to get migration status', {
        error: (error as Error).message
      });
      throw error;
    }
  }
}

// CLI interface
const runner = new MigrationRunner();
const command: string = process.argv[2] ?? 'status';

async function main() {
  try {
    // Warn if running TypeScript in production environment
    const isProduction = process.env['NODE_ENV'] === 'production';
    const isTsRuntime = __filename.endsWith('.ts');
    if (isProduction && isTsRuntime) {
      logger.warn(
        'Running migrations from TypeScript in production environment is not recommended. ' +
        'Use compiled script instead (npm run build && npm run migrate).'
      );
    }

    switch (command) {
    case 'up':
      await runner.runMigrations();
      break;
    case 'down':
      await runner.rollbackLastMigration();
      break;
    case 'status':
      await runner.getMigrationStatus();
      break;
    default:
      console.log('Usage: npm run migrate [up|down|status]');
      console.log('  up     - Run all pending migrations');
      console.log('  down   - Rollback last migration');
      console.log('  status - Show migration status');
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    logger.error('Migration command failed', {
      command,
      error: (error as Error).message
    });
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { MigrationRunner };

