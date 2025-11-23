// src/pages/ForgotPassword.jsx
import React, { useState } from 'react'; // Import useState for interactivity

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setMessage(`Sending link to ${email}...`);
    // In a real app, you would call an API here:
    // try { await sendResetLink({ email }); setMessage("✅ Reset link sent!"); }
    // catch (err) { setMessage("⚠️ Error sending link."); }
    setTimeout(() => {
        setMessage("✅ Reset link sent! Check your inbox.");
        // Optionally navigate away after successful send
    }, 2000);
  };

  return (
    // R1: Dark Background and Full-Screen Container
    <div className="flex items-center justify-center min-h-screen **bg-[#101010] p-4 sm:p-8**">
      
      {/* R2: Responsive Card using cyberpunk styling */}
      <form 
        onSubmit={handleSubmit}
        className="w-full max-w-sm **bg-black/50** p-8 **rounded-lg** **shadow-2xl shadow-indigo-500/10 border-2 border-indigo-700/50** text-center"
      >
        <h1 className="text-3xl font-extrabold mb-4 **text-white** tracking-tight">
          System <span className="text-[#d9ff2f]">Recovery</span>
        </h1>
        <p className="**text-gray-400** mb-6 text-sm">
          Enter your registered email address to receive a secure password reset link.
        </p>

        {message && (
             <div className="mb-4 text-sm font-medium text-center p-3 rounded-md bg-indigo-900/50 text-indigo-300">
                {message}
             </div>
        )}

        <input 
          type="email" 
          placeholder="Email Address" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          // R3: Input fields styled for the dark theme
          className="w-full px-4 py-3 **bg-gray-900** **text-white** **border-2 border-indigo-700/50** rounded-md mb-6 **focus:border-[#d9ff2f] focus:ring-1 focus:ring-[#d9ff2f]** transition-colors"
        />

        <button 
          type="submit"
          disabled={!email}
          // R4: Neon primary button style
          className="w-full py-3 **bg-[#d9ff2f]** **text-black** **font-semibold** rounded-md hover:bg-[#d9ff2f]/80 transition-colors disabled:bg-gray-700 disabled:text-gray-400"
        >
          Initiate Reset Sequence
        </button>

        <p className="mt-6 text-sm text-gray-400">
          <a href="/login" className="**text-indigo-400** hover:text-[#ff522f] hover:underline transition-colors">
            &larr; Back to Login Console
          </a>
        </p>
      </form>
    </div>
  );
}