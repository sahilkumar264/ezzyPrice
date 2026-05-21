import { useEffect, useRef, useState } from "react";

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
  const shellRef = useRef(null);
  const [buttonWidth, setButtonWidth] = useState(320);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!shellRef.current) {
      return undefined;
    }

    const updateWidth = () => {
      const nextWidth = Math.max(240, Math.floor(shellRef.current?.clientWidth || 320));
      setButtonWidth(nextWidth);
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    resizeObserver.observe(shellRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    if (!clientId || !containerRef.current || !buttonWidth) {
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
          width: buttonWidth,
          logo_alignment: "left",
        });

        setStatusMessage("");
      } catch (error) {
        const message = error.message || "Google sign-in could not be loaded.";

        if (!isCancelled) {
          setStatusMessage(message);
          onError?.(message);
        }
      }
    };

    void renderButton();

    return () => {
      isCancelled = true;
    };
  }, [buttonWidth, clientId, disabled, onCredential, onError]);

  if (!clientId) {
    return (
      <p className="auth-helper">
        Google sign-in will appear here after you add `VITE_GOOGLE_CLIENT_ID`.
      </p>
    );
  }

  return (
    <div className={`google-button-wrap${disabled ? " google-button-wrap--disabled" : ""}`}>
      <div className="google-button-shell" ref={shellRef}>
        <div className="google-button-visual" aria-hidden="true">
          <span className="google-button-visual__icon">
            <span className="google-button-visual__g">G</span>
          </span>
          <span className="google-button-visual__label">Continue with Google</span>
        </div>
        <div className="google-button-target" ref={containerRef} />
        {statusMessage ? <p className="auth-helper">{statusMessage}</p> : null}
      </div>
    </div>
  );
}

export default GoogleSignInButton;
