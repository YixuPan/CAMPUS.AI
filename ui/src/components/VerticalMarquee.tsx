import React, { ReactNode, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface VerticalMarqueeProps {
  children: ReactNode;
  className?: string;
  speed?: number;
  pauseOnHover?: boolean;
  direction?: 'up' | 'down';
  repeat?: number;
}

export const VerticalMarquee: React.FC<VerticalMarqueeProps> = ({
  children,
  className = '',
  speed = 25,
  pauseOnHover = true,
  direction = 'up',
  repeat = 2
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = React.useState(0);
  const [shouldAnimate, setShouldAnimate] = React.useState(true);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(contentRef.current.offsetHeight);
    }
  }, [children]);

  const duration = React.useMemo(() => {
    return contentHeight / speed;
  }, [contentHeight, speed]);

  const repeatedContent = React.useMemo(() => {
    return Array(repeat)
      .fill(0)
      .map((_, i) => (
        <div key={i} className="marquee-content">
          {children}
        </div>
      ));
  }, [children, repeat]);

  return (
    <div
      ref={containerRef}
      className={`vertical-marquee-container overflow-hidden relative ${className}`}
      onMouseEnter={() => pauseOnHover && setShouldAnimate(false)}
      onMouseLeave={() => setShouldAnimate(true)}
    >
      <motion.div
        ref={contentRef}
        className="vertical-marquee"
        animate={shouldAnimate ? {
          y: direction === 'up' ? [0, -contentHeight] : [-contentHeight, 0]
        } : { y: 0 }}
        transition={{
          duration: duration,
          ease: 'linear',
          repeat: Infinity,
          repeatType: 'loop',
          repeatDelay: 0
        }}
      >
        {repeatedContent}
      </motion.div>
    </div>
  );
};

export default VerticalMarquee; 