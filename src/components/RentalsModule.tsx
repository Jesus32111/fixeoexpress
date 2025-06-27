import React, { useState, useEffect, useCallback } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  DollarSign,
  Truck, // For delivery/transport
  Users, // For customer/contact
  Briefcase, // For job/work
  FileText, // For description/notes
  ChevronLeft,
  ChevronRight,
  XCircle,
  AlertCircle,
  HardHat, // For machinery
  Car // For vehicle
} from 'lucide-react';
import { apiClient } from '../context/AuthContext';

// Interfaces
interface Vehicle {
  _id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  name?: string; // For display consistency if machinery has 'name'
}

interface Machinery {
  _id: string;
  name: string; // Assuming machinery has a 'name' field
  brand: string;
  model: string;
  serialNumber: string;
  type: string;
}

interface Equipment extends Vehicle, Machinery {} // Combined type

interface Rental {
  _id: string;
  customerName: string;
  contactPerson: string;
  email?: string;
  phone?: string;
  address?: string;
  equipmentType: 'vehicle' | 'machinery';
  equipment: Equipment; // Populated equipment details
  startDate: string;
  endDate: string;
  dailyRate: number;
  deposit?: number;
  includeOperator?: boolean;
  fuelIncluded?: boolean;
  transportCost?: number;
  jobDescription: string;
  deliveryAddress?: string;
  createdAt: string;
  // Calculated fields (not directly from backend, but useful for display)
  calculatedTotalCost?: number; 
  calculatedBaseRate?: number;
}

interface FormData {
  customerName: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  equipmentType: 'vehicle' | 'machinery';
  equipment: string; // ID of the equipment
  startDate: string;
  endDate: string;
  dailyRate: string;
  deposit: string;
  includeOperator: boolean;
  fuelIncluded: boolean;
  transportCost: string;
  jobDescription: string;
  deliveryAddress: string;
}

const RentalsModule: React.FC = () => {
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [machineries, setMachineries] = useState<Machinery[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Rental | null>(null);
  const [viewingRecord, setViewingRecord] = useState<Rental | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 10;

  const initialFormData: FormData = {
    customerName: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    equipmentType: 'vehicle',
    equipment: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0], // Default to next day
    dailyRate: '',
    deposit: '',
    includeOperator: false,
    fuelIncluded: false,
    transportCost: '',
    jobDescription: '',
    deliveryAddress: '',
  };
  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Fetching data
  const fetchRentals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/rentals', {
        params: {
          page: currentPage,
          limit: itemsPerPage,
          search: searchTerm || undefined,
        }
      });
      setRentals(response.data.data || []);
      setTotalPages(response.data.pages || 1);
      setTotalItems(response.data.total || 0);
    } catch (err: any) {
      console.error('Error fetching rentals:', err);
      setError(err.response?.data?.message || 'Error al cargar los alquileres.');
      setRentals([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm]);

  const fetchVehicles = async () => {
    try {
      const response = await apiClient.get('/vehicles?limit=1000'); // Fetch all for dropdown
      setVehicles(response.data.data || []);
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    }
  };

  const fetchMachineries = async () => {
    try {
      const response = await apiClient.get('/machinery?limit=1000'); // Fetch all for dropdown
      setMachineries(response.data.data || []);
    } catch (err) {
      console.error('Error fetching machineries:', err);
    }
  };

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  useEffect(() => {
    fetchVehicles();
    fetchMachineries();
  }, []);

  // Form handling
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (name === "equipmentType") {
        setFormData(prev => ({ ...prev, equipment: '' })); // Reset equipment selection
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingRecord(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
        setError("La fecha de fin no puede ser anterior a la fecha de inicio.");
        return;
    }

    const submissionData = {
      ...formData,
      dailyRate: parseFloat(formData.dailyRate) || 0,
      deposit: formData.deposit ? parseFloat(formData.deposit) : undefined,
      transportCost: formData.transportCost ? parseFloat(formData.transportCost) : undefined,
    };

    try {
      if (editingRecord) {
        await apiClient.put(`/rentals/${editingRecord._id}`, submissionData);
      } else {
        await apiClient.post('/rentals', submissionData);
      }
      setShowForm(false);
      resetForm();
      fetchRentals();
    } catch (err: any) {
      console.error('Error saving rental:', err);
      const errorMsg = err.response?.data?.errors?.[0]?.msg || err.response?.data?.message || 'Error al guardar el alquiler.';
      setError(errorMsg);
    }
  };

  const handleEdit = (record: Rental) => {
    setEditingRecord(record);
    setFormData({
      customerName: record.customerName,
      contactPerson: record.contactPerson,
      email: record.email || '',
      phone: record.phone || '',
      address: record.address || '',
      equipmentType: record.equipmentType,
      equipment: record.equipment._id,
      startDate: record.startDate.split('T')[0],
      endDate: record.endDate.split('T')[0],
      dailyRate: record.dailyRate.toString(),
      deposit: record.deposit?.toString() || '',
      includeOperator: record.includeOperator || false,
      fuelIncluded: record.fuelIncluded || false,
      transportCost: record.transportCost?.toString() || '',
      jobDescription: record.jobDescription,
      deliveryAddress: record.deliveryAddress || '',
    });
    setShowForm(true);
    setError(null);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este alquiler?')) {
      try {
        setError(null);
        await apiClient.delete(`/rentals/${id}`);
        fetchRentals(); // Refresh list
        if (viewingRecord?._id === id) setViewingRecord(null); // Close view modal if open
      } catch (err: any) {
        console.error('Error deleting rental:', err);
        setError(err.response?.data?.message || 'Error al eliminar el alquiler.');
      }
    }
  };

  // Calculations for display
  const calculateDurationInDays = (start: string, end: string): number => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate < startDate) return 0;
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive of start and end day
    return diffDays;
  };

  const baseRate = calculateDurationInDays(formData.startDate, formData.endDate) * (parseFloat(formData.dailyRate) || 0);
  const totalCost = baseRate + (parseFloat(formData.transportCost) || 0);

  // UI Helpers
  const formatCurrency = (amount: number | undefined) => {
    if (typeof amount !== 'number') return 'S/ 0.00';
    return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-PE', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };
  
  const getEquipmentName = (eq: Equipment, type: 'vehicle' | 'machinery') => {
    if (!eq) return 'N/A';
    if (type === 'vehicle') {
      return `${eq.plate} (${eq.brand} ${eq.model})`;
    }
    if (type === 'machinery') {
      return `${eq.name || eq.model} (${eq.brand} ${eq.serialNumber})`;
    }
    return 'N/A';
  };


  if (loading && rentals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-4 text-gray-600">Cargando alquileres...</span>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Control de Alquileres</h1>
          <p className="text-gray-600">Gestiona los alquileres de equipos y maquinaria.</p>
        </div>
        <button
          onClick={() => { setShowForm(true); resetForm(); }}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nuevo Alquiler
        </button>
      </div>

      {/* Filters (simplified for now) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, contacto..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <Filter className="h-4 w-4 mr-2" />
            {totalItems} alquiler{totalItems !== 1 ? 'es' : ''}
          </div>
        </div>
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              <XCircle className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Rentals Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fechas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarifa Diaria</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rentals.map((rental) => (
                <tr key={rental._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{rental.customerName}</div>
                    <div className="text-sm text-gray-500">{rental.contactPerson}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {rental.equipmentType === 'vehicle' ? <Car className="h-5 w-5 text-blue-500 mr-2" /> : <HardHat className="h-5 w-5 text-orange-500 mr-2" />}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {getEquipmentName(rental.equipment, rental.equipmentType)}
                        </div>
                        <div className="text-sm text-gray-500 capitalize">{rental.equipmentType}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">Inicio: {formatDate(rental.startDate)}</div>
                    <div className="text-sm text-gray-500">Fin: {formatDate(rental.endDate)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(rental.dailyRate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button onClick={() => setViewingRecord(rental)} className="text-blue-600 hover:text-blue-900" title="Ver detalles"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => handleEdit(rental)} className="text-indigo-600 hover:text-indigo-900" title="Editar"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(rental._id)} className="text-red-600 hover:text-red-900" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination (Simplified) */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
             <div className="flex-1 flex justify-between sm:hidden">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Anterior</button>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50">Siguiente</button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div><p className="text-sm text-gray-700">Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> de <span className="font-medium">{totalItems}</span> resultados</p></div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"><ChevronLeft className="h-5 w-5" /></button>
                  {/* Simplified page numbers */}
                  {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                      let pageToShow = currentPage <=2 ? i + 1 : currentPage -1 + i;
                      if(pageToShow > totalPages) pageToShow = totalPages - (Math.min(3, totalPages) -1) +i;
                      if(pageToShow < 1) pageToShow = 1;
                      
                      if (totalPages > 3 && i === 1 && currentPage > 2 && currentPage < totalPages -1) pageToShow = currentPage;
                      else if (totalPages > 3 && i === 0 && currentPage > 2) pageToShow = currentPage -1;
                      else if (totalPages > 3 && i === 2 && currentPage < totalPages -1) pageToShow = currentPage +1;


                      return (
                        <button key={pageToShow} onClick={() => setCurrentPage(pageToShow)} className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${currentPage === pageToShow ? 'z-10 bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'}`}>{pageToShow}</button>
                      )
                  })}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"><ChevronRight className="h-5 w-5" /></button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Empty State */}
      {rentals.length === 0 && !loading && !error && (
        <div className="text-center py-12">
          <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay alquileres registrados</h3>
          <p className="text-gray-600 mb-6">Comienza creando tu primer registro de alquiler.</p>
          <button onClick={() => { setShowForm(true); resetForm();}} className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="h-5 w-5 mr-2" />Crear Alquiler</button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowForm(false)} />
            <div className="inline-block w-full max-w-4xl p-6 sm:p-8 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">{editingRecord ? 'Editar Alquiler' : 'Nuevo Alquiler'}</h3>
                <button onClick={() => setShowForm(false)} className="p-2 hover:bg-gray-100 rounded-lg"><XCircle className="h-6 w-6 text-gray-500" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Section 1: Información del Cliente */}
                <div className="border-b border-gray-200 pb-6">
                  <h4 className="text-lg font-medium text-gray-800 mb-4">1. Información del Cliente</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nombre del Cliente *</label>
                      <input type="text" name="customerName" value={formData.customerName} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Persona de Contacto *</label>
                      <input type="text" name="contactPerson" value={formData.contactPerson} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                      <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Dirección</label>
                      <input type="text" name="address" value={formData.address} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                  </div>
                </div>

                {/* Section 2: Selección de Equipo */}
                <div className="border-b border-gray-200 pb-6">
                  <h4 className="text-lg font-medium text-gray-800 mb-4">2. Selección de Equipo</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tipo de Equipo *</label>
                      <select name="equipmentType" value={formData.equipmentType} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                        <option value="vehicle">Vehículo</option>
                        <option value="machinery">Maquinaria</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Equipo *</label>
                      <select name="equipment" value={formData.equipment} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                        <option value="">Seleccione un equipo</option>
                        {formData.equipmentType === 'vehicle' 
                          ? vehicles.map(v => <option key={v._id} value={v._id}>{v.plate} - {v.brand} {v.model}</option>)
                          : machineries.map(m => <option key={m._id} value={m._id}>{m.name || `${m.brand} ${m.model}`} ({m.serialNumber})</option>)
                        }
                      </select>
                    </div>
                  </div>
                </div>

                {/* Section 3: Período y Tarifas */}
                <div className="border-b border-gray-200 pb-6">
                  <h4 className="text-lg font-medium text-gray-800 mb-4">3. Período y Tarifas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fecha de Inicio *</label>
                      <input type="date" name="startDate" value={formData.startDate} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Fecha de Fin *</label>
                      <input type="date" name="endDate" value={formData.endDate} onChange={handleInputChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Tarifa Diaria (S/) *</label>
                      <input type="number" name="dailyRate" value={formData.dailyRate} onChange={handleInputChange} required min="0" step="0.01" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Depósito (S/)</label>
                      <input type="number" name="deposit" value={formData.deposit} onChange={handleInputChange} min="0" step="0.01" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                  </div>
                </div>

                {/* Section 4: Servicios Adicionales */}
                <div className="border-b border-gray-200 pb-6">
                  <h4 className="text-lg font-medium text-gray-800 mb-4">4. Servicios Adicionales</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <div className="flex items-start">
                      <div className="flex items-center h-5"><input id="includeOperator" name="includeOperator" type="checkbox" checked={formData.includeOperator} onChange={handleInputChange} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"/></div>
                      <div className="ml-3 text-sm"><label htmlFor="includeOperator" className="font-medium text-gray-700">Incluir operador</label></div>
                    </div>
                    <div className="flex items-start">
                      <div className="flex items-center h-5"><input id="fuelIncluded" name="fuelIncluded" type="checkbox" checked={formData.fuelIncluded} onChange={handleInputChange} className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"/></div>
                      <div className="ml-3 text-sm"><label htmlFor="fuelIncluded" className="font-medium text-gray-700">Combustible incluido</label></div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Costo de Transporte (S/)</label>
                      <input type="number" name="transportCost" value={formData.transportCost} onChange={handleInputChange} min="0" step="0.01" className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                  </div>
                </div>
                
                {/* Section 5: Detalles del Trabajo */}
                <div className="border-b border-gray-200 pb-6">
                  <h4 className="text-lg font-medium text-gray-800 mb-4">5. Detalles del Trabajo</h4>
                  <div className="grid grid-cols-1 gap-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Descripción del Trabajo *</label>
                      <textarea name="jobDescription" value={formData.jobDescription} onChange={handleInputChange} required rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Dirección de Entrega</label>
                      <textarea name="deliveryAddress" value={formData.deliveryAddress} onChange={handleInputChange} rows={2} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"/>
                    </div>
                  </div>
                </div>

                {/* Section 6: Resumen de Costos */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-lg font-medium text-gray-800 mb-3">6. Resumen de Costos</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tarifa Base ({calculateDurationInDays(formData.startDate, formData.endDate)} días x {formatCurrency(parseFloat(formData.dailyRate))}):</span>
                      <span className="font-medium text-gray-800">{formatCurrency(baseRate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Costo de Transporte:</span>
                      <span className="font-medium text-gray-800">{formatCurrency(parseFloat(formData.transportCost))}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-300">
                      <span className="font-semibold text-gray-800">Total Estimado:</span>
                      <span className="font-bold text-lg text-blue-600">{formatCurrency(totalCost)}</span>
                    </div>
                     {formData.deposit && parseFloat(formData.deposit) > 0 && (
                        <div className="flex justify-between text-xs text-gray-500">
                            <span>Depósito:</span>
                            <span>{formatCurrency(parseFloat(formData.deposit))}</span>
                        </div>
                    )}
                  </div>
                </div>
                
                {/* Error Message in Form */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" />
                        <span className="text-sm text-red-700">{error}</span>
                    </div>
                    </div>
                )}

                {/* Acciones */}
                <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
                  <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancelar</button>
                  <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50" disabled={loading}>
                    {loading ? 'Guardando...' : (editingRecord ? 'Actualizar Alquiler' : 'Guardar Alquiler')}
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
            <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Detalles del Alquiler</h3>
                <button onClick={() => setViewingRecord(null)} className="p-2 hover:bg-gray-100 rounded-lg"><XCircle className="h-6 w-6 text-gray-500" /></button>
              </div>
              
              <div className="space-y-5">
                {/* Customer Info */}
                <div>
                  <h4 className="text-sm font-semibold text-blue-600 mb-1">Información del Cliente</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <p><strong className="text-gray-600">Nombre:</strong> {viewingRecord.customerName}</p>
                    <p><strong className="text-gray-600">Contacto:</strong> {viewingRecord.contactPerson}</p>
                    {viewingRecord.email && <p><strong className="text-gray-600">Email:</strong> {viewingRecord.email}</p>}
                    {viewingRecord.phone && <p><strong className="text-gray-600">Teléfono:</strong> {viewingRecord.phone}</p>}
                    {viewingRecord.address && <p className="sm:col-span-2"><strong className="text-gray-600">Dirección:</strong> {viewingRecord.address}</p>}
                  </div>
                </div>

                {/* Equipment Info */}
                <div>
                  <h4 className="text-sm font-semibold text-blue-600 mb-1">Equipo Alquilado</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <p><strong className="text-gray-600">Tipo:</strong> <span className="capitalize">{viewingRecord.equipmentType}</span></p>
                    <p><strong className="text-gray-600">Equipo:</strong> {getEquipmentName(viewingRecord.equipment, viewingRecord.equipmentType)}</p>
                  </div>
                </div>

                {/* Period & Rates */}
                <div>
                  <h4 className="text-sm font-semibold text-blue-600 mb-1">Período y Tarifas</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <p><strong className="text-gray-600">Inicio:</strong> {formatDate(viewingRecord.startDate)}</p>
                    <p><strong className="text-gray-600">Fin:</strong> {formatDate(viewingRecord.endDate)}</p>
                    <p><strong className="text-gray-600">Tarifa Diaria:</strong> {formatCurrency(viewingRecord.dailyRate)}</p>
                    {viewingRecord.deposit && <p><strong className="text-gray-600">Depósito:</strong> {formatCurrency(viewingRecord.deposit)}</p>}
                    
                    <p className="sm:col-span-2"><strong className="text-gray-600">Duración:</strong> {calculateDurationInDays(viewingRecord.startDate, viewingRecord.endDate)} días</p>
                  </div>
                </div>

                {/* Additional Services */}
                <div>
                  <h4 className="text-sm font-semibold text-blue-600 mb-1">Servicios Adicionales</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <p><strong className="text-gray-600">Operador Incluido:</strong> {viewingRecord.includeOperator ? 'Sí' : 'No'}</p>
                    <p><strong className="text-gray-600">Combustible Incluido:</strong> {viewingRecord.fuelIncluded ? 'Sí' : 'No'}</p>
                    {typeof viewingRecord.transportCost === 'number' && <p><strong className="text-gray-600">Costo Transporte:</strong> {formatCurrency(viewingRecord.transportCost)}</p>}
                  </div>
                </div>
                
                {/* Job Details */}
                <div>
                  <h4 className="text-sm font-semibold text-blue-600 mb-1">Detalles del Trabajo</h4>
                  <div className="text-sm space-y-1">
                    <p><strong className="text-gray-600">Descripción:</strong></p>
                    <p className="pl-2 text-gray-700 whitespace-pre-wrap">{viewingRecord.jobDescription}</p>
                    {viewingRecord.deliveryAddress && <>
                        <p className="pt-1"><strong className="text-gray-600">Dirección de Entrega:</strong></p>
                        <p className="pl-2 text-gray-700 whitespace-pre-wrap">{viewingRecord.deliveryAddress}</p>
                    </>}
                  </div>
                </div>

                {/* Calculated Totals */}
                <div className="bg-gray-50 p-4 rounded-lg mt-4">
                    <h4 className="text-sm font-semibold text-blue-700 mb-2">Resumen de Costos (Estimado)</h4>
                    <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Tarifa Base ({calculateDurationInDays(viewingRecord.startDate, viewingRecord.endDate)} días):</span>
                            <span className="font-medium text-gray-800">{formatCurrency(calculateDurationInDays(viewingRecord.startDate, viewingRecord.endDate) * viewingRecord.dailyRate)}</span>
                        </div>
                        {typeof viewingRecord.transportCost === 'number' && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Costo de Transporte:</span>
                                <span className="font-medium text-gray-800">{formatCurrency(viewingRecord.transportCost)}</span>
                            </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-gray-300">
                            <span className="font-semibold text-gray-800">Total Estimado:</span>
                            <span className="font-bold text-lg text-blue-600">
                                {formatCurrency(
                                    (calculateDurationInDays(viewingRecord.startDate, viewingRecord.endDate) * viewingRecord.dailyRate) +
                                    (viewingRecord.transportCost || 0)
                                )}
                            </span>
                        </div>
                    </div>
                </div>

              </div>

              <div className="flex items-center justify-end space-x-4 pt-6 mt-6 border-t border-gray-200">
                <button onClick={() => setViewingRecord(null)} className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Cerrar</button>
                <button 
                  onClick={() => { handleEdit(viewingRecord); setViewingRecord(null); }} 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Editar Alquiler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RentalsModule;
