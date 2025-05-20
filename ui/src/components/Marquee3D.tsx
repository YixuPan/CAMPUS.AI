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

// Single resource card component
const ResourceCard: React.FC<{
  item: MarqueeItem;
  onClick: (rect: DOMRect) => void;
  isPaused: boolean;
  isSelected: boolean;
  columnIndex: number;
}> = ({ item, onClick, isPaused, isSelected, columnIndex }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const lastMoveTime = useRef(0);

  // Handle mouse move events to create the radial gradient effect - with throttling
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || isSelected) return;
    
    // Throttle mouse move events to every 50ms
    const now = Date.now();
    if (now - lastMoveTime.current < 50) return;
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

  // Fixed card style - simpler without animations
  const cardStyle = {
    backgroundColor: 'rgba(30, 20, 60, 0.7)',
    backdropFilter: 'blur(8px)',
    padding: '1.2rem',
    margin: '1.2rem 0',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), inset 0 2px 0 rgba(255, 255, 255, 0.3), inset 0 -12px 20px rgba(0, 0, 0, 0.5)',
    cursor: isSelected ? 'default' : 'pointer',
    position: 'relative' as const,
    zIndex: isSelected ? 1000 : columnIndex * 10 + 1,
    transform: 'perspective(800px) rotateX(18deg)',
    transformStyle: 'preserve-3d' as const,
    transition: 'transform 300ms ease, box-shadow 300ms ease, opacity 300ms ease',
    borderBottom: '15px solid rgba(20, 10, 40, 0.8)',
    borderRight: '8px solid rgba(20, 10, 40, 0.5)',
    borderLeft: '8px solid rgba(70, 50, 120, 0.3)',
    borderTop: '2px solid rgba(255, 255, 255, 0.2)',
    opacity: isSelected ? 0 : isPaused ? 0.3 : 1, // Hide selected card, dim others during pause
  };

  const frontStyle = {
    backfaceVisibility: 'hidden' as const,
    position: 'relative' as const,
    zIndex: 2,
    transform: 'translateZ(1px)',
  };
  
  // Performance optimization: don't create new functions on each render
  const handleMouseEnter = useCallback(() => {
    if (cardRef.current && !isSelected) {
      cardRef.current.style.transform = 'perspective(800px) rotateX(22deg) scale(1.08) translateZ(20px)';
      cardRef.current.style.boxShadow = '0 30px 60px rgba(0, 0, 0, 0.7), inset 0 3px 0 rgba(255, 255, 255, 0.3), inset 0 -15px 25px rgba(0, 0, 0, 0.6)';
    }
  }, [isSelected]);
  
  const handleMouseLeave = useCallback(() => {
    if (cardRef.current && !isSelected) {
      cardRef.current.style.transform = 'perspective(800px) rotateX(18deg)';
      cardRef.current.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.6), inset 0 2px 0 rgba(255, 255, 255, 0.3), inset 0 -12px 20px rgba(0, 0, 0, 0.5)';
    }
  }, [isSelected]);

  return (
    <div 
      ref={cardRef}
      className={`marquee-3d-card relative rounded-xl border border-white/10 bg-gradient-to-br ${gradientClass} shadow-lg backdrop-blur-md`}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      style={cardStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Front of card */}
      <div style={frontStyle}>
        <div 
          className="flex flex-row items-center gap-3 mb-2" 
          style={{ 
            transform: 'translateZ(25px)',
            position: 'relative',
            zIndex: 2
          }}
        >
          <div className="rounded-full bg-gradient-to-r w-10 h-10 flex items-center justify-center text-2xl" style={{
            transform: 'translateZ(15px)',
            boxShadow: '0 8px 15px rgba(0, 0, 0, 0.4)'
          }}>
            {icon}
          </div>
          <div className="flex flex-col" style={{ transform: 'translateZ(15px)' }}>
            <h3 className="text-base font-medium text-white">{item.name}</h3>
          </div>
        </div>
        
        <p className="mt-2 text-sm text-white/80" style={{ transform: 'translateZ(20px)', position: 'relative', zIndex: 2 }}>{item.location}</p>
        {item.type === 'room' && (item.item as Room).capacity && (
          <p className="text-sm text-white/60 mt-1" style={{ transform: 'translateZ(20px)', position: 'relative', zIndex: 2 }}>• {(item.item as Room).capacity} seats</p>
        )}
      </div>

      {/* 3D sides */}
      <div style={{
        position: 'absolute',
        bottom: '-15px',
        left: '0',
        right: '0',
        height: '15px',
        backgroundColor: 'rgba(10, 5, 20, 0.8)',
        transform: 'translateY(100%) rotateX(-90deg)',
        transformOrigin: 'top',
        borderBottomLeftRadius: '4px',
        borderBottomRightRadius: '4px',
      }}></div>
      
      <div style={{
        position: 'absolute',
        top: '0',
        bottom: '0',
        right: '-8px',
        width: '8px',
        backgroundColor: 'rgba(15, 8, 30, 0.7)',
        transform: 'translateX(100%) rotateY(90deg)',
        transformOrigin: 'left',
      }}></div>
      
      <div style={{
        position: 'absolute',
        top: '0',
        bottom: '0',
        left: '-8px',
        width: '8px',
        backgroundColor: 'rgba(50, 30, 90, 0.5)',
        transform: 'translateX(-100%) rotateY(-90deg)',
        transformOrigin: 'right',
      }}></div>
      
      <div style={{
        position: 'absolute',
        top: '-2px',
        left: '8px',
        right: '8px',
        height: '2px',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        transform: 'translateY(-100%) rotateX(90deg)',
        transformOrigin: 'bottom',
      }}></div>

      <div style={{
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        boxShadow: 'inset 0 5px 15px rgba(0, 0, 0, 0.5)',
        borderRadius: '0.75rem',
        pointerEvents: 'none'
      }}></div>
    </div>
  );
};

// Vertical marquee component with optimized animations
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
    willChange: "contents" 
  }), []);

  // Use a static style tag instead of creating it on every render
  return (
    <div className="marquee-vertical" style={containerStyle}>
      <div style={animationStyle}>
        {children}
        {children}
      </div>
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
  
  // Create 4 columns with good distribution of items
  const column1 = useMemo(
    () => ensureItems([...equipmentItems].sort(() => 0.5 - Math.random()), 8),
    [equipmentItems, ensureItems]
  );
  
  const column2 = useMemo(
    () => ensureItems([...roomItems].sort(() => 0.5 - Math.random()), 8),
    [roomItems, ensureItems]
  );
  
  const column3 = useMemo(
    () => ensureItems([...mixedItems].slice(0, 10).sort(() => 0.5 - Math.random()), 8),
    [mixedItems, ensureItems]
  );
  
  const column4 = useMemo(
    () => ensureItems([...mixedItems].slice(10, 20).sort(() => 0.5 - Math.random()), 8),
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

  const perspectiveStyle = useMemo(() => ({
    perspective: "600px",
    height: "5200px",
    width: "100%", 
    maxWidth: "1300px",
    margin: "0 auto",
    position: "relative" as const,
    transformStyle: "preserve-3d" as const,
    willChange: isPaused ? "transform" : "auto",
  }), [isPaused]);

  const rotatedContainerStyle = useMemo(() => ({
    position: "absolute" as const,
    top: "0",
    left: "0",
    right: "0",
    bottom: "0",
    transform: "rotateX(42deg) translateY(-180px)",
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

  // Individual column styles
  const column1Style = useMemo(() => ({ 
    width: "220px", 
    height: "100%", 
    transform: "translateZ(20px)",
    position: "relative" as const
  }), []);

  const column2Style = useMemo(() => ({ 
    width: "220px", 
    height: "100%", 
    transform: "translateZ(10px)",
    position: "relative" as const
  }), []);

  const column3Style = useMemo(() => ({ 
    width: "220px", 
    height: "100%", 
    transform: "translateZ(0px)",
    position: "relative" as const
  }), []);

  const column4Style = useMemo(() => ({ 
    width: "220px", 
    height: "100%", 
    transform: "translateZ(-10px)",
    position: "relative" as const
  }), []);

  // Slower animations for better performance
  const duration1 = "90s";
  const duration2 = "100s";
  const duration3 = "110s";
  const duration4 = "120s";

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
        
        {/* Gradient overlays */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "15%",
          background: "linear-gradient(to bottom, rgba(18, 5, 26, 0.9), transparent)",
          pointerEvents: "none",
          zIndex: isPaused ? 5 : 10
        }}></div>
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "25%",
          background: "linear-gradient(to top, rgba(18, 5, 26, 0.9), transparent)",
          pointerEvents: "none",
          zIndex: isPaused ? 5 : 10
        }}></div>
        <div style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: "10%",
          background: "linear-gradient(to right, rgba(18, 5, 26, 0.9), transparent)",
          pointerEvents: "none",
          zIndex: isPaused ? 5 : 10
        }}></div>
        <div style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          right: 0,
          width: "10%",
          background: "linear-gradient(to left, rgba(18, 5, 26, 0.9), transparent)",
          pointerEvents: "none",
          zIndex: isPaused ? 5 : 10
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