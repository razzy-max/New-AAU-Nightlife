import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import API_BASE_URL from '../config';

function BlogPost() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState({ name: '', email: '', comment: '' });

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/blogs/${id}`);
        if (!response.ok) {
          throw new Error('Blog post not found');
        }
        const data = await response.json();
        setPost(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const fetchComments = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/comments?contentType=blog&contentId=${id}`);
        if (response.ok) {
          const data = await response.json();
          setComments(data);
        }
      } catch (err) {
        console.error('Error fetching comments:', err);
      }
    };

    fetchPost();
    fetchComments();
  }, [id]);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (newComment.name && newComment.email && newComment.comment) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: newComment.comment,
            author: newComment.name,
            email: newComment.email,
            contentType: 'blog',
            contentId: id,
          }),
        });

        if (response.ok) {
          // Refresh comments after submission
          const commentsResponse = await fetch(`${API_BASE_URL}/api/comments?contentType=blog&contentId=${id}`);
          if (commentsResponse.ok) {
            const data = await commentsResponse.json();
            setComments(data);
          }
          setNewComment({ name: '', email: '', comment: '' });
          alert('Comment submitted! It will be visible after admin approval.');
        } else {
          alert('Failed to submit comment. Please try again.');
        }
      } catch (error) {
        console.error('Error submitting comment:', error);
        alert('Error submitting comment. Please try again.');
      }
    }
  };

  const relatedPosts = [
    { id: 2, title: 'Nightlife Tips: Enjoying Safely', image: '/blog/blog2.jpg' },
    { id: 3, title: 'Career Opportunities in the Nightlife Industry', image: '/blog/blog3.jpg' }
  ];

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading blog post...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!post) {
    return <div className="error">Blog post not found</div>;
  }

  return (
    <div>
      <section className="blog-post-header">
        <Link to="/blog" className="back-link">&larr; Back to Blogs</Link>
        <h1>{post.title}</h1>
        <div className="post-meta">
          <span className="author">By {post.author}</span>
          <span className="date">{new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          <span className="category">{post.category}</span>
        </div>
      </section>
      <section className="blog-post-content">
        <div className="post-main">
          <div className="post-image">
            <img src={post.image} alt={post.title} loading="lazy" />
          </div>
          <div className="post-text">
            {post.content.split('\n').map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>

          {/* Video display after content */}
          {post.video && (
            <div className="post-video">
              <video
                controls
                preload="metadata"
                className="blog-video"
                poster={post.image} // Use blog image as poster if available
              >
                <source src={post.video} type={post.video.split(';')[0].split(':')[1]} />
                Your browser does not support the video tag.
              </video>
            </div>
          )}
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
            <div key={comment._id} className="comment-card">
              <div className="comment-header">
                <span className="comment-author">{comment.author}</span>
                <span className="comment-date">{new Date(comment.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <p className="comment-text">{comment.content}</p>
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