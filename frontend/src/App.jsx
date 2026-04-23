import { useEffect, useState } from "react";

import {
  fetchCurrentUser,
  loginUser,
  loginWithGoogle,
  logoutUser,
  requestSignupOtp,
  verifySignupOtp,
} from "./api/auth";
import { fetchRecentSearches, getApiErrorMessage, searchProducts } from "./api/products";
import AccountBar from "./components/AccountBar";
import AuthPanel from "./components/AuthPanel";
import OfferCard from "./components/OfferCard";
import RecentSearches from "./components/RecentSearches";
import ResultsSummary from "./components/ResultsSummary";
import SearchForm from "./components/SearchForm";
import SourceStatusList from "./components/SourceStatusList";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const isUnauthorizedError = (error) => error?.response?.status === 401;

const authHighlights = [
  {
    label: "Live store scan",
    value: "API + browser mix",
  },
  {
    label: "Private history",
    value: "Per-user search timeline",
  },
  {
    label: "Smart auth",
    value: "Email OTP + Google sign-in",
  },
];

function App() {
  const [authMode, setAuthMode] = useState("login");
  const [signupStep, setSignupStep] = useState("details");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupNotice, setSignupNotice] = useState("");
  const [user, setUser] = useState(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);
  const [isBootLoading, setIsBootLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isRecentLoading, setIsRecentLoading] = useState(false);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [authErrorMessage, setAuthErrorMessage] = useState("");

  const loadRecentSearches = async () => {
    setIsRecentLoading(true);

    try {
      const items = await fetchRecentSearches();
      setRecentSearches(items);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        setUser(null);
        setRecentSearches([]);
        setResult(null);
        return;
      }

      setRecentSearches([]);
    } finally {
      setIsRecentLoading(false);
    }
  };

  useEffect(() => {
    const bootstrapApp = async () => {
      try {
        const data = await fetchCurrentUser();
        setUser(data.user);
        await loadRecentSearches();
      } catch (error) {
        setUser(null);
        setRecentSearches([]);
      } finally {
        setIsBootLoading(false);
      }
    };

    void bootstrapApp();
  }, []);

  const handleAuthSuccess = async (account) => {
    setUser(account);
    setAuthErrorMessage("");
    setErrorMessage("");
    setSignupStep("details");
    setSignupEmail("");
    setSignupNotice("");
    setResult(null);
    setQuery("");
    await loadRecentSearches();
  };

  const handleAuthSubmit = async (formState) => {
    setIsAuthSubmitting(true);
    setAuthErrorMessage("");

    try {
      if (authMode === "signup") {
        if (signupStep === "details") {
          const data = await requestSignupOtp(formState);
          setSignupStep("verify");
          setSignupEmail(data.email || formState.email.trim());
          setSignupNotice(data.message || "OTP sent to your email.");
          return;
        }

        const data = await verifySignupOtp({
          email: formState.email,
          otp: formState.otp,
        });

        await handleAuthSuccess(data.user);
        return;
      }

      const data = await loginUser({
        email: formState.email,
        password: formState.password,
      });

      await handleAuthSuccess(data.user);
    } catch (error) {
      setAuthErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleResendSignupOtp = async (formState) => {
    setIsAuthSubmitting(true);
    setAuthErrorMessage("");

    try {
      const data = await requestSignupOtp(formState);
      setSignupStep("verify");
      setSignupEmail(data.email || formState.email.trim());
      setSignupNotice(data.message || "OTP sent to your email.");
    } catch (error) {
      setAuthErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleGoogleSignIn = async (credential) => {
    setIsAuthSubmitting(true);
    setAuthErrorMessage("");

    try {
      const data = await loginWithGoogle(credential);
      await handleAuthSuccess(data.user);
    } catch (error) {
      setAuthErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await logoutUser();
    } catch (error) {
      // Keep the UI cleanup even if the cookie was already gone.
    } finally {
      setUser(null);
      setSignupStep("details");
      setSignupEmail("");
      setSignupNotice("");
      setQuery("");
      setResult(null);
      setRecentSearches([]);
      setErrorMessage("");
      setAuthErrorMessage("");
      setIsLoggingOut(false);
    }
  };

  const runSearch = async (searchQuery) => {
    const trimmedQuery = searchQuery.trim();

    if (trimmedQuery.length < 2) {
      setErrorMessage("Enter at least 2 characters.");
      return;
    }

    setIsSearching(true);
    setErrorMessage("");

    try {
      const data = await searchProducts(trimmedQuery);
      setResult(data);
      await loadRecentSearches();
    } catch (error) {
      if (isUnauthorizedError(error)) {
        setUser(null);
        setResult(null);
        setRecentSearches([]);
        setAuthErrorMessage("Your session ended. Please log in again.");
        return;
      }

      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await runSearch(query);
  };

  const handleReuseSearch = async (searchQuery) => {
    setQuery(searchQuery);
    await runSearch(searchQuery);
  };

  const dashboardHighlights = [
    {
      label: "Saved lookups",
      value: String(recentSearches.length).padStart(2, "0"),
      note: "Private to your account",
    },
    {
      label: "Best live offer",
      value: result?.summary?.bestOffer?.priceDisplay || "Ready to scan",
      note: result?.summary?.bestOffer?.platform || "Search to compare",
    },
    {
      label: "Platforms matched",
      value: result?.summary?.platformCount ? String(result.summary.platformCount) : "4+",
      note: result?.summary?.totalOffers
        ? `${result.summary.totalOffers} offers now`
        : "Across your active sources",
    },
  ];

  if (isBootLoading) {
    return (
      <main className="app-shell app-shell--loading">
        <div className="scene-orb scene-orb--orange" />
        <div className="scene-orb scene-orb--teal" />
        <section className="panel panel--empty">
          <p className="loading-copy">Loading your ezzyPrice workspace...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="app-shell app-shell--auth-scene">
        <div className="scene-orb scene-orb--orange" />
        <div className="scene-orb scene-orb--teal" />

        <section className="brand-stage">
          <div className="brand-mark brand-mark--hero">
            <span className="brand-mark__spark" />
            <span className="brand-mark__name">ezzyPrice</span>
          </div>

          <div className="brand-stage__copy">
            <p className="eyebrow">Price intelligence for everyday shopping</p>
            <h1>Spot the sharpest deal before anyone else clicks buy.</h1>
            <p className="hero-text">
              ezzyPrice brings together live marketplace data, secure private accounts,
              and a polished comparison experience built for fast decisions.
            </p>

            <div className="hero-pills">
              <span className="hero-pill">3D product cards</span>
              <span className="hero-pill">Email OTP security</span>
              <span className="hero-pill">Google sign-in</span>
            </div>
          </div>

          <div className="brand-stage__feature-grid">
            {authHighlights.map((item) => (
              <article className="feature-card" key={item.label}>
                <p className="feature-card__label">{item.label}</p>
                <h3>{item.value}</h3>
              </article>
            ))}
          </div>
        </section>

        <AuthPanel
          mode={authMode}
          signupStep={signupStep}
          signupEmail={signupEmail}
          signupNotice={signupNotice}
          isLoading={isAuthSubmitting}
          errorMessage={authErrorMessage}
          googleClientId={GOOGLE_CLIENT_ID}
          onModeChange={(nextMode) => {
            setAuthMode(nextMode);
            setSignupStep("details");
            setSignupEmail("");
            setSignupNotice("");
            setAuthErrorMessage("");
          }}
          onSubmit={handleAuthSubmit}
          onGoogleSignIn={handleGoogleSignIn}
          onGoogleError={setAuthErrorMessage}
          onSignupStepBack={() => {
            setSignupStep("details");
            setSignupNotice("");
            setAuthErrorMessage("");
          }}
          onResendSignupOtp={handleResendSignupOtp}
        />
      </main>
    );
  }

  return (
    <main className="app-shell app-shell--dashboard">
      <div className="scene-orb scene-orb--orange" />
      <div className="scene-orb scene-orb--teal" />

      <header className="brand-header">
        <div className="brand-mark">
          <span className="brand-mark__spark" />
          <span className="brand-mark__name">ezzyPrice</span>
        </div>

        <div className="brand-header__status">
          <span className="brand-header__chip">Live product comparison</span>
          <span className="brand-header__chip">Private account workspace</span>
        </div>
      </header>

      <AccountBar user={user} onLogout={handleLogout} isLoggingOut={isLoggingOut} />

      <section className="hero hero--ezzy">
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">ezzyPrice command deck</p>
            <h1>Compare prices across stores without losing your flow.</h1>
            <p className="hero-text">
              Search once, review the best live offers, and keep your history saved
              inside your own account. Designed to feel fast, premium, and clear.
            </p>

            <div className="hero-pills">
              <span className="hero-pill">API-first sources</span>
              <span className="hero-pill">Fallback scraping</span>
              <span className="hero-pill">Redis-boosted repeats</span>
            </div>
          </div>

          <aside className="hero-dashboard">
            {dashboardHighlights.map((item) => (
              <article className="insight-card" key={item.label}>
                <span className="insight-card__label">{item.label}</span>
                <strong>{item.value}</strong>
                <span className="insight-card__note">{item.note}</span>
              </article>
            ))}
          </aside>
        </div>

        <SearchForm
          value={query}
          onChange={setQuery}
          onSubmit={handleSubmit}
          isLoading={isSearching}
        />

        {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}
      </section>

      <RecentSearches items={recentSearches} onReuse={handleReuseSearch} />

      {isRecentLoading ? <p className="loading-copy">Refreshing your ezzyPrice history...</p> : null}

      {result ? (
        <>
          <ResultsSummary summary={result.summary} query={result.query} />
          <SourceStatusList items={result.sources} />

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Offer board</p>
                <h2 className="panel-title">Live product cards from active platforms</h2>
              </div>
            </div>

            {result.offers.length ? (
              <div className="offer-grid">
                {result.offers.map((offer) => {
                  const isBestOffer =
                    result.summary?.bestOffer?.productUrl === offer.productUrl;

                  return (
                    <OfferCard
                      key={`${offer.sourceId}-${offer.productUrl}`}
                      offer={offer}
                      isBestOffer={isBestOffer}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="loading-copy">
                No matching products showed up this time. Try a different product
                name or check whether a source is turned off.
              </p>
            )}
          </section>
        </>
      ) : (
        <section className="panel panel--empty">
          <p className="loading-copy">
            Start with a product name and ezzyPrice will build your comparison board.
          </p>
        </section>
      )}
    </main>
  );
}

export default App;
