import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { createEquipment } from '../services/equipmentService';
import { getEquipmentTypes } from '../services/equipmentTypeService';
import { getLocations } from '../services/locationService';
import { getCategories } from '../services/categoryService';
import { useAuth } from '../context/AuthContext';
import EquipmentForm from './EquipmentForm';
import { Card, Button } from './ui';

const NewEquipmentModern = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    type_id: '',
    category_id: '',
    category: '',
    brand: '',
    model: '',
    serial_number: '',
    status: 'available',
    location: '',
    location_id: '',
    description: '',
    reference_image_id: '',
    quantity: 1,
  });

  const [files, setFiles] = useState([]);
  const [referenceImageFile, setReferenceImageFile] = useState(null);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch equipment types for dropdown
  const { data: typesData } = useQuery({
    queryKey: ['equipmentTypes'],
    queryFn: getEquipmentTypes,
    staleTime: 300000, // 5 minutes
  });

  // Fetch categories for dropdown
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 300000, // 5 minutes
  });

  // Fetch locations for dropdown
  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: getLocations,
    staleTime: 300000, // 5 minutes
  });

  // Equipment status options for dropdown
  const statusOptions = ['available', 'in-use', 'maintenance', 'unavailable'];

  // Create equipment mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      // We don't need to create a FormData object here
      // The createEquipment service function will handle that
      return createEquipment(data.equipment, data.files, data.referenceImageFile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['equipment']);
      navigate('/equipment');
    },
    onError: (error) => {
      console.error('Error creating equipment:', error);
      setError(error.response?.data?.message || 'Failed to create equipment');
    },
  });

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Create a copy of the current form data
    let updatedFormData = { ...formData, [name]: value };

    // Special handling for category_id
    if (name === 'category_id' && value && categoriesData) {
      // Find the category name from the selected category_id
      const selectedCategory = categoriesData.find(cat => cat.id.toString() === value);

      if (selectedCategory) {
        console.log('Selected category:', selectedCategory);

        // Update both category_id and category name
        updatedFormData = {
          ...updatedFormData,
          category_id: value,
          category: selectedCategory.name // Set the category name
        };
      }
    }
    // Special handling for location_id
    else if (name === 'location_id' && value) {
      // Find the location name from the selected location_id
      const selectedLocation = locationsData?.locations.find(loc => loc.id.toString() === value);

      if (selectedLocation) {
        console.log('Selected location:', selectedLocation);

        // Update both location_id and location name
        updatedFormData = {
          ...updatedFormData,
          location_id: value,
          location: selectedLocation.name // Set the location name
        };

        // Check if the location is "Lager" (case insensitive)
        const isLager = selectedLocation.name.toLowerCase() === 'lager';

        // Update status based on location
        if (isLager) {
          // If location is Lager, set status to "available"
          updatedFormData.status = 'available';
          console.log('Setting status to "available" because location is Lager');
        } else if (updatedFormData.status === 'available') {
          // If location is not Lager and status is "available", set status to "in-use"
          updatedFormData.status = 'in-use';
          console.log(`Setting status to "in-use" because location is not Lager (${selectedLocation.name})`);
        }
      }
    }
    // Special handling for location field - custom location entry
    else if (name === 'location' && value) {
      updatedFormData = {
        ...updatedFormData,
        location: value,
        // Clear location_id when custom location is entered
        location_id: ''
      };

      // Check if the location is "Lager" (case insensitive)
      const isLager = value.toLowerCase() === 'lager';

      // Update status based on location
      if (isLager) {
        // If location is Lager, set status to "available"
        updatedFormData.status = 'available';
        console.log('Setting status to "available" because custom location is Lager');
      } else if (updatedFormData.status === 'available') {
        // If location is not Lager and status is "available", set status to "in-use"
        updatedFormData.status = 'in-use';
        console.log(`Setting status to "in-use" because custom location is not Lager (${value})`);
      }
    }
    // Special handling for quantity field
    else if (name === 'quantity') {
      const quantityValue = parseInt(value, 10);

      // Validate quantity
      if (isNaN(quantityValue) || quantityValue < 0) {
        console.log('Invalid quantity value, keeping previous value');
        return; // Don't update if invalid
      }

      updatedFormData.quantity = quantityValue;

      // If quantity is 0, set status to 'unavailable'
      if (quantityValue === 0) {
        console.log('Setting status to unavailable because quantity is 0');
        updatedFormData.status = 'unavailable';
      } else if (formData.status === 'unavailable' && quantityValue > 0) {
        // If status was unavailable and quantity is now > 0, reset to available
        console.log('Resetting status from unavailable to available because quantity > 0');
        updatedFormData.status = 'available';
      }
    }
    // Special handling for status field
    else if (name === 'status') {
      // If user manually changes status, respect their choice
      console.log(`User manually changed status to: ${value}`);

      // But if quantity is 0, force status to "unavailable"
      if (formData.quantity === 0 && value !== 'unavailable') {
        console.log('Forcing status to "unavailable" because quantity is 0');
        updatedFormData.status = 'unavailable';
      }
      // But if location is "Lager", force status to "available" (unless quantity is 0)
      else {
        const locationName = formData.location || '';
        const isLager = locationName.toLowerCase() === 'lager';

        if (isLager && value !== 'available' && formData.quantity > 0) {
          console.log('Forcing status back to "available" because location is Lager');
          updatedFormData.status = 'available';
        }
      }
    }

    // Update the form data
    setFormData(updatedFormData);
  };

  // Handle file selection
  const handleFileChange = (selectedFiles) => {
    setFiles(selectedFiles);
  };

  // Handle setting reference image
  const handleSetReferenceImage = (fileId) => {
    // For new equipment, we need to handle temporary file IDs
    // We'll use a special format like "temp-{index}" to identify the file
    setFormData({
      ...formData,
      reference_image_id: fileId.toString(),
    });
  };

  // Handle file deletion for new equipment
  // Handle reference image file selection
  const handleReferenceImageSelect = (file) => {
    setReferenceImageFile(file);
  };
  const handleFileDelete = (fileIndex) => {
    // For new equipment, we're just removing from the files array
    const newFiles = [...files];

    // If the deleted file was the reference image, clear the reference_image_id
    if (formData.reference_image_id === fileIndex.toString()) {
      setFormData({
        ...formData,
        reference_image_id: '',
      });
    }

    // Remove the file from the array
    newFiles.splice(fileIndex, 1);
    setFiles(newFiles);
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.type_id || !formData.brand || !formData.model || !formData.serial_number) {
      setError('Type, brand, model, and serial number are required');
      return;
    }

    // Validate quantity
    if (formData.quantity < 0 || isNaN(formData.quantity)) {
      setError('Quantity must be a non-negative number');
      return;
    }

    // Check if there's a reference image file
    const selectedReferenceImageFile = formData.reference_image_id === 'new'
      ? referenceImageFile
      : null;

    // Remove the reference image from files if it exists
    const regularFiles = selectedReferenceImageFile
      ? files.filter(file => file !== selectedReferenceImageFile)
      : files;

    createMutation.mutate({
      equipment: {
        ...formData,
        // If reference_image_id is 'new', it will be handled by the backend
        // reference_image_id will be handled by the service
      },
      files: regularFiles,
      referenceImageFile: selectedReferenceImageFile,
    });
  };

  // Cancel creation
  const handleCancel = () => {
    navigate('/equipment');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Add New Equipment</h1>
      </div>

      <EquipmentForm
        formData={formData}
        equipmentTypes={typesData || []}
        categoriesData={categoriesData || []}
        statusOptions={statusOptions}
        locationsData={locationsData}
        handleInputChange={handleInputChange}
        handleFileChange={handleFileChange}
        handleSubmit={handleSubmit}
        handleCancel={handleCancel}
        isLoading={createMutation.isLoading}
        error={error}
        files={files}
        uploadProgress={uploadProgress}
        handleSetReferenceImage={handleSetReferenceImage}
        handleReferenceImageSelect={handleReferenceImageSelect}
        handleFileDelete={handleFileDelete}
      />

      {/* Equipment Type Management Notice */}
      {user?.role === 'admin' && (
        <Card className="mt-6">
          <Card.Body className="flex items-start space-x-4">
            <div className="flex-shrink-0 text-primary-500">
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-800">Equipment Type Management</h3>
              <p className="mt-1 text-sm text-slate-600">
                You can manage equipment types in the Settings page.
              </p>
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/settings')}
                >
                  Go to Settings
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
};

export default NewEquipmentModern;
