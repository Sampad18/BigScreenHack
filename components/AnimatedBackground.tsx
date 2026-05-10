"use client";

export function AnimatedBackground() {
  return (
    <div className="animated-bg">
      {/* Gradient orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      
      {/* Grid pattern */}
      <div className="grid-pattern" />
      
      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="particle"
          style={{
            left: `${Math.random() * 100}%`,
            animationDuration: `${15 + Math.random() * 20}s`,
            animationDelay: `${-Math.random() * 20}s`,
          }}
        />
      ))}
    </div>
  );
}
