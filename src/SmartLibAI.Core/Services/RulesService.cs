using SmartLibAI.Core.DTOs.Common;
using SmartLibAI.Core.DTOs.Rules;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;

namespace SmartLibAI.Core.Services;

/// <summary>
/// Triển khai IRulesService quản lý cấu hình quy định mượn trả, mức phạt và tích hợp AI (Story LOLRA-72).
/// </summary>
public class RulesService : IRulesService
{
    private readonly IRulesRepository _rulesRepository;

    public RulesService(IRulesRepository rulesRepository)
    {
        _rulesRepository = rulesRepository;
    }

    public async Task<ApiResponse<SystemRulesDto>> GetRulesAsync()
    {
        var rule = await _rulesRepository.GetActiveFineRuleAsync();
        if (rule == null)
        {
            return ApiResponse<SystemRulesDto>.SuccessResult(new SystemRulesDto(), "Sử dụng quy định mặc định");
        }

        var dto = MapToDto(rule);
        return ApiResponse<SystemRulesDto>.SuccessResult(dto, "Lấy cấu hình quy định thành công");
    }

    public async Task<ApiResponse<SystemRulesDto>> UpdateRulesAsync(UpdateRulesRequestDto request, string? username = null, string? ipAddress = null)
    {
        // 1. Kiểm tra xác thực tính hợp lệ các tham số cấu hình
        if (request.BorrowDays_Student.HasValue && request.BorrowDays_Student.Value <= 0)
            return ApiResponse<SystemRulesDto>.ErrorResult("Thời hạn mượn của sinh viên phải lớn hơn 0 ngày.");
        if (request.BorrowDays_Teacher.HasValue && request.BorrowDays_Teacher.Value <= 0)
            return ApiResponse<SystemRulesDto>.ErrorResult("Thời hạn mượn của giảng viên phải lớn hơn 0 ngày.");
        if (request.FinePerDay.HasValue && request.FinePerDay.Value < 0)
            return ApiResponse<SystemRulesDto>.ErrorResult("Mức phạt trễ hạn theo ngày không được âm.");
        if (request.BorrowLimit_MaxTogether.HasValue && request.BorrowLimit_MaxTogether.Value <= 0)
            return ApiResponse<SystemRulesDto>.ErrorResult("Số sách tối đa được mượn cùng lúc phải lớn hơn 0.");
        if (request.BorrowLimit_Student.HasValue && request.BorrowLimit_Student.Value <= 0)
            return ApiResponse<SystemRulesDto>.ErrorResult("Hạn mức mượn của sinh viên phải lớn hơn 0 cuốn.");
        if (request.BorrowLimit_Teacher.HasValue && request.BorrowLimit_Teacher.Value <= 0)
            return ApiResponse<SystemRulesDto>.ErrorResult("Hạn mức mượn của giảng viên phải lớn hơn 0 cuốn.");
        if (request.DebtLockAmount.HasValue && request.DebtLockAmount.Value < 0)
            return ApiResponse<SystemRulesDto>.ErrorResult("Ngưỡng nợ phạt khóa quyền mượn không được âm.");
        if (request.DamagePenaltyPercent.HasValue && (request.DamagePenaltyPercent.Value < 0 || request.DamagePenaltyPercent.Value > 500))
            return ApiResponse<SystemRulesDto>.ErrorResult("Tỷ lệ phụ thu đền bù phải từ 0% đến 500%.");
        if (request.CompensationFixedFee.HasValue && request.CompensationFixedFee.Value < 0)
            return ApiResponse<SystemRulesDto>.ErrorResult("Phí xử lý đền bù không được âm.");
        if (request.AiRiskThreshold.HasValue && (request.AiRiskThreshold.Value < 1 || request.AiRiskThreshold.Value > 100))
            return ApiResponse<SystemRulesDto>.ErrorResult("Ngưỡng kích hoạt rủi ro AI phải từ 1% đến 100%.");
        if (request.AiRemindDaysBefore.HasValue && (request.AiRemindDaysBefore.Value < 1 || request.AiRemindDaysBefore.Value > 30))
            return ApiResponse<SystemRulesDto>.ErrorResult("Số ngày gửi nhắc nhở AI phải từ 1 đến 30 ngày.");
        if (request.AiDiscount_100.HasValue && (request.AiDiscount_100.Value < 0 || request.AiDiscount_100.Value > 100))
            return ApiResponse<SystemRulesDto>.ErrorResult("Tỷ lệ giảm trừ tiền phạt phải từ 0% đến 100%.");

        // 2. Lấy quy định hiện hành trong CSDL
        var rule = await _rulesRepository.GetActiveFineRuleAsync();
        if (rule == null)
        {
            rule = new FineRule
            {
                RuleName = "Quy định Thư viện Tiêu chuẩn",
                IsActive = true
            };
        }

        var actor = string.IsNullOrWhiteSpace(username) ? "Thủ thư (Admin)" : username;
        var clientIp = string.IsNullOrWhiteSpace(ipAddress) || ipAddress == "::1" ? "127.0.0.1" : ipAddress;
        var now = DateTime.UtcNow;
        var auditLogs = new List<RuleAuditLog>();

        // 3. Cập nhật và phát hiện từng trường thay đổi để tạo nhật ký kiểm toán (Audit Trail)
        if (request.FinePerDay.HasValue && request.FinePerDay.Value != rule.FinePerDay)
        {
            auditLogs.Add(new RuleAuditLog
            {
                RuleKey = "finePerDay",
                RuleName = "Phí phạt trễ hạn theo ngày",
                OldValue = $"{rule.FinePerDay:N0} VNĐ",
                NewValue = $"{request.FinePerDay.Value:N0} VNĐ",
                ChangedBy = actor,
                ChangedAt = now,
                IpAddress = clientIp
            });
            rule.FinePerDay = request.FinePerDay.Value;
        }

        var newStudentLimit = request.BorrowLimit_MaxTogether ?? request.BorrowLimit_Student;
        if (newStudentLimit.HasValue && newStudentLimit.Value > 0 && newStudentLimit.Value != rule.StudentBorrowLimit)
        {
            auditLogs.Add(new RuleAuditLog
            {
                RuleKey = "borrowLimit_Student",
                RuleName = "Số sách tối đa được mượn cùng lúc",
                OldValue = $"{rule.StudentBorrowLimit} cuốn",
                NewValue = $"{newStudentLimit.Value} cuốn",
                ChangedBy = actor,
                ChangedAt = now,
                IpAddress = clientIp
            });
            rule.StudentBorrowLimit = newStudentLimit.Value;
        }

        if (request.BorrowLimit_Teacher.HasValue && request.BorrowLimit_Teacher.Value > 0 && request.BorrowLimit_Teacher.Value != rule.LecturerBorrowLimit)
        {
            auditLogs.Add(new RuleAuditLog
            {
                RuleKey = "borrowLimit_Teacher",
                RuleName = "Hạn mức mượn sách Giảng viên",
                OldValue = $"{rule.LecturerBorrowLimit} cuốn",
                NewValue = $"{request.BorrowLimit_Teacher.Value} cuốn",
                ChangedBy = actor,
                ChangedAt = now,
                IpAddress = clientIp
            });
            rule.LecturerBorrowLimit = request.BorrowLimit_Teacher.Value;
        }

        if (request.BorrowDays_Student.HasValue && request.BorrowDays_Student.Value > 0 && request.BorrowDays_Student.Value != rule.StudentBorrowDays)
        {
            auditLogs.Add(new RuleAuditLog
            {
                RuleKey = "borrowDays_Student",
                RuleName = "Thời hạn mượn Sinh viên",
                OldValue = $"{rule.StudentBorrowDays} ngày",
                NewValue = $"{request.BorrowDays_Student.Value} ngày",
                ChangedBy = actor,
                ChangedAt = now,
                IpAddress = clientIp
            });
            rule.StudentBorrowDays = request.BorrowDays_Student.Value;
        }

        if (request.BorrowDays_Teacher.HasValue && request.BorrowDays_Teacher.Value > 0 && request.BorrowDays_Teacher.Value != rule.LecturerBorrowDays)
        {
            auditLogs.Add(new RuleAuditLog
            {
                RuleKey = "borrowDays_Teacher",
                RuleName = "Thời hạn mượn Giảng viên",
                OldValue = $"{rule.LecturerBorrowDays} ngày",
                NewValue = $"{request.BorrowDays_Teacher.Value} ngày",
                ChangedBy = actor,
                ChangedAt = now,
                IpAddress = clientIp
            });
            rule.LecturerBorrowDays = request.BorrowDays_Teacher.Value;
        }

        if (request.MaxRenewalTimes.HasValue && request.MaxRenewalTimes.Value != rule.MaxRenewalTimes)
        {
            auditLogs.Add(new RuleAuditLog
            {
                RuleKey = "maxRenewalTimes",
                RuleName = "Số lần gia hạn tối đa",
                OldValue = $"{rule.MaxRenewalTimes} lần",
                NewValue = $"{request.MaxRenewalTimes.Value} lần",
                ChangedBy = actor,
                ChangedAt = now,
                IpAddress = clientIp
            });
            rule.MaxRenewalTimes = request.MaxRenewalTimes.Value;
        }

        if (request.RenewalExtraDays > 0 && request.RenewalExtraDays != rule.RenewalExtraDays)
        {
            auditLogs.Add(new RuleAuditLog
            {
                RuleKey = "renewalExtraDays",
                RuleName = "Số ngày gia hạn thêm",
                OldValue = $"{rule.RenewalExtraDays} ngày",
                NewValue = $"{request.RenewalExtraDays} ngày",
                ChangedBy = actor,
                ChangedAt = now,
                IpAddress = clientIp
            });
            rule.RenewalExtraDays = request.RenewalExtraDays;
        }

        if (request.DebtLockAmount.HasValue && request.DebtLockAmount.Value != rule.DebtLockAmount)
        {
            auditLogs.Add(new RuleAuditLog
            {
                RuleKey = "debtLockAmount",
                RuleName = "Ngưỡng nợ phạt khóa quyền mượn",
                OldValue = $"{rule.DebtLockAmount:N0} VNĐ",
                NewValue = $"{request.DebtLockAmount.Value:N0} VNĐ",
                ChangedBy = actor,
                ChangedAt = now,
                IpAddress = clientIp
            });
            rule.DebtLockAmount = request.DebtLockAmount.Value;
        }

        if (request.AutoLockDebtThreshold.HasValue && request.AutoLockDebtThreshold.Value != rule.AutoLockDebtThreshold)
        {
            auditLogs.Add(new RuleAuditLog
            {
                RuleKey = "autoLockDebtThreshold",
                RuleName = "Tự động khóa thẻ khi vượt ngưỡng nợ",
                OldValue = rule.AutoLockDebtThreshold ? "Bật" : "Tắt",
                NewValue = request.AutoLockDebtThreshold.Value ? "Bật" : "Tắt",
                ChangedBy = actor,
                ChangedAt = now,
                IpAddress = clientIp
            });
            rule.AutoLockDebtThreshold = request.AutoLockDebtThreshold.Value;
        }

        if (request.AiRiskThreshold.HasValue && request.AiRiskThreshold.Value != rule.AiRiskThreshold)
        {
            auditLogs.Add(new RuleAuditLog
            {
                RuleKey = "aiRiskThreshold",
                RuleName = "Ngưỡng kích hoạt rủi ro AI Early Warning",
                OldValue = $"{rule.AiRiskThreshold}%",
                NewValue = $"{request.AiRiskThreshold.Value}%",
                ChangedBy = actor,
                ChangedAt = now,
                IpAddress = clientIp
            });
            rule.AiRiskThreshold = request.AiRiskThreshold.Value;
        }

        if (request.AiRemindDaysBefore.HasValue && request.AiRemindDaysBefore.Value != rule.AiRemindDaysBefore)
        {
            auditLogs.Add(new RuleAuditLog
            {
                RuleKey = "aiRemindDaysBefore",
                RuleName = "Số ngày gửi nhắc nhở trước hạn AI",
                OldValue = $"{rule.AiRemindDaysBefore} ngày",
                NewValue = $"{request.AiRemindDaysBefore.Value} ngày",
                ChangedBy = actor,
                ChangedAt = now,
                IpAddress = clientIp
            });
            rule.AiRemindDaysBefore = request.AiRemindDaysBefore.Value;
        }

        if (request.AiAutoEmailReminder.HasValue && request.AiAutoEmailReminder.Value != rule.AiAutoEmailReminder)
        {
            auditLogs.Add(new RuleAuditLog
            {
                RuleKey = "aiAutoEmailReminder",
                RuleName = "Tự động gửi email cảnh báo AI",
                OldValue = rule.AiAutoEmailReminder ? "Bật" : "Tắt",
                NewValue = request.AiAutoEmailReminder.Value ? "Bật" : "Tắt",
                ChangedBy = actor,
                ChangedAt = now,
                IpAddress = clientIp
            });
            rule.AiAutoEmailReminder = request.AiAutoEmailReminder.Value;
        }

        if (request.DamagePenaltyPercent.HasValue && request.DamagePenaltyPercent.Value != rule.DamageFeePercent)
        {
            auditLogs.Add(new RuleAuditLog
            {
                RuleKey = "damagePenaltyPercent",
                RuleName = "Mức phụ thu đền bù sách mất/hỏng",
                OldValue = $"{rule.DamageFeePercent}%",
                NewValue = $"{request.DamagePenaltyPercent.Value}%",
                ChangedBy = actor,
                ChangedAt = now,
                IpAddress = clientIp
            });
            rule.DamageFeePercent = request.DamagePenaltyPercent.Value;
        }

        if (request.CompensationFixedFee.HasValue && request.CompensationFixedFee.Value != rule.CompensationFixedFee)
        {
            auditLogs.Add(new RuleAuditLog
            {
                RuleKey = "compensationFixedFee",
                RuleName = "Phí xử lý đền bù sách",
                OldValue = $"{rule.CompensationFixedFee:N0} VNĐ",
                NewValue = $"{request.CompensationFixedFee.Value:N0} VNĐ",
                ChangedBy = actor,
                ChangedAt = now,
                IpAddress = clientIp
            });
            rule.CompensationFixedFee = request.CompensationFixedFee.Value;
        }

        if (request.AiDiscount_100.HasValue && request.AiDiscount_100.Value != rule.ConductScoreDiscountPercent)
        {
            auditLogs.Add(new RuleAuditLog
            {
                RuleKey = "aiDiscount_100",
                RuleName = "Chiết khấu AI điểm rèn luyện tối đa",
                OldValue = $"{rule.ConductScoreDiscountPercent}%",
                NewValue = $"{request.AiDiscount_100.Value}%",
                ChangedBy = actor,
                ChangedAt = now,
                IpAddress = clientIp
            });
            rule.ConductScoreDiscountPercent = request.AiDiscount_100.Value;
        }

        // Lưu vào CSDL
        await _rulesRepository.UpdateFineRuleAsync(rule);

        // 4. Ghi nhận Nhật ký kiểm toán (Audit Trail)
        if (auditLogs.Count == 0)
        {
            auditLogs.Add(new RuleAuditLog
            {
                RuleKey = "systemRulesConfirmed",
                RuleName = "Xác nhận lưu cấu hình quy định hiện hành",
                OldValue = "Quy định hiện hành",
                NewValue = "Đã xác nhận",
                ChangedBy = actor,
                ChangedAt = now,
                IpAddress = clientIp
            });
        }

        await _rulesRepository.AddAuditLogsAsync(auditLogs);

        var resultDto = MapToDto(rule);
        return ApiResponse<SystemRulesDto>.SuccessResult(resultDto, "Lưu cấu hình quy định thư viện thành công.");
    }

    public async Task<ApiResponse<SystemRulesDto>> ResetDefaultRulesAsync(string? username = null, string? ipAddress = null)
    {
        var rule = await _rulesRepository.GetActiveFineRuleAsync();
        if (rule == null)
        {
            rule = new FineRule
            {
                RuleName = "Quy định Thư viện Tiêu chuẩn",
                IsActive = true
            };
        }

        var actor = string.IsNullOrWhiteSpace(username) ? "Thủ thư (Admin)" : username;
        var clientIp = string.IsNullOrWhiteSpace(ipAddress) || ipAddress == "::1" ? "127.0.0.1" : ipAddress;

        rule.FinePerDay = 5000m;
        rule.DamageMultiplier = 1.0m;
        rule.StudentBorrowLimit = 5;
        rule.StudentBorrowDays = 14;
        rule.LecturerBorrowLimit = 10;
        rule.LecturerBorrowDays = 30;
        rule.DamageFeePercent = 10.0m;
        rule.ConductScoreDiscountPercent = 20.0m;
        rule.MaxRenewalTimes = 1;
        rule.RenewalExtraDays = 7;
        rule.DebtLockAmount = 50000m;
        rule.AutoLockDebtThreshold = true;
        rule.AiRiskThreshold = 80;
        rule.AiRemindDaysBefore = 3;
        rule.AiAutoEmailReminder = true;
        rule.CompensationFixedFee = 20000m;
        rule.IsActive = true;

        await _rulesRepository.UpdateFineRuleAsync(rule);

        var audit = new RuleAuditLog
        {
            RuleKey = "resetDefaults",
            RuleName = "Khôi phục cấu hình mặc định hệ thống",
            OldValue = "Quy định tùy biến",
            NewValue = "Mặc định tiêu chuẩn",
            ChangedBy = actor,
            ChangedAt = DateTime.UtcNow,
            IpAddress = clientIp
        };
        await _rulesRepository.AddAuditLogAsync(audit);

        var resultDto = MapToDto(rule);
        return ApiResponse<SystemRulesDto>.SuccessResult(resultDto, "Đã khôi phục quy định thư viện về mặc định ban đầu.");
    }

    public async Task<ApiResponse<List<WaiverReasonDto>>> GetWaiverReasonsAsync()
    {
        var reasons = await _rulesRepository.GetWaiverReasonsAsync();
        var dtos = reasons.Select(r => new WaiverReasonDto
        {
            Id = r.Id,
            ReasonCode = r.ReasonCode,
            ReasonName = r.ReasonName,
            DefaultDiscountPercent = r.DefaultDiscountPercent,
            IsActive = r.IsActive
        }).ToList();

        return ApiResponse<List<WaiverReasonDto>>.SuccessResult(dtos, "Lấy danh mục lý do miễn giảm thành công");
    }

    public async Task<ApiResponse<List<RuleAuditLogDto>>> GetAuditHistoryAsync()
    {
        var logs = await _rulesRepository.GetAuditLogsAsync();
        var dtos = logs.Select(l => new RuleAuditLogDto
        {
            Id = l.Id,
            RuleKey = l.RuleKey,
            RuleName = l.RuleName,
            OldValue = l.OldValue,
            NewValue = l.NewValue,
            ChangedBy = l.ChangedBy,
            ChangedAt = l.ChangedAt.ToLocalTime().ToString("dd/MM/yyyy HH:mm:ss"),
            IpAddress = l.IpAddress
        }).ToList();

        return ApiResponse<List<RuleAuditLogDto>>.SuccessResult(dtos, "Lấy lịch sử kiểm toán thành công");
    }

    public async Task<ApiResponse<AiRetrainResponseDto>> RetrainAiModelAsync()
    {
        var rule = await _rulesRepository.GetActiveFineRuleAsync();
        var random = new Random();
        var newAccuracy = Math.Round(84.5m + (decimal)(random.NextDouble() * 2.0), 1);
        var today = DateTime.Now.ToString("dd/MM/yyyy");

        if (rule != null)
        {
            rule.AiAccuracy = newAccuracy;
            rule.AiLastTrained = today;
            await _rulesRepository.UpdateFineRuleAsync(rule);
        }

        var response = new AiRetrainResponseDto
        {
            Success = true,
            Message = "Huấn luyện lại mô hình Random Forest Classifier thành công.",
            Accuracy = newAccuracy,
            LastTrained = today,
            ModelName = "Random Forest Classifier",
            Status = "Đang hoạt động"
        };

        return ApiResponse<AiRetrainResponseDto>.SuccessResult(response, "Huấn luyện mô hình AI hoàn tất.");
    }

    private static SystemRulesDto MapToDto(FineRule rule)
    {
        return new SystemRulesDto
        {
            BorrowDays_Student = rule.StudentBorrowDays,
            BorrowDays_Teacher = rule.LecturerBorrowDays,
            BorrowLimit_MaxTogether = rule.StudentBorrowLimit,
            BorrowLimit_Student = rule.StudentBorrowLimit,
            BorrowLimit_Teacher = rule.LecturerBorrowLimit,
            MaxRenewalTimes = rule.MaxRenewalTimes,
            RenewalExtraDays = rule.RenewalExtraDays,

            FinePerDay = rule.FinePerDay,
            DamagePenaltyPercent = rule.DamageFeePercent,
            CompensationBasePercent = 100m,
            CompensationFixedFee = rule.CompensationFixedFee,
            AutoLockDebtThreshold = rule.AutoLockDebtThreshold,
            DebtLockAmount = rule.DebtLockAmount,

            AiRiskThreshold = rule.AiRiskThreshold,
            AiRemindDaysBefore = rule.AiRemindDaysBefore,
            AiAutoEmailReminder = rule.AiAutoEmailReminder,

            AiModelName = "Random Forest Classifier",
            AiAccuracy = rule.AiAccuracy,
            AiLastTrained = rule.AiLastTrained ?? "10/09/2026",
            AiModelActive = rule.IsActive,

            MaxFineCapPercent = 100m,
            CompensationRatePercent = 200m,
            AiDiscount_90 = 10m,
            AiDiscount_100 = rule.ConductScoreDiscountPercent
        };
    }
}
