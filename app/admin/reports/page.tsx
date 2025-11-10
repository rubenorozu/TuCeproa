'use client';

import { useState, useEffect, useCallback } from 'react';
import { Container, Button, Spinner, Alert, Table, Form, Badge, Pagination, InputGroup } from 'react-bootstrap';
import { useSession } from '@/context/SessionContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ReportDetailsModal from '@/components/ReportDetailsModal';

interface Report {
  id: string;
  reportIdCode: string; // NEW: Add reportIdCode
  description: string;
  createdAt: string;
  status: string;
  resource: {
    name: string;
  };
  user: {
    firstName: string;
    lastName: string;
  };
}

export default function AdminReportsPage() {
  const { user, loading: sessionLoading } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  // Pagination and Search states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalReports, setTotalReports] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        search: searchTerm,
      }).toString();
      const response = await fetch(`/api/admin/reports?${queryParams}`);
      if (!response.ok) {
        throw new Error('Error al cargar los reportes.');
      }
      const data = await response.json();
      setReports(data.reports);
      setTotalReports(data.totalReports);
      setTotalPages(Math.ceil(data.totalReports / pageSize));
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchTerm]);

  useEffect(() => {
    if (!sessionLoading && (!user || (user.role !== 'SUPERUSER' && user.role !== 'ADMIN_RESOURCE'))) {
      router.push('/admin');
    }
  }, [user, sessionLoading, router]);

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user, fetchReports]); // Add fetchReports to dependencies

  const handleShowDetails = (reportId: string) => {
    setSelectedReportId(reportId);
    setShowDetailsModal(true);
  };

  const handleCloseDetails = () => {
    setSelectedReportId(null);
    setShowDetailsModal(false);
    fetchReports(); // Refresh reports after modal closes (e.g., status update)
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'danger';
      case 'IN_PROGRESS':
        return 'warning';
      case 'RESOLVED':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const getTranslatedStatus = (status: string) => {
    switch (status) {
      case 'OPEN':
        return 'Abierto';
      case 'IN_PROGRESS':
        return 'En Progreso';
      case 'RESOLVED':
        return 'Resuelto';
      default:
        return 'Desconocido';
    }
  };

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on new search
  };

  if (sessionLoading || loading) {
    return <Container className="mt-5 text-center"><Spinner animation="border" /></Container>;
  }

  if (error) {
    return <Container className="mt-5"><Alert variant="danger">{error}</Alert></Container>;
  }

  return (
    <Container style={{ paddingTop: '100px' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Gestión de Reportes</h2>
        <Link href="/admin" passHref>
          <Button variant="outline-secondary">Regresar</Button>
        </Link>
      </div>

      <InputGroup className="mb-3">
        <Form.Control
          placeholder="Buscar reportes por descripción, recurso o usuario..."
          aria-label="Buscar reportes"
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </InputGroup>

      {reports.length === 0 && !loading && (
        <Alert variant="info">No se encontraron reportes.</Alert>
      )}

      {reports.length > 0 && (
        <Table striped bordered hover responsive className="mb-3">
          <thead>
            <tr>
              <th>ID Reporte</th>
              <th>Recurso</th>
              <th>Usuario</th>
              <th>Descripción</th>
              <th>Fecha</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(report => (
              <tr key={report.id}>
                <td>{report.reportIdCode}</td>
                <td>{report.resource.name}</td>
                <td>{`${report.user.firstName} ${report.user.lastName}`}</td>
                <td>{report.description}</td>
                <td>{new Date(report.createdAt).toLocaleDateString()}</td>
                <td>
                  <Badge bg={getStatusVariant(report.status)}>{getTranslatedStatus(report.status)}</Badge>
                </td>
                <td>
                  <Button variant="primary" size="sm" onClick={() => handleShowDetails(report.id)}>Ver Detalles</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {(totalReports > 0 || (totalReports === 0 && !loading)) && ( // Always show pagination if there are reports, or if no reports but not loading
        <div className="d-flex justify-content-center">
          <Pagination>
            <Pagination.Prev onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || totalPages <= 1}>Anterior</Pagination.Prev>
            {[...Array(totalPages)].map((_, index) => (
              <Pagination.Item
                key={index + 1}
                active={index + 1 === currentPage}
                onClick={() => handlePageChange(index + 1)}
                disabled={totalPages <= 1}
              >
                {index + 1}
              </Pagination.Item>
            ))}
            <Pagination.Next onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || totalPages <= 1}>Siguiente</Pagination.Next>
          </Pagination>
        </div>
      )}

      <ReportDetailsModal
        show={showDetailsModal}
        handleClose={handleCloseDetails}
        reportId={selectedReportId}
        onUpdate={fetchReports}
      />
    </Container>
  );
}
