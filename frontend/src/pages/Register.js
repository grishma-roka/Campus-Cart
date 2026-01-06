import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Register() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    student_id: "",
    role: "buyer",
    license_number: "",
    license_image: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      // First register the user
      const result = await register(form);
      
      if (result.success) {
        // If user selected rider role, submit rider application
        if (form.role === 'rider') {
          if (!form.license_number) {
            setError("License number is required for rider registration");
            setLoading(false);
            return;
          }

          // Submit rider application
          const response = await fetch('http://localhost:5000/api/rider/request', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_email: form.email,
              license_number: form.license_number,
              license_image: form.license_image
            })
          });

          if (response.ok) {
            setSuccess("Registration successful! Rider application submitted. Admin will review and notify you via email.");
          } else {
            setSuccess("Registration successful! Please login and apply for rider role from your dashboard.");
          }
        } else {
          setSuccess("Registration successful! Please login.");
        }
        
        setTimeout(() => navigate("/login"), 3000);
      } else {
        setError(result.error);
      }
    } catch (error) {
      setError("Registration failed. Please try again.");
    }
    
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.formCard}>
        <h2 style={styles.title}>Join Campus Cart</h2>
        
        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Full Name *</label>
            <input
              name="full_name"
              placeholder="Enter your full name"
              value={form.full_name}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email Address *</label>
            <input
              name="email"
              type="email"
              placeholder="Enter your email address"
              value={form.email}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Student ID *</label>
            <input
              name="student_id"
              placeholder="Enter your student ID"
              value={form.student_id}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password *</label>
            <input
              name="password"
              type="password"
              placeholder="Create a strong password"
              value={form.password}
              onChange={handleChange}
              required
              style={styles.input}
            />
          </div>
          
          <div style={styles.inputGroup}>
            <label style={styles.label}>Role *</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              style={styles.select}
            >
              <option value="buyer">Buyer - Browse and purchase items</option>
              <option value="seller">Seller - List and sell items</option>
              <option value="rider">Rider - Deliver items (Requires Admin Approval)</option>
            </select>
          </div>

          {/* Show license fields only when rider is selected */}
          {form.role === 'rider' && (
            <>
              <div style={styles.riderSection}>
                <h4 style={styles.riderTitle}>Rider License Information</h4>
                <p style={styles.riderNote}>
                  As a rider applicant, please provide your license details. 
                  Admin will review and approve your application.
                </p>
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>License Number *</label>
                <input
                  name="license_number"
                  placeholder="Enter your driving license number"
                  value={form.license_number}
                  onChange={handleChange}
                  required={form.role === 'rider'}
                  style={styles.input}
                />
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>License Image URL (Optional)</label>
                <input
                  name="license_image"
                  placeholder="Enter URL of your license image"
                  value={form.license_image}
                  onChange={handleChange}
                  style={styles.input}
                />
              </div>
            </>
          )}
          
          <button 
            type="submit" 
            disabled={loading}
            style={styles.button}
          >
            {loading ? "Registering..." : 
             form.role === 'rider' ? "Register & Apply for Rider" : "Register"}
          </button>
        </form>
        
        <p style={styles.linkText}>
          Already have an account? <Link to="/login" style={styles.link}>Login here</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '1rem'
  },
  formCard: {
    backgroundColor: '#fff',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '500px'
  },
  title: {
    textAlign: 'center',
    marginBottom: '1.5rem',
    color: '#333'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column'
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem'
  },
  select: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    backgroundColor: '#fff'
  },
  riderSection: {
    backgroundColor: '#e8f4fd',
    padding: '1rem',
    borderRadius: '4px',
    border: '1px solid #3498db'
  },
  riderTitle: {
    margin: '0 0 0.5rem 0',
    color: '#2980b9',
    fontSize: '1rem'
  },
  riderNote: {
    margin: 0,
    fontSize: '0.9rem',
    color: '#34495e',
    lineHeight: '1.4'
  },
  button: {
    padding: '0.75rem',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '0.5rem'
  },
  error: {
    backgroundColor: '#f8d7da',
    color: '#721c24',
    padding: '0.75rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    textAlign: 'center'
  },
  success: {
    backgroundColor: '#d4edda',
    color: '#155724',
    padding: '0.75rem',
    borderRadius: '4px',
    marginBottom: '1rem',
    textAlign: 'center'
  },
  linkText: {
    textAlign: 'center',
    marginTop: '1rem',
    color: '#666'
  },
  link: {
    color: '#3498db',
    textDecoration: 'none'
  }
};
