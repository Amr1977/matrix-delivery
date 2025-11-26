import React, { useState } from 'react';
import { Package, Truck, MapPin, Clock, DollarSign, Star, Menu, X, ChevronRight, Play, Zap, Shield, Users, TrendingUp, Eye, Bell, Settings, User, LogOut, Home, BarChart3, Map as MapIcon, FileText } from 'lucide-react';

const DesignSystem = () => {
  const [activeTab, setActiveTab] = useState('colors');
  const [mobileScreen, setMobileScreen] = useState('customer-home');
  const [webScreen, setWebScreen] = useState('dashboard');

  // Color Palette
  const colors = {
    primary: {
      matrix: '#00FF41',
      cyan: '#00F0FF',
      purple: '#B026FF',
      pink: '#FF2E97'
    },
    dark: {
      bg: '#0A0E14',
      surface: '#131820',
      elevated: '#1A1F2E',
      border: '#2A3142'
    },
    semantic: {
      success: '#00FF41',
      warning: '#FFB800',
      error: '#FF2E63',
      info: '#00F0FF'
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#A0AEC0',
      muted: '#64748B'
    }
  };

  // Typography Scale
  const typography = [
    { name: 'Display', size: '3.75rem', weight: '700', usage: 'Hero sections' },
    { name: 'H1', size: '3rem', weight: '700', usage: 'Page titles' },
    { name: 'H2', size: '2.25rem', weight: '600', usage: 'Section headers' },
    { name: 'H3', size: '1.875rem', weight: '600', usage: 'Card titles' },
    { name: 'H4', size: '1.5rem', weight: '600', usage: 'Subsections' },
    { name: 'Body Large', size: '1.125rem', weight: '400', usage: 'Primary content' },
    { name: 'Body', size: '1rem', weight: '400', usage: 'Default text' },
    { name: 'Body Small', size: '0.875rem', weight: '400', usage: 'Secondary text' },
    { name: 'Caption', size: '0.75rem', weight: '500', usage: 'Labels, metadata' }
  ];

  // Components Library
  const ButtonShowcase = () => (
    <div className="space-y-6">
      <div>
        <h4 className="text-white text-lg font-semibold mb-3">Primary Buttons</h4>
        <div className="flex flex-wrap gap-3">
          <button className="px-6 py-3 bg-gradient-to-r from-[#00FF41] to-[#00F0FF] text-[#0A0E14] font-semibold rounded-lg hover:shadow-lg hover:shadow-[#00FF41]/50 transition-all duration-300">
            Place Order
          </button>
          <button className="px-6 py-3 bg-[#B026FF] text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-[#B026FF]/50 transition-all duration-300">
            Accept Delivery
          </button>
          <button className="px-6 py-3 bg-[#131820] text-white font-semibold rounded-lg border border-[#00FF41] hover:bg-[#00FF41]/10 transition-all duration-300">
            View Details
          </button>
        </div>
      </div>
      <div>
        <h4 className="text-white text-lg font-semibold mb-3">Icon Buttons</h4>
        <div className="flex gap-3">
          <button className="p-3 bg-[#131820] rounded-lg border border-[#2A3142] hover:border-[#00FF41] transition-all">
            <Bell className="w-5 h-5 text-[#00FF41]" />
          </button>
          <button className="p-3 bg-[#131820] rounded-lg border border-[#2A3142] hover:border-[#00F0FF] transition-all">
            <Settings className="w-5 h-5 text-[#00F0FF]" />
          </button>
          <button className="p-3 bg-[#131820] rounded-lg border border-[#2A3142] hover:border-[#B026FF] transition-all">
            <User className="w-5 h-5 text-[#B026FF]" />
          </button>
        </div>
      </div>
    </div>
  );

  const CardShowcase = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-[#131820] border border-[#2A3142] rounded-xl p-6 hover:border-[#00FF41] transition-all duration-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#00FF41]/10 rounded-lg">
            <Package className="w-6 h-6 text-[#00FF41]" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Active Orders</h3>
            <p className="text-[#A0AEC0] text-sm">In transit now</p>
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-2">24</div>
        <div className="flex items-center text-[#00FF41] text-sm">
          <TrendingUp className="w-4 h-4 mr-1" />
          <span>+12% from yesterday</span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#1A1F2E] to-[#131820] border border-[#B026FF] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#B026FF]/10 rounded-lg">
            <DollarSign className="w-6 h-6 text-[#B026FF]" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Today's Earnings</h3>
            <p className="text-[#A0AEC0] text-sm">Total revenue</p>
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-2">$2,847</div>
        <div className="flex items-center text-[#B026FF] text-sm">
          <Zap className="w-4 h-4 mr-1" />
          <span>Peak performance</span>
        </div>
      </div>
    </div>
  );

  // Customer Mobile Screens
  const CustomerHomeScreen = () => (
    <div className="bg-[#0A0E14] h-full flex flex-col">
      <div className="p-6 bg-gradient-to-b from-[#131820] to-[#0A0E14]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-[#A0AEC0] text-sm">Welcome back,</p>
            <h2 className="text-white text-2xl font-bold">Alex</h2>
          </div>
          <button className="p-3 bg-[#131820] rounded-full border border-[#2A3142]">
            <Bell className="w-5 h-5 text-[#00FF41]" />
          </button>
        </div>
        
        <div className="bg-[#131820] rounded-xl p-4 border border-[#2A3142]">
          <input 
            type="text" 
            placeholder="Search for items, restaurants..." 
            className="bg-transparent text-white w-full outline-none placeholder-[#64748B]"
          />
        </div>
      </div>

      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        <div>
          <h3 className="text-white font-semibold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="bg-gradient-to-br from-[#00FF41] to-[#00F0FF] p-4 rounded-xl text-[#0A0E14] font-semibold hover:scale-105 transition-transform">
              <Package className="w-6 h-6 mb-2" />
              New Order
            </button>
            <button className="bg-[#131820] p-4 rounded-xl text-white font-semibold border border-[#2A3142] hover:border-[#B026FF] transition-all">
              <MapPin className="w-6 h-6 mb-2 text-[#B026FF]" />
              Track
            </button>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-white font-semibold">Active Orders</h3>
            <ChevronRight className="w-5 h-5 text-[#00FF41]" />
          </div>
          <div className="bg-[#131820] rounded-xl p-4 border border-[#00FF41] space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white font-semibold">Order #MX-4521</p>
                <p className="text-[#A0AEC0] text-sm">2 items • Electronics</p>
              </div>
              <span className="px-3 py-1 bg-[#00FF41]/10 text-[#00FF41] text-xs font-semibold rounded-full">
                IN TRANSIT
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-[#00F0FF]" />
              <p className="text-[#A0AEC0] text-sm">Arrives in 15 minutes</p>
            </div>
            <div className="w-full bg-[#2A3142] rounded-full h-2">
              <div className="bg-gradient-to-r from-[#00FF41] to-[#00F0FF] h-2 rounded-full w-3/4"></div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#131820] rounded-lg p-3 border border-[#2A3142] flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#B026FF]/10 rounded-lg">
                    <Package className="w-4 h-4 text-[#B026FF]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">Order #MX-{4520 - i}</p>
                    <p className="text-[#A0AEC0] text-xs">Delivered 2 days ago</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#64748B]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Courier Mobile Screen
  const CourierDashboardScreen = () => (
    <div className="bg-[#0A0E14] h-full flex flex-col">
      <div className="p-6 bg-gradient-to-b from-[#131820] to-[#0A0E14]">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-[#A0AEC0] text-sm">Good morning,</p>
            <h2 className="text-white text-2xl font-bold">Sarah</h2>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-[#00FF41] text-[#0A0E14] rounded-full font-semibold text-sm">
              ONLINE
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#131820] rounded-xl p-3 border border-[#2A3142]">
            <p className="text-[#A0AEC0] text-xs mb-1">Today</p>
            <p className="text-white text-xl font-bold">$328</p>
          </div>
          <div className="bg-[#131820] rounded-xl p-3 border border-[#2A3142]">
            <p className="text-[#A0AEC0] text-xs mb-1">Orders</p>
            <p className="text-white text-xl font-bold">12</p>
          </div>
          <div className="bg-[#131820] rounded-xl p-3 border border-[#2A3142]">
            <p className="text-[#A0AEC0] text-xs mb-1">Rating</p>
            <div className="flex items-center">
              <p className="text-white text-xl font-bold mr-1">4.9</p>
              <Star className="w-4 h-4 text-[#FFB800] fill-[#FFB800]" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        <div>
          <h3 className="text-white font-semibold mb-3">Available Orders</h3>
          <div className="space-y-3">
            <div className="bg-gradient-to-br from-[#131820] to-[#1A1F2E] rounded-xl p-4 border border-[#00FF41]">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-white font-semibold">Premium Delivery</p>
                  <p className="text-[#A0AEC0] text-sm">2.4 km away</p>
                </div>
                <span className="px-3 py-1 bg-[#00FF41] text-[#0A0E14] text-sm font-bold rounded-full">
                  $24
                </span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#00FF41] mt-0.5" />
                  <div>
                    <p className="text-white text-sm">Pickup</p>
                    <p className="text-[#A0AEC0] text-xs">Tech Store, Downtown</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#FF2E97] mt-0.5" />
                  <div>
                    <p className="text-white text-sm">Dropoff</p>
                    <p className="text-[#A0AEC0] text-xs">Residential Area, 5th Ave</p>
                  </div>
                </div>
              </div>
              <button className="w-full py-3 bg-gradient-to-r from-[#00FF41] to-[#00F0FF] text-[#0A0E14] font-bold rounded-lg hover:shadow-lg hover:shadow-[#00FF41]/50 transition-all">
                Accept Order
              </button>
            </div>

            <div className="bg-[#131820] rounded-xl p-4 border border-[#2A3142]">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-white font-semibold">Standard Delivery</p>
                  <p className="text-[#A0AEC0] text-sm">4.1 km away</p>
                </div>
                <span className="px-3 py-1 bg-[#B026FF]/20 text-[#B026FF] text-sm font-bold rounded-full">
                  $18
                </span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#00F0FF] mt-0.5" />
                  <div>
                    <p className="text-white text-sm">Restaurant District</p>
                    <p className="text-[#A0AEC0] text-xs">3 items</p>
                  </div>
                </div>
              </div>
              <button className="w-full py-3 bg-[#131820] text-white font-semibold rounded-lg border border-[#2A3142] hover:border-[#B026FF] transition-all">
                View Details
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Web Dashboard
  const WebDashboard = () => (
    <div className="bg-[#0A0E14] min-h-screen flex">
      <div className="w-64 bg-[#131820] border-r border-[#2A3142] p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">MATRIX</h1>
          <p className="text-[#00FF41] text-sm font-mono">DELIVERY</p>
        </div>
        <nav className="space-y-2">
          {[
            { icon: Home, label: 'Dashboard', active: true },
            { icon: BarChart3, label: 'Analytics' },
            { icon: Package, label: 'Orders' },
            { icon: Users, label: 'Couriers' },
            { icon: MapIcon, label: 'Live Map' },
            { icon: FileText, label: 'Reports' },
            { icon: Settings, label: 'Settings' }
          ].map((item) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                item.active
                  ? 'bg-[#00FF41]/10 text-[#00FF41] border border-[#00FF41]'
                  : 'text-[#A0AEC0] hover:bg-[#1A1F2E] hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h2>
          <p className="text-[#A0AEC0]">Real-time platform metrics and insights</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Orders', value: '1,284', change: '+12%', color: '#00FF41', icon: Package },
            { label: 'Active Couriers', value: '156', change: '+8%', color: '#00F0FF', icon: Truck },
            { label: 'Revenue Today', value: '$24.8K', change: '+24%', color: '#B026FF', icon: DollarSign },
            { label: 'Avg Delivery Time', value: '18 min', change: '-5%', color: '#FFB800', icon: Clock }
          ].map((stat) => (
            <div key={stat.label} className="bg-[#131820] rounded-xl p-6 border border-[#2A3142] hover:border-[#00FF41] transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-lg`} style={{ backgroundColor: `${stat.color}20` }}>
                  <stat.icon className="w-6 h-6" style={{ color: stat.color }} />
                </div>
                <span className={`text-sm font-semibold px-2 py-1 rounded`} style={{ color: stat.color, backgroundColor: `${stat.color}20` }}>
                  {stat.change}
                </span>
              </div>
              <p className="text-[#A0AEC0] text-sm mb-1">{stat.label}</p>
              <p className="text-white text-2xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-[#131820] rounded-xl p-6 border border-[#2A3142]">
            <h3 className="text-white text-xl font-semibold mb-4">Recent Orders</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-[#A0AEC0] text-sm border-b border-[#2A3142]">
                    <th className="pb-3">Order ID</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Courier</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Amount</th>
                  </tr>
                </thead>
                <tbody className="text-white">
                  {[
                    { id: 'MX-4521', customer: 'John Doe', courier: 'Sarah M.', status: 'In Transit', amount: '$42' },
                    { id: 'MX-4520', customer: 'Jane Smith', courier: 'Mike R.', status: 'Delivered', amount: '$38' },
                    { id: 'MX-4519', customer: 'Bob Johnson', courier: 'Lisa K.', status: 'Pending', amount: '$65' }
                  ].map((order) => (
                    <tr key={order.id} className="border-b border-[#2A3142] hover:bg-[#1A1F2E] transition-colors">
                      <td className="py-4 font-mono text-[#00FF41]">{order.id}</td>
                      <td className="py-4">{order.customer}</td>
                      <td className="py-4">{order.courier}</td>
                      <td className="py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          order.status === 'Delivered' ? 'bg-[#00FF41]/10 text-[#00FF41]' :
                          order.status === 'In Transit' ? 'bg-[#00F0FF]/10 text-[#00F0FF]' :
                          'bg-[#FFB800]/10 text-[#FFB800]'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="py-4 font-semibold">{order.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-[#131820] rounded-xl p-6 border border-[#2A3142]">
            <h3 className="text-white text-xl font-semibold mb-4">Top Couriers</h3>
            <div className="space-y-4">
              {[
                { name: 'Sarah Martinez', orders: 24, rating: 4.9 },
                { name: 'Mike Rodriguez', orders: 22, rating: 4.8 },
                { name: 'Lisa Kim', orders: 20, rating: 4.9 }
              ].map((courier, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-[#1A1F2E] rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00FF41] to-[#00F0FF] flex items-center justify-center text-[#0A0E14] font-bold">
                      {courier.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{courier.name}</p>
                      <p className="text-[#A0AEC0] text-xs">{courier.orders} orders</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-[#FFB800] fill-[#FFB800]" />
                    <span className="text-white font-semibold text-sm">{courier.rating}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Landing Page
  const LandingPage = () => (
    <div className="bg-[#0A0E14] min-h-screen">
      <nav className="border-b border-[#2A3142] bg-[#131820]/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00FF41] to-[#00F0FF] rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-[#0A0E14]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">MATRIX</h1>
              <p className="text-[#00FF41] text-xs font-mono">DELIVERY</p>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-[#A0AEC0] hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="text-[#A0AEC0] hover:text-white transition-colors">Pricing</a>
            <a href="#contact" className="text-[#A0AEC0] hover:text-white transition-colors">Contact</a>
            <button className="px-6 py-2 bg-gradient-to-r from-[#00FF41] to-[#00F0FF] text-[#0A0E14] font-bold rounded-lg hover:shadow-lg hover:shadow-[#00FF41]/50 transition-all">
              Get Started
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 bg-[#00FF41]/10 border border-[#00FF41] rounded-full mb-6">
            <span className="text-[#00FF41] text-sm font-semibold">NEXT-GEN DELIVERY PLATFORM</span>
          </div>
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Delivery at the
            <span className="block bg-gradient-to-r from-[#00FF41] via-[#00F0FF] to-[#B026FF] text-transparent bg-clip-text">
              Speed of Light
            </span>
          </h1>
          <p className="text-xl text-[#A0AEC0] mb-8 max-w-2xl mx-auto">
            Revolutionary logistics powered by AI, real-time tracking, and fair earnings for couriers. Welcome to the future of delivery.
          </p>
          <div className="flex justify-center gap-4">
            <button className="px-8 py-4 bg-gradient-to-r from-[#00FF41] to-[#00F0FF] text-[#0A0E14] font-bold rounded-lg text-lg hover:shadow-lg hover:shadow-[#00FF41]/50 transition-all flex items-center gap-2">
              <Play className="w-5 h-5" />
              Watch Demo
            </button>
            <button className="px-8 py-4 bg-[#131820] text-white font-bold rounded-lg text-lg border border-[#2A3142] hover:border-[#00FF41] transition-all">
              Learn More
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20">
          {[
            { icon: Zap, title: 'Lightning Fast', desc: 'Average delivery in under 20 minutes' },
            { icon: Shield, title: 'Fully Transparent', desc: 'Real-time tracking and updates' },
            { icon: Users, title: 'Fair Earnings', desc: '100% of tips go to couriers' }
          ].map((feature, i) => (
            <div key={i} className="bg-[#131820] border border-[#2A3142] rounded-xl p-8 hover:border-[#00FF41] transition-all group">
              <div className="w-12 h-12 bg-[#00FF41]/10 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-[#00FF41]" />
              </div>
              <h3 className="text-white text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-[#A0AEC0]">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0E14]">
      <div className="bg-[#131820] border-b border-[#2A3142] p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-2">Matrix Delivery Platform</h1>
          <p className="text-[#00FF41] font-mono">Complete Design System & UI Kit</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {['colors', 'typography', 'components', 'customer-app', 'courier-app', 'web-dashboard', 'landing'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-lg font-semibold whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-[#00FF41] to-[#00F0FF] text-[#0A0E14]'
                  : 'bg-[#131820] text-[#A0AEC0] border border-[#2A3142] hover:border-[#00FF41]'
              }`}
            >
              {tab.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
            </button>
          ))}
        </div>

        <div className="bg-[#131820] rounded-xl border border-[#2A3142] p-8">
          {activeTab === 'colors' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Color Palette</h2>
                <p className="text-[#A0AEC0] mb-6">A futuristic palette combining Matrix green with cyberpunk accents</p>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Primary Colors</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(colors.primary).map(([name, hex]) => (
                    <div key={name} className="space-y-2">
                      <div className="h-24 rounded-lg border-2 border-white/10" style={{ backgroundColor: hex }}></div>
                      <p className="text-white font-semibold capitalize">{name}</p>
                      <p className="text-[#A0AEC0] text-sm font-mono">{hex}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Dark Theme Surfaces</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(colors.dark).map(([name, hex]) => (
                    <div key={name} className="space-y-2">
                      <div className="h-24 rounded-lg border-2 border-white/10" style={{ backgroundColor: hex }}></div>
                      <p className="text-white font-semibold capitalize">{name}</p>
                      <p className="text-[#A0AEC0] text-sm font-mono">{hex}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-semibold text-white mb-4">Semantic Colors</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {Object.entries(colors.semantic).map(([name, hex]) => (
                    <div key={name} className="space-y-2">
                      <div className="h-24 rounded-lg border-2 border-white/10" style={{ backgroundColor: hex }}></div>
                      <p className="text-white font-semibold capitalize">{name}</p>
                      <p className="text-[#A0AEC0] text-sm font-mono">{hex}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'typography' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Typography System</h2>
                <p className="text-[#A0AEC0] mb-6">Font Family: Inter (primary), JetBrains Mono (code/mono)</p>
              </div>

              <div className="space-y-6">
                {typography.map((type) => (
                  <div key={type.name} className="border-b border-[#2A3142] pb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-[#00FF41] text-sm font-semibold mb-1">{type.name}</p>
                        <p className="text-[#A0AEC0] text-sm">{type.usage}</p>
                      </div>
                      <div className="text-[#A0AEC0] text-sm">
                        <p>Size: {type.size}</p>
                        <p>Weight: {type.weight}</p>
                      </div>
                    </div>
                    <p className="text-white" style={{ fontSize: type.size, fontWeight: type.weight }}>
                      The quick brown fox jumps over the lazy dog
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'components' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Component Library</h2>
                <p className="text-[#A0AEC0] mb-6">Reusable components with hover states and animations</p>
              </div>

              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Buttons</h3>
                  <ButtonShowcase />
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Cards</h3>
                  <CardShowcase />
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Form Inputs</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white text-sm font-semibold mb-2 block">Email Address</label>
                      <input 
                        type="email"
                        placeholder="your@email.com"
                        className="w-full px-4 py-3 bg-[#0A0E14] border border-[#2A3142] rounded-lg text-white placeholder-[#64748B] focus:border-[#00FF41] focus:outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-white text-sm font-semibold mb-2 block">Select Option</label>
                      <select className="w-full px-4 py-3 bg-[#0A0E14] border border-[#2A3142] rounded-lg text-white focus:border-[#00FF41] focus:outline-none transition-colors">
                        <option>Standard Delivery</option>
                        <option>Express Delivery</option>
                        <option>Same Day</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">Status Badges</h3>
                  <div className="flex flex-wrap gap-3">
                    <span className="px-4 py-2 bg-[#00FF41]/10 text-[#00FF41] rounded-full text-sm font-semibold border border-[#00FF41]">
                      Delivered
                    </span>
                    <span className="px-4 py-2 bg-[#00F0FF]/10 text-[#00F0FF] rounded-full text-sm font-semibold border border-[#00F0FF]">
                      In Transit
                    </span>
                    <span className="px-4 py-2 bg-[#FFB800]/10 text-[#FFB800] rounded-full text-sm font-semibold border border-[#FFB800]">
                      Pending
                    </span>
                    <span className="px-4 py-2 bg-[#FF2E63]/10 text-[#FF2E63] rounded-full text-sm font-semibold border border-[#FF2E63]">
                      Cancelled
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customer-app' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Customer Mobile App</h2>
                <p className="text-[#A0AEC0] mb-6">iOS/Android app for customers to place and track orders</p>
              </div>

              <div className="flex gap-3 mb-6">
                {['customer-home', 'customer-order', 'customer-track'].map((screen) => (
                  <button
                    key={screen}
                    onClick={() => setMobileScreen(screen)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      mobileScreen === screen
                        ? 'bg-[#00FF41] text-[#0A0E14]'
                        : 'bg-[#0A0E14] text-[#A0AEC0] border border-[#2A3142]'
                    }`}
                  >
                    {screen.split('-')[1].charAt(0).toUpperCase() + screen.split('-')[1].slice(1)}
                  </button>
                ))}
              </div>

              <div className="max-w-md mx-auto">
                <div className="bg-[#0A0E14] rounded-3xl p-4 border-4 border-[#2A3142] shadow-2xl" style={{ height: '700px' }}>
                  {mobileScreen === 'customer-home' && <CustomerHomeScreen />}
                  {mobileScreen === 'customer-order' && (
                    <div className="bg-[#0A0E14] h-full flex flex-col p-6">
                      <h2 className="text-2xl font-bold text-white mb-6">New Order</h2>
                      <div className="space-y-4 flex-1">
                        <div>
                          <label className="text-white text-sm font-semibold mb-2 block">Pickup Location</label>
                          <div className="flex items-center gap-3 p-4 bg-[#131820] rounded-lg border border-[#2A3142]">
                            <MapPin className="w-5 h-5 text-[#00FF41]" />
                            <input type="text" placeholder="Enter pickup address" className="bg-transparent text-white flex-1 outline-none" />
                          </div>
                        </div>
                        <div>
                          <label className="text-white text-sm font-semibold mb-2 block">Delivery Location</label>
                          <div className="flex items-center gap-3 p-4 bg-[#131820] rounded-lg border border-[#2A3142]">
                            <MapPin className="w-5 h-5 text-[#FF2E97]" />
                            <input type="text" placeholder="Enter delivery address" className="bg-transparent text-white flex-1 outline-none" />
                          </div>
                        </div>
                        <div>
                          <label className="text-white text-sm font-semibold mb-2 block">Package Details</label>
                          <textarea 
                            placeholder="Describe your package..."
                            className="w-full p-4 bg-[#131820] border border-[#2A3142] rounded-lg text-white placeholder-[#64748B] outline-none"
                            rows={3}
                          />
                        </div>
                        <div className="bg-[#131820] rounded-lg p-4 border border-[#2A3142]">
                          <div className="flex justify-between mb-2">
                            <span className="text-[#A0AEC0]">Estimated Distance</span>
                            <span className="text-white font-semibold">5.2 km</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#A0AEC0]">Delivery Fee</span>
                            <span className="text-[#00FF41] font-bold text-lg">$12.50</span>
                          </div>
                        </div>
                      </div>
                      <button className="w-full py-4 bg-gradient-to-r from-[#00FF41] to-[#00F0FF] text-[#0A0E14] font-bold rounded-lg text-lg mt-4">
                        Confirm Order
                      </button>
                    </div>
                  )}
                  {mobileScreen === 'customer-track' && (
                    <div className="bg-[#0A0E14] h-full flex flex-col">
                      <div className="h-64 bg-[#131820] rounded-t-2xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#00FF41]/20 to-[#00F0FF]/20"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <div className="w-16 h-16 bg-[#00FF41] rounded-full animate-pulse flex items-center justify-center">
                            <Truck className="w-8 h-8 text-[#0A0E14]" />
                          </div>
                        </div>
                      </div>
                      <div className="flex-1 p-6 space-y-6">
                        <div className="text-center">
                          <h3 className="text-white text-xl font-bold mb-2">Your order is on the way!</h3>
                          <p className="text-[#A0AEC0]">Estimated arrival in 12 minutes</p>
                        </div>
                        <div className="space-y-3">
                          {[
                            { label: 'Order Confirmed', time: '2:30 PM', done: true },
                            { label: 'Courier Assigned', time: '2:35 PM', done: true },
                            { label: 'Picked Up', time: '2:45 PM', done: true },
                            { label: 'Out for Delivery', time: '3:00 PM', done: false },
                            { label: 'Delivered', time: 'Est. 3:15 PM', done: false }
                          ].map((step, i) => (
                            <div key={i} className="flex items-center gap-4">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                step.done ? 'bg-[#00FF41]' : 'bg-[#2A3142]'
                              }`}>
                                {step.done ? (
                                  <div className="w-5 h-5 bg-[#0A0E14] rounded-full"></div>
                                ) : (
                                  <div className="w-3 h-3 bg-[#64748B] rounded-full"></div>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className={`font-semibold ${step.done ? 'text-white' : 'text-[#64748B]'}`}>
                                  {step.label}
                                </p>
                                <p className="text-[#A0AEC0] text-sm">{step.time}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="bg-[#131820] rounded-lg p-4 border border-[#2A3142] flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00FF41] to-[#00F0FF] flex items-center justify-center text-[#0A0E14] font-bold">
                            SM
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-semibold">Sarah Martinez</p>
                            <div className="flex items-center gap-1">
                              <Star className="w-4 h-4 text-[#FFB800] fill-[#FFB800]" />
                              <span className="text-[#A0AEC0] text-sm">4.9 • 234 deliveries</span>
                            </div>
                          </div>
                          <button className="p-3 bg-[#00FF41]/10 rounded-lg">
                            <span className="text-[#00FF41] font-semibold">Call</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'courier-app' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Courier Mobile App</h2>
                <p className="text-[#A0AEC0] mb-6">Dedicated app for couriers to manage deliveries and earnings</p>
              </div>

              <div className="max-w-md mx-auto">
                <div className="bg-[#0A0E14] rounded-3xl p-4 border-4 border-[#2A3142] shadow-2xl" style={{ height: '700px' }}>
                  <CourierDashboardScreen />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'web-dashboard' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Admin Web Dashboard</h2>
                <p className="text-[#A0AEC0] mb-6">Comprehensive platform management and analytics</p>
              </div>

              <div className="border-2 border-[#2A3142] rounded-lg overflow-hidden">
                <WebDashboard />
              </div>
            </div>
          )}

          {activeTab === 'landing' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-4">Marketing Landing Page</h2>
                <p className="text-[#A0AEC0] mb-6">High-converting landing page with futuristic design</p>
              </div>

              <div className="border-2 border-[#2A3142] rounded-lg overflow-hidden">
                <LandingPage />
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 bg-[#131820] rounded-xl border border-[#2A3142] p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Developer Handoff Notes</h3>
          <div className="space-y-3 text-[#A0AEC0]">
            <p><span className="text-[#00FF41] font-semibold">• Tailwind:</span> All components use Tailwind utility classes</p>
            <p><span className="text-[#00F0FF] font-semibold">• Animations:</span> Transitions use duration-300, hover states included</p>
            <p><span className="text-[#B026FF] font-semibold">• Spacing:</span> Consistent 4px grid (p-3, p-4, p-6, gap-3, gap-4, gap-6)</p>
            <p><span className="text-[#FFB800] font-semibold">• Icons:</span> Lucide React icon library</p>
            <p><span className="text-[#FF2E97] font-semibold">• Responsive:</span> Mobile-first with md: and lg: breakpoints</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DesignSystem;