import React, { useState, useEffect } from 'react';
import {
  Calendar,
  CircleDollarSign,
  Cpu,
  Info,
  RotateCw,
  Save,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  History,
  GraduationCap,
  Sparkles,
  User,
  Clock,
  Globe
} from 'lucide-react';
import { rulesApi } from '../api/rulesApi';
import './LibrarySettings.css';

/**
 * Component Cài đặt quy định thư viện & Cấu hình AI SmartLib AI (US-03 - LOLRA-11)
 * Thiết kế giao diện khớp 100% mẫu Figma của hệ thống
 */
export default function LibrarySettings({ user }) {
  // Tab điều hướng: 'figma_overview' (mặc định khớp ảnh), 'borrow_detail', 'fine_waiver', 'audit'
  const [activeTab, setActiveTab] = useState('figma_overview');

  // State lưu trữ dữ liệu cấu hình
  const [formData, setFormData] = useState({
    // Cột 1: Lưu thông & Mức phạt
    borrowDays_Student: 14,
    borrowDays_Teacher: 30,
    borrowLimit_MaxTogether: 5,
    borrowLimit_Student: 3,
    borrowLimit_Teacher: 8,
    maxRenewalTimes: 1,
    renewalExtraDays: 7,

    finePerDay: 2000,
    damagePenaltyText: '20% giá bìa',
    compensationText: '100% giá bìa + 20.000 VNĐ phí xử lý',
    autoLockDebtThreshold: true,
    debtLockAmount: 50000,

    // Cột 2: Cấu hình AI Early Warning
    aiRiskThreshold: 80,
    aiRemindDaysBefore: 3,
    aiAutoEmailReminder: true,

    // Chiết khấu AI & Miễn giảm
    maxFineCapPercent: 100,
    compensationRatePercent: 200,
    aiDiscount_90: 10,
    aiDiscount_100: 20
  });

  // State mô hình AI
  const [aiModelInfo, setAiModelInfo] = useState({
    name: 'Random Forest Classifier',
    accuracy: 84.5,
    lastTrained: '10/09/2026',
    status: 'Đang hoạt động'
  });

  // State danh mục lý do miễn giảm và lịch sử kiểm toán
  const [waiverReasons, setWaiverReasons] = useState([]);
  const [auditHistory, setAuditHistory] = useState([]);

  // State tương tác UI
  const [isSaving, setIsSaving] = useState(false);
  const [isRetraining, setIsRetraining] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [toastMessage, setToastMessage] = useState(null);

  // Tải dữ liệu ban đầu
  useEffect(() => {
    const loadData = async () => {
      try {
        const [rulesData, waiversData, historyData] = await Promise.all([
          rulesApi.getSystemRules(),
          rulesApi.getWaiverReasons(),
          rulesApi.getAuditHistory()
        ]);

        if (rulesData) {
          setFormData((prev) => ({ ...prev, ...rulesData }));
          if (rulesData.aiAccuracy) {
            setAiModelInfo((prev) => ({
              ...prev,
              accuracy: rulesData.aiAccuracy,
              lastTrained: rulesData.aiLastTrained || prev.lastTrained
            }));
          }
        }
        if (waiversData) setWaiverReasons(waiversData);
        if (historyData) setAuditHistory(historyData);
      } catch (err) {
        console.error('Lỗi khi tải cấu hình:', err);
      }
    };

    loadData();
  }, []);

  // Hiển thị Toast thông báo
  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Xác thực trường dữ liệu
  const validateField = (name, value) => {
    const num = Number(value);
    if (typeof value === 'number' || (typeof value === 'string' && !isNaN(num) && value.trim() !== '')) {
      if (num < 0) return 'Không được nhập số âm (< 0)';
    }
    return null;
  };

  // Xử lý thay đổi input số
  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const numValue = value === '' ? '' : Number(value);

    setFormData((prev) => ({ ...prev, [name]: numValue }));

    const error = validateField(name, numValue);
    setValidationErrors((prev) => ({ ...prev, [name]: error }));
  };

  // Xử lý thay đổi input chuỗi
  const handleTextChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Bật/tắt checkbox boolean
  const handleToggle = (fieldName) => {
    setFormData((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  // Xử lý thanh trượt ngưỡng AI
  const handleSliderChange = (e) => {
    setFormData((prev) => ({ ...prev, aiRiskThreshold: Number(e.target.value) }));
  };

  // Khôi phục giá trị chuẩn
  const handleResetDefaults = () => {
    const defaults = rulesApi.getDefaultRules();
    setFormData(defaults);
    setValidationErrors({});
    showToast('Đã khôi phục các giá trị cấu hình về mặc định!', 'info');
  };

  // Lưu cấu hình
  const handleSave = async () => {
    // Kiểm tra lỗi số âm
    let hasError = false;
    const newErrors = {};

    ['borrowDays_Student', 'borrowDays_Teacher', 'borrowLimit_MaxTogether', 'finePerDay', 'aiRemindDaysBefore'].forEach(
      (key) => {
        const err = validateField(key, formData[key]);
        if (err) {
          newErrors[key] = err;
          hasError = true;
        }
      }
    );

    if (hasError) {
      setValidationErrors(newErrors);
      showToast('Vui lòng kiểm tra lại các giá trị có lỗi!', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await rulesApi.updateSystemRules(formData);
      const updatedHistory = await rulesApi.getAuditHistory();
      setAuditHistory(updatedHistory);
      showToast('Đã lưu toàn bộ cấu hình thư viện thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Không thể lưu cấu hình. Vui lòng thử lại!', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Huấn luyện lại mô hình AI (Retrain Model)
  const handleRetrain = async () => {
    setIsRetraining(true);
    showToast('Đang khởi động tiến trình huấn luyện lại mô hình AI...', 'info');

    try {
      const res = await rulesApi.retrainAiModel();
      setAiModelInfo({
        name: res.modelName || 'Random Forest Classifier',
        accuracy: res.accuracy || 85.2,
        lastTrained: res.lastTrained || new Date().toLocaleDateString('vi-VN'),
        status: 'Đang hoạt động'
      });
      showToast(`Huấn luyện hoàn tất! Độ chính xác mới: ${res.accuracy}%`, 'success');
    } catch {
      showToast('Lỗi khi kết nối hệ thống huấn luyện AI!', 'error');
    } finally {
      setIsRetraining(false);
    }
  };

  // Kiểm tra cảnh báo mức phạt trễ > 20.000 VNĐ
  const isFineHighWarning = Number(formData.finePerDay) > 20000;

  return (
    <div className="settings-wrapper">
      {/* --------------------------------------------------------------------
          1. BANNER THÔNG BÁO XANH NHẠT (ĐÚNG 100% ẢNH FIGMA)
          -------------------------------------------------------------------- */}
      <div className="settings-info-banner">
        <Info size={18} className="settings-info-banner-icon" />
        <span>Các thay đổi sẽ áp dụng cho toàn bộ thư viện sau khi lưu cấu hình.</span>
      </div>

      {/* --------------------------------------------------------------------
          2. THANH 4 SUB-TABS NHỎ GỌN & NÚT THAO TÁC LƯU
          -------------------------------------------------------------------- */}
      <div className="settings-top-bar">
        <div className="settings-subtabs-nav">
          <button
            type="button"
            className={`subtab-btn ${activeTab === 'figma_overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('figma_overview')}
          >
            <Sliders size={15} />
            <span>Cấu hình chung & AI (Figma)</span>
          </button>

          <button
            type="button"
            className={`subtab-btn ${activeTab === 'borrow_detail' ? 'active' : ''}`}
            onClick={() => setActiveTab('borrow_detail')}
          >
            <GraduationCap size={15} />
            <span>Hạn mượn & Gia hạn</span>
          </button>

          <button
            type="button"
            className={`subtab-btn ${activeTab === 'fine_waiver' ? 'active' : ''}`}
            onClick={() => setActiveTab('fine_waiver')}
          >
            <Sparkles size={15} />
            <span>Chiết khấu AI & Miễn giảm</span>
          </button>

          <button
            type="button"
            className={`subtab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <History size={15} />
            <span>Nhật ký kiểm toán</span>
            <span className="subtab-counter">{auditHistory.length}</span>
          </button>
        </div>

        <div className="settings-actions-group">
          <button
            type="button"
            className="btn-ghost-reset"
            onClick={handleResetDefaults}
            disabled={isSaving}
          >
            <RotateCcw size={14} />
            <span>Khôi phục mặc định</span>
          </button>

          <button
            type="button"
            className="btn-primary-save"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <RotateCw size={15} className="spinner-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>Lưu cấu hình</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------------------
          3. TAB 1: BỐ CỤC 2 CỘT CHUẨN XÁC MẪU FIGMA
          -------------------------------------------------------------------- */}
      {activeTab === 'figma_overview' && (
        <div className="figma-two-columns-layout">
          {/* ==================== CỘT TRÁI: QUY ĐỊNH LƯU THÔNG & MỨC PHẠT ==================== */}
          <div className="figma-column">
            <h4 className="column-group-title">QUY ĐỊNH LƯU THÔNG & MỨC PHẠT</h4>

            {/* Card 1: Thời hạn mượn sách mặc định */}
            <div className="figma-card">
              <div className="figma-card-header">
                <div className="figma-card-icon-box">
                  <Calendar size={20} />
                </div>
                <h3 className="figma-card-title">Thời hạn mượn sách mặc định</h3>
              </div>

              {/* Hàng 1: Sinh viên & Giảng viên */}
              <div className="input-row-2col">
                <div className="figma-form-item">
                  <label className="figma-field-label" htmlFor="borrowDays_Student">
                    Sinh viên
                  </label>
                  <div className="figma-input-wrapper">
                    <input
                      id="borrowDays_Student"
                      name="borrowDays_Student"
                      type="number"
                      min="0"
                      className={`figma-input-control ${validationErrors.borrowDays_Student ? 'has-error' : ''}`}
                      value={formData.borrowDays_Student}
                      onChange={handleNumberChange}
                    />
                    <span className="figma-input-tag">ngày</span>
                  </div>
                  {validationErrors.borrowDays_Student && (
                    <span className="figma-error-hint">
                      <AlertTriangle size={12} /> {validationErrors.borrowDays_Student}
                    </span>
                  )}
                </div>

                <div className="figma-form-item">
                  <label className="figma-field-label" htmlFor="borrowDays_Teacher">
                    Giảng viên
                  </label>
                  <div className="figma-input-wrapper">
                    <input
                      id="borrowDays_Teacher"
                      name="borrowDays_Teacher"
                      type="number"
                      min="0"
                      className={`figma-input-control ${validationErrors.borrowDays_Teacher ? 'has-error' : ''}`}
                      value={formData.borrowDays_Teacher}
                      onChange={handleNumberChange}
                    />
                    <span className="figma-input-tag">ngày</span>
                  </div>
                  {validationErrors.borrowDays_Teacher && (
                    <span className="figma-error-hint">
                      <AlertTriangle size={12} /> {validationErrors.borrowDays_Teacher}
                    </span>
                  )}
                </div>
              </div>

              {/* Hàng 2: Số sách tối đa được mượn cùng lúc */}
              <div className="figma-form-item">
                <label className="figma-field-label" htmlFor="borrowLimit_MaxTogether">
                  Số sách tối đa được mượn cùng lúc
                </label>
                <div className="figma-input-wrapper">
                  <input
                    id="borrowLimit_MaxTogether"
                    name="borrowLimit_MaxTogether"
                    type="number"
                    min="0"
                    className={`figma-input-control ${validationErrors.borrowLimit_MaxTogether ? 'has-error' : ''}`}
                    value={formData.borrowLimit_MaxTogether}
                    onChange={handleNumberChange}
                  />
                  <span className="figma-input-tag">cuốn</span>
                </div>
                {validationErrors.borrowLimit_MaxTogether && (
                  <span className="figma-error-hint">
                    <AlertTriangle size={12} /> {validationErrors.borrowLimit_MaxTogether}
                  </span>
                )}
              </div>
            </div>

            {/* Card 2: Khung tính phí phạt vi phạm */}
            <div className="figma-card">
              <div className="figma-card-header">
                <div className="figma-card-icon-box">
                  <CircleDollarSign size={20} />
                </div>
                <h3 className="figma-card-title">Khung tính phí phạt vi phạm</h3>
              </div>

              {/* Phí phạt trễ hạn */}
              <div className="figma-form-item">
                <label className="figma-field-label" htmlFor="finePerDay">
                  Phí phạt trễ hạn
                </label>
                <div className="figma-input-wrapper">
                  <input
                    id="finePerDay"
                    name="finePerDay"
                    type="number"
                    step="500"
                    min="0"
                    className={`figma-input-control ${validationErrors.finePerDay ? 'has-error' : ''}`}
                    value={formData.finePerDay}
                    onChange={handleNumberChange}
                  />
                  <span className="figma-input-tag">VNĐ / cuốn / ngày</span>
                </div>
                {validationErrors.finePerDay && (
                  <span className="figma-error-hint">
                    <AlertTriangle size={12} /> {validationErrors.finePerDay}
                  </span>
                )}
                {isFineHighWarning && (
                  <div className="fine-warning-box">
                    <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 2, color: '#d97706' }} />
                    <span>Cảnh báo: Mức phạt trễ hạn đang thiết lập ở mức cao bất thường.</span>
                  </div>
                )}
              </div>

              {/* Mức phạt làm rách / hỏng sách nhẹ */}
              <div className="figma-form-item">
                <label className="figma-field-label" htmlFor="damagePenaltyText">
                  Mức phạt làm rách / hỏng sách nhẹ
                </label>
                <div className="figma-input-wrapper">
                  <input
                    id="damagePenaltyText"
                    name="damagePenaltyText"
                    type="text"
                    className="figma-input-control"
                    value={formData.damagePenaltyText}
                    onChange={handleTextChange}
                  />
                </div>
              </div>

              {/* Mức đền bù mất sách / hỏng hoàn toàn */}
              <div className="figma-form-item">
                <label className="figma-field-label" htmlFor="compensationText">
                  Mức đền bù mất sách / hỏng hoàn toàn
                </label>
                <div className="figma-input-wrapper">
                  <input
                    id="compensationText"
                    name="compensationText"
                    type="text"
                    className="figma-input-control"
                    value={formData.compensationText}
                    onChange={handleTextChange}
                  />
                </div>
              </div>

              {/* Dòng Toggle Khóa mượn nợ phạt */}
              <div className="toggle-switch-card">
                <span className="toggle-switch-text">
                  Tự động khóa quyền mượn khi tiền phạt nợ vượt quá 50.000 VNĐ
                </span>
                <label className="custom-switch" title="Tự động khóa khi nợ phạt vượt ngưỡng">
                  <input
                    type="checkbox"
                    checked={formData.autoLockDebtThreshold}
                    onChange={() => handleToggle('autoLockDebtThreshold')}
                  />
                  <span className="slider-knob"></span>
                </label>
              </div>
            </div>
          </div>

          {/* ==================== CỘT PHẢI: CẤU HÌNH MÔ HÌNH AI DỰ BÁO TRỄ HẠN ==================== */}
          <div className="figma-column">
            <h4 className="column-group-title">CẤU HÌNH MÔ HÌNH AI DỰ BÁO TRỄ HẠN</h4>

            {/* Card 3: Tham số cảnh báo AI Early Warning */}
            <div className="figma-card">
              <div className="figma-card-header">
                <div className="figma-card-icon-box">
                  <Cpu size={20} />
                </div>
                <h3 className="figma-card-title">Tham số cảnh báo AI Early Warning</h3>
              </div>

              {/* Thanh kéo Slider Ngưỡng kích hoạt rủi ro cao */}
              <div className="ai-slider-wrapper">
                <div className="ai-slider-header">
                  <span className="ai-slider-title">Ngưỡng kích hoạt rủi ro cao (High Risk Threshold)</span>
                  <span className="ai-slider-value-badge">{formData.aiRiskThreshold}%</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  className="ai-range-input"
                  value={formData.aiRiskThreshold}
                  onChange={handleSliderChange}
                />

                <div className="ai-slider-scale">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Số ngày gửi nhắc nhở trước khi đến hạn */}
              <div className="figma-form-item">
                <label className="figma-field-label" htmlFor="aiRemindDaysBefore">
                  Số ngày gửi nhắc nhở trước khi đến hạn
                </label>
                <div className="figma-input-wrapper">
                  <input
                    id="aiRemindDaysBefore"
                    name="aiRemindDaysBefore"
                    type="number"
                    min="1"
                    className={`figma-input-control ${validationErrors.aiRemindDaysBefore ? 'has-error' : ''}`}
                    value={formData.aiRemindDaysBefore}
                    onChange={handleNumberChange}
                  />
                  <span className="figma-input-tag">ngày</span>
                </div>
                {validationErrors.aiRemindDaysBefore && (
                  <span className="figma-error-hint">
                    <AlertTriangle size={12} /> {validationErrors.aiRemindDaysBefore}
                  </span>
                )}
              </div>

              {/* Dòng Toggle Gửi email */}
              <div className="toggle-switch-card-transparent">
                <span className="toggle-switch-text">
                  Tự động gửi email thông báo nhắc trả khi AI dự báo rủi ro &gt; 75%
                </span>
                <label className="custom-switch" title="Tự động gửi email nhắc nhở">
                  <input
                    type="checkbox"
                    checked={formData.aiAutoEmailReminder}
                    onChange={() => handleToggle('aiAutoEmailReminder')}
                  />
                  <span className="slider-knob"></span>
                </label>
              </div>

              {/* Khối Thẻ Trạng thái & Huấn luyện lại Mô hình AI */}
              <div className="ai-model-status-card">
                <div className="ai-model-top-line">
                  <span className="ai-model-label">Mô hình đang chạy</span>
                  <span className="ai-model-status-active">
                    <span>●</span> {aiModelInfo.status}
                  </span>
                </div>

                <h4 className="ai-model-name-title">{aiModelInfo.name}</h4>
                <p className="ai-model-detail-row">
                  Độ chính xác hiện tại: <strong>{aiModelInfo.accuracy}%</strong>
                </p>
                <p className="ai-model-date-row">
                  Lần huấn luyện gần nhất: {aiModelInfo.lastTrained}
                </p>

                <button
                  type="button"
                  className="btn-retrain-outline"
                  onClick={handleRetrain}
                  disabled={isRetraining}
                >
                  <RotateCw size={15} className={isRetraining ? 'spinner-spin' : ''} />
                  <span>
                    {isRetraining ? 'Đang huấn luyện lại...' : 'Huấn luyện lại mô hình (Retrain Model)'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          4. TAB 2: HẠN MƯỢN & GIA HẠN NÂNG CAO
          -------------------------------------------------------------------- */}
      {activeTab === 'borrow_detail' && (
        <div className="subtab-detail-container">
          <div className="subtab-grid-3col">
            <div className="figma-card">
              <div className="figma-card-header">
                <div className="figma-card-icon-box">
                  <GraduationCap size={20} />
                </div>
                <h3 className="figma-card-title">Hạn mức Bạn đọc Sinh viên</h3>
              </div>
              <div className="figma-form-item">
                <label className="figma-field-label">Số sách mượn tối đa</label>
                <div className="figma-input-wrapper">
                  <input
                    name="borrowLimit_Student"
                    type="number"
                    className="figma-input-control"
                    value={formData.borrowLimit_Student}
                    onChange={handleNumberChange}
                  />
                  <span className="figma-input-tag">cuốn</span>
                </div>
              </div>
              <div className="figma-form-item">
                <label className="figma-field-label">Số ngày mượn tiêu chuẩn</label>
                <div className="figma-input-wrapper">
                  <input
                    name="borrowDays_Student"
                    type="number"
                    className="figma-input-control"
                    value={formData.borrowDays_Student}
                    onChange={handleNumberChange}
                  />
                  <span className="figma-input-tag">ngày</span>
                </div>
              </div>
            </div>

            <div className="figma-card">
              <div className="figma-card-header">
                <div className="figma-card-icon-box">
                  <User size={20} />
                </div>
                <h3 className="figma-card-title">Hạn mức Cán bộ & Giảng viên</h3>
              </div>
              <div className="figma-form-item">
                <label className="figma-field-label">Số sách mượn tối đa</label>
                <div className="figma-input-wrapper">
                  <input
                    name="borrowLimit_Teacher"
                    type="number"
                    className="figma-input-control"
                    value={formData.borrowLimit_Teacher}
                    onChange={handleNumberChange}
                  />
                  <span className="figma-input-tag">cuốn</span>
                </div>
              </div>
              <div className="figma-form-item">
                <label className="figma-field-label">Số ngày mượn tiêu chuẩn</label>
                <div className="figma-input-wrapper">
                  <input
                    name="borrowDays_Teacher"
                    type="number"
                    className="figma-input-control"
                    value={formData.borrowDays_Teacher}
                    onChange={handleNumberChange}
                  />
                  <span className="figma-input-tag">ngày</span>
                </div>
              </div>
            </div>

            <div className="figma-card">
              <div className="figma-card-header">
                <div className="figma-card-icon-box">
                  <RotateCcw size={20} />
                </div>
                <h3 className="figma-card-title">Chính sách Gia hạn</h3>
              </div>
              <div className="figma-form-item">
                <label className="figma-field-label">Số lần gia hạn tối đa</label>
                <div className="figma-input-wrapper">
                  <input
                    name="maxRenewalTimes"
                    type="number"
                    className="figma-input-control"
                    value={formData.maxRenewalTimes}
                    onChange={handleNumberChange}
                  />
                  <span className="figma-input-tag">lần</span>
                </div>
              </div>
              <div className="figma-form-item">
                <label className="figma-field-label">Số ngày thêm mỗi lần</label>
                <div className="figma-input-wrapper">
                  <input
                    name="renewalExtraDays"
                    type="number"
                    className="figma-input-control"
                    value={formData.renewalExtraDays}
                    onChange={handleNumberChange}
                  />
                  <span className="figma-input-tag">ngày</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          5. TAB 3: CHIẾT KHẤU AI & MIỄN GIẢM THỦ CÔNG
          -------------------------------------------------------------------- */}
      {activeTab === 'fine_waiver' && (
        <div className="subtab-detail-container">
          <div className="figma-two-columns-layout">
            <div className="figma-card">
              <div className="figma-card-header">
                <div className="figma-card-icon-box">
                  <Sparkles size={20} />
                </div>
                <h3 className="figma-card-title">Giảm trừ theo Điểm Rèn luyện AI</h3>
              </div>

              <div className="figma-form-item">
                <label className="figma-field-label">Mốc điểm tín nhiệm ≥ 90</label>
                <div className="figma-input-wrapper">
                  <input
                    name="aiDiscount_90"
                    type="number"
                    className="figma-input-control"
                    value={formData.aiDiscount_90}
                    onChange={handleNumberChange}
                  />
                  <span className="figma-input-tag">% giảm trừ</span>
                </div>
              </div>

              <div className="figma-form-item">
                <label className="figma-field-label">Mốc điểm tín nhiệm tuyệt đối = 100</label>
                <div className="figma-input-wrapper">
                  <input
                    name="aiDiscount_100"
                    type="number"
                    className="figma-input-control"
                    value={formData.aiDiscount_100}
                    onChange={handleNumberChange}
                  />
                  <span className="figma-input-tag">% giảm trừ</span>
                </div>
              </div>
            </div>

            <div className="figma-card">
              <div className="figma-card-header">
                <div className="figma-card-icon-box">
                  <Info size={20} />
                </div>
                <h3 className="figma-card-title">Danh mục lý do miễn giảm thủ công</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {waiverReasons.map((item) => (
                  <div key={item.id} className="toggle-switch-card">
                    <div>
                      <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#2563eb', fontWeight: 700 }}>
                        {item.reasonCode}
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                        {item.reasonName}
                      </div>
                      <div style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>
                        Giảm {item.defaultDiscountPercent}%
                      </div>
                    </div>
                    <label className="custom-switch">
                      <input
                        type="checkbox"
                        checked={item.isActive}
                        onChange={() =>
                          setWaiverReasons((prev) =>
                            prev.map((w) => (w.id === item.id ? { ...w, isActive: !w.isActive } : w))
                          )
                        }
                      />
                      <span className="slider-knob"></span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          6. TAB 4: NHẬT KÝ KIỂM TOÁN (AUDIT TRAIL)
          -------------------------------------------------------------------- */}
      {activeTab === 'audit' && (
        <div className="figma-card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0' }}>
            <h3 className="figma-card-title">Lịch sử thay đổi quy định hệ thống (Audit Trail)</h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>
              Ghi nhận đầy đủ vết thời gian, tài khoản quản trị và địa chỉ IP theo tiêu chuẩn bảo mật.
            </p>
          </div>

          <div style={{ overflowX: 'auto', width: '100%' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 18px', color: '#475569', fontWeight: 600 }}>Thời gian</th>
                  <th style={{ padding: '12px 18px', color: '#475569', fontWeight: 600 }}>Người thực hiện</th>
                  <th style={{ padding: '12px 18px', color: '#475569', fontWeight: 600 }}>Quy định điều chỉnh</th>
                  <th style={{ padding: '12px 18px', color: '#475569', fontWeight: 600 }}>Giá trị cũ</th>
                  <th style={{ padding: '12px 18px', color: '#475569', fontWeight: 600 }}>Giá trị mới</th>
                  <th style={{ padding: '12px 18px', color: '#475569', fontWeight: 600 }}>Địa chỉ IP</th>
                </tr>
              </thead>
              <tbody>
                {auditHistory.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 18px', color: '#64748b', fontFamily: 'monospace' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} style={{ color: '#94a3b8' }} />
                        <span>{item.changedAt}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 18px', fontWeight: 600, color: '#0f172a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={13} style={{ color: '#2563eb' }} />
                        <span>{item.changedBy}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 18px', fontWeight: 600 }}>{item.ruleName}</td>
                    <td style={{ padding: '12px 18px', color: '#94a3b8', textDecoration: 'line-through' }}>
                      {item.oldValue}
                    </td>
                    <td style={{ padding: '12px 18px', color: '#059669', fontWeight: 700 }}>
                      {item.newValue}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Globe size={12} style={{ color: '#94a3b8' }} />
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          {item.ipAddress}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          7. TOAST NOTIFICATION
          -------------------------------------------------------------------- */}
      {toastMessage && (
        <div className={`figma-toast toast-${toastMessage.type}`}>
          {toastMessage.type === 'success' ? (
            <CheckCircle2 size={18} style={{ color: '#10b981' }} />
          ) : toastMessage.type === 'error' ? (
            <AlertTriangle size={18} style={{ color: '#ef4444' }} />
          ) : (
            <Info size={18} style={{ color: '#3b82f6' }} />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}
