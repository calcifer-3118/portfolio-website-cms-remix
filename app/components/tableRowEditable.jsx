import React from "react";

export default function TableRowEditable({
  formData,
  onInputChange,
  onSave,
  onCancel,
}) {
  return (
    <tr className="bg-gray-700">
      <td className="px-5 py-2 border-b border-gray-700">
        <input
          type="text"
          name="message"
          value={formData.message}
          onChange={onInputChange}
          className="w-full bg-gray-900 text-white p-1 rounded"
        />
      </td>
      <td className="px-5 py-2 border-b border-gray-700 text-center">
        <input
          type="checkbox"
          name="expects_input"
          checked={formData.expects_input}
          onChange={onInputChange}
        />
      </td>
      <td className="px-5 py-2 border-b border-gray-700">
        <input
          type="text"
          name="variable"
          value={formData.variable}
          onChange={onInputChange}
          className="w-full bg-gray-900 text-white p-1 rounded"
        />
      </td>
      <td className="px-5 py-2 border-b border-gray-700">
        <input
          type="number"
          name="order"
          value={formData.order}
          onChange={onInputChange}
          className="w-full bg-gray-900 text-white p-1 rounded"
        />
      </td>
      <td className="px-5 py-2 border-b border-gray-700 space-x-2">
        <button
          onClick={onSave}
          className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded"
        >
          Cancel
        </button>
      </td>
    </tr>
  );
}
