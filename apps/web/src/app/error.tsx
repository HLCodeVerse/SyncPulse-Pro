'use client';

import React from 'react';

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#090a0f', color: '#fff', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '36px', fontWeight: 'bold', marginBottom: '16px' }}>Something went wrong!</h1>
      <button onClick={() => reset()} style={{ padding: '10px 20px', borderRadius: '8px', background: '#6366f1', color: '#fff', border: 'none', cursor: 'pointer' }}>
        Try Again
      </button>
    </div>
  );
}
