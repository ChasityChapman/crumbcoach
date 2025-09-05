import React from "react";

export default function TestHome() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Test Home Page</h1>
      <p>This is a minimal test page to isolate the JavaScript error.</p>
      <p>If you see this without errors, the issue was in the original home component.</p>
    </div>
  );
}