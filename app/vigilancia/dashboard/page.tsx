'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';

// Type for individual reservation items from the API
type ReservationItem = {
  id: string;
  displayId: string;
  cartSubmissionId: string;
  startTime: string;
  endTime: string;
  user: { firstName: string; lastName: string; };
  equipment: { name: string; fixedAssetId: string | null; };
  checkedOutAt: string | null;
  checkedInAt: string | null;
};

// Type for a grouped reservation request
type ReservationGroup = Omit<ReservationItem, 'equipment' | 'id'> & {
  items: Array<{ id: string; name: string; fixedAssetId: string | null; }>;
}

const ITEMS_PER_PAGE = 10;

const getStatusText = (group: ReservationGroup): string => {
  if (group.checkedInAt) return 'devuelto';
  if (group.checkedOutAt) return 'retirado';
  return 'pendiente de retiro';
};

export default function VigilanciaDashboard() {
  const [reservations, setReservations] = useState<ReservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [checkedItems, setCheckedItems] = useState<Record<string, Record<string, boolean>>>({});

  const fetchReservations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vigilancia/reservations');
      if (!res.ok) throw new Error('Failed to fetch reservations');
      const data = await res.json();
      setReservations(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleGroupAction = async (action: 'checkout' | 'checkin', group: ReservationGroup) => {
    const confirmationMessage = action === 'checkout' 
      ? `¿Confirmas la SALIDA de ${group.items.length} equipo(s) para la solicitud ${group.displayId}?`
      : `¿Confirmas el REGRESO de ${group.items.length} equipo(s) para la solicitud ${group.displayId}?`;
    
    if (!confirm(confirmationMessage)) return;

    try {
      const promises = group.items.map(item => 
        fetch(`/api/reservations/${item.id}/${action}`, { method: 'POST' })
      );
      const results = await Promise.all(promises);

      const failed = results.filter(res => !res.ok);
      if (failed.length > 0) {
        throw new Error(`Falló el registro para ${failed.length} de ${group.items.length} equipos.`);
      }

      alert('Acción registrada exitosamente para toda la solicitud.');
      fetchReservations(); // Refresh data
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleCheckboxChange = (groupId: string, itemId: string, checked: boolean) => {
    setCheckedItems(prev => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        [itemId]: checked,
      },
    }));
  };

  const groupedReservations = useMemo(() => {
    const groups: Record<string, ReservationGroup> = reservations.reduce((acc, res) => {
      const key = res.displayId; // Group by the shared displayId
      if (!acc[key]) {
        acc[key] = {
          ...res,
          items: [],
        };
      }
      acc[key].items.push({ id: res.id, name: res.equipment.name, fixedAssetId: res.equipment.fixedAssetId });
      return acc;
    }, {} as Record<string, ReservationGroup>);
    return Object.values(groups);
  }, [reservations]);

  const filteredReservations = useMemo(() => {
    return groupedReservations.filter(group =>
      group.displayId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${group.user.firstName} ${group.user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      getStatusText(group).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [groupedReservations, searchTerm]);

  const paginatedReservations = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredReservations.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredReservations, currentPage]);

  const totalPages = Math.ceil(filteredReservations.length / ITEMS_PER_PAGE);

  if (loading) return <p>Cargando reservaciones...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="container mt-5 pt-5">
      <p>Solicitudes de equipo aprobadas pendientes de gestión.</p>
      
      <div className="mb-3">
        <input
          type="text"
          className="form-control"
          placeholder="Buscar por ID, usuario, equipo o estado..."
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
        />
      </div>

      <div className="table-responsive">
        <table className="table table-striped">
          <thead>
            <tr>
              <th>ID Solicitud</th>
              <th>Usuario</th>
              <th>Equipos Solicitados</th>
              <th>Horario de Reserva</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginatedReservations.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center">No hay solicitudes que coincidan con la búsqueda.</td>
              </tr>
            ) : (
              paginatedReservations.map((group) => {
                const allItemsChecked = group.items.every(item => checkedItems[group.displayId]?.[item.id]);
                const isCheckedOut = !!group.checkedOutAt;
                const isCheckedIn = !!group.checkedInAt;

                return (
                  <tr key={group.displayId}>
                    <td><code>{group.displayId}</code></td>
                    <td>{`${group.user.firstName} ${group.user.lastName}`}</td>
                    <td>
                      <ul className="list-unstyled mb-0">
                        {group.items.map(item => (
                          <li key={item.id}>
                            <input 
                              type="checkbox" 
                              className="form-check-input me-2" 
                              id={`${group.displayId}-${item.id}`}
                              checked={checkedItems[group.displayId]?.[item.id] || false}
                              onChange={(e) => handleCheckboxChange(group.displayId, item.id, e.target.checked)}
                              disabled={isCheckedOut} // Disable checkboxes after checkout
                            />
                            <label htmlFor={`${group.displayId}-${item.id}`}>
                              {item.name}
                              {item.fixedAssetId && <span className="text-muted ms-2">(AF: {item.fixedAssetId})</span>}
                            </label>
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>{format(new Date(group.startTime), 'dd/MM/yy HH:mm')} - {format(new Date(group.endTime), 'HH:mm')}</td>
                    <td>
                      {getStatusText(group).charAt(0).toUpperCase() + getStatusText(group).slice(1)}
                    </td>
                    <td>
                      <div className="d-flex flex-column">
                        <button className="btn btn-sm btn-success mb-1" onClick={() => handleGroupAction('checkout', group)} disabled={!allItemsChecked || isCheckedOut}>
                          Registrar Salida
                        </button>
                        <button className="btn btn-sm btn-primary" onClick={() => handleGroupAction('checkin', group)} disabled={!isCheckedOut || isCheckedIn}>
                          Registrar Regreso
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="d-flex justify-content-center">
          <ul className="pagination">
            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setCurrentPage(p => p - 1)}>Anterior</button>
            </li>
            <li className="page-item disabled">
              <span className="page-link">Página {currentPage} de {totalPages}</span>
            </li>
            <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setCurrentPage(p => p + 1)}>Siguiente</button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
