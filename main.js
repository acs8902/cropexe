// Ensure PDF.js is loaded before using pdfjsLib
async function ensurePdfJs() {
  if (!window.pdfjsLib) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Set the worker path AFTER pdfjsLib exists
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
}

// Constants must be defined BEFORE the class
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

// Enhanced ExamPhotoTool with SEO tracking and better error handling
class ExamPhotoTool {
  constructor() {
    this.currentExam = '';
    this.currentImageType = 'photo';
    this.cropper = null;
    this.processedImageBlob = null;
    this.initializeEventListeners();
    this.trackUserJourney();
  }

  trackUserJourney() {
    // SEO & Analytics: Track user interactions (privacy-focused)
    this.logEvent('page_loaded', { 
      page: 'index',
      timestamp: new Date().toISOString(),
      user_agent: navigator.userAgent 
    });
  }

  logEvent(eventName, properties = {}) {
    // SEO: Track user behavior for improving user experience
    if (typeof gtag !== 'undefined') {
      gtag('event', eventName, properties);
    }
    
    // Enhanced logging for debugging and SEO insights
    const eventData = {
      event: eventName,
      ...properties,
      exam_tool: 'CropExe',
      version: '2.0'
    };
    
    console.log('🔍 CropExe Event:', eventData);
  }

  initializeEventListeners() {
    // SEO: Track exam selection
    document.getElementById('exam-type').addEventListener('change', (e) => {
      this.currentExam = e.target.value;
      this.updateSpecifications();
      this.logEvent('exam_selected', { 
        exam: this.currentExam,
        image_type: this.currentImageType 
      });
    });

    // SEO: Track image type selection
    document.querySelectorAll('input[name="imageType"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.currentImageType = e.target.value;
        this.updateSpecifications();
        this.logEvent('image_type_selected', { 
          type: this.currentImageType,
          exam: this.currentExam 
        });
      });
    });

    const fileInput = document.getElementById('image-input');
    const uploadArea = document.getElementById('upload-area');

    // Enhanced upload interactions with SEO tracking
    uploadArea.addEventListener('click', (e) => {
      if (e.target.tagName.toLowerCase() === 'input') return;
      fileInput.click();
      this.logEvent('upload_area_clicked');
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
      if (file) {
        this.logEvent('file_dropped', { 
          type: file.type, 
          size: file.size,
          exam: this.currentExam 
        });
        this.handleImageUpload(file);
      }
    });

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        this.logEvent('file_selected', { 
          type: file.type, 
          size: file.size,
          exam: this.currentExam 
        });
        this.handleImageUpload(file);
      }
    });

    // Process buttons with enhanced tracking
    document.getElementById('crop-btn').addEventListener('click', () => {
      this.logEvent('crop_initiated', {
        exam: this.currentExam,
        image_type: this.currentImageType
      });
      this.processImage();
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
      this.logEvent('reset_clicked');
      this.resetToUpload();
    });

    document.getElementById('download-btn').addEventListener('click', () => {
      this.logEvent('download_initiated', {
        exam: this.currentExam,
        image_type: this.currentImageType,
        file_size: this.processedImageBlob ? this.processedImageBlob.size : 0
      });
      this.downloadImage();
    });

    document.getElementById('new-image-btn').addEventListener('click', () => {
      this.logEvent('new_image_started');
      this.resetToUpload();
    });

    // SEO: Track visibility for user engagement
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.logEvent('page_visible');
      } else {
        this.logEvent('page_hidden');
      }
    });
  }

  updateSpecifications() {
    if (!this.currentExam) return;
    
    const specs = EXAM_SPECS[this.currentExam][this.currentImageType];
    const specsDiv = document.getElementById('specifications');
    
    // SEO: Enhanced specifications display
    specsDiv.innerHTML = `
      <div class="specs-item"><span class="specs-label">Dimensions:</span> ${specs.width} × ${specs.height} px</div>
      <div class="specs-item"><span class="specs-label">Max Size:</span> ${specs.maxSize} KB</div>
      <div class="specs-item"><span class="specs-label">Format:</span> ${specs.format}</div>
      <div class="specs-item"><span class="specs-label">DPI:</span> ${specs.dpi}</div>
      <div class="specs-item"><span class="specs-label">Exam:</span> ${this.currentExam.replace('_', ' ')}</div>
    `;
    
    document.getElementById('specifications-section').classList.remove('hidden');
    
    // SEO: Update page title dynamically for better UX
    document.title = `CropExe - ${this.currentExam.replace('_', ' ')} ${this.currentImageType} Tool`;
  }

  handleImageUpload(file) {
    if (!file) return;

    // Enhanced validation with better error messages
    if (!this.currentExam || !EXAM_SPECS[this.currentExam]) {
      this.logEvent('error_no_exam_selected');
      alert("⚠️ Please select your exam type before uploading an image!");
      this.showLoading(false);
      this.resetToUpload();
      return;
    }

    // Check file type support with enhanced user feedback
    const fileExtension = file.name.split('.').pop().toLowerCase();
    const isSupported = SUPPORTED_INPUT_FORMATS.includes(file.type) || 
                       this.isSupportedByExtension(fileExtension);
    
    if (!isSupported) {
      const formats = SUPPORTED_FORMATS_DISPLAY.join(', ');
      this.logEvent('unsupported_format', { 
        format: file.type,
        extension: fileExtension 
      });
      alert(`❌ Unsupported file format. Please use: ${formats}`);
      return;
    }

    // Check file size (reasonable limit: 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      this.logEvent('error_file_too_large', { size: file.size });
      alert("❌ File is too large. Please select a file smaller than 50MB.");
      return;
    }

    this.showLoading(true);
    this.logEvent('file_processing_started', { 
      format: file.type, 
      size: file.size,
      exam: this.currentExam,
      imageType: this.currentImageType,
      file_name: file.name
    });

    // Route to appropriate handler based on file type
    if (file.type === 'application/pdf' || fileExtension === 'pdf') {
      this.handlePdfUpload(file);
    } else if (file.type.includes('heic') || file.type.includes('heif') || fileExtension === 'heic' || fileExtension === 'heif') {
      this.handleHeicUpload(file);
    } else if (file.type === 'image/tiff' || file.type === 'image/tif' || fileExtension === 'tiff' || fileExtension === 'tif') {
      this.handleTiffUpload(file);
    } else if (this.isRawFormat(file.type) || this.isRawFormatByExtension(fileExtension)) {
      this.handleRawUpload(file);
    } else {
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

  // File type handlers with enhanced error handling
  handleStandardImageUpload(file) {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      this.logEvent('image_loaded_success', { type: file.type });
      this.initializeCropper(e.target.result);
      this.showLoading(false);
    };
    
    reader.onerror = (error) => {
      this.logEvent('image_load_error', { error: error.type });
      alert('❌ Error reading image file. The file might be corrupted.');
      this.showLoading(false);
      this.resetToUpload();
    };
    
    reader.onabort = () => {
      this.logEvent('image_load_aborted');
      alert('❌ File reading was aborted.');
      this.showLoading(false);
    };
    
    reader.readAsDataURL(file);
  }

  async handlePdfUpload(file) {
    try {
      this.logEvent('pdf_conversion_started');
      await ensurePdfJs();
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
      
      this.logEvent('pdf_conversion_success', {
        pages: pdf.numPages,
        dimensions: `${viewport.width}x${viewport.height}`
      });
      
      this.initializeCropper(imageDataURL);
      this.showLoading(false);
      
    } catch (error) {
      console.error('PDF conversion error:', error);
      this.logEvent('pdf_conversion_failed', { error: error.message });
      
      let errorMessage = '❌ Error converting PDF to image. ';
      if (error.name === 'PasswordException') {
        errorMessage += 'The PDF is password protected.';
      } else if (error.name === 'InvalidPDFException') {
        errorMessage += 'The PDF file appears to be corrupted.';
      } else {
        errorMessage += 'Please try with a JPG or PNG file instead.';
      }
      
      alert(errorMessage);
      this.showLoading(false);
      this.resetToUpload();
    }
  }

  handleHeicUpload(file) {
    this.logEvent('heic_file_detected');
    alert('📱 HEIC/HEIF detected: These are high-efficiency formats mainly from iPhones. For best results, consider converting to JPEG/PNG first.');
    // Fall back to standard handling
    this.handleStandardImageUpload(file);
  }

  handleTiffUpload(file) {
    this.logEvent('tiff_file_detected');
    // Try to load TIFF files normally
    const reader = new FileReader();
    reader.onload = (e) => {
      this.logEvent('tiff_load_success');
      this.initializeCropper(e.target.result);
      this.showLoading(false);
    };
    reader.onerror = () => {
      this.logEvent('tiff_load_failed');
      alert('🖼️ TIFF detected: This format may not be fully supported. For best results, convert to JPEG/PNG.');
      this.showLoading(false);
    };
    reader.readAsDataURL(file);
  }

  handleRawUpload(file) {
    this.logEvent('raw_file_detected', { type: file.type });
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

    // Destroy existing cropper if any
    if (this.cropper) {
      this.cropper.destroy();
    }

    const specs = EXAM_SPECS[this.currentExam][this.currentImageType];
    
    try {
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
        ready: () => {
          this.logEvent('cropper_initialized', {
            aspect_ratio: specs.width / specs.height,
            dimensions: `${specs.width}x${specs.height}`
          });
          console.log('Cropper ready for exam:', this.currentExam);
        },
        crop: (event) => {
          // SEO: Track user cropping activity
          this.logEvent('user_cropping', {
            crop_area: `${Math.round(event.detail.width)}x${Math.round(event.detail.height)}`
          });
        }
      });
    } catch (error) {
      this.logEvent('cropper_init_failed', { error: error.message });
      console.error('Cropper initialization failed:', error);
      alert('❌ Failed to initialize image cropper. Please try a different image.');
      this.resetToUpload();
    }
  }

  async processImage() {
    if (!this.cropper) {
      alert("⚠️ Please upload and crop an image first!");
      return;
    }

    this.showLoading(true);
    this.logEvent('image_processing_started', {
      exam: this.currentExam,
      image_type: this.currentImageType
    });

    try {
      const specs = EXAM_SPECS[this.currentExam][this.currentImageType];
      const canvas = this.cropper.getCroppedCanvas({
        width: specs.width,
        height: specs.height,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      });

      // Enhanced compression with better quality control
      let quality = 0.92;
      let blob = await this.compressCanvas(canvas, quality);
      let iterations = 0;
      const maxIterations = 12;

      // SEO: Track compression process
      const compressionMetrics = {
        initial_size: blob.size,
        target_size: specs.maxSize * 1024,
        iterations: []
      };

      while ((blob.size / 1024) > specs.maxSize && quality > 0.3 && iterations < maxIterations) {
        quality -= 0.07;
        blob = await this.compressCanvas(canvas, quality);
        iterations++;
        
        compressionMetrics.iterations.push({
          iteration: iterations,
          quality: quality,
          size: blob.size
        });
      }

      this.processedImageBlob = blob;
      
      // SEO: Track final compression results
      compressionMetrics.final_size = blob.size;
      compressionMetrics.final_quality = quality;
      compressionMetrics.success = (blob.size / 1024) <= specs.maxSize;
      
      this.logEvent('compression_completed', compressionMetrics);
      
      this.displayPreview(blob, quality);
      this.showLoading(false);
      
      this.logEvent('image_processing_completed', {
        final_size: blob.size,
        final_quality: quality,
        iterations: iterations,
        within_limit: (blob.size / 1024) <= specs.maxSize,
        exam: this.currentExam
      });

    } catch (error) {
      this.logEvent('image_processing_failed', { error: error.message });
      console.error('Image processing error:', error);
      alert('❌ Error processing image. Please try again.');
      this.showLoading(false);
    }
  }

  compressCanvas(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Canvas toBlob failed'));
          }
        },
        'image/jpeg',
        quality
      );
    });
  }

  displayPreview(blob, quality) {
    const specs = EXAM_SPECS[this.currentExam][this.currentImageType];
    const imgURL = URL.createObjectURL(blob);
    const sizeKB = (blob.size / 1024).toFixed(2);
    const isWithinLimit = sizeKB <= specs.maxSize;

    document.getElementById('preview-container').innerHTML = `
      <div class="preview-content">
        <img src="${imgURL}" class="preview-image" alt="Processed ${this.currentImageType} for ${this.currentExam} exam">
        <div class="preview-specs">
          <h4>✅ Image Ready for Download</h4>
          <p><strong>Size:</strong> ${sizeKB} KB (max ${specs.maxSize} KB)</p>
          <p><strong>Compression Quality:</strong> ${(quality * 100).toFixed(0)}%</p>
          <p><strong>Dimensions:</strong> ${specs.width} × ${specs.height} px</p>
          <div class="compression-info ${isWithinLimit ? 'size-valid' : 'size-invalid'}">
            ${isWithinLimit ? '✓ Within exam size limit' : '⚠️ Slightly over size limit'}
          </div>
          ${!isWithinLimit ? '<div class="size-warning">Consider cropping tighter or using a different image</div>' : ''}
        </div>
      </div>
    `;
    
    document.getElementById('preview-section').classList.remove('hidden');
    
    // SEO: Track preview display
    this.logEvent('preview_displayed', {
      size: sizeKB,
      quality: quality,
      within_limit: isWithinLimit
    });
  }

  downloadImage() {
    if (!this.processedImageBlob) {
      alert("❌ Please process an image first!");
      return;
    }

    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(this.processedImageBlob);
      a.download = `${this.currentExam}_${this.currentImageType}_${new Date().getTime()}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // SEO: Track successful download
      this.logEvent('download_successful', {
        exam: this.currentExam,
        image_type: this.currentImageType,
        file_size: this.processedImageBlob.size,
        timestamp: new Date().toISOString()
      });
      
      // Show success message
      setTimeout(() => {
        alert('✅ Image downloaded successfully!');
      }, 100);
      
    } catch (error) {
      this.logEvent('download_failed', { error: error.message });
      console.error('Download error:', error);
      alert('❌ Failed to download image. Please try again.');
    }
  }

  showLoading(show) {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (show) {
      loadingOverlay.classList.remove('hidden');
      // SEO: Track loading states
      this.logEvent('loading_started');
    } else {
      loadingOverlay.classList.add('hidden');
      this.logEvent('loading_ended');
    }
  }

  resetToUpload() {
    // Clean up cropper
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
    const fileInput = document.getElementById('image-input');
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.handleImageUpload(file);
    });
    
    // Hide sections
    document.getElementById('cropping-section').classList.add('hidden');
    document.getElementById('preview-section').classList.add('hidden');
    
    // Clean up processed image
    if (this.processedImageBlob) {
      URL.revokeObjectURL(URL.createObjectURL(this.processedImageBlob));
      this.processedImageBlob = null;
    }
    
    // Reset to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // SEO: Track reset action
    this.logEvent('tool_reset');
  }
}

// Enhanced initialization with comprehensive error handling
document.addEventListener('DOMContentLoaded', () => {
  try {
    // Check for required libraries
    if (typeof Cropper === 'undefined') {
      throw new Error('Cropper.js library not loaded');
    }
    
    // Initialize the application
    const examTool = new ExamPhotoTool();
    
    // SEO: Track successful initialization
    if (typeof gtag !== 'undefined') {
      gtag('event', 'app_initialized', {
        exam_tool: 'CropExe',
        version: '2.0',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log('🎉 CropExe initialized successfully with SEO enhancements');
    
    // Add performance monitoring
    window.addEventListener('load', () => {
      if ('performance' in window) {
        const perfData = performance.timing;
        const loadTime = perfData.loadEventEnd - perfData.navigationStart;
        
        examTool.logEvent('page_performance', {
          load_time: loadTime,
          dom_ready: perfData.domContentLoadedEventEnd - perfData.navigationStart
        });
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to initialize CropExe:', error);
    
    // SEO: Track initialization errors
    if (typeof gtag !== 'undefined') {
      gtag('event', 'app_init_failed', {
        error: error.message,
        exam_tool: 'CropExe'
      });
    }
    
    // User-friendly error message
    alert('Sorry, there was an error initializing the application. Please refresh the page or check your internet connection.');
  }
});

// SEO: Add global error handler for better monitoring
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  
  if (typeof gtag !== 'undefined') {
    gtag('event', 'global_error', {
      error_message: event.error?.message || 'Unknown error',
      error_file: event.filename,
      error_line: event.lineno,
      error_col: event.colno
    });
  }
});

// SEO: Track page visibility for user engagement metrics
document.addEventListener('visibilitychange', () => {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'visibility_change', {
      visibility_state: document.visibilityState,
      timestamp: new Date().toISOString()
    });
  }
});

console.log('🚀 CropExe SEO Enhanced v2.0 loaded successfully');