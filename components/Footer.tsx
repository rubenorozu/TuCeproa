import Image from 'next/image';
import Link from 'next/link';

const Footer = () => {
  return (
    <footer className="mt-auto">
      <div className="bg-light">
        <div className="container px-3">
          <div className="p-4">
            <div className="d-flex flex-column flex-md-row justify-content-center justify-content-md-between align-items-center">
              <h3 className="fw-medium fs-6 mb-3 mb-md-0 text-center text-md-start">¿Necesitas Ayuda con tu proyecto?</h3>
              <div className="d-flex justify-content-center">
                <Link href="/contact" className="btn btn-primary me-2">Contáctanos</Link>
                <Link href="/workshops" className="btn btn-outline-primary">Talleres</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="border-top py-3">
        <div className="container-fluid d-flex justify-content-between align-items-center">
          <div className="ps-3">
            <Image src="/assets/UNIVA.svg" alt="UNIVA" width={156} height={78} style={{ objectFit: 'contain' }} />
          </div>
          <small className="text-muted text-end flex-grow-1 pe-3">
            <Link href="/aviso-de-privacidad">Aviso de Privacidad</Link> | Copyright 2025. Universidad del Valle de Atemajac. Todos los derechos Reservados.
          </small>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
