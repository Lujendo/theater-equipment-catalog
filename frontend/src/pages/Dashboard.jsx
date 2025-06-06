import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getEquipment, getFileUrl } from '../services/equipmentService';
import { getSavedSearches, saveSearch, deleteSavedSearch } from '../services/savedSearchService';
import { getCategories } from '../services/categoryService';
import { getEquipmentTypes } from '../services/equipmentTypeService';
import { Card, Button, Input, Select, Badge } from '../components/ui';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { debounce } from 'lodash';

// Icons
const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
  </svg>
);

const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
  </svg>
);

const SaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z" />
  </svg>
);

const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
  </svg>
);

const ViewIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
  </svg>
);

const ClearIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
  </svg>
);

const SortIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
  </svg>
);

const TrendingUpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
  </svg>
);

const ChartBarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
  </svg>
);

// Filter Summary List Component
const FilterSummaryList = ({ equipmentData, onFilterChange, currentFilters, isLoading }) => {
  // Calculate filter summaries from equipment data
  const calculateFilterSummaries = () => {
    if (!equipmentData || equipmentData.length === 0) {
      return {
        status: {},
        categories: {},
        types: {},
        locations: {},
        brands: {},
        models: {}
      };
    }

    const summaries = {
      status: {},
      categories: {},
      types: {},
      locations: {},
      brands: {},
      models: {}
    };

    equipmentData.forEach(item => {
      // Count by status
      const status = item.status || 'unknown';
      summaries.status[status] = (summaries.status[status] || 0) + 1;

      // Count by category
      const category = item.category || 'Uncategorized';
      summaries.categories[category] = (summaries.categories[category] || 0) + 1;

      // Count by type
      const type = item.type || 'Unknown';
      summaries.types[type] = (summaries.types[type] || 0) + 1;

      // Count by location
      const location = item.location || 'No Location';
      summaries.locations[location] = (summaries.locations[location] || 0) + 1;

      // Count by brand
      const brand = item.brand || 'Unknown';
      summaries.brands[brand] = (summaries.brands[brand] || 0) + 1;

      // Count by model
      const model = item.model || 'Unknown';
      summaries.models[model] = (summaries.models[model] || 0) + 1;
    });

    return summaries;
  };

  const summaries = calculateFilterSummaries();

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'text-green-700 bg-green-100 border-green-200';
      case 'in-use':
        return 'text-yellow-700 bg-yellow-100 border-yellow-200';
      case 'maintenance':
        return 'text-red-700 bg-red-100 border-red-200';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-200';
    }
  };

  // Check if a filter is active
  const isFilterActive = (filterType, value) => {
    switch (filterType) {
      case 'status':
        return currentFilters.status === value;
      case 'category':
        return currentFilters.category === value;
      case 'type':
        return currentFilters.type === value;
      case 'location':
        return currentFilters.location === value;
      case 'brand':
        return currentFilters.brand === value;
      case 'model':
        return currentFilters.model === value;
      default:
        return false;
    }
  };

  // Handle filter click
  const handleFilterClick = (filterType, value) => {
    const newFilters = {};

    // If the same filter is clicked, clear it; otherwise set it
    if (isFilterActive(filterType, value)) {
      newFilters[filterType] = '';
    } else {
      newFilters[filterType] = value;
    }

    onFilterChange(newFilters);
  };

  // Render filter section
  const renderFilterSection = (title, data, filterType, icon) => {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]); // Sort by count descending

    if (entries.length === 0) return null;

    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            {icon}
            {title}
          </h3>
        </div>
        <div className="divide-y divide-slate-100">
          {entries.map(([value, count]) => {
            const isActive = isFilterActive(filterType, value);
            return (
              <button
                key={value}
                onClick={() => handleFilterClick(filterType, value)}
                className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                  isActive ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {filterType === 'status' && (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(value)}`}>
                        {value}
                      </span>
                    )}
                    {filterType !== 'status' && (
                      <span className="text-sm font-medium text-slate-800 capitalize">
                        {value}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${isActive ? 'text-blue-700' : 'text-slate-600'}`}>
                      {count}
                    </span>
                    {isActive && (
                      <svg className="h-4 w-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/4 mb-3"></div>
              <div className="space-y-2">
                <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                <div className="h-3 bg-slate-200 rounded w-2/3"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Get filtered equipment based on current filters
  const getFilteredEquipment = () => {
    if (!equipmentData || equipmentData.length === 0) return [];

    return equipmentData.filter(item => {
      // Apply all current filters
      if (currentFilters.status && item.status !== currentFilters.status) return false;
      if (currentFilters.category && item.category !== currentFilters.category) return false;
      if (currentFilters.type && item.type !== currentFilters.type) return false;
      if (currentFilters.location && item.location !== currentFilters.location) return false;
      if (currentFilters.brand && item.brand !== currentFilters.brand) return false;
      if (currentFilters.model && item.model !== currentFilters.model) return false;
      if (currentFilters.search && !`${item.brand} ${item.model} ${item.serial_number} ${item.type} ${item.category}`.toLowerCase().includes(currentFilters.search.toLowerCase())) return false;

      return true;
    });
  };

  const filteredEquipment = getFilteredEquipment();
  const hasActiveFilters = Object.values(currentFilters).some(val =>
    val && (typeof val === 'string' ? val.trim() !== '' : true)
  );

  // Render filtered equipment list
  const renderFilteredEquipmentList = () => {
    if (!hasActiveFilters || filteredEquipment.length === 0) return null;

    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-green-50 to-blue-50 px-4 py-3 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2m0-8h2m-2 0V3m0 2v2m2-2h2a2 2 0 012 2v6a2 2 0 01-2 2h-2m0 0v2a2 2 0 01-2 2H9a2 2 0 01-2-2v-2m2 0h2" />
                </svg>
                Filtered Equipment ({filteredEquipment.length} items)
              </h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {Object.entries(currentFilters).map(([key, value]) => {
                  // Skip dateRange object and empty values
                  if (!value || key === 'dateRange' || (typeof value === 'string' && value.trim() === '')) return null;
                  return (
                    <span key={key} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      <span className="capitalize">{key}:</span>
                      <span className="font-medium">{value}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onFilterChange({ [key]: '' });
                        }}
                        className="ml-1 hover:bg-blue-200 rounded-full p-0.5"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">
                {filteredEquipment.length} of {equipmentData.length} total
              </p>
              <p className="text-xs text-slate-500">
                Click items to view details
              </p>
            </div>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          <div className="divide-y divide-slate-100">
            {filteredEquipment.map((equipment, index) => (
              <div
                key={equipment.id}
                className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => window.location.href = `/equipment/${equipment.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 h-12 w-12">
                      {equipment.images && equipment.images.length > 0 ? (
                        <img
                          className="h-12 w-12 rounded-lg object-cover"
                          src={`${import.meta.env.VITE_API_URL}/uploads/${equipment.images[0]}`}
                          alt={`${equipment.brand} ${equipment.model}`}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-slate-200 flex items-center justify-center">
                          <svg className="h-6 w-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-800">
                        {equipment.brand} {equipment.model}
                      </h4>
                      <p className="text-sm text-slate-600">
                        {equipment.type} • SN: {equipment.serial_number}
                      </p>
                      {equipment.location && (
                        <p className="text-xs text-slate-500">
                          📍 {equipment.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(equipment.status)}`}>
                      {equipment.status}
                    </span>
                    <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {filteredEquipment.length > 10 && (
          <div className="bg-slate-50 px-4 py-2 text-center">
            <p className="text-xs text-slate-500">
              Showing {Math.min(10, filteredEquipment.length)} of {filteredEquipment.length} items
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter Summary View
            </h2>
            <p className="text-sm text-blue-700">
              Click on any item below to filter the equipment list. Active filters are highlighted.
            </p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => onFilterChange({
                status: '',
                category: '',
                type: '',
                location: '',
                brand: '',
                model: '',
                search: '',
                dateRange: {
                  startDate: null,
                  endDate: null
                }
              })}
              className="px-4 py-2 bg-white border border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear All Filters
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {renderFilterSection(
          'Status',
          summaries.status,
          'status',
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}

        {renderFilterSection(
          'Categories',
          summaries.categories,
          'category',
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        )}

        {renderFilterSection(
          'Types',
          summaries.types,
          'type',
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.99 1.99 0 013 12V7a4 4 0 014-4z" />
          </svg>
        )}

        {renderFilterSection(
          'Locations',
          summaries.locations,
          'location',
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )}

        {renderFilterSection(
          'Brands',
          summaries.brands,
          'brand',
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )}

        {renderFilterSection(
          'Models',
          summaries.models,
          'model',
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2m0-8h2m-2 0V3m0 2v2m2-2h2a2 2 0 012 2v6a2 2 0 01-2 2h-2m0 0v2a2 2 0 01-2 2H9a2 2 0 01-2-2v-2m2 0h2" />
          </svg>
        )}
      </div>


    </div>
  );
};

// Analytics Summary Component
const AnalyticsSummary = ({ equipmentData, onFilterChange, currentFilters, isLoading }) => {
  // Calculate analytics from equipment data
  const calculateAnalytics = () => {
    if (!equipmentData || equipmentData.length === 0) {
      return {
        total: 0,
        available: 0,
        inUse: 0,
        maintenance: 0,
        categories: {},
        types: {},
        locations: {},
        brands: {},
        recentlyAdded: 0
      };
    }

    const analytics = {
      total: equipmentData.length,
      available: 0,
      inUse: 0,
      maintenance: 0,
      categories: {},
      types: {},
      locations: {},
      brands: {},
      recentlyAdded: 0
    };

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    equipmentData.forEach(item => {
      // Count by status
      if (item.status === 'available') analytics.available++;
      else if (item.status === 'in-use') analytics.inUse++;
      else if (item.status === 'maintenance') analytics.maintenance++;

      // Count by category
      const category = item.category || 'Uncategorized';
      analytics.categories[category] = (analytics.categories[category] || 0) + 1;

      // Count by type
      const type = item.type || 'Unknown';
      analytics.types[type] = (analytics.types[type] || 0) + 1;

      // Count by location
      const location = item.location || 'No Location';
      analytics.locations[location] = (analytics.locations[location] || 0) + 1;

      // Count by brand
      const brand = item.brand || 'Unknown';
      analytics.brands[brand] = (analytics.brands[brand] || 0) + 1;

      // Count recently added (last 7 days)
      if (new Date(item.created_at) > oneWeekAgo) {
        analytics.recentlyAdded++;
      }
    });

    return analytics;
  };

  const analytics = calculateAnalytics();

  // Status cards data
  const statusCards = [
    {
      title: 'Total Equipment',
      value: analytics.total,
      icon: <ChartBarIcon />,
      color: 'blue',
      filter: { status: '' },
      description: 'All equipment in system'
    },
    {
      title: 'Available',
      value: analytics.available,
      icon: <TrendingUpIcon />,
      color: 'green',
      filter: { status: 'available' },
      description: 'Ready for use'
    },
    {
      title: 'In Use',
      value: analytics.inUse,
      icon: <TrendingUpIcon />,
      color: 'yellow',
      filter: { status: 'in-use' },
      description: 'Currently deployed'
    },
    {
      title: 'Maintenance',
      value: analytics.maintenance,
      icon: <TrendingUpIcon />,
      color: 'red',
      filter: { status: 'maintenance' },
      description: 'Under repair'
    }
  ];

  // Get color classes for different variants
  const getColorClasses = (color, isActive = false) => {
    const colors = {
      blue: {
        bg: isActive ? 'bg-blue-100 border-blue-500' : 'bg-blue-50 hover:bg-blue-100',
        text: 'text-blue-700',
        border: 'border-l-4 border-blue-500',
        icon: 'text-blue-600'
      },
      green: {
        bg: isActive ? 'bg-green-100 border-green-500' : 'bg-green-50 hover:bg-green-100',
        text: 'text-green-700',
        border: 'border-l-4 border-green-500',
        icon: 'text-green-600'
      },
      yellow: {
        bg: isActive ? 'bg-yellow-100 border-yellow-500' : 'bg-yellow-50 hover:bg-yellow-100',
        text: 'text-yellow-700',
        border: 'border-l-4 border-yellow-500',
        icon: 'text-yellow-600'
      },
      red: {
        bg: isActive ? 'bg-red-100 border-red-500' : 'bg-red-50 hover:bg-red-100',
        text: 'text-red-700',
        border: 'border-l-4 border-red-500',
        icon: 'text-red-600'
      }
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6 mb-6">
      {/* Status Overview Cards */}
      <div>
        <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <ChartBarIcon />
          Equipment Analytics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statusCards.map((card, index) => {
            const isActive = currentFilters.status === card.filter.status;
            const colorClasses = getColorClasses(card.color, isActive);

            return (
              <button
                key={index}
                onClick={() => onFilterChange(card.filter)}
                className={`${colorClasses.bg} ${colorClasses.border} p-4 rounded-lg transition-all duration-200 hover:shadow-md cursor-pointer text-left group ${
                  isActive ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                }`}
                title={`Filter by ${card.title.toLowerCase()}: ${card.description}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-sm font-medium ${colorClasses.text} mb-1`}>
                      {card.title}
                    </h3>
                    <p className={`text-2xl font-bold ${colorClasses.text}`}>
                      {isLoading ? '...' : card.value.toLocaleString()}
                    </p>
                    <p className={`text-xs ${colorClasses.text} opacity-75 mt-1`}>
                      {card.description}
                    </p>
                  </div>
                  <div className={`${colorClasses.icon} group-hover:scale-110 transition-transform`}>
                    {card.icon}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className="bg-gradient-to-r from-primary-50 to-blue-50 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-primary-700">
              {Object.keys(analytics.brands).length}
            </p>
            <p className="text-sm text-primary-600">Brands</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary-700">
              {Object.keys(analytics.types).length}
            </p>
            <p className="text-sm text-primary-600">Types</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary-700">
              {Object.keys(analytics.locations).length}
            </p>
            <p className="text-sm text-primary-600">Locations</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-700">
              {analytics.recentlyAdded}
            </p>
            <p className="text-sm text-green-600">Added This Week</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Equipment card component
const EquipmentCard = ({ equipment, canEdit, searchTerm }) => {
  const [showPreview, setShowPreview] = useState(false);

  // Use reference image if available, otherwise find the first image file
  let imageUrl = null;
  if (equipment.reference_image_id) {
    // Always prioritize the reference image
    // Use thumbnail for better performance in dashboard cards
    imageUrl = getFileUrl(equipment.reference_image_id, true);
  } else if (equipment.files && equipment.files.length > 0) {
    // If no reference image, try to find the first image file
    const imageFile = equipment.files.find(file => file.file_type === 'image');
    if (imageFile) {
      // Use thumbnail for better performance in dashboard cards
      imageUrl = getFileUrl(imageFile.id, true);
    }
  }

  // Status badge color
  const getStatusBadge = (status) => {
    switch(status) {
      case 'available':
        return <Badge variant="success">{status}</Badge>;
      case 'in-use':
        return <Badge variant="info">{status}</Badge>;
      case 'maintenance':
        return <Badge variant="warning">{status}</Badge>;
      case 'unavailable':
        return <Badge variant="danger">{status}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Highlight search term in text
  const highlightText = (text, term) => {
    if (!term || !text) return text;

    const regex = new RegExp(`(${term})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? <span key={i} className="bg-yellow-200 font-medium">{part}</span> : part
    );
  };

  return (
    <Card className="h-full transition-all duration-300 hover:shadow-lg hover:scale-[1.02] relative">
      <div
        className="relative h-40 bg-slate-100 rounded-t-lg overflow-hidden"
        onMouseEnter={() => setShowPreview(true)}
        onMouseLeave={() => setShowPreview(false)}
      >
        {imageUrl ? (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <img
              src={imageUrl}
              alt={`${equipment.brand} ${equipment.model}`}
              className="w-full h-full object-contain"
              style={{
                objectFit: 'contain',
                objectPosition: 'center'
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full bg-slate-200">
            <span className="text-slate-400 text-lg">No image</span>
          </div>
        )}

        {/* Preview tooltip */}
        {showPreview && (
          <div className="absolute inset-0 bg-slate-900 bg-opacity-80 p-4 text-white overflow-y-auto">
            <h4 className="font-medium">{equipment.brand} {equipment.model}</h4>
            <p className="text-sm mt-1">{equipment.description || 'No description available'}</p>
            <p className="text-sm mt-2">Serial: {equipment.serial_number}</p>
            <p className="text-sm">Location: {equipment.location || 'Not specified'}</p>
            <p className="text-sm">Quantity: {equipment.quantity || 1}</p>
          </div>
        )}
      </div>

      <Card.Body>
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-medium text-slate-800 capitalize">{equipment.type}</h3>
            {equipment.category && (
              <p className="text-xs text-slate-500">Category: {equipment.category}</p>
            )}
            {equipment.quantity && equipment.quantity !== 1 && (
              <p className="text-xs text-blue-600 font-medium">Qty: {equipment.quantity}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            {getStatusBadge(equipment.status)}
            {equipment.quantity === 0 && (
              <span className="text-xs text-red-600 font-medium">Out of Stock</span>
            )}
          </div>
        </div>
        <h2 className="text-lg font-semibold mb-1">
          {searchTerm ? (
            <>
              {highlightText(equipment.brand, searchTerm)}{' '}
              {highlightText(equipment.model, searchTerm)}
            </>
          ) : (
            `${equipment.brand} ${equipment.model}`
          )}
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          SN: {searchTerm ? highlightText(equipment.serial_number, searchTerm) : equipment.serial_number}
        </p>

        <div className="flex justify-between mt-auto pt-2 border-t border-slate-100">
          <Link
            to={`/equipment/${equipment.id}`}
            className="text-primary-600 hover:text-primary-800 flex items-center gap-1"
          >
            <ViewIcon /> View
          </Link>

          {canEdit && (
            <Link
              to={`/equipment/${equipment.id}/edit`}
              className="text-slate-600 hover:text-slate-800 flex items-center gap-1"
            >
              <EditIcon /> Edit
            </Link>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

// Skeleton loader for equipment cards
const EquipmentCardSkeleton = () => (
  <div className="bg-white rounded-lg shadow-soft overflow-hidden h-full animate-pulse">
    <div className="h-40 bg-slate-200"></div>
    <div className="p-4">
      <div className="flex justify-between">
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
        <div className="h-4 bg-slate-200 rounded w-1/4 mb-2"></div>
      </div>
      <div className="h-6 bg-slate-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
      <div className="border-t border-slate-100 pt-2 flex justify-between">
        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
        <div className="h-4 bg-slate-200 rounded w-1/4"></div>
      </div>
    </div>
  </div>
);

// Saved search chip component
const SavedSearchChip = ({ search, onApply, onDelete }) => (
  <div className="inline-flex items-center bg-primary-50 text-primary-700 rounded-full px-3 py-1 text-sm mr-2 mb-2">
    <button
      onClick={() => onApply(search)}
      className="mr-1 hover:text-primary-900"
      aria-label={`Apply saved search: ${search.name}`}
    >
      {search.name}
    </button>
    <button
      onClick={() => onDelete(search.id)}
      className="ml-1 text-primary-400 hover:text-primary-700"
      aria-label={`Delete saved search: ${search.name}`}
    >
      <CloseIcon className="w-4 h-4" />
    </button>
  </div>
);

// Main Dashboard component
const Dashboard = () => {
  const { user, canEditEquipment } = useAuth();
  const queryClient = useQueryClient();
  const observerTarget = useRef(null);

  // State for filters and search
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    category: '',
    status: '',
    location: '',
    dateRange: {
      startDate: null,
      endDate: null
    }
  });

  // State for search suggestions
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  // State for advanced research visibility
  const [showAdvancedResearch, setShowAdvancedResearch] = useState(false);

  // View mode state (list or card) - default to list view
  const [viewMode, setViewMode] = useState('list');

  // State for sorting
  const [sortBy, setSortBy] = useState('updated_at');
  const [sortOrder, setSortOrder] = useState('desc');




  // State for saved search name
  const [savedSearchName, setSavedSearchName] = useState('');
  const [showSaveSearchInput, setShowSaveSearchInput] = useState(false);

  // Fetch equipment with infinite query
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error
  } = useInfiniteQuery(
    ['equipment', filters, sortBy, sortOrder],
    async ({ pageParam = 1 }) => {
      const params = {
        page: pageParam,
        limit: 20,
        ...filters,
        sortBy,
        sortOrder
      };

      // Format date range if present
      if (filters.dateRange && filters.dateRange.startDate && filters.dateRange.endDate) {
        params.startDate = filters.dateRange.startDate.toISOString();
        params.endDate = filters.dateRange.endDate.toISOString();
      }

      return getEquipment(params);
    },
    {
      getNextPageParam: (lastPage) => {
        if (lastPage.page < lastPage.totalPages) {
          return lastPage.page + 1;
        }
        return undefined;
      },
      keepPreviousData: true,
    }
  );

  // Fetch search suggestions
  const { data: suggestions, isLoading: isSuggestionsLoading } = useQuery(
    ['equipment-suggestions', searchQuery],
    () => getEquipment({ search: searchQuery, limit: 5 }),
    {
      enabled: !!searchQuery && searchQuery.length > 2,
      keepPreviousData: true,
    }
  );

  // Fetch saved searches (only for admin/advanced users)
  const { data: savedSearches } = useQuery(
    ['saved-searches'],
    getSavedSearches,
    {
      enabled: canEditEquipment(),
    }
  );

  // Fetch equipment types for filter
  const { data: equipmentTypes = [] } = useQuery({
    queryKey: ['equipmentTypes'],
    queryFn: getEquipmentTypes
  });

  // Fetch categories for filter
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: getCategories
  });

  // Fetch all equipment for analytics (without pagination)
  const { data: allEquipmentData } = useQuery(
    ['equipment-analytics'],
    () => getEquipment({ limit: 10000 }), // Get all equipment for analytics
    {
      keepPreviousData: true,
    }
  );

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((value) => {
      setSearchQuery(value);
    }, 300),
    []
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setFilters(prev => ({ ...prev, search: value }));
    debouncedSearch(value);

    if (value.length > 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  // Handle filter changes
  // Unified filter change handler - works for both form inputs and analytics clicks
  const handleFilterChange = (e) => {
    if (e && e.target) {
      // Handle form input changes
      const { name, value } = e.target;
      setFilters(prev => ({ ...prev, [name]: value }));
    } else {
      // Handle analytics filter changes (when passed as object)
      setFilters(prev => ({
        ...prev,
        ...e,
        // Ensure dateRange is always preserved as an object
        dateRange: prev.dateRange || { startDate: null, endDate: null }
      }));
    }
  };

  // Handle date range change
  const handleDateRangeChange = (dates) => {
    const [start, end] = dates;
    setFilters(prev => ({
      ...prev,
      dateRange: {
        startDate: start,
        endDate: end
      }
    }));
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      search: '',
      type: '',
      category: '',
      status: '',
      location: '',
      dateRange: {
        startDate: null,
        endDate: null
      }
    });
    setSearchQuery('');
    setShowSuggestions(false);
  };

  // Handle sort change
  const handleSortChange = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };



  // Save current search
  const handleSaveSearch = async () => {
    if (!savedSearchName.trim()) {
      toast.error('Please enter a name for your saved search');
      return;
    }

    try {
      await saveSearch({
        name: savedSearchName,
        filters: JSON.stringify(filters),
        sortBy,
        sortOrder
      });

      queryClient.invalidateQueries(['saved-searches']);
      setSavedSearchName('');
      setShowSaveSearchInput(false);
      toast.success('Search saved successfully');
    } catch (error) {
      toast.error('Failed to save search');
      console.error('Save search error:', error);
    }
  };

  // Apply saved search
  const handleApplySavedSearch = (search) => {
    try {
      const parsedFilters = JSON.parse(search.filters);
      setFilters(parsedFilters);
      setSortBy(search.sortBy || 'updated_at');
      setSortOrder(search.sortOrder || 'desc');
      toast.info(`Applied saved search: ${search.name}`);
    } catch (error) {
      toast.error('Failed to apply saved search');
      console.error('Apply saved search error:', error);
    }
  };

  // Delete saved search
  const handleDeleteSavedSearch = async (id) => {
    try {
      await deleteSavedSearch(id);
      queryClient.invalidateQueries(['saved-searches']);
      toast.success('Search deleted successfully');
    } catch (error) {
      toast.error('Failed to delete search');
      console.error('Delete saved search error:', error);
    }
  };

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.5 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [observerTarget, fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Flatten equipment data from all pages
  const equipmentList = data?.pages.flatMap(page => page.equipment) || [];

  return (
    <div className="space-y-6">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-slate-800">Equipment Dashboard</h1>
      </div>

      {/* Analytics Summary */}
      <AnalyticsSummary
        equipmentData={allEquipmentData?.equipment || []}
        onFilterChange={handleFilterChange}
        currentFilters={filters}
        isLoading={isLoading}
      />

      {/* Sticky Search Bar */}
      <div className="sticky top-16 z-20 bg-slate-50 pt-4 pb-2 shadow-sm">
        <div className="relative">
          <Input
            id="search"
            name="search"
            placeholder="Search equipment by brand, model, serial number..."
            value={filters.search}
            onChange={handleSearchChange}
            icon={<SearchIcon />}
            className="rounded-full shadow-md"
            aria-label="Search equipment catalog"
          />

          {/* Search suggestions */}
          {showSuggestions && suggestions?.equipment?.length > 0 && (
            <div className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-slate-200 max-h-80 overflow-y-auto">
              {suggestions.equipment.map(item => (
                <Link
                  key={item.id}
                  to={`/equipment/${item.id}`}
                  className="block px-4 py-2 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                >
                  <div className="font-medium">{item.brand} {item.model}</div>
                  <div className="text-sm text-slate-500">
                    {item.type} • SN: {item.serial_number}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex mt-2 gap-2">
            {Object.values(filters).some(val =>
              val && (typeof val === 'string' ? val.trim() !== '' : true)
            ) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="flex items-center gap-1 text-slate-600"
              >
                <ClearIcon />
                <span>Clear Filters</span>
              </Button>
            )}

            {/* Advanced Research toggle button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedResearch(!showAdvancedResearch)}
              className="flex items-center gap-1"
              aria-expanded={showAdvancedResearch}
              aria-controls="advanced-research-panel"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>{showAdvancedResearch ? 'Hide Advanced Research' : 'Show Advanced Research'}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Advanced Research Panel */}
      <div
        id="advanced-research-panel"
        className={`transition-all duration-300 overflow-hidden ${
          showAdvancedResearch ? 'max-h-none opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-6 mt-4">
          {/* Sort Options */}
          <div className="bg-white rounded-lg shadow-md border border-slate-200 p-4">
            <h2 className="text-lg font-medium text-slate-800 mb-4">Sort Options</h2>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-slate-700">Sort by:</label>
              <Select
                id="sort"
                name="sort"
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split('-');
                  setSortBy(field);
                  setSortOrder(order);
                }}
                options={[
                  { value: 'updated_at-desc', label: 'Newest First' },
                  { value: 'updated_at-asc', label: 'Oldest First' },
                  { value: 'brand-asc', label: 'Brand (A-Z)' },
                  { value: 'brand-desc', label: 'Brand (Z-A)' },
                  { value: 'model-asc', label: 'Model (A-Z)' },
                  { value: 'model-desc', label: 'Model (Z-A)' },
                ]}
                className="w-48"
              />
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="bg-white rounded-lg shadow-md border border-slate-200 p-4">
            <h2 className="text-lg font-medium text-slate-800 mb-4">Advanced Filters</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category filter */}
              <Select
                id="category"
                name="category"
                label="Category"
                value={filters.category}
                onChange={handleFilterChange}
                options={[
                  { value: '', label: 'All Categories' },
                  ...(categories || []).map(category => ({
                    value: category.name,
                    label: category.name
                  }))
                ]}
              />

              {/* Type filter */}
              <Select
                id="type"
                name="type"
                label="Equipment Type"
                value={filters.type}
                onChange={handleFilterChange}
                options={[
                  { value: '', label: 'All Types' },
                  ...(equipmentTypes || []).map(type => ({
                    value: type.name,
                    label: type.name
                  }))
                ]}
              />

              {/* Status filter */}
              <Select
                id="status"
                name="status"
                label="Status"
                value={filters.status}
                onChange={handleFilterChange}
                options={[
                  { value: '', label: 'All Statuses' },
                  { value: 'available', label: 'Available' },
                  { value: 'in-use', label: 'In Use' },
                  { value: 'maintenance', label: 'Maintenance' },
                  { value: 'unavailable', label: 'Unavailable' },
                ]}
              />

              {/* Location filter */}
              <Input
                id="location"
                name="location"
                label="Location"
                placeholder="Filter by location"
                value={filters.location}
                onChange={handleFilterChange}
              />

              {/* Date range filter */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date Range
                </label>
                <DatePicker
                  selectsRange={true}
                  startDate={filters.dateRange?.startDate || null}
                  endDate={filters.dateRange?.endDate || null}
                  onChange={handleDateRangeChange}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white shadow-sm"
                  placeholderText="Select date range"
                  isClearable
                />
              </div>
            </div>
          </div>

          {/* Filter Summary View */}
          <div className="bg-white rounded-lg shadow-md border border-slate-200 p-4">
            <h2 className="text-lg font-medium text-slate-800 mb-4">Filter Summary</h2>
            <FilterSummaryList
              equipmentData={allEquipmentData?.equipment || []}
              onFilterChange={handleFilterChange}
              currentFilters={filters}
              isLoading={isLoading}
            />
          </div>

          {/* Saved Searches (for admin/advanced users) */}
          {canEditEquipment() && (
            <div className="bg-white rounded-lg shadow-md border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-slate-800">Saved Searches</h2>

                {!showSaveSearchInput ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSaveSearchInput(true)}
                    className="flex items-center gap-1"
                  >
                    <SaveIcon />
                    <span>Save Current Search</span>
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      id="savedSearchName"
                      name="savedSearchName"
                      placeholder="Enter search name"
                      value={savedSearchName}
                      onChange={(e) => setSavedSearchName(e.target.value)}
                      className="w-48"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSaveSearch}
                    >
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowSaveSearchInput(false);
                        setSavedSearchName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap">
                {savedSearches?.searches?.length > 0 ? (
                  savedSearches.searches.map(search => (
                    <SavedSearchChip
                      key={search.id}
                      search={search}
                      onApply={handleApplySavedSearch}
                      onDelete={handleDeleteSavedSearch}
                    />
                  ))
                ) : (
                  <p className="text-slate-500 text-sm">No saved searches yet. Save your current search to access it quickly later.</p>
                )}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Results Header with View Toggle */}
      <div className="bg-white rounded-lg shadow-md border border-slate-200 p-4 mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-medium text-slate-800">Equipment Results</h2>
            <p className="text-sm text-slate-500 mt-1">
              {equipmentList.length} items found
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {/* View toggle buttons */}
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                title="List view"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`px-3 py-2 text-sm font-medium transition-all ${
                  viewMode === 'card'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
                title="Card view"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>      {/* Results Grid */}
      <div>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <EquipmentCardSkeleton key={index} />
            ))}
          </div>
        ) : isError ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading equipment</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error?.message || 'Failed to load equipment data. Please try again.'}</p>
                </div>
              </div>
            </div>
          </div>
        ) : equipmentList.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-slate-800">No equipment found</h3>
            <p className="mt-2 text-slate-500">
              Try adjusting your search or filter criteria to find what you're looking for.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={handleClearFilters}
            >
              Clear All Filters
            </Button>
          </div>
        ) : (
          <>
            {/* Card View */}
            {viewMode === 'card' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {equipmentList.map(equipment => (
                  <EquipmentCard
                    key={equipment.id}
                    equipment={equipment}
                    canEdit={canEditEquipment()}
                    searchTerm={filters.search}
                  />
                ))}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
                <div className="divide-y divide-slate-100">
                  {equipmentList.map(equipment => (
                    <div
                      key={equipment.id}
                      className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => window.location.href = `/equipment/${equipment.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex-shrink-0 h-16 w-16">
                            {equipment.reference_image_id ? (
                              <img
                                className="h-16 w-16 rounded-lg object-cover"
                                src={getFileUrl(equipment.reference_image_id, true)}
                                alt={`${equipment.brand} ${equipment.model}`}
                              />
                            ) : (
                              <div className="h-16 w-16 rounded-lg bg-slate-200 flex items-center justify-center">
                                <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-slate-800">
                              {equipment.brand} {equipment.model}
                            </h3>
                            <p className="text-sm text-slate-600">
                              {equipment.type} • SN: {equipment.serial_number}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                              {equipment.location && (
                                <p className="text-xs text-slate-500">
                                  📍 {equipment.location}
                                </p>
                              )}
                              {equipment.quantity && equipment.quantity !== 1 && (
                                <p className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                                  Qty: {equipment.quantity}
                                </p>
                              )}
                              {equipment.quantity === 0 && (
                                <p className="text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded">
                                  Out of Stock
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={
                              equipment.status === 'available' ? 'success' :
                              equipment.status === 'in-use' ? 'info' :
                              equipment.status === 'maintenance' ? 'warning' :
                              equipment.status === 'unavailable' ? 'danger' : 'default'
                            }
                          >
                            {equipment.status}
                          </Badge>
                          <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Infinite scroll loading indicator */}
            <div ref={observerTarget} className="py-4 text-center">
              {isFetchingNextPage ? (
                <div className="flex justify-center items-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                  <span className="text-slate-500">Loading more...</span>
                </div>
              ) : hasNextPage ? (
                <span className="text-sm text-slate-500">Scroll to load more</span>
              ) : (
                <span className="text-sm text-slate-500">No more equipment to load</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
