'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { BsInstagram, BsLinkedin, BsTwitter, BsDiscord, BsYoutube } from 'react-icons/bs';
import { GoPlus } from 'react-icons/go';
import { FOOTER_NAV, SOCIALS, FOOTER_IMAGES } from './data';
import type { SocialLink } from './types';

const SocialIcons: Record<SocialLink['icon'], React.ComponentType> = {
  linkedin: BsLinkedin,
  instagram: BsInstagram,
  twitter: BsTwitter,
  discord: BsDiscord,
  youtube: BsYoutube,
};

// Main site footer with navigation and social links
const Footer = () => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const footer = sectionRef.current;
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        window.dispatchEvent(
          new CustomEvent('footer-visibility', {
            detail: { isVisible: entry.isIntersecting },
          })
        );
      },
      { threshold: 0.1 }
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <footer ref={sectionRef} className="relative bg-[#252525] overflow-hidden">
      <div className="relative bg-[#A8B1A5] max-w-[1440px] rounded-tr-[40px] md:rounded-tr-[60px] mt-8 md:mt-24 mr-0 md:mr-16 pt-12 md:pt-24 pb-8 md:pb-12 px-4 md:px-[5%]">
        <div className="max-w-[1440px] mx-auto relative z-10">
          <HeroStatement />

          <div className="flex items-center justify-between mb-8 md:hidden">
            <img
              src={FOOTER_IMAGES.logo}
              alt="Weavy Artistic Intelligence"
              className="h-[32px] w-auto"
              decoding="async"
            />
            <Link
              href="/workflow"
              className="bg-[#f7ff9e] text-black py-2.5 px-7 rounded-md text-[14px] font-normal tracking-tight transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-95"
              style={{ fontFamily: "'Impact', 'Arial Black', sans-serif" }}
            >
              START NOW
            </Link>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 mb-10 md:mb-14">
            <div className="flex flex-col md:flex-row md:max-w-[80%] gap-4 md:gap-10">
              <img
                src={FOOTER_IMAGES.logo}
                alt="Weavy Artistic Intelligence"
                className="h-[40px] w-auto mb-2 md:mb-6 hidden md:block"
                decoding="async"
              />
              <p 
                className="text-white text-[13px] leading-[1.7] md:leading-[1.6] font-light"
                style={{ fontFamily: "'Helvetica Neue', 'Arial', sans-serif" }}
              >
                <span className="text-white font-normal">Weavy</span> is a new way to create. We&apos;re bridging the gap between AI capabilities and human creativity, to continue the tradition of craft in artistic expression. We call it Artistic Intelligence.
              </p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row justify-start gap-10 mb-10 md:mb-14">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              {FOOTER_NAV.map((column) => (
                <div key={column.title} className="flex flex-col">
                  <span 
                    className="text-white/80 text-[11px] uppercase tracking-[0.1em] mb-4 font-normal"
                    style={{ fontFamily: "'Courier New', 'Monaco', monospace" }}
                  >
                    {column.title}
                  </span>
                  <div className="flex flex-col gap-2.5">
                    {column.links.map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        className="text-white text-[12px] font-normal uppercase tracking-[0.02em] hover:opacity-60 hover:translate-x-0.5 transition-all duration-200"
                        style={{ fontFamily: "'Roboto', 'Arial', sans-serif" }}
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:flex gap-6 items-start pt-1">
              {SOCIALS.map((social) => {
                const Icon = SocialIcons[social.icon];
                return (
                  <a
                    key={social.platform}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-white hover:opacity-60 hover:scale-110 transition-all duration-200 text-lg"
                  >
                    <Icon />
                  </a>
                );
              })}
            </div>
          </div>

          <div className="flex md:hidden gap-6 items-center mb-8">
            {SOCIALS.map((social) => {
              const Icon = SocialIcons[social.icon];
              return (
                <a
                  key={social.platform}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:opacity-60 hover:scale-110 transition-all duration-200 text-xl"
                >
                  <Icon />
                </a>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mb-6 md:mb-4">
            <img
              src={FOOTER_IMAGES.soc2Badge}
              alt="SOC2"
              className="w-[45px] md:w-[50px] h-[45px] md:h-[50px] object-contain"
              loading="lazy"
              decoding="async"
            />
            <div>
              <p 
                className="text-[#1A1A1A] font-normal text-[11px] md:text-[12px] mb-0.5"
                style={{ fontFamily: "'Helvetica Neue', 'Arial', sans-serif" }}
              >
                SOC 2 Type <span className="text-black font-medium">II</span> Certified
              </p>
              <p 
                className="text-[#1A1A1A]/70 text-[10px] md:text-[11px] font-light leading-relaxed"
                style={{ fontFamily: "'Helvetica Neue', 'Arial', sans-serif" }}
              >
                Your data is protected with industry-standard security controls.
              </p>
            </div>
          </div>

          <div className="font-mono text-[10px] text-[#1A1A1A]/80 uppercase tracking-[0.1em] flex flex-wrap gap-4 font-light">
            <span>WEAVY © 2025.</span>
            <span>ALL RIGHTS RESERVED.</span>
          </div>
        </div>
      </div>

      <Link
        href="/workflow"
        className="hidden md:flex bg-[#f7ff9e] text-black absolute bottom-0 right-0 pb-10 pt-2 px-8 ml-16 pr-10 items-center justify-center rounded-tl-[40px] transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-95 z-20"
      >
        <span 
          className="text-[40px] md:text-[80px] font-light leading-none tracking-tight"
          style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
        >
          Start Now
        </span>
      </Link>
    </footer>
  );
};

const HeroStatement = () => (
  <div className="flex flex-col items-start gap-2 md:gap-0 md:flex-row md:items-center mb-12 md:mb-32">
    <h2 
      className="text-white text-[clamp(3rem,12vw,6.5rem)] font-light leading-[0.95] tracking-[-0.03em]"
      style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
    >
      Artificial<br />Intelligence
    </h2>
    <span className="flex items-center justify-center text-white py-2 md:py-0 md:px-8">
      <GoPlus
        size={60}
        className="md:w-[100px] md:h-[100px]"
      />
    </span>
    <h2 
      className="text-white text-[clamp(3rem,12vw,6.5rem)] font-light leading-[0.95] tracking-[-0.03em]"
      style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}
    >
      Human<br />Creativity
    </h2>
  </div>
);

export default Footer;

