import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  Globe,
  Plus,
  X,
  Search,
  Zap,
  ShieldCheck,
  Layers,
  Activity,
  Undo2,
  Calculator,
  Award,
  ShieldAlert,
  TrendingUp,
  BarChart2,
  Crown,
  Gem
} from 'lucide-react';
import { rulesApi } from '../api/rulesApi';
import TablePagination from '../components/common/TablePagination';
import './LibrarySettings.css';

/**
 * Component Cài đặt quy định thư viện & Cấu hình AI SmartLib AI (US-03 - LOLRA-11)
 * Thiết kế giao diện khớp 100% mẫu Figma của hệ thống, đồng bộ URL sub-routes
 */
export default function LibrarySettings({ user, subTab: propSubTab }) {
  const navigate = useNavigate();
  const location = useLocation();

  // Mapping giữa đường dẫn URL và key giao diện
  // /settings/general -> 'figma_overview'
  // /settings/borrow  -> 'borrow_detail'
  // /settings/fines   -> 'fine_waiver'
  // /settings/audit   -> 'audit'
  const getActiveTabFromUrl = () => {
    const parts = location.pathname.replace(/^\//, '').split('/');
    const sub = propSubTab || parts[1] || 'general';
    if (sub === 'borrow') return 'borrow_detail';
    if (sub === 'fines') return 'fine_waiver';
    if (sub === 'audit') return 'audit';
    return 'figma_overview';
  };

  const activeTab = getActiveTabFromUrl();

  // Chuyển tab và cập nhật URL trình duyệt tương ứng
  const handleTabNavigate = (tabKey) => {
    let targetPath = '/settings/general';
    if (tabKey === 'borrow_detail') targetPath = '/settings/borrow';
    if (tabKey === 'fine_waiver') targetPath = '/settings/fines';
    if (tabKey === 'audit') targetPath = '/settings/audit';

    navigate(targetPath);
  };

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
    damagePenaltyPercent: 30,
    damageMediumPercent: 40,
    damageSeverePercent: 110,
    compensationBasePercent: 110,
    compensationFixedFee: 0,
    damagePenaltyText: '30% giá bìa',
    damageMediumText: '40% giá bìa',
    damageSevereText: '110% giá bìa',
    compensationText: '110% giá bìa',
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

  // State thêm lý do miễn giảm mới (Ảnh 22)
  const [isAddWaiverModalOpen, setIsAddWaiverModalOpen] = useState(false);
  const [isAddingWaiver, setIsAddingWaiver] = useState(false);
  const [newWaiverForm, setNewWaiverForm] = useState({
    reasonCode: '',
    reasonName: '',
    defaultDiscountPercent: 100
  });

  // State sao lưu dữ liệu gốc để theo dõi thay đổi chưa lưu (Dirty Form Tracking)
  const [initialFormData, setInitialFormData] = useState(null);

  // State Modal xác nhận khôi phục mặc định an toàn (thay thế window.confirm)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // State phân trang & tìm kiếm cho Tab Nhật ký kiểm toán (Audit Trail)
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(10);

  // State giá sách mẫu mô phỏng tiền phạt (Live Penalty Simulator)
  const [simulatedBookPrice, setSimulatedBookPrice] = useState(100000);

  // State tương tác UI
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isRetraining, setIsRetraining] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [toastMessage, setToastMessage] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Kiểm tra biểu mẫu có thay đổi chưa lưu (isDirty)
  const isDirty = Boolean(
    initialFormData && JSON.stringify(formData) !== JSON.stringify(initialFormData)
  );

  // Tải dữ liệu ban đầu
  const loadData = async () => {
    setIsLoadingData(true);
    setLoadError(null);
    try {
      const [rulesData, waiversData, historyData] = await Promise.all([
        rulesApi.getSystemRules(true, true),
        rulesApi.getWaiverReasons(),
        rulesApi.getAuditHistory()
      ]);

      if (rulesData) {
        const damagePercent = rulesData.damagePenaltyPercent ?? 30;
        const damageMed = rulesData.damageMediumPercent ?? 40;
        const damageSev = rulesData.damageSeverePercent ?? 110;
        const compPercent = rulesData.compensationBasePercent ?? 110;

        const studentLimit = rulesData.borrowLimit_Student ?? rulesData.borrowLimit_MaxTogether ?? 5;
        const loadedData = {
          ...formData,
          ...rulesData,
          borrowLimit_Student: studentLimit,
          borrowLimit_MaxTogether: studentLimit,
          damagePenaltyPercent: damagePercent,
          damageMediumPercent: damageMed,
          damageSeverePercent: damageSev,
          compensationBasePercent: compPercent,
          compensationFixedFee: 0,
          damagePenaltyText: `${damagePercent}% giá bìa`,
          damageMediumText: `${damageMed}% giá bìa`,
          damageSevereText: `${damageSev}% giá bìa`,
          compensationText: `${compPercent}% giá bìa`
        };

        setFormData(loadedData);
        setInitialFormData(JSON.parse(JSON.stringify(loadedData)));

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
      console.error('Lỗi khi tải cấu hình quy chế từ máy chủ:', err);
      const serverMsg =
        err.response?.data?.message ||
        (err.response?.status
          ? `Máy chủ trả về mã lỗi HTTP ${err.response.status}`
          : err.message || 'Không thể kết nối đến máy chủ quy chế');
      setLoadError(serverMsg);
      showToast(`Không thể tải quy chế từ máy chủ: ${serverMsg}`, 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Hiển thị Toast thông báo
  const showToast = (text, type = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Trích xuất số thực từ chuỗi hoặc số (hỗ trợ nhập số âm, ký tự %, chuỗi như "-20%", "30% giá bìa")
  const extractNumber = (val) => {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return isNaN(val) ? null : val;
    const match = String(val).match(/-?\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  };

  // Tính số tiền phạt mô phỏng dựa trên % và giá sách mẫu
  const calcSimulatedPenalty = (textVal, price) => {
    const num = extractNumber(textVal);
    if (num === null || isNaN(num) || num < 0) return 0;
    return Math.round((price * num) / 100);
  };

  // Xác thực trường dữ liệu tức thời (kiểm tra không được nhập số âm < 0)
  const validateField = (name, value) => {
    const num = extractNumber(value);
    if (num !== null && num < 0) {
      return 'Không được nhập số âm (< 0)';
    }
    return null;
  };

  // Xử lý thay đổi input số
  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    const numValue = value === '' ? '' : Number(value);

    setFormData((prev) => {
      const updated = { ...prev, [name]: numValue };
      // Đồng bộ hai trường hạn mức mượn của sinh viên để không bị đè giá trị
      if (name === 'borrowLimit_Student') {
        updated.borrowLimit_MaxTogether = numValue;
      }
      return updated;
    });

    const error = validateField(name, numValue);
    setValidationErrors((prev) => ({ ...prev, [name]: error }));
  };

  // Xử lý thay đổi input chuỗi (Mức phạt rách/hỏng nhẹ, vừa, nặng và Đền bù mất sách)
  const handleTextChange = (e) => {
    const { name, value } = e.target;
    const parsedNum = extractNumber(value);

    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      // Tự động đồng bộ số phần trăm sang trường tương ứng để lưu CSDL FineRules
      if (name === 'damagePenaltyText' && parsedNum !== null && parsedNum >= 0) {
        updated.damagePenaltyPercent = parsedNum;
      }
      if (name === 'damageMediumText' && parsedNum !== null && parsedNum >= 0) {
        updated.damageMediumPercent = parsedNum;
      }
      if (name === 'damageSevereText' && parsedNum !== null && parsedNum >= 0) {
        updated.damageSeverePercent = parsedNum;
      }
      if (name === 'compensationText' && parsedNum !== null && parsedNum >= 0) {
        updated.compensationBasePercent = parsedNum;
      }
      return updated;
    });

    const error = validateField(name, value);
    setValidationErrors((prev) => ({ ...prev, [name]: error }));
  };

  // Bật/tắt checkbox boolean
  const handleToggle = (fieldName) => {
    setFormData((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  // Xử lý thanh trượt ngưỡng AI
  const handleSliderChange = (e) => {
    setFormData((prev) => ({ ...prev, aiRiskThreshold: Number(e.target.value) }));
  };

  // Mở modal xác nhận khôi phục mặc định (L0LRA-21)
  const handleResetDefaults = () => {
    setIsResetModalOpen(true);
  };

  // Hoàn tác mọi thay đổi chưa lưu
  const handleCancelChanges = () => {
    if (initialFormData) {
      setFormData(JSON.parse(JSON.stringify(initialFormData)));
      setValidationErrors({});
      showToast('Đã hoàn tác các thay đổi chưa lưu!', 'info');
    }
  };

  // Thực thi khôi phục giá trị chuẩn hệ thống qua API khi người dùng xác nhận
  const executeResetDefaults = async () => {
    setIsResetting(true);
    try {
      const res = await rulesApi.resetDefaultRules();
      const targetData = res || rulesApi.getDefaultRules();
      const damagePercent = targetData.damagePenaltyPercent ?? 30;
      const damageMed = targetData.damageMediumPercent ?? 40;
      const damageSev = targetData.damageSeverePercent ?? 110;
      const compPercent = targetData.compensationBasePercent ?? 110;

      const resetData = {
        ...targetData,
        damagePenaltyPercent: damagePercent,
        damageMediumPercent: damageMed,
        damageSeverePercent: damageSev,
        compensationBasePercent: compPercent,
        compensationFixedFee: 0,
        damagePenaltyText: `${damagePercent}% giá bìa`,
        damageMediumText: `${damageMed}% giá bìa`,
        damageSevereText: `${damageSev}% giá bìa`,
        compensationText: `${compPercent}% giá bìa`
      };

      setFormData(resetData);
      setInitialFormData(JSON.parse(JSON.stringify(resetData)));
      setValidationErrors({});
      setIsResetModalOpen(false);

      // Tự động làm mới lịch sử kiểm toán sau khi reset
      const updatedHistory = await rulesApi.getAuditHistory();
      setAuditHistory(updatedHistory);
      showToast('Đã khôi phục quy định thư viện về mặc định chuẩn thành công!', 'success');
    } catch (err) {
      console.error(err);
      const serverMsg =
        err.response?.data?.message ||
        (err.response?.status === 401 || err.response?.status === 403
          ? 'Cần đăng nhập quyền Admin/Staff (tài khoản khoanv) để khôi phục cấu hình.'
          : 'Không thể khôi phục cấu hình mặc định. Vui lòng thử lại!');
      showToast(serverMsg, 'error');
    } finally {
      setIsResetting(false);
    }
  };

  // Lưu cấu hình
  const handleSave = async () => {
    // Kiểm tra lỗi số âm toàn diện (BUG-02 & BUG-05)
    let hasError = false;
    const newErrors = {};

    [
      'borrowDays_Student',
      'borrowDays_Teacher',
      'borrowLimit_MaxTogether',
      'borrowLimit_Student',
      'borrowLimit_Teacher',
      'maxRenewalTimes',
      'renewalExtraDays',
      'finePerDay',
      'damagePenaltyText',
      'damageMediumText',
      'damageSevereText',
      'compensationText',
      'debtLockAmount',
      'aiRemindDaysBefore',
      'aiDiscount_90',
      'aiDiscount_100'
    ].forEach((key) => {
      const err = validateField(key, formData[key]);
      if (err) {
        newErrors[key] = err;
        hasError = true;
      }
    });

    if (hasError) {
      setValidationErrors(newErrors);
      showToast('Vui lòng kiểm tra lại các giá trị có lỗi (không được nhập số âm)!', 'error');
      return;
    }

    setIsSaving(true);
    try {
      // Đồng bộ tỷ lệ phần trăm từ chuỗi nhập để gửi lên CSDL FineRules (BUG-05)
      const parsedDamage = extractNumber(formData.damagePenaltyText);
      const parsedMedium = extractNumber(formData.damageMediumText);
      const parsedSevere = extractNumber(formData.damageSevereText);
      const parsedCompensation = extractNumber(formData.compensationText);
      const payload = {
        ...formData,
        borrowLimit_MaxTogether: formData.borrowLimit_Student ?? formData.borrowLimit_MaxTogether,
        damagePenaltyPercent: (parsedDamage !== null && parsedDamage >= 0) ? parsedDamage : formData.damagePenaltyPercent,
        damageMediumPercent: (parsedMedium !== null && parsedMedium >= 0) ? parsedMedium : (formData.damageMediumPercent ?? 40),
        damageSeverePercent: (parsedSevere !== null && parsedSevere >= 0) ? parsedSevere : (formData.damageSeverePercent ?? 110),
        compensationBasePercent: (parsedCompensation !== null && parsedCompensation >= 0) ? parsedCompensation : formData.compensationBasePercent
      };

      await rulesApi.updateSystemRules(payload);
      // Lưu bộ nhớ cục bộ đồng bộ trạng thái hiển thị
      localStorage.setItem('smartlib_rules_data', JSON.stringify(payload));
      // Cập nhật initialFormData để xóa cờ Dirty Form
      setInitialFormData(JSON.parse(JSON.stringify(payload)));

      const updatedHistory = await rulesApi.getAuditHistory();
      setAuditHistory(updatedHistory);
      // Thông báo lưu thành công sẽ tự động ẩn sau 3.5s (Thay thế banner cố định theo Ảnh 23)
      showToast('Đã lưu cấu hình thư viện thành công! Các thay đổi đã được áp dụng cho toàn bộ hệ thống.', 'success');
    } catch (err) {
      console.error(err);
      const errorList = err.response?.data?.errors;
      const serverMsg =
        (Array.isArray(errorList) && errorList.length > 0)
          ? errorList.join(' | ')
          : err.response?.data?.message ||
          (err.response?.status === 401 || err.response?.status === 403
            ? 'Cần đăng nhập quyền Admin/Staff (tài khoản khoanv) để lưu cấu hình vào CSDL.'
            : 'Không thể lưu cấu hình. Vui lòng kiểm tra kết nối mạng hoặc thử lại!');
      showToast(serverMsg, 'error');
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

  // Xử lý thêm lý do miễn giảm mới (Ảnh 22)
  const handleAddWaiver = async (e) => {
    e.preventDefault();
    if (!newWaiverForm.reasonName.trim()) {
      showToast('Vui lòng nhập tên lý do miễn giảm!', 'error');
      return;
    }

    setIsAddingWaiver(true);
    try {
      const code = newWaiverForm.reasonCode.trim() || `WR-${Date.now().toString().slice(-4)}`;
      const payload = {
        reasonCode: code.toUpperCase(),
        reasonName: newWaiverForm.reasonName.trim(),
        defaultDiscountPercent: Number(newWaiverForm.defaultDiscountPercent) || 100,
        isActive: true
      };

      const res = await rulesApi.addWaiverReason(payload);
      setWaiverReasons((prev) => [...prev, res || { id: Date.now(), ...payload }]);
      setIsAddWaiverModalOpen(false);
      setNewWaiverForm({ reasonCode: '', reasonName: '', defaultDiscountPercent: 100 });
      showToast('Đã thêm lý do miễn giảm mới thành công!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Không thể thêm lý do miễn giảm. Vui lòng thử lại!', 'error');
    } finally {
      setIsAddingWaiver(false);
    }
  };

  // Kiểm tra cảnh báo mức phạt trễ > 20.000 VNĐ
  const isFineHighWarning = Number(formData.finePerDay) > 20000;

  return (
    <div className="settings-wrapper">
      {/* Cảnh báo lỗi tải cấu hình quy chế từ máy chủ nếu có (BUG-036 & US-10.4) */}
      {loadError && (
        <div
          className="rules-load-error-alert"
          style={{
            backgroundColor: '#fff1f2',
            border: '1px solid #fecdd3',
            borderLeft: '4px solid #e11d48',
            borderRadius: '8px',
            padding: '12px 18px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertTriangle size={20} color="#e11d48" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: '#9f1239', fontSize: '13.5px' }}>
                Lỗi tải cấu hình quy chế từ máy chủ (GET /api/rules)
              </div>
              <div style={{ fontSize: '12.5px', color: '#be123c', marginTop: '2px' }}>
                {loadError}. Hệ thống không tự ý áp dụng dữ liệu mặc định làm chính sách hiệu lực. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="btn-retry-load"
            onClick={loadData}
            style={{
              backgroundColor: '#e11d48',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RotateCw size={13} className={isLoadingData ? 'spinner-spin' : ''} />
            <span>Tải lại</span>
          </button>
        </div>
      )}

      {/* --------------------------------------------------------------------
          1. THANH 4 SUB-TABS NHỎ GỌN & NÚT THAO TÁC LƯU
          (Đã loại bỏ banner tĩnh cố định theo đề xuất Ảnh 23)
          -------------------------------------------------------------------- */}
      <div className="settings-top-bar">
        <div className="settings-subtabs-nav">
          <button
            type="button"
            className={`subtab-btn ${activeTab === 'figma_overview' ? 'active' : ''}`}
            onClick={() => handleTabNavigate('figma_overview')}
          >
            <Sliders size={15} />
            <span>Cấu hình chung & AI</span>
          </button>

          <button
            type="button"
            className={`subtab-btn ${activeTab === 'borrow_detail' ? 'active' : ''}`}
            onClick={() => handleTabNavigate('borrow_detail')}
          >
            <GraduationCap size={15} />
            <span>Hạn mượn & Gia hạn</span>
          </button>

          <button
            type="button"
            className={`subtab-btn ${activeTab === 'fine_waiver' ? 'active' : ''}`}
            onClick={() => handleTabNavigate('fine_waiver')}
          >
            <Sparkles size={15} />
            <span>Chiết khấu AI & Miễn giảm</span>
          </button>

          <button
            type="button"
            className={`subtab-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => handleTabNavigate('audit')}
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
            disabled={isSaving || isResetting}
          >
            {isResetting ? (
              <>
                <RotateCw size={14} className="spinner-spin" />
                <span>Đang khôi phục...</span>
              </>
            ) : (
              <>
                <RotateCcw size={14} />
                <span>Khôi phục mặc định</span>
              </>
            )}
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
            </div>

            {/* Card 2: Khung tính phí phạt vi phạm & Bộ mô phỏng tiền phạt trực quan */}
            <div className="figma-card">
              <div className="figma-card-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="figma-card-icon-box">
                    <CircleDollarSign size={20} />
                  </div>
                  <div>
                    <h3 className="figma-card-title">Khung tính phí phạt vi phạm</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                      Cấu hình mức phạt trễ hạn và tỷ lệ bồi hoàn khi làm hư hại/mất tài liệu.
                    </p>
                  </div>
                </div>
              </div>

              {/* Bộ mô phỏng tính tiền phạt mẫu (Live Penalty Simulator) */}
              <div className="penalty-simulator-box">
                <div className="simulator-header">
                  <div className="simulator-title">
                    <Calculator size={14} className="text-blue" />
                    <span>Mô phỏng tiền phạt theo giá sách bìa mẫu:</span>
                  </div>
                  <div className="simulator-quick-presets">
                    {[50000, 100000, 200000, 500000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className={`sim-preset-btn ${simulatedBookPrice === preset ? 'active' : ''}`}
                        onClick={() => setSimulatedBookPrice(preset)}
                      >
                        {preset / 1000}k
                      </button>
                    ))}
                  </div>
                </div>

                <div className="simulator-input-wrap">
                  <input
                    type="number"
                    min="1000"
                    step="10000"
                    value={simulatedBookPrice}
                    onChange={(e) => setSimulatedBookPrice(Math.max(0, Number(e.target.value)))}
                    className="simulator-input"
                    title="Nhập giá sách mẫu để xem trước số tiền bồi thường tương ứng"
                  />
                  <span className="simulator-tag">VNĐ (Giá sách gốc)</span>
                </div>
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

              {/* Lưới 4 thẻ phân cấp mức độ hư hại & xem trước số tiền bồi thường */}
              <div className="damage-tiered-grid">
                {/* 1. Rách nhẹ */}
                <div className="damage-tier-card tier-green">
                  <div className="tier-badge-row">
                    <span className="tier-badge badge-green">Hỏng nhẹ (30%)</span>
                    <span className="tier-calc-preview">
                      ≈ {calcSimulatedPenalty(formData.damagePenaltyText, simulatedBookPrice).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <label className="tier-label" htmlFor="damagePenaltyText">Mức phạt rách / ố nhẹ (chuẩn US-10.3)</label>
                  <div className="figma-input-wrapper">
                    <input
                      id="damagePenaltyText"
                      name="damagePenaltyText"
                      type="text"
                      className={`figma-input-control ${validationErrors.damagePenaltyText ? 'has-error' : ''}`}
                      value={formData.damagePenaltyText}
                      onChange={handleTextChange}
                    />
                  </div>
                </div>

                {/* 2. Hỏng vừa */}
                <div className="damage-tier-card tier-amber">
                  <div className="tier-badge-row">
                    <span className="tier-badge badge-amber">Hỏng vừa (40-50%)</span>
                    <span className="tier-calc-preview">
                      ≈ {calcSimulatedPenalty(formData.damageMediumText, simulatedBookPrice).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <label className="tier-label" htmlFor="damageMediumText">Mức phạt rách trang / mất bìa</label>
                  <div className="figma-input-wrapper">
                    <input
                      id="damageMediumText"
                      name="damageMediumText"
                      type="text"
                      className={`figma-input-control ${validationErrors.damageMediumText ? 'has-error' : ''}`}
                      value={formData.damageMediumText}
                      onChange={handleTextChange}
                    />
                  </div>
                </div>

                {/* 3. Hỏng nặng */}
                <div className="damage-tier-card tier-red">
                  <div className="tier-badge-row">
                    <span className="tier-badge badge-red">Hỏng nặng (100-110%)</span>
                    <span className="tier-calc-preview">
                      ≈ {calcSimulatedPenalty(formData.damageSevereText, simulatedBookPrice).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <label className="tier-label" htmlFor="damageSevereText">Mức phạt ướt / rách nát</label>
                  <div className="figma-input-wrapper">
                    <input
                      id="damageSevereText"
                      name="damageSevereText"
                      type="text"
                      className={`figma-input-control ${validationErrors.damageSevereText ? 'has-error' : ''}`}
                      value={formData.damageSevereText}
                      onChange={handleTextChange}
                    />
                  </div>
                </div>

                {/* 4. Mất sách */}
                <div className="damage-tier-card tier-purple">
                  <div className="tier-badge-row">
                    <span className="tier-badge badge-purple">Mất sách / Đền bù</span>
                    <span className="tier-calc-preview">
                      ≈ {calcSimulatedPenalty(formData.compensationText, simulatedBookPrice).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                  <label className="tier-label" htmlFor="compensationText">Đền bù mất tài liệu</label>
                  <div className="figma-input-wrapper">
                    <input
                      id="compensationText"
                      name="compensationText"
                      type="text"
                      className={`figma-input-control ${validationErrors.compensationText ? 'has-error' : ''}`}
                      value={formData.compensationText}
                      onChange={handleTextChange}
                    />
                  </div>
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

              {/* Thước đo 3 vùng rủi ro AI (Visual 3-Zone Risk Gauge) */}
              <div className="ai-slider-wrapper">
                <div className="ai-slider-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={15} className="text-blue" />
                    <span className="ai-slider-title">Ngưỡng rủi ro cao (High Risk Threshold)</span>
                  </div>
                  <span className={`ai-slider-value-badge ${formData.aiRiskThreshold >= 80 ? 'badge-danger' : formData.aiRiskThreshold >= 50 ? 'badge-warning' : 'badge-safe'}`}>
                    {formData.aiRiskThreshold}%
                  </span>
                </div>

                {/* Thanh kéo Slider */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  className="ai-range-input"
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #10b981 50%, #f59e0b 50%, #f59e0b 80%, #ef4444 80%, #ef4444 100%)`
                  }}
                  value={formData.aiRiskThreshold}
                  onChange={handleSliderChange}
                />

                {/* 3 vùng màu trực quan */}
                <div className="ai-gauge-zones">
                  <div className="gauge-zone zone-safe">
                    <span className="zone-dot dot-green"></span>
                    <span>0-49% An toàn</span>
                  </div>
                  <div className="gauge-zone zone-warning">
                    <span className="zone-dot dot-amber"></span>
                    <span>50-79% Giám sát</span>
                  </div>
                  <div className="gauge-zone zone-danger">
                    <span className="zone-dot dot-red"></span>
                    <span>80-100% Báo động</span>
                  </div>
                </div>

                {/* Thẻ phản hồi hành động tương ứng theo giá trị ngưỡng */}
                <div className={`ai-action-feedback ${formData.aiRiskThreshold >= 80 ? 'feedback-danger' : formData.aiRiskThreshold >= 50 ? 'feedback-warning' : 'feedback-safe'}`}>
                  {formData.aiRiskThreshold >= 80 ? (
                    <>
                      <AlertTriangle size={15} className="text-red flex-shrink-0" />
                      <span><strong>Vùng Báo động (≥80%):</strong> Hệ thống tự động gửi email cảnh báo trễ hạn và khóa quyền tự gia hạn sách của độc giả.</span>
                    </>
                  ) : formData.aiRiskThreshold >= 50 ? (
                    <>
                      <Info size={15} className="text-amber flex-shrink-0" />
                      <span><strong>Vùng Giám sát (50-79%):</strong> Cảnh báo nguy cơ cho Thủ thư khi quét thẻ mượn tại Quầy lưu thông.</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} className="text-emerald flex-shrink-0" />
                      <span><strong>Vùng An toàn (&lt;50%):</strong> Độc giả có điểm tín nhiệm cao, được hưởng quy chế mượn tiêu chuẩn.</span>
                    </>
                  )}
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

              {/* Khối Thẻ Trạng thái & Huấn luyện lại Mô hình AI ONNX Runtime (L0LRA-21 - Sprint 6.3) */}
              <div className="ai-model-status-card">
                <div className="ai-model-top-line">
                  <div className="ai-engine-badge">
                    <Zap size={13} className="ai-engine-badge-icon" />
                    <span>ONNX Runtime (In-Process)</span>
                  </div>
                  <span className="ai-model-status-active">
                    <span className="pulse-indicator">●</span> Đang kích hoạt
                  </span>
                </div>

                <div className="ai-model-header-block">
                  <h4 className="ai-model-name-title">smartlib_risk_model.onnx</h4>
                  <span className="ai-model-arch-tag">Binary ONNX / Random Forest (100 Trees)</span>
                </div>

                {/* Bảng thông số đo kiểm mô hình AI chuẩn công nghiệp */}
                <div className="ai-model-metrics-grid">
                  <div className="ai-metric-item">
                    <span className="ai-metric-label">Độ chính xác (Accuracy)</span>
                    <span className="ai-metric-value text-blue">95.1%</span>
                    <span className="ai-metric-sub">ROC-AUC: 93.2%</span>
                  </div>
                  <div className="ai-metric-item">
                    <span className="ai-metric-label">Độ trễ suy luận</span>
                    <span className="ai-metric-value text-emerald">&lt; 0.20 ms</span>
                    <span className="ai-metric-sub">C# Native Interop</span>
                  </div>
                  <div className="ai-metric-item">
                    <span className="ai-metric-label">Đặc trưng đầu vào</span>
                    <span className="ai-metric-value text-violet">8 chiều</span>
                    <span className="ai-metric-sub">StandardScaler</span>
                  </div>
                </div>

                <div className="ai-model-meta-info">
                  <div className="ai-meta-row">
                    <Activity size={13} className="text-slate" />
                    <span>Lần huấn luyện gần nhất: <strong>{aiModelInfo.lastTrained || '14/10/2026'}</strong></span>
                  </div>
                  <div className="ai-meta-row">
                    <ShieldCheck size={13} className="text-slate" />
                    <span>Provider thực thi: <strong>CPUExecutionProvider (Thread-safe)</strong></span>
                  </div>
                </div>

                {/* Top 3 đặc trưng AI quan trọng nhất (Feature Importance Ranking) */}
                <div className="ai-features-importance-block">
                  <div className="features-importance-header">
                    <BarChart2 size={13} className="text-blue" />
                    <span>Top 3 đặc trưng AI ảnh hưởng nhất (Feature Importance):</span>
                  </div>
                  <div className="feature-bar-list">
                    <div className="feature-bar-item">
                      <div className="feature-bar-label">
                        <span>1. Lịch sử trễ hạn quá khứ (OverdueHistory)</span>
                        <strong className="text-red">41.2%</strong>
                      </div>
                      <div className="feature-bar-track">
                        <div className="feature-bar-fill fill-red" style={{ width: '41.2%' }}></div>
                      </div>
                    </div>

                    <div className="feature-bar-item">
                      <div className="feature-bar-label">
                        <span>2. Điểm tín nhiệm bạn đọc (CreditScore)</span>
                        <strong className="text-blue">28.7%</strong>
                      </div>
                      <div className="feature-bar-track">
                        <div className="feature-bar-fill fill-blue" style={{ width: '28.7%' }}></div>
                      </div>
                    </div>

                    <div className="feature-bar-item">
                      <div className="feature-bar-label">
                        <span>3. Số sách đang mượn (CurrentBorrowCount)</span>
                        <strong className="text-emerald">16.5%</strong>
                      </div>
                      <div className="feature-bar-track">
                        <div className="feature-bar-fill fill-emerald" style={{ width: '16.5%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-retrain-outline"
                  onClick={handleRetrain}
                  disabled={isRetraining}
                  title="Huấn luyện lại mô hình ngẫu nhiên với dữ liệu mượn trả mới nhất"
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
                    min="0"
                    className={`figma-input-control ${validationErrors.borrowLimit_Student ? 'has-error' : ''}`}
                    value={formData.borrowLimit_Student}
                    onChange={handleNumberChange}
                  />
                  <span className="figma-input-tag">cuốn</span>
                </div>
                {validationErrors.borrowLimit_Student && (
                  <span className="figma-error-hint">
                    <AlertTriangle size={12} /> {validationErrors.borrowLimit_Student}
                  </span>
                )}
              </div>
              <div className="figma-form-item">
                <label className="figma-field-label">Số ngày mượn tiêu chuẩn</label>
                <div className="figma-input-wrapper">
                  <input
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
                    min="0"
                    className={`figma-input-control ${validationErrors.borrowLimit_Teacher ? 'has-error' : ''}`}
                    value={formData.borrowLimit_Teacher}
                    onChange={handleNumberChange}
                  />
                  <span className="figma-input-tag">cuốn</span>
                </div>
                {validationErrors.borrowLimit_Teacher && (
                  <span className="figma-error-hint">
                    <AlertTriangle size={12} /> {validationErrors.borrowLimit_Teacher}
                  </span>
                )}
              </div>
              <div className="figma-form-item">
                <label className="figma-field-label">Số ngày mượn tiêu chuẩn</label>
                <div className="figma-input-wrapper">
                  <input
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
                    min="0"
                    className={`figma-input-control ${validationErrors.maxRenewalTimes ? 'has-error' : ''}`}
                    value={formData.maxRenewalTimes}
                    onChange={handleNumberChange}
                  />
                  <span className="figma-input-tag">lần</span>
                </div>
                {validationErrors.maxRenewalTimes && (
                  <span className="figma-error-hint">
                    <AlertTriangle size={12} /> {validationErrors.maxRenewalTimes}
                  </span>
                )}
              </div>
              <div className="figma-form-item">
                <label className="figma-field-label">Số ngày thêm mỗi lần</label>
                <div className="figma-input-wrapper">
                  <input
                    name="renewalExtraDays"
                    type="number"
                    min="0"
                    className={`figma-input-control ${validationErrors.renewalExtraDays ? 'has-error' : ''}`}
                    value={formData.renewalExtraDays}
                    onChange={handleNumberChange}
                  />
                  <span className="figma-input-tag">ngày</span>
                </div>
                {validationErrors.renewalExtraDays && (
                  <span className="figma-error-hint">
                    <AlertTriangle size={12} /> {validationErrors.renewalExtraDays}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          5. TAB 3: CHIẾT KHẤU AI & HỆ THỐNG HẠNG TÍN NHIỆM BẠN ĐỌC
          -------------------------------------------------------------------- */}
      {activeTab === 'fine_waiver' && (
        <div className="subtab-detail-container">
          <div className="figma-two-columns-layout">
            {/* Cột trái: Hệ thống phân hạng tín nhiệm bạn đọc (Credit Score Tiers) */}
            <div className="figma-card">
              <div className="figma-card-header">
                <div className="figma-card-icon-box">
                  <Crown size={20} />
                </div>
                <div>
                  <h3 className="figma-card-title">Hệ thống Phân Hạng Tín Nhiệm Bạn Đọc</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: '#64748b' }}>
                    Chính sách tự động giảm trừ tiền phạt vi phạm theo điểm tín nhiệm (chuẩn US-10.4 đã thống nhất): 90–100 điểm giảm 20%, 80–89 điểm giảm 10%, dưới 80 điểm không giảm.
                  </p>
                </div>
              </div>

              <div className="tiers-container">
                {/* Hạng 1: Kim Cương / Xuất sắc (90 - 100 điểm) */}
                <div className="tier-card tier-card-diamond">
                  <div className="tier-card-top">
                    <div className="tier-card-badge">
                      <Gem size={15} className="text-cyan" />
                      <span className="tier-name">Hạng Xuất Sắc / Kim Cương (Diamond)</span>
                    </div>
                    <span className="tier-score-pill">Điểm tín nhiệm: 90 – 100</span>
                  </div>
                  <p className="tier-desc">Dành cho độc giả có điểm tín nhiệm xuất sắc (từ 90 đến 100 điểm), mượn trả gương mẫu.</p>
                  <div className="figma-form-item" style={{ marginTop: '10px' }}>
                    <label className="figma-field-label">Tỷ lệ giảm trừ tiền phạt vi phạm:</label>
                    <div className="figma-input-wrapper">
                      <input
                        name="aiDiscount_100"
                        type="number"
                        min="0"
                        max="100"
                        className={`figma-input-control ${validationErrors.aiDiscount_100 ? 'has-error' : ''}`}
                        value={formData.aiDiscount_100}
                        onChange={handleNumberChange}
                      />
                      <span className="figma-input-tag">% giảm trừ</span>
                    </div>
                    {validationErrors.aiDiscount_100 && (
                      <span className="figma-error-hint">
                        <AlertTriangle size={12} /> {validationErrors.aiDiscount_100}
                      </span>
                    )}
                  </div>
                </div>

                {/* Hạng 2: Vàng / Tốt (80 - 89 điểm) */}
                <div className="tier-card tier-card-gold">
                  <div className="tier-card-top">
                    <div className="tier-card-badge">
                      <Award size={15} className="text-gold" />
                      <span className="tier-name">Hạng Tốt / Vàng (Gold)</span>
                    </div>
                    <span className="tier-score-pill pill-gold">Điểm tín nhiệm: 80 – 89</span>
                  </div>
                  <p className="tier-desc">Dành cho sinh viên và giảng viên có điểm tín nhiệm tốt (từ 80 đến 89 điểm), hiếm khi quá hạn.</p>
                  <div className="figma-form-item" style={{ marginTop: '10px' }}>
                    <label className="figma-field-label">Tỷ lệ giảm trừ tiền phạt vi phạm:</label>
                    <div className="figma-input-wrapper">
                      <input
                        name="aiDiscount_90"
                        type="number"
                        min="0"
                        max="100"
                        className={`figma-input-control ${validationErrors.aiDiscount_90 ? 'has-error' : ''}`}
                        value={formData.aiDiscount_90}
                        onChange={handleNumberChange}
                      />
                      <span className="figma-input-tag">% giảm trừ</span>
                    </div>
                    {validationErrors.aiDiscount_90 && (
                      <span className="figma-error-hint">
                        <AlertTriangle size={12} /> {validationErrors.aiDiscount_90}
                      </span>
                    )}
                  </div>
                </div>

                {/* Hạng 3: Tiêu chuẩn (< 80 điểm) */}
                <div className="tier-card tier-card-standard">
                  <div className="tier-card-top">
                    <div className="tier-card-badge">
                      <User size={15} className="text-slate" />
                      <span className="tier-name">Hạng Tiêu Chuẩn (Standard)</span>
                    </div>
                    <span className="tier-score-pill pill-standard">Điểm tín nhiệm &lt; 80</span>
                  </div>
                  <p className="tier-desc">Điểm tín nhiệm dưới 80 không giảm trừ. Áp dụng biểu phí phạt gốc 100%, không áp dụng chiết khấu tự động.</p>
                </div>
              </div>
            </div>

            <div className="figma-card">
              <div className="figma-card-header" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div className="figma-card-icon-box">
                    <Info size={20} />
                  </div>
                  <h3 className="figma-card-title">Danh mục lý do miễn giảm thủ công</h3>
                </div>
                <button
                  type="button"
                  className="btn-add-waiver"
                  onClick={() => setIsAddWaiverModalOpen(true)}
                  title="Thêm lý do miễn giảm mới"
                >
                  <Plus size={15} />
                  <span>Thêm lý do</span>
                </button>
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
          6. TAB 4: NHẬT KÝ KIỂM TOÁN (AUDIT TRAIL) - TỐI ƯU PHÂN TRANG (L0LRA-21)
          -------------------------------------------------------------------- */}
      {activeTab === 'audit' && (() => {
        // Lọc danh sách lịch sử theo từ khóa tìm kiếm
        const query = auditSearchQuery.trim().toLowerCase();
        const filteredHistory = query
          ? auditHistory.filter(
              (item) =>
                (item.ruleName && item.ruleName.toLowerCase().includes(query)) ||
                (item.changedBy && item.changedBy.toLowerCase().includes(query)) ||
                (item.ipAddress && item.ipAddress.toLowerCase().includes(query)) ||
                (item.oldValue && String(item.oldValue).toLowerCase().includes(query)) ||
                (item.newValue && String(item.newValue).toLowerCase().includes(query))
            )
          : auditHistory;

        // Cắt lát dữ liệu phân trang
        const totalItems = filteredHistory.length;
        const startIdx = (auditPage - 1) * auditPageSize;
        const paginatedHistory = filteredHistory.slice(startIdx, startIdx + auditPageSize);

        return (
          <div className="figma-card audit-trail-card">
            <div className="audit-card-header">
              <div className="audit-header-title-box">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="figma-card-icon-box">
                    <History size={20} />
                  </div>
                  <div>
                    <h3 className="figma-card-title">Lịch sử thay đổi quy định hệ thống (Audit Trail)</h3>
                    <p className="audit-card-subtitle">
                      Ghi nhận đầy đủ vết thời gian, tài khoản quản trị và địa chỉ IP theo tiêu chuẩn bảo mật.
                    </p>
                  </div>
                </div>
              </div>

              {/* Thanh tìm kiếm nhanh lịch sử kiểm toán */}
              <div className="audit-search-wrapper">
                <Search size={15} className="audit-search-icon" />
                <input
                  type="text"
                  className="audit-search-input"
                  placeholder="Tìm theo quy định, thủ thư, IP..."
                  value={auditSearchQuery}
                  onChange={(e) => {
                    setAuditSearchQuery(e.target.value);
                    setAuditPage(1);
                  }}
                />
                {auditSearchQuery && (
                  <button
                    type="button"
                    className="audit-search-clear"
                    onClick={() => {
                      setAuditSearchQuery('');
                      setAuditPage(1);
                    }}
                    title="Xóa tìm kiếm"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="audit-table-wrapper">
              <table className="audit-data-table">
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Người thực hiện</th>
                    <th>Quy định điều chỉnh</th>
                    <th>Giá trị cũ</th>
                    <th>Giá trị mới</th>
                    <th>Địa chỉ IP</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHistory.length > 0 ? (
                    paginatedHistory.map((item) => (
                      <tr key={item.id}>
                        <td className="audit-col-time">
                          <div className="audit-cell-flex">
                            <Clock size={13} className="text-slate" />
                            <span>{item.changedAt}</span>
                          </div>
                        </td>
                        <td className="audit-col-user">
                          <div className="audit-cell-flex">
                            <User size={13} className="text-blue" />
                            <span>{item.changedBy}</span>
                          </div>
                        </td>
                        <td className="audit-col-rule">{item.ruleName}</td>
                        <td className="audit-col-old">{item.oldValue}</td>
                        <td className="audit-col-new">{item.newValue}</td>
                        <td className="audit-col-ip">
                          <div className="audit-cell-flex">
                            <Globe size={12} className="text-slate" />
                            <span className="audit-ip-badge">{item.ipAddress}</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="audit-empty-row">
                        <div className="audit-empty-state">
                          <History size={36} className="text-slate-light" />
                          <p>
                            {query
                              ? `Không tìm thấy bản ghi kiểm toán nào khớp với từ khóa "${query}"`
                              : 'Chưa có lịch sử thay đổi quy định nào được ghi nhận.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Phân trang chuẩn TablePagination cho Audit Trail */}
            <TablePagination
              currentPage={auditPage}
              pageSize={auditPageSize}
              totalItems={totalItems}
              pageSizeOptions={[10, 20, 50]}
              unitLabel="bản ghi"
              onPageChange={(page) => setAuditPage(page)}
              onPageSizeChange={(size) => {
                setAuditPageSize(size);
                setAuditPage(1);
              }}
              className="table-pagination-card-bleed"
            />
          </div>
        );
      })()}

      {/* --------------------------------------------------------------------
          7. MODAL THÊM LÝ DO MIỄN GIẢM MỚI (ẢNH 22)
          -------------------------------------------------------------------- */}
      {isAddWaiverModalOpen && (
        <div
          className="settings-modal-overlay"
          onClick={() => setIsAddWaiverModalOpen(false)}
        >
          <div className="settings-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="settings-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="settings-modal-icon-wrap">
                  <Plus size={18} />
                </div>
                <h4 className="settings-modal-title">Thêm lý do miễn giảm thủ công</h4>
              </div>
              <button
                type="button"
                className="btn-modal-close"
                onClick={() => setIsAddWaiverModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddWaiver}>
              <div className="settings-modal-body">
                <div className="figma-form-item">
                  <label className="figma-field-label">Mã lý do (Reason Code)</label>
                  <div className="figma-input-wrapper">
                    <input
                      type="text"
                      className="figma-input-control"
                      placeholder="VD: WR-FLOOD, WR-POLICY..."
                      value={newWaiverForm.reasonCode}
                      onChange={(e) =>
                        setNewWaiverForm((prev) => ({ ...prev, reasonCode: e.target.value.toUpperCase() }))
                      }
                    />
                  </div>
                </div>

                <div className="figma-form-item">
                  <label className="figma-field-label">Tên lý do miễn giảm *</label>
                  <div className="figma-input-wrapper">
                    <input
                      type="text"
                      required
                      className="figma-input-control"
                      placeholder="VD: Hỗ trợ sinh viên vùng bão lũ, thiên tai..."
                      value={newWaiverForm.reasonName}
                      onChange={(e) =>
                        setNewWaiverForm((prev) => ({ ...prev, reasonName: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="figma-form-item">
                  <label className="figma-field-label">Tỷ lệ giảm trừ mặc định (%)</label>
                  <div className="figma-input-wrapper">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="figma-input-control"
                      value={newWaiverForm.defaultDiscountPercent}
                      onChange={(e) =>
                        setNewWaiverForm((prev) => ({
                          ...prev,
                          defaultDiscountPercent: Number(e.target.value)
                        }))
                      }
                    />
                    <span className="figma-input-tag">% giảm</span>
                  </div>
                </div>
              </div>

              <div className="settings-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsAddWaiverModalOpen(false)}
                  disabled={isAddingWaiver}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={isAddingWaiver}
                >
                  {isAddingWaiver ? (
                    <>
                      <RotateCw size={14} className="spinner-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>Thêm lý do</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          8. MODAL XÁC NHẬN KHÔI PHỤC MẶC ĐỊNH CHUẨN (L0LRA-21)
          -------------------------------------------------------------------- */}
      {isResetModalOpen && (
        <div
          className="settings-modal-overlay"
          onClick={() => !isResetting && setIsResetModalOpen(false)}
        >
          <div className="settings-modal-box reset-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="reset-modal-header">
              <div className="reset-modal-icon-badge">
                <RotateCcw size={22} className="text-amber" />
              </div>
              <h4 className="reset-modal-title">Khôi phục cấu hình mặc định</h4>
              <p className="reset-modal-desc">
                Bạn có chắc chắn muốn khôi phục toàn bộ quy định lưu thông, biểu phí phạt và tham số cảnh báo AI về giá trị mặc định chuẩn của hệ thống không?
              </p>
            </div>

            <div className="reset-summary-box">
              <div className="reset-summary-title">Tóm tắt các tham số sẽ được khôi phục:</div>
              <ul className="reset-summary-list">
                <li>• Mượn sách SV: <strong>14 ngày</strong> (tối đa 3 cuốn) | GV: <strong>30 ngày</strong> (tối đa 8 cuốn)</li>
                <li>• Phạt trễ hạn: <strong>2.000 VNĐ</strong> / cuốn / ngày | Rách nhẹ: <strong>20%</strong> | Nặng: <strong>110%</strong></li>
                <li>• Khóa mượn khi nợ phạt: <strong>≥ 50.000 VNĐ</strong></li>
                <li>• Ngưỡng cảnh báo AI High-risk: <strong>80%</strong> | Nhắc nhở trước: <strong>3 ngày</strong></li>
                <li>• Giảm trừ điểm rèn luyện: ≥90: <strong>10%</strong> | 100 điểm: <strong>20%</strong></li>
              </ul>
            </div>

            <div className="reset-modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setIsResetModalOpen(false)}
                disabled={isResetting}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-modal-reset-confirm"
                onClick={executeResetDefaults}
                disabled={isResetting}
              >
                {isResetting ? (
                  <>
                    <RotateCw size={14} className="spinner-spin" />
                    <span>Đang khôi phục...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw size={14} />
                    <span>Xác nhận khôi phục</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          9. THANH THAO TÁC NỔI KHI CÓ THAY ĐỔI CHƯA LƯU (FLOATING ACTION BAR - L0LRA-21)
          -------------------------------------------------------------------- */}
      {isDirty && activeTab !== 'audit' && (
        <div className="settings-floating-bar">
          <div className="floating-bar-left">
            <div className="floating-bar-pulse-dot"></div>
            <div className="floating-bar-text">
              <span className="floating-bar-title">Bạn có thay đổi cấu hình chưa được lưu!</span>
              <span className="floating-bar-hint">Nhấn "Lưu cấu hình" để áp dụng ngay lập tức trên toàn hệ thống.</span>
            </div>
          </div>

          <div className="floating-bar-actions">
            <button
              type="button"
              className="btn-floating-cancel"
              onClick={handleCancelChanges}
              disabled={isSaving}
            >
              <Undo2 size={14} />
              <span>Hoàn tác</span>
            </button>
            <button
              type="button"
              className="btn-floating-save"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <RotateCw size={14} className="spinner-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Lưu thay đổi</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------
          10. TOAST NOTIFICATION
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
