import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDatabaseTables,
  getTableStructure,
  getTableData,
  executeQuery,
  updateTableRow,
  getDatabaseInfo,
  testDatabaseConnection
} from '../services/databaseService';
import { Card, Button, Input } from './ui';
import { toast } from 'react-toastify';

const DatabaseManager = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('tables');
  const [selectedTable, setSelectedTable] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResults, setQueryResults] = useState(null);
  const [editingRow, setEditingRow] = useState(null);
  const [editData, setEditData] = useState({});

  const queryClient = useQueryClient();

  // Fetch database info
  const { data: dbInfo } = useQuery({
    queryKey: ['database-info'],
    queryFn: getDatabaseInfo
  });

  // Fetch all tables
  const { data: tablesData, isLoading: tablesLoading, error: tablesError } = useQuery({
    queryKey: ['database-tables'],
    queryFn: getDatabaseTables,
    retry: 1,
    onError: (error) => {
      console.error('[DATABASE MANAGER] Tables query error:', error);
      toast.error(`Failed to load tables: ${error.message}`);
    }
  });

  // Fetch table structure
  const { data: tableStructure } = useQuery({
    queryKey: ['table-structure', selectedTable],
    queryFn: () => getTableStructure(selectedTable),
    enabled: !!selectedTable
  });

  // Fetch table data
  const { data: tableData, isLoading: tableDataLoading } = useQuery({
    queryKey: ['table-data', selectedTable, currentPage],
    queryFn: () => getTableData(selectedTable, currentPage, 50),
    enabled: !!selectedTable
  });

  // Execute query mutation
  const executeQueryMutation = useMutation({
    mutationFn: executeQuery,
    onSuccess: (data) => {
      setQueryResults(data);
      toast.success('Query executed successfully');
    },
    onError: (error) => {
      toast.error(`Query failed: ${error.message}`);
    }
  });

  // Update row mutation
  const updateRowMutation = useMutation({
    mutationFn: ({ tableName, id, data }) => updateTableRow(tableName, id, data),
    onSuccess: () => {
      toast.success('Row updated successfully');
      setEditingRow(null);
      setEditData({});
      queryClient.invalidateQueries(['table-data', selectedTable]);
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    }
  });

  const handleExecuteQuery = () => {
    if (!sqlQuery.trim()) {
      toast.error('Please enter a SQL query');
      return;
    }
    executeQueryMutation.mutate(sqlQuery);
  };

  const handleEditRow = (row) => {
    setEditingRow(row.id);
    setEditData({ ...row });
  };

  const handleSaveRow = () => {
    updateRowMutation.mutate({
      tableName: selectedTable,
      id: editingRow,
      data: editData
    });
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditData({});
  };

  const handleTestConnection = async () => {
    try {
      const result = await testDatabaseConnection();
      toast.success(`Database connection successful! Database: ${result.database}`);
      console.log('[DATABASE MANAGER] Connection test result:', result);
    } catch (error) {
      toast.error(`Database connection failed: ${error.message}`);
      console.error('[DATABASE MANAGER] Connection test failed:', error);
    }
  };

  const formatValue = (value) => {
    if (value === null) return 'NULL';
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const tabs = [
    { id: 'tables', label: 'Tables', icon: '📊' },
    { id: 'query', label: 'Query', icon: '🔍' },
    { id: 'info', label: 'Database Info', icon: 'ℹ️' }
  ];

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Database Manager</h1>
            <p className="text-sm text-slate-600 mt-1">
              Connected to: <span className="font-mono text-primary-600">ton-lager1-cv8k6-mysql</span>
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-slate-600">Connected</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleTestConnection}
            >
              Test Connection
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onClose || (() => window.history.back())}
            >
              ← Back to Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="px-6 py-6">

          {/* Navigation Tabs */}
          <div className="border-b border-slate-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3 px-4 border-b-2 font-medium text-base flex items-center space-x-3 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600 bg-primary-50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tables Tab */}
          {activeTab === 'tables' && (
            <div className="flex gap-6 min-h-0">
              {/* Tables List */}
              <div className="w-80 flex-shrink-0">
                <Card className="h-fit max-h-screen overflow-hidden flex flex-col">
                  <Card.Header className="flex-shrink-0">
                    <h3 className="text-lg font-semibold">Database Tables</h3>
                  </Card.Header>
                  <Card.Body className="p-0 flex-1 overflow-auto">
              {tablesLoading ? (
                <div className="p-4 text-center text-slate-500">Loading tables...</div>
              ) : tablesError ? (
                <div className="p-4 text-center">
                  <div className="text-red-600 mb-2">❌ Error loading tables</div>
                  <div className="text-sm text-slate-600">{tablesError.message}</div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2"
                    onClick={() => queryClient.invalidateQueries(['database-tables'])}
                  >
                    Retry
                  </Button>
                </div>
              ) : !tablesData?.tables?.length ? (
                <div className="p-4 text-center text-slate-500">
                  No tables found in database
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tablesData.tables.map((table) => (
                    <button
                      key={table.TABLE_NAME}
                      onClick={() => {
                        setSelectedTable(table.TABLE_NAME);
                        setCurrentPage(1);
                      }}
                      className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                        selectedTable === table.TABLE_NAME ? 'bg-primary-50 border-r-2 border-primary-500' : ''
                      }`}
                    >
                      <div className="font-medium text-slate-800">{table.TABLE_NAME}</div>
                      <div className="text-sm text-slate-500">
                        {table.TABLE_ROWS || 0} rows
                      </div>
                    </button>
                  ))}
                </div>
              )}
                </Card.Body>
                </Card>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex flex-col gap-6 min-w-0 overflow-auto">
                {/* Table Structure */}
                {selectedTable && (
                  <Card className="flex-shrink-0">
                    <Card.Header>
                      <h3 className="text-lg font-semibold">Table Structure: {selectedTable}</h3>
                    </Card.Header>
              <Card.Body className="p-0">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Column</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Null</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Key</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {tableStructure?.columns?.map((column) => (
                        <tr key={column.COLUMN_NAME} className="hover:bg-slate-50">
                          <td className="px-4 py-2 text-sm font-medium text-slate-800">
                            {column.COLUMN_NAME}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-600">
                            {column.DATA_TYPE}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-600">
                            {column.IS_NULLABLE}
                          </td>
                          <td className="px-4 py-2 text-sm text-slate-600">
                            {column.COLUMN_KEY}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                    </Card.Body>
                  </Card>
                )}

                {/* Table Data */}
                {selectedTable && (
                  <Card className="flex-1 flex flex-col min-h-0">
                    <Card.Header className="flex-shrink-0">
                      <h3 className="text-lg font-semibold">Table Data: {selectedTable}</h3>
                    </Card.Header>
                    <Card.Body className="p-0 flex-1 flex flex-col min-h-0">
                      {tableDataLoading ? (
                        <div className="p-4 text-center text-slate-500">Loading data...</div>
                      ) : (
                        <>
                          <div className="flex-1 overflow-auto">
                      <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            {tableData?.data?.[0] && Object.keys(tableData.data[0]).map((key) => (
                              <th key={key} className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                                {key}
                              </th>
                            ))}
                            <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {tableData?.data?.map((row) => (
                            <tr key={row.id} className="hover:bg-slate-50">
                              {Object.entries(row).map(([key, value]) => (
                                <td key={key} className="px-4 py-2 text-sm text-slate-600">
                                  {editingRow === row.id ? (
                                    <Input
                                      value={editData[key] || ''}
                                      onChange={(e) => setEditData({ ...editData, [key]: e.target.value })}
                                      className="text-xs"
                                    />
                                  ) : (
                                    <span className="font-mono text-xs">{formatValue(value)}</span>
                                  )}
                                </td>
                              ))}
                              <td className="px-4 py-2 text-sm">
                                {editingRow === row.id ? (
                                  <div className="flex space-x-1">
                                    <Button size="sm" onClick={handleSaveRow}>Save</Button>
                                    <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                                  </div>
                                ) : (
                                  <Button size="sm" variant="outline" onClick={() => handleEditRow(row)}>
                                    Edit
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination */}
                    {tableData?.pagination && (
                      <div className="p-4 border-t border-slate-200 flex items-center justify-between">
                        <div className="text-sm text-slate-600">
                          Page {tableData.pagination.page} of {tableData.pagination.totalPages} 
                          ({tableData.pagination.total} total rows)
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setCurrentPage(currentPage + 1)}
                            disabled={currentPage >= tableData.pagination.totalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                          )}
                        </>
                      )}
                    </Card.Body>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* Query Tab */}
          {activeTab === 'query' && (
            <div className="flex flex-col gap-6 min-h-0">
              <Card className="flex-shrink-0">
                <Card.Header>
                  <h3 className="text-lg font-semibold">SQL Query Editor</h3>
                  <p className="text-sm text-slate-600">Execute SELECT queries to view data. Dangerous operations are restricted.</p>
                </Card.Header>
            <Card.Body>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">SQL Query</label>
                  <textarea
                    value={sqlQuery}
                    onChange={(e) => setSqlQuery(e.target.value)}
                    placeholder="SELECT * FROM equipment WHERE status = 'available';"
                    className="w-full h-48 p-4 border border-slate-300 rounded-md font-mono text-base focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-y"
                  />
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-slate-500">
                    💡 Tip: Only SELECT queries are allowed for security
                  </div>
                  <Button 
                    onClick={handleExecuteQuery}
                    disabled={executeQueryMutation.isPending}
                  >
                    {executeQueryMutation.isPending ? 'Executing...' : 'Execute Query'}
                  </Button>
                </div>
              </div>
            </Card.Body>
          </Card>

              {/* Query Results */}
              {queryResults && (
                <Card className="flex-1 flex flex-col min-h-0">
                  <Card.Header className="flex-shrink-0">
                    <h3 className="text-lg font-semibold">Query Results</h3>
                    <p className="text-sm text-slate-600">
                      {queryResults.metadata?.rowCount} rows returned
                    </p>
                  </Card.Header>
                  <Card.Body className="p-0 flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        {queryResults.results?.[0] && Object.keys(queryResults.results[0]).map((key) => (
                          <th key={key} className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {queryResults.results?.map((row, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          {Object.entries(row).map(([key, value]) => (
                            <td key={key} className="px-4 py-2 text-sm text-slate-600">
                              <span className="font-mono text-xs">{formatValue(value)}</span>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                    </div>
                  </Card.Body>
                </Card>
              )}
            </div>
          )}

          {/* Database Info Tab */}
          {activeTab === 'info' && (
            <Card className="max-w-4xl">
              <Card.Header>
                <h3 className="text-lg font-semibold">Database Information</h3>
              </Card.Header>
          <Card.Body>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-slate-800 mb-3">Connection Details</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Host:</span>
                    <span className="font-mono">ton-lager1-cv8k6-mysql.ton-lager1-cv8k6.svc.cluster.local</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Port:</span>
                    <span className="font-mono">3306</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Database:</span>
                    <span className="font-mono">{dbInfo?.database?.database_name || 'substantial-gray-unicorn'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">User:</span>
                    <span className="font-mono">canid</span>
                  </div>
                </div>
              </div>
              
              {dbInfo && (
                <div>
                  <h4 className="font-medium text-slate-800 mb-3">Server Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">MySQL Version:</span>
                      <span className="font-mono">{dbInfo.server?.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Character Set:</span>
                      <span className="font-mono">{dbInfo.database?.charset}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Collation:</span>
                      <span className="font-mono">{dbInfo.database?.collation}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
              </Card.Body>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseManager;
