function Footer() {
  return (
    <footer>
      <div className="footer-content">
        <div className="footer-info">
          <p>&copy; 2026 AAU Nightlife. All rights reserved.</p>
          <p>Contact: <a href="mailto:aaunightlife@gmail.com">aaunightlife@gmail.com</a></p>
        </div>
        <div className="footer-socials">
          <p className="follow-text">Follow us on our socials</p>
          <div className="social-icons">
            <a href="https://www.instagram.com/aau_nightlife?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <i className="fab fa-instagram"></i>
            </a>
            <a href="https://www.tiktok.com/@aau_nightlife?_t=ZM-8xN0vouT4cf&_r=1" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              <i className="fab fa-tiktok"></i>
            </a>
            <a href="https://wa.me/2349037558818" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
              <i className="fab fa-whatsapp"></i>
            </a>
            <a href="mailto:aaunightlife@gmail.com" aria-label="Email">
              <i className="fas fa-envelope"></i>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;