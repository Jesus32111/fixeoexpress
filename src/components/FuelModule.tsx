import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Fuel,
  Calendar,
  TrendingUp,
  BarChart3,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Car,
  Wrench
} from 'lucide-react';
import { apiClient } from '../context/AuthContext';

interface Vehicle {
  _id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
}

interface Machinery {
  _id: string;
  brand: string;
  model: string;
  serialNumber: string;
  type: string;
}

interface FuelRecord {
  _id: string;
  vehicle?: Vehicle;
  machinery?: Machinery;
  quantity: number;
  pricePerGallon: number;
  totalCost: number;
  gasStation: {
    name: string;
    address?: string;
  };
  fuelDate: string;
  currentMileage?: number;
  currentHours?: number;
  fuelType: string;
  notes?: string;
  receiptNumber?: string;
  createdAt: string;
}

interface FuelStats {
  summary: {
    totalRecords: number;
    totalGallons: number;
    totalCost: number;
    averagePricePerGallon: number;
    maxPricePerGallon: number;
    minPricePerGallon: number;
  };
  fuelByType: Array<{
    _id: string;
    totalGallons: number;
    totalCost: number;
    records: number;
  }>;
  topGasStations: Array<{
    _id: string;
    totalGallons: number;
    totalCost: number;
    visits: number;
  }>;
  period: string;
}

const FuelModule: React.FC = () => {
  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>([]);
  const [stats, setStats] = useState<FuelStats | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [machineries, setMachineries] = useState<Machinery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<FuelRecord | null>(null);
  const [viewingRecord, setViewingRecord] = useState<FuelRecord | null>(null);
  
  // Filters and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [machineryFilter, setMachineryFilter] = useState('all');
  const [fuelTypeFilter, setFuelTypeFilter] = useState('all');
  const [gasStationFilter, setGasStationFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('month');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const [formData, setFormData] = useState({
    equipmentType: 'vehicle', // 'vehicle' or 'machinery'
    vehicle: '',
    machinery: '',
    quantity: '',
    pricePerGallon: '',
    gasStationName: '',
    gasStationAddress: '',
    fuelDate: new Date().toISOString().split('T')[0],
    currentMileage: '',
    currentHours: '',
    fuelType: 'Diesel B5',
    notes: '',
    receiptNumber: ''
  });

  const fuelTypes = [
    'Gasolina 84', 'Gasolina 90', 'Gasolina 95', 'Gasolina 97',
    'Diesel B5', 'Diesel B20', 'GLP', 'GNV'
  ];

  const [gasStations, setGasStations] = useState<string[]>([]);

  useEffect(() => {
    fetchFuelRecords();
    fetchStats();
    fetchVehicles();
    fetchMachineries();
  }, [currentPage, searchTerm, vehicleFilter, machineryFilter, fuelTypeFilter, gasStationFilter]);

  useEffect(() => {
    fetchStats();
  }, [periodFilter]);

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/fuel/stats', {
        params: { period: periodFilter }
      });
      setStats(response.data.data);
    } catch (error: any) {
      console.error('Error fetching fuel stats:', error);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await apiClient.get('/vehicles');
      setVehicles(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const fetchMachineries = async () => {
    try {
      const response = await apiClient.get('/machinery');
      setMachineries(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching machineries:', error);
    }
  };

  const fetchFuelRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/fuel', {
        params: {
          page: currentPage,
          limit: itemsPerPage,
          vehicleId: vehicleFilter !== 'all' ? vehicleFilter : undefined,
          machineryId: machineryFilter !== 'all' ? machineryFilter : undefined,
          fuelType: fuelTypeFilter !== 'all' ? fuelTypeFilter : undefined,
          gasStation: gasStationFilter !== 'all' ? gasStationFilter : undefined,
          search: searchTerm || undefined
        }
      });
      
      setFuelRecords(response.data.data || []);
      setTotalPages(response.data.pages || 1);
      setTotalItems(response.data.total || 0);

      // Extract unique gas stations for filter
      const uniqueStations = [...new Set(response.data.data.map((record: FuelRecord) => record.gasStation.name))];
      setGasStations(uniqueStations);
    } catch (error: any) {
      console.error('Error fetching fuel records:', error);
      const errorMessage = error.response?.data?.message || 'Error al cargar los registros de combustible';
      setError(errorMessage);
      setFuelRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      
      const submitData = {
        [formData.equipmentType]: formData.equipmentType === 'vehicle' ? formData.vehicle : formData.machinery,
        quantity: parseFloat(formData.quantity || '0'),
        pricePerGallon: parseFloat(formData.pricePerGallon || '0'),
        gasStation: {
          name: formData.gasStationName,
          address: formData.gasStationAddress || undefined
        },
        fuelDate: formData.fuelDate,
        currentMileage: formData.currentMileage ? parseFloat(formData.currentMileage) : undefined,
        currentHours: formData.currentHours ? parseFloat(formData.currentHours) : undefined,
        fuelType: formData.fuelType,
        notes: formData.notes || undefined,
        receiptNumber: formData.receiptNumber || undefined
      };

      if (editingRecord) {
        await apiClient.put(`/fuel/${editingRecord._id}`, submitData);
      } else {
        await apiClient.post('/fuel', submitData);
      }

      setShowForm(false);
      setEditingRecord(null);
      resetForm();
      fetchFuelRecords();
      fetchStats();
    } catch (error: any) {
      console.error('Error saving fuel record:', error);
      const errorMessage = error.response?.data?.message || 'Error al guardar el registro de combustible';
      setError(errorMessage);
    }
  };

  const handleEdit = (record: FuelRecord) => {
    setEditingRecord(record);
    setFormData({
      equipmentType: record.vehicle ? 'vehicle' : 'machinery',
      vehicle: record.vehicle?._id || '',
      machinery: record.machinery?._id || '',
      quantity: record.quantity.toString(),
      pricePerGallon: record.pricePerGallon.toString(),
      gasStationName: record.gasStation.name,
      gasStationAddress: record.gasStation.address || '',
      fuelDate: record.fuelDate.split('T')[0],
      currentMileage: record.currentMileage?.toString() || '',
      currentHours: record.currentHours?.toString() || '',
      fuelType: record.fuelType,
      notes: record.notes || '',
      receiptNumber: record.receiptNumber || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este registro?')) {
      try {
        setError(null);
        await apiClient.delete(`/fuel/${id}`);
        fetchFuelRecords();
        fetchStats();
      } catch (error: any) {
        console.error('Error deleting fuel record:', error);
        const errorMessage = error.response?.data?.message || 'Error al eliminar el registro';
        setError(errorMessage);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      equipmentType: 'vehicle',
      vehicle: '',
      machinery: '',
      quantity: '',
      pricePerGallon: '',
      gasStationName: '',
      gasStationAddress: '',
      fuelDate: new Date().toISOString().split('T')[0],
      currentMileage: '',
      currentHours: '',
      fuelType: 'Diesel B5',
      notes: '',
      receiptNumber: ''
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-PE');
  };

  if (loading && fuelRecords.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-gray-600">Cargando registros de combustible...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Control de Combustible</h1>
          <p className="text-gray-600">Gestiona el consumo de combustible por máquina y vehículo</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingRecord(null);
            resetForm();
            setError(null);
          }}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Registro
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Galones</p>
                <p className="text-3xl font-bold text-blue-600">{stats.summary.totalGallons.toFixed(1)}</p>
                <p className="text-sm text-gray-500">{periodFilter === 'day' ? 'Hoy' : periodFilter === 'week' ? 'Esta semana' : 'Este mes'}</p>
              </div>
              <Fuel className="h-12 w-12 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Costo Total</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.summary.totalCost)}</p>
                <p className="text-sm text-gray-500">{stats.summary.totalRecords} registros</p>
              </div>
              <TrendingUp className="h-12 w-12 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Precio Promedio</p>
                <p className="text-3xl font-bold text-purple-600">{formatCurrency(stats.summary.averagePricePerGallon)}</p>
                <p className="text-sm text-gray-500">por galón</p>
              </div>
              <BarChart3 className="h-12 w-12 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Precio Máximo</p>
                <p className="text-3xl font-bold text-red-600">{formatCurrency(stats.summary.maxPricePerGallon)}</p>
                <p className="text-sm text-gray-500">por galón</p>
              </div>
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
          </div>
        </div>
      )}

      {/* Period Filter */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Período de estadísticas:</span>
          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="day">Hoy</option>
            <option value="week">Esta semana</option>
            <option value="month">Este mes</option>
          </select>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={vehicleFilter}
            onChange={(e) => {
              setVehicleFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los vehículos</option>
            {vehicles.map(vehicle => (
              <option key={vehicle._id} value={vehicle._id}>
                {vehicle.plate} - {vehicle.brand} {vehicle.model}
              </option>
            ))}
          </select>

          <select
            value={machineryFilter}
            onChange={(e) => {
              setMachineryFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas las máquinas</option>
            {machineries.map(machinery => (
              <option key={machinery._id} value={machinery._id}>
                {machinery.brand} {machinery.model} - {machinery.serialNumber}
              </option>
            ))}
          </select>

          <select
            value={fuelTypeFilter}
            onChange={(e) => {
              setFuelTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los combustibles</option>
            {fuelTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={gasStationFilter}
            onChange={(e) => {
              setGasStationFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los grifos</option>
            {gasStations.map(station => (
              <option key={station} value={station}>{station}</option>
            ))}
          </select>

          <div className="flex items-center text-sm text-gray-600">
            <Filter className="h-4 w-4 mr-2" />
            {totalItems} registro{totalItems !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Fuel Records Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Equipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Combustible
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio/Galón
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grifo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fuelRecords.map((record) => (
                <tr key={record._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {record.vehicle ? (
                        <Car className="h-5 w-5 text-blue-500 mr-2" />
                      ) : (
                        <Wrench className="h-5 w-5 text-orange-500 mr-2" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {record.vehicle 
                            ? `${record.vehicle.plate}`
                            : `${record.machinery?.brand} ${record.machinery?.model}`
                          }
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.vehicle 
                            ? `${record.vehicle.brand} ${record.vehicle.model}`
                            : record.machinery?.serialNumber
                          }
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {record.fuelType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.quantity.toFixed(2)} gal
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(record.pricePerGallon)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(record.totalCost)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {record.gasStation.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(record.fuelDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setViewingRecord(record)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(record)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(record._id)}
                        className="text-red-600 hover:text-red-900"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando{' '}
                  <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                  {' '}a{' '}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, totalItems)}
                  </span>
                  {' '}de{' '}
                  <span className="font-medium">{totalItems}</span>
                  {' '}resultados
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Empty State */}
      {fuelRecords.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <Fuel className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay registros de combustible</h3>
          <p className="text-gray-600 mb-6">Comienza registrando tu primer consumo de combustible</p>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingRecord(null);
              resetForm();
              setError(null);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Crear Registro
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowForm(false)} />
            
            <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingRecord ? 'Editar Registro de Combustible' : 'Nuevo Registro de Combustible'}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Equipment Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Equipo *
                    </label>
                    <select
                      required
                      value={formData.equipmentType}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        equipmentType: e.target.value,
                        vehicle: '',
                        machinery: ''
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="vehicle">Vehículo</option>
                      <option value="machinery">Maquinaria</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {formData.equipmentType === 'vehicle' ? 'Vehículo' : 'Maquinaria'} *
                    </label>
                    <select
                      required
                      value={formData.equipmentType === 'vehicle' ? formData.vehicle : formData.machinery}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        [formData.equipmentType]: e.target.value 
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar {formData.equipmentType === 'vehicle' ? 'vehículo' : 'maquinaria'}</option>
                      {formData.equipmentType === 'vehicle' 
                        ? vehicles.map(vehicle => (
                            <option key={vehicle._id} value={vehicle._id}>
                              {vehicle.plate} - {vehicle.brand} {vehicle.model}
                            </option>
                          ))
                        : machineries.map(machinery => (
                            <option key={machinery._id} value={machinery._id}>
                              {machinery.brand} {machinery.model} - {machinery.serialNumber}
                            </option>
                          ))
                      }
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cantidad (Galones) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="0.01"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio por Galón (PEN) *
                    </label>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      value={formData.pricePerGallon}
                      onChange={(e) => setFormData({ ...formData, pricePerGallon: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre del Grifo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.gasStationName}
                      onChange={(e) => setFormData({ ...formData, gasStationName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: Primax, Repsol, Petroperú"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dirección del Grifo
                    </label>
                    <input
                      type="text"
                      value={formData.gasStationAddress}
                      onChange={(e) => setFormData({ ...formData, gasStationAddress: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Dirección del grifo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Carga *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.fuelDate}
                      onChange={(e) => setFormData({ ...formData, fuelDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo de Combustible *
                    </label>
                    <select
                      required
                      value={formData.fuelType}
                      onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {fuelTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {formData.equipmentType === 'vehicle' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kilometraje Actual
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={formData.currentMileage}
                        onChange={(e) => setFormData({ ...formData, currentMileage: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Kilometraje actual"
                      />
                    </div>
                  )}

                  {formData.equipmentType === 'machinery' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Horas Actuales
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={formData.currentHours}
                        onChange={(e) => setFormData({ ...formData, currentHours: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Horas de uso actuales"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Recibo
                    </label>
                    <input
                      type="text"
                      value={formData.receiptNumber}
                      onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Número del recibo o factura"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notas
                    </label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Notas adicionales sobre la carga de combustible..."
                    />
                  </div>
                </div>

                {/* Total Cost Display */}
                {formData.quantity && formData.pricePerGallon && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-blue-800">Costo Total:</span>
                      <span className="text-lg font-bold text-blue-900">
                        {formatCurrency(parseFloat(formData.quantity) * parseFloat(formData.pricePerGallon))}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {editingRecord ? 'Actualizar' : 'Crear'} Registro
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setViewingRecord(null)} />
            
            <div className="inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Detalles del Registro</h3>
                <button
                  onClick={() => setViewingRecord(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Equipo</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {viewingRecord.vehicle 
                        ? `${viewingRecord.vehicle.plate} - ${viewingRecord.vehicle.brand} ${viewingRecord.vehicle.model}`
                        : `${viewingRecord.machinery?.brand} ${viewingRecord.machinery?.model} - ${viewingRecord.machinery?.serialNumber}`
                      }
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Tipo de Combustible</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingRecord.fuelType}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Cantidad</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingRecord.quantity.toFixed(2)} galones</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Precio por Galón</label>
                    <p className="mt-1 text-sm text-gray-900">{formatCurrency(viewingRecord.pricePerGallon)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Costo Total</label>
                    <p className="mt-1 text-sm font-medium text-gray-900">{formatCurrency(viewingRecord.totalCost)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Fecha</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(viewingRecord.fuelDate)}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-500">Grifo</label>
                  <p className="mt-1 text-sm text-gray-900">{viewingRecord.gasStation.name}</p>
                  {viewingRecord.gasStation.address && (
                    <p className="text-sm text-gray-600">{viewingRecord.gasStation.address}</p>
                  )}
                </div>

                {(viewingRecord.currentMileage || viewingRecord.currentHours) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      {viewingRecord.currentMileage ? 'Kilometraje' : 'Horas'}
                    </label>
                    <p className="mt-1 text-sm text-gray-900">
                      {viewingRecord.currentMileage 
                        ? `${viewingRecord.currentMileage.toLocaleString()} km`
                        : `${viewingRecord.currentHours} horas`
                      }
                    </p>
                  </div>
                )}

                {viewingRecord.receiptNumber && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Número de Recibo</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingRecord.receiptNumber}</p>
                  </div>
                )}

                {viewingRecord.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Notas</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingRecord.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setViewingRecord(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    handleEdit(viewingRecord);
                    setViewingRecord(null);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Editar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FuelModule;