function SearchForm({ value, onChange, onSubmit, isLoading }) {
  return (
    <form className="search-form" onSubmit={onSubmit}>
      <div className="search-form__heading">
        <div>
          <label className="search-label" htmlFor="product-query">
            Search any product
          </label>
          <p className="search-form__hint">
            ezzyPrice scans your active stores and lines up the live offers in one view.
          </p>
        </div>
      </div>

      <div className="search-input-row">
        <input
          id="product-query"
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Try iPhone 15, air fryer, gaming laptop..."
          className="search-input"
        />

        <button type="submit" className="search-button" disabled={isLoading}>
          {isLoading ? "Scanning..." : "Compare now"}
        </button>
      </div>
    </form>
  );
}

export default SearchForm;
