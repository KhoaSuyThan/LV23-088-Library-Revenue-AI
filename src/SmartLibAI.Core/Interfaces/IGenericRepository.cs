using System.Linq.Expressions;

namespace SmartLibAI.Core.Interfaces;

/// <summary>
/// Giao diện Generic Repository chuẩn hóa các thao tác CRUD dữ liệu cơ bản.
/// </summary>
/// <typeparam name="T">Kiểu Entity</typeparam>
public interface IGenericRepository<T> where T : class
{
    Task<IReadOnlyList<T>> GetAllAsync();

    Task<T?> GetByIdAsync(int id);

    Task<IReadOnlyList<T>> FindAsync(Expression<Func<T, bool>> predicate);

    Task<T> AddAsync(T entity);

    Task UpdateAsync(T entity);

    Task DeleteAsync(T entity);

    Task<bool> ExistsAsync(Expression<Func<T, bool>> predicate);
}
