const EXAM_SPECS = {
  'UPSC': {
    'photo': { width: 200, height: 230, format: 'JPEG', maxSize: 50, dpi: 110 },
    'signature': { width: 140, height: 60, format: 'JPEG', maxSize: 20, dpi: 110 }
  },
  'SSC_CGL': {
    'photo': { width: 200, height: 230, format: 'JPEG', maxSize: 20, dpi: 110 },
    'signature': { width: 140, height: 60, format: 'JPEG', maxSize: 10, dpi: 110 }
  },
  'IBPS_PO': {
    'photo': { width: 200, height: 230, format: 'JPEG', maxSize: 50, dpi: 110 },
    'signature': { width: 140, height: 60, format: 'JPEG', maxSize: 20, dpi: 110 }
  }
};

// Enhanced format support
const SUPPORTED_INPUT_FORMATS = [
  // Common formats
  'image/jpeg', 
  'image/jpg', 
  'image/png', 
  'image/webp',
  'image/bmp',
  'image/gif',
  'image/svg+xml',
  'application/pdf',
  
  // HEIC/HEIF formats (iPhone images)
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
  
  // TIFF formats
  'image/tiff',
  'image/tif',
  
  // RAW camera formats
  'image/x-canon-cr2',
  'image/x-nikon-nef',
  'image/x-sony-arw',
  'image/x-adobe-dng',
  'image/x-fuji-raf',
  'image/x-olympus-orf',
  'image/x-panasonic-rw2',
  'image/x-samsung-srw',
  
  // Other formats
  'image/ico',
  'image/x-icon',
  'image/vnd.microsoft.icon'
];

const SUPPORTED_FORMATS_DISPLAY = [
  'JPG', 'JPEG', 'PNG', 'WEBP', 'BMP', 'GIF', 'SVG', 'PDF',
  'HEIC', 'HEIF', 'TIFF', 'TIF', 'CR2', 'NEF', 'ARW', 'DNG',
  'RAF', 'ORF', 'RW2', 'SRW', 'ICO'
];

// Set up pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

class ExamPhotoTool {
  constructor() {
    this.currentExam = '';
    this.currentImageType = 'photo';
    this.cropper = null;
    this.processedImageBlob = null;
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    document.getElementById('exam-type').addEventListener('change', (e) => {
      this.currentExam = e.target.value;
      this.updateSpecifications();
    });

    document.querySelectorAll('input[name="imageType"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.currentImageType = e.target.value;
        this.updateSpecifications();
      });
    });

    const fileInput = document.getElementById('image-input');
    const uploadArea = document.getElementById('upload-area');

    uploadArea.addEventListener('click', (e) => {
  // Prevent double-trigger if user clicked directly on the file input
  if (e.target.tagName.toLowerCase() === 'input') return;
  fileInput.click();
});
    uploadArea.addEventListener('dragover', e => { 
      e.preventDefault(); 
      uploadArea.classList.add('dragging'); 
    });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragging'));
    uploadArea.addEventListener('drop', e => {
      e.preventDefault();
      uploadArea.classList.remove('dragging');
      const file = e.dataTransfer.files[0];
      if (file) this.handleImageUpload(file);
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleImageUpload(file);
    });

    document.getElementById('crop-btn').addEventListener('click', () => this.processImage());
    document.getElementById('reset-btn').addEventListener('click', () => this.resetToUpload());
    document.getElementById('download-btn').addEventListener('click', () => this.downloadImage());
    document.getElementById('new-image-btn').addEventListener('click', () => this.resetToUpload());
  }

  updateSpecifications() {
    if (!this.currentExam) return;
    const specs = EXAM_SPECS[this.currentExam][this.currentImageType];
    const specsDiv = document.getElementById('specifications');
    specsDiv.innerHTML = `
      <div class="specs-item"><span class="specs-label">Dimensions:</span> ${specs.width} × ${specs.height} px</div>
      <div class="specs-item"><span class="specs-label">Max Size:</span> ${specs.maxSize} KB</div>
      <div class="specs-item"><span class="specs-label">Format:</span> ${specs.format}</div>
      <div class="specs-item"><span class="specs-label">DPI:</span> ${specs.dpi}</div>
    `;
    document.getElementById('specifications-section').classList.remove('hidden');
  }

  // Enhanced file upload handler with format support
handleImageUpload(file) {
  if (!file) return;

   // ✅ Prevent error if exam type not selected
  if (!this.currentExam || !EXAM_SPECS[this.currentExam]) {
    alert("⚠️ Please select your exam type before uploading an image!");
    this.showLoading(false);
    this.resetToUpload();
    return;
  }

    
    // Check if file type is supported
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const isSupported = SUPPORTED_INPUT_FORMATS.includes(file.type) || 
                       this.isSupportedByExtension(fileExtension);
    
    if (!isSupported) {
      const formats = SUPPORTED_FORMATS_DISPLAY.join(', ');
      return alert(`❌ Unsupported format. Please use: ${formats}`);
    }

    this.showLoading(true);
    
    // Handle different file types
    if (file.type === 'application/pdf' || fileExtension === 'pdf') {
      this.handlePdfUpload(file);
    } else if (file.type.includes('heic') || file.type.includes('heif') || fileExtension === 'heic' || fileExtension === 'heif') {
      this.handleHeicUpload(file);
    } else if (file.type === 'image/tiff' || file.type === 'image/tif' || fileExtension === 'tiff' || fileExtension === 'tif') {
      this.handleTiffUpload(file);
    } else if (this.isRawFormat(file.type) || this.isRawFormatByExtension(fileExtension)) {
      this.handleRawUpload(file);
    } else {
      // Handle standard image formats
      this.handleStandardImageUpload(file);
    }
  }

  // Helper methods for format detection
  isSupportedByExtension(extension) {
    const supportedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif', 'svg', 'pdf', 
                                'heic', 'heif', 'tiff', 'tif', 'cr2', 'nef', 'arw', 'dng',
                                'raf', 'orf', 'rw2', 'srw', 'ico'];
    return supportedExtensions.includes(extension.toLowerCase());
  }

  isRawFormat(mimeType) {
    const rawFormats = ['image/x-canon-cr2', 'image/x-nikon-nef', 'image/x-sony-arw', 
                       'image/x-adobe-dng', 'image/x-fuji-raf', 'image/x-olympus-orf',
                       'image/x-panasonic-rw2', 'image/x-samsung-srw'];
    return rawFormats.includes(mimeType);
  }

  isRawFormatByExtension(extension) {
    const rawExtensions = ['cr2', 'nef', 'arw', 'dng', 'raf', 'orf', 'rw2', 'srw'];
    return rawExtensions.includes(extension.toLowerCase());
  }

  // File type handlers
  handleStandardImageUpload(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      this.initializeCropper(e.target.result);
      this.showLoading(false);
    };
    reader.onerror = () => {
      alert('❌ Error reading image file');
      this.showLoading(false);
    };
    reader.readAsDataURL(file);
  }

  async handlePdfUpload(file) {
    try {
      this.updateUploadArea('Converting PDF to image...', '⏳');
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      // Get the first page
      const page = await pdf.getPage(1);
      
      // Set scale for better quality (3.0 for high DPI)
      const viewport = page.getViewport({ scale: 3.0 });
      
      // Create canvas for rendering
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      // Render PDF page to canvas
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;
      
      // Convert canvas to data URL and initialize cropper
      const imageDataURL = canvas.toDataURL('image/jpeg', 0.9);
      this.initializeCropper(imageDataURL);
      this.showLoading(false);
      
    } catch (error) {
      console.error('PDF conversion error:', error);
      alert('❌ Error converting PDF to image. The PDF might be corrupted or password protected. Please try with a JPG or PNG file instead.');
      this.showLoading(false);
      this.resetToUpload();
    }
  }

  handleHeicUpload(file) {
    alert('📱 HEIC/HEIF detected: These are high-efficiency formats mainly from iPhones. For best results, consider converting to JPEG/PNG first.');
    // Fall back to standard handling
    this.handleStandardImageUpload(file);
  }

  handleTiffUpload(file) {
    // Try to load TIFF files normally
    const reader = new FileReader();
    reader.onload = (e) => {
      this.initializeCropper(e.target.result);
      this.showLoading(false);
    };
    reader.onerror = () => {
      alert('🖼️ TIFF detected: This format may not be fully supported. For best results, convert to JPEG/PNG.');
      this.showLoading(false);
    };
    reader.readAsDataURL(file);
  }

  handleRawUpload(file) {
    alert('📸 RAW camera file detected: These are professional camera formats. For exam photos, please use JPEG or PNG format for better compatibility.');
    this.showLoading(false);
    this.resetToUpload();
  }

  // Helper method to update upload area during conversion
  updateUploadArea(message, icon = '📁') {
    const uploadArea = document.getElementById('upload-area');
    uploadArea.innerHTML = `
      <div class="upload-icon">${icon}</div>
      <h3>${message}</h3>
      <div class="loading-spinner" style="margin: 20px auto;"></div>
    `;
    uploadArea.classList.add('converting');
  }

  initializeCropper(imageSrc) {
    const croppingSection = document.getElementById('cropping-section');
    const image = document.getElementById('image-to-crop');

    croppingSection.classList.remove('hidden');
    image.src = imageSrc;

    if (this.cropper) this.cropper.destroy();

    const specs = EXAM_SPECS[this.currentExam][this.currentImageType];
    this.cropper = new Cropper(image, {
      aspectRatio: specs.width / specs.height,
      viewMode: 1,
      autoCropArea: 0.9,
      guides: true,
      center: true,
      highlight: false,
      background: false,
      movable: true,
      rotatable: false,
      scalable: false,
      zoomable: true,
      zoomOnTouch: true,
      zoomOnWheel: true,
      wheelZoomRatio: 0.1,
      ready: function() {
        console.log('Cropper ready');
      }
    });
  }

  async processImage() {
    if (!this.cropper) return alert("⚠️ Please upload and crop an image first!");
    this.showLoading(true);

    const specs = EXAM_SPECS[this.currentExam][this.currentImageType];
    const canvas = this.cropper.getCroppedCanvas({
      width: specs.width,
      height: specs.height,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high'
    });

    // Auto compression loop
    let quality = 0.9;
    let blob = await this.compressCanvas(canvas, quality);
    while ((blob.size / 1024) > specs.maxSize && quality > 0.3) {
      quality -= 0.05;
      blob = await this.compressCanvas(canvas, quality);
    }

    this.processedImageBlob = blob;
    this.displayPreview(blob, quality);
    this.showLoading(false);
  }

  compressCanvas(canvas, quality) {
    return new Promise(resolve => {
      canvas.toBlob(b => resolve(b), 'image/jpeg', quality);
    });
  }

  displayPreview(blob, quality) {
    const specs = EXAM_SPECS[this.currentExam][this.currentImageType];
    const imgURL = URL.createObjectURL(blob);
    const sizeKB = (blob.size / 1024).toFixed(2);

    document.getElementById('preview-container').innerHTML = `
      <div class="preview-content">
        <img src="${imgURL}" class="preview-image">
        <div class="preview-specs">
          <h4>✅ Image Ready</h4>
          <p><strong>Size:</strong> ${sizeKB} KB (max ${specs.maxSize} KB)</p>
          <p><strong>Compression Quality:</strong> ${(quality * 100).toFixed(0)}%</p>
          <div class="compression-info">${sizeKB <= specs.maxSize ? '✓ Within exam size limit' : '⚠️ Still slightly over limit'}</div>
        </div>
      </div>
    `;
    document.getElementById('preview-section').classList.remove('hidden');
  }

  downloadImage() {
    if (!this.processedImageBlob) return alert("❌ Please process an image first!");
    const a = document.createElement('a');
    a.href = URL.createObjectURL(this.processedImageBlob);
    a.download = `${this.currentExam}_${this.currentImageType}.jpg`;
    a.click();
  }

  showLoading(show) {
    document.getElementById('loading-overlay').classList.toggle('hidden', !show);
  }

  resetToUpload() {
    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = null;
    }
    
    // Reset upload area to original state
    const uploadArea = document.getElementById('upload-area');
    uploadArea.innerHTML = `
      <input type="file" id="image-input" accept="image/*,.pdf,.heic,.heif,.tiff,.tif,.cr2,.nef,.arw,.dng,.raf,.orf,.rw2,.srw,.ico" class="file-input">
      <div class="upload-placeholder">
        <div class="upload-icon">💾</div>
        <p><strong>click to browse</strong> and select your image</p>
        <small class="supported-formats">Supports: JPG, PNG, WEBP, GIF, SVG, PDF, HEIC, TIFF, RAW camera files, and 20+ formats</small>
        <small class="format-note">PDF files will be automatically converted to images for cropping</small>
      </div>
    `;
    uploadArea.classList.remove('converting', 'dragging');
    
    // Re-attach file input event listener
    document.getElementById('image-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleImageUpload(file);
    });
    
    document.getElementById('cropping-section').classList.add('hidden');
    document.getElementById('preview-section').classList.add('hidden');
    this.processedImageBlob = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

document.addEventListener('DOMContentLoaded', () => new ExamPhotoTool());
