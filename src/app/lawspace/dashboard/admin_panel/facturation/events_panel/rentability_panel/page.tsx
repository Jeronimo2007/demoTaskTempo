"use client";

import { useEffect, useState } from 'react';
import { Table, Collapse } from 'antd';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";

const { Panel } = Collapse;

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface RentabilityData {
  total_salarios: number;
  total_horas_trabajadas: number;
  total_ingresos: number;
  rentabilidad_oficina: number;
}

interface LawyerCostVsHoursData {
  username: string;
  salary: number;
  worked_hours: number;
  cost_per_hour_firma: number;
  cost_per_hour_client: number;
  ingresos_generados: number;
  utilidad_por_hora: number;
}

interface LawyerWeeklyWorkloadData {
  username: string;
  worked_hours_this_week: number;
  weekly_hours_expected: number;
}

interface ClientContribution {
  user_id: number;
  username: string;
  worked_hours: number;
  porcentaje_contribucion: number;
}

interface ClientContributionData {
  client_id: number;
  client_name: string;
  total_hours: number;
  contributions: ClientContribution[];
}

const OfficeRentabilitySummary = () => {
  const [rentabilityData, setRentabilityData] = useState<RentabilityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRentabilityData = async () => {
      try {
        setLoading(true);
        // Replace with your actual API endpoint
        const response = await fetch(`${API_URL}/rentability/office/summary`);
        if (!response.ok) {
          throw new Error("HTTP error! Status: " + response.status);
        }
        const data: RentabilityData = await response.json();
        setRentabilityData(data);
      } catch (error) {
        console.error("Could not fetch rentability data:", error);
        setRentabilityData({
          total_salarios: 0,
          total_horas_trabajadas: 0,
          total_ingresos: 0,
          rentabilidad_oficina: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRentabilityData();
  }, []);

  const columns = [
    {
      title: 'Total Salarios',
      dataIndex: 'total_salarios',
      key: 'total_salarios',
    },
    {
      title: 'Total Horas Trabajadas',
      dataIndex: 'total_horas_trabajadas',
      key: 'total_horas_trabajadas',
    },
    {
      title: 'Total Ingresos',
      dataIndex: 'total_ingresos',
      key: 'total_ingresos',
    },
    {
      title: 'Rentabilidad Oficina',
      dataIndex: 'rentabilidad_oficina',
      key: 'rentabilidad_oficina',
    },
  ];

  const data = rentabilityData ? [rentabilityData] : [];

  return (
    <div>
      <h2>Resumen de Rentabilidad de SSL</h2>
      <Table
        columns={columns}
        dataSource={data}
        rowKey={(record, index = 0) => index.toString()}
        loading={loading}
        pagination={false}
      />
    </div>
  );
};

const LawyersCostVsHours = () => {
  const [data, setData] = useState<LawyerCostVsHoursData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/rentability/lawyers/cost-vs-hours`);
        if (!response.ok) {
          throw new Error("HTTP error! Status: " + response.status);
        }
        const data: LawyerCostVsHoursData[] = await response.json();
        setData(data);
      } catch (error) {
        console.error("Could not fetch lawyer cost vs hours data:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const columns = [
    {
      title: 'Abogado',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Salario',
      dataIndex: 'salary',
      key: 'salary',
    },
    {
      title: 'Horas Trabajadas',
      dataIndex: 'worked_hours',
      key: 'worked_hours',
    },
    {
      title: 'Coste por Hora (Firma)',
      dataIndex: 'cost_per_hour_firma',
      key: 'cost_per_hour_firma',
    },
    {
      title: 'Coste por Hora (Cliente)',
      dataIndex: 'cost_per_hour_client',
      key: 'cost_per_hour_client',
    },
    {
      title: 'Ingresos Generados',
      dataIndex: 'ingresos_generados',
      key: 'ingresos_generados',
    },
    {
      title: 'Utilidad por Hora',
      dataIndex: 'utilidad_por_hora',
      key: 'utilidad_por_hora',
    },
  ];

  return (
    <div>
      <h3>Coste por Hora de Abogados</h3>
      <Table
        columns={columns}
        dataSource={data}
        rowKey={(record, index = 0) => index.toString()}
        loading={loading}
        pagination={false}
      />
    </div>
  );
};

const LawyersWeeklyWorkload = () => {
  const [data, setData] = useState<LawyerWeeklyWorkloadData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/rentability/lawyers/weekly-workload`);
        if (!response.ok) {
          throw new Error("HTTP error! Status: " + response.status);
        }
        const data: LawyerWeeklyWorkloadData[] = await response.json();
        setData(data);
      } catch (error) {
        console.error("Could not fetch lawyer weekly workload data:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const columns = [
    {
      title: 'Abogado',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Horas Trabajadas Esta Semana',
      dataIndex: 'worked_hours_this_week',
      key: 'worked_hours_this_week',
    },
    {
      title: 'Horas Esperadas Esta Semana',
      dataIndex: 'weekly_hours_expected',
      key: 'weekly_hours_expected',
    },
  ];

  return (
    <div>
      <h3>Carga de Abogados por Semana</h3>
      <Table
        columns={columns}
        dataSource={data}
        rowKey={(record, index = 0) => index.toString()}
        loading={loading}
        pagination={false}
      />
    </div>
  );
};

const ClientsContributions = () => {
  const [data, setData] = useState<ClientContributionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/rentability/clients/contributions`);
        if (!response.ok) {
          throw new Error("HTTP error! Status: " + response.status);
        }
        const data: ClientContributionData[] = await response.json();
        setData(data);
      } catch (error) {
        console.error("Could not fetch clients contributions data:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter data based on search term
  const filteredData = data.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.client_name.toLowerCase().includes(searchLower) ||
      client.contributions.some(contribution => 
        contribution.username.toLowerCase().includes(searchLower)
      )
    );
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const columns = [
    {
      title: 'Cliente',
      dataIndex: 'client_name',
      key: 'client_name',
    },
    {
      title: 'Total Horas',
      dataIndex: 'total_hours',
      key: 'total_hours',
    },
    {
      title: 'Contribuciones',
      key: 'contributions',
      render: (record: ClientContributionData) => (
        <Table
          columns={[
            {
              title: 'Abogado',
              dataIndex: 'username',
              key: 'username',
            },
            {
              title: 'Horas Trabajadas',
              dataIndex: 'worked_hours',
              key: 'worked_hours',
            },
            {
              title: 'Porcentaje de Contribución',
              dataIndex: 'porcentaje_contribucion',
              key: 'porcentaje_contribucion',
            },
          ]}
          dataSource={record.contributions}
          rowKey={(record, index = 0) => index.toString()}
          pagination={false}
        />
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3>Contribuciones de Clientes</h3>
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Buscar por cliente o abogado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute left-3 top-2.5 text-gray-400">
            <FontAwesomeIcon icon={faSearch} />
          </div>
        </div>
      </div>
      <Table
        columns={columns}
        dataSource={paginatedData}
        rowKey={(record, index = 0) => index.toString()}
        loading={loading}
        pagination={false}
      />
      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-4">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="text-gray-700">
          Página {currentPage} de {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};


export default function RentabilityPanelPage() {
  return (
    <div className="p-6 text-black">
      <h1 className="text-4xl font-bold text-center mb-8 text-black border-b-2 border-blue-200 pb-4">Panel de Rentabilidad</h1>
      <Collapse defaultActiveKey={['1']}>
        <Panel header="Resumen de Rentabilidad de SSL" key="1">
          <OfficeRentabilitySummary />
        </Panel>
        <Panel header="Coste por Hora de Abogados" key="2">
          <LawyersCostVsHours />
        </Panel>
        <Panel header="Carga de Abogados por Semana" key="3">
          <LawyersWeeklyWorkload />
        </Panel>
         <Panel header="Contribuciones de Clientes" key="4">
          <ClientsContributions />
        </Panel>
      </Collapse>
    </div>
  );
}