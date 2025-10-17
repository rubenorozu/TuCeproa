
'use client';

import { useState } from 'react';
import { Container, Form, Button, Alert } from 'react-bootstrap';

export default function ContactPage() {
  const [status, setStatus] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    
    try {
      const response = await fetch('https://formspree.io/f/YOUR_FORMSPREE_ID', {
        method: 'POST',
        body: data,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        setStatus('success');
        form.reset();
      } else {
        setStatus('error');
      }
    } catch (error) {
      setStatus('error');
    }
  };

  return (
    <Container style={{ paddingTop: '100px', maxWidth: '600px' }}>
      <h2 className="mb-4 text-center">Contáctanos</h2>
      <p className="mb-4 text-center">
        ¿Tienes alguna pregunta o comentario? Llena el siguiente formulario para contactarnos.
      </p>
      {status === 'success' && (
        <Alert variant="success">
          ¡Gracias por tu mensaje! Nos pondremos en contacto contigo pronto.
        </Alert>
      )}
      {status === 'error' && (
        <Alert variant="danger">
          Hubo un error al enviar tu mensaje. Por favor, inténtalo de nuevo más tarde.
        </Alert>
      )}
      <Form onSubmit={handleSubmit}>
        <Form.Group className="mb-3" controlId="formName">
          <Form.Label>Nombre</Form.Label>
          <Form.Control type="text" name="name" required />
        </Form.Group>
        <Form.Group className="mb-3" controlId="formEmail">
          <Form.Label>Correo Electrónico</Form.Label>
          <Form.Control type="email" name="email" required />
        </Form.Group>
        <Form.Group className="mb-3" controlId="formMessage">
          <Form.Label>Mensaje</Form.Label>
          <Form.Control as="textarea" name="message" rows={4} required />
        </Form.Group>
        <div className="text-center">
          <Button variant="primary" type="submit" style={{ backgroundColor: '#0076A8', borderColor: '#0076A8' }}>
            Enviar Mensaje
          </Button>
        </div>
      </Form>
      <Alert variant="info" className="mt-4">
        <strong>Nota para el desarrollador:</strong> Reemplaza la URL del formulario de Formspree en <code>src/app/contact/page.tsx</code> con tu propio ID de Formspree para que el formulario de contacto funcione correctamente.
      </Alert>
    </Container>
  );
}
