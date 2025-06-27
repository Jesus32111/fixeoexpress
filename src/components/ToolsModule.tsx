import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Wrench,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Building2,
  User,
  Calendar,
  DollarSign
} from 'lucide-react';
import { apiClient } from '../context/AuthContext';

interface Warehouse {
  _id: string;
  name: string;
  address: string;
  department: string;
}

interface Tool {
  _id: string;
  name: string;
  code?: string;
  category: string;
  warehouse: Warehouse;
  condition: 'Excelente' | 'Bueno' | 'Regular' | 'Malo' | 'Fuera de Servicio';
  status: 'Disponible' | 'En Uso' | 'En Mantenimiento' | 'Perdida' | 'Dañada';
  assignedTo?: string;
  assignedDate?: string;
  purchaseDate?: string;
  purchasePrice?: number;
  brand?: string;
  model?: string;
  serialNumber?: string;
  notes?: string;
  maintenanceHistory?: Array<{
    date: string;
    type: string;
    description: string;
    cost?: number;
    technician?: string;
  }>;
  needsAttention?: boolean;
  createdAt: string;
}

const ToolsModule: React.FC = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingTool, setEditingTool] = useState<Tool | null>(null);
  const [viewingTool, setViewingTool] = useState<Tool | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [conditionFilter, setConditionFilter] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'Otros',
    warehouse: '',
    condition: 'Bueno',
    status: 'Disponible',
    assignedTo: '',
    assignedDate: '',
    purchaseDate: '',
    purchasePrice: '',
    brand: '',
    model: '',
    serialNumber: '',
    notes: ''
  });

  const categories = [
    'Herramientas Manuales',
    'Herramientas Eléctricas',
    'Herramientas Neumáticas',
    'Herramientas de Medición',
    'Herramientas de Corte',
    'Herramientas de Soldadura',
    'Herramientas de Seguridad',
    'Equipos de Elevación',
    'Otros'
  ];

  const conditions = ['Excelente', 'Bueno', 'Regular', 'Malo', 'Fuera de Servicio'];
  const statuses = ['Disponible', 'En Uso', 'En Mantenimiento', 'Perdida', 'Dañada'];

  useEffect(() => {
    fetchTools();
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

  const fetchTools = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/tools', {
        params: {
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          warehouse: warehouseFilter !== 'all' ? warehouseFilter : undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          condition: conditionFilter !== 'all' ? conditionFilter : undefined,
          search: searchTerm || undefined
        }
      });
      
      setTools(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching tools:', error);
      const errorMessage = error.response?.data?.message || 'Error al cargar las herramientas';
      setError(errorMessage);
      setTools([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchTools();
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, categoryFilter, warehouseFilter, statusFilter, conditionFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      
      const submitData = {
        ...formData,
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
        purchaseDate: formData.purchaseDate || undefined,
        assignedDate: formData.assignedDate || undefined
      };

      if (editingTool) {
        await apiClient.put(`/tools/${editingTool._id}`, submitData);
      } else {
        await apiClient.post('/tools', submitData);
      }

      setShowForm(false);
      setEditingTool(null);
      resetForm();
      fetchTools();
    } catch (error: any) {
      console.error('Error saving tool:', error);
      const errorMessage = error.response?.data?.message || 'Error al guardar la herramienta';
      setError(errorMessage);
    }
  };

  const handleEdit = (tool: Tool) => {
    setEditingTool(tool);
    setFormData({
      name: tool.name,
      code: tool.code || '',
      category: tool.category,
      warehouse: tool.warehouse._id,
      condition: tool.condition,
      status: tool.status,
      assignedTo: tool.assignedTo || '',
      assignedDate: tool.assignedDate ? tool.assignedDate.split('T')[0] : '',
      purchaseDate: tool.purchaseDate ? tool.purchaseDate.split('T')[0] : '',
      purchasePrice: tool.purchasePrice?.toString() || '',
      brand: tool.brand || '',
      model: tool.model || '',
      serialNumber: tool.serialNumber || '',
      notes: tool.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar esta herramienta?')) {
      try {
        setError(null);
        await apiClient.delete(`/tools/${id}`);
        fetchTools();
      } catch (error: any) {
        console.error('Error deleting tool:', error);
        const errorMessage = error.response?.data?.message || 'Error al eliminar la herramienta';
        setError(errorMessage);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      category: 'Otros',
      warehouse: '',
      condition: 'Bueno',
      status: 'Disponible',
      assignedTo: '',
      assignedDate: '',
      purchaseDate: '',
      purchasePrice: '',
      brand: '',
      model: '',
      serialNumber: '',
      notes: ''
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Disponible':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'En Uso':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'En Mantenimiento':
        return <Wrench className="h-4 w-4 text-yellow-500" />;
      case 'Perdida':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'Dañada':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Disponible':
        return 'bg-green-100 text-green-800';
      case 'En Uso':
        return 'bg-blue-100 text-blue-800';
      case 'En Mantenimiento':
        return 'bg-yellow-100 text-yellow-800';
      case 'Perdida':
        return 'bg-red-100 text-red-800';
      case 'Dañada':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Excelente':
        return 'bg-green-100 text-green-800';
      case 'Bueno':
        return 'bg-blue-100 text-blue-800';
      case 'Regular':
        return 'bg-yellow-100 text-yellow-800';
      case 'Malo':
        return 'bg-orange-100 text-orange-800';
      case 'Fuera de Servicio':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-gray-600">Cargando herramientas...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Herramientas</h1>
          <p className="text-gray-600">Registro y ubicación de herramientas</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingTool(null);
            resetForm();
            setError(null);
          }}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nueva Herramienta
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar herramientas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas las categorías</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los estados</option>
            {statuses.map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas las condiciones</option>
            {conditions.map(condition => (
              <option key={condition} value={condition}>{condition}</option>
            ))}
          </select>

          <div className="flex items-center text-sm text-gray-600">
            <Filter className="h-4 w-4 mr-2" />
            {tools.length} herramienta{tools.length !== 1 ? 's' : ''}
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

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <div key={tool._id} className={`bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${tool.needsAttention ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
            <div className="p-6">
              {/* Alert Badge */}
              {tool.needsAttention && (
                <div className="flex items-center mb-3 p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                  <span className="text-sm font-medium text-red-800">Requiere atención</span>
                </div>
              )}

              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {tool.name}
                  </h3>
                  {tool.code && (
                    <p className="text-sm text-gray-600">Código: {tool.code}</p>
                  )}
                  <p className="text-sm text-gray-600">{tool.category}</p>
                </div>
                <Wrench className="h-6 w-6 text-blue-600" />
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Building2 className="h-4 w-4 mr-2" />
                  {tool.warehouse.name}
                </div>
                {tool.brand && tool.model && (
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="font-medium">{tool.brand} {tool.model}</span>
                  </div>
                )}
                {tool.assignedTo && (
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="h-4 w-4 mr-2" />
                    Asignado a: {tool.assignedTo}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mb-4">
                <div className="flex flex-col space-y-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tool.status)}`}>
                    {getStatusIcon(tool.status)}
                    <span className="ml-1">{tool.status}</span>
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConditionColor(tool.condition)}`}>
                    {tool.condition}
                  </span>
                </div>
                {tool.purchasePrice && (
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="h-4 w-4 mr-1" />
                    {formatCurrency(tool.purchasePrice)}
                  </div>
                )}
              </div>

              {tool.notes && (
                <div className="mb-4 p-2 bg-gray-50 rounded text-sm text-gray-600">
                  <strong>Notas:</strong> {tool.notes}
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewingTool(tool)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Ver detalles"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(tool)}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(tool._id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <span className="text-xs text-gray-500">
                  {new Date(tool.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {tools.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <Wrench className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay herramientas</h3>
          <p className="text-gray-600 mb-6">Comienza registrando tu primera herramienta</p>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingTool(null);
              resetForm();
              setError(null);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Agregar Herramienta
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowForm(false)} />
            
            <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingTool ? 'Editar Herramienta' : 'Nueva Herramienta'}
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
                      Nombre de la Herramienta *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: Taladro Percutor"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: HER-001"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Categoría *
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Condición
                    </label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {conditions.map(condition => (
                        <option key={condition} value={condition}>{condition}</option>
                      ))}
                    </select>
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
                      {statuses.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Marca
                    </label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Marca de la herramienta"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Modelo
                    </label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Modelo de la herramienta"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Serie
                    </label>
                    <input
                      type="text"
                      value={formData.serialNumber}
                      onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Número de serie"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Asignado a
                    </label>
                    <input
                      type="text"
                      value={formData.assignedTo}
                      onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Nombre de la persona asignada"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fecha de Asignación
                    </label>
                    <input
                      type="date"
                      value={formData.assignedDate}
                      onChange={(e) => setFormData({ ...formData, assignedDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio de Compra (PEN)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.purchasePrice}
                      onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notas o Detalles
                    </label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Notas adicionales sobre la herramienta..."
                    />
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
                    {editingTool ? 'Actualizar' : 'Crear'} Herramienta
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingTool && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setViewingTool(null)} />
            
            <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Detalles de la Herramienta</h3>
                <button
                  onClick={() => setViewingTool(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Nombre</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingTool.name}</p>
                  </div>
                  {viewingTool.code && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Código</label>
                      <p className="mt-1 text-sm text-gray-900">{viewingTool.code}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Categoría</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingTool.category}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Almacén</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingTool.warehouse.name}</p>
                    <p className="text-sm text-gray-600">{viewingTool.warehouse.department}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Estado</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(viewingTool.status)}`}>
                      {getStatusIcon(viewingTool.status)}
                      <span className="ml-1">{viewingTool.status}</span>
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Condición</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConditionColor(viewingTool.condition)}`}>
                      {viewingTool.condition}
                    </span>
                  </div>
                </div>

                {(viewingTool.brand || viewingTool.model) && (
                  <div className="grid grid-cols-2 gap-4">
                    {viewingTool.brand && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Marca</label>
                        <p className="mt-1 text-sm text-gray-900">{viewingTool.brand}</p>
                      </div>
                    )}
                    {viewingTool.model && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Modelo</label>
                        <p className="mt-1 text-sm text-gray-900">{viewingTool.model}</p>
                      </div>
                    )}
                  </div>
                )}

                {viewingTool.assignedTo && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Asignado a</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingTool.assignedTo}</p>
                    {viewingTool.assignedDate && (
                      <p className="text-sm text-gray-600">
                        Desde: {new Date(viewingTool.assignedDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}

                {viewingTool.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Notas</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingTool.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setViewingTool(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    handleEdit(viewingTool);
                    setViewingTool(null);
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

export default ToolsModule;