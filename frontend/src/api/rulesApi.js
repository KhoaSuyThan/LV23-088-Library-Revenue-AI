import { apiClient } from './authApi';

// Dữ liệu mẫu quy định hệ thống chuẩn theo thiết kế Figma SmartLib AI
const DEFAULT_SYSTEM_RULES = {
  // Quy định lưu thông
  borrowDays_Student: 14,
  borrowDays_Teacher: 30,
  borrowLimit_MaxTogether: 5,
  borrowLimit_Student: 5,
  borrowLimit_Teacher: 10,
  maxRenewalTimes: 1,
  renewalExtraDays: 7,

  // Biểu phí phạt vi phạm (chuẩn CSDL FineRules)
  finePerDay: 5000,
  damagePenaltyPercent: 20,
  damageMediumPercent: 40,
  damageSeverePercent: 110,
  compensationBasePercent: 110,
  compensationFixedFee: 0,
  autoLockDebtThreshold: true,
  debtLockAmount: 50000,

  // Tham số AI Early Warning
  aiRiskThreshold: 80,
  aiRemindDaysBefore: 3,
  aiAutoEmailReminder: true,

  // Thông tin mô hình AI
  aiModelName: 'Random Forest Classifier',
  aiAccuracy: 84.5,
  aiLastTrained: '10/09/2026',
  aiModelActive: true,

  // Chiết khấu AI & Miễn giảm
  maxFineCapPercent: 100,
  compensationRatePercent: 200,
  aiDiscount_90: 10,
  aiDiscount_100: 20
};

// Dữ liệu mẫu danh mục lý do miễn giảm thủ công
const DEFAULT_WAIVER_REASONS = [
  {
    id: 1,
    reasonCode: 'WR-SICK',
    reasonName: 'Nghỉ ốm có giấy ra/nhập viện điều trị',
    defaultDiscountPercent: 100,
    isActive: true
  },
  {
    id: 2,
    reasonCode: 'WR-FORCE-MAJEURE',
    reasonName: 'Thiên tai, lũ lụt, dịch bệnh, sự cố bất khả kháng',
    defaultDiscountPercent: 100,
    isActive: true
  },
  {
    id: 3,
    reasonCode: 'WR-SYS-ERROR',
    reasonName: 'Sự cố lỗi phần mềm hệ thống hoặc mất điện thư viện',
    defaultDiscountPercent: 100,
    isActive: true
  },
  {
    id: 4,
    reasonCode: 'WR-POOR-STUDENT',
    reasonName: 'Sinh viên diện chính sách hoàn cảnh khó khăn',
    defaultDiscountPercent: 50,
    isActive: false
  }
];

// Dữ liệu mẫu lịch sử thay đổi quy định (Audit Trail)
const DEFAULT_AUDIT_HISTORY = [
  {
    id: 101,
    ruleKey: 'aiRiskThreshold',
    ruleName: 'Ngưỡng kích hoạt rủi ro AI Early Warning',
    oldValue: '75%',
    newValue: '80%',
    changedBy: 'Thủ thư (Admin)',
    changedAt: '18/09/2026 15:10:00',
    ipAddress: '192.168.1.10'
  },
  {
    id: 102,
    ruleKey: 'finePerDay',
    ruleName: 'Phí phạt trễ hạn theo ngày',
    oldValue: '3.000 VNĐ',
    newValue: '2.000 VNĐ',
    changedBy: 'Thủ thư (Admin)',
    changedAt: '18/09/2026 14:32:10',
    ipAddress: '192.168.1.45'
  },
  {
    id: 103,
    ruleKey: 'aiDiscount_100',
    ruleName: 'Chiết khấu AI điểm tuyệt đối (100 điểm)',
    oldValue: '15%',
    newValue: '20%',
    changedBy: 'Thủ thư (Admin)',
    changedAt: '15/09/2026 09:20:00',
    ipAddress: '192.168.1.45'
  },
  {
    id: 104,
    ruleKey: 'borrowLimit_MaxTogether',
    ruleName: 'Số sách tối đa được mượn cùng lúc',
    oldValue: '4 cuốn',
    newValue: '5 cuốn',
    changedBy: 'Thủ thư (Admin)',
    changedAt: '10/09/2026 09:15:00',
    ipAddress: '192.168.1.12'
  }
];

const LOCAL_STORAGE_RULES_KEY = 'smartlib_rules_data';
const LOCAL_STORAGE_AUDIT_KEY = 'smartlib_rules_audit';

/**
 * Service API quản lý Cài đặt quy định thư viện (US-03)
 */
export const rulesApi = {
  // Lấy toàn bộ cấu hình quy định hiện hành
  getSystemRules: async () => {
    try {
      const response = await apiClient.get('/api/rules');
      return response.data?.data ?? response.data;
    } catch {
      const saved = localStorage.getItem(LOCAL_STORAGE_RULES_KEY);
      if (saved) {
        try {
          return { ...DEFAULT_SYSTEM_RULES, ...JSON.parse(saved) };
        } catch {
          // ignore
        }
      }
      return DEFAULT_SYSTEM_RULES;
    }
  },

  // Cập nhật cấu hình quy định (chỉ Admin)
  updateSystemRules: async (payload) => {
    try {
      const response = await apiClient.put('/api/rules', payload);
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Lỗi khi cập nhật cấu hình quy định:', error);
      throw error;
    }
  },

  // Khôi phục toàn bộ cấu hình quy định về mặc định chuẩn hệ thống (Story L0LRA-79)
  resetDefaultRules: async () => {
    try {
      const response = await apiClient.post('/api/rules/reset-defaults');
      return response.data?.data ?? response.data;
    } catch (error) {
      console.error('Lỗi khi khôi phục cấu hình quy định mặc định:', error);
      throw error;
    }
  },

  // Huấn luyện lại mô hình AI (Mô phỏng API Retrain)
  retrainAiModel: async () => {
    try {
      const response = await apiClient.post('/api/ai/retrain');
      return response.data?.data ?? response.data;
    } catch {
      // Giả lập huấn luyện lại thành công với độ chính xác tăng nhẹ
      const newAccuracy = Number((84.5 + Math.random() * 2).toFixed(1));
      const today = new Date().toLocaleDateString('vi-VN');
      return {
        success: true,
        accuracy: newAccuracy,
        lastTrained: today,
        modelName: 'Random Forest Classifier',
        status: 'Đang hoạt động'
      };
    }
  },

  // Lấy danh mục lý do miễn giảm
  getWaiverReasons: async () => {
    try {
      const response = await apiClient.get('/api/rules/waivers');
      return response.data?.data ?? response.data;
    } catch {
      return DEFAULT_WAIVER_REASONS;
    }
  },

  // Lấy nhật ký kiểm toán thay đổi quy định
  getAuditHistory: async () => {
    try {
      const response = await apiClient.get('/api/rules/history');
      return response.data?.data ?? response.data;
    } catch {
      return rulesApi.getLocalAuditHistory();
    }
  },

  // Helper lấy lịch sử từ LocalStorage
  getLocalAuditHistory: () => {
    const saved = localStorage.getItem(LOCAL_STORAGE_AUDIT_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    return DEFAULT_AUDIT_HISTORY;
  },

  // Lấy các giá trị mặc định chuẩn
  getDefaultRules: () => {
    return { ...DEFAULT_SYSTEM_RULES };
  }
};
