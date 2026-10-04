"use client";

import dynamic from 'next/dynamic';

const AdminPanelClient = dynamic(() => import('./AdminPanelClient'), { ssr: false });

export default function Page() {
  return <AdminPanelClient />;
}
