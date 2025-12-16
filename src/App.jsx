import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
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
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/blogs" element={<AdminBlogs />} />
        <Route path="/admin/blogs/new" element={<AdminNewBlog />} />
        <Route path="/admin/events" element={<AdminEvents />} />
        <Route path="/admin/events/new" element={<AdminNewEvent />} />
        <Route path="/admin/tickets" element={<AdminTickets />} />
        <Route path="/admin/jobs" element={<AdminJobs />} />
        <Route path="/admin/jobs/new" element={<AdminNewJob />} />
        <Route path="/admin/carousel" element={<AdminCarousel />} />
        <Route path="/admin/comments" element={<AdminComments />} />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;