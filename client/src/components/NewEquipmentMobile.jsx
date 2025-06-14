import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createEquipment } from '../services/equipmentService';
import { getEquipmentTypes } from '../services/equipmentTypeService';
import { getLocations } from '../services/locationService';
import { getCategories } from '../services/categoryService';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import BarcodeScanner from './BarcodeScanner';

const NewEquipmentMobile = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form state
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    type_id: '',
    category_id: '',
    brand: '',
    model: '',
    serial_number: '',
    location_id: '',
    location: '',
    status: 'available',
    quantity: 1,
    description: '',
    reference_image_id: ''
  });

  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Queries
  const { data: typesData } = useQuery({
    queryKey: ['equipment-types'],
    queryFn: getEquipmentTypes,
    staleTime: 300000,
  });

  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: getLocations,
    staleTime: 300000,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories,
    staleTime: 300000,
  });

  const { data: defaultStorageData } = useQuery({
    queryKey: ['default-storage-locations'],
    queryFn: async () => {
      const response = await axios.get('/api/default-storage-locations');
      return response.data;
    },
    staleTime: 300000,
  });

  // Set default storage location
  useEffect(() => {
    if (defaultStorageData?.defaultStorageLocations?.length > 0 && !formData.location_id) {
      const defaultStorage = defaultStorageData.defaultStorageLocations[0];
      setFormData(prev => ({
        ...prev,
        location_id: defaultStorage.location_id.toString(),
        location: defaultStorage.location?.name || defaultStorage.name || 'Default Storage',
        status: 'available'
      }));
    }
  }, [defaultStorageData, formData.location_id]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createEquipment,
    onSuccess: (data) => {
      setIsSuccess(true);
      toast.success('Equipment created successfully!', { icon: '📱✅' });
      setTimeout(() => {
        navigate(`/equipment/${data.equipment.id}`);
      }, 1500);
    },
    onError: (error) => {
      console.error('Error creating equipment:', error);
      setError(error.response?.data?.message || 'Failed to create equipment');
      toast.error('Failed to create equipment');
    },
  });

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle barcode scan
  const handleBarcodeScan = (scannedValue) => {
    setFormData(prev => ({ ...prev, serial_number: scannedValue }));
    setShowBarcodeScanner(false);
    toast.success('Barcode scanned successfully!', { icon: '📱📷' });
    // Auto-advance to next step after successful scan
    if (currentStep === 2) {
      setTimeout(() => nextStep(), 1000);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.type_id || !formData.brand || !formData.model || !formData.serial_number) {
      setError('Type, brand, model, and serial number are required');
      return;
    }

    createMutation.mutate({
      equipment: formData,
      files: files,
      referenceImageFile: null,
      allocation: null,
    });
  };

  // Handle cancel
  const handleCancel = () => {
    navigate('/equipment');
  };

  // Step navigation
  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const statusOptions = ['available', 'in-use', 'maintenance', 'unavailable', 'broken'];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={handleCancel}
              className="p-2 text-gray-600 hover:text-gray-800"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-800">Add Equipment</h1>
            <div className="w-10"></div>
          </div>
          
          {/* Progress Indicator */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
              <span>Step {currentStep} of 4</span>
              <span>{Math.round((currentStep / 4) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / 4) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-red-700">{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Success Display */}
      {isSuccess && (
        <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-4 h-4 text-green-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-green-700">Equipment created! Redirecting...</span>
          </div>
        </div>
      )}

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="px-4 py-4">
        {/* Step 1: Basic Information */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Basic Information</h2>
              
              {/* Equipment Type */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Equipment Type *</label>
                <select
                  name="type_id"
                  value={formData.type_id}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Type</option>
                  {typesData?.types?.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Brand */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Brand *</label>
                <input
                  type="text"
                  name="brand"
                  value={formData.brand}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter brand"
                  required
                />
              </div>

              {/* Model */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Model *</label>
                <input
                  type="text"
                  name="model"
                  value={formData.model}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter model"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Serial Number & Scanning */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Serial Number</h2>
              
              {/* Serial Number with Barcode Scanner */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Serial Number *</label>
                <div className="relative">
                  <input
                    type="text"
                    name="serial_number"
                    value={formData.serial_number}
                    onChange={handleInputChange}
                    className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter or scan serial number"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowBarcodeScanner(true)}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-blue-600 hover:text-blue-800"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Tap the scan icon to use your camera</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Location & Status */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Location & Status</h2>
              
              {/* Location */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <select
                  name="location_id"
                  value={formData.location_id}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select Location</option>
                  {locationsData?.locations?.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                      {location.city && ` (${location.city})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Status *</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantity *</label>
                <input
                  type="number"
                  name="quantity"
                  min="1"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Description & Review */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <h2 className="text-base font-semibold text-gray-800 mb-4">Description & Review</h2>
              
              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter description (optional)"
                />
              </div>

              {/* Review Summary */}
              <div className="bg-gray-50 rounded-lg p-3">
                <h3 className="text-sm font-medium text-gray-800 mb-2">Review</h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div><strong>Type:</strong> {typesData?.types?.find(t => t.id.toString() === formData.type_id)?.name || 'Not selected'}</div>
                  <div><strong>Brand:</strong> {formData.brand || 'Not entered'}</div>
                  <div><strong>Model:</strong> {formData.model || 'Not entered'}</div>
                  <div><strong>Serial:</strong> {formData.serial_number || 'Not entered'}</div>
                  <div><strong>Location:</strong> {locationsData?.locations?.find(l => l.id.toString() === formData.location_id)?.name || 'Default Storage'}</div>
                  <div><strong>Status:</strong> {formData.status}</div>
                  <div><strong>Quantity:</strong> {formData.quantity}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="flex items-center justify-between">
          {/* Previous Button */}
          <Button
            type="button"
            variant="secondary"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="flex-1 mr-2"
          >
            Previous
          </Button>

          {/* Next/Submit Button */}
          {currentStep < 4 ? (
            <Button
              type="button"
              variant="primary"
              onClick={nextStep}
              className="flex-1 ml-2"
            >
              Next
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              onClick={handleSubmit}
              disabled={createMutation.isLoading}
              className="flex-1 ml-2"
            >
              {createMutation.isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </div>
              ) : (
                'Create Equipment'
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      {showBarcodeScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}
    </div>
  );
};

export default NewEquipmentMobile;
