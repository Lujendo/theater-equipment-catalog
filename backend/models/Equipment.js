const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Equipment = sequelize.define('Equipment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  type_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'equipment_types',
      key: 'id'
    }
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'equipment_categories',
      key: 'id'
    }
  },
  reference_image_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'files',
      key: 'id'
    },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  model: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  serial_number: {
    type: DataTypes.STRING,
    allowNull: false,
    // Removed unique constraint to avoid database issues
    validate: {
      notEmpty: true
    }
  },
  status: {
    type: DataTypes.ENUM('available', 'in-use', 'maintenance', 'unavailable'),
    allowNull: false,
    defaultValue: 'available'
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 0,
      isInt: true
    }
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  location_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'equipment',
  timestamps: false,
  hooks: {
    beforeValidate: (equipment) => {
      // Convert empty string location_id to null
      if (equipment.location_id === '') {
        equipment.location_id = null;
      }

      // Convert empty string category_id to null
      if (equipment.category_id === '') {
        equipment.category_id = null;
      }
    },
    beforeUpdate: async (equipment) => {
      equipment.updated_at = new Date();

      // Log all changed fields for debugging
      const changedFields = equipment._changed;
      console.log('[EQUIPMENT HOOK] Changed fields:', JSON.stringify(changedFields));
      console.log('[EQUIPMENT HOOK] New values:', JSON.stringify(equipment.dataValues));

      // CRITICAL FIX: Always ensure location name is set when location_id is provided
      if (equipment.location_id) {
        try {
          const { Location } = require('./index');
          const locationRecord = await Location.findByPk(equipment.location_id);
          if (locationRecord && locationRecord.name) {
            console.log(`[EQUIPMENT HOOK] Found location record: ${locationRecord.name} for location_id: ${equipment.location_id}`);

            // Always update the location name to match the database record when location_id is provided
            // This is critical - we don't want to store the location name in the equipment table
            // as it should always be fetched from the locations table
            equipment.location = locationRecord.name;
            console.log(`[EQUIPMENT HOOK] Updated location name to: ${locationRecord.name}`);
          } else {
            console.log(`[EQUIPMENT HOOK] Warning: Location with ID ${equipment.location_id} not found in database`);
          }
        } catch (error) {
          console.error('[EQUIPMENT HOOK] Error fetching location name:', error);
        }
      } else {
        // If location_id is not provided but location is, we're using a custom location
        console.log(`[EQUIPMENT HOOK] Using custom location: ${equipment.location}`);
      }

      // Ensure category name is set when category_id is provided
      if (equipment.category_id) {
        try {
          const { Category } = require('./index');
          const categoryRecord = await Category.findByPk(equipment.category_id);
          if (categoryRecord && categoryRecord.name) {
            console.log(`[EQUIPMENT HOOK] Found category record: ${categoryRecord.name} for category_id: ${equipment.category_id}`);

            // Update the category name to match the database record when category_id is provided
            equipment.category = categoryRecord.name;
            console.log(`[EQUIPMENT HOOK] Updated category name to: ${categoryRecord.name}`);
          } else {
            console.log(`[EQUIPMENT HOOK] Warning: Category with ID ${equipment.category_id} not found in database`);
          }
        } catch (error) {
          console.error('[EQUIPMENT HOOK] Error fetching category name:', error);
        }
      } else {
        // If category_id is not provided but category is, we're using a custom category
        console.log(`[EQUIPMENT HOOK] Using custom category: ${equipment.category}`);
      }

      // ENHANCED: Handle quantity-based status logic first
      console.log(`[EQUIPMENT HOOK] Checking quantity: ${equipment.quantity}`);

      // If quantity is 0, set status to 'unavailable'
      if (equipment.quantity === 0) {
        console.log('[EQUIPMENT HOOK] Setting status to unavailable because quantity is 0');
        equipment.status = 'unavailable';
        return; // Skip location-based logic when unavailable
      }

      // ENHANCED: Automatically set status based on location (only if quantity > 0)
      // Always check location regardless of whether it changed
      console.log('[EQUIPMENT HOOK] Checking if status should be updated based on location.');
      console.log(`[EQUIPMENT HOOK] Current location: "${equipment.location}", location_id: ${equipment.location_id}`);

      // Check location name directly
      let isLager = false;

      // First check the direct location name (case insensitive)
      if (equipment.location && equipment.location.toLowerCase() === 'lager') {
        isLager = true;
      }

      console.log(`[EQUIPMENT HOOK] Is Lager location: ${isLager}`);

      // Set status based on location (only if not unavailable due to quantity)
      if (isLager) {
        // If location is Lager, always set status to 'available'
        console.log('[EQUIPMENT HOOK] Setting status to available because location is Lager');
        equipment.status = 'available';
      } else if ((equipment.location || equipment.location_id)) {
        // If location is not Lager, set status to 'in-use' (unless it's maintenance)
        if (equipment.status !== 'maintenance') {
          console.log('[EQUIPMENT HOOK] Setting status to in-use because location is not Lager');
          equipment.status = 'in-use';
        }
      }
    },
    beforeCreate: async (equipment) => {
      // Convert empty string location_id to null
      if (equipment.location_id === '') {
        equipment.location_id = null;
      }

      // Convert empty string category_id to null
      if (equipment.category_id === '') {
        equipment.category_id = null;
      }

      console.log('[EQUIPMENT HOOK] Creating new equipment. Checking location.');
      console.log(`[EQUIPMENT HOOK] Location: "${equipment.location}", location_id: ${equipment.location_id}`);

      // CRITICAL FIX: Always ensure location name is set when location_id is provided
      if (equipment.location_id) {
        try {
          const { Location } = require('./index');
          const locationRecord = await Location.findByPk(equipment.location_id);
          if (locationRecord && locationRecord.name) {
            console.log(`[EQUIPMENT HOOK] Found location record: ${locationRecord.name} for location_id: ${equipment.location_id}`);

            // Always update the location name to match the database record when location_id is provided
            // This is critical - we don't want to store the location name in the equipment table
            // as it should always be fetched from the locations table
            equipment.location = locationRecord.name;
            console.log(`[EQUIPMENT HOOK] Updated location name to: ${locationRecord.name}`);
          } else {
            console.log(`[EQUIPMENT HOOK] Warning: Location with ID ${equipment.location_id} not found in database`);
          }
        } catch (error) {
          console.error('[EQUIPMENT HOOK] Error fetching location name:', error);
        }
      } else {
        // If location_id is not provided but location is, we're using a custom location
        console.log(`[EQUIPMENT HOOK] Using custom location: ${equipment.location}`);
      }

      // Ensure category name is set when category_id is provided
      if (equipment.category_id) {
        try {
          const { Category } = require('./index');
          const categoryRecord = await Category.findByPk(equipment.category_id);
          if (categoryRecord && categoryRecord.name) {
            console.log(`[EQUIPMENT HOOK] Found category record: ${categoryRecord.name} for category_id: ${equipment.category_id}`);

            // Update the category name to match the database record when category_id is provided
            equipment.category = categoryRecord.name;
            console.log(`[EQUIPMENT HOOK] Updated category name to: ${categoryRecord.name}`);
          } else {
            console.log(`[EQUIPMENT HOOK] Warning: Category with ID ${equipment.category_id} not found in database`);
          }
        } catch (error) {
          console.error('[EQUIPMENT HOOK] Error fetching category name:', error);
        }
      } else {
        // If category_id is not provided but category is, we're using a custom category
        console.log(`[EQUIPMENT HOOK] Using custom category: ${equipment.category}`);
      }

      // ENHANCED: Handle quantity-based status logic first
      console.log(`[EQUIPMENT HOOK] Creating with quantity: ${equipment.quantity}`);

      // If quantity is 0, set status to 'unavailable'
      if (equipment.quantity === 0) {
        console.log('[EQUIPMENT HOOK] Setting status to unavailable because quantity is 0');
        equipment.status = 'unavailable';
        return; // Skip location-based logic when unavailable
      }

      // ENHANCED: Check location name directly (case insensitive) (only if quantity > 0)
      let isLager = false;

      // Check the direct location name
      if (equipment.location && equipment.location.toLowerCase() === 'lager') {
        isLager = true;
      }

      console.log(`[EQUIPMENT HOOK] Is Lager location: ${isLager}`);

      // Set status based on location (only if not unavailable due to quantity)
      if (isLager) {
        // If location is Lager, always set status to 'available'
        console.log('[EQUIPMENT HOOK] Setting status to available because location is Lager');
        equipment.status = 'available';
      } else if ((equipment.location || equipment.location_id)) {
        // If location is not Lager, set status to 'in-use' (unless it's maintenance)
        if (equipment.status !== 'maintenance') {
          console.log('[EQUIPMENT HOOK] Setting status to in-use because location is not Lager');
          equipment.status = 'in-use';
        }
      }
    }
  }
});

module.exports = Equipment;
