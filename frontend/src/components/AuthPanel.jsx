import { useEffect, useState } from "react";

import GoogleSignInButton from "./GoogleSignInButton";

const defaultFormState = {
  name: "",
  email: "",
  password: "",
  otp: "",
};

function AuthPanel({
  mode,
  signupStep,
  signupEmail,
  signupNotice,
  isLoading,
  errorMessage,
  googleClientId,
  onModeChange,
  onSubmit,
  onGoogleSignIn,
  onGoogleError,
  onSignupStepBack,
  onResendSignupOtp,
}) {
  const [formState, setFormState] = useState(defaultFormState);

  useEffect(() => {
    setFormState(defaultFormState);
  }, [mode]);

  const isSignupMode = mode === "signup";
  const isOtpStep = isSignupMode && signupStep === "verify";

  const updateField = (fieldName, value) => {
    setFormState((currentValue) => ({
      ...currentValue,
      [fieldName]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit(formState);
  };

  const handleResendOtp = async () => {
    await onResendSignupOtp(formState);
  };

  return (
    <section className="auth-card">
      <div className="auth-copy">
        <p className="eyebrow">Private account</p>
        <h1>{isSignupMode ? "Create your account" : "Welcome back"}</h1>
        <p className="hero-text">
          Save your own search history, keep your comparison flow private, and
          continue from the same account anytime.
        </p>
      </div>

      <div className="auth-toggle">
        <button
          type="button"
          className={`auth-toggle__button${!isSignupMode ? " auth-toggle__button--active" : ""}`}
          onClick={() => onModeChange("login")}
        >
          Login
        </button>
        <button
          type="button"
          className={`auth-toggle__button${isSignupMode ? " auth-toggle__button--active" : ""}`}
          onClick={() => onModeChange("signup")}
        >
          Sign up
        </button>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {isSignupMode && !isOtpStep ? (
          <>
            <label className="search-label" htmlFor="auth-name">
              Full name
              <input
                id="auth-name"
                type="text"
                className="search-input"
                value={formState.name}
                onChange={(event) => updateField("name", event.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </label>

            <label className="search-label" htmlFor="auth-email">
              Email
              <input
                id="auth-email"
                type="email"
                className="search-input"
                value={formState.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            <label className="search-label" htmlFor="auth-password">
              Password
              <input
                id="auth-password"
                type="password"
                className="search-input"
                value={formState.password}
                onChange={(event) => updateField("password", event.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="new-password"
              />
            </label>
          </>
        ) : null}

        {!isSignupMode ? (
          <>
            <label className="search-label" htmlFor="auth-email">
              Email
              <input
                id="auth-email"
                type="email"
                className="search-input"
                value={formState.email}
                onChange={(event) => updateField("email", event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </label>

            <label className="search-label" htmlFor="auth-password">
              Password
              <input
                id="auth-password"
                type="password"
                className="search-input"
                value={formState.password}
                onChange={(event) => updateField("password", event.target.value)}
                placeholder="Minimum 8 characters"
                autoComplete="current-password"
              />
            </label>
          </>
        ) : null}

        {isOtpStep ? (
          <>
            <div className="auth-otp-summary">
              <p className="auth-otp-summary__title">Email verification</p>
              <p className="auth-otp-summary__text">
                Enter the 6-digit OTP sent to <strong>{signupEmail || formState.email}</strong>.
              </p>
              {signupNotice ? <p className="auth-helper">{signupNotice}</p> : null}
            </div>

            <label className="search-label" htmlFor="auth-otp">
              OTP
              <input
                id="auth-otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="search-input auth-otp-input"
                value={formState.otp}
                onChange={(event) =>
                  updateField("otp", event.target.value.replace(/\D+/g, "").slice(0, 6))
                }
                placeholder="Enter 6-digit OTP"
                autoComplete="one-time-code"
              />
            </label>

            <div className="auth-inline-actions">
              <button
                type="button"
                className="auth-link-button"
                onClick={onSignupStepBack}
                disabled={isLoading}
              >
                Edit email details
              </button>
              <button
                type="button"
                className="auth-link-button"
                onClick={handleResendOtp}
                disabled={isLoading}
              >
                Resend OTP
              </button>
            </div>
          </>
        ) : null}

        <button type="submit" className="search-button auth-submit" disabled={isLoading}>
          {isLoading
            ? isSignupMode
              ? isOtpStep
                ? "Verifying OTP..."
                : "Sending OTP..."
              : "Logging in..."
            : isSignupMode
              ? isOtpStep
                ? "Verify OTP and create account"
                : "Send OTP"
              : "Login"}
        </button>
      </form>

      {errorMessage ? <p className="error-banner">{errorMessage}</p> : null}

      <div className="auth-divider">
        <span>or continue with</span>
      </div>

      <GoogleSignInButton
        clientId={googleClientId}
        disabled={isLoading}
        onCredential={onGoogleSignIn}
        onError={onGoogleError}
      />
    </section>
  );
}

export default AuthPanel;
