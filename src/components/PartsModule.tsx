import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Package,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingDown,
  TrendingUp,
  Building2,
  DollarSign,
  BarChart3,
  ArrowUpDown
} from 'lucide-react';
import { apiClient } from '../context/AuthContext';

interface Warehouse {
  _id: string;
  name: string;
  address: string;
  department: string;
}

interface Part {
  _id: string;
  name: string;
  partNumber: string;
  category: string;
  warehouse: Warehouse;
  currentStock: number;
  minimumStock: number;
  maximumStock?: number;
  unit: string;
  unitPrice?: number;
  supplier?: {
    name?: string;
    contact?: string;
    phone?: string;
    email?: string;
  };
  location?: string;
  description?: string;
  notes?: string;
  stockMovements?: Array<{
    date: string;
    type: string;
    quantity: number;
    reason: string;
    reference?: string;
    previousStock: number;
    newStock: number;
  }>;
  hasLowStock?: boolean;
  stockStatus?: string;
  createdAt: string;
}

interface PartsStats {
  totalParts: number;
  lowStockParts: number;
  outOfStockParts: number;
  totalValue: number;
  partsByCategory: Array<{
    _id: string;
    count: number;
    totalStock: number;
    lowStock: number;
  }>;
}

const PartsModule: React.FC = () => {
  const [parts, setParts] = useState<Part[]>([]);
  const [stats, setStats] = useState<PartsStats | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showStockForm, setShowStockForm] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [viewingPart, setViewingPart] = useState<Part | null>(null);
  const [selectedPart, setSelectedPart] = useState<Part | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    name: '',
    partNumber: '',
    category: 'Otros',
    warehouse: '',
    currentStock: 0,
    minimumStock: 1,
    maximumStock: '',
    unit: 'Unidad',
    unitPrice: '',
    supplierName: '',
    supplierContact: '',
    supplierPhone: '',
    supplierEmail: '',
    location: '',
    description: '',
    notes: ''
  });

  const [stockData, setStockData] = useState({
    type: 'Entrada',
    quantity: '',
    reason: '',
    reference: ''
  });

  const categories = [
    'Motor', 'Transmisión', 'Hidráulico', 'Eléctrico', 'Neumático',
    'Filtros', 'Aceites y Lubricantes', 'Frenos', 'Suspensión',
    'Carrocería', 'Herramientas', 'Otros'
  ];

  const units = ['Unidad', 'Litro', 'Galón', 'Kilogramo', 'Metro', 'Caja', 'Paquete', 'Rollo'];
  const movementTypes = ['Entrada', 'Salida', 'Ajuste', 'Transferencia'];

  useEffect(() => {
    fetchParts();
    fetchStats();
    fetchWarehouses();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await apiClient.get('/parts/stats');
      setStats(response.data.data);
    } catch (error: any) {
      console.error('Error fetching parts stats:', error);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const response = await apiClient.get('/warehouses');
      setWarehouses(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchParts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.get('/parts', {
        params: {
          category: categoryFilter !== 'all' ? categoryFilter : undefined,
          warehouse: warehouseFilter !== 'all' ? warehouseFilter : undefined,
          stockStatus: stockStatusFilter !== 'all' ? stockStatusFilter : undefined,
          search: searchTerm || undefined
        }
      });
      
      setParts(response.data.data || []);
    } catch (error: any) {
      console.error('Error fetching parts:', error);
      const errorMessage = error.response?.data?.message || 'Error al cargar los repuestos';
      setError(errorMessage);
      setParts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchParts();
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, categoryFilter, warehouseFilter, stockStatusFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);
      
      const submitData = {
        ...formData,
        unitPrice: formData.unitPrice ? parseFloat(formData.unitPrice) : undefined,
        maximumStock: formData.maximumStock ? parseInt(formData.maximumStock) : undefined,
        supplier: {
          name: formData.supplierName || undefined,
          contact: formData.supplierContact || undefined,
          phone: formData.supplierPhone || undefined,
          email: formData.supplierEmail || undefined
        }
      };

      if (editingPart) {
        await apiClient.put(`/parts/${editingPart._id}`, submitData);
      } else {
        await apiClient.post('/parts', submitData);
      }

      setShowForm(false);
      setEditingPart(null);
      resetForm();
      fetchParts();
      fetchStats();
    } catch (error: any) {
      console.error('Error saving part:', error);
      const errorMessage = error.response?.data?.message || 'Error al guardar el repuesto';
      setError(errorMessage);
    }
  };

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart) return;

    try {
      setError(null);
      
      await apiClient.put(`/parts/${selectedPart._id}/stock`, {
        type: stockData.type,
        quantity: parseInt(stockData.quantity),
        reason: stockData.reason,
        reference: stockData.reference || undefined
      });

      setShowStockForm(false);
      setSelectedPart(null);
      setStockData({ type: 'Entrada', quantity: '', reason: '', reference: '' });
      fetchParts();
      fetchStats();
    } catch (error: any) {
      console.error('Error updating stock:', error);
      const errorMessage = error.response?.data?.message || 'Error al actualizar el stock';
      setError(errorMessage);
    }
  };

  const handleEdit = (part: Part) => {
    setEditingPart(part);
    setFormData({
      name: part.name,
      partNumber: part.partNumber,
      category: part.category,
      warehouse: part.warehouse._id,
      currentStock: part.currentStock,
      minimumStock: part.minimumStock,
      maximumStock: part.maximumStock?.toString() || '',
      unit: part.unit,
      unitPrice: part.unitPrice?.toString() || '',
      supplierName: part.supplier?.name || '',
      supplierContact: part.supplier?.contact || '',
      supplierPhone: part.supplier?.phone || '',
      supplierEmail: part.supplier?.email || '',
      location: part.location || '',
      description: part.description || '',
      notes: part.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este repuesto?')) {
      try {
        setError(null);
        await apiClient.delete(`/parts/${id}`);
        fetchParts();
        fetchStats();
      } catch (error: any) {
        console.error('Error deleting part:', error);
        const errorMessage = error.response?.data?.message || 'Error al eliminar el repuesto';
        setError(errorMessage);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      partNumber: '',
      category: 'Otros',
      warehouse: '',
      currentStock: 0,
      minimumStock: 1,
      maximumStock: '',
      unit: 'Unidad',
      unitPrice: '',
      supplierName: '',
      supplierContact: '',
      supplierPhone: '',
      supplierEmail: '',
      location: '',
      description: '',
      notes: ''
    });
  };

  const getStockStatusIcon = (part: Part) => {
    if (part.currentStock === 0) {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    if (part.currentStock <= part.minimumStock) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getStockStatusColor = (part: Part) => {
    if (part.currentStock === 0) {
      return 'bg-red-100 text-red-800';
    }
    if (part.currentStock <= part.minimumStock) {
      return 'bg-yellow-100 text-yellow-800';
    }
    return 'bg-green-100 text-green-800';
  };

  const getStockStatusText = (part: Part) => {
    if (part.currentStock === 0) {
      return 'Sin Stock';
    }
    if (part.currentStock <= part.minimumStock) {
      return 'Stock Bajo';
    }
    return 'Stock Normal';
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
        <span className="ml-4 text-gray-600">Cargando repuestos...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Control de Repuestos</h1>
          <p className="text-gray-600">Gestión de inventario con alertas de stock bajo</p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setEditingPart(null);
            resetForm();
            setError(null);
          }}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Repuesto
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Repuestos</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalParts}</p>
              </div>
              <Package className="h-12 w-12 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Stock Bajo</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.lowStockParts}</p>
                <p className="text-sm text-gray-500">Requieren atención</p>
              </div>
              <TrendingDown className="h-12 w-12 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Sin Stock</p>
                <p className="text-3xl font-bold text-red-600">{stats.outOfStockParts}</p>
                <p className="text-sm text-gray-500">Urgente</p>
              </div>
              <XCircle className="h-12 w-12 text-red-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Valor Total</p>
                <p className="text-3xl font-bold text-green-600">{formatCurrency(stats.totalValue)}</p>
                <p className="text-sm text-gray-500">Inventario</p>
              </div>
              <BarChart3 className="h-12 w-12 text-green-600" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar repuestos..."
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
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todos los stocks</option>
            <option value="low_stock">Stock bajo</option>
            <option value="out_of_stock">Sin stock</option>
            <option value="normal">Stock normal</option>
          </select>

          <div className="flex items-center text-sm text-gray-600">
            <Filter className="h-4 w-4 mr-2" />
            {parts.length} repuesto{parts.length !== 1 ? 's' : ''}
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

      {/* Parts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {parts.map((part) => {
          const needsAttention = part.currentStock <= part.minimumStock;
          
          return (
            <div key={part._id} className={`bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow ${needsAttention ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}>
              <div className="p-6">
                {/* Alert Badge */}
                {needsAttention && (
                  <div className="flex items-center mb-3 p-2 bg-yellow-100 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
                    <span className="text-sm font-medium text-yellow-800">
                      {part.currentStock === 0 ? 'Sin stock' : 'Stock bajo'}
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {part.name}
                    </h3>
                    <p className="text-sm text-gray-600">P/N: {part.partNumber}</p>
                    <p className="text-sm text-gray-600">{part.category}</p>
                  </div>
                  <Package className="h-6 w-6 text-blue-600" />
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Stock actual:</span>
                    <span className="font-medium text-gray-900">{part.currentStock} {part.unit}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Stock mínimo:</span>
                    <span className="text-gray-600">{part.minimumStock} {part.unit}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Building2 className="h-4 w-4 mr-2" />
                    {part.warehouse.name}
                  </div>
                  {part.location && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium">Ubicación:</span>
                      <span className="ml-1">{part.location}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mb-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockStatusColor(part)}`}>
                    {getStockStatusIcon(part)}
                    <span className="ml-1">{getStockStatusText(part)}</span>
                  </span>
                  {part.unitPrice && (
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {formatCurrency(part.unitPrice)}
                    </div>
                  )}
                </div>

                {part.supplier?.name && (
                  <div className="mb-4 p-2 bg-gray-50 rounded text-sm text-gray-600">
                    <strong>Proveedor:</strong> {part.supplier.name}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setViewingPart(part)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver detalles"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(part)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPart(part);
                        setShowStockForm(true);
                      }}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Actualizar Stock"
                    >
                      <ArrowUpDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(part._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(part.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {parts.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay repuestos</h3>
          <p className="text-gray-600 mb-6">Comienza registrando tu primer repuesto</p>
          <button
            onClick={() => {
              setShowForm(true);
              setEditingPart(null);
              resetForm();
              setError(null);
            }}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Agregar Repuesto
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
                  {editingPart ? 'Editar Repuesto' : 'Nuevo Repuesto'}
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
                      Nombre del Repuesto *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: Filtro de Aceite"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número de Parte *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.partNumber}
                      onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: FLT-001"
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
                      Stock Actual *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.currentStock}
                      onChange={(e) => setFormData({ ...formData, currentStock: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Mínimo *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={formData.minimumStock}
                      onChange={(e) => setFormData({ ...formData, minimumStock: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Stock Máximo
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.maximumStock}
                      onChange={(e) => setFormData({ ...formData, maximumStock: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unidad *
                    </label>
                    <select
                      required
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {units.map(unit => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Precio Unitario (PEN)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.unitPrice}
                      onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ubicación en Almacén
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Ej: Estante A-3, Nivel 2"
                    />
                  </div>
                </div>

                {/* Supplier Information */}
                <div className="border-t border-gray-200 pt-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Información del Proveedor</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre del Proveedor
                      </label>
                      <input
                        type="text"
                        value={formData.supplierName}
                        onChange={(e) => setFormData({ ...formData, supplierName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nombre de la empresa"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Contacto
                      </label>
                      <input
                        type="text"
                        value={formData.supplierContact}
                        onChange={(e) => setFormData({ ...formData, supplierContact: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Nombre del contacto"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={formData.supplierPhone}
                        onChange={(e) => setFormData({ ...formData, supplierPhone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Teléfono del proveedor"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.supplierEmail}
                        onChange={(e) => setFormData({ ...formData, supplierEmail: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="email@proveedor.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Descripción
                    </label>
                    <textarea
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Descripción detallada del repuesto..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notas
                    </label>
                    <textarea
                      rows={2}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Notas adicionales..."
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
                    {editingPart ? 'Actualizar' : 'Crear'} Repuesto
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Stock Update Modal */}
      {showStockForm && selectedPart && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowStockForm(false)} />
            
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">
                  Actualizar Stock
                </h3>
                <button
                  onClick={() => setShowStockForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Repuesto:</strong> {selectedPart.name}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Stock actual:</strong> {selectedPart.currentStock} {selectedPart.unit}
                </p>
              </div>

              <form onSubmit={handleStockSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Movimiento *
                  </label>
                  <select
                    required
                    value={stockData.type}
                    onChange={(e) => setStockData({ ...stockData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {movementTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={stockData.quantity}
                    onChange={(e) => setStockData({ ...stockData, quantity: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={stockData.type === 'Ajuste' ? 'Nuevo stock total' : 'Cantidad a mover'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Motivo *
                  </label>
                  <input
                    type="text"
                    required
                    value={stockData.reason}
                    onChange={(e) => setStockData({ ...stockData, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Motivo del movimiento"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Referencia
                  </label>
                  <input
                    type="text"
                    value={stockData.reference}
                    onChange={(e) => setStockData({ ...stockData, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Número de orden, factura, etc."
                  />
                </div>

                <div className="flex items-center justify-end space-x-4 pt-4  border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowStockForm(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Actualizar Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingPart && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setViewingPart(null)} />
            
            <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Detalles del Repuesto</h3>
                <button
                  onClick={() => setViewingPart(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XCircle className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Nombre</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingPart.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Número de Parte</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingPart.partNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Categoría</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingPart.category}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Almacén</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingPart.warehouse.name}</p>
                    <p className="text-sm text-gray-600">{viewingPart.warehouse.department}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Stock Actual</label>
                    <p className="mt-1 text-sm font-medium text-gray-900">{viewingPart.currentStock} {viewingPart.unit}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Stock Mínimo</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingPart.minimumStock} {viewingPart.unit}</p>
                  </div>
                </div>

                {viewingPart.supplier?.name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Proveedor</label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-900">{viewingPart.supplier.name}</p>
                      {viewingPart.supplier.contact && (
                        <p className="text-sm text-gray-600">Contacto: {viewingPart.supplier.contact}</p>
                      )}
                      {viewingPart.supplier.phone && (
                        <p className="text-sm text-gray-600">Teléfono: {viewingPart.supplier.phone}</p>
                      )}
                      {viewingPart.supplier.email && (
                        <p className="text-sm text-gray-600">Email: {viewingPart.supplier.email}</p>
                      )}
                    </div>
                  </div>
                )}

                {viewingPart.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Descripción</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingPart.description}</p>
                  </div>
                )}

                {viewingPart.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Notas</label>
                    <p className="mt-1 text-sm text-gray-900">{viewingPart.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  onClick={() => setViewingPart(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    handleEdit(viewingPart);
                    setViewingPart(null);
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

export default PartsModule;