import { useState } from "react";
import { Upload, X, Image, Link } from "lucide-react";

function ImageUpload({ onImageUpload, currentImage = "" }) {
  const [imageUrl, setImageUrl] = useState(currentImage);
  const [uploading, setUploading] = useState(false);
  const [uploadMethod, setUploadMethod] = useState('upload'); // 'upload' or 'url'
  const [manualUrl, setManualUrl] = useState('');

  const uploadImage = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("http://localhost:8090/api/images/upload", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const url = await response.text();
      setImageUrl(url);
      onImageUpload(url);
    } catch (error) {
      alert('Image upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleManualUrl = () => {
    if (manualUrl.trim()) {
      setImageUrl(manualUrl.trim());
      onImageUpload(manualUrl.trim());
      setManualUrl('');
    }
  };

  const removeImage = () => {
    setImageUrl("");
    onImageUpload("");
    setManualUrl('');
  };

  return (
    <div className="image-upload-container">
      <label className="form-label">Product Image</label>
      
      {/* Method Selection */}
      <div className="upload-method-tabs">
        <button
          type="button"
          className={`method-tab ${uploadMethod === 'upload' ? 'active' : ''}`}
          onClick={() => setUploadMethod('upload')}
        >
          <Upload size={16} />
          Upload Image
        </button>
        <button
          type="button"
          className={`method-tab ${uploadMethod === 'url' ? 'active' : ''}`}
          onClick={() => setUploadMethod('url')}
        >
          <Link size={16} />
          Image URL
        </button>
      </div>

      {/* Upload Method */}
      {uploadMethod === 'upload' && !imageUrl && (
        <div className="upload-area">
          <input
            type="file"
            accept="image/*"
            onChange={uploadImage}
            disabled={uploading}
            className="file-input"
            id="image-upload"
          />
          <label htmlFor="image-upload" className="upload-label">
            <div className="upload-content">
              {uploading ? (
                <div className="uploading">
                  <div className="spinner"></div>
                  <span>Uploading to Cloudinary...</span>
                </div>
              ) : (
                <>
                  <Upload size={32} />
                  <span>Click to upload image</span>
                  <small>PNG, JPG up to 10MB</small>
                </>
              )}
            </div>
          </label>
        </div>
      )}

      {/* URL Method */}
      {uploadMethod === 'url' && !imageUrl && (
        <div className="url-input-area">
          <div className="url-input-group">
            <input
              type="url"
              placeholder="Enter image URL (https://example.com/image.jpg)"
              value={manualUrl}
              onChange={(e) => setManualUrl(e.target.value)}
              className="url-input"
            />
            <button
              type="button"
              onClick={handleManualUrl}
              disabled={!manualUrl.trim()}
              className="url-submit-btn"
            >
              Add Image
            </button>
          </div>
        </div>
      )}

      {/* Image Preview */}
      {imageUrl && (
        <div className="image-preview">
          <img src={imageUrl} alt="Product" className="preview-image" />
          <button
            type="button"
            onClick={removeImage}
            className="remove-image-btn"
          >
            <X size={16} />
          </button>
          <div className="image-info">
            <small>✅ Image ready for product</small>
          </div>
        </div>
      )}

      {/* Image URL Display */}
      {imageUrl && (
        <div className="image-url-display">
          <label className="form-label">Image URL (Click to copy)</label>
          <div className="url-display-container">
            <input
              type="text"
              value={imageUrl}
              readOnly
              className="url-display-input"
              onClick={(e) => {
                e.target.select();
                navigator.clipboard.writeText(imageUrl);
                alert('Image URL copied to clipboard!');
              }}
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(imageUrl);
                alert('Image URL copied to clipboard!');
              }}
              className="copy-url-btn"
            >
              📋 Copy
            </button>
          </div>
          <small className="url-info">This URL will be saved with your product</small>
        </div>
      )}
    </div>
  );
}

export default ImageUpload;