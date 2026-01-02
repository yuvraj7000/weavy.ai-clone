'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * AI Mode Section Component
 * 
 * Features:
 * - Text and multiple images that transition on scroll
 * - When section is centered, two images slide in from left and right
 * - Scroll-driven animations
 * - Fully responsive design
 */
export default function AIMode() {
  const headerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  // Calculate progress based on header position relative to viewport center
  useEffect(() => {
    const handleScroll = () => {
      if (!headerRef.current) return;

      const rect = headerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportCenter = viewportHeight / 2;
      const headerCenter = rect.top + rect.height / 2;
      
      // Calculate distance from viewport center
      const distance = Math.abs(headerCenter - viewportCenter);
      
      // Calculate progress: 0 when far above, 1 when centered, 0 when far below
      // Use a range around the center (e.g., 400px) for smooth transition
      const range = 400;
      let calculatedProgress = 0;
      
      if (headerCenter < viewportCenter) {
        // Header is above or at center
        calculatedProgress = Math.max(0, Math.min(1, 1 - (distance / range)));
      } else {
        // Header is below center
        calculatedProgress = Math.max(0, Math.min(1, 1 - (distance / range)));
      }
      
      setProgress(calculatedProgress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <section
      className="relative w-full bg-white p-10 pt-0 overflow-hidden h-[800px]"
    >
      <div ref={containerRef} className="container mx-auto px-4 md:px-[5%] max-w-7xl relative z-10">
        {/* Header Section */}
        <div ref={headerRef} className="text-center mb-16 md:mb-24 sticky top-20 z-10">
          <div className="relative">

            <div className="flex items-center justify-center gap-4 md:gap-6 flex-wrap relative z-10">
            <h2 className="text-[clamp(2rem,6vw,4.5rem)] font-light text-gray-800">
              From Workflow
            </h2>
            <div className="relative">
              <div className="w-14 h-7 md:w-16 md:h-8 bg-[#f7ff9e] rounded-full flex items-center pr-1 md:pr-1.5 relative">
                <div 
                  className="w-5 h-5 md:w-6 md:h-6 bg-black rounded-full transition-transform duration-300 absolute"
                  style={{
                    left: '4px',
                    transform: `translateX(${progress * 28}px)`,
                  }}
                ></div>
              </div>
            </div>
            <h2 className="text-[clamp(2rem,6vw,4.5rem)] font-light text-gray-400">
              to App Mode
            </h2>
            </div>
          </div>
        </div>
        <img
          src="https://cdn.prod.website-files.com/681b040781d5b5e278a69989/68262b76a834003529b7f5d7_Group%207798.avif"
          alt="Image 1"
          className='h-[200px] w-[120px] object-cover absolute bottom-[-500px] left-[12px]'
          style={{
            transform: `translateY(${progress * 300}px)`,
            transition: 'transform 0.1s linear',
          }}
        />
        <img
          src="https://cdn.pixabay.com/photo/2023/10/14/16/46/ai-generated-8315326_1280.jpg"
          alt="Image 2"
          className='h-[200px] w-[120px] object-cover absolute bottom-[-400px] left-[430px]'
          style={{
            transform: `translateY(${progress * 300}px)`,
            transition: 'transform 0.1s linear',
          }}
        />
        <img
          src="https://cdn.prod.website-files.com/681b040781d5b5e278a69989/6835ce9cc9475b88f57c57da_VIDEO_hero_mobile.png"
          alt="Image 3"
          className='h-[250px] w-[200px] object-cover absolute bottom-[-300px] left-[200px]'
          style={{
            transform: `translateY(${progress * 300}px)`,
            transition: 'transform 0.1s linear',
          }}
        />
        <img
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR5r0x2OLB1Ndpcwc0f_tqHYLlkTovUUi2Bbw&s"
          alt="Image 4"
          className='h-[250px] w-[200px] object-cover absolute bottom-[-500px] right-[200px]'
          style={{
            transform: `translateY(${progress * 300}px)`,
            transition: 'transform 0.1s linear',
          }}
        />
        <img
          src="https://s1.coincarp.com/logo/1/doge-ai.png?style=200&v=1737617816"
          alt="Image 5"
          className='h-[130px] w-[80px] object-cover absolute bottom-[-200px] right-[430px]'
          style={{
            transform: `translateY(${progress * 300}px)`,
            transition: 'transform 0.1s linear',
          }}
        />
        </div>
    </section>
  );
}

