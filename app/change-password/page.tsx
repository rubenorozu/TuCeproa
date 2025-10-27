// app/change-password/page.tsx
'use client';

import React, { useState } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';
import { useRouter } from 'next/navigation';

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!oldPassword || !newPassword || !confirmNewPassword) {
      setError('Todos los campos son obligatorios.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('La nueva contraseña y la confirmación no coinciden.');
      return;
    }

    if (newPassword.length < 6) { // Ejemplo de validación
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      const res = await fetch('/api/profile/change-password', { // Asumiendo una API para cambiar contraseña
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ oldPassword, newPassword }),
      });

      if (!res.ok) {
        try {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Error al cambiar la contraseña.');
        } catch (jsonError) {
          throw new Error(res.statusText || 'Ocurrió un error desconocido al cambiar la contraseña.');
        }
      }

      setSuccess('Contraseña cambiada con éxito.');
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      // Opcional: redirigir al perfil o a la página de inicio
      // router.push('/profile');
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error desconocido al cambiar la contraseña.');
      }
    }
  };

  return (
    <Container className="mt-5" style={{ paddingTop: '100px' }}>
      <h2 className="mb-4" style={{ color: '#0076A8' }}>Cambiar Contraseña</h2>
      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="formOldPassword">
          <Form.Label>Contraseña Actual</Form.Label>
          <Form.Control
            type="password"
            placeholder="Introduce tu contraseña actual"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formNewPassword">
          <Form.Label>Nueva Contraseña</Form.Label>
          <Form.Control
            type="password"
            placeholder="Introduce tu nueva contraseña"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Form.Group>

        <Form.Group className="mb-3" controlId="formConfirmNewPassword">
          <Form.Label>Confirmar Nueva Contraseña</Form.Label>
          <Form.Control
            type="password"
            placeholder="Confirma tu nueva contraseña"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
          />
        </Form.Group>

        <Button variant="primary" type="submit" style={{ backgroundColor: '#0076A8', borderColor: '#0076A8' }}>
          Cambiar Contraseña
        </Button>
      </Form>
    </Container>
  );
}