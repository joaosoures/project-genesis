// Top + bottom progressive blur layers (purely decorative, fixed).
export default function BlurEdges() {
  return (
    <>
      <div className="pointer-events-none fixed top-0 -left-12 -right-12 h-20 z-30 blur-edge-top" />
      <div className="pointer-events-none fixed bottom-0 -left-12 -right-12 h-24 z-30 blur-edge-bottom" />
    </>
  );
}
