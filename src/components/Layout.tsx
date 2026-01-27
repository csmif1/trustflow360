import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, Users, Calendar, Search, Building2, Mail, Bell, LogOut, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Compliance', href: '/compliance', icon: FileText },
    { name: 'Documents', href: '/documents', icon: FileText },
    { name: 'Tax Reports', href: '/tax-reports', icon: FileText },
    { name: 'Workflows', href: '/workflows', icon: Calendar },
    { name: 'Email Logs', href: '/email-logs', icon: Mail },
    { name: 'Crummey Notices', href: '/crummey-notices', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">TrustFlow360 ILIT Platform</h1>
            </div>
            <Button variant="ghost" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </nav>

      <div className="flex">
        <aside className="w-64 bg-white shadow min-h-screen">
          <nav className="mt-8 px-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`mb-2 flex items-center rounded-lg px-4 py-2 text-sm font-medium ${
                    location.pathname === item.href
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="mr-3 h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}