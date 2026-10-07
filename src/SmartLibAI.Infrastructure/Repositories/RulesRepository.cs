using Microsoft.EntityFrameworkCore;
using SmartLibAI.Core.Entities;
using SmartLibAI.Core.Interfaces;
using SmartLibAI.Infrastructure.Data;

namespace SmartLibAI.Infrastructure.Repositories;

/// <summary>
/// Triển khai IRulesRepository truy vấn và lưu trữ cấu hình quy định vào CSDL SQL Server.
/// </summary>
public class RulesRepository : IRulesRepository
{
    private readonly SmartLibDbContext _context;

    public RulesRepository(SmartLibDbContext context)
    {
        _context = context;
    }

    public async Task<FineRule?> GetActiveFineRuleAsync()
    {
        return await _context.FineRules
            .FirstOrDefaultAsync(r => r.IsActive)
            ?? await _context.FineRules.FirstOrDefaultAsync();
    }

    public async Task<FineRule> UpdateFineRuleAsync(FineRule fineRule)
    {
        _context.FineRules.Update(fineRule);
        await _context.SaveChangesAsync();
        return fineRule;
    }

    public async Task<List<WaiverReason>> GetWaiverReasonsAsync()
    {
        return await _context.WaiverReasons
            .AsNoTracking()
            .ToListAsync();
    }

    public async Task<List<RuleAuditLog>> GetAuditLogsAsync()
    {
        return await _context.RuleAuditLogs
            .AsNoTracking()
            .OrderByDescending(l => l.ChangedAt)
            .Take(50)
            .ToListAsync();
    }

    public async Task AddAuditLogAsync(RuleAuditLog log)
    {
        await _context.RuleAuditLogs.AddAsync(log);
        await _context.SaveChangesAsync();
    }
}
