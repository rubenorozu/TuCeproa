import Link from 'next/link';
import styles from './ResourceCard.module.css';

const Hero = () => {
  return (
    <div className="bg-light rounded-3 shadow-sm border p-3 p-md-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-center align-items-md-center">
          <p className="fs-4 mb-3 mb-md-0 text-center">Accede a equipo y espacios disponibles en tu ceproa.</p>
          <Link href="/how-it-works" className={`btn ${styles.customPrimaryButton}`}>
            Cómo funciona
          </Link>
        </div>
    </div>
  );
};

export default Hero;
