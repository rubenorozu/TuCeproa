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
}

interface Props {
  resources: Resource[];
}

const Carousel = ({ resources }: Props) => {
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
            <ResourceCard resource={resource} type={resource.type} />
          </div>
        ))}
      </div>
      <button className={`btn btn-light rounded-circle shadow ${styles.carouselControlPrev}`} onClick={() => scroll('left')}>&#8249;</button>
      <button className={`btn btn-light rounded-circle shadow ${styles.carouselControlNext}`} onClick={() => scroll('right')}>&#8250;</button>
    </div>
  );
};

export default Carousel;