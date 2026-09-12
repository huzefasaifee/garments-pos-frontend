import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export default function BarcodeLabel({ product, forPrint = false }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && product?.barcode) {
      try {
        JsBarcode(svgRef.current, product.barcode, {
          format: 'CODE128',
          displayValue: false,
          height: forPrint ? 16 : 24,
          width: forPrint ? 1.0 : 1.2,
          margin: 0,
        });
      } catch (err) {
        console.error('Barcode generation failed:', err);
      }
    }
  }, [product?.barcode, forPrint]);

  return (
    <div className={`barcode-label ${forPrint ? 'barcode-label--print' : 'barcode-label--preview'}`}>
      <div className="barcode-label__name">{product.name}</div>
      <div className="barcode-label__meta">
        <span className="barcode-label__size">{product.size}</span>
        <span className="barcode-label__price">₹{product.price}</span>
      </div>
      <svg ref={svgRef} className="barcode-label__svg" />
      <div className="barcode-label__code">{product.barcode}</div>
    </div>
  );
}
