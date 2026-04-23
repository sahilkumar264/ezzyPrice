function AccountBar({ user, onLogout, isLoggingOut }) {
  const providerLabel =
    user.authProvider === "hybrid"
      ? "Email + Google"
      : user.authProvider === "google"
        ? "Google account"
        : "Email account";

  const identityInitial = user.name?.trim()?.charAt(0)?.toUpperCase() || "E";

  return (
    <section className="account-bar">
      <div className="account-bar__identity">
        <div className="account-bar__avatar-wrap">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="account-bar__avatar" />
          ) : (
            <span className="account-bar__avatar account-bar__avatar--fallback">
              {identityInitial}
            </span>
          )}
        </div>

        <div>
          <p className="eyebrow">Signed in</p>
          <h2>{user.name}</h2>
          <p className="account-bar__meta">
            {user.email} · {providerLabel}
          </p>
        </div>
      </div>

      <button
        type="button"
        className="account-bar__logout"
        onClick={onLogout}
        disabled={isLoggingOut}
      >
        {isLoggingOut ? "Logging out..." : "Logout"}
      </button>
    </section>
  );
}

export default AccountBar;
