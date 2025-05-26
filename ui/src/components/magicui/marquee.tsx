import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import "./marquee.css";

// Type for CSS Variables
interface CSSPropertiesWithVars extends CSSProperties {
  '--duration'?: string;
  '--gap'?: string;
}

interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  /**
   * Optional CSS class name to apply custom styles
   */
  className?: string;
  /**
   * Whether to reverse the animation direction
   * @default false
   */
  reverse?: boolean;
  /**
   * Whether to pause the animation on hover
   * @default false
   */
  pauseOnHover?: boolean;
  /**
   * Content to be displayed in the marquee
   */
  children: React.ReactNode;
  /**
   * Whether to animate vertically instead of horizontally
   * @default false
   */
  vertical?: boolean;
  /**
   * Style properties including CSS variables
   */
  style?: CSSPropertiesWithVars;
}

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = false,
  children,
  vertical = false,
  style,
  ...props
}: MarqueeProps) {
  // Create duplicate content for continuous scrolling
  const content = [children, children];
  
  // Create class name for content
  const contentClassName = `
    ${vertical ? 'marquee-content--vertical' : 'marquee-content--horizontal'}
    ${reverse ? 'marquee-content--reverse' : ''}
    ${pauseOnHover ? 'marquee-content--pausable' : ''}
  `.trim();
  
  // Merge styles with defaults
  const mergedStyles: CSSPropertiesWithVars = {
    "--duration": "40s",
    "--gap": "1rem",
    ...style
  };
  
  return (
    <div
      {...props}
      className={`marquee-container ${className || ''}`}
      style={mergedStyles}
    >
      {content.map((item, i) => (
        <div key={i} className={contentClassName}>
          {item}
        </div>
      ))}
    </div>
  );
} 