import React, { useState } from 'react';
import {
  Home,
  BarChart3,
  Package,
  Users,
  Map as MapIcon,
  FileText,
  Settings,
  TrendingUp,
  DollarSign,
  Truck,
  Clock,
  Star,
  Activity,
  CreditCard
} from 'lucide-react';
import { Card } from '../design-system/Card';
import { Button } from '../design-system/Button';
import { Badge } from '../design-system/Badge';
import SystemHealthDashboard from './SystemHealthDashboard';
import AdminPaymentsPanel from './AdminPaymentsPanel';
import { AdminDepositsPanel } from './AdminDepositsPanel';

interface StatCard {
  label: string;
  value: string;
  change: string;
  color: string;
  icon: React.ComponentType<any>;
}

interface Order {
  id: string;
  customer: string;
  courier: string;
  status: string;
  amount: string;
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [pendingPaymentsCount, setPendingPaymentsCount] = useState(0);

  // Sidebar navigation
  const navItems = [
    { icon: Home, label: 'Dashboard' },
    { icon: Activity, label: 'System Health' },
    { icon: CreditCard, label: 'Payments', badge: pendingPaymentsCount > 0 ? pendingPaymentsCount : undefined },
    { icon: DollarSign, label: 'Deposits' },
    { icon: BarChart3, label: 'Analytics' },
    { icon: Package, label: 'Orders' },
    { icon: Users, label: 'Couriers' },
    { icon: MapIcon, label: 'Live Map' },
    { icon: FileText, label: 'Reports' },
    { icon: Settings, label: 'Settings' }
  ];

  // Stats data
  const stats: StatCard[] = [
    { label: 'Total Orders', value: '1,284', change: '+12%', color: '#00FF41', icon: Package },
    { label: 'Active Couriers', value: '156', change: '+8%', color: '#00F0FF', icon: Truck },
    { label: 'Revenue Today', value: '$24.8K', change: '+24%', color: '#B026FF', icon: DollarSign },
    { label: 'Avg Delivery Time', value: '18 min', change: '-5%', color: '#FFB800', icon: Clock }
  ];

  // Recent orders data
  const recentOrders: Order[] = [
    { id: 'MX-4521', customer: 'John Doe', courier: 'Sarah M.', status: 'In Transit', amount: '$42' },
    { id: 'MX-4520', customer: 'Jane Smith', courier: 'Mike R.', status: 'Delivered', amount: '$38' },
    { id: 'MX-4519', customer: 'Bob Johnson', courier: 'Lisa K.', status: 'Pending', amount: '$65' }
  ];

  // Top couriers data
  const topCouriers = [
    { name: 'Sarah Martinez', orders: 24, rating: 4.9 },
    { name: 'Mike Rodriguez', orders: 22, rating: 4.8 },
    { name: 'Lisa Kim', orders: 20, rating: 4.9 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Delivered': return 'success';
      case 'In Transit': return 'info';
      default: return 'warning';
    }
  };

  return (
    <div className="bg-matrix-bg min-h-screen flex">
      {/* Sidebar */}
      <div className="w-64 bg-matrix-surface border-r border-matrix-border p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">MATRIX</h1>
          <p className="text-matrix-green text-sm font-mono">DELIVERY</p>
        </div>
        <nav className="space-y-2">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveTab(item.label.toLowerCase().replace(' ', '-'))}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${activeTab === item.label.toLowerCase().replace(' ', '-')
                ? 'bg-matrix-green/10 text-matrix-green border border-matrix-green'
                : 'text-matrix-secondary hover:bg-matrix-elevated hover:text-white'
                }`}
              data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && (
                <span 
                  className="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full"
                  data-testid={`nav-badge-${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* System Health Tab */}
        {activeTab === 'system-health' && <SystemHealthDashboard />}

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <>
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h2>
              <p className="text-matrix-secondary">Real-time platform metrics and insights</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat) => (
                <Card key={stat.label} hover={true} className="hover:border-matrix-green">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-lg`} style={{ backgroundColor: `${stat.color}20` }}>
                      <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
                    </div>
                    <span className={`text-sm font-semibold px-2 py-1 rounded`} style={{ color: stat.color, backgroundColor: `${stat.color}20` }}>
                      {stat.change}
                    </span>
                  </div>
                  <p className="text-matrix-secondary text-sm mb-1">{stat.label}</p>
                  <p className="text-white text-2xl font-bold">{stat.value}</p>
                </Card>
              ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Orders Table */}
              <div className="lg:col-span-2">
                <Card>
                  <h3 className="text-white text-xl font-semibold mb-4">Recent Orders</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-matrix-secondary text-sm border-b border-matrix-border">
                          <th className="pb-3">Order ID</th>
                          <th className="pb-3">Customer</th>
                          <th className="pb-3">Courier</th>
                          <th className="pb-3">Status</th>
                          <th className="pb-3">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="text-white">
                        {recentOrders.map((order) => (
                          <tr key={order.id} className="border-b border-matrix-border hover:bg-matrix-elevated transition-colors">
                            <td className="py-4 font-mono text-matrix-green">{order.id}</td>
                            <td className="py-4">{order.customer}</td>
                            <td className="py-4">{order.courier}</td>
                            <td className="py-4">
                              <Badge variant={getStatusColor(order.status)}>
                                {order.status}
                              </Badge>
                            </td>
                            <td className="py-4 font-semibold">{order.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>

              {/* Top Couriers */}
              <div>
                <Card>
                  <h3 className="text-white text-xl font-semibold mb-4">Top Couriers</h3>
                  <div className="space-y-4">
                    {topCouriers.map((courier, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-matrix-elevated rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-matrix-green to-matrix-cyan flex items-center justify-center text-matrix-bg font-bold">
                            {courier.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">{courier.name}</p>
                            <p className="text-matrix-secondary text-xs">{courier.orders} orders</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-white font-semibold text-sm">{courier.rating}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <AdminPaymentsPanel onPendingCountChange={setPendingPaymentsCount} />
        )}

        {/* Deposits Tab */}
        {activeTab === 'deposits' && (
          <AdminDepositsPanel />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
