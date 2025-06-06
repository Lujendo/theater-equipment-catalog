const { addQuantityToEquipment } = require('../migrations/add_quantity_to_equipment');

/**
 * Script to run the quantity migration
 * This adds the quantity column to the equipment table and updates the status enum
 */
async function runQuantityMigration() {
  try {
    console.log('🚀 Starting quantity migration script...');
    
    await addQuantityToEquipment();
    
    console.log('🎉 Quantity migration completed successfully!');
    console.log('');
    console.log('📋 Summary of changes:');
    console.log('  ✅ Added quantity column to equipment table (default: 1)');
    console.log('  ✅ Updated status enum to include "unavailable"');
    console.log('  ✅ Set equipment with quantity 0 to unavailable status');
    console.log('');
    console.log('🔄 Please restart your application to use the new quantity features.');
    
  } catch (error) {
    console.error('💥 Quantity migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runQuantityMigration()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script execution failed:', error);
    process.exit(1);
  });
