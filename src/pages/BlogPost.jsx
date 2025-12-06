import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';

function BlogPost() {
  const { id } = useParams();
  const [comments, setComments] = useState([
    {
      id: 1,
      name: 'Alice Johnson',
      email: 'alice@example.com',
      comment: 'Great article! Very informative.',
      date: '2024-11-26'
    },
    {
      id: 2,
      name: 'Bob Smith',
      email: 'bob@example.com',
      comment: 'Thanks for sharing this.',
      date: '2024-11-27'
    }
  ]);
  const [newComment, setNewComment] = useState({ name: '', email: '', comment: '' });

  // Mock data - in real app, fetch by ID
  const post = {
    id: parseInt(id),
    title: 'Campus Life at AAU: A Student\'s Perspective',
    author: 'John Doe',
    date: '2024-11-15',
    category: 'General',
    image: '/blog/blog1.jpg',
    fullContent: `Exploring the vibrant student life at Ambrose Alli University. From academic challenges to social events, discover what makes AAU special.

In this comprehensive guide, we dive deep into the daily experiences of students navigating campus life at AAU. Whether you're a freshman just starting out or a senior preparing for graduation, this post covers everything you need to know about making the most of your university experience.

## Academic Life
AAU offers a wide range of programs designed to prepare students for successful careers. The faculty is dedicated to providing quality education with practical applications.

## Social Scene
The social life at AAU is vibrant and diverse. From student organizations to cultural events, there's always something happening on campus.

## Nightlife and Entertainment
As part of the AAU Nightlife community, students have access to various entertainment options that balance fun with responsibility.

Remember to always prioritize your safety and well-being while enjoying campus activities.`
  };

  const handleCommentSubmit = (e) => {
    e.preventDefault();
    if (newComment.name && newComment.email && newComment.comment) {
      const comment = {
        id: comments.length + 1,
        ...newComment,
        date: new Date().toISOString().split('T')[0]
      };
      setComments([...comments, comment]);
      setNewComment({ name: '', email: '', comment: '' });
    }
  };

  const relatedPosts = [
    { id: 2, title: 'Nightlife Tips: Enjoying Safely', image: '/blog/blog2.jpg' },
    { id: 3, title: 'Career Opportunities in the Nightlife Industry', image: '/blog/blog3.jpg' }
  ];

  return (
    <div>
      <section className="blog-post-header">
        <Link to="/blog" className="back-link">&larr; Back to Blogs</Link>
        <h1>{post.title}</h1>
        <div className="post-meta">
          <span className="author">By {post.author}</span>
          <span className="date">{new Date(post.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <span className="category">{post.category}</span>
        </div>
      </section>
      <section className="blog-post-content">
        <div className="post-main">
          <div className="post-image">
            <img src={post.image} alt={post.title} loading="lazy" />
          </div>
          <div className="post-text">
            {post.fullContent.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </div>
        <aside className="post-sidebar">
          <div className="author-bio">
            <h3>About the Author</h3>
            <p>{post.author} is a passionate writer and AAU Nightlife enthusiast, sharing insights on campus life and entertainment.</p>
          </div>
          <div className="related-posts">
            <h3>Related Posts</h3>
            {relatedPosts.map(relPost => (
              <Link key={relPost.id} to={`/blog/${relPost.id}`} className="related-post">
                <img src={relPost.image} alt={relPost.title} loading="lazy" />
                <span>{relPost.title}</span>
              </Link>
            ))}
          </div>
          <div className="social-share">
            <h3>Share This Post</h3>
            <div className="share-buttons">
              <button>Facebook</button>
              <button>Twitter</button>
              <button>Instagram</button>
            </div>
          </div>
        </aside>
      </section>
      <section className="comments-section">
        <h2>Comments</h2>
        <div className="comments-list">
          {comments.map(comment => (
            <div key={comment.id} className="comment-card">
              <div className="comment-header">
                <span className="comment-author">{comment.name}</span>
                <span className="comment-date">{new Date(comment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <p className="comment-text">{comment.comment}</p>
            </div>
          ))}
        </div>
        <form className="comment-form" onSubmit={handleCommentSubmit}>
          <h3>Leave a Comment</h3>
          <div className="form-group">
            <input
              type="text"
              placeholder="Your Name"
              value={newComment.name}
              onChange={(e) => setNewComment({...newComment, name: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <input
              type="email"
              placeholder="Your Email"
              value={newComment.email}
              onChange={(e) => setNewComment({...newComment, email: e.target.value})}
              required
            />
          </div>
          <div className="form-group">
            <textarea
              placeholder="Your Comment"
              value={newComment.comment}
              onChange={(e) => setNewComment({...newComment, comment: e.target.value})}
              required
            ></textarea>
          </div>
          <button type="submit" className="submit-comment-btn">Submit Comment</button>
        </form>
      </section>
    </div>
  );
}

export default BlogPost;