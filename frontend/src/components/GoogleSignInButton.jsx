import { useEffect, useRef } from "react";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

const loadGoogleScript = () =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existingScript = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);

    if (existingScript) {
      existingScript.addEventListener("load", resolve, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("Google sign-in could not be loaded.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Google sign-in could not be loaded."));
    document.body.appendChild(script);
  });

function GoogleSignInButton({ clientId, disabled, onCredential, onError }) {
  const containerRef = useRef(null);

  useEffect(() => {
    let isCancelled = false;

    if (!clientId || !containerRef.current) {
      return undefined;
    }

    const renderButton = async () => {
      try {
        await loadGoogleScript();

        if (isCancelled || !containerRef.current || !window.google?.accounts?.id) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (disabled) {
              return;
            }

            if (!response?.credential) {
              onError?.("Google sign-in did not return a credential.");
              return;
            }

            onCredential(response.credential);
          },
        });

        containerRef.current.innerHTML = "";

        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: 320,
        });
      } catch (error) {
        if (!isCancelled) {
          onError?.(error.message || "Google sign-in could not be loaded.");
        }
      }
    };

    void renderButton();

    return () => {
      isCancelled = true;
    };
  }, [clientId, disabled, onCredential, onError]);

  if (!clientId) {
    return (
      <p className="auth-helper">
        Google sign-in will appear here after you add `VITE_GOOGLE_CLIENT_ID`.
      </p>
    );
  }

  return (
    <div className={`google-button-wrap${disabled ? " google-button-wrap--disabled" : ""}`}>
      <div ref={containerRef} />
    </div>
  );
}

export default GoogleSignInButton;
