import React, { useEffect, useState } from "react";
import { supabase } from "../../utils/supabase.client";
import TerminalDialogsManager from "./cms/terminalDialogManager";

export default function TableView({ tableName, onBack }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    if (!tableName) return;

    async function fetchData() {
      setLoading(true);
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .limit(50);

      if (error) {
        alert("Failed to fetch table data: " + error.message);
        setData([]);
      } else {
        setData(data);
      }
      setLoading(false);
    }

    fetchData();
    setEditingId(null);
  }, [tableName]);

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-800 rounded-lg shadow-lg">
      <button
        onClick={onBack}
        className="mb-6 text-sm text-gray-400 hover:text-white underline transition"
      >
        ← Back to Tables
      </button>
      <h2 className="text-white text-3xl font-semibold mb-6">
        Table: <span className="text-indigo-400">{tableName}</span>
      </h2>

      {loading ? (
        <div className="text-white text-center">Loading data...</div>
      ) : tableName === "terminal_dialogs" ? (
        <TerminalDialogsManager
          data={data}
          setData={setData}
          editingId={editingId}
          setEditingId={setEditingId}
        />
      ) : (
        <div className="text-gray-400 text-center">
          CRUD only supported for terminal_dialogs for now.
        </div>
      )}
    </div>
  );
}
