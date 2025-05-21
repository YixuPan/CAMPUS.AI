import React, { useRef, useMemo, useCallback } from 'react';
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
  selectedPosition?: {
    columnIndex: number;
    itemIndex: number;
    rect: DOMRect | null;
  } | null;
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

// Optimize card rendering - use fewer transform operations and simpler styles
const ResourceCard: React.FC<{
  item: MarqueeItem;
  onClick: (rect: DOMRect) => void;
  isPaused: boolean;
  isSelected: boolean;
  columnIndex: number;
}> = ({ item, onClick, isPaused, isSelected, columnIndex }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const lastMoveTime = useRef(0);

  // Handle mouse move events with more aggressive throttling (100ms instead of 50ms)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isSelected) return;
    
    // More aggressive throttling for better performance
    const now = Date.now();
    if (now - lastMoveTime.current < 100) return;
    lastMoveTime.current = now;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    cardRef.current.style.setProperty('--mouse-x', `${x}px`);
    cardRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  // Handle click - pass up the card's position
  const handleClick = () => {
    if (isSelected || !cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    onClick(rect);
  };

  // Determine icon based on type (memoize by caching the result)
  const icon = useMemo(() => {
    if (item.type === 'equipment') {
      if (item.name.toLowerCase().includes('camera')) return '📷';
      if (item.name.toLowerCase().includes('ipad')) return '📱';
      if (item.name.toLowerCase().includes('mixer')) return '🎛️';
      if (item.name.toLowerCase().includes('laptop') || item.name.toLowerCase().includes('macbook')) return '💻';
      if (item.name.toLowerCase().includes('projector')) return '📽️';
      if (item.name.toLowerCase().includes('printer')) return '🖨️';
      if (item.name.toLowerCase().includes('microphone')) return '🎙️';
      if (item.name.toLowerCase().includes('vr')) return '🥽';
      if (item.name.toLowerCase().includes('gaming')) return '🎮';
      if (item.name.toLowerCase().includes('streaming')) return '🎬';
      if (item.name.toLowerCase().includes('drawing') || item.name.toLowerCase().includes('tablet')) return '🖌️';
      return '📱';
    } else {
      return '🏢';
    }
  }, [item.type, item.name]);

  // Determine gradient based on item type
  const gradientClass = item.type === 'equipment' 
    ? 'from-blue-400/30 to-green-400/30' 
    : 'from-purple-400/30 to-pink-400/30';

  // Simplified card style - reduce complexity for better performance
  const cardStyle = {
    backgroundColor: 'rgba(30, 20, 60, 0.7)',
    padding: '1.2rem',
    margin: '1.2rem 0',
    boxShadow: '0 15px 25px rgba(0, 0, 0, 0.5), inset 0 2px 0 rgba(255, 255, 255, 0.2)',
    cursor: isSelected ? 'default' : 'pointer',
    position: 'relative' as const,
    zIndex: isSelected ? 1000 : columnIndex, // Use columnIndex for z-index to maintain depth
    // Vary initial rotation based on columnIndex for more natural look
    transform: `perspective(800px) rotateX(${18 + (columnIndex % 3) * 0.4}deg) rotateY(${(columnIndex % 2) * 0.5}deg)`,
    borderBottom: '8px solid rgba(20, 10, 40, 0.6)',
    borderTop: '1px solid rgba(255, 255, 255, 0.2)',
    opacity: isSelected ? 0 : isPaused ? 0.3 : 1,
    // Use hardware-acceleration but only for essential properties
    willChange: 'transform, opacity',
    // Avoid multiple redraws by grouping transitions
    transition: 'all 300ms ease',
  };

  const frontStyle = {
    // Simplify styles to reduce painting operations
    backfaceVisibility: 'hidden' as const,
    position: 'relative' as const,
    zIndex: 2,
  };
  
  // Use functions with memoization to reduce function creation on renders
  const handleMouseEnter = useCallback(() => {
    if (cardRef.current && !isSelected) {
      // Batch DOM updates into one style operation
      requestAnimationFrame(() => {
        if (cardRef.current) {
          // Use columnIndex to create slight variations in hover effect
          const rotateAngle = 21 + (columnIndex % 3) * 0.5;
          cardRef.current.style.transform = `perspective(800px) rotateX(${rotateAngle}deg) scale(1.05)`;
          cardRef.current.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.6)';
        }
      });
    }
  }, [isSelected, columnIndex]);
  
  const handleMouseLeave = useCallback(() => {
    if (cardRef.current && !isSelected) {
      // Batch DOM updates into one style operation
      requestAnimationFrame(() => {
        if (cardRef.current) {
          // Use columnIndex to create slight variations in rest position
          const restAngle = 18 + (columnIndex % 2) * 0.3;
          cardRef.current.style.transform = `perspective(800px) rotateX(${restAngle}deg)`;
          cardRef.current.style.boxShadow = '0 15px 25px rgba(0, 0, 0, 0.5), inset 0 2px 0 rgba(255, 255, 255, 0.2)';
        }
      });
    }
  }, [isSelected, columnIndex]);

  // Simplified JSX with fewer nested elements and transforms
  return (
    <div 
      ref={cardRef}
      className={`marquee-3d-card relative rounded-xl border border-white/10 bg-gradient-to-br ${gradientClass} shadow-lg`}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      style={cardStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Simplified front of card */}
      <div style={frontStyle}>
        <div className="flex flex-row items-center gap-3 mb-2">
          <div className="rounded-full bg-gradient-to-r w-10 h-10 flex items-center justify-center text-2xl">
            {icon}
          </div>
          <div className="flex flex-col">
            <h3 className="text-base font-medium text-white">{item.name}</h3>
          </div>
        </div>
        
        <p className="mt-2 text-sm text-white/80">{item.location}</p>
        {item.type === 'room' && (item.item as Room).capacity && (
          <p className="text-sm text-white/60 mt-1">• {(item.item as Room).capacity} seats</p>
        )}
      </div>
    </div>
  );
};

// Optimized Vertical marquee component
const VerticalMarquee = ({ children, duration, reverse = false, isPaused = false }: { 
  children: React.ReactNode, 
  duration: string, 
  reverse?: boolean,
  isPaused?: boolean
}) => {
  // Memoize the animation style to prevent recreation on every render
  const animationStyle = useMemo(() => ({
    animation: isPaused 
      ? 'none' 
      : `scrollY ${duration} linear infinite ${reverse ? 'reverse' : ''}`,
    willChange: isPaused ? 'auto' : "transform",
    transition: "all 400ms ease",
  }), [duration, isPaused, reverse]);

  // Memoize the style setup
  const containerStyle = useMemo(() => ({ 
    height: "100%", 
    overflow: "hidden",
  }), []);

  // Simpler optimized structure with static CSS
  return (
    <div className="marquee-vertical" style={containerStyle}>
      <div style={animationStyle}>
        {children}
        {children}
      </div>
      {/* Move styles to static CSS to prevent reflows */}
      <style>{`
        @keyframes scrollY {
          from { transform: translateY(0); }
          to { transform: translateY(-50%); }
        }
        .marquee-vertical > div {
          display: flex;
          flex-direction: column;
          backface-visibility: hidden;
          transform: translateZ(0);
        }
      `}</style>
    </div>
  );
};

// Main 3D Marquee component
export const Marquee3D: React.FC<Marquee3DProps> = ({ 
  items, 
  onItemClick, 
  isPaused = false, 
  selectedPosition = null 
}) => {
  const mainContainerRef = useRef<HTMLDivElement>(null);
  
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
  
  // Mix equipment and room items for visual interest - memoize
  const mixedItems = useMemo(
    () => [...displayItems].sort(() => Math.random() - 0.5),
    [displayItems]
  );
  
  // Ensure we have enough items by repeating them if necessary
  const ensureItems = useCallback((arr: MarqueeItem[], count: number): MarqueeItem[] => {
    if (arr.length >= count) return arr.slice(0, count);
    return [...arr, ...arr, ...arr].slice(0, count);
  }, []);
  
  // Reduced number of items per column for better performance
  const ITEMS_PER_COLUMN = 6; // Reduced from 8 to 6
  
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
    () => ensureItems([...mixedItems].slice(0, 10).sort(() => 0.5 - Math.random()), ITEMS_PER_COLUMN),
    [mixedItems, ensureItems]
  );
  
  const column4 = useMemo(
    () => ensureItems([...mixedItems].slice(10, 20).sort(() => 0.5 - Math.random()), ITEMS_PER_COLUMN),
    [mixedItems, ensureItems]
  );

  // Handle card click - pass position info to parent
  const handleCardClick = useCallback((type: 'equipment' | 'room', item: Equipment | Room) => {
    // Directly call onItemClick with the card's information
    onItemClick(type, item);
  }, [onItemClick]);

  // Memoize styles to prevent recreation on each render
  const containerStyle = useMemo(() => ({
    width: "100%",
  }), []);

  // Reduce the perspective value and height for better performance
  const perspectiveStyle = useMemo(() => ({
    perspective: "500px", // Reduced from 600px
    height: "4000px", // Reduced from 5200px
    width: "100%", 
    maxWidth: "1300px",
    margin: "0 auto",
    position: "relative" as const,
    transformStyle: "preserve-3d" as const,
  }), []);

  const rotatedContainerStyle = useMemo(() => ({
    position: "absolute" as const,
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    transform: "rotateX(40deg) translateY(-160px)", // Less extreme angle
    transformStyle: "preserve-3d" as const,
    transformOrigin: "center center"
  }), []);

  const columnLayoutStyle = useMemo(() => ({
    display: "flex",
    justifyContent: "center",
    gap: "3rem",
    height: "200%",
    width: "100%"
  }), []);

  // Individual column styles - simplified transforms
  const column1Style = useMemo(() => ({ 
    width: "220px", 
    height: "100%", 
    transform: "translateZ(15px)",
    position: "relative" as const
  }), []);

  const column2Style = useMemo(() => ({ 
    width: "220px", 
    height: "100%", 
    transform: "translateZ(5px)",
    position: "relative" as const
  }), []);

  const column3Style = useMemo(() => ({ 
    width: "220px", 
    height: "100%", 
    transform: "translateZ(-5px)",
    position: "relative" as const
  }), []);

  const column4Style = useMemo(() => ({ 
    width: "220px", 
    height: "100%", 
    transform: "translateZ(-15px)",
    position: "relative" as const
  }), []);

  // Slower animations for better performance - even slower for better CPU usage
  const duration1 = "120s"; // Increased from 90s
  const duration2 = "150s"; // Increased from 100s
  const duration3 = "140s"; // Increased from 110s
  const duration4 = "160s"; // Increased from 120s

  // Simpler and more reliable approach to the 3D transform
  return (
    <div className="marquee-3d-section" style={containerStyle} ref={mainContainerRef}>
      <div style={perspectiveStyle}>
        {/* Completely simplified approach to render columns */}
        <div style={rotatedContainerStyle}>
          <div style={columnLayoutStyle}>
            {/* Column 1 */}
            <div className="column" style={column1Style}>
              <VerticalMarquee duration={duration1} isPaused={isPaused}>
                {column1.map((item, idx) => (
                  <ResourceCard 
                    key={`col1-${item.id}-${idx}`} 
                    item={item} 
                    onClick={() => handleCardClick(item.type, item.item)}
                    isPaused={isPaused}
                    isSelected={selectedPosition?.columnIndex === 1 && selectedPosition?.itemIndex === idx}
                    columnIndex={1}
                  />
                ))}
              </VerticalMarquee>
            </div>
            
            {/* Column 2 */}
            <div className="column" style={column2Style}>
              <VerticalMarquee duration={duration2} reverse={true} isPaused={isPaused}>
                {column2.map((item, idx) => (
                  <ResourceCard 
                    key={`col2-${item.id}-${idx}`} 
                    item={item} 
                    onClick={() => handleCardClick(item.type, item.item)}
                    isPaused={isPaused}
                    isSelected={selectedPosition?.columnIndex === 2 && selectedPosition?.itemIndex === idx}
                    columnIndex={2}
                  />
                ))}
              </VerticalMarquee>
            </div>
            
            {/* Column 3 */}
            <div className="column" style={column3Style}>
              <VerticalMarquee duration={duration3} isPaused={isPaused}>
                {column3.map((item, idx) => (
                  <ResourceCard 
                    key={`col3-${item.id}-${idx}`} 
                    item={item} 
                    onClick={() => handleCardClick(item.type, item.item)}
                    isPaused={isPaused}
                    isSelected={selectedPosition?.columnIndex === 3 && selectedPosition?.itemIndex === idx}
                    columnIndex={3}
                  />
                ))}
              </VerticalMarquee>
            </div>
            
            {/* Column 4 */}
            <div className="column" style={column4Style}>
              <VerticalMarquee duration={duration4} reverse={true} isPaused={isPaused}>
                {column4.map((item, idx) => (
                  <ResourceCard 
                    key={`col4-${item.id}-${idx}`} 
                    item={item} 
                    onClick={() => handleCardClick(item.type, item.item)}
                    isPaused={isPaused}
                    isSelected={selectedPosition?.columnIndex === 4 && selectedPosition?.itemIndex === idx}
                    columnIndex={4}
                  />
                ))}
              </VerticalMarquee>
            </div>
          </div>
        </div>
        
        {/* Simplified gradient overlays - fewer elements and simpler styles */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "15%",
          background: "linear-gradient(to bottom, rgba(18, 5, 26, 0.9), transparent)",
          pointerEvents: "none",
          zIndex: 10
        }}></div>
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "25%",
          background: "linear-gradient(to top, rgba(18, 5, 26, 0.9), transparent)",
          pointerEvents: "none",
          zIndex: 10
        }}></div>
      </div>
    </div>
  );
};

// Function to get icon based on item type - exported for use in parent component
export const getResourceIcon = (item: MarqueeItem): string => {
  if (item.type === 'equipment') {
    if (item.name.toLowerCase().includes('camera')) return '📷';
    if (item.name.toLowerCase().includes('ipad')) return '📱';
    if (item.name.toLowerCase().includes('mixer')) return '🎛️';
    if (item.name.toLowerCase().includes('laptop') || item.name.toLowerCase().includes('macbook')) return '💻';
    if (item.name.toLowerCase().includes('projector')) return '📽️';
    if (item.name.toLowerCase().includes('printer')) return '🖨️';
    if (item.name.toLowerCase().includes('microphone')) return '🎙️';
    if (item.name.toLowerCase().includes('vr')) return '🥽';
    if (item.name.toLowerCase().includes('gaming')) return '🎮';
    if (item.name.toLowerCase().includes('streaming')) return '🎬';
    if (item.name.toLowerCase().includes('drawing') || item.name.toLowerCase().includes('tablet')) return '🖌️';
    return '📱';
  } else {
    return '🏢';
  }
};

export default Marquee3D; 