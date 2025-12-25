export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString();
};

export const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString();
};

export const formatRelativeTime = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return formatDate(dateString);
};

export const getStatusColor = (status) => {
  const colors = {
    'pending_bids': { bg: '#FEF3C7', text: '#92400E' },
    'accepted': { bg: '#DBEAFE', text: '#1E40AF' },
    'picked_up': { bg: '#E0E7FF', text: '#3730A3' },
    'in_transit': { bg: '#FCE7F3', text: '#831843' },
    'delivered': { bg: '#D1FAE5', text: '#065F46' },
    'cancelled': { bg: '#FEE2E2', text: '#991B1B' }
  };
  return colors[status] || { bg: '#F3F4F6', text: '#374151' };
};

export const getStatusLabel = (status, t) => {
  const statusKeyMap = {
    'pending_bids': 'status.pendingBids',
    'accepted': 'status.accepted',
    'picked_up': 'status.pickedUp',
    'in_transit': 'status.inTransit',
    'delivered': 'status.delivered',
    'cancelled': 'status.cancelled'
  };
  const translationKey = statusKeyMap[status];
  return translationKey ? t(translationKey) : status;
};

export const extractCityFromAddress = (address) => {
  if (!address) return '';
  const parts = address.split(',').map(part => part.trim());
  if (parts.length >= 2) {
    return parts[parts.length - 2] || '';
  }
  return '';
};

export const extractLocationParts = (address) => {
  if (!address) return { country: '', city: '', area: '', street: '' };

  const parts = address.split(',').map(part => part.trim());

  // Try to parse from address structure
  // Format: street, area, city, country
  let street = '', area = '', city = '', country = '';

  if (parts.length >= 4) {
    street = parts[0] || '';
    area = parts[1] || '';
    city = parts[2] || '';
    country = parts[3] || '';
  } else if (parts.length === 3) {
    street = parts[0] || '';
    city = parts[1] || '';
    country = parts[2] || '';
  } else if (parts.length === 2) {
    city = parts[0] || '';
    country = parts[1] || '';
  } else if (parts.length === 1) {
    country = parts[0] || '';
  }

  return { country, city, area, street };
};

export const getAvailableCities = (orders) => {
  const cities = new Set();
  orders.forEach(order => {
    if (order.status === 'pending_bids') {
      const pickupCity = extractCityFromAddress(order.pickupAddress);
      const deliveryCity = extractCityFromAddress(order.deliveryAddress);
      if (pickupCity) cities.add(pickupCity);
      if (deliveryCity) cities.add(deliveryCity);
    }
  });
  return Array.from(cities).sort();
};

export const filterDriverOrders = (orders, viewType, currentUser, cityFilter = '') => {
  if (currentUser?.primary_role !== 'driver') return orders;

  let filteredOrders;
  switch (viewType) {
    case 'active':
      filteredOrders = orders.filter(order =>
        order.assignedDriver?.userId === currentUser.id &&
        ['accepted', 'picked_up', 'in_transit'].includes(order.status)
      );
      break;
    case 'bidding':
      filteredOrders = orders.filter(order =>
        order.status === 'pending_bids' &&
        !order.assignedDriver
      );
      // Apply city filter for bidding orders
      if (cityFilter) {
        filteredOrders = filteredOrders.filter(order => {
          const pickupCity = extractCityFromAddress(order.pickupAddress);
          const deliveryCity = extractCityFromAddress(order.deliveryAddress);
          return pickupCity === cityFilter || deliveryCity === cityFilter;
        });
      }
      break;
    case 'history':
      filteredOrders = orders.filter(order =>
        order.status === 'delivered' ||
        (order.assignedDriver?.userId === currentUser.id && order.status === 'cancelled')
      );
      break;
    default:
      filteredOrders = orders;
  }

  return filteredOrders;
};

export const truncateText = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};
