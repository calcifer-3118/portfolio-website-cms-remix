import React, { useState } from "react";
import TableRowEditable from "../tableRowEditable";
import { supabase } from "../../../utils/supabase.client";

export default function TerminalDialogsManager({
  data,
  setData,
  editingId,
  setEditingId,
}) {
  const [formData, setFormData] = useState({
    message: "",
    expects_input: false,

    order: 0,
    variable: "", // NEW
  });

  // When editing an existing row, formData should update externally, so add a handler
  React.useEffect(() => {
    if (editingId && editingId !== "new") {
      const row = data.find((d) => d.id === editingId);
      if (row) {
        setFormData({
          message: row.message || "",
          expects_input: row.expects_input || false,

          order: row.order || 0,
          variable: row.variable || "", // NEW
        });
      }
    } else if (editingId === "new") {
      setFormData({
        message: "",
        expects_input: false,

        order: 0,
      });
    }
  }, [editingId, data]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSave = async () => {
    try {
      if (!formData.message) {
        alert("Message is required");
        return;
      }

      if (editingId === "new") {
        // Insert new
        const { data: inserted, error } = await supabase
          .from("terminal_dialogs")
          .insert([formData])
          .select()
          .single();

        if (error) throw error;
        setData((prev) => [inserted, ...prev]);
      } else {
        // Update existing
        const { data: updated, error } = await supabase
          .from("terminal_dialogs")
          .update(formData)
          .eq("id", editingId)
          .select()
          .single();

        if (error) throw error;

        setData((prev) =>
          prev.map((item) => (item.id === editingId ? updated : item))
        );
      }

      setEditingId(null);
    } catch (error) {
      alert("Failed to save: " + error.message);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
  };

  const handleAddNew = () => {
    setEditingId("new");
  };

  const handleEdit = (row) => {
    setEditingId(row.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this entry?")) return;

    try {
      const { error } = await supabase
        .from("terminal_dialogs")
        .delete()
        .eq("id", id);
      if (error) throw error;

      setData((prev) => prev.filter((item) => item.id !== id));
      if (editingId === id) setEditingId(null);
    } catch (error) {
      alert("Failed to delete: " + error.message);
    }
  };

  return (
    <>
      <button
        onClick={handleAddNew}
        className="mb-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded text-white"
      >
        + Add New Entry
      </button>

      <div className="overflow-auto max-h-[500px] border border-gray-700 rounded-lg shadow-inner">
        <table className="min-w-full text-left text-gray-200 table-fixed">
          <thead className="bg-gray-900 sticky top-0 z-10">
            <tr>
              <th className="px-5 py-3 border-b border-gray-700">Message</th>
              <th className="px-5 py-3 border-b border-gray-700">
                Expects Input
              </th>
              <th className="px-5 py-3 border-b border-gray-700">
                Input Variable
              </th>
              <th className="px-5 py-3 border-b border-gray-700">Order</th>
              <th className="px-5 py-3 border-b border-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {editingId === "new" && (
              <TableRowEditable
                formData={formData}
                onInputChange={handleInputChange}
                onSave={handleSave}
                onCancel={handleCancel}
              />
            )}

            {data.map((row, i) => {
              if (editingId === row.id) {
                return (
                  <TableRowEditable
                    key={row.id}
                    formData={formData}
                    onInputChange={handleInputChange}
                    onSave={handleSave}
                    onCancel={handleCancel}
                  />
                );
              }
              return (
                <tr
                  key={row.id}
                  className={i % 2 === 0 ? "bg-gray-800" : "bg-gray-700"}
                >
                  <td
                    className="px-5 py-2 border-b border-gray-700 truncate max-w-xs"
                    title={row.message}
                  >
                    {row.message}
                  </td>
                  <td className="px-5 py-2 border-b border-gray-700 text-center">
                    {row.expects_input ? "Yes" : "No"}
                  </td>
                  <td
                    className="px-5 py-2 border-b border-gray-700 truncate max-w-xs"
                    title={row.variable || ""}
                  >
                    {row.variable || "-"}
                  </td>
                  <td className="px-5 py-2 border-b border-gray-700">
                    {row.order}
                  </td>
                  <td className="px-5 py-2 border-b border-gray-700 space-x-2">
                    <button
                      onClick={() => handleEdit(row)}
                      className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(row.id)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
