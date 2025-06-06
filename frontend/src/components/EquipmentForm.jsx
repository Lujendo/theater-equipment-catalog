import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@tanstack/react-query';
import { Card, Input, BarcodeInput, Select, Button } from './ui';
import FileUpload from './FileUpload';
import ReferenceImageUpload from './ReferenceImageUpload';
import { getLocations } from '../services/locationService';

const EquipmentForm = ({
  formData,
  equipmentTypes,
  categoriesData,
  statusOptions,
  handleInputChange,
  handleFileChange,
  handleSubmit,
  handleCancel,
  isLoading,
  error,
  isEditing = false,
  files = [],
  uploadProgress = 0,
  existingFiles = [],
  handleFileDelete,
  handleSetReferenceImage,
  handleReferenceImageSelect,
}) => {
  const [referenceImage, setReferenceImage] = useState(null);
  const [referenceImageFile, setReferenceImageFile] = useState(null);

  // Fetch locations
  const { data: locationsData } = useQuery(['locations'], getLocations, {
    staleTime: 300000, // 5 minutes
  });

  // We're now receiving categoriesData as a prop, so we don't need to fetch it here

  // Find the reference image from existing files
  useEffect(() => {
    if (existingFiles && existingFiles.length > 0 && formData.reference_image_id) {
      // Try to find in existing files
      const refImage = existingFiles.find(file => file.id.toString() === formData.reference_image_id);
      if (refImage) {
        setReferenceImage(refImage);
        return;
      }
    }

    // If no reference image found
    setReferenceImage(null);
  }, [existingFiles, formData.reference_image_id]);

  // Handle reference image selection
  const handleReferenceImageSelectLocal = (file) => {
    setReferenceImageFile(file);

    // Call the parent handler to pass the file back
    if (handleReferenceImageSelect) {
      handleReferenceImageSelect(file);
    }


    if (file) {
      // Set a temporary ID for the reference image
      handleInputChange({ target: { name: 'reference_image_id', value: 'new' } });
    } else {
      // Clear the reference image ID
      handleInputChange({ target: { name: 'reference_image_id', value: '' } });
    }
  };

  // Handle reference image deletion
  const handleReferenceImageDelete = (fileId) => {
    setReferenceImage(null);
    handleInputChange({ target: { name: 'reference_image_id', value: '' } });

    // If handleFileDelete is provided, call it with the fileId
    if (handleFileDelete) {
      handleFileDelete(fileId);
    }
  };
  return (
    <Card>
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 m-6 mt-0">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card.Body>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category */}
            <Select
              id="category_id"
              name="category_id"
              label="Category"
              value={formData.category_id || ''}
              onChange={handleInputChange}
              options={[
                { value: '', label: 'Select Category' },
                ...(categoriesData || []).map((category) => ({
                  value: category.id.toString(),
                  label: category.name,
                }))
              ]}
            />

            {/* Type */}
            <Select
              id="type_id"
              name="type_id"
              label="Type"
              value={formData.type_id || ''}
              onChange={handleInputChange}
              options={[
                { value: '', label: 'Select Type' },
                ...equipmentTypes.map((type) => ({
                  value: type.id.toString(),
                  label: type.name,
                }))
              ]}
              required
            />

            {/* Brand */}
            <Input
              id="brand"
              name="brand"
              label="Brand"
              value={formData.brand}
              onChange={handleInputChange}
              placeholder="Enter brand"
              required
            />

            {/* Model */}
            <Input
              id="model"
              name="model"
              label="Model"
              value={formData.model}
              onChange={handleInputChange}
              placeholder="Enter model"
              required
            />

            {/* Serial Number */}
            <BarcodeInput
              id="serial_number"
              name="serial_number"
              label="Serial Number"
              value={formData.serial_number}
              onChange={handleInputChange}
              placeholder="Enter serial number"
              required
              onScan={(scannedValue) => {
                handleInputChange({ target: { name: 'serial_number', value: scannedValue } });
              }}
            />

            {/* Quantity */}
            <Input
              id="quantity"
              name="quantity"
              label="Quantity"
              type="number"
              min="0"
              value={formData.quantity || 1}
              onChange={handleInputChange}
              placeholder="Enter quantity"
              required
              helpText="Number of items (0 = unavailable, default = 1)"
            />

            {/* Status */}
            <Select
              id="status"
              name="status"
              label="Status"
              value={formData.status}
              onChange={handleInputChange}
              options={statusOptions.map((status) => ({
                value: status,
                label: status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' '),
              }))}
              required
              helpText={formData.quantity === 0 ? "Status is automatically set to 'unavailable' when quantity is 0" : ""}
            />

            {/* Location */}
            <div className="space-y-4">
              <Select
                id="location_id"
                name="location_id"
                label="Location"
                value={formData.location_id ? formData.location_id.toString() : ''}
                onChange={handleInputChange}
                options={[
                  { value: '', label: 'Select Location' },
                  ...(locationsData?.locations || []).map((location) => {
                    // Create a more detailed label with address information if available
                    let label = location.name;
                    const addressParts = [];

                    if (location.city) addressParts.push(location.city);
                    if (location.region) addressParts.push(location.region);
                    if (location.country) addressParts.push(location.country);

                    if (addressParts.length > 0) {
                      label += ` (${addressParts.join(', ')})`;
                    }

                    return {
                      value: location.id.toString(),
                      label: label,
                    };
                  })
                ]}
              />
              <Input
                id="location"
                name="location"
                label="Custom Location (if not in list)"
                value={formData.location || ''}
                onChange={handleInputChange}
                placeholder="Enter custom location"
              />
            </div>
          </div>

          {/* Description */}
          <div className="mt-6">
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows="4"
              className="w-full rounded-md border-slate-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
              placeholder="Enter description"
            ></textarea>
          </div>

          {/* Reference Image */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
            <h3 className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Reference Image
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Upload a <strong>single reference image</strong> that best represents this equipment. This image will be displayed prominently on the equipment details page and in search results.
            </p>
            <ReferenceImageUpload
              onImageSelect={handleReferenceImageSelectLocal}
              existingImage={referenceImage}
              onImageDelete={handleReferenceImageDelete}
            />
          </div>

          {/* File Upload */}
          <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <h3 className="block text-sm font-medium text-slate-700 mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Documents & Attachments
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Upload additional documents and images related to this equipment (manuals, invoices, additional photos, etc.). These will be shown in the Documents tab.
            </p>
            <FileUpload
              onFileSelect={handleFileChange}
              uploadProgress={uploadProgress}
              existingFiles={existingFiles}
              onFileDelete={handleFileDelete}
              multiple
              maxFiles={5}
            />
          </div>
        </Card.Body>

        <Card.Footer className="flex justify-end space-x-3">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Equipment'}
          </Button>
        </Card.Footer>
      </form>
    </Card>
  );
};

EquipmentForm.propTypes = {
  formData: PropTypes.object.isRequired,
  equipmentTypes: PropTypes.array.isRequired,
  categoriesData: PropTypes.array,
  statusOptions: PropTypes.array.isRequired,
  locationsData: PropTypes.object,
  handleInputChange: PropTypes.func.isRequired,
  handleFileChange: PropTypes.func.isRequired,
  handleSubmit: PropTypes.func.isRequired,
  handleCancel: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  isEditing: PropTypes.bool,
  files: PropTypes.array,
  uploadProgress: PropTypes.number,
  existingFiles: PropTypes.array,
  handleFileDelete: PropTypes.func,
  handleSetReferenceImage: PropTypes.func,
  handleReferenceImageSelect: PropTypes.func,
};

export default EquipmentForm;
