'use client';

import React from 'react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#090a0f', color: '#fff', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '16px' }}>404</h1>
      <p style={{ fontSize: '18px', color: '#94a3b8', marginBottom: '24px' }}>Page Not Found</p>
      <Link href="/" style={{ padding: '10px 20px', borderRadius: '8px', background: '#6366f1', color: '#fff', textDecoration: 'none' }}>
        Return to Home
      </Link>
    </div>
  );
}
