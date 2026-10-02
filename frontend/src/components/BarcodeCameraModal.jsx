import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ScanLine,
  X,
  Camera,
  ImageUp,
  FlipHorizontal,
  RotateCcw,
  Video,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import {
  MultiFormatReader,
  DecodeHintType,
  BarcodeFormat,
  BinaryBitmap,
  HybridBinarizer,
  HTMLCanvasElementLuminanceSource
} from '@zxing/library';
import { playScannerBeep } from '../utils/barcodeGenerator';
import { decodeBarcodeFromImage, getImageFileFromClipboard } from '../utils/barcodeImageDecoder';
import './BarcodeCameraModal.css';

/**
 * Component Modal Máy Quét Mã Vạch (Barcode Scanner) - Đồng bộ 100% giao diện Catalog.
 * Hỗ trợ:
 * 1. Live Webcam Stream thời gian thực với xử lý tự động & thủ công
 * 2. Tự động khắc phục lỗi Camera bị chiếm dụng (NotReadableError) hoặc kẹt luồng
 * 3. Nút Lật ngang camera (Flip Horizontal) cho webcam rời & cơ chế giải mã đa chiều
 * 4. Dropdown chuyển đổi camera (Camera laptop / Webcam rời)
 * 5. Tải file ảnh, kéo thả ảnh hoặc dán ảnh chụp màn hình (Ctrl + V)
 * 6. Súng quét mã vạch USB/Bluetooth hoặc nhập tay
 */
export default function BarcodeCameraModal({
  isOpen,
  onClose,
  onScanSuccess,
  targetField = 'borrowBook', // 'reader' | 'borrowBook' | 'return'
  title = 'Máy Quét Mã Vạch (Barcode Scanner)'
}) {
  // Trạng thái camera và danh sách thiết bị
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [cameraError, setCameraError] = useState('');

  // Tùy chọn lật ngang camera cho webcam rời
  const [isFlippedHorizontal, setIsFlippedHorizontal] = useState(false);

  // Mức độ thu phóng kỹ thuật số (1x, 1.5x, 2x) giúp camera lấy nét rõ ở cự ly xa
  const [zoomLevel, setZoomLevel] = useState(1.5);

  // State tải và giải mã tệp ảnh
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [isDecodingImage, setIsDecodingImage] = useState(false);

  // Ô nhập thủ công / súng đọc mã vạch
  const [inputValue, setInputValue] = useState('');

  // Refs
  const videoRef = useRef(null);
  const zxingReaderRef = useRef(null);
  const barcodeDetectorRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const isStartingRef = useRef(false);
  const scanIntervalRef = useRef(null);
  const isProcessingFrameRef = useRef(false);
  const hasDetectedRef = useRef(false);
  const offscreenCanvasRef = useRef(null);
  const cropCanvasRef = useRef(null);
  const isFlippedHorizontalRef = useRef(false);
  const zoomLevelRef = useRef(1.5);

  // Cấu hình ZXing Hints tối ưu bắt mã vạch
  const zxingHintsRef = useRef(null);
  useEffect(() => {
    const hints = new Map();
    hints.set(DecodeHintType.TRY_HARDER, true);
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.QR_CODE,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODABAR,
      BarcodeFormat.ITF
    ]);
    zxingHintsRef.current = hints;
  }, []);

  // Đồng bộ ref lật ngang và zoom
  useEffect(() => {
    isFlippedHorizontalRef.current = isFlippedHorizontal;
  }, [isFlippedHorizontal]);

  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  // Khởi tạo BarcodeDetector native (Chrome/Edge - GPU C++ siêu nhạy)
  useEffect(() => {
    if ('BarcodeDetector' in window) {
      try {
        const detector = new window.BarcodeDetector({
          formats: [
            'code_128',
            'code_39',
            'ean_13',
            'ean_8',
            'qr_code',
            'upc_a',
            'upc_e',
            'codabar',
            'itf'
          ]
        });
        barcodeDetectorRef.current = detector;
      } catch (e) {
        console.warn('BarcodeDetector native không khởi tạo được:', e);
      }
    }
  }, []);

  // Dừng camera và giải phóng tài nguyên triệt để
  const stopCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    isProcessingFrameRef.current = false;
    hasDetectedRef.current = false;

    if (zxingReaderRef.current) {
      try {
        zxingReaderRef.current.reset();
      } catch (e) {
        console.warn('Lỗi reset ZXing:', e);
      }
      zxingReaderRef.current = null;
    }
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => {
          track.stop();
        });
      } catch (e) {
        console.warn('Lỗi dừng camera track:', e);
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsConnecting(false);
  }, []);

  // Lấy danh sách camera khả dụng
  const refreshDevicesList = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === 'videoinput');
      if (cameras.length > 0) {
        setVideoDevices(cameras);
        if (!selectedDeviceId) {
          const externalCam = cameras.find((c) =>
            /usb|external|webcam|pc-camera|1080p/i.test(c.label)
          );
          setSelectedDeviceId(externalCam ? externalCam.deviceId : cameras[0].deviceId);
        }
      }
    } catch (e) {
      console.warn('Lỗi nạp danh sách camera:', e);
    }
  }, [selectedDeviceId]);

  // Hàm quét một canvas bằng BarcodeDetector native hoặc ZXing MultiFormatReader
  const decodeFromCanvasElement = useCallback(async (canvas) => {
    if (!canvas || !canvas.width || !canvas.height) return null;

    // 1. Thử BarcodeDetector native trước (Chrome/Edge C++ siêu nhanh)
    if (barcodeDetectorRef.current) {
      try {
        const detected = await barcodeDetectorRef.current.detect(canvas);
        if (detected && detected.length > 0) {
          const val = (detected[0].rawValue || '').trim();
          if (val) return val;
        }
      } catch (nativeErr) {
        // Tiếp tục fallback
      }
    }

    // 2. Fallback sang ZXing MultiFormatReader chuẩn (không dính bug naturalWidth của BrowserCodeReader)
    if (zxingReaderRef.current && zxingHintsRef.current) {
      try {
        const luminanceSource = new HTMLCanvasElementLuminanceSource(canvas);
        const binarizer = new HybridBinarizer(luminanceSource);
        const bitmap = new BinaryBitmap(binarizer);
        const result = zxingReaderRef.current.decode(bitmap, zxingHintsRef.current);
        if (result && result.getText()) {
          const text = result.getText().trim();
          if (text) return text;
        }
      } catch (zxingErr) {
        // Chưa khớp frame này, bỏ qua bình thường
      }
    }

    return null;
  }, []);

  // Khởi chạy camera quét thời gian thực với cơ chế phân tích frame đa chiều & Macro Zoom
  const startCamera = useCallback(async (deviceId) => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setIsConnecting(true);
    setCameraError('');
    stopCamera();

    try {
      // Khởi tạo MultiFormatReader chuyên sâu
      const reader = new MultiFormatReader();
      if (zxingHintsRef.current) {
        reader.setHints(zxingHintsRef.current);
      }
      zxingReaderRef.current = reader;

      let stream;
      const targetId = deviceId || selectedDeviceId;

      try {
        const constraints = {
          video: {
            deviceId: targetId ? { exact: targetId } : undefined,
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 }
          }
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstErr) {
        console.warn('Lỗi mở camera độ nét cao, fallback sang mặc định:', firstErr);
        stream = await navigator.mediaDevices.getUserMedia({
          video: targetId ? { deviceId: { exact: targetId } } : true
        });
      }

      // Kích hoạt autofocus liên tục nếu webcam hỗ trợ
      try {
        const videoTrack = stream.getVideoTracks()[0];
        if (videoTrack) {
          const capabilities = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
          const advanced = [];
          if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
            advanced.push({ focusMode: 'continuous' });
          }
          if (capabilities.exposureMode && capabilities.exposureMode.includes('continuous')) {
            advanced.push({ exposureMode: 'continuous' });
          }
          if (advanced.length > 0 && videoTrack.applyConstraints) {
            await videoTrack.applyConstraints({ advanced });
          }
        }
      } catch (fErr) {
        console.warn('Lỗi áp dụng focusMode:', fErr);
      }

      streamRef.current = stream;

      // Cập nhật lại danh sách camera sau khi quyền đã được cấp
      await refreshDevicesList();

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('Video play warning:', playErr);
        }

        setIsCameraActive(true);
        setIsConnecting(false);

        // Khởi tạo Canvas ẩn để phân tích frame
        if (!offscreenCanvasRef.current) {
          offscreenCanvasRef.current = document.createElement('canvas');
        }
        if (!cropCanvasRef.current) {
          cropCanvasRef.current = document.createElement('canvas');
        }
        const fullCanvas = offscreenCanvasRef.current;
        const fullCtx = fullCanvas.getContext('2d', { willReadFrequently: true });
        const cropCanvas = cropCanvasRef.current;
        const cropCtx = cropCanvas.getContext('2d', { willReadFrequently: true });

        // Vòng lặp quét frame liên tục (mỗi 100ms) hỗ trợ quét toàn cảnh + crop zoom tâm + đa chiều
        hasDetectedRef.current = false;
        scanIntervalRef.current = setInterval(async () => {
          if (isProcessingFrameRef.current || hasDetectedRef.current) return;
          const video = videoRef.current;
          if (!video || video.readyState < 2 || !video.videoWidth) return;

          isProcessingFrameRef.current = true;
          try {
            const vw = video.videoWidth;
            const vh = video.videoHeight;
            fullCanvas.width = vw;
            fullCanvas.height = vh;

            const isUserFlipped = isFlippedHorizontalRef.current;
            const currentZoom = zoomLevelRef.current || 1.0;

            // Tính toán vùng quét theo mức Zoom kỹ thuật số
            const cropW = vw / currentZoom;
            const cropH = vh / currentZoom;
            const cropX = (vw - cropW) / 2;
            const cropY = (vh - cropH) / 2;

            cropCanvas.width = Math.round(cropW);
            cropCanvas.height = Math.round(cropH);

            // BƯỚC 1: Quét vùng trung tâm đã Zoom (giúp để xa 30-50cm vẫn to nét) - Chiều A
            cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
            cropCtx.save();
            if (isUserFlipped) {
              cropCtx.translate(cropCanvas.width, 0);
              cropCtx.scale(-1, 1);
            }
            cropCtx.drawImage(
              video,
              cropX,
              cropY,
              cropW,
              cropH,
              0,
              0,
              cropCanvas.width,
              cropCanvas.height
            );
            cropCtx.restore();

            let code = await decodeFromCanvasElement(cropCanvas);

            // BƯỚC 2: Nếu chưa ra, thử vùng Zoom với Chiều B (lật ngược lại)
            if (!code) {
              cropCtx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
              cropCtx.save();
              if (!isUserFlipped) {
                cropCtx.translate(cropCanvas.width, 0);
                cropCtx.scale(-1, 1);
              }
              cropCtx.drawImage(
                video,
                cropX,
                cropY,
                cropW,
                cropH,
                0,
                0,
                cropCanvas.width,
                cropCanvas.height
              );
              cropCtx.restore();

              code = await decodeFromCanvasElement(cropCanvas);
            }

            // BƯỚC 3: Nếu vẫn chưa ra, thử quét Full Frame toàn cảnh (Chiều A)
            if (!code) {
              fullCtx.clearRect(0, 0, vw, vh);
              fullCtx.save();
              if (isUserFlipped) {
                fullCtx.translate(vw, 0);
                fullCtx.scale(-1, 1);
              }
              fullCtx.drawImage(video, 0, 0, vw, vh);
              fullCtx.restore();

              code = await decodeFromCanvasElement(fullCanvas);
            }

            // BƯỚC 4: Thử Full Frame toàn cảnh (Chiều B)
            if (!code) {
              fullCtx.clearRect(0, 0, vw, vh);
              fullCtx.save();
              if (!isUserFlipped) {
                fullCtx.translate(vw, 0);
                fullCtx.scale(-1, 1);
              }
              fullCtx.drawImage(video, 0, 0, vw, vh);
              fullCtx.restore();

              code = await decodeFromCanvasElement(fullCanvas);
            }

            if (code && !hasDetectedRef.current) {
              // Bỏ qua nếu quét nhầm văn bản ngày tháng (DD/MM/YYYY) trên tem/màn hình
              if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(code)) {
                return;
              }
              hasDetectedRef.current = true;
              playScannerBeep(true);
              stopCamera();
              onScanSuccess(code);
            }
          } catch (scanErr) {
            // Frame không hợp lệ, tiếp tục chu kỳ tiếp theo
          } finally {
            isProcessingFrameRef.current = false;
          }
        }, 100);
      }
    } catch (err) {
      console.warn('Không thể mở camera:', err);
      let errMsg = err.message || 'Không thể mở Camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Trình duyệt chưa được cấp quyền Camera. Vui lòng bấm Cho phép rồi bấm [Bật Camera].';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errMsg = 'Camera đang bị ứng dụng khác (Zalo, Zoom, Teams, OBS, Windows Camera) chiếm giữ. Vui lòng tắt ứng dụng đó đi rồi bấm [Bật Camera].';
      }
      setCameraError(errMsg);
      setIsCameraActive(false);
      setIsConnecting(false);
    } finally {
      isStartingRef.current = false;
    }
  }, [selectedDeviceId, stopCamera, onScanSuccess, refreshDevicesList, decodeFromCanvasElement]);

  // Tự động kích hoạt khi mở modal
  useEffect(() => {
    if (isOpen) {
      refreshDevicesList().then(() => {
        startCamera(selectedDeviceId);
      });
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Đổi thiết bị camera khi chọn dropdown
  const handleDeviceChange = (newDeviceId) => {
    setSelectedDeviceId(newDeviceId);
    startCamera(newDeviceId);
  };

  // Đặt lại ảnh đã tải lên và mở lại camera
  const handleResetImage = (e) => {
    if (e) e.stopPropagation();
    setImagePreviewUrl(null);
    setIsDraggingImage(false);
    setIsDecodingImage(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    startCamera(selectedDeviceId);
  };

  // Xử lý giải mã tệp tải lên (Hỗ trợ cả PDF phiếu mượn/trả và tệp hình ảnh)
  const handleProcessImage = async (file) => {
    if (!file) return;

    const isPdf =
      file.type === 'application/pdf' ||
      (file.name && file.name.toLowerCase().endsWith('.pdf'));
    const isImage = file.type && file.type.startsWith('image/');

    if (!isPdf && !isImage) {
      setCameraError('Vui lòng chọn tệp PDF phiếu mượn hoặc tệp hình ảnh hợp lệ (PNG, JPG).');
      return;
    }

    stopCamera();
    setIsDecodingImage(true);
    setCameraError('');

    if (isImage) {
      const preview = URL.createObjectURL(file);
      setImagePreviewUrl(preview);
    } else {
      setImagePreviewUrl(null);
    }

    try {
      const result = await decodeBarcodeFromImage(file);
      if (result.success && result.barcode) {
        playScannerBeep(true);
        onScanSuccess(result.barcode);
      } else {
        playScannerBeep(false);
        setCameraError(result.message || 'Không tìm thấy mã vạch hợp lệ trong tệp đã chọn.');
      }
    } catch (err) {
      playScannerBeep(false);
      setCameraError('Lỗi đọc tệp: ' + err.message);
    } finally {
      setIsDecodingImage(false);
    }
  };

  // Lắng nghe sự kiện Paste (Ctrl + V): Hỗ trợ dán cả file ảnh lẫn chuỗi ký tự Barcode
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e) => {
      const file = getImageFileFromClipboard(e);
      if (file) {
        e.preventDefault();
        handleProcessImage(file);
        return;
      }

      const text = e.clipboardData?.getData('text');
      if (text && text.trim()) {
        e.preventDefault();
        const clean = text.trim().toUpperCase();
        setInputValue(clean);
        playScannerBeep(true);
        stopCamera();
        onScanSuccess(clean);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, onScanSuccess, stopCamera]);

  // Xác nhận nhập thủ công hoặc súng quét mã vạch
  const handleSubmitManual = (e) => {
    if (e) e.preventDefault();
    const val = inputValue.trim();
    if (!val) return;
    playScannerBeep(true);
    stopCamera();
    onScanSuccess(val);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-dialog scanner-dialog-modal" onClick={(e) => e.stopPropagation()}>
        {/* Tiêu đề Modal chuẩn mực, cách ly CSS với icon thẳng hàng */}
        <div className="scanner-modal-header">
          <div className="scanner-modal-title-box">
            <ScanLine size={20} className="scanner-header-icon" />
            <h3 className="scanner-modal-title">{title}</h3>
          </div>
          <button
            type="button"
            className="scanner-modal-close-btn"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            title="Đóng máy quét"
          >
            <X size={18} />
          </button>
        </div>

        {/* Thân Modal: 1 màn hình duy nhất 100% giống Catalog */}
        <div className="modal-body scanner-dialog-body">
          {/* Khung quét: Video Camera trực tiếp / Xem ảnh tải lên */}
          <div
            className={`scanner-viewport-box ${isDraggingImage ? 'is-dragover' : ''} ${
              isDecodingImage ? 'is-decoding' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingImage(true);
            }}
            onDragLeave={() => setIsDraggingImage(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDraggingImage(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleProcessImage(e.dataTransfer.files[0]);
              }
            }}
            onClick={() => {
              if (!isCameraActive && !imagePreviewUrl) {
                startCamera(selectedDeviceId);
              }
            }}
            title={
              isCameraActive
                ? 'Camera đang hoạt động... Đưa mã vạch vào trước camera để quét'
                : 'Bấm vào đây để Bật Camera hoặc kéo thả ảnh mã vạch'
            }
          >
            {/* Luồng Video Camera trực tiếp */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`camera-video-elem ${isFlippedHorizontal ? 'camera-flipped' : ''}`}
              style={{
                display: isCameraActive && !imagePreviewUrl ? 'block' : 'none',
                transform: `${isFlippedHorizontal ? 'scaleX(-1)' : 'scaleX(1)'} scale(${zoomLevel})`,
                transformOrigin: 'center center',
                transition: 'transform 0.2s ease-out'
              }}
            />

            {/* Xem trước ảnh nếu người dùng tải ảnh lên */}
            {imagePreviewUrl && (
              <>
                <img
                  src={imagePreviewUrl}
                  alt="Barcode preview"
                  className="scanner-preview-image"
                />
                <button
                  type="button"
                  className="btn-clear-scanner-preview"
                  onClick={handleResetImage}
                  title="Xóa ảnh này / Mở lại camera"
                >
                  <X size={14} />
                </button>
              </>
            )}

            {/* Khung ngắm nhắm mục tiêu hồng ngoại & tia laser đỏ */}
            <div className="scanner-target-reticle">
              <div className="reticle-corner corner-tl"></div>
              <div className="reticle-corner corner-tr"></div>
              <div className="reticle-corner corner-bl"></div>
              <div className="reticle-corner corner-br"></div>
              <div className="laser-scan-line"></div>
            </div>

            {/* Dòng hướng dẫn trạng thái */}
            <span className="scanner-status-text">
              {isDecodingImage
                ? 'Đang giải mã mã vạch từ tệp PDF / hình ảnh...'
                : isDraggingImage
                ? 'Thả tệp PDF hoặc hình ảnh vào đây để quét mã...'
                : imagePreviewUrl
                ? 'Đang xem ảnh tải lên. Bấm nút [✕] hoặc [Đặt lại] để mở lại camera'
                : isConnecting
                ? 'Đang kết nối camera... Vui lòng đợi trong giây lát'
                : isCameraActive
                ? '💡 Mẹo lấy nét: Để điện thoại cách xa camera 30 - 45cm (tránh để quá sát gây nhòe mờ) hoặc xoay vòng ren ống kính'
                : 'Camera chưa bật. Bấm nút [Bật Camera] bên dưới hoặc kéo thả ảnh vào đây'}
            </span>
          </div>

          {/* Banner lỗi camera nếu có */}
          {cameraError && (
            <div className="camera-error-banner" style={{ margin: '0 0 -4px 0' }}>
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Thanh công cụ: Chọn camera, Lật ngang, Zoom, Tải ảnh và Phím tắt gọn trên 1 hàng */}
          <div className="scanner-toolbar-row">
            <div className="scanner-toolbar-buttons">
              {/* Dropdown chọn Camera (Hiện khi có từ 1 thiết bị) */}
              {videoDevices.length > 0 && (
                <div className="camera-select-wrap" title={`Thiết bị camera hiện tại: ${selectedDeviceId}`}>
                  <Video size={13} className="control-icon" />
                  <select
                    className="camera-device-select"
                    value={selectedDeviceId}
                    onChange={(e) => handleDeviceChange(e.target.value)}
                    title="Chọn thiết bị camera quét mã"
                  >
                    {videoDevices.map((dev, idx) => (
                      <option key={dev.deviceId || idx} value={dev.deviceId}>
                        {dev.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Nút lật ngang camera cho webcam rời */}
              <button
                type="button"
                className={`btn-flip-camera ${isFlippedHorizontal ? 'active' : ''}`}
                onClick={() => setIsFlippedHorizontal((prev) => !prev)}
                title="Lật ngang camera nếu camera của bạn bị ngược chiều"
              >
                <FlipHorizontal size={14} />
                <span>{isFlippedHorizontal ? 'Đã lật' : 'Lật ngang'}</span>
              </button>

              {/* Nút Thu phóng Zoom kỹ thuật số (1x, 1.5x, 2x) để lấy nét tốt hơn */}
              <div className="scanner-zoom-box" title="Thu phóng kỹ thuật số giúp để điện thoại xa mà vẫn nét">
                <span className="scanner-zoom-label">Zoom:</span>
                {[1.0, 1.5, 2.0].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setZoomLevel(lvl)}
                    className={`scanner-zoom-btn ${zoomLevel === lvl ? 'active' : ''}`}
                  >
                    {lvl}x
                  </button>
                ))}
              </div>

              {/* Nút Tải tệp PDF hoặc ảnh mã vạch / QR */}
              <button
                type="button"
                className="btn-upload-scanner-img"
                onClick={() => fileInputRef.current?.click()}
                disabled={isDecodingImage}
                title="Tải tệp PDF phiếu mượn/trả hoặc ảnh chứa mã vạch (Code128) từ máy tính"
              >
                <ImageUp size={14} />
                <span>{isDecodingImage ? 'Đang giải mã...' : 'Tải PDF / Ảnh'}</span>
              </button>

              {/* Nút Bật lại Camera: Chỉ hiển thị khi camera chưa bật hoặc gặp lỗi */}
              {(!isCameraActive || cameraError) && (
                <button
                  type="button"
                  className="btn-upload-scanner-img"
                  onClick={() => startCamera(selectedDeviceId)}
                  disabled={isConnecting}
                  title="Thử kết nối lại camera"
                  style={{
                    background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
                    borderColor: '#a7f3d0',
                    color: '#047857'
                  }}
                >
                  <RefreshCw size={13} className={isConnecting ? 'spin-icon' : ''} />
                  <span>{isConnecting ? 'Đang kết nối...' : 'Bật lại Camera'}</span>
                </button>
              )}

              {/* Nút Đặt lại khi xem ảnh */}
              {imagePreviewUrl && (
                <button
                  type="button"
                  className="btn-reset-scanner-img"
                  onClick={handleResetImage}
                  title="Xóa ảnh hiện tại và mở lại camera"
                >
                  <RotateCcw size={13} />
                  <span>Đặt lại</span>
                </button>
              )}
            </div>

            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              accept="image/*,application/pdf,.pdf"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleProcessImage(e.target.files[0]);
                  e.target.value = '';
                }
              }}
            />
          </div>

          {/* Dòng gợi ý phím tắt dán ảnh nằm ở hàng riêng bên dưới */}
          <div className="scanner-paste-hint-row">
            <span className="scanner-paste-hint">
              Dán ảnh bằng <kbd>Ctrl + V</kbd>
            </span>
          </div>

          {/* Ô nhập liệu mã vạch (kết nối máy quét USB/Bluetooth tự động gõ vào đây) */}
          <form onSubmit={handleSubmitManual} className="scanner-input-group">
            <input
              type="text"
              autoFocus
              className="scanner-text-field"
              placeholder={
                targetField === 'reader'
                  ? 'Quét thẻ sinh viên bằng đầu đọc hoặc gõ MSSV rồi nhấn Enter...'
                  : targetField === 'catalog'
                  ? 'Quét mã bằng đầu đọc hoặc gõ mã bản sao / barcode rồi nhấn Enter...'
                  : 'Quét mã bằng đầu đọc hoặc gõ mã vạch rồi nhấn Enter...'
              }
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <button type="submit" className="btn-scanner-submit">
              {targetField === 'reader' ? 'Xác nhận' : 'Tra cứu'}
            </button>
          </form>

          {/* Danh sách các mã vạch mẫu để thủ thư kiểm thử nhanh */}
          <div className="quick-test-barcodes">
            <span className="quick-test-label">
              {targetField === 'reader'
                ? 'Bấm mã thẻ để kiểm thử quét nhanh:'
                : 'Bấm mã mẫu để kiểm thử quét nhanh:'}
            </span>
            <div className="quick-chips-row">
              {targetField === 'reader'
                ? [
                    { label: '✓ RD20260001 (Mượn OK)', code: 'RD20260001' },
                    { label: '✗ 102220184 (Nợ phạt)', code: '102220184' },
                    { label: '✗ 102230045 (Khóa thẻ)', code: '102230045' },
                    { label: '✗ 102220412 (Max 5 cuốn)', code: '102220412' }
                  ].map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      className="btn-quick-chip"
                      onClick={() => {
                        playScannerBeep(true);
                        stopCamera();
                        onScanSuccess(item.code);
                      }}
                    >
                      {item.label}
                    </button>
                  ))
                : targetField === 'catalog'
                ? [
                    { code: 'BC000001-A', label: 'BC000001-A' },
                    { code: 'BC000001-B', label: 'BC000001-B' },
                    { code: 'BC000001-C', label: 'BC000001-C' },
                    { code: 'BC000002-A', label: 'BC000002-A' },
                    { code: 'BC000003-A', label: 'BC000003-A' }
                  ].map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      className="btn-quick-chip"
                      onClick={() => {
                        playScannerBeep(true);
                        stopCamera();
                        onScanSuccess(item.code);
                      }}
                    >
                      {item.label}
                    </button>
                  ))
                : [
                    { code: 'BC000001-C', label: 'BC000001-C (Có sẵn)' },
                    { code: 'BC000002-B', label: 'BC000002-B (Có sẵn)' },
                    { code: 'BC000013-A', label: 'BC000013-A (Có sẵn)' },
                    { code: 'BC000001-A', label: 'BC000001-A (Đã mượn)' }
                  ].map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      className="btn-quick-chip"
                      onClick={() => {
                        playScannerBeep(true);
                        stopCamera();
                        onScanSuccess(item.code);
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button
            type="button"
            className="btn-modal-cancel"
            onClick={() => {
              stopCamera();
              onClose();
            }}
          >
            Hủy bỏ
          </button>
        </div>
      </div>
    </div>
  );
}
