import { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase.client";
import AdminDashboard from "../components/AdminDashboard";
import TableView from "../components/TableView";

export default function Admin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);

  useEffect(() => {
    const loginAndFetchTables = async () => {
      const {
        data: { user: existingUser },
      } = await supabase.auth.getUser();

      if (existingUser && existingUser.email === "dheerjain3119@gmail.com") {
        setUser(existingUser);
        setLoading(false);
        return;
      }

      const email = prompt(
        "Enter admin email to login:",
        "dheerjain3119@gmail.com"
      );
      const password = prompt("Enter password:");

      if (!email || !password) {
        alert("Email and password are required.");
        setLoading(false);
        return;
      }

      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (loginError) {
        alert("Login failed: " + loginError.message);
        setLoading(false);
        return;
      }

      setUser(loginData.user);
      setLoading(false);
    };

    loginAndFetchTables();
  }, []);

  if (loading) {
    return (
      <p className="text-black p-5 text-center text-lg">Checking login...</p>
    );
  }

  if (!user) {
    return (
      <p className="text-black p-5 text-center text-lg">
        Not logged in. Refresh the page to try again.
      </p>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-4xl font-bold mb-10 text-center">Admin Panel</h1>

      <div className="max-w-7xl mx-auto">
        {!selectedTable ? (
          <AdminDashboard onSelectTable={setSelectedTable} />
        ) : (
          <TableView
            tableName={selectedTable}
            onBack={() => setSelectedTable(null)}
          />
        )}
      </div>
    </div>
  );
}
