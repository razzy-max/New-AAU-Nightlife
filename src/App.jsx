import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import ProtectedUserRoute from './components/ProtectedUserRoute';
import Home from './pages/Home';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import TicketConfirmation from './pages/TicketConfirmation';
import PaymentCallback from './pages/PaymentCallback';
import AwardPaymentCallback from './pages/AwardPaymentCallback';
import Jobs from './pages/Jobs';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Awards from './pages/Awards';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Profile from './pages/Profile';
import OrderConfirmation from './pages/OrderConfirmation';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminBlogs from './pages/AdminBlogs';
import AdminEvents from './pages/AdminEvents';
import AdminJobs from './pages/AdminJobs';
import AdminComments from './pages/AdminComments';
import AdminCarousel from './pages/AdminCarousel';
import AdminNewBlog from './pages/AdminNewBlog';
import AdminNewEvent from './pages/AdminNewEvent';
import AdminNewJob from './pages/AdminNewJob';
import AdminEditBlog from './pages/AdminEditBlog';
import AdminEditEvent from './pages/AdminEditEvent';
import AdminEditJob from './pages/AdminEditJob';
import AdminTickets from './pages/AdminTickets';
import AdminSubscribers from './pages/AdminSubscribers';
import AdminAwards from './pages/AdminAwards';
import AdminAdvertisers from './pages/AdminAdvertisers';
import AdminUsers from './pages/AdminUsers';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetails />} />
        <Route path="/ticket/:id" element={<TicketConfirmation />} />
        <Route path="/payment-callback" element={<PaymentCallback />} />
        <Route path="/award-payment-callback" element={<AwardPaymentCallback />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:id" element={<BlogPost />} />
        <Route path="/awards" element={<Awards />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/order-confirmation/:orderId" element={<OrderConfirmation />} />
        <Route path="/profile" element={<ProtectedUserRoute><Profile /></ProtectedUserRoute>} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/blogs" element={<ProtectedRoute><AdminBlogs /></ProtectedRoute>} />
        <Route path="/admin/blogs/new" element={<ProtectedRoute><AdminNewBlog /></ProtectedRoute>} />
        <Route path="/admin/blogs/edit/:id" element={<ProtectedRoute><AdminEditBlog /></ProtectedRoute>} />
        <Route path="/admin/events" element={<ProtectedRoute><AdminEvents /></ProtectedRoute>} />
        <Route path="/admin/events/new" element={<ProtectedRoute><AdminNewEvent /></ProtectedRoute>} />
        <Route path="/admin/events/edit/:id" element={<ProtectedRoute><AdminEditEvent /></ProtectedRoute>} />
        <Route path="/admin/tickets" element={<ProtectedRoute><AdminTickets /></ProtectedRoute>} />
        <Route path="/admin/jobs" element={<ProtectedRoute><AdminJobs /></ProtectedRoute>} />
        <Route path="/admin/jobs/new" element={<ProtectedRoute><AdminNewJob /></ProtectedRoute>} />
        <Route path="/admin/jobs/edit/:id" element={<ProtectedRoute><AdminEditJob /></ProtectedRoute>} />
        <Route path="/admin/carousel" element={<ProtectedRoute><AdminCarousel /></ProtectedRoute>} />
        <Route path="/admin/comments" element={<ProtectedRoute><AdminComments /></ProtectedRoute>} />
        <Route path="/admin/subscribers" element={<ProtectedRoute><AdminSubscribers /></ProtectedRoute>} />
        <Route path="/admin/awards" element={<ProtectedRoute><AdminAwards /></ProtectedRoute>} />
        <Route path="/admin/advertisers" element={<ProtectedRoute><AdminAdvertisers /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;