import Link from 'next/link';

const Hero = () => {
  return (
    <div className="bg-light rounded-3 shadow-sm border p-3 p-md-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center align-items-md-center">
          <p className="fs-4 mb-3 mb-md-0 text-center">Accede a equipo y espacios disponibles en tu ceproa.</p>
          <Link href="/how-it-works" className="btn btn-outline-secondary" style={{ color: '#0076A8', borderColor: '#0076A8' }}>
            Cómo funciona
          </Link>
        </div>
    </div>
  );
};

export default Hero;
