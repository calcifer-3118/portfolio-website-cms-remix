import React, { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase.client";

export default function AdminDashboard({ onSelectTable }) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchTables() {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_all_table_names");

      if (error) {
        alert("Failed to fetch tables: " + error.message);
        setTables([]);
      } else if (data && data.length) {
        setTables(data);
      } else {
        setTables([]);
      }
      setLoading(false);
    }
    fetchTables();
  }, []);

  return (
    <div className="bg-gray-800 p-6 rounded-lg max-w-md mx-auto shadow-lg">
      <h2 className="text-white text-2xl font-semibold mb-6 text-center">
        Tables
      </h2>

      {loading ? (
        <div className="text-white text-center">Loading tables...</div>
      ) : tables.length === 0 ? (
        <div className="text-gray-400 text-center">No tables found.</div>
      ) : (
        <ul className="divide-y divide-gray-700 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800">
          {tables.map((table) => (
            <li key={table}>
              <button
                onClick={() => onSelectTable(table)}
                className="w-full text-left px-4 py-3 hover:bg-gray-700 rounded text-white transition"
                title={`View data of ${table}`}
              >
                {table}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
