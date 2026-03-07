import React, { useState, useEffect} from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import  Sidebar  from "./components/Sidebar";


function App() {
  const [ authenticated, setAuthenticated ] = useState(false);
  const [ loading, setLoading ] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    setAuthenticated(!!token);
    setLoading(false);

  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  return (
    <Router>
      <div className="flex">
       { authenticated && <Sidebar />}
       <div className="flex-1">

        <Routes>
          <Route
            path="/login"
            element = {
              authenticated ? (
                <Navigate to="/" replace />
              ) : (
                <Login onLogin={() => setAuthenticated(true)}/>
              )
            }
          />
          
        </Routes>
       </div>
      </div>
    </Router>
  )
}

export default App
