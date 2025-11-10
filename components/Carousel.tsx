'use client';

import { useRef } from 'react';
import ResourceCard from './ResourceCard';
import styles from './Carousel.module.css'; // Import CSS module

interface Image {
  id: string;
  url: string;
}

interface Resource {
  id: string;
  name: string;
  description?: string | null;
  images: Image[]; // Cambiado a array de Image
  type: 'space' | 'equipment'; // type is now on the resource
  reservationLeadTime?: number | null; // Added
  isFixedToSpace?: boolean; // Added
  requiresSpaceReservationWithEquipment?: boolean; // Added
  _count?: { // Added
    equipments?: number;
  };
}

interface Props {
  resources: Resource[];
  onConfigureSpace?: (spaceId: string) => void; // NEW: Callback for configuring a space
}

const Carousel = ({ resources, onConfigureSpace }: Props) => {
  const scrollContainer = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainer.current) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      scrollContainer.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="position-relative">
      <div className={`${styles.carouselContainer} py-3`} ref={scrollContainer}>
        {resources.map(resource => (
          <div key={resource.id} className={styles.carouselItemContainer}>
            <ResourceCard resource={resource} type={resource.type} onConfigureSpace={onConfigureSpace} />
          </div>
        ))}
      </div>
      <button className={`btn btn-light rounded-circle shadow ${styles.carouselControlPrev}`} onClick={() => scroll('left')}>&#8249;</button>
      <button className={`btn btn-light rounded-circle shadow ${styles.carouselControlNext}`} onClick={() => scroll('right')}>&#8250;</button>
    </div>
  );
};

export default Carousel;