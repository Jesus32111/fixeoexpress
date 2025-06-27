import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Car,
  Calendar,
  MapPin,
  Gauge,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Upload,
  FileText,
  Building2,
  Bell,
  Wrench,
  Clock
} from 'lucide-react';
import { apiClient } from '../context/AuthContext';

interface Vehicle {
  _id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  currentMileage: number;
  status: 'Operativo' | 'En Mantenimiento' | 'No Disponible' | 'Fuera de Servicio';
  soatExpiration: string;
  technicalReviewExpiration: string;
  warehouse: {
    _id: string;
    name: string;
    address: string;
    department: string;
  };
  documents: {
    soat?: {
      filename: string;
      originalName: string;
      uploadDate: string;
      size: number;
    };
    technicalReview?: {
      filename: string;
      originalName: string;
      uploadDate: string;
      size: number;
    };
    propertyCard?: {
      filename: string;
      originalName: string;
      uploadDate: string;
      size: number;
    };
    others?: Array<{
      filename: string;
      originalName: string;
      uploadDate: string;
      size: number;
      description: string;
    }>;
  };
  notes?: string;
  pendingMaintenance?: Array<{
    description: string;
    priority: 'Baja' | 'Media' | 'Alta' | 'Crítica';
    estimatedCost?: number;
    createdAt: string;
  }>;
  soatStatus?: 'valid' | 'expiring' | 'expired';
  technicalReviewStatus?: 'valid' | 'expiring' | 'expired';
  needsAttention?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Warehouse {
  _id: string;
  name: string;
  address: string;
  department: string;
}

const VehicleModule: React.FC = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [alertFilter, setAlertFilter] = useState('all');

  const [formData, setFormData] = useState({
    plate: '',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    currentMileage: 0,
    status: 'Operativo',
    soatExpiration: '',
    technicalReviewExpiration: '',
    warehouse: '',
    notes: ''
  });

  const [maintenanceData, setMaintenanceData] = useState({
    description: '',
    priority: 'Media',
    estimatedCost: ''
  });

  const [files, setFiles] = useState({
    soat: null as File | null,
    technicalReview: null as File | null,
    propertyCard: null as File | null,
    others: [] as File[]
  });

  const statusOptions = ['Operativo', 'En Mantenimiento', 'No Disponible', 'Fuera de Servicio'];
  const priorityOptions = ['Baja', 'Media', 'Alta', 'Crítica'];

  useEffect(() => {
    fetchVehicles();
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const response = await apiClient.get('/warehouses');
      setWarehouses(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching vehicles with filters:', {
        status: statusFilter !== 'all' ? statusFilter : undefined,
        warehouse: warehouseFilter !== 'all' ? warehouseFilter : undefined,
        search: searchTerm || undefined
      });

      const response = await apiClient.get('/vehicles', {
        params: {
          status: statusFilter !== 'all' ? statusFilter : undefined,
          warehouse: warehouseFilter !== 'all' ? warehouseFilter : undefined,
          search: searchTerm || undefined
        }
      });
      
      console.log('Vehicles fetched successfully:', response.data);
      setVehicles(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching vehicles:', error);
      const errorMessage = error.response?.data?.message || 'Error al cargar los vehículos';
      setError(errorMessage);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchVehicles();
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, statusFilter, warehouseFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      
      const formDataToSend = new FormData();
      
      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value.toString());
      });

      // Add files
      if (files.soat) formDataToSend.append('soat', files.soat);
      if (files.technicalReview) formDataToSend.append('technicalReview', files.technicalReview);
      if (files.propertyCard) formDataToSend.append('propertyCard', files.propertyCard);
      files.others.forEach(file => {
        formDataToSend.append('others', file);
      });

      console.log('Submitting vehicle data');

      if (editingVehicle) {
        await apiClient.put(`/vehicles/${editingVehicle._id}`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        console.log('Vehicle updated successfully');
      } else {
        await apiClient.post('/vehicles', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        console.log('Vehicle created successfully');
      }

      setShowForm(false);
      setEditingVehicle(null);
      resetForm();
      fetchVehicles();
    } catch (error: any) {
      console.error('Error saving vehicle:', error);
      const errorMessage = error.response?.data?.message || 'Error al guardar el vehículo';
      setError(errorMessage);
    }
  };

  const handleMaintenanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle) return;

    try {
      setError(null);
      
      const maintenanceItem = {
        description: maintenanceData.description,
        priority: maintenanceData.priority,
        estimatedCost: maintenanceData.estimatedCost ? parseFloat(maintenanceData.estimatedCost) : undefined
      };

      const updatedPendingMaintenance = [
        ...(selectedVehicle.pendingMaintenance || []),
        maintenanceItem
      ];

      await apiClient.put(`/vehicles/${selectedVehicle._id}`, {
        pendingMaintenance: updatedPendingMaintenance
      });

      setShowMaintenanceForm(false);
      setSelectedVehicle(null);
      setMaintenanceData({ description: '', priority: 'Media', estimatedCost: '' });
      fetchVehicles();
    } catch (error: any) {
      console.error('Error adding maintenance:', error);
      const errorMessage = error.response?.data?.message || 'Error al agregar mantenimiento';
      setError(errorMessage);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      currentMileage: vehicle.currentMileage,
      status: vehicle.status,
      soatExpiration: vehicle.soatExpiration ? vehicle.soatExpiration.split('T')[0] : '',
      technicalReviewExpiration: vehicle.technicalReviewExpiration ? vehicle.technicalReviewExpiration.split('T')[0] : '',
      warehouse: vehicle.warehouse._id,
      notes: vehicle.notes || ''
    });
    setFiles({
      soat: null,
      technicalReview: null,
      propertyCard: null,
      others: []
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este vehículo?')) {
      try {
        setError(null);
        await apiClient.delete(`/vehicles/${id}`);
        console.log('Vehicle deleted successfully');
        fetchVehicles();
      } catch (error: any) {
        console.error('Error deleting vehicle:', error);
        const errorMessage = error.response?.data?.message || 'Error al eliminar el vehículo';
        setError(errorMessage);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      plate: '',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      currentMileage: 0,
      status: 'Operativo',
      soatExpiration: '',
      technicalReviewExpiration: '',
      warehouse: '',
      notes: ''
    });
    setFiles({
      soat: null,
      technicalReview: null,
      propertyCard: null,
      others: []
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Operativo':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'En Mantenimiento':
        return <Wrench className="h-5 w-5 text-yellow-500" />;
      case 'No Disponible':
        return <Clock className="h-5 w-5 text-orange-500" />;
      case 'Fuera de Servicio':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <XCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Operativo':
        return 'bg-green-100 text-green-800';
      case 'En Mantenimiento':
        return 'bg-yellow-100 text-yellow-800';
      case 'No Disponible':
        return 'bg-orange-100 text-orange-800';
      case 'Fuera de Servicio':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Baja':
        return 'bg-blue-100 text-blue-800';
      case 'Media':
        return 'bg-yellow-100 text-yellow-800';
      case 'Alta':
        return 'bg-orange-100 text-orange-800';
      case 'Crítica':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getExpirationStatus = (expirationDate: string) => {
    const now = new Date();
    const expDate = new Date(expirationDate);
    const daysUntilExpiration = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiration < 0) return { status: 'expired', color: 'text-red-600', text: 'Vencido', icon: <XCircle className="h-4 w-4" /> };
    if (daysUntilExpiration <= 30) return { status: 'expiring', color: 'text-yellow-600', text: `${daysUntilExpiration} días`, icon: <AlertTriangle className="h-4 w-4" /> };
    return { status: 'valid', color: 'text-green-600', text: 'Vigente', icon: <CheckCircle className="h-4 w-4" /> };
  };

  const handleFileChange = (type: keyof typeof files, file: File | File[] | null) => {
    if (type === 'others' && Array.isArray(file)) {
      setFiles(prev => ({ ...prev, [type]: file }));
    } else if (type !== 'others' && !Array.isArray(file)) {
      setFiles(prev => ({ ...prev, [type]: file }));
    }
  };

  // Filter vehicles based on alert status
  const filteredVehicles = vehicles.filter(vehicle => {
    if (alertFilter === 'all') return true;
    if (alertFilter === 'alerts') {
      const soatStatus = getExpirationStatus(vehicle.soatExpiration);
      const techStatus = getExpirationStatus(vehicle.technicalReviewExpiration);
      const hasCriticalMaintenance = vehicle.pendingMaintenance?.some(m => m.priority === 'Crítica');
      return soatStatus.status !== 'valid' || techStatus.status !== 'valid' || hasCriticalMaintenance;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-gray-600">Cargando vehículos...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Vehículos</h1>
          <p className="text-gray-600">Administra tu flota de vehículos con alertas automáticas</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingVehicle(null);
            resetForm();
            setError(null);
          }}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Vehículo
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar vehículos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los estados</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <select
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los almacenes</option>
            {warehouses.map(warehouse => (
              <option key={warehouse._id} value={warehouse._id}>{warehouse.name}</option>
            ))}
          </select>

          <select
            value={alertFilter}
            onChange={(e) => setAlertFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos</option>
            <option value="alerts">Solo con alertas</option>
          </select>

          <div className="flex items-center text-sm text-gray-600">
            <Filter className="h-4 w-4 mr-2" />
            {filteredVehicles.length} vehículo{filteredVehicles.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
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

      {/* Vehicle Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVehicles.map((vehicle) => {
          const soatStatus = getExpirationStatus(vehicle.soatExpiration);
          const techStatus = getExpirationStatus(vehicle.technicalReviewExpiration);
          const hasCriticalMaintenance = vehicle.pendingMaintenance?.some(m => m.priority === 'Crítica');
          const hasAlerts = soatStatus.status !== 'valid' || techStatus.status !== 'valid' || hasCriticalMaintenance;
          
          return (
            <div key={vehicle._id} className={`bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${hasAlerts ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
              <div className="p-6">
                {/* Alert Badge */}
                {hasAlerts && (
                  <div className="flex items-center mb-3 p-2 bg-red-100 rounded-lg">
                    <Bell className="h-4 w-4 text-red-600 mr-2" />
                    <span className="text-sm font-medium text-red-800">Requiere atención</span>
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {vehicle.plate}
                    </h3>
                    <p className="text-sm text-gray-600">{vehicle.brand} {vehicle.model} ({vehicle.year})</p>
                  </div>
                  <div className="flex items-center space-x-1">
                    {getStatusIcon(vehicle.status)}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <Gauge className="h-4 w-4 mr-2" />
                    {vehicle.currentMileage.toLocaleString()} km
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Building2 className="h-4 w-4 mr-2" />
                    {vehicle.warehouse.name}
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mr-2" />
                    {vehicle.warehouse.department}
                  </div>
                </div>

                {/* Document Status */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center">
                      {soatStatus.icon}
                      <span className="ml-1">SOAT:</span>
                    </span>
                    <span className={soatStatus.color}>{soatStatus.text}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center">
                      {techStatus.icon}
                      <span className="ml-1">Rev. Técnica:</span>
                    </span>
                    <span className={techStatus.color}>{techStatus.text}</span>
                  </div>
                </div>

                {/* Pending Maintenance */}
                {vehicle.pendingMaintenance && vehicle.pendingMaintenance.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Mantenimientos Pendientes:</h4>
                    <div className="space-y-1">
                      {vehicle.pendingMaintenance.slice(0, 2).map((maintenance, index) => (
                        <div key={index} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 truncate">{maintenance.description}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(maintenance.priority)}`}>
                            {maintenance.priority}
                          </span>
                        </div>
                      ))}
                      {vehicle.pendingMaintenance.length > 2 && (
                        <p className="text-xs text-gray-500">+{vehicle.pendingMaintenance.length - 2} más</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(vehicle.status)}`}>
                    {vehicle.status}
                  </span>
                  <div className="flex items-center text-sm text-gray-600">
                    <FileText className="h-4 w-4 mr-1" />
                    {Object.keys(vehicle.documents || {}).length} docs
                  </div>
                </div>

                {vehicle.notes && (
                  <div className="mb-4 p-2 bg-gray-50 rounded text-sm text-gray-600">
                    <strong>Notas:</strong> {vehicle.notes}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(vehicle)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedVehicle(vehicle);
                        setShowMaintenanceForm(true);
                      }}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Agregar Mantenimiento"
                    >
                      <Wrench className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(vehicle._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(vehicle.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredVehicles.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <Car className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay vehículos</h3>
          <p className="text-gray-600 mb-6">Comienza agregando tu primer vehículo</p>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingVehicle(null);
              resetForm();
              setError(null);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Agregar Vehículo
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowForm(false)} />
            
            <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingVehicle ? 'Editar Vehículo' : 'Nuevo Vehículo'}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Placa *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.plate}
                      onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="ABC-123"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Marca *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Toyota"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Modelo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Hilux"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Año *
                    </label>
                    <input
                      type="number"
                      required
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      value={formData.year}
                      onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kilometraje Actual *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.1"
                      value={formData.currentMileage}
                      onChange={(e) => setFormData({ ...formData, currentMileage: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estado *
                    </label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vencimiento SOAT *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.soatExpiration}
                      onChange={(e) => setFormData({ ...formData, soatExpiration: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vencimiento Revisión Técnica *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.technicalReviewExpiration}
                      onChange={(e) => setFormData({ ...formData, technicalReviewExpiration: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Almacén *
                    </label>
                    <select
                      required
                      value={formData.warehouse}
                      onChange={(e) => setFormData({ ...formData, warehouse: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar almacén</option>
                      {warehouses.map(warehouse => (
                        <option key={warehouse._id} value={warehouse._id}>
                          {warehouse.name} - {warehouse.department}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notas para Fallas o Mantenimientos
                    </label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Notas sobre el estado del vehículo, fallas conocidas, mantenimientos pendientes..."
                    />
                  </div>
                </div>

                {/* Document Upload Section */}
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Documentos Adjuntos</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SOAT
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange('soat', e.target.files?.[0] || null)}
                          className="hidden"
                          id="soat-upload"
                        />
                        <label
                          htmlFor="soat-upload"
                          className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {files.soat ? files.soat.name : 'Subir SOAT'}
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Revisión Técnica
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange('technicalReview', e.target.files?.[0] || null)}
                          className="hidden"
                          id="tech-review-upload"
                        />
                        <label
                          htmlFor="tech-review-upload"
                          className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {files.technicalReview ? files.technicalReview.name : 'Subir Rev. Técnica'}
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tarjeta de Propiedad
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange('propertyCard', e.target.files?.[0] || null)}
                          className="hidden"
                          id="property-card-upload"
                        />
                        <label
                          htmlFor="property-card-upload"
                          className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {files.propertyCard ? files.propertyCard.name : 'Subir Tarjeta'}
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Otros Documentos
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          multiple
                          onChange={(e) => handleFileChange('others', Array.from(e.target.files || []))}
                          className="hidden"
                          id="others-upload"
                        />
                        <label
                          htmlFor="others-upload"
                          className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {files.others.length > 0 ? `${files.others.length} archivo(s)` : 'Subir Otros'}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

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
                    {editingVehicle ? 'Actualizar' : 'Crear'} Vehículo
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Maintenance Form Modal */}
      {showMaintenanceForm && selectedVehicle && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowMaintenanceForm(false)} />
            
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Agregar Mantenimiento Pendiente
                </h3>
                <button
                  onClick={() => setShowMaintenanceForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Vehículo:</strong> {selectedVehicle.plate} - {selectedVehicle.brand} {selectedVehicle.model}
                </p>
              </div>

              <form onSubmit={handleMaintenanceSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción del Mantenimiento *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={maintenanceData.description}
                    onChange={(e) => setMaintenanceData({ ...maintenanceData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe el mantenimiento necesario..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Prioridad *
                  </label>
                  <select
                    required
                    value={maintenanceData.priority}
                    onChange={(e) => setMaintenanceData({ ...maintenanceData, priority: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {priorityOptions.map(priority => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Costo Estimado (PEN)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={maintenanceData.estimatedCost}
                    onChange={(e) => setMaintenanceData({ ...maintenanceData, estimatedCost: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                  />
                </div>

                <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowMaintenanceForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Agregar Mantenimiento
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleModule;