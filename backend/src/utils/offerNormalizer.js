const parsePrice = (value) => {
  if (typeof value === "number") {
    return value;
  }

  if (!value) {
    return null;
  }

  const cleanedValue = String(value).replace(/[^0-9.]/g, "");
  const parsedValue = Number(cleanedValue);

  return Number.isFinite(parsedValue) ? parsedValue : null;
};

const formatPrice = (price, currency) => {
  if (!Number.isFinite(price)) {
    return "Price not available";
  }

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: currency === "INR" ? 0 : 2,
    }).format(price);
  } catch (error) {
    return `${currency} ${price}`;
  }
};

const toAbsoluteUrl = (value, baseUrl) => {
  if (!value) {
    return "";
  }

  try {
    return new URL(value, baseUrl).toString();
  } catch (error) {
    return value;
  }
};

const normalizeOffer = ({
  platform,
  sourceId,
  sourceType,
  title,
  price,
  currency = "INR",
  productUrl,
  imageUrl = "",
  availability = "Unknown",
  seller = "",
  shipping = "",
  rating = "",
}) => {
  const normalizedPrice = parsePrice(price);

  if (!title || !productUrl || !Number.isFinite(normalizedPrice)) {
    return null;
  }

  return {
    platform,
    sourceId,
    sourceType,
    title,
    price: normalizedPrice,
    priceDisplay: formatPrice(normalizedPrice, currency),
    currency,
    productUrl,
    imageUrl,
    availability,
    seller,
    shipping: shipping ? String(shipping) : "",
    rating: rating ? String(rating) : "",
  };
};

module.exports = {
  normalizeOffer,
  parsePrice,
  formatPrice,
  toAbsoluteUrl,
};
