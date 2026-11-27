import React, { useMemo } from 'react';
import { generateQRMatrix } from './qrGenerator';

/**
 * Renders a crisp vector QR Code as an SVG.
 * Guaranteed 100% vector scalability for print & PDF exports.
 */
export default function QRCodeSVG({
  value = '',
  size = 100,
  fgColor = '#0f172a',
  bgColor = '#ffffff',
  margin = 2,
  className = '',
  style = {}
}) {
  const matrix = useMemo(() => {
    if (!value) return [];
    try {
      return generateQRMatrix(value);
    } catch (e) {
      console.error('Failed to generate QR Code:', e);
      return [];
    }
  }, [value]);

  if (!matrix.length) {
    return <div style={{ width: size, height: size, background: '#f1f5f9' }} />;
  }

  const moduleCount = matrix.length;
  const viewBoxSize = moduleCount + margin * 2;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      width={size}
      height={size}
      className={className}
      style={{
        display: 'inline-block',
        shapeRendering: 'crispEdges',
        background: bgColor,
        borderRadius: '4px',
        ...style
      }}
    >
      <rect width={viewBoxSize} height={viewBoxSize} fill={bgColor} />
      {matrix.map((row, r) =>
        row.map((isDark, c) => {
          if (!isDark) return null;
          return (
            <rect
              key={`${r}-${c}`}
              x={c + margin}
              y={r + margin}
              width={1}
              height={1}
              fill={fgColor}
            />
          );
        })
      )}
    </svg>
  );
}
