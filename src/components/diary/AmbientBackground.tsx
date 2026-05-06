export function AmbientBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
      <div
        className="ambient-blob"
        style={{
          width: 520,
          height: 520,
          top: -120,
          left: -120,
          background: 'hsl(var(--diary-glow) / 0.45)',
        }}
      />
      <div
        className="ambient-blob"
        style={{
          width: 420,
          height: 420,
          bottom: -100,
          right: -80,
          background: 'hsl(var(--diary-accent) / 0.35)',
          animationDelay: '4s',
        }}
      />
      <div
        className="ambient-blob"
        style={{
          width: 360,
          height: 360,
          top: '40%',
          left: '55%',
          background: 'hsl(var(--mood-calm) / 0.25)',
          animationDelay: '8s',
        }}
      />
    </div>
  );
}
