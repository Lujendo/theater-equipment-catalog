const express = require('express');
const { Op } = require('sequelize');
const { Equipment, File, Location, sequelize } = require('../models');
const { authenticate, restrictTo, isAdvancedOrAdmin } = require('../middleware/auth');
const { upload, processImages, MAX_FILES } = require('../middleware/upload');
const path = require('path');
const fs = require('fs').promises;
const equipmentLogService = require('../services/equipmentLogService');

const router = express.Router();

// Get all equipment with pagination and filters
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      category,
      brand,
      status,
      location_id,
      search,
      sortBy = 'updated_at',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build filter conditions
    const where = {};

    if (type) where.type = type;
    if (category) where.category = category;
    if (brand) where.brand = brand;
    if (status) where.status = status;
    if (location_id) where.location_id = location_id;

    if (search) {
      where[Op.or] = [
        { type: { [Op.like]: `%${search}%` } },
        { category: { [Op.like]: `%${search}%` } },
        { brand: { [Op.like]: `%${search}%` } },
        { model: { [Op.like]: `%${search}%` } },
        { serial_number: { [Op.like]: `%${search}%` } },
        { location: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    // Validate sortBy field to prevent SQL injection
    const validSortFields = ['updated_at', 'created_at', 'brand', 'model', 'type', 'category', 'status', 'location', 'serial_number'];
    const orderField = validSortFields.includes(sortBy) ? sortBy : 'updated_at';

    // Validate sortOrder
    const orderDirection = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    // Get equipment with count
    const { count, rows } = await Equipment.findAndCountAll({
      where,
      include: [
        {
          model: File,
          as: 'files',
          attributes: ['id', 'file_type', 'file_name', 'file_path']
        },
        {
          model: Location,
          as: 'locationDetails',
          attributes: ['id', 'name', 'street', 'postal_code', 'city', 'region', 'country']
        },
        {
          model: require('../models').Category,
          as: 'categoryDetails',
          attributes: ['id', 'name', 'description']
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[orderField, orderDirection]]
    });

    res.json({
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      equipment: rows
    });
  } catch (error) {
    console.error('Get equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Lookup equipment by serial number
router.get('/lookup', authenticate, async (req, res) => {
  try {
    const { serial_number } = req.query;

    if (!serial_number) {
      return res.status(400).json({ message: 'Serial number is required' });
    }

    const equipment = await Equipment.findOne({
      where: { serial_number: serial_number },
      attributes: ['id', 'type', 'brand', 'model', 'serial_number', 'status', 'location']
    });

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    res.json(equipment);
  } catch (error) {
    console.error('Equipment lookup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get equipment by ID
router.get('/:id', authenticate, async (req, res) => {
  try {
    const equipment = await Equipment.findByPk(req.params.id, {
      include: [
        {
          model: File,
          as: 'files',
          attributes: ['id', 'file_type', 'file_name', 'file_path']
        },
        {
          model: Location,
          as: 'locationDetails',
          attributes: ['id', 'name', 'street', 'postal_code', 'city', 'region', 'country']
        },
        {
          model: require('../models').Category,
          as: 'categoryDetails',
          attributes: ['id', 'name', 'description']
        }
      ]
    });

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // If we have location details, make sure the location field is set
    if (equipment.locationDetails && equipment.locationDetails.name) {
      equipment.location = equipment.locationDetails.name;
    }

    res.json(equipment);
  } catch (error) {
    console.error('Get equipment by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create new equipment with files (admin and advanced users only)
router.post('/', authenticate, restrictTo('admin', 'advanced'), upload.fields([
  { name: 'files', maxCount: MAX_FILES },
  { name: 'referenceImage', maxCount: 1 }
]), processImages, async (req, res) => {
  try {
    const {
      type_id,
      category,
      category_id,
      brand,
      model,
      serial_number,
      status,
      location,
      location_id,
      description,
      reference_image_id,
      quantity
    } = req.body;

    // Validate required fields
    if (!type_id || !brand || !model || !serial_number) {
      return res.status(400).json({
        message: 'Type, brand, model, and serial number are required'
      });
    }

    // Check if serial number already exists
    const existingEquipment = await Equipment.findOne({
      where: { serial_number }
    });

    if (existingEquipment) {
      return res.status(400).json({
        message: 'Equipment with this serial number already exists'
      });
    }

    // Get the type name from the type_id
    const { EquipmentType } = require('../models');
    const equipmentType = await EquipmentType.findByPk(type_id);

    if (!equipmentType) {
      return res.status(400).json({
        message: 'Invalid equipment type'
      });
    }

    // Prepare equipment data
    let locationName = location;

    // If location_id is provided, fetch the location name
    let autoStatus = 'available';
    if (location_id) {
      try {
        const { Location } = require('../models');
        const locationRecord = await Location.findByPk(location_id);
        if (locationRecord) {
          locationName = locationRecord.name;

          // ENHANCED: Check if location is Lager and set status accordingly
          // Always check case-insensitively
          if (locationRecord.name.toLowerCase() === 'lager') {
            console.log(`[EQUIPMENT CREATE] Location is Lager, setting status to available`);
            autoStatus = 'available';
          } else {
            console.log(`[EQUIPMENT CREATE] Location is not Lager (${locationRecord.name}), setting status to in-use`);
            autoStatus = 'in-use';
          }
        }
      } catch (error) {
        console.error('Error fetching location name:', error);
      }
    } else if (location && location !== '') {
      // ENHANCED: If direct location name is provided, check if it's Lager (case-insensitive)
      if (location.toLowerCase() === 'lager') {
        console.log(`[EQUIPMENT CREATE] Custom location is Lager, setting status to available`);
        autoStatus = 'available';
      } else {
        console.log(`[EQUIPMENT CREATE] Custom location is not Lager (${location}), setting status to in-use`);
        autoStatus = 'in-use';
      }
    }

    // Parse and validate quantity
    let equipmentQuantity = 1; // Default quantity
    if (quantity !== undefined && quantity !== null && quantity !== '') {
      equipmentQuantity = parseInt(quantity, 10);
      if (isNaN(equipmentQuantity) || equipmentQuantity < 0) {
        return res.status(400).json({
          message: 'Quantity must be a non-negative integer'
        });
      }
    }

    const equipmentData = {
      type: equipmentType.name,
      type_id: type_id,
      category,
      category_id: category_id || null,
      brand,
      model,
      serial_number,
      status: status || autoStatus, // Use provided status or auto-determined status
      location: locationName,
      location_id: location_id || null,
      description,
      quantity: equipmentQuantity
    };

    // Only add reference_image_id if it's not empty
    if (reference_image_id && reference_image_id !== '' && reference_image_id !== 'new') {
      equipmentData.reference_image_id = reference_image_id;
    }

    // Create equipment
    const equipment = await Equipment.create(equipmentData);

    // Log the equipment creation
    await equipmentLogService.logCreation(equipment.id, req.user.id, equipmentData);

    // Debug: Log all received files
    console.log('[EQUIPMENT CREATE] req.files:', req.files ? Object.keys(req.files) : 'No files');
    if (req.files) {
      Object.keys(req.files).forEach(key => {
        console.log(`[EQUIPMENT CREATE] ${key}:`, req.files[key].length, 'files');
      });
    }
    // Debug: Log all received files
    console.log('[EQUIPMENT CREATE] req.files:', req.files ? Object.keys(req.files) : 'No files');
    if (req.files) {
      Object.keys(req.files).forEach(key => {
        console.log(`[EQUIPMENT CREATE] ${key}:`, req.files[key].length, 'files');
      });
    }
    console.log('[EQUIPMENT CREATE] req.body.reference_image_id:', req.body.reference_image_id);
    // Handle file uploads if any
    let createdFiles = [];

    // Process regular files
    if (req.files && req.files.files && req.files.files.length > 0) {
      console.log(`Processing ${req.files.files.length} regular files for equipment`);

      const fileRecords = req.files.files.map(file => {
        // Get file type from mimetype
        let fileType = 'image';
        if (file.mimetype.startsWith('audio/')) {
          fileType = 'audio';
        } else if (file.mimetype === 'application/pdf') {
          fileType = 'pdf';
        }

        // Normalize file path for Docker environment
        const normalizedPath = file.path.replace(/\\/g, '/');

        // Get thumbnail path if available (for images)
        let thumbnailPath = null;
        if (fileType === 'image' && file.thumbnailPath) {
          thumbnailPath = file.thumbnailPath.replace(/\\/g, '/');
          console.log(`Found thumbnail for ${file.originalname}: ${thumbnailPath}`);
        }

        console.log(`File saved at: ${normalizedPath}`);
        if (thumbnailPath) {
          console.log(`Thumbnail saved at: ${thumbnailPath}`);
        }

        return {
          equipment_id: equipment.id,
          file_type: fileType,
          file_path: normalizedPath,
          file_name: file.originalFilename || file.originalname,
          thumbnail_path: thumbnailPath
        };
      });

      createdFiles = await File.bulkCreate(fileRecords);
    }

    // Debug: Check for reference image
    console.log('[EQUIPMENT CREATE] Checking for reference image...');
    console.log('[EQUIPMENT CREATE] req.files.referenceImage:', req.files?.referenceImage ? 'Present' : 'Not found');
    // Debug: Check for reference image
    console.log('[EQUIPMENT CREATE] Checking for reference image...');
    console.log('[EQUIPMENT CREATE] req.files.referenceImage:', req.files?.referenceImage ? 'Present' : 'Not found');
    // Process reference image if provided
    if (req.files && req.files.referenceImage && req.files.referenceImage.length > 0) {
      const referenceImageFile = req.files.referenceImage[0];

      // Normalize file path for Docker environment
      const normalizedPath = referenceImageFile.path.replace(/\\/g, '/');
      console.log(`Reference image saved at: ${normalizedPath}`);

      // Create file record for reference image
      const referenceFileRecord = await File.create({
        equipment_id: equipment.id,
        file_type: 'image',
        file_path: normalizedPath,
        file_name: referenceImageFile.originalname
      });

      // Update equipment with the reference image ID
      await equipment.update({
        reference_image_id: referenceFileRecord.id
      });

      console.log(`Set reference_image_id to ${referenceFileRecord.id}`);
    }

    // Get equipment with files
    const equipmentWithFiles = await Equipment.findByPk(equipment.id, {
      include: [
        {
          model: File,
          as: 'files',
          attributes: ['id', 'file_type', 'file_name', 'file_path']
        }
      ]
    });

    res.status(201).json(equipmentWithFiles);
  } catch (error) {
    console.error('Create equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update equipment (admin and advanced users only)
router.put('/:id', authenticate, restrictTo('admin', 'advanced'), upload.fields([
  { name: 'files', maxCount: MAX_FILES },
  { name: 'referenceImage', maxCount: 1 }
]), processImages, async (req, res) => {
  try {
    const {
      type_id,
      category,
      category_id,
      brand,
      model,
      serial_number,
      status,
      location,
      location_id,
      description,
      reference_image_id,
      location_id_is_null,
      type_id_is_null,
      category_id_is_null,
      quantity
    } = req.body;

    // Find equipment
    const equipment = await Equipment.findByPk(req.params.id);

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Check if serial number already exists (if changed)
    if (serial_number && serial_number !== equipment.serial_number) {
      const existingEquipment = await Equipment.findOne({
        where: { serial_number }
      });

      if (existingEquipment) {
        return res.status(400).json({
          message: 'Equipment with this serial number already exists'
        });
      }
    }

    // Get the type name from the type_id if provided
    let typeName = equipment.type;
    let typeId = equipment.type_id;

    if (type_id) {
      try {
        const { EquipmentType } = require('../models');
        const equipmentType = await EquipmentType.findByPk(type_id);

        if (!equipmentType) {
          return res.status(400).json({
            message: 'Invalid equipment type'
          });
        }

        typeName = equipmentType.name;
        typeId = parseInt(type_id, 10);
      } catch (err) {
        console.error('Error finding equipment type:', err);
        return res.status(400).json({
          message: 'Error processing equipment type'
        });
      }
    }

    // Parse and validate quantity
    let equipmentQuantity = equipment.quantity; // Keep existing quantity by default
    if (quantity !== undefined && quantity !== null && quantity !== '') {
      equipmentQuantity = parseInt(quantity, 10);
      if (isNaN(equipmentQuantity) || equipmentQuantity < 0) {
        return res.status(400).json({
          message: 'Quantity must be a non-negative integer'
        });
      }
    }

    // Prepare update data
    const updateData = {
      type: typeName,
      type_id: type_id_is_null === 'true' ? null : typeId,
      category: category !== undefined ? category : equipment.category,
      category_id: category_id_is_null === 'true' ? null : (category_id !== undefined ? category_id : equipment.category_id),
      brand: brand || equipment.brand,
      model: model || equipment.model,
      serial_number: serial_number || equipment.serial_number,
      status: status || equipment.status,
      location: location !== undefined ? location : equipment.location,
      location_id: location_id_is_null === 'true' ? null : (location_id !== undefined ? location_id : equipment.location_id),
      description: description !== undefined ? description : equipment.description,
      quantity: equipmentQuantity
    };

    // ALWAYS handle location and location_id together to ensure consistency
    console.log(`[EQUIPMENT UPDATE] Processing location data: location_id=${location_id}, location=${location}`);

    // Case 1: If location_id is provided (not null, not undefined, not empty string)
    if (location_id) {
      try {
        const { Location } = require('../models');
        const locationRecord = await Location.findByPk(location_id);
        if (locationRecord) {
          // Always set the location name from the database record
          updateData.location = locationRecord.name;
          console.log(`[EQUIPMENT UPDATE] Setting location name to: ${locationRecord.name} from location_id: ${location_id}`);

          // ENHANCED: Check if location is Lager and update status accordingly
          // Always check case-insensitively
          if (locationRecord.name.toLowerCase() === 'lager') {
            console.log(`[EQUIPMENT UPDATE] Location is Lager, setting status to available`);
            updateData.status = 'available';
          } else if (updateData.status !== 'maintenance') {
            console.log(`[EQUIPMENT UPDATE] Location is not Lager (${locationRecord.name}), setting status to in-use`);
            updateData.status = 'in-use';
          }
        } else {
          console.log(`[EQUIPMENT UPDATE] Warning: Location with ID ${location_id} not found in database`);
        }
      } catch (error) {
        console.error('[EQUIPMENT UPDATE] Error fetching location name:', error);
      }
    }
    // Case 2: If location_id is explicitly empty or null, but location has a value (custom location)
    else if ((location_id === '' || location_id === null) && location) {
      console.log(`[EQUIPMENT UPDATE] Using custom location name: ${location}`);
      updateData.location = location;

      // ENHANCED: Check if custom location is Lager and update status accordingly
      // Always check case-insensitively and handle all cases
      if (location.toLowerCase() === 'lager') {
        console.log(`[EQUIPMENT UPDATE] Custom location is Lager, setting status to available`);
        updateData.status = 'available';
      } else if (updateData.status !== 'maintenance') {
        console.log(`[EQUIPMENT UPDATE] Custom location is not Lager (${location}), setting status to in-use`);
        updateData.status = 'in-use';
      }
    }
    // Case 3: If both location_id and location are empty/null
    else if ((location_id === '' || location_id === null) && (location === '' || location === null || location === undefined)) {
      console.log('[EQUIPMENT UPDATE] Both location_id and location are empty, clearing location');
      updateData.location = '';
    }
    // Case 4: If location_id is undefined but location has a value
    else if (location_id === undefined && location !== undefined) {
      console.log(`[EQUIPMENT UPDATE] Using provided location name: ${location}`);
      updateData.location = location;
    }

    // Handle reference_image_id separately to avoid empty string issues
    if (reference_image_id !== undefined) {
      if (reference_image_id === '' || reference_image_id === null) {
        updateData.reference_image_id = null;
      } else {
        updateData.reference_image_id = reference_image_id;
      }
    }

    console.log('Updating equipment with data:', updateData);

    // Store old data for logging
    const oldData = {
      type: equipment.type,
      brand: equipment.brand,
      model: equipment.model,
      serial_number: equipment.serial_number,
      status: equipment.status,
      location: equipment.location
    };

    // Log the update data for debugging
    console.log('[EQUIPMENT UPDATE] Final update data:', JSON.stringify(updateData));

    // Update equipment
    await equipment.update(updateData);

    // Log the equipment update
    await equipmentLogService.logUpdate(equipment.id, req.user.id, oldData, updateData);

    // Handle file deletions if any
    try {
      let filesToDelete = [];
      if (req.body.filesToDelete) {
        try {
          filesToDelete = JSON.parse(req.body.filesToDelete);
          console.log('Files to delete:', filesToDelete);
        } catch (parseError) {
          console.error('Error parsing filesToDelete:', parseError);
          // If it's not valid JSON, try to use it as is if it's an array
          if (Array.isArray(req.body.filesToDelete)) {
            filesToDelete = req.body.filesToDelete;
          }
        }
      }

      if (filesToDelete && filesToDelete.length > 0) {
        // Find files to delete
        const files = await File.findAll({
          where: {
            id: { [Op.in]: filesToDelete },
            equipment_id: equipment.id
          }
        });

        console.log(`Found ${files.length} files to delete`);

        // Delete files from storage
        for (const file of files) {
          try {
            await fs.unlink(file.file_path);
            console.log(`Deleted file ${file.file_path}`);
          } catch (err) {
            console.error(`Failed to delete file ${file.file_path}:`, err);
            // Continue even if file deletion fails
          }
        }

        // Delete file records from database
        const deleteResult = await File.destroy({
          where: {
            id: { [Op.in]: filesToDelete },
            equipment_id: equipment.id
          }
        });

        console.log(`Deleted ${deleteResult} file records from database`);
      }
    } catch (fileDeleteError) {
      console.error('Error handling file deletions:', fileDeleteError);
      // Continue with the request even if file deletion fails
    }

    // Debug: Log all received files
    console.log('[EQUIPMENT CREATE] req.files:', req.files ? Object.keys(req.files) : 'No files');
    if (req.files) {
      Object.keys(req.files).forEach(key => {
        console.log(`[EQUIPMENT CREATE] ${key}:`, req.files[key].length, 'files');
      });
    }
    // Handle file uploads if any
    let createdFiles = [];

    // Process regular files
    if (req.files && req.files.files && req.files.files.length > 0) {
      console.log(`Processing ${req.files.files.length} regular files for equipment update`);

      const fileRecords = req.files.files.map(file => {
        // Get file type from mimetype
        let fileType = 'image';
        if (file.mimetype.startsWith('audio/')) {
          fileType = 'audio';
        } else if (file.mimetype === 'application/pdf') {
          fileType = 'pdf';
        }

        // Normalize file path for Docker environment
        const normalizedPath = file.path.replace(/\\/g, '/');

        // Get thumbnail path if available (for images)
        let thumbnailPath = null;
        if (fileType === 'image' && file.thumbnailPath) {
          thumbnailPath = file.thumbnailPath.replace(/\\/g, '/');
          console.log(`Found thumbnail for ${file.originalname}: ${thumbnailPath}`);
        }

        console.log(`File saved at: ${normalizedPath}`);
        if (thumbnailPath) {
          console.log(`Thumbnail saved at: ${thumbnailPath}`);
        }

        return {
          equipment_id: equipment.id,
          file_type: fileType,
          file_path: normalizedPath,
          file_name: file.originalFilename || file.originalname,
          thumbnail_path: thumbnailPath
        };
      });

      createdFiles = await File.bulkCreate(fileRecords);
    }

    // Debug: Check for reference image
    console.log('[EQUIPMENT CREATE] Checking for reference image...');
    console.log('[EQUIPMENT CREATE] req.files.referenceImage:', req.files?.referenceImage ? 'Present' : 'Not found');
    // Process reference image if provided
    if (req.files && req.files.referenceImage && req.files.referenceImage.length > 0) {
      try {
        const referenceImageFile = req.files.referenceImage[0];

        // Normalize file path for Docker environment
        const normalizedPath = referenceImageFile.path.replace(/\\/g, '/');
        console.log(`Reference image saved at: ${normalizedPath}`);

        // Create file record for reference image
        const referenceFileRecord = await File.create({
          equipment_id: equipment.id,
          file_type: 'image',
          file_path: normalizedPath,
          file_name: referenceImageFile.originalname
        });

        // Update equipment with the reference image ID
        // Use direct SQL to avoid issues with empty location_id
        await sequelize.query(
          'UPDATE equipment SET reference_image_id = ? WHERE id = ?',
          {
            replacements: [referenceFileRecord.id, equipment.id],
            type: sequelize.QueryTypes.UPDATE
          }
        );

        console.log(`Set reference_image_id to ${referenceFileRecord.id}`);
      } catch (error) {
        console.error('Error processing reference image:', error);
        throw error;
      }
    } else if (req.body.removeReferenceImage === 'true') {
      // If removeReferenceImage flag is set, clear the reference image
      try {
        // Use direct SQL to avoid issues with empty location_id
        await sequelize.query(
          'UPDATE equipment SET reference_image_id = NULL WHERE id = ?',
          {
            replacements: [equipment.id],
            type: sequelize.QueryTypes.UPDATE
          }
        );

        console.log('Removed reference image');
      } catch (error) {
        console.error('Error removing reference image:', error);
        throw error;
      }
    }

    // Get updated equipment with files
    const updatedEquipment = await Equipment.findByPk(equipment.id, {
      include: [
        {
          model: File,
          as: 'files',
          attributes: ['id', 'file_type', 'file_name', 'file_path']
        }
      ]
    });

    res.json(updatedEquipment);
  } catch (error) {
    console.error('Update equipment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete equipment (admin and advanced users only)
router.delete('/:id', authenticate, restrictTo('admin', 'advanced'), async (req, res) => {
  let transaction = null;

  try {
    console.log(`[EQUIPMENT] DELETE request for equipment ID: ${req.params.id}`);

    // Start a transaction
    transaction = await sequelize.transaction();

    // Find equipment with files
    const equipment = await Equipment.findByPk(req.params.id, {
      include: [
        {
          model: File,
          as: 'files',
          attributes: ['id', 'file_type', 'file_name', 'file_path', 'thumbnail_path']
        }
      ],
      transaction
    });

    if (!equipment) {
      await transaction.rollback();
      console.log(`[EQUIPMENT] Equipment with ID ${req.params.id} not found`);
      return res.status(404).json({ message: 'Equipment not found' });
    }

    console.log(`[EQUIPMENT] Found equipment: ${equipment.brand} ${equipment.model} (${equipment.serial_number})`);

    // Store equipment data for logging
    const equipmentData = {
      type: equipment.type,
      brand: equipment.brand,
      model: equipment.model,
      serial_number: equipment.serial_number,
      status: equipment.status,
      location: equipment.location
    };

    // Get file IDs and paths for deletion
    const fileIds = equipment.files.map(file => file.id);
    const filePaths = equipment.files.map(file => ({
      id: file.id,
      path: file.file_path,
      thumbnail_path: file.thumbnail_path
    }));

    console.log(`[EQUIPMENT] Found ${filePaths.length} files associated with equipment`);

    // DIRECT SQL APPROACH - Most reliable method
    try {
      // Step 1: Clear the reference_image_id to break the circular reference
      console.log(`[EQUIPMENT] Clearing reference_image_id for equipment ID: ${equipment.id}`);
      await sequelize.query(
        'UPDATE equipment SET reference_image_id = NULL WHERE id = ?',
        {
          replacements: [equipment.id],
          type: sequelize.QueryTypes.UPDATE,
          transaction
        }
      );

      // Step 2: Delete all equipment logs associated with this equipment
      console.log(`[EQUIPMENT] Deleting equipment logs for equipment ID: ${equipment.id}`);
      await sequelize.query(
        'DELETE FROM equipment_logs WHERE equipment_id = ?',
        {
          replacements: [equipment.id],
          type: sequelize.QueryTypes.DELETE,
          transaction
        }
      );

      // Step 3: Delete all files associated with this equipment
      if (fileIds.length > 0) {
        console.log(`[EQUIPMENT] Deleting ${fileIds.length} files for equipment ID: ${equipment.id}`);
        await sequelize.query(
          'DELETE FROM files WHERE equipment_id = ?',
          {
            replacements: [equipment.id],
            type: sequelize.QueryTypes.DELETE,
            transaction
          }
        );
      }

      // Step 4: Delete the equipment record
      console.log(`[EQUIPMENT] Deleting equipment record ID: ${equipment.id}`);
      await sequelize.query(
        'DELETE FROM equipment WHERE id = ?',
        {
          replacements: [equipment.id],
          type: sequelize.QueryTypes.DELETE,
          transaction
        }
      );

      // Step 5: Delete physical files from disk
      for (const filePath of filePaths) {
        try {
          if (filePath.path) {
            await fs.unlink(path.resolve(filePath.path)).catch(err => {
              console.log(`[EQUIPMENT] Non-critical error deleting file from disk: ${err.message}`);
            });
          }
          if (filePath.thumbnail_path) {
            await fs.unlink(path.resolve(filePath.thumbnail_path)).catch(err => {
              console.log(`[EQUIPMENT] Non-critical error deleting thumbnail from disk: ${err.message}`);
            });
          }
        } catch (fileSystemError) {
          console.error(`[EQUIPMENT] Error deleting file from disk:`, fileSystemError);
          // Continue even if file deletion fails
        }
      }

      // Step 6: Create a log entry for the deletion
      await equipmentLogService.logDeletion(req.params.id, req.user.id, equipmentData);

      // Commit the transaction
      await transaction.commit();
      console.log(`[EQUIPMENT] Equipment deletion completed successfully`);

      res.json({ message: 'Equipment deleted successfully' });
    } catch (error) {
      // Rollback the transaction if there's an error
      if (transaction) {
        await transaction.rollback();
      }
      console.error('[EQUIPMENT] Error deleting equipment:', error);
      throw error;
    }
  } catch (error) {
    // Ensure transaction is rolled back
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error('[EQUIPMENT] Error rolling back transaction:', rollbackError);
      }
    }

    console.error('[EQUIPMENT] Delete equipment error:', error);
    res.status(500).json({
      message: 'Server error',
      error: error.message
    });
  }
});

// Update equipment status (admin and advanced users only)
router.patch('/:id/status', authenticate, isAdvancedOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['available', 'in-use', 'maintenance'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    // Find equipment
    const equipment = await Equipment.findByPk(id);

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Store old data for logging
    const oldData = {
      status: equipment.status
    };

    // Update equipment status
    await equipment.update({ status });

    // Log the status update
    await equipmentLogService.logStatusChange(
      equipment.id,
      req.user.id,
      oldData.status,
      status
    );

    res.json({
      message: 'Status updated successfully',
      equipment: {
        id: equipment.id,
        status: equipment.status
      }
    });
  } catch (error) {
    console.error('Update equipment status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update equipment location (admin and advanced users only)
router.patch('/:id/location', authenticate, isAdvancedOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { location, location_id } = req.body;

    // Find equipment
    const equipment = await Equipment.findByPk(id);

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Store old data for logging
    const oldData = {
      location: equipment.location,
      location_id: equipment.location_id
    };

    // Prepare update data
    const updateData = {};

    // Handle location_id if provided
    if (location_id) {
      try {
        const locationRecord = await Location.findByPk(location_id);
        if (locationRecord) {
          updateData.location = locationRecord.name;
          updateData.location_id = location_id;

          // Update status based on location
          if (locationRecord.name.toLowerCase() === 'lager') {
            updateData.status = 'available';
          } else if (equipment.status !== 'maintenance') {
            updateData.status = 'in-use';
          }
        }
      } catch (error) {
        console.error('Error fetching location:', error);
      }
    }
    // Handle custom location if provided
    else if (location) {
      updateData.location = location;
      updateData.location_id = null;

      // Update status based on location
      if (location.toLowerCase() === 'lager') {
        updateData.status = 'available';
      } else if (equipment.status !== 'maintenance') {
        updateData.status = 'in-use';
      }
    }

    // Update equipment
    await equipment.update(updateData);

    // Log the location update
    await equipmentLogService.logLocationChange(
      equipment.id,
      req.user.id,
      oldData.location,
      updateData.location
    );

    res.json({
      message: 'Location updated successfully',
      equipment: {
        id: equipment.id,
        location: equipment.location,
        location_id: equipment.location_id,
        status: equipment.status
      }
    });
  } catch (error) {
    console.error('Update equipment location error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update equipment type (admin and advanced users only)
router.patch('/:id/type', authenticate, isAdvancedOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { type_id } = req.body;

    // Validate type_id
    if (!type_id) {
      return res.status(400).json({ message: 'Type ID is required' });
    }

    // Find equipment
    const equipment = await Equipment.findByPk(id);

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Find the type to get its name
    const { EquipmentType } = require('../models');
    const typeRecord = await EquipmentType.findByPk(type_id);

    if (!typeRecord) {
      return res.status(404).json({ message: 'Equipment type not found' });
    }

    // Store old data for logging
    const oldData = {
      type: equipment.type,
      type_id: equipment.type_id
    };

    // Update equipment
    await equipment.update({
      type: typeRecord.name,
      type_id: type_id
    });

    // Log the type update
    await equipmentLogService.logUpdate(
      equipment.id,
      req.user.id,
      oldData,
      { type: typeRecord.name, type_id }
    );

    res.json({
      message: 'Type updated successfully',
      equipment: {
        id: equipment.id,
        type: equipment.type,
        type_id: equipment.type_id
      }
    });
  } catch (error) {
    console.error('Update equipment type error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update equipment category (admin and advanced users only)
router.patch('/:id/category', authenticate, isAdvancedOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { category_id } = req.body;

    // Find equipment
    const equipment = await Equipment.findByPk(id);

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Store old data for logging
    const oldData = {
      category: equipment.category,
      category_id: equipment.category_id
    };

    // Prepare update data
    const updateData = {
      category: '',
      category_id: null
    };

    // If category_id is provided, fetch the category name
    if (category_id) {
      try {
        const { Category } = require('../models');
        const categoryRecord = await Category.findByPk(category_id);
        if (categoryRecord) {
          updateData.category = categoryRecord.name;
          updateData.category_id = category_id;
        }
      } catch (error) {
        console.error('Error fetching category:', error);
      }
    }

    // Update equipment
    await equipment.update(updateData);

    // Log the category update
    await equipmentLogService.logUpdate(
      equipment.id,
      req.user.id,
      oldData,
      updateData
    );

    res.json({
      message: 'Category updated successfully',
      equipment: {
        id: equipment.id,
        category: equipment.category,
        category_id: equipment.category_id
      }
    });
  } catch (error) {
    console.error('Update equipment category error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update equipment brand and model (admin and advanced users only)
router.patch('/:id/brand-model', authenticate, isAdvancedOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { brand, model } = req.body;

    // Validate that at least one field is provided
    if (!brand && !model) {
      return res.status(400).json({ message: 'At least one of brand or model must be provided' });
    }

    // Find equipment
    const equipment = await Equipment.findByPk(id);

    if (!equipment) {
      return res.status(404).json({ message: 'Equipment not found' });
    }

    // Store old data for logging
    const oldData = {
      brand: equipment.brand,
      model: equipment.model
    };

    // Prepare update data
    const updateData = {};
    if (brand) updateData.brand = brand;
    if (model) updateData.model = model;

    // Update equipment
    await equipment.update(updateData);

    // Log the update
    await equipmentLogService.logUpdate(
      equipment.id,
      req.user.id,
      oldData,
      updateData
    );

    res.json({
      message: 'Brand/model updated successfully',
      equipment: {
        id: equipment.id,
        brand: equipment.brand,
        model: equipment.model
      }
    });
  } catch (error) {
    console.error('Update equipment brand/model error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
