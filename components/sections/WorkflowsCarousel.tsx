'use client';

import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useHorizontalScroll } from './hooks';
import { WORKFLOW_CARDS } from './data';
import type { NavigationButtonProps, WorkflowCard } from './types';

/**
 * Workflows Carousel Component
 * 
 * A horizontal carousel showcasing workflow examples.
 * Features:
 * - Smooth horizontal scrolling with arrow navigation
 * - Infinite scroll loop
 * - Responsive card sizes
 * - "Try" buttons for each workflow
 */
export default function WorkflowsCarousel() {
  const { scrollRef, canScrollLeft, canScrollRight, scrollLeft, scrollRight } =
    useHorizontalScroll({ scrollAmount: 400 });
  const isScrollingRef = useRef(false);

  // Create duplicated cards for infinite scroll
  const duplicatedCards = [...WORKFLOW_CARDS, ...WORKFLOW_CARDS, ...WORKFLOW_CARDS];

  // Infinite scroll logic
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const getCardWidth = () => {
      // Get the first card element to measure actual width
      const firstCard = container.querySelector('.workflow-card');
      if (firstCard) {
        return firstCard.getBoundingClientRect().width + 18; // card width + gap
      }
      // Fallback to responsive widths
      if (window.innerWidth >= 1024) return 420 + 18; // lg
      if (window.innerWidth >= 768) return 400 + 18; // md
      return 320 + 18; // base
    };

    const handleScroll = () => {
      if (isScrollingRef.current) return;

      const { scrollLeft, clientWidth } = container;
      const cardWidth = getCardWidth();
      const singleSetWidth = WORKFLOW_CARDS.length * cardWidth;
      const middleSetStart = singleSetWidth;

      // If we've scrolled past the end of middle set (into third set), reset to middle set
      if (scrollLeft >= singleSetWidth * 2 - clientWidth) {
        isScrollingRef.current = true;
        const offset = scrollLeft - singleSetWidth * 2;
        container.scrollLeft = middleSetStart + offset;
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 50);
      }
      // If we've scrolled before the start of middle set (into first set), reset to middle set
      else if (scrollLeft < singleSetWidth) {
        isScrollingRef.current = true;
        const offset = scrollLeft;
        container.scrollLeft = middleSetStart + offset;
        setTimeout(() => {
          isScrollingRef.current = false;
        }, 50);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    // Initialize scroll position to middle set after a short delay to ensure cards are rendered
    const initializeScroll = () => {
      const cardWidth = getCardWidth();
      const singleSetWidth = WORKFLOW_CARDS.length * cardWidth;
      container.scrollLeft = singleSetWidth;
    };

    // Wait for cards to render
    setTimeout(initializeScroll, 100);

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [scrollRef]);

  return (
    <section className="hidden md:block bg-[#252525] text-white py-[110px] md:py-[130px] overflow-hidden">
      <div className="container px-[5%] max-w-[1440px] mx-auto">
        {/* Header Row */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-[48px]">
          <div className="max-w-[500px]">
            <h2 className="text-[6rem] font-medium leading-[1.05] tracking-[-0.03em] mb-[25px]">
              Explore Our<br />Workflows
            </h2>
            <p className="text-white text-[15px] md:text-[16px] tracking-wider">
              From multi-layer compositing to matte manipulation, Weavy keeps up
              with your creativity with all the editing tools you recognize and
              rely on.
            </p>
          </div>
        </div>
      </div>

      {/* Workflow Cards Slider */}
      <div className="relative w-full pt-[40px]">
        <div
          ref={scrollRef}
          className="flex gap-[18px] overflow-x-auto scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {duplicatedCards.map((workflow, index) => (
            <WorkflowCardComponent key={`${workflow.id}-${index}`} workflow={workflow} />
          ))}
        </div>
      </div>

      {/* Navigation Controls - Mobile */}
      <div className="container px-[5%] max-w-[1440px] mx-auto">
        <div className="flex md:hidden gap-[12px] mt-[32px] justify-center">
          <NavigationButton
            direction="left"
            onClick={() => scrollLeft()}
            disabled={!canScrollLeft}
            size="small"
          />
          <NavigationButton
            direction="right"
            onClick={() => scrollRight()}
            disabled={!canScrollRight}
            size="small"
          />
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}

/**
 * Navigation button component for the slider
 */
const NavigationButton = ({
  direction,
  onClick,
  disabled,
  size = 'normal',
}: NavigationButtonProps) => {
  const Icon = direction === 'left' ? ArrowLeft : ArrowRight;
  const dimensions = size === 'normal' ? 'w-[48px] h-[48px]' : 'w-[44px] h-[44px]';
  const iconSize = size === 'normal' ? 18 : 16;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${dimensions} rounded-full border flex items-center justify-center transition-all duration-300 ${
        disabled
          ? 'border-white/10 text-white/20 cursor-not-allowed'
          : 'border-white/20 text-white hover:bg-white hover:text-black'
      }`}
    >
      <Icon size={iconSize} strokeWidth={2} />
    </button>
  );
};

/**
 * Individual workflow card component
 */
interface WorkflowCardComponentProps {
  workflow: WorkflowCard;
}

const WorkflowCardComponent = ({ workflow }: WorkflowCardComponentProps) => {
  return (
    <div className="workflow-card flex-shrink-0 w-[320px] md:w-[400px] lg:w-[420px] group/card">
      {/* Title */}
      <div className="mb-[12px]">
        <p className="text-[1.5rem] font-semibold text-white pb-2">
          {workflow.title}
        </p>
      </div>

      {/* Card */}
      <div className="relative aspect-[5/3] rounded-[16px] overflow-hidden bg-[#1f1f1f] border border-white/5 transition-all duration-300 group-hover/card:border-white/15">
        <img
          src={workflow.image}
          alt={workflow.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-[1.03]"
          loading="lazy"
          decoding="async"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

        {/* "Try" Button */}
        <div className="absolute bottom-0 left-0">
          <button className="bg-[#f7ff9e] text-black px-[30px] py-[6px] rounded-tr-[16px] text-[16px] font-medium transition-all hover:bg-[#eaff6e] active:scale-95 shadow-lg">
            Try
          </button>
        </div>
      </div>
    </div>
  );
};
