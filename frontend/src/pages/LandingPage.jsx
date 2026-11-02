import React from "react";
import { Link } from "react-router-dom";
import "../styles/LandingPage.css";

function LandingPage() {
  return (
    <div className="landing">

      {/* Navbar */}

      <nav className="navbar">

        <div className="logo">
          LearnSphere
        </div>

        <ul className="menu">

          <li>
            <Link to="/">Home</Link>
          </li>

          <li>
            <Link to="/dashboard">Courses</Link>
          </li>

          <li>
            <Link to="/login">Login</Link>
          </li>

          <li>
            <Link to="/signup">Signup</Link>
          </li>

        </ul>

      </nav>

      {/* Hero Section */}

      <section className="hero">

        <div className="hero-text">

          <h1>
            AI-Based Course Recommendation <br />
            and Academic Assistance Platform
          </h1>

          <p>
            Discover the best courses with the help of
            Artificial Intelligence and Machine Learning.
          </p>

          <div className="buttons">

            <Link to="/login">
              <button className="btn1">
                Get Started
              </button>
            </Link>

            <Link to="/dashboard">
              <button className="btn2">
                Explore Courses
              </button>
            </Link>

          </div>

        </div>

        <div className="hero-image">

          <img
            src="https://images.unsplash.com/photo-1677442136019-21780ecad995?w=700"
            alt="AI Learning"
          />

        </div>

      </section>

      {/* Features */}

      <section className="features">

        <h2>Our Features</h2>

        <div className="cards">

          <div className="card">
            <h3>Smart Recommendations</h3>
            <p>
              Get personalized course suggestions.
            </p>
          </div>

          <div className="card">
            <h3>AI Based Search</h3>
            <p>
              Find the most relevant learning content.
            </p>
          </div>

          <div className="card">
            <h3>Interactive Dashboard</h3>
            <p>
              Explore and manage your learning journey.
            </p>
          </div>

        </div>

      </section>

    </div>
  );
}

export default LandingPage;