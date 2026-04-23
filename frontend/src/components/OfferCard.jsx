const formatSourceType = (sourceType) => {
  const labels = {
    api: "API",
    scraper: "Scraper",
    "browser-dom": "Browser",
    "ai-agent": "AI assist",
    hybrid: "Mixed",
  };

  return labels[sourceType] || sourceType;
};

function OfferCard({ offer, isBestOffer }) {
  return (
    <article className={`offer-card${isBestOffer ? " offer-card--best" : ""}`}>
      {isBestOffer ? <span className="offer-ribbon">Best live price</span> : null}

      <div className="offer-media">
        {offer.imageUrl ? (
          <img src={offer.imageUrl} alt={offer.title} className="offer-image" />
        ) : (
          <div className="offer-image offer-image--placeholder">Image not available</div>
        )}
      </div>

      <div className="offer-body">
        <div className="offer-topline">
          <span className="platform-badge">{offer.platform}</span>
          <span className="source-badge">{formatSourceType(offer.sourceType)}</span>
        </div>

        <h3 className="offer-title">{offer.title}</h3>
        <p className="offer-price">{offer.priceDisplay}</p>
        <div className="offer-meta-stack">
          <p className="offer-meta">Availability: {offer.availability || "Unknown"}</p>

          {offer.shipping ? <p className="offer-meta">Shipping: {offer.shipping}</p> : null}

          {offer.seller ? <p className="offer-meta">Seller: {offer.seller}</p> : null}
        </div>

        <a
          href={offer.productUrl}
          target="_blank"
          rel="noreferrer"
          className="offer-link"
        >
          View live product
        </a>
      </div>
    </article>
  );
}

export default OfferCard;
