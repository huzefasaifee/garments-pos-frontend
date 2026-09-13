import { useEffect, useState } from 'react';
import { ImagePlus, Trash2 } from 'lucide-react';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ProductImagePicker({ file, existingUrl, removed = false, onChange, onRemove }) {
  const [previewUrl, setPreviewUrl] = useState(existingUrl || '');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) {
      setPreviewUrl(removed ? '' : existingUrl || '');
      return undefined;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [existingUrl, file, removed]);

  const handleChange = (event) => {
    const selectedFile = event.target.files?.[0];
    event.target.value = '';
    if (!selectedFile) return;

    if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (selectedFile.size > MAX_IMAGE_BYTES) {
      setError('Images must be 5 MB or smaller.');
      return;
    }

    setError('');
    onChange(selectedFile);
  };

  return (
    <div className="rounded-lg border border-dashed border-gray-300 p-3">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gray-100 text-gray-400">
          {previewUrl ? (
            <img src={previewUrl} alt="Product preview" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus size={24} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-700">Product photo</p>
          <p className="mt-1 text-xs text-gray-500">JPG, PNG, or WebP up to 5 MB</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white hover:bg-blue-600">
              {previewUrl ? 'Replace photo' : 'Choose photo'}
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleChange} className="sr-only" />
            </label>
            {previewUrl && (
              <button type="button" onClick={() => { setError(''); onRemove(); }} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">
                <Trash2 size={15} />
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}
