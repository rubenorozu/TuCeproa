'use client';

import { useRef } from 'react';
import ResourceCard from './ResourceCard';

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
      <div className="d-flex overflow-auto carousel-container py-3" ref={scrollContainer}>
        {resources.map(resource => (
          <div key={resource.id} className="carousel-item-container me-3">
            <ResourceCard resource={resource} type={resource.type} />
          </div>
        ))}
      </div>
      <button className="btn btn-light rounded-circle carousel-control-prev shadow" onClick={() => scroll('left')}>&#8249;</button>
      <button className="btn btn-light rounded-circle carousel-control-next shadow" onClick={() => scroll('right')}>&#8250;</button>
    </div>
  );
};

export default Carousel;