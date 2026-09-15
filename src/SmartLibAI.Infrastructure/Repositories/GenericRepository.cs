using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using SmartLibAI.Core.Interfaces;
using SmartLibAI.Infrastructure.Data;

namespace SmartLibAI.Infrastructure.Repositories;

/// <summary>
/// Triển khai Generic Repository cung cấp các phương thức thao tác dữ liệu chuẩn với Entity Framework Core.
/// </summary>
/// <typeparam name="T">Kiểu thực thể</typeparam>
public class GenericRepository<T> : IGenericRepository<T> where T : class
{
    protected readonly SmartLibDbContext _context;
    protected readonly DbSet<T> _dbSet;

    public GenericRepository(SmartLibDbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    /// <summary>
    /// Lấy toàn bộ danh sách bản ghi không theo dõi (AsNoTracking) nhằm tối ưu hiệu năng.
    /// </summary>
    public async Task<IReadOnlyList<T>> GetAllAsync()
    {
        return await _dbSet.AsNoTracking().ToListAsync();
    }

    /// <summary>
    /// Tìm một bản ghi theo khóa chính định danh ID.
    /// </summary>
    public async Task<T?> GetByIdAsync(int id)
    {
        return await _dbSet.FindAsync(id);
    }

    /// <summary>
    /// Tìm kiếm danh sách bản ghi theo biểu thức điều kiện LINQ.
    /// </summary>
    public async Task<IReadOnlyList<T>> FindAsync(Expression<Func<T, bool>> predicate)
    {
        return await _dbSet.AsNoTracking().Where(predicate).ToListAsync();
    }

    /// <summary>
    /// Thêm mới một bản ghi vào cơ sở dữ liệu và lưu thay đổi ngay lập tức.
    /// </summary>
    public async Task<T> AddAsync(T entity)
    {
        await _dbSet.AddAsync(entity);
        await _context.SaveChangesAsync();
        return entity;
    }

    /// <summary>
    /// Cập nhật thông tin bản ghi hiện có và lưu thay đổi vào cơ sở dữ liệu.
    /// </summary>
    public async Task UpdateAsync(T entity)
    {
        _dbSet.Update(entity);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Xóa một bản ghi khỏi cơ sở dữ liệu.
    /// </summary>
    public async Task DeleteAsync(T entity)
    {
        _dbSet.Remove(entity);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Kiểm tra sự tồn tại của bản ghi thỏa mãn điều kiện chỉ định.
    /// </summary>
    public async Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate)
    {
        return await _dbSet.AnyAsync(predicate);
    }
}
