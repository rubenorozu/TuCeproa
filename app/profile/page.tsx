'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Container, Spinner, Alert } from 'react-bootstrap';
import { useSession } from '@/context/SessionContext';

interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phoneNumber: string | null;
  alternativeEmail: string | null;
  profileImageUrl: string | null;
  role: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  identifier: string;
}

export default function ProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
    alternativeEmail: '',
  });
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const router = useRouter();
  const { user, loading: sessionLoading } = useSession();

  useEffect(() => {
    if (!sessionLoading && !user) {
      router.push('/login');
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to fetch profile');
        }
        const data: UserProfile = await res.json();
        setUserProfile(data);
        setFormData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phoneNumber: data.phoneNumber || '',
          alternativeEmail: data.alternativeEmail || '',
        });
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchProfile();
    }
  }, [user, sessionLoading, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfileImageFile(e.target.files[0]);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);

    if (!user) {
      setError('Authentication required.');
      return;
    }

    const updateFormData = new FormData();
    updateFormData.append('firstName', formData.firstName);
    updateFormData.append('lastName', formData.lastName);
    updateFormData.append('phoneNumber', formData.phoneNumber);
    updateFormData.append('alternativeEmail', formData.alternativeEmail);
    if (profileImageFile) {
      updateFormData.append('profileImage', profileImageFile);
    }

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        body: updateFormData,
      });

      if (!res.ok) {
        try {
          const errorData = await res.json();
          throw new Error(errorData.message || 'Failed to update profile');
        } catch (jsonError) {
          throw new Error(res.statusText || 'An unexpected error occurred');
        }
      }

      const updatedData: UserProfile = await res.json();
      setUserProfile(updatedData);
      setFormData({
        firstName: updatedData.firstName || '',
        lastName: updatedData.lastName || '',
        phoneNumber: updatedData.phoneNumber || '',
        alternativeEmail: updatedData.alternativeEmail || '',
      });
      setSuccess('Perfil actualizado con éxito!');
      setEditMode(false);
      setProfileImageFile(null);
    } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError('An unknown error occurred');
        }
    }
  };

  if (sessionLoading || loading) {
    return <Container className="mt-5 text-center"><Spinner animation="border" /><p>Cargando perfil...</p></Container>;
  }

  if (error && !userProfile) { 
    return <Container className="mt-5"><Alert variant="danger">Error: {error}</Alert></Container>;
  }

  if (!userProfile) {
    return <Container className="mt-5"><Alert variant="warning">No se pudo cargar la información del perfil.</Alert></Container>;
  }

  return (
    <div className="container" style={{ paddingTop: '100px' }}>
      <h2 style={{ color: '#0076A8' }}>Mi Espacio</h2>
      <hr />

      {error && <Alert variant="danger">{error}</Alert>}
      {success && <Alert variant="success">{success}</Alert>}

      <div className="card mb-4">
        <div className="card-body">
          <h4 className="card-title">Información del Usuario</h4>
          <div className="text-center mb-3">
            {userProfile.profileImageUrl ? (
              <Image
                src={userProfile.profileImageUrl}
                alt="Profile"
                width={150}
                height={150}
                className="rounded-circle"
                style={{ objectFit: 'cover' }}
              />
            ) : (
              <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" style={{ width: 150, height: 150, fontSize: '3rem' }}>
                {userProfile.firstName ? userProfile.firstName[0].toUpperCase() : userProfile.email[0].toUpperCase()}
              </div>
            )}
          </div>

          {!editMode ? (
            <div>
              <p><strong>Nombre:</strong> {`${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || 'N/A'}</p>
              <p><strong>Matrícula/Nómina:</strong> {userProfile.identifier || 'N/A'}</p>
              <p><strong>Email:</strong> {userProfile.email}</p>
              <p><strong>Teléfono:</strong> {userProfile.phoneNumber || 'N/A'}</p>
              <p><strong>Email Alternativo:</strong> {userProfile.alternativeEmail || 'N/A'}</p>
              <p><strong>Rol:</strong> {userProfile.role}</p>
              <p><strong>Verificado:</strong> {userProfile.isVerified ? 'Sí' : 'No'}</p>
              <p><strong>Miembro desde:</strong> {new Date(userProfile.createdAt).toLocaleDateString()}</p>
              <button className="btn btn-primary" onClick={() => setEditMode(true)} style={{ backgroundColor: '#0076A8', borderColor: '#0076A8' }}>
                Editar Perfil
              </button>
            </div>
          ) : (
            <form onSubmit={handleUpdateProfile}>
              <div className="mb-3">
                <label htmlFor="firstName" className="form-label">Nombre</label>
                <input type="text" className="form-control" id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} />
              </div>
              <div className="mb-3">
                <label htmlFor="lastName" className="form-label">Apellido</label>
                <input type="text" className="form-control" id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} />
              </div>
              <div className="mb-3">
                <label htmlFor="phoneNumber" className="form-label">Teléfono</label>
                <input type="text" className="form-control" id="phoneNumber" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} />
              </div>
              <div className="mb-3">
                <label htmlFor="alternativeEmail" className="form-label">Email Alternativo</label>
                <input type="email" className="form-control" id="alternativeEmail" name="alternativeEmail" value={formData.alternativeEmail} onChange={handleInputChange} />
              </div>
              <div className="mb-3">
                <label htmlFor="profileImage" className="form-label">Foto de Perfil</label>
                <input type="file" className="form-control" id="profileImage" name="profileImage" accept="image/*" onChange={handleFileChange} />
                {profileImageFile && <small className="text-muted">Archivo seleccionado: {profileImageFile.name}</small>}
              </div>

              <button type="submit" className="btn btn-success me-2">Guardar Cambios</button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditMode(false)}>Cancelar</button>
            </form>
          )}
        </div>
      </div>

      {/* Suggestions for other sections: */}
      <div className="card mb-4">
        <div className="card-body">
          <h4 className="card-title">Acciones Rápidas</h4>
          <Link href="/reservations" className="btn btn-outline-primary me-2">Mis Reservas</Link>
          {/* Add more quick actions here */}
        </div>
      </div>

      {/* Example of a "Change Password" section */}
      <div className="card mb-4">
        <div className="card-body">
          <h4 className="card-title">Seguridad</h4>
          <p>Cambia tu contraseña para mantener tu cuenta segura.</p>
          <Link href="/change-password" className="btn btn-outline-secondary">Cambiar Contraseña</Link>
        </div>
      </div>
    </div>
  );
}
