import React from 'react';
import { Package, DollarSign } from 'lucide-react';
import { Button, Card, Input, Badge } from './design-system';
import { CustomerHomeScreen, CourierDashboardScreen } from './mobile';
import { AdminDashboard } from './admin';

export const DesignSystemDemo: React.FC = () => {
  return (
    <div className="min-h-screen bg-matrix-bg p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Matrix Delivery Design System</h1>

        {/* Component Showcase */}
        <div className="space-y-8">
          {/* Buttons */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Buttons</h2>
            <div className="flex flex-wrap gap-4">
              <Button variant="primary">Primary Action</Button>
              <Button variant="secondary">Secondary Action</Button>
              <Button variant="outline">Outline Action</Button>
              <Button variant="ghost">Ghost Action</Button>
            </div>
          </section>

          {/* Cards */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Cards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card title="Order Statistics" icon={Package}>
                <p className="text-matrix-secondary">Total orders: 1,284</p>
                <p className="text-matrix-secondary">Active: 156</p>
              </Card>
              <Card title="Revenue" icon={DollarSign} gradient>
                <p className="text-white text-2xl font-bold">$24.8K</p>
                <p className="text-matrix-secondary">+24% from yesterday</p>
              </Card>
            </div>
          </section>

          {/* Inputs */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Form Inputs</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Email Address" placeholder="your@email.com" />
              <Input label="Delivery Address" placeholder="Enter delivery location" />
            </div>
          </section>

          {/* Badges */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Status Badges</h2>
            <div className="flex flex-wrap gap-3">
              <Badge variant="success">Delivered</Badge>
              <Badge variant="info">In Transit</Badge>
              <Badge variant="warning">Pending</Badge>
              <Badge variant="error">Cancelled</Badge>
              <Badge variant="secondary">New Order</Badge>
            </div>
          </section>
        </div>

        {/* Screen Previews */}
        <div className="mt-16 space-y-8">
          <h2 className="text-3xl font-bold text-white mb-8">Screen Previews</h2>

          {/* Mobile Screens */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Customer Mobile App</h3>
              <div className="bg-matrix-bg rounded-3xl p-4 border-4 border-matrix-border shadow-2xl max-w-sm mx-auto" style={{ height: '600px' }}>
                <CustomerHomeScreen />
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-4">Courier Mobile App</h3>
              <div className="bg-matrix-bg rounded-3xl p-4 border-4 border-matrix-border shadow-2xl max-w-sm mx-auto" style={{ height: '600px' }}>
                <CourierDashboardScreen />
              </div>
            </div>
          </div>

          {/* Admin Dashboard */}
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Admin Web Dashboard</h3>
            <div className="border-2 border-matrix-border rounded-lg overflow-hidden" style={{ height: '600px' }}>
              <AdminDashboard />
            </div>
          </div>
        </div>

        {/* Integration Guide */}
        <div className="mt-16">
          <Card>
            <h3 className="text-white text-xl font-semibold mb-4">Integration Guide</h3>
            <div className="space-y-4 text-matrix-secondary">
              <p>
                <strong className="text-white">1. Import Components:</strong> Import design system components from './components/design-system'
              </p>
              <p>
                <strong className="text-white">2. Replace Existing Components:</strong> Gradually replace old CSS classes with design system components
              </p>
              <p>
                <strong className="text-white">3. Use Tailwind Classes:</strong> The design system uses Tailwind CSS for styling (already configured)
              </p>
              <p>
                <strong className="text-white">4. Theme Colors:</strong> Use matrix-* color classes (e.g., text-matrix-green, bg-matrix-surface)
              </p>
              <p>
                <strong className="text-white">5. Responsive Design:</strong> Components are mobile-first and responsive by default
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DesignSystemDemo;
