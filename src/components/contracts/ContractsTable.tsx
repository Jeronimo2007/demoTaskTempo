import React from 'react';

interface Contract {
  id: number;
  client_id: number;
  description: string | null;
  total_value: number;
  start_date: string; // formato YYYY-MM-DD
  end_date: string | null;
  active: boolean;
  total_pagado: number;
  porcentaje_pagado: number;
  created_at: string; // formato ISO timestamp
}

interface ContractsTableProps {
  contracts: Contract[];
  clientNames: { id: number; name: string }[];
}

const ContractsTable: React.FC<ContractsTableProps> = ({ contracts, clientNames }) => {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <table className="w-full border border-black rounded-lg overflow-hidden">
      <thead>
        <tr className="bg-[#4901ce] text-white">
          <th className="border border-black p-2 text-left">Cliente</th>
          <th className="border border-black p-2 text-left">Descripción</th>
          <th className="border border-black p-2 text-left">Valor Total</th>
          <th className="border border-black p-2 text-left">Fecha Inicio</th>
          <th className="border border-black p-2 text-left">Fecha Fin</th>
          <th className="border border-black p-2 text-left">Activo</th>
          <th className="border border-black p-2 text-left">Total Pagado</th>
          <th className="border border-black p-2 text-left">Porcentaje Pagado</th>
          <th className="border border-black p-2 text-left">Fecha Creación</th>
        </tr>
      </thead>
      <tbody>
        {contracts.map((contract) => {
          const clientName = clientNames.find(client => client.id === contract.client_id)?.name || 'N/A';
          return (
            <tr key={contract.id} className="hover:bg-gray-50">
              <td className="border border-black p-2">{clientName}</td>
              <td className="border border-black p-2">{contract.description}</td>
              <td className="border border-black p-2">{formatCurrency(contract.total_value)}</td>
              <td className="border border-black p-2">{contract.start_date}</td>
              <td className="border border-black p-2">{contract.end_date || 'N/A'}</td>
              <td className="border border-black p-2">{contract.active ? 'Sí' : 'No'}</td>
              <td className="border border-black p-2">{formatCurrency(contract.total_pagado)}</td>
              <td className="border border-black p-2">{contract.porcentaje_pagado}%</td>
              <td className="border border-black p-2">{new Date(contract.created_at).toLocaleDateString('en-CA')}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

export default ContractsTable;