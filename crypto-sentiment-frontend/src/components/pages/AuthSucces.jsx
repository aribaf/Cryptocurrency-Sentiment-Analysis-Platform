import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AuthSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Extract the hash and look for the token
    const hash = window.location.hash.replace("#", "");
    const params = new URLSearchParams(hash);
    const tokenFromUrl = params.get("access_token");

    // Debugging logs to help you see the state in the console
    console.log("Token from URL:", tokenFromUrl);

    // 2. Priority 1: If we found a token in the URL, save it and go to dashboard
    if (tokenFromUrl) {
      localStorage.setItem("access_token", tokenFromUrl);

      // Force a full-page redirect so the Auth provider re-reads localStorage and fetches /api/me with the token.
      // SPA navigation alone can run into a race where AuthContext mounted earlier and won't re-run.
      console.log("Stored access_token — doing full redirect to /dashboard to refresh auth state");
      window.location.replace("/dashboard");
      return;
    }

    // 3. Priority 2: If no token in URL, check if we ALREADY have one in storage
    const existingToken = localStorage.getItem("access_token");

    if (existingToken) {
      console.log("Using existing token from storage");
      navigate("/dashboard");
      return;
    }

    // 4. Failure: Only redirect to login if BOTH are missing
    console.error("No token found in URL or storage, redirecting to login.");
    navigate("/login");
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-black text-white font-mono">
      <p className="tracking-widest animate-pulse">-- INITIALIZING SESSION --</p>
    </div>
  );
}