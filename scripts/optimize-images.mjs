
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

async function findImageFiles(dir) {
  let imageFiles = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      imageFiles = imageFiles.concat(await findImageFiles(fullPath));
    } else if (/\.(jpe?g|png)$/i.test(entry.name)) {
      imageFiles.push(fullPath);
    }
  }
  return imageFiles;
}

async function optimizeImages() {
  try {
    console.log('Buscando imágenes en:', uploadsDir);
    const imagePaths = await findImageFiles(uploadsDir);
    console.log(`Se encontraron ${imagePaths.length} imágenes para optimizar.`);

    for (const imagePath of imagePaths) {
      const newPath = imagePath.replace(/\.(jpe?g|png)$/i, '.webp');
      
      // Evitar procesar si ya existe una versión webp
      try {
        await fs.access(newPath);
        console.log(`Saltando, ya existe: ${path.basename(newPath)}`);
        continue;
      } catch (error) {
        // No existe, continuar con la optimización
      }

      console.log(`Procesando: ${path.basename(imagePath)}`);

      const image = sharp(imagePath);
      await image
        .resize({ width: 1920, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(newPath);
      
      console.log(`Optimizado: ${path.basename(newPath)}`);
    }

    console.log('¡Optimización de imágenes completada!');
  } catch (error) {
    console.error('Ocurrió un error durante la optimización de imágenes:', error);
  }
}

optimizeImages();
