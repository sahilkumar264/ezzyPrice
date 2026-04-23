function ResultsSummary({ summary, query }) {
  if (!summary) {
    return null;
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">ezzyPrice snapshot</p>
          <h2 className="panel-title">Matches for "{query}"</h2>
        </div>
      </div>

      <div className="stats-grid">
        <article className="stat-card">
          <span className="stat-label">Total offers</span>
          <strong>{summary.totalOffers}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Platforms</span>
          <strong>{summary.platformCount}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-label">Lowest price</span>
          <strong>{summary.bestOffer?.priceDisplay || "N/A"}</strong>
        </article>
      </div>

      {summary.bestOffer ? (
        <div className="summary-highlight">
          <p className="summary-text">
            Lowest price right now: {summary.bestOffer.platform} for{" "}
            {summary.bestOffer.priceDisplay}
          </p>
          {summary.bestOffer.productUrl ? (
            <a
              href={summary.bestOffer.productUrl}
              target="_blank"
              rel="noreferrer"
              className="summary-link"
            >
              Open lowest offer
            </a>
          ) : null}
        </div>
      ) : null}

      {summary.currencyNote ? <p className="summary-note">{summary.currencyNote}</p> : null}
    </section>
  );
}

export default ResultsSummary;
