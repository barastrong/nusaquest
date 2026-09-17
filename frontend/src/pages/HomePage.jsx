import { useEffect } from 'react';
import Hero from '../components/Hero';
import Marquee from '../components/Marquee';
import CultureGrid from '../components/CultureGrid';
import Features from '../components/Features';
import Quote from '../components/Quote';
import CTA from '../components/CTA';

export default function HomePage() {
  useEffect(() => {
    const reveals = document.querySelectorAll('.reveal');
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.12 });
    reveals.forEach(r => obs.observe(r));
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <section id="home" style={{ scrollMarginTop: '80px' }}>
        <Hero />
      </section>

      <Marquee />

      <section id="culture" style={{ scrollMarginTop: '80px' }}>
        <CultureGrid />
      </section>

      <section id="features" style={{ scrollMarginTop: '80px' }}>
        <Features />
      </section>

      <Quote />
      <CTA />
    </>
  );
}