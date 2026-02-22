import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import { useAuth } from '../auth/AuthContext';

export default function CheckoutPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    deliveryLocation: '',
    notes: '',
    paymentMethod: 'cod',
    esewaNumber: ''
  });
  
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchItemDetails();
  }, [id, user]);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.full_name || '',
        phone: user.phone || ''
      }));
    }
  }, [user]);

  const fetchItemDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/items/${id}`);
      
      // Check if item is available
      if (response.data.is_sold) {
        alert('This item has already been sold');
        navigate('/dashboard');
        return;
      }
      
      // Check if trying to buy own item
      if (response.data.seller_id === user.id) {
        alert('You cannot buy your own item');
        navigate('/dashboard');
        return;
      }
      
      setItem(response.data);
    } catch (error) {
      console.error('Error fetching item:', error);
      alert('Failed to load item details');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\d{10}$/.test(formData.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }
    
    if (!formData.deliveryLocation.trim()) {
      newErrors.deliveryLocation = 'Delivery location is required';
    }
    
    if (formData.paymentMethod === 'esewa' && !formData.esewaNumber.trim()) {
      newErrors.esewaNumber = '