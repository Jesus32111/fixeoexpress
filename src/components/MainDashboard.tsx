import React, { useState, useEffect } from 'react';
import { useAuth, apiClient } from '../context/AuthContext';
import { 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Wrench,
  Home,
  BarChart3,
  Users,
  FileText,
  Calendar,
  Building2,
  Car,
  Fuel,
  Hammer,
  Package,
  AlertTriangle,
  Wallet,
  Briefcase

} from 'lucide-react';
import MachineryModule from './MachineryModule';
import WarehouseModule from './WarehouseModule';
import VehicleModule from './VehicleModule';
import FuelModule from './FuelModule';
import ToolsModule from './ToolsModule';
import PartsModule from './PartsModule';
import AlertsModule from './AlertsModule';
import FinanceModule from './FinanceModule';
import RentalsModule from './RentalsModule';

const MainDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModule, setActiveModule] = useState('home');

  // States for real data
  const [totalMachinery, setTotalMachinery] = useState(0);
  const [totalVehicles, setTotalVehicles] = useState(0);
  const [criticalAlerts, setCriticalAlerts] = useState(0);
  const [monthlyIncome, setMonthlyIncome] = useState(0);
  const [machineryStatusData, setMachineryStatusData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [vehicleStatusData, setVehicleStatusData] = useState<Array<{ name: string; value: number; color: string }>>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);


  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch machinery data
        const machineryResponse = await apiClient.get('/machinery');
        const machineries = machineryResponse.data.data || [];
        setTotalMachinery(machineries.length);
        
        const machineryStatusCounts = machineries.reduce((acc: any, m: any) => {
          acc[m.status] = (acc[m.status] || 0) + 1;
          return acc;
        }, {});
        setMachineryStatusData([
          { name: 'Disponible', value: machineryStatusCounts['Disponible'] || 0, color: 'bg-green-500' },
          { name: 'En Mantenimiento', value: machineryStatusCounts['En Mantenimiento'] || 0, color: 'bg-yellow-500' },
          { name: 'Alquilada', value: machineryStatusCounts['Alquilada'] || 0, color: 'bg-blue-500' },
          { name: 'Fuera de Servicio', value: machineryStatusCounts['Fuera de Servicio'] || 0, color: 'bg-red-500' },
        ]);

        // Fetch vehicle data
        const vehicleResponse = await apiClient.get('/vehicles');
        const vehicles = vehicleResponse.data.data || [];
        setTotalVehicles(vehicles.length);

        const vehicleStatusCounts = vehicles.reduce((acc: any, v: any) => {
          acc[v.status] = (acc[v.status] || 0) + 1;
          return acc;
        }, {});
        setVehicleStatusData([
          { name: 'Operativo', value: vehicleStatusCounts['Operativo'] || 0, color: 'bg-green-500' },
          { name: 'En Mantenimiento', value: vehicleStatusCounts['En Mantenimiento'] || 0, color: 'bg-yellow-500' },
          { name: 'No Disponible', value: vehicleStatusCounts['No Disponible'] || 0, color: 'bg-orange-500' },
          { name: 'Fuera de Servicio', value: vehicleStatusCounts['Fuera de Servicio'] || 0, color: 'bg-red-500' },
        ]);
        
        // Fetch alerts data
        const alertsResponse = await apiClient.get('/alerts?priority=Crítica&status=Activa');
        setCriticalAlerts(alertsResponse.data.data?.length || 0);
        
        const recentAlertsResponse = await apiClient.get('/alerts?limit=5&sort=-createdAt');
        setRecentAlerts(recentAlertsResponse.data.data || []);

        // Fetch finance data (monthly income)
        const financeResponse = await apiClient.get('/finance/stats?period=month');
        setMonthlyIncome(financeResponse.data.data?.summary?.totalIncome || 0);

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    logout();
  };

  const menuItems = [
    { id: 'home', name: 'Inicio', icon: Home },
    { id: 'machinery', name: 'Maquinarias', icon: Wrench },
    { id: 'rentals', name: 'Alquileres', icon: Briefcase },
    { id: 'warehouses', name: 'Almacenes', icon: Building2 },
    { id: 'vehicles', name: 'Vehículos', icon: Car },
    { id: 'fuel', name: 'Combustible', icon: Fuel },
    { id: 'tools', name: 'Herramientas', icon: Hammer },
    { id: 'parts', name: 'Repuestos', icon: Package },
    { id: 'alerts', name: 'Alertas', icon: AlertTriangle },
    { id: 'finance', name: 'Finanzas', icon: Wallet },
    { id: 'reports', name: 'Reportes', icon: BarChart3 },
    { id: 'clients', name: 'Clientes', icon: Users },
    { id: 'contracts', name: 'Contratos', icon: FileText },
    { id: 'calendar', name: 'Calendario', icon: Calendar },
  ];

  const renderContent = () => {
    switch (activeModule) {
      case 'machinery':
        return <MachineryModule />;
      case 'warehouses':
        return <WarehouseModule />;
      case 'vehicles':
        return <VehicleModule />;
      case 'fuel':
        return <FuelModule />;
      case 'tools':
        return <ToolsModule />;
      case 'parts':
        return <PartsModule />;
      case 'alerts':
        return <AlertsModule />;
      case 'finance':
        return <FinanceModule />;
      case 'rentals':
        return <RentalsModule />;
      case 'reports':
        return (
          <div className="p-8">
            <div className="text-center">
              <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Módulo de Reportes</h3>
              <p className="text-gray-600">Próximamente disponible</p>
            </div>
          </div>
        );
      case 'clients':
        return (
          <div className="p-8">
            <div className="text-center">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Módulo de Clientes</h3>
              <p className="text-gray-600">Próximamente disponible</p>
            </div>
          </div>
        );
      case 'contracts':
        return (
          <div className="p-8">
            <div className="text-center">
              <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Módulo de Contratos</h3>
              <p className="text-gray-600">Próximamente disponible</p>
            </div>
          </div>
        );
      case 'calendar':
        return (
          <div className="p-8">
            <div className="text-center">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Módulo de Calendario</h3>
              <p className="text-gray-600">Próximamente disponible</p>
            </div>
          </div>
        );
      case 'home':
      default:
        const quickAccessItems = menuItems.filter(item => 
          ['machinery', 'vehicles', 'rentals', 'alerts', 'finance'].includes(item.id) // Removed 'reports'
        );
        
        return (
          <div className="p-6 bg-gray-100 min-h-full">
            <h1 className="text-3xl font-bold text-gray-800 mb-8">Dashboard Principal</h1>

            {/* Estadísticas Principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Maquinarias Totales</p>
                  <p className="text-3xl font-bold text-gray-800">{totalMachinery}</p>
                </div>
                <Wrench className="h-10 w-10 text-blue-500" />
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Vehículos Totales</p>
                  <p className="text-3xl font-bold text-gray-800">{totalVehicles}</p>
                </div>
                <Car className="h-10 w-10 text-green-500" />
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Alertas Críticas</p>
                  <p className="text-3xl font-bold text-red-500">{criticalAlerts}</p>
                </div>
                <AlertTriangle className="h-10 w-10 text-red-500" />
              </div>
              <div className="bg-white p-6 rounded-lg shadow-md flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Ingresos del Mes</p>
                  <p className="text-3xl font-bold text-gray-800">${monthlyIncome.toLocaleString()}</p>
                </div>
                <Wallet className="h-10 w-10 text-purple-500" />
              </div>
            </div>

            {/* Gráficos y Lista de Reportes */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Maquinarias por Estado */}
              <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Maquinarias por Estado</h2>
                <div className="space-y-3">
                  {machineryStatusData.map(item => (
                    <div key={item.name}>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>{item.name}</span>
                        <span>{item.value}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`${item.color} h-2.5 rounded-full`} 
                          style={{ width: `${(item.value / totalMachinery) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vehículos por Estado */}
              <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Vehículos por Estado</h2>
                <div className="space-y-3">
                  {vehicleStatusData.map(item => (
                    <div key={item.name}>
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>{item.name}</span>
                        <span>{item.value}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`${item.color} h-2.5 rounded-full`} 
                          style={{ width: `${(item.value / totalVehicles) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Lista de Alertas Recientes */}
              <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Alertas Recientes</h2>
                {recentAlerts.length > 0 ? (
                  <ul className="space-y-3">
                    {recentAlerts.map((alert: any) => (
                      <li 
                        key={alert._id} 
                        className="flex items-center text-sm text-gray-600 hover:text-blue-600 cursor-pointer"
                        onClick={() => setActiveModule('alerts')}
                      >
                        <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0 text-yellow-500" />
                        {alert.title}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-gray-500">No hay alertas recientes.</p>
                )}
                <button 
                  onClick={() => setActiveModule('alerts')}
                  className="mt-4 text-sm text-blue-600 hover:underline"
                >
                  Ver todas las alertas
                </button>
              </div>
            </div>

            {/* Accesos Rápidos */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Accesos Rápidos</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {quickAccessItems.map((item) => {
                  const Icon = item.icon;
                  // Updated isAvailable to exclude 'reports' and ensure 'alerts' is handled correctly
                  const isAvailable = ['machinery', 'warehouses', 'vehicles','fuel','tools','parts','alerts','finance','rentals'].includes(item.id);
                  
                  // Special handling for the 'reports' item if it was part of quickAccessItems, 
                  // it should now point to 'alerts'
                  let currentItem = item;
                  if (item.id === 'reports') {
                    const alertsItem = menuItems.find(mi => mi.id === 'alerts');
                    if (alertsItem) {
                      currentItem = alertsItem;
                    }
                  }

                  return (
                    <button
                      key={currentItem.id}
                      onClick={() => setActiveModule(currentItem.id)} // Use currentItem.id
                      disabled={!isAvailable}
                      className={`flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow ${
                        !isAvailable ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                      }`}
                    >
                      <Icon className={`h-10 w-10 mb-2 ${ // Icon remains from original item
                        activeModule === currentItem.id ? 'text-blue-600' : isAvailable ? 'text-blue-500' : 'text-gray-400'
                      }`} />
                      <span className={`text-sm font-medium ${
                        activeModule === currentItem.id ? 'text-blue-700' : 'text-gray-700'
                      }`}>{currentItem.name}</span> {/* Use currentItem.name */}
                      {!isAvailable && currentItem.id !== 'home' && ( // Use currentItem.id
                        <span className="mt-1 text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded-full">
                          Pronto
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <Wrench className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Taller Antony</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isAvailable = item.id === 'home' || ['machinery', 'warehouses', 'vehicles','fuel','tools','parts','alerts','finance','rentals'].includes(item.id);
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveModule(item.id);
                  setSidebarOpen(false);
                }}
                disabled={!isAvailable}
                className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-colors mb-1 ${
                  activeModule === item.id
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : isAvailable
                    ? 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                <Icon className="mr-3 h-5 w-5" />
                {item.name}
                {!isAvailable && item.id !== 'home' && (
                  <span className="ml-auto text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">
                    Pronto
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <div className="h-8 w-8 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button className="flex-1 flex items-center justify-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
              <Settings className="h-4 w-4 mr-2" />
              Config
            </button>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Top Bar */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md hover:bg-gray-100"
            >
              <Menu className="h-5 w-5" />
            </button>
            
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {menuItems.find(item => item.id === activeModule)?.name || 'Dashboard'}
              </h2>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Bienvenido, {user?.name}
              </span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto h-screen p-4">
          {renderContent()}
        </main>
      </div>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default MainDashboard;