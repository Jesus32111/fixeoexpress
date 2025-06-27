import React from 'react';

const IncomeExpenseSummary: React.FC = () => {
  // Placeholder data - replace with actual data fetching and processing
  const income = 15000;
  const expenses = 8500;
  const profit = income - expenses;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold text-gray-700 mb-4">Ingresos vs Egresos</h3>
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Ingresos Totales:</span>
          <span className="text-green-500 font-semibold text-xl">${income.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Egresos Totales:</span>
          <span className="text-red-500 font-semibold text-xl">${expenses.toLocaleString()}</span>
        </div>
        <hr className="my-2 border-gray-200" />
        <div className="flex justify-between items-center">
          <span className="text-gray-800 font-bold">Ganancia Neta:</span>
          <span className={`font-bold text-2xl ${profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            ${profit.toLocaleString()}
          </span>
        </div>
      </div>
      {/* Placeholder for a chart - e.g., using Chart.js or Recharts */}
      <div className="mt-6 text-center text-gray-400">
        <p>(Gráfico de Ingresos vs Egresos Próximamente)</p>
      </div>
    </div>
  );
};

export default IncomeExpenseSummary;
