import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';

const prisma = new PrismaClient();
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
const shouldDelete = process.argv.includes('--delete');

async function getAllFilesInDir(dirPath, fileList = []) {
  const files = await fs.readdir(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = await fs.stat(filePath);

    if (stat.isDirectory()) {
      await getAllFilesInDir(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }

  return fileList;
}

async function findUnusedAssets() {
  try {
    console.log('Conectando a la base de datos...');
    await prisma.$connect();
    console.log('Conexión exitosa.');

    // 1. Get all asset URLs from the database
    console.log('Obteniendo rutas de la base de datos...');
    const dbAssets = new Set();

    const images = await prisma.image.findMany({ select: { url: true } });
    images.forEach(img => dbAssets.add(img.url));

    const users = await prisma.user.findMany({ where: { profileImageUrl: { not: null } }, select: { profileImageUrl: true } });
    users.forEach(user => dbAssets.add(user.profileImageUrl));

    const documents = await prisma.document.findMany({ select: { filePath: true } });
    documents.forEach(doc => dbAssets.add(doc.filePath));

    console.log(`Se encontraron ${dbAssets.size} rutas de archivos en la base de datos.`);

    // 2. Get all files from the uploads directory
    console.log('Leyendo archivos en el directorio public/uploads...');
    const physicalFiles = await getAllFilesInDir(uploadsDir);
    console.log(`Se encontraron ${physicalFiles.length} archivos físicos.`);

    // 3. Compare and find unused files
    const unusedFiles = [];
    for (const filePath of physicalFiles) {
      const relativePath = '/' + path.relative(path.join(process.cwd(), 'public'), filePath);
      if (!dbAssets.has(relativePath)) {
        unusedFiles.push(filePath); // Store the full path for deletion
      }
    }

    if (unusedFiles.length > 0) {
      if (shouldDelete) {
        console.log(`\n--- Eliminando ${unusedFiles.length} archivos no utilizados... ---`);
        for (const file of unusedFiles) {
          try {
            await fs.unlink(file);
            console.log(`Eliminado: ${path.basename(file)}`);
          } catch (err) {
            console.error(`Error al eliminar ${path.basename(file)}:`, err.message);
          }
        }
        console.log('\n¡Limpieza completada!');
      } else {
        console.log('\n--- Archivos no utilizados encontrados ---');
        unusedFiles.forEach(file => console.log(path.relative(process.cwd(), file)));
        console.log(`\nTotal: ${unusedFiles.length} archivos no utilizados.`);
        console.log('\nPara eliminar estos archivos, ejecuta el script con la bandera --delete.');
      }
    } else {
      console.log('¡Excelente! No se encontraron archivos no utilizados.');
    }

  } catch (error) {
    console.error('Ocurrió un error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\nDesconectado de la base de datos.');
  }
}

findUnusedAssets();