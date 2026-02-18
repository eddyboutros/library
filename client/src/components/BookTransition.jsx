import { useEffect, useState } from 'react';
import { BookMarked } from 'lucide-react';

export default function BookTransition({ onComplete, userName }) {
  const [phase, setPhase] = useState('enter'); // enter → cover → glow → open → fade

  useEffect(() => {
    const t0 = setTimeout(() => setPhase('cover'), 50);
    const t1 = setTimeout(() => setPhase('glow'), 900);
    const t2 = setTimeout(() => setPhase('open'), 1600);
    const t3 = setTimeout(() => { setPhase('fade'); onComplete(); }, 2900);
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onComplete]);

  return (
    <div className={`book-transition fixed inset-0 z-[100] flex items-center justify-center ${phase === 'enter' ? 'bt-enter' : ''} ${phase === 'fade' ? 'bt-fade-out' : ''}`}>
      {/* Darkened backdrop */}
      <div className="absolute inset-0 bg-black/80" />

      {/* Floating particles */}
      <div className={`bt-particles ${phase === 'open' || phase === 'fade' ? 'bt-particles-active' : ''}`}>
        {Array.from({ length: 20 }, (_, i) => (
          <div key={i} className="bt-particle" style={{
            '--x': `${Math.random() * 100 - 50}vw`,
            '--y': `${Math.random() * -60 - 20}vh`,
            '--d': `${0.6 + Math.random() * 1.4}s`,
            '--s': `${2 + Math.random() * 4}px`,
            left: `${48 + Math.random() * 4}%`,
            top: `${48 + Math.random() * 4}%`,
          }} />
        ))}
      </div>

      {/* Book container */}
      <div className="bt-book relative" style={{ perspective: '1800px' }}>
        {/* Spine glow — fades when book opens */}
        <div className={`bt-spine ${phase === 'glow' ? 'bt-spine-active' : ''} ${phase === 'open' || phase === 'fade' ? 'bt-spine-hide' : ''}`} />

        {/* Left cover */}
        <div className={`bt-cover bt-cover-left ${phase === 'open' || phase === 'fade' ? 'bt-cover-open-left' : ''}`}>
          <div className="bt-cover-inner bt-cover-front">
            <div className="bt-cover-texture" />
            <div className="bt-cover-content">
              <div className="bt-logo">
                <BookMarked className="w-10 h-10 text-amber-400/90" strokeWidth={1.5} />
              </div>
              <div className="bt-title">Athena</div>
              <div className="bt-subtitle">Library</div>
              <div className="bt-ornament">✦ ✦ ✦</div>
            </div>
            <div className="bt-cover-edge" />
          </div>
          <div className="bt-cover-inner bt-cover-back">
            <div className="bt-page-texture" />
          </div>
        </div>

        {/* Right cover */}
        <div className={`bt-cover bt-cover-right ${phase === 'open' || phase === 'fade' ? 'bt-cover-open-right' : ''}`}>
          <div className="bt-cover-inner bt-cover-front-right">
            <div className="bt-cover-texture" />
            <div className="bt-cover-content">
              <div className="bt-ornament-right">✦</div>
            </div>
            <div className="bt-cover-edge-right" />
          </div>
          <div className="bt-cover-inner bt-cover-back">
            <div className="bt-page-texture" />
          </div>
        </div>

        {/* Inner pages (visible when open) */}
        <div className={`bt-pages ${phase === 'open' || phase === 'fade' ? 'bt-pages-visible' : ''}`}>
          <div className="bt-page-content">
            <p className="bt-welcome-text">Welcome{userName ? `, ${userName}` : ''}</p>
            <div className="bt-page-line" style={{ width: '70%', animationDelay: '0.2s' }} />
            <div className="bt-page-line" style={{ width: '50%', animationDelay: '0.4s' }} />
            <div className="bt-page-line" style={{ width: '60%', animationDelay: '0.6s' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
