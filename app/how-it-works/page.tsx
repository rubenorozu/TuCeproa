'use client';

import React from 'react';
import { Mail, Key, Monitor, FileText, GraduationCap, Upload, Eye, CheckCircle } from "lucide-react";
import styles from './Infografia.module.css'; // Import CSS Module

export default function Infografia() { // Changed component name to Infografia
  const pasos = [
    {
      numero: 1,
      titulo: "Crea tu cuenta",
      texto: "Usa tu correo @univa.mx o @alumnos.univa.mx y no olvides usar tus nombres y apellidos reales para ser candidato a préstamo.",
      icono: Mail,
    },
    {
      numero: 2,
      titulo: "Inicia sesión",
      texto: "Ingresa con tu usuario y contraseña",
      icono: Key,
    },
    {
      numero: 3,
      titulo: "Accede a la plataforma",
      texto: "Entra a Tu CEPROA desde tu navegador",
      icono: Monitor,
    },
    {
      numero: 4,
      titulo: "Consulta el reglamento y descarga tus formatos",
      texto: 'Consulta el <a href="/docs/reglamento.pdf" target="_blank" rel="noopener noreferrer">reglamento</a> y descarga el <a href="/docs/formato.docx" target="_blank" rel="noopener noreferrer">formato que debes adjuntar</a>.',
      icono: FileText,
    },
    {
      numero: 5,
      titulo: "Llena tu solicitud",
      texto: "Completa la información necesaria",
      icono: GraduationCap,
    },
    {
      numero: 6,
      titulo: "Sube los archivos",
      texto: "Carga los documentos solicitados",
      icono: Upload,
    },
    {
      numero: 7,
      titulo: "Revisa tu progreso",
      texto: "Consulta el estado de tu trámite",
      icono: Eye,
    },
    {
      numero: 8,
      titulo: "Recibe la validación",
      texto: "Confirma que tu proceso ha concluido",
      icono: CheckCircle,
    },
  ];

  return (
    <div className={styles.infografia} style={{ paddingTop: '100px' }}> {/* Added paddingTop for header clearance */}
      <h1 className={styles.titulo}>Cómo funciona Tu CEPROA</h1>

      <div className={styles.lista}>
        {pasos.map((paso) => (
          <div key={paso.numero} className={styles.paso}>
            <div className={styles.numero}>{paso.numero}</div>
            <div className={styles.contenido}>
              <div className={styles.encabezado}>
                <paso.icono size={22} className={styles.icono} />
                <h2 className={styles.subtitulo}>{paso.titulo}</h2>
              </div>
              <p className={styles.texto} dangerouslySetInnerHTML={{ __html: paso.texto }}></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}