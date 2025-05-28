import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import './CampusMap.css';

// Import the image using Vite's public URL handling
const campusMapImage = new URL('/campus-map-2d.jpg', import.meta.url).href;

interface CampusMapProps {
  isOpen: boolean;
  onClose: () => void;
  location?: {
    name: string;
    coordinates: [number, number];
    description: string;
  };
}

// Your buildings as GeoJSON
const buildingGeoJSON: GeoJSON.FeatureCollection<GeoJSON.Point, {
  name: string;
  description: string;
}> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'City & Guilds Building',
        description: 'Engineering department and main lecture halls.'
      },
      geometry: {
        type: 'Point',
        coordinates: [-0.174692, 51.498474]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'EEE Building',
        description: 'EE Engineering department and main lecture halls.'
      },
      geometry: {
        type: 'Point',
        coordinates: [-0.176422, 51.498974]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Skempton Building',
        description: 'Engineering department and main lecture halls.'
      },
      geometry: {
        type: 'Point',
        coordinates: [-0.176092, 51.498474]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: "Queen's Tower",
        description: 'Icon tower'
      },
      geometry: {
        type: 'Point',
        coordinates: [-0.176880, 51.498350]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Imperial College Main Entrance',
        description: 'The iconic Queen\'s Gate entrance to Imperial.'
      },
      geometry: {
        type: 'Point',
        coordinates: [-0.174646, 51.499030]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'Royal School of Mines',
        description: 'Houses geoscience and materials departments.'
      },
      geometry: {
        type: 'Point',
        coordinates: [-0.176021, 51.499636]
      }
    }
  ]
};

const CampusMap: React.FC<CampusMapProps> = ({ isOpen, onClose }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [is3DMode, setIs3DMode] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!isOpen || !mapContainer.current) return;

    if (is3DMode) {
      // 3D Map initialization
      mapboxgl.accessToken = 'pk.eyJ1IjoicGFueXgiLCJhIjoiY21iNzBmajd1MDVmaTJtcDlldDF1N3N3diJ9.1_MmzxAAUJx0uDG4IG9ARA';

      const bounds: mapboxgl.LngLatBoundsLike = [
        [-0.1785, 51.4968],
        [-0.1732, 51.5010]
      ];

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [-0.1743, 51.4982],
        zoom: 15.5,
        minZoom: 15,
        maxZoom: 19,
        pitch: 60,
        bearing: -45,
        antialias: true,
        maxBounds: bounds
      });

      map.current.on('load', () => {
        if (!map.current) return;

        // 1) 3D buildings layer
        map.current.addLayer({
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 15,
          paint: {
            'fill-extrusion-color': '#555',
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.9
          }
        });

        // 2) GeoJSON source for your points
        map.current.addSource('buildings', {
          type: 'geojson',
          data: buildingGeoJSON
        });

        // 3) Circle layer for blue dots
        map.current.addLayer({
          id: 'building-points',
          type: 'circle',
          source: 'buildings',
          paint: {
            'circle-color': '#007bff',
            'circle-radius': 6,
            'circle-stroke-color': '#fff',
            'circle-stroke-width': 2
          }
        });

        // 4) Symbol layer for labels
        map.current.addLayer({
          id: 'building-labels',
          type: 'symbol',
          source: 'buildings',
          layout: {
            'text-field': ['get', 'name'],
            'text-offset': [0, 1.5],
            'text-anchor': 'top',
            'text-size': 13,
            'text-allow-overlap': false
          },
          paint: {
            'text-color': '#007bff',
            'text-halo-color': '#fff',
            'text-halo-width': 1.5
          }
        });

        // 5) Popup on click
        map.current.on('click', 'building-labels', (e) => {
          const feature = e.features?.[0];
          if (!feature) return;

          const coords = (feature.geometry as any).coordinates;
          const { name, description } = feature.properties as any;

          new mapboxgl.Popup()
            .setLngLat(coords)
            .setHTML(`<div><h3>${name}</h3><p>${description}</p></div>`)
            .addTo(map.current!);
        });

        // 6) Pointer cursor on hover
        map.current.on('mouseenter', 'building-labels', () => {
          map.current!.getCanvas().style.cursor = 'pointer';
        });
        map.current.on('mouseleave', 'building-labels', () => {
          map.current!.getCanvas().style.cursor = '';
        });
      });

      return () => {
        map.current?.remove();
      };
    }
  }, [isOpen, is3DMode]);

  const handle2DImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('Image load error:', e);
    const img = e.target as HTMLImageElement;
    console.error('Failed URL:', img.src);
    setImageError(true);
  };

  if (!isOpen) return null;

  return (
    <div className="map-dialog-overlay" onClick={onClose}>
      <div className="map-dialog" onClick={e => e.stopPropagation()}>
        <div className="map-dialog-header">
          <div className="map-header-content">
            <h2>Campus Map</h2>
            <div className="view-toggle">
              <label className="switch">
                <input
                  type="checkbox"
                  checked={is3DMode}
                  onChange={(e) => setIs3DMode(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
              <span className="toggle-label">{is3DMode ? '3D' : '2D'}</span>
            </div>
          </div>
          <button className="map-close-btn" onClick={onClose} aria-label="Close map">
            ✕
          </button>
        </div>
        {is3DMode ? (
          <div ref={mapContainer} id="map-container" />
        ) : (
          <div className="map-2d-container">
            {imageError ? (
              <div className="map-error-message">
                Failed to load campus map image. Please try again later.
                <br />
                <button 
                  onClick={() => setImageError(false)} 
                  style={{ marginTop: '10px', padding: '5px 10px' }}
                >
                  Retry
                </button>
              </div>
            ) : (
              <img 
                src={campusMapImage}
                alt="Imperial College Campus Map" 
                className="campus-map-2d"
                onError={handle2DImageError}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CampusMap;
