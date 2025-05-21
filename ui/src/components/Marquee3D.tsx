import React, { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import './magicui/marquee.css';

// Item interfaces
interface Equipment {
  id: string;
  name: string;
  type: string;
  location: string;
  isAvailable: boolean;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  location: string;
  features: string[];
  isAvailable: boolean;
}

interface MarqueeItem {
  id: string;
  name: string;
  type: 'equipment' | 'room';
  location: string;
  icon: string;
  item: Equipment | Room;
}

interface Marquee3DProps {
  items: MarqueeItem[];
  onItemClick: (type: 'equipment' | 'room', item: Equipment | Room) => void;
  isPaused?: boolean;
}

// Create mock data for testing if needed
const createMockData = (): MarqueeItem[] => {
  return [
    {
      id: "mock-1",
      name: "Projector 01",
      type: "equipment",
      location: "Library",
      icon: "📱",
      item: {
        id: "projector01",
        name: "Projector 01",
        type: "Projector",
        location: "Library",
        isAvailable: true
      }
    },
    {
      id: "mock-2",
      name: "LT 01",
      type: "room",
      location: "Floor 1",
      icon: "🏢",
      item: {
        id: "lt01",
        name: "LT 01",
        capacity: 30,
        location: "Floor 1",
        features: ["Projector", "Whiteboard"],
        isAvailable: true
      }
    }
  ];
};

// Extremely simplified resource card with minimal DOM elements
const ResourceCard: React.FC<{
  item: MarqueeItem;
  onClick: () => void;
  isPaused: boolean;
  isSelected: boolean;
  columnIndex: number;
  isVisible: boolean; // Add visibility control for performance
}> = ({ item, onClick, isPaused, isSelected, columnIndex, isVisible }) => {
  // Skip rendering completely if not visible
  if (!isVisible) {
    return null;
  }

  // Determine icon based on type - simplified with fewer conditions
  const icon = 
    item.type === 'room' ? '🏢' : 
    item.name.toLowerCase().includes('camera') ? '📷' :
    item.name.toLowerCase().includes('laptop') ? '💻' :
    '📱';

  // Determine gradient based on item type
  const gradientClass = item.type === 'equipment' 
    ? 'from-blue-400/30 to-green-400/30' 
    : 'from-purple-400/30 to-pink-400/30';

  // Super-simple bare minimum style for better performance
  const styles = {
    container: {
      backgroundColor: 'rgba(30, 20, 60, 0.7)',
      padding: '1rem',
      margin: '1rem 0',
      borderRadius: '0.5rem',
      boxShadow: '0 10px 15px rgba(0, 0, 0, 0.3)',
      cursor: isSelected ? 'default' : 'pointer',
      opacity: isSelected ? 0 : isPaused ? 0.3 : 1,
      transform: `perspective(800px) rotateX(${16 + columnIndex}deg)`,
      border: '1px solid rgba(255, 255, 255, 0.1)',
      // These two properties are critical for performance
      willChange: 'transform',
      transition: 'transform 0.2s ease'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: '0.5rem'
    },
    icon: {
      marginRight: '0.5rem',
      fontSize: '1.25rem'
    },
    title: {
      color: '#ffffff',
      fontSize: '0.9rem',
      fontWeight: 'bold'
    },
    location: {
      color: 'rgba(255, 255, 255, 0.7)',
      fontSize: '0.8rem'
    }
  };

  // Super simplified render with far fewer DOM elements
  return (
    <div 
      style={styles.container}
      onClick={onClick}
      className={`bg-gradient-to-br ${gradientClass}`}
    >
      <div style={styles.header}>
        <span style={styles.icon}>{icon}</span>
        <span style={styles.title}>{item.name}</span>
      </div>
      <div style={styles.location}>{item.location}</div>
      {item.type === 'room' && (item.item as Room).capacity && (
        <div style={styles.location}>{(item.item as Room).capacity} seats</div>
      )}
    </div>
  );
};

// Optimized Static Marquee - removed animation from individual items
const StaticMarquee: React.FC<{
  items: MarqueeItem[];
  onItemClick: (type: 'equipment' | 'room', item: Equipment | Room) => void;
  isPaused: boolean;
  columnIndex: number;
}> = ({ items, onItemClick, isPaused, columnIndex }) => {
  const [scrollPos, setScrollPos] = useState(0);
  const speedRef = useRef(0.02 + (columnIndex % 2 ? 0.01 : 0));
  const directionRef = useRef(columnIndex % 2 === 0 ? 1 : -1);
  
  // Use setInterval instead of requestAnimationFrame to avoid linter issues
  useEffect(() => {
    // Only animate if not paused
    if (isPaused) return;
    
    const intervalId = setInterval(() => {
      setScrollPos(prev => {
        let newPos = prev + speedRef.current * directionRef.current;
        
        // Loop back when reaching the end
        if (newPos > 100) newPos = 0;
        if (newPos < 0) newPos = 100;
        
        return newPos;
      });
    }, 16); // ~60fps
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [isPaused]);
  
  // Calculate which items are visible based on scroll position for optimization
  const visibleItems = useMemo(() => {
    // Create mapping of which items are visible
    return items.map((item, idx) => {
      // Position of this item (0-100)
      const itemPos = (idx * (100 / items.length)) % 100;
      
      // Calculate distance from current scroll position (accounting for wrapping)
      const distance = Math.min(
        Math.abs(itemPos - scrollPos),
        Math.abs(itemPos - (scrollPos + 100)),
        Math.abs((itemPos + 100) - scrollPos)
      );
      
      // Only render items in visible range (about 30% of total)
      return distance < 30;
    });
  }, [items, scrollPos]);

  // Calculate transform based on scroll position
  const wrapperStyle: React.CSSProperties = {
    transform: `translateY(${-scrollPos}%)`,
    height: '500%', // Make it much taller than viewport
    position: 'relative',
    display: 'flex',
    flexDirection: 'column'
  };
  
  // Handle clicks directly now
  const handleCardClick = (item: MarqueeItem) => {
    onItemClick(item.type, item.item);
  };
  
  return (
    <div className="marquee-container" style={{ height: '100%', overflow: 'hidden' }}>
      <div style={wrapperStyle}>
        {items.map((item, idx) => (
          <ResourceCard
            key={`${columnIndex}-${item.id}-${idx}`}
            item={item}
            onClick={() => handleCardClick(item)}
            isPaused={isPaused}
            isSelected={false}
            columnIndex={columnIndex}
            isVisible={visibleItems[idx]} // Only render visible items
          />
        ))}
        {/* Repeat items to create continuous scrolling effect */}
        {items.map((item, idx) => (
          <ResourceCard
            key={`${columnIndex}-${item.id}-${idx}-clone`}
            item={item}
            onClick={() => handleCardClick(item)}
            isPaused={isPaused}
            isSelected={false}
            columnIndex={columnIndex}
            isVisible={visibleItems[idx]} // Only render visible items
          />
        ))}
      </div>
    </div>
  );
};

// Main 3D Marquee component - extremely simplified
export const Marquee3D: React.FC<Marquee3DProps> = ({ 
  items, 
  onItemClick, 
  isPaused = false
}) => {
  // If no items are provided, use mock data for testing
  const displayItems = useMemo(
    () => items && items.length > 0 ? items : createMockData(),
    [items]
  );
  
  // Split items for diversity - only recompute when displayItems changes
  const equipmentItems = useMemo(
    () => displayItems.filter(item => item.type === 'equipment'),
    [displayItems]
  );
  
  const roomItems = useMemo(
    () => displayItems.filter(item => item.type === 'room'),
    [displayItems]
  );
  
  // Ensure we have enough items by repeating them if necessary
  const ensureItems = useCallback((arr: MarqueeItem[], count: number): MarqueeItem[] => {
    if (arr.length >= count) return arr.slice(0, count);
    return [...arr, ...arr, ...arr].slice(0, count);
  }, []);
  
  // Dramatically reduced number of items per column for performance
  const ITEMS_PER_COLUMN = 4; // Far fewer items
  
  // Create 4 columns with fewer items
  const column1 = useMemo(
    () => ensureItems([...equipmentItems].sort(() => 0.5 - Math.random()), ITEMS_PER_COLUMN),
    [equipmentItems, ensureItems]
  );
  
  const column2 = useMemo(
    () => ensureItems([...roomItems].sort(() => 0.5 - Math.random()), ITEMS_PER_COLUMN),
    [roomItems, ensureItems]
  );
  
  const column3 = useMemo(
    () => ensureItems([...equipmentItems.slice(Math.min(4, equipmentItems.length))].sort(() => 0.5 - Math.random()), ITEMS_PER_COLUMN),
    [equipmentItems, ensureItems]
  );
  
  const column4 = useMemo(
    () => ensureItems([...roomItems.slice(Math.min(4, roomItems.length))].sort(() => 0.5 - Math.random()), ITEMS_PER_COLUMN),
    [roomItems, ensureItems]
  );

  // Super simple container styles, minimal DOM nesting
  const containerStyles = {
    perspective: '500px',
    height: '580px',
    position: 'relative' as const,
    width: '100%',
    overflow: 'hidden'
  };
  
  const sceneStyles = {
    transform: 'rotateX(20deg)',
    height: '100%',
    width: '100%',
    position: 'absolute' as const,
    transformStyle: 'preserve-3d' as const,
  };
  
  const columnStyles = {
    display: 'flex',
    justifyContent: 'space-around',
    width: '100%',
    height: '100%',
    position: 'relative' as const
  };

  return (
    <div style={containerStyles}>
      <div style={sceneStyles}>
        <div style={columnStyles}>
          {/* Column 1 - Static marquee with fewer items */}
          <div style={{ width: '22%', height: '100%', transform: 'translateZ(20px)' }}>
            <StaticMarquee 
              items={column1} 
              onItemClick={onItemClick} 
              isPaused={isPaused}
              columnIndex={1}
            />
          </div>
          
          {/* Column 2 */}
          <div style={{ width: '22%', height: '100%', transform: 'translateZ(0px)' }}>
            <StaticMarquee 
              items={column2} 
              onItemClick={onItemClick} 
              isPaused={isPaused}
              columnIndex={2}
            />
          </div>
          
          {/* Column 3 */}
          <div style={{ width: '22%', height: '100%', transform: 'translateZ(-10px)' }}>
            <StaticMarquee 
              items={column3} 
              onItemClick={onItemClick} 
              isPaused={isPaused}
              columnIndex={3}
            />
          </div>
          
          {/* Column 4 */}
          <div style={{ width: '22%', height: '100%', transform: 'translateZ(-20px)' }}>
            <StaticMarquee 
              items={column4} 
              onItemClick={onItemClick} 
              isPaused={isPaused}
              columnIndex={4}
            />
          </div>
        </div>
      </div>
      
      {/* Simple top and bottom gradients */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '80px',
        background: 'linear-gradient(to bottom, rgba(18, 5, 26, 0.9), transparent)',
        pointerEvents: 'none',
        zIndex: 10
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '80px',
        background: 'linear-gradient(to top, rgba(18, 5, 26, 0.9), transparent)',
        pointerEvents: 'none',
        zIndex: 10
      }}></div>
    </div>
  );
};

// Function to get icon based on item type - exported for use in parent component
export const getResourceIcon = (item: MarqueeItem): string => {
  if (item.type === 'equipment') {
    if (item.name.toLowerCase().includes('camera')) return '📷';
    if (item.name.toLowerCase().includes('laptop')) return '💻';
    return '📱';
  } else {
    return '🏢';
  }
};

export default Marquee3D; 