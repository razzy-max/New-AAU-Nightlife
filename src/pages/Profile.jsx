import { useEffect, useState } from 'react';
import API_BASE_URL from '../config';
import { getUserData, getUserToken } from '../utils/userAuth';

function Profile() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const user = getUserData();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = getUserToken();
        const response = await fetch(`${API_BASE_URL}/api/orders/my`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || 'Unable to load profile');
        }

        setOrders(data.orders || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) {
    return <div className="auth-page"><div className="auth-card"><p>Loading your orders...</p></div></div>;
  }

  if (error) {
    return <div className="auth-page"><div className="auth-card"><div className="error-message">{error}</div></div></div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-header">
        <h1>Your Profile</h1>
        <p>{user?.name || user?.email}</p>
      </div>

      <div className="profile-orders">
        <h2>Your Ticket Orders</h2>
        {orders.length === 0 ? (
          <p className="empty-state">No orders found yet. Buy a ticket to see history here.</p>
        ) : (
          <div className="orders-grid">
            {orders.map((order) => (
              <div className="order-card" key={order._id}>
                <h3>{order.ticketTypeName}</h3>
                <p><strong>Quantity:</strong> {order.quantity}</p>
                <p><strong>Total:</strong> N{Number(order.totalAmount || 0).toLocaleString()}</p>
                <p><strong>Date:</strong> {new Date(order.createdAt).toLocaleString()}</p>
                <a className="rsvp-btn" href={`/order-confirmation/${order._id}`}>View Order</a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Profile;
