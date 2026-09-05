import BarcodeLabel from './BarcodeLabel';

const LABELS_PER_PAGE = 48;

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export default function LabelPrintSheet({ labels }) {
  const pages = chunkArray(labels, LABELS_PER_PAGE);

  return (
    <div className="label-print-root">
      {pages.map((pageLabels, pageIndex) => (
        <div key={pageIndex} className="label-sheet">
          {pageLabels.map((product, index) => (
            <div key={`${product.id}-${pageIndex}-${index}`} className="label-cell">
              <BarcodeLabel product={product} forPrint />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
