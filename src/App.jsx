import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Events from './pages/Events';
import EventDetails from './pages/EventDetails';
import TicketConfirmation from './pages/TicketConfirmation';
import PaymentCallback from './pages/PaymentCallback';
import Jobs from './pages/Jobs';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
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
import AdminTickets from './pages/AdminTickets';
import AdminSubscribers from './pages/AdminSubscribers';

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
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:id" element={<BlogPost />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/blogs" element={<ProtectedRoute><AdminBlogs /></ProtectedRoute>} />
        <Route path="/admin/blogs/new" element={<ProtectedRoute><AdminNewBlog /></ProtectedRoute>} />
        <Route path="/admin/events" element={<ProtectedRoute><AdminEvents /></ProtectedRoute>} />
        <Route path="/admin/events/new" element={<ProtectedRoute><AdminNewEvent /></ProtectedRoute>} />
        <Route path="/admin/tickets" element={<ProtectedRoute><AdminTickets /></ProtectedRoute>} />
        <Route path="/admin/jobs" element={<ProtectedRoute><AdminJobs /></ProtectedRoute>} />
        <Route path="/admin/jobs/new" element={<ProtectedRoute><AdminNewJob /></ProtectedRoute>} />
        <Route path="/admin/carousel" element={<ProtectedRoute><AdminCarousel /></ProtectedRoute>} />
        <Route path="/admin/comments" element={<ProtectedRoute><AdminComments /></ProtectedRoute>} />
        <Route path="/admin/subscribers" element={<ProtectedRoute><AdminSubscribers /></ProtectedRoute>} />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;