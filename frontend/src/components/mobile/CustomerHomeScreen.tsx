import React from 'react';
import { Package, Truck, MapPin, Bell, ChevronRight } from 'lucide-react';
import { Button } from '../design-system/Button';
import { Card } from '../design-system/Card';

export const CustomerHomeScreen: React.FC = () => {
  return (
    <div className="bg-matrix-bg h-full flex flex-col">
      {/* Header */}
      <div className="p-6 bg-gradient-to-b from-matrix-surface to-matrix-bg">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-matrix-secondary text-sm">Welcome back,</p>
            <h2 className="text-white text-2xl font-bold">Alex</h2>
          </div>
          <button className="p-3 bg-matrix-surface rounded-full border border-matrix-border hover:border-matrix-green transition-colors">
            <Bell className="w-5 h-5 text-matrix-green" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Quick Actions */}
        <div>
          <h3 className="text-white font-semibold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="primary"
              className="p-4 rounded-xl bg-gradient-to-br from-matrix-green to-matrix-cyan h-auto flex-col"
            >
              <Package className="w-6 h-6 mb-2" />
              New Order
            </Button>
            <Button
              variant="outline"
              className="p-4 rounded-xl h-auto flex-col border-matrix-border hover:border-matrix-purple"
            >
              <MapPin className="w-6 h-6 mb-2 text-matrix-purple" />
              Track
            </Button>
          </div>
        </div>

        {/* Active Orders */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-white font-semibold">Active Orders</h3>
            <ChevronRight className="w-5 h-5 text-matrix-green" />
          </div>
          <Card className="border-matrix-green">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-white font-semibold">Order #MX-4521</p>
                <p className="text-matrix-secondary text-sm">2 items • Electronics</p>
              </div>
              <span className="px-3 py-1 bg-matrix-green/10 text-matrix-green text-xs font-semibold rounded-full">
                IN TRANSIT
              </span>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Truck className="w-4 h-4 text-matrix-cyan" />
              <p className="text-matrix-secondary text-sm">Arrives in 15 minutes</p>
            </div>
            <div className="w-full bg-matrix-border rounded-full h-2 mt-3">
              <div className="bg-gradient-to-r from-matrix-green to-matrix-cyan h-2 rounded-full w-3/4"></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomerHomeScreen;
