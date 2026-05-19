const LIMIT_OPTIONS = [5, 10, 25, 50, -1];

export default function Pagination({ total, page, limit, onPageChange, onLimitChange }) {
  const totalPages = limit === -1 ? 1 : Math.ceil(total / limit);
  if (total <= 0) return null;

  const pages = [];
  if (limit !== -1) {
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) pages.push(i);
  }

  return (
    <div className="pagination">
      <div className="pagination-limits">
        <span className="pagination-label">Afficher</span>
        <select
          className="form-select pagination-select"
          value={limit}
          onChange={e => { onLimitChange(parseInt(e.target.value)); onPageChange(1); }}
        >
          {LIMIT_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt === -1 ? 'Tous' : opt}</option>
          ))}
        </select>
      </div>

      {limit !== -1 && (
        <div className="pagination-pages">
          <button className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>‹</button>
          {pages.length > 0 && pages[0] > 1 && (
            <>
              <button className="btn btn-sm btn-outline" onClick={() => onPageChange(1)}>1</button>
              {pages[0] > 2 && <span className="pagination-dots">...</span>}
            </>
          )}
          {pages.map(p => (
            <button key={p} className={`btn btn-sm ${p === page ? 'btn-primary' : 'btn-outline'}`} onClick={() => onPageChange(p)}>
              {p}
            </button>
          ))}
          {pages.length > 0 && pages[pages.length - 1] < totalPages && (
            <>
              {pages[pages.length - 1] < totalPages - 1 && <span className="pagination-dots">...</span>}
              <button className="btn btn-sm btn-outline" onClick={() => onPageChange(totalPages)}>{totalPages}</button>
            </>
          )}
          <button className="btn btn-sm btn-outline" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>›</button>
        </div>
      )}

      <span className="pagination-info">{total} résultats</span>
    </div>
  );
}
