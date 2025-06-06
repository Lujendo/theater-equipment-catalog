import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEquipmentById, deleteEquipment } from '../services/equipmentService';
import { useAuth } from '../context/AuthContext';
import { Card, Button, Badge } from './ui';
import ConfirmationDialogModern from './ConfirmationDialogModern';
import ReferenceImageModal from './ReferenceImageModal';
import EquipmentLogList from './EquipmentLogList';
import FileGallery from './FileGallery';
import FileUploadModal from './FileUploadModal';
import { toast } from 'react-toastify';

// Helper function to get file URL
const getFileUrl = (fileId, thumbnail = false) => {
  return `/api/files/${fileId}${thumbnail ? '?thumbnail=true' : ''}`;
};

const EquipmentDetailsModern = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showReferenceImageModal, setShowReferenceImageModal] = useState(false);
  const [showFileUploadModal, setShowFileUploadModal] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [layout, setLayout] = useState('grid');

  // Fetch equipment details
  const { data: equipment, isLoading, isError, error } = useQuery({
    queryKey: ['equipment', id],
    queryFn: () => getEquipmentById(id),
  });

  // Delete equipment mutation
  const deleteMutation = useMutation({
    mutationFn: () => deleteEquipment(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['equipment']);
      navigate('/equipment');
    },
  });

  // Handle edit button click
  const handleEdit = () => {
    navigate(`/equipment/${id}/edit`);
  };

  // Handle file upload success
  const handleFileUploadSuccess = (files) => {
    // Invalidate the equipment query to refetch with the new files
    queryClient.invalidateQueries(['equipment', id]);
    toast.success(`Successfully uploaded ${files.length} file(s)`);
  };

  // Handle delete button click
  const handleDelete = () => {
    setShowDeleteConfirmation(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    deleteMutation.mutate();
    setShowDeleteConfirmation(false);
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

  // Handle back button click
  const handleBack = () => {
    navigate('/equipment');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">Equipment Details</h1>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">Equipment Details</h1>
        </div>
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading equipment</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error?.message || 'Failed to load equipment details'}</p>
              </div>
              <div className="mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                >
                  Back to Equipment List
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get status badge variant
  const getStatusVariant = (status) => {
    switch (status) {
      case 'available':
        return 'success';
      case 'in-use':
        return 'primary';
      case 'maintenance':
        return 'warning';
      case 'unavailable':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  // Debug: Log equipment data
  console.log('[EQUIPMENT DETAILS] Equipment data:', equipment);
  console.log('[EQUIPMENT DETAILS] reference_image_id:', equipment.reference_image_id);
  console.log('[EQUIPMENT DETAILS] files:', equipment.files);
  console.log('[EQUIPMENT DETAILS] files count:', equipment.files?.length || 0);
  // Convert reference_image_id to number for proper comparison
  const refImageId = equipment.reference_image_id ? parseInt(equipment.reference_image_id) : null;

  // Check if reference image exists in files
  const referenceImage = equipment.files?.find(file => file.id === refImageId);
  console.log('[EQUIPMENT DETAILS] refImageId:', refImageId);
  console.log('[EQUIPMENT DETAILS] referenceImage found:', referenceImage ? 'Yes' : 'No');
  if (referenceImage) {
    console.log('[EQUIPMENT DETAILS] referenceImage:', referenceImage);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
        <div className="flex items-center">
          <div className="bg-primary-100 p-2 rounded-lg mr-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Equipment Details</h1>
            <p className="text-slate-500 text-sm">
              {equipment.brand} {equipment.model} • {equipment.serial_number}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to List
          </Button>
          {(user?.role === 'admin' || user?.role === 'advanced') && (
            <Button
              variant="primary"
              onClick={handleEdit}
              className="flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Button>
          )}
          {user?.role === 'admin' && (
            <Button
              variant="danger"
              onClick={handleDelete}
              className="flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Grid layout for top section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Left column - Equipment Information Tabs */}
        <div className="md:col-span-2">
          <div className="bg-white shadow-md rounded-lg overflow-hidden h-full">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none transition-colors flex items-center ${
                    activeTab === 'details'
                      ? 'border-primary-500 text-primary-600 bg-primary-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${activeTab === 'details' ? 'text-primary-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Details
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('documents')}
                  className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none transition-colors flex items-center ${
                    activeTab === 'documents'
                      ? 'border-primary-500 text-primary-600 bg-primary-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${activeTab === 'documents' ? 'text-primary-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  Documents & Attachments
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`py-4 px-6 font-medium text-sm border-b-2 focus:outline-none transition-colors flex items-center ${
                    activeTab === 'history'
                      ? 'border-primary-500 text-primary-600 bg-primary-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 mr-2 ${activeTab === 'history' ? 'text-primary-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Movement History
                </button>
              </nav>
            </div>

            <div className="p-6">
              {/* Details Tab */}
              {activeTab === 'details' && (
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
                    {/* Main Information */}
                    <div className="md:col-span-1">
                      <Card className="h-full">
                        <Card.Header className="bg-slate-50">
                          <Card.Title className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Equipment Information
                          </Card.Title>
                        </Card.Header>
                        <Card.Body>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <h3 className="text-sm font-medium text-slate-500">Category</h3>
                              <p className="mt-1 text-base font-medium text-slate-900">{equipment.category || 'Not specified'}</p>
                            </div>

                            <div>
                              <h3 className="text-sm font-medium text-slate-500">Type</h3>
                              <p className="mt-1 text-base font-medium text-slate-900">{equipment.type}</p>
                            </div>

                            <div>
                              <h3 className="text-sm font-medium text-slate-500">Brand</h3>
                              <p className="mt-1 text-base font-medium text-slate-900">{equipment.brand}</p>
                            </div>

                            <div>
                              <h3 className="text-sm font-medium text-slate-500">Model</h3>
                              <p className="mt-1 text-base font-medium text-slate-900">{equipment.model}</p>
                            </div>

                            <div>
                              <h3 className="text-sm font-medium text-slate-500">Serial Number</h3>
                              <p className="mt-1 text-base font-medium text-slate-900">{equipment.serial_number}</p>
                            </div>

                            <div>
                              <h3 className="text-sm font-medium text-slate-500">Location</h3>
                              <p className="mt-1 text-base font-medium text-slate-900">{equipment.location || 'Not specified'}</p>
                            </div>

                            <div>
                              <h3 className="text-sm font-medium text-slate-500">Quantity</h3>
                              <div className="mt-1 flex items-center">
                                <p className="text-base font-medium text-slate-900">{equipment.quantity || 1}</p>
                                {equipment.quantity === 0 && (
                                  <span className="ml-2 text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded">
                                    Out of Stock
                                  </span>
                                )}
                                {equipment.quantity && equipment.quantity > 1 && (
                                  <span className="ml-2 text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                                    Multiple Items
                                  </span>
                                )}
                              </div>
                            </div>

                            <div>
                              <h3 className="text-sm font-medium text-slate-500">Status</h3>
                              <div className="mt-1">
                                {equipment.status && (
                                  <Badge variant={getStatusVariant(equipment.status)} size="md">
                                    {equipment.status.charAt(0).toUpperCase() + equipment.status.slice(1).replace('-', ' ')}
                                  </Badge>
                                )}
                                {equipment.quantity === 0 && (
                                  <p className="mt-1 text-xs text-orange-600">
                                    <svg className="inline-block h-3 w-3 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    Status automatically set to "Unavailable" when quantity is 0
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {equipment.description && (
                            <div className="mt-8 border-t border-slate-200 pt-6">
                              <div className="flex items-center mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                                </svg>
                                <h3 className="text-sm font-medium text-slate-700">Description</h3>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-lg">
                                <p className="text-base text-slate-800 whitespace-pre-line">{equipment.description}</p>
                              </div>
                            </div>
                          )}
                        </Card.Body>
                      </Card>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents & Attachments Tab */}
              {activeTab === 'documents' && (
                <div>
                  <div className="flex items-center mb-6">
                    <div className="bg-blue-100 p-2 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-800">Documents & Attachments</h2>
                    {(user?.role === 'admin' || user?.role === 'advanced') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto flex items-center"
                        onClick={() => setShowFileUploadModal(true)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Documents
                      </Button>
                    )}
                  </div>

                  {equipment.files && equipment.files.filter(file => !referenceImage || file.id !== referenceImage.id).length > 0 ? (
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm font-medium text-slate-700">
                            {equipment.files.filter(file => !referenceImage || file.id !== referenceImage.id).length}
                            {equipment.files.filter(file => !referenceImage || file.id !== referenceImage.id).length === 1 ? ' file' : ' files'} attached
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                              layout === 'grid'
                                ? 'bg-primary-100 text-primary-700'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            onClick={() => setLayout('grid')}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                          </button>
                          <button
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                              layout === 'list'
                                ? 'bg-primary-100 text-primary-700'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            onClick={() => setLayout('list')}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      <FileGallery
                        files={equipment.files.filter(file => !referenceImage || file.id !== referenceImage.id)}
                        layout={layout}
                        size="medium"
                        showDownload={true}
                        canDelete={false}
                      />
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-8 text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-slate-600 font-medium mb-2">No documents attached to this equipment</p>
                      {(user?.role === 'admin' || user?.role === 'advanced') && (
                        <div className="mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center mx-auto"
                            onClick={() => setShowFileUploadModal(true)}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            Add Documents
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Movement History Tab */}
              {activeTab === 'history' && (
                <div>
                  <div className="flex items-center mb-6">
                    <div className="bg-green-100 p-2 rounded-lg mr-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-semibold text-slate-800">Movement History</h2>
                  </div>

                  <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
                    <div className="mb-4 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      <span className="text-sm font-medium text-slate-700">
                        Equipment movement log
                      </span>
                    </div>

                    <EquipmentLogList equipmentId={id} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column - Reference Image */}
        <div className="md:col-span-1">
          <div className="bg-white shadow-md rounded-lg overflow-hidden h-full">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Reference Image
              </h2>
            </div>
            <div className="p-4 flex flex-col items-center justify-center">
              {referenceImage ? (
                <div className="w-full">
                  <div className="relative pb-4">
                    <img
                      src={getFileUrl(referenceImage.id, true)} /* Use thumbnail for better performance */
                      alt={`${equipment.brand} ${equipment.model}`}
                      className="w-full h-auto object-contain rounded-md"
                      onError={(e) => {
                        console.error('Error loading thumbnail, falling back to original image');
                        e.target.src = getFileUrl(referenceImage.id); // Fallback to original image
                        e.target.onerror = null;
                      }}
                    />
                    {(user?.role === 'admin' || user?.role === 'advanced') && (
                      <button
                        onClick={() => setShowReferenceImageModal(true)}
                        className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-md hover:bg-gray-100 transition-colors"
                        title="Change reference image"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 text-center">
                    {referenceImage.file_name}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-gray-600 font-medium mb-2">No reference image</p>
                  {(user?.role === 'admin' || user?.role === 'advanced') && (
                    <button
                      onClick={() => setShowReferenceImageModal(true)}
                      className="mt-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Reference Image
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom section - Quick Info and Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Quick Info */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-lg shadow-md border border-slate-200 h-full">
            <div className="p-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Quick Info
              </h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="text-xs font-medium text-slate-500">Category</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{equipment.category || 'Not specified'}</p>
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  <span className="text-xs font-medium text-slate-500">Type</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{equipment.type}</p>
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  <span className="text-xs font-medium text-slate-500">Serial Number</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{equipment.serial_number}</p>
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-xs font-medium text-slate-500">Location</span>
                </div>
                <p className="text-sm font-medium text-slate-800">{equipment.location || 'Not specified'}</p>
              </div>

              <div>
                <div className="flex items-center mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-500 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span className="text-xs font-medium text-slate-500">Status</span>
                </div>
                <div>
                  {equipment.status && (
                    <Badge variant={getStatusVariant(equipment.status)} size="md">
                      {equipment.status.charAt(0).toUpperCase() + equipment.status.slice(1).replace('-', ' ')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metadata */}
        <div className="md:col-span-1">
          <Card className="h-full">
            <Card.Header className="bg-slate-50">
              <Card.Title className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Metadata
              </Card.Title>
            </Card.Header>
            <Card.Body>
              <div className="space-y-5">
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-slate-700">Created By</h4>
                    <p className="mt-1 text-sm text-slate-600">{equipment.created_by || 'Unknown'}</p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-slate-700">Created At</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      {equipment.created_at ? new Date(equipment.created_at).toLocaleString() : 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-slate-700">Last Updated</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      {equipment.updated_at ? new Date(equipment.updated_at).toLocaleString() : 'Never'}
                    </p>
                  </div>
                </div>

                {equipment.locationDetails && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Location Details
                    </h4>
                    <div className="bg-slate-50 p-3 rounded-lg text-sm">
                      <p className="font-medium text-slate-800">{equipment.locationDetails.name}</p>
                      {equipment.locationDetails.street && (
                        <p className="text-slate-600 mt-1">{equipment.locationDetails.street}</p>
                      )}
                      {(equipment.locationDetails.postal_code || equipment.locationDetails.city) && (
                        <p className="text-slate-600">
                          {equipment.locationDetails.postal_code && `${equipment.locationDetails.postal_code} `}
                          {equipment.locationDetails.city}
                        </p>
                      )}
                      {(equipment.locationDetails.region || equipment.locationDetails.country) && (
                        <p className="text-slate-600">
                          {equipment.locationDetails.region && `${equipment.locationDetails.region}, `}
                          {equipment.locationDetails.country}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmation && (
        <ConfirmationDialogModern
          isOpen={showDeleteConfirmation}
          title="Delete Equipment"
          message="Are you sure you want to delete this equipment? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
          isDestructive
        />
      )}

      {/* Reference Image Modal */}
      <ReferenceImageModal
        isOpen={showReferenceImageModal}
        onClose={() => setShowReferenceImageModal(false)}
        equipmentId={id}
        existingImage={referenceImage}
      />

      {/* File Upload Modal */}
      <FileUploadModal
        equipmentId={parseInt(id)}
        isOpen={showFileUploadModal}
        onClose={() => setShowFileUploadModal(false)}
        onSuccess={handleFileUploadSuccess}
      />
    </div>
  );
};

export default EquipmentDetailsModern;