import React from 'react';
import { DollarSign, Clock, Star } from 'lucide-react';
import { Button } from '../design-system/Button';
import { Card } from '../design-system/Card';

export const CourierDashboardScreen: React.FC = () => {
  return (
    <div className="bg-matrix-bg h-full flex flex-col">
      {/* Header */}
      <div className="p-6 bg-gradient-to-b from-matrix-surface to-matrix-bg">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-matrix-secondary text-sm">Good morning,</p>
            <h2 className="text-white text-2xl font-bold">Sarah</h2>
          </div>
          <Button variant="primary" size="sm" className="px-4 py-2">
            ONLINE
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3">
            <p className="text-matrix-secondary text-xs mb-1">Today</p>
            <p className="text-white text-xl font-bold">$328</p>
          </Card>
          <Card className="p-3">
            <p className="text-matrix-secondary text-xs mb-1">Orders</p>
            <p className="text-white text-xl font-bold">12</p>
          </Card>
          <Card className="p-3">
            <p className="text-matrix-secondary text-xs mb-1">Rating</p>
            <div className="flex items-center">
              <p className="text-white text-xl font-bold mr-1">4.9</p>
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            </div>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        {/* Available Orders */}
        <div>
          <h3 className="text-white font-semibold mb-3">Available Orders</h3>
          <div className="space-y-3">
            {/* Premium Order */}
            <Card className="border-matrix-green bg-gradient-to-br from-matrix-surface to-matrix-elevated">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-white font-semibold">Premium Delivery</p>
                  <p className="text-matrix-secondary text-sm">2.4 km away</p>
                </div>
                <span className="px-3 py-1 bg-matrix-green text-matrix-bg text-sm font-bold rounded-full">
                  $24
                </span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-matrix-green rounded-full mt-2"></div>
                  <div>
                    <p className="text-white text-sm">Pickup</p>
                    <p className="text-matrix-secondary text-xs">Tech Store, Downtown</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-matrix-pink rounded-full mt-2"></div>
                  <div>
                    <p className="text-white text-sm">Dropoff</p>
                    <p className="text-matrix-secondary text-xs">Residential Area, 5th Ave</p>
                  </div>
                </div>
              </div>
              <Button variant="primary" className="w-full">
                Accept Order
              </Button>
            </Card>

            {/* Standard Order */}
            <Card className="border-matrix-border">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-white font-semibold">Standard Delivery</p>
                  <p className="text-matrix-secondary text-sm">4.1 km away</p>
                </div>
                <span className="px-3 py-1 bg-matrix-purple/20 text-matrix-purple text-sm font-bold rounded-full">
                  $18
                </span>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-matrix-cyan rounded-full mt-2"></div>
                  <div>
                    <p className="text-white text-sm">Restaurant District</p>
                    <p className="text-matrix-secondary text-xs">3 items</p>
                  </div>
                </div>
              </div>
              <Button variant="outline" className="w-full border-matrix-border hover:border-matrix-purple">
                View Details
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourierDashboardScreen;
