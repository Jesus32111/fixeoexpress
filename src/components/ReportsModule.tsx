import React, { useState } from 'react';
import axios from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Download, FileText, AlertTriangle, BarChart2, DollarSign, Droplet, Truck, Wrench, Archive, Users, Home } from 'lucide-react';

const ReportsModule: React.FC = () => {
  const { token } = useAuth();
  const [reportType, setReportType] = useState<string>('general');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.post(`/reports/${reportType}`, {}, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob', // Important for file download
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${reportType}_report_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);

    } catch (err: any) {
      console.error('Error generating report:', err);
      if (err.response && err.response.data && typeof err.response.data === 'string') {
        setError(err.response.data);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Ocurrió un error al generar el reporte.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const moduleOptions = [
    { value: 'general', label: 'General', icon: <BarChart2 className="w-5 h-5 mr-2" /> },
    { value: 'alerts', label: 'Alertas', icon: <AlertTriangle className="w-5 h-5 mr-2" /> },
    { value: 'finance', label: 'Finanzas', icon: <DollarSign className="w-5 h-5 mr-2" /> },
    { value: 'fuel', label: 'Combustible', icon: <Droplet className="w-5 h-5 mr-2" /> },
    { value: 'machinery', label: 'Maquinaria', icon: <Truck className="w-5 h-5 mr-2" /> },
    { value: 'parts', label: 'Repuestos', icon: <Wrench className="w-5 h-5 mr-2" /> },
    { value: 'rentals', label: 'Alquileres', icon: <Users className="w-5 h-5 mr-2" /> },
    { value: 'tools', label: 'Herramientas', icon: <Wrench className="w-5 h-5 mr-2" /> },
    { value: 'vehicles', label: 'Vehículos', icon: <Truck className="w-5 h-5 mr-2" /> },
    { value: 'warehouses', label: 'Almacenes', icon: <Home className="w-5 h-5 mr-2" /> },
  ];

  return (
    <div className="container mx-auto p-6 bg-white shadow-lg rounded-lg">
      <h2 className="text-3xl font-bold mb-6 text-gray-800 border-b pb-3">Generador de Reportes</h2>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      <div className="mb-6">
        <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 mb-2">
          Seleccione el tipo de reporte:
        </label>
        <div className="relative">
          <select
            id="reportType"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm appearance-none"
          >
            {moduleOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
            <FileText className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end">
        <button
          onClick={handleGenerateReport}
          disabled={isLoading}
          className={`flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white 
                      ${isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'}
                      transition ease-in-out duration-150`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generando...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              Generar y Descargar PDF
            </>
          )}
        </button>
      </div>
       <div className="mt-8 p-4 border border-gray-200 rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-700 mb-2">Información del Reporte</h3>
        <p className="text-sm text-gray-600">
          El reporte seleccionado (<span className="font-medium">{moduleOptions.find(opt => opt.value === reportType)?.label}</span>)
          contendrá un resumen de los datos relevantes del módulo. El formato del archivo será PDF.
        </p>
        {reportType === 'general' && (
          <p className="text-sm text-gray-600 mt-2">
            El reporte general incluirá un resumen de todos los módulos disponibles.
          </p>
        )}
      </div>
    </div>
  );
};

export default ReportsModule;
