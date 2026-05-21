function RecentSearches({ items, onReuse }) {
  if (!items?.length) {
    return null;
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Your history</p>
          <h2 className="panel-title">Recent searches</h2>
        </div>
      </div>

      <div className="recent-grid">
        {items.map((item) => (
          <button
            type="button"
            key={item.id}
            className="recent-card"
            onClick={() => onReuse(item.query)}
          >
            <span className="recent-query">{item.query}</span>
            <span className="recent-count">{item.totalOffers} offers found</span>
            <span className="recent-best">
              {item.bestOffer?.priceDisplay || "No lowest price saved"}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

export default RecentSearches;
