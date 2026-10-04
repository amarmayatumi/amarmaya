import "./admin-global.css";

export const metadata = {
  title: "My Overtime - Admin Dashboard",
  description: "Admin Console v2.0",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#050505',
};

export default function AdminLayout({ children }) {
  return (
    <div className="admin-root viewport-fixed">
      {children}
    </div>
  );
}
