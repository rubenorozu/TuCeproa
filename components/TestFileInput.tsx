'use client';

import React, { useState } from 'react';
import Image from 'next/image';

export default function TestFileInput() {
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('DEBUG TestFileInput: handleFileChange llamado.');
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      console.log('DEBUG TestFileInput: Archivo seleccionado:', file.name, file.type);
      const reader = new FileReader();
      reader.onload = () => {
        console.log('DEBUG TestFileInput: FileReader cargado. imageDataUrl:', reader.result ? 'Sí' : 'No');
        setImageDataUrl(reader.result as string);
        console.log('DEBUG TestFileInput: setImageDataUrl llamado.');
      };
      reader.readAsDataURL(file);
    } else {
      console.log('DEBUG TestFileInput: No se seleccionó ningún archivo.');
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid gray' }}>
      <h3>Componente de Prueba de Input de Archivo</h3>
      <input type="file" onChange={handleFileChange} />
      {imageDataUrl && (
        <div>
          <p>Imagen cargada:</p>
                    <Image src={imageDataUrl} alt="Preview" width={200} height={200} style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'contain' }} />
        </div>
      )}
    </div>
  );
}
