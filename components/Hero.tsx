import Link from 'next/link';

const Hero = () => {
  return (
    <div className="p-4 bg-light rounded-3 shadow-sm border">
      <div className="container-fluid py-3">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
          <p className="fs-4 mb-3 mb-md-0">Accede a equipo y espacios disponibles en tu ceproa.</p>
          <Link href="/how-it-works" className="btn btn-outline-secondary" style={{ color: '#0076A8', borderColor: '#0076A8' }}>
            Cómo funciona
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Hero;
