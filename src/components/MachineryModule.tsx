import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Wrench,
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Upload, // Added for file uploads
  FileText, // Added for document icons
  Building2 // Added for warehouse icon
} from 'lucide-react';
import { apiClient } from '../context/AuthContext';

interface Warehouse {
  _id: string;
  name: string;
  address: string;
  department: string;
}

// Interface ajustada para coincidir con Vehicle.js
interface Machinery {
  _id: string;
  plate: string; // Cambiado de serialNumber
  brand: string;
  model: string;
  year: number;
  currentMileage: number; // Cambiado de hourMeter
  status: 'Operativo' | 'En Mantenimiento' | 'No Disponible' | 'Fuera de Servicio' | 'Alquilada'; // Ajustado enum
  soatExpiration: string;
  technicalReviewExpiration: string;
  warehouse: Warehouse; // Asumimos que siempre estará presente y es requerido
  documents?: {
    soat?: { filename: string; originalName: string; uploadDate: string; size: number };
    technicalReview?: { filename: string; originalName: string; uploadDate: string; size: number };
    propertyCard?: { filename: string; originalName: string; uploadDate: string; size: number };
    others?: Array<{ filename: string; originalName: string; uploadDate: string; size: number; description: string }>;
  };
  notes?: string;
  pendingMaintenance?: Array<{ // Añadido desde Vehicle.js
    description: string;
    priority: 'Baja' | 'Media' | 'Alta' | 'Crítica';
    estimatedCost?: number;
    createdAt: string;
  }>;
  maintenanceHistory?: Array<{ // Ajustado para incluir mileage
    date: string;
    type: 'Preventivo' | 'Correctivo' | 'Inspección';
    description: string;
    cost?: number;
    mileage?: number; // Añadido
    technician?: string;
  }>;
  // Campos virtuales del backend (opcionales en frontend si no se usan directamente para mostrar)
  soatStatus?: 'valid' | 'expiring' | 'expired';
  technicalReviewStatus?: 'valid' | 'expiring' | 'expired';
  needsAttention?: boolean;
  createdBy: string; // o un objeto User si se popula
  createdAt: string;
  updatedAt: string;
  // Campos eliminados: type, description (si no es parte del nuevo modelo), purchaseDate, purchasePrice, location, compatibleParts
}

const MachineryModule: React.FC = () => {
  const [machineries, setMachineries] = useState<Machinery[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingMachinery, setEditingMachinery] = useState<Machinery | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  // const [typeFilter, setTypeFilter] = useState('all'); // Eliminado, ya no existe el campo 'type'
  const [warehouseFilter, setWarehouseFilter] = useState('all');

  const [formData, setFormData] = useState({
    plate: '', // Cambiado de serialNumber
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    currentMileage: 0, // Cambiado de hourMeter
    status: 'Operativo', // Ajustado el valor por defecto
    soatExpiration: '', 
    technicalReviewExpiration: '', 
    warehouse: '', 
    notes: '' 
    // Campos eliminados: type, description, purchaseDate, purchasePrice, location
  });

  const [files, setFiles] = useState({
    soat: null as File | null,
    technicalReview: null as File | null,
    propertyCard: null as File | null,
    others: [] as File[]
  });

  const machineryTypes = [
    'Excavadora', 'Bulldozer', 'Grúa', 'Cargadora', 'Compactadora',
    'Retroexcavadora', 'Motoniveladora', 'Volquete', 'Otro'
  ]; // Este array ya no se usará directamente para el formulario, pero se puede mantener si hay lógica de filtrado antigua.

  const statusOptions = [ // Ajustado para coincidir con el nuevo modelo
    'Operativo', 'En Mantenimiento', 'No Disponible', 'Fuera de Servicio', 'Alquilada'
  ];

  useEffect(() => {
    fetchMachineries();
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

  const fetchMachineries = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: any = {
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        warehouse: warehouseFilter !== 'all' ? warehouseFilter : undefined,
      };
      // El filtro 'type' se elimina ya que el campo no existe en el nuevo modelo
      
      console.log('Fetching machineries with filters:', params);

      const response = await apiClient.get('/machinery', { params });
      
      console.log('Machineries fetched successfully:', response.data);
      setMachineries(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching machineries:', error);
      const errorMessage = error.response?.data?.message || 'Error al cargar las maquinarias';
      setError(errorMessage);
      setMachineries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchMachineries();
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, statusFilter, warehouseFilter]); // Eliminado typeFilter de las dependencias

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      
      const formDataToSend = new FormData(); // Changed to FormData for file uploads
      
      // Add form fields
      Object.entries(formData).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          formDataToSend.append(key, '');
        } else {
          formDataToSend.append(key, value.toString());
        }
      });
      // Asegurarse de que los campos numéricos se envíen correctamente
      formDataToSend.set('year', formData.year.toString());
      formDataToSend.set('currentMileage', formData.currentMileage.toString());
      // Los campos que no están en el nuevo modelo no se añaden explícitamente
      // como type, description, purchaseDate, purchasePrice, location.
      // El backend debería ignorarlos si se envían accidentalmente,
      // pero es mejor no enviarlos desde el frontend.

      // Add files
      if (files.soat) formDataToSend.append('soat', files.soat);
      if (files.technicalReview) formDataToSend.append('technicalReview', files.technicalReview);
      if (files.propertyCard) formDataToSend.append('propertyCard', files.propertyCard);
      files.others.forEach(file => {
        formDataToSend.append('others', file);
      });

      console.log('Submitting machinery data');

      if (editingMachinery) {
        await apiClient.put(`/machinery/${editingMachinery._id}`, formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        console.log('Machinery updated successfully');
      } else {
        await apiClient.post('/machinery', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        console.log('Machinery created successfully');
      }

      setShowForm(false);
      setEditingMachinery(null);
      resetForm();
      fetchMachineries();
    } catch (error: any) {
      console.error('Error saving machinery:', error.response?.data || error.message); // Log more details
      console.error('Error saving machinery:', error);
      const errorMessage = error.response?.data?.message || 'Error al guardar la maquinaria';
      setError(errorMessage);
    }
  };

  const handleEdit = (machinery: Machinery) => {
    setEditingMachinery(machinery);
    setFormData({
      plate: machinery.plate, // Cambiado de serialNumber
      brand: machinery.brand,
      model: machinery.model,
      year: machinery.year,
      currentMileage: machinery.currentMileage, // Cambiado de hourMeter
      status: machinery.status,
      soatExpiration: machinery.soatExpiration ? machinery.soatExpiration.split('T')[0] : '',
      technicalReviewExpiration: machinery.technicalReviewExpiration ? machinery.technicalReviewExpiration.split('T')[0] : '',
      warehouse: machinery.warehouse?._id || '', // Asumimos que warehouse puede ser null o undefined si no está seteado
      notes: machinery.notes || ''
      // Campos eliminados: type, description, purchaseDate, purchasePrice, location
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
    if (window.confirm('¿Estás seguro de que quieres eliminar esta maquinaria?')) {
      try {
        setError(null);
        await apiClient.delete(`/machinery/${id}`);
        console.log('Machinery deleted successfully');
        fetchMachineries();
      } catch (error: any) {
        console.error('Error deleting machinery:', error);
        const errorMessage = error.response?.data?.message || 'Error al eliminar la maquinaria';
        setError(errorMessage);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      plate: '', // Cambiado de serialNumber
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      currentMileage: 0, // Cambiado de hourMeter
      status: 'Operativo', // Ajustado el valor por defecto
      soatExpiration: '',
      technicalReviewExpiration: '',
      warehouse: '',
      notes: ''
      // Campos eliminados: type, description, purchaseDate, purchasePrice, location
    });
  setFiles({
    soat: null,
    technicalReview: null,
    propertyCard: null,
    others: []
  });
};

const handleFileChange = (type: keyof typeof files, file: File | File[] | null) => { // Added handleFileChange
  if (type === 'others' && Array.isArray(file)) {
    setFiles(prev => ({ ...prev, [type]: file }));
  } else if (type !== 'others' && !Array.isArray(file)) {
    setFiles(prev => ({ ...prev, [type]: file }));
  }
  };

  const getStatusIcon = (status: string) => { // Ajustado para nuevos estados
    switch (status) {
      case 'Operativo':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'Alquilada':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'En Mantenimiento':
        return <Wrench className="h-5 w-5 text-yellow-500" />;
      case 'No Disponible':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'Fuera de Servicio':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => { // Ajustado para nuevos estados
    switch (status) {
      case 'Operativo':
        return 'bg-green-100 text-green-800';
      case 'Alquilada':
        return 'bg-blue-100 text-blue-800';
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-gray-600">Cargando maquinarias...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Maquinarias</h1>
          <p className="text-gray-600">Administra tu flota de maquinarias</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingMachinery(null);
            resetForm();
            setError(null);
          }}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nueva Maquinaria
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4"> {/* Changed to 5 cols for warehouse filter */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar maquinarias..."
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

          {/* El filtro de tipo se elimina ya que 'type' no está en el nuevo modelo
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los tipos</option>
            {machineryTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select> 
          */}

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

          <div className="flex items-center text-sm text-gray-600">
            <Filter className="h-4 w-4 mr-2" />
            {machineries.length} maquinaria{machineries.length !== 1 ? 's' : ''}
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

      {/* Machinery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {machineries.map((machinery) => (
          <div key={machinery._id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {machinery.brand} {machinery.model} ({machinery.year})
                  </h3>
                  <p className="text-sm text-gray-600">Placa/Serie: {machinery.plate}</p>
                </div>
                <div className="flex items-center space-x-1">
                  {getStatusIcon(machinery.status)}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {/* El campo 'type' ya no existe */}
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  {(machinery.currentMileage || 0).toLocaleString()} Km/Horas {/* Asegura que currentMileage sea un número */}
                </div>
                {machinery.warehouse && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Building2 className="h-4 w-4 mr-2" />
                    {machinery.warehouse.name}
                  </div>
                )}
                {/* El campo 'location' ya no existe */}
              </div>
              
              {/* Document Status */}
              {(machinery.soatExpiration || machinery.technicalReviewExpiration) && (
                <div className="space-y-1 mb-3 text-xs">
                  {machinery.soatExpiration && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">SOAT:</span>
                      <span className={new Date(machinery.soatExpiration) < new Date() ? 'text-red-500' : 'text-green-500'}>
                        {new Date(machinery.soatExpiration).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {machinery.technicalReviewExpiration && (
                     <div className="flex items-center justify-between">
                      <span className="text-gray-500">Rev. Téc:</span>
                      <span className={new Date(machinery.technicalReviewExpiration) < new Date() ? 'text-red-500' : 'text-green-500'}>
                        {new Date(machinery.technicalReviewExpiration).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(machinery.status)}`}>
                  {machinery.status}
                </span>
                <div className="flex items-center text-sm text-gray-600">
                  <FileText className="h-4 w-4 mr-1" /> 
                  {Object.keys(machinery.documents || {}).length} docs
                </div>
              </div>
              
              {machinery.notes && ( // Display notes
                <div className="mb-4 p-2 bg-gray-50 rounded text-sm text-gray-600">
                  <strong>Notas:</strong> {machinery.notes}
                </div>
              )}

              {/* El campo 'description' ya no existe en la raíz del modelo Machinery,
                  podría estar dentro de pendingMaintenance o maintenanceHistory si es necesario.
                  Si se eliminó por completo, este bloque se puede quitar.
              {machinery.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {machinery.description}
                </p>
              )}
              */}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(machinery)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(machinery._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(machinery.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {machineries.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <Wrench className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay maquinarias</h3>
          <p className="text-gray-600 mb-6">Comienza agregando tu primera maquinaria</p>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingMachinery(null);
              resetForm();
              setError(null);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Agregar Maquinaria
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowForm(false)} />
            
            {/* Increased max-w-4xl for more space, max-h-[90vh] and overflow-y-auto for scroll */}
            <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingMachinery ? 'Editar Maquinaria' : 'Nueva Maquinaria'}
                </h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      placeholder="Ej: Caterpillar"
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
                      placeholder="Ej: 320D"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Placa / Número de Serie *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.plate}
                      onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: ABC123456"
                    />
                  </div>

                  {/* El campo 'Tipo' se elimina del formulario */}
                  {/*
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tipo *
                    </label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {machineryTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  */}

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
                      Estado
                    </label>
                    <select
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
                      Kilometraje / Horómetro *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.1"
                      value={formData.currentMileage}
                      onChange={(e) => setFormData({ ...formData, currentMileage: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Km u Horas de uso"
                    />
                  </div>

                  {/* El campo 'Ubicación' se elimina del formulario */}
                  {/*
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ubicación
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ubicación actual"
                    />
                  </div>
                  */}

                  {/* El campo 'Fecha de Compra' se elimina del formulario */}
                  {/*
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Compra
                    </label>
                    <input
                      type="date"
                      value={formData.purchaseDate}
                      onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  */}
                  
                  {/* El campo 'Precio de Compra' se elimina del formulario */}
                  {/*
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio de Compra
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.purchasePrice}
                      onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Precio en USD"
                    />
                  </div>
                  */}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vencimiento SOAT / Equivalente *
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
                      Vencimiento Revisión Técnica / Equivalente *
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
                      required // Warehouse es requerido
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
                      Notas Adicionales
                    </label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Notas sobre la maquinaria, mantenimientos, etc."
                    />
                  </div>
                </div>
                
                {/* Document Upload Section */}
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Documentos Adjuntos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SOAT / Equivalente
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange('soat', e.target.files?.[0] || null)}
                          className="hidden"
                          id="machinery-soat-upload"
                        />
                        <label
                          htmlFor="machinery-soat-upload"
                          className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {files.soat ? files.soat.name : 'Subir SOAT / Equiv.'}
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Revisión Técnica / Equivalente
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange('technicalReview', e.target.files?.[0] || null)}
                          className="hidden"
                          id="machinery-tech-review-upload"
                        />
                        <label
                          htmlFor="machinery-tech-review-upload"
                          className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {files.technicalReview ? files.technicalReview.name : 'Subir Rev. Técnica / Equiv.'}
                        </label>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tarjeta de Propiedad / Factura / Equivalente
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          onChange={(e) => handleFileChange('propertyCard', e.target.files?.[0] || null)}
                          className="hidden"
                          id="machinery-property-card-upload"
                        />
                        <label
                          htmlFor="machinery-property-card-upload"
                          className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {files.propertyCard ? files.propertyCard.name : 'Subir Tarjeta / Factura / Equiv.'}
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
                          id="machinery-others-upload"
                        />
                        <label
                          htmlFor="machinery-others-upload"
                          className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          {files.others.length > 0 ? `${files.others.length} archivo(s)` : 'Subir Otros'}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* El campo 'Descripción General' se elimina del formulario si no es parte del nuevo modelo
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción General
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Descripción adicional de la maquinaria..."
                  />
                </div>
                */}

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
                    {editingMachinery ? 'Actualizar' : 'Crear'} Maquinaria
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

export default MachineryModule;