const formatStatus = (status) => {
  if (status === "success") {
    return "Live";
  }

  return String(status || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const formatSourceType = (value) =>
  String(value || "source")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

function SourceStatusList({ items }) {
  if (!items?.length) {
    return null;
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Source engine</p>
          <h2 className="panel-title">Platforms used in this ezzyPrice search</h2>
        </div>
      </div>

      <div className="source-grid">
        {items.map((item) => (
          <article className="source-card" key={item.sourceId}>
            <div className="source-card__header">
              <h3>{item.name}</h3>
              <span className={`status-pill status-pill--${item.status}`}>
                {formatStatus(item.status)}
              </span>
            </div>
            <p className="source-card__type">{formatSourceType(item.sourceType)}</p>
            <p className="source-card__meta">{item.resultCount} matches</p>
            {item.message ? <p className="source-card__message">{item.message}</p> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export default SourceStatusList;
