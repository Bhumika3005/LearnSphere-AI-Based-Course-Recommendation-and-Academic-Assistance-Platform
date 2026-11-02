import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("ls_user")); } catch { return null; }
  });

  const saveUser = (u) => { setUser(u); localStorage.setItem("ls_user", JSON.stringify(u)); };
  const logout = () => { setUser(null); localStorage.removeItem("ls_user"); };

  return (
    <AuthContext.Provider value={{ user, saveUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
