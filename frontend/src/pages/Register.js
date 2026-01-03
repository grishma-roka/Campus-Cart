import { useState } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    student_id: "",
    role: "buyer",
  });

  const navigate = useNavigate();

  const change = e => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    await api.post("/auth/register", form);
    navigate("/login");
  };

  return (
    <form onSubmit={submit}>
      <h2>Register</h2>
      <input name="full_name" placeholder="Full Name" onChange={change} />
      <input name="email" placeholder="Email" onChange={change} />
      <input name="student_id" placeholder="Student ID" onChange={change} />
      <input name="password" type="password" placeholder="Password" onChange={change} />
      <select name="role" onChange={change}>
        <option value="buyer">Buyer</option>
        <option value="seller">Seller</option>
        <option value="rider">Rider</option>
      </select>
      <button>Register</button>
    </form>
  );
}
