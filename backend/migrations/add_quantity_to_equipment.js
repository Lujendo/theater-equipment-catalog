const { sequelize } = require('../config/database');

/**
 * Migration to add quantity column to equipment table
 * This migration adds quantity tracking functionality to the equipment system
 */
async function addQuantityToEquipment() {
  try {
    console.log('🔄 Starting migration: Add quantity column to equipment table');

    // Check if quantity column already exists
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'equipment' 
      AND COLUMN_NAME = 'quantity'
    `);

    if (results.length > 0) {
      console.log('✅ Quantity column already exists in equipment table');
      return;
    }

    // Add quantity column
    await sequelize.query(`
      ALTER TABLE equipment 
      ADD COLUMN quantity INT NOT NULL DEFAULT 1 
      COMMENT 'Number of items (0 = unavailable, default = 1)'
    `);

    console.log('✅ Added quantity column to equipment table');

    // Update status enum to include 'unavailable'
    console.log('🔄 Updating status enum to include unavailable...');
    
    // Check current enum values
    const [enumResults] = await sequelize.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'equipment' 
      AND COLUMN_NAME = 'status'
    `);

    if (enumResults.length > 0) {
      const currentEnum = enumResults[0].COLUMN_TYPE;
      console.log('Current status enum:', currentEnum);

      // Check if 'unavailable' is already in the enum
      if (!currentEnum.includes('unavailable')) {
        await sequelize.query(`
          ALTER TABLE equipment 
          MODIFY COLUMN status ENUM('available', 'in-use', 'maintenance', 'unavailable') 
          NOT NULL DEFAULT 'available'
        `);
        console.log('✅ Updated status enum to include unavailable');
      } else {
        console.log('✅ Status enum already includes unavailable');
      }
    }

    // Set any equipment with quantity 0 to unavailable status
    const [updateResults] = await sequelize.query(`
      UPDATE equipment 
      SET status = 'unavailable' 
      WHERE quantity = 0 AND status != 'unavailable'
    `);

    console.log(`✅ Updated ${updateResults.affectedRows || 0} equipment records with quantity 0 to unavailable status`);

    console.log('✅ Migration completed successfully: Add quantity column to equipment table');

  } catch (error) {
    console.error('❌ Migration failed: Add quantity column to equipment table');
    console.error('Error details:', error);
    throw error;
  }
}

/**
 * Rollback migration - remove quantity column
 */
async function rollbackQuantityFromEquipment() {
  try {
    console.log('🔄 Starting rollback: Remove quantity column from equipment table');

    // Check if quantity column exists
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'equipment' 
      AND COLUMN_NAME = 'quantity'
    `);

    if (results.length === 0) {
      console.log('✅ Quantity column does not exist in equipment table');
      return;
    }

    // Remove quantity column
    await sequelize.query(`
      ALTER TABLE equipment 
      DROP COLUMN quantity
    `);

    console.log('✅ Removed quantity column from equipment table');

    // Revert status enum to original values
    await sequelize.query(`
      ALTER TABLE equipment 
      MODIFY COLUMN status ENUM('available', 'in-use', 'maintenance') 
      NOT NULL DEFAULT 'available'
    `);

    console.log('✅ Reverted status enum to original values');

    console.log('✅ Rollback completed successfully: Remove quantity column from equipment table');

  } catch (error) {
    console.error('❌ Rollback failed: Remove quantity column from equipment table');
    console.error('Error details:', error);
    throw error;
  }
}

// Export functions for use in other scripts
module.exports = {
  addQuantityToEquipment,
  rollbackQuantityFromEquipment
};

// Run migration if this file is executed directly
if (require.main === module) {
  addQuantityToEquipment()
    .then(() => {
      console.log('🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}
