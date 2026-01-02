import ModelsShowcase from '@/components/sections/ModelsShowcase';
import ParallaxShowcase from '@/components/sections/ParallaxShowcase';
import AIMode from '@/components/sections/AIMode';
import Footer from '@/components/sections/Footer';
import HeroSection from '@/components/sections/HeroSection';
import Header from '@/components/sections/Header';
import ToolsGallery from '@/components/sections/ToolsGallery';
import WorkflowsCarousel from '@/components/sections/WorkflowsCarousel';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Header />
      <HeroSection />
      <ModelsShowcase />
      <ToolsGallery />
      <ParallaxShowcase />
      <AIMode />
      <WorkflowsCarousel />
      <Footer />
    </main>
  );
}
