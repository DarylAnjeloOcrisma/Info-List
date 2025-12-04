"use client";

import React, { useEffect, useMemo, useState } from "react";
import Confirm from "./confirm";

interface TableRow {
  id: number;
  name: string;
  email: string;
  phone: string;
  variation: string;
  plateNo: string;
  color: string;
}

export default function EnhancedDataTable() {
  const [rows, setRows] = useState<TableRow[]>([]);
  const [loaded, setLoaded] = useState(false); // <-- IMPORTANT FIX

  // Load saved rows ONLY ONCE
  useEffect(() => {
    const saved = localStorage.getItem("tableRows");
    if (saved) {
      setRows(JSON.parse(saved));
    }
    setLoaded(true);
  }, []);

  // Save rows ONLY AFTER initial load is complete
  useEffect(() => {
    if (loaded) {
      localStorage.setItem("tableRows", JSON.stringify(rows));
    }
  }, [rows, loaded]);

  // --- rest of your state ---
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterVariation, setFilterVariation] = useState("All");
  const [sortBy, setSortBy] = useState<keyof TableRow | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [editingRow, setEditingRow] = useState<TableRow | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRow, setNewRow] = useState<Partial<TableRow>>({
    name: "",
    email: "",
    phone: "",
    variation: "VIOS",
    plateNo: "",
    color: "",
  });

  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Filtering & sorting
  const filtered = useMemo(() => {
    const s = debouncedSearch.toLowerCase();
    const base = rows.filter((r) => {
      const matchesSearch =
        !s ||
        r.name.toLowerCase().includes(s) ||
        r.email.toLowerCase().includes(s) ||
        r.phone.includes(s) ||
        r.plateNo.toLowerCase().includes(s) ||
        r.color.toLowerCase().includes(s) ||
        r.variation.toLowerCase().includes(s);

      const matchesVariation =
        filterVariation === "All" || r.variation === filterVariation;

      return matchesSearch && matchesVariation;
    });

    if (!sortBy) return base;

    return [...base].sort((a, b) => {
      const va = String(a[sortBy] ?? "").toLowerCase();
      const vb = String(b[sortBy] ?? "").toLowerCase();
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, debouncedSearch, filterVariation, sortBy, sortDir]);

  // Helpers
  const toggleSort = (key: keyof TableRow) => {
    if (sortBy === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  const toggleSelect = (id: number) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const toggleSelectAll = () => {
    const allSelected = filtered.every((r) => selectedIds.includes(r.id));
    if (allSelected) setSelectedIds([]);
    else setSelectedIds(filtered.map((r) => r.id));
  };

  const removeRow = (id: number) =>
    setRows((prev) => prev.filter((r) => r.id !== id));

  const bulkDelete = () => {
    setRows((prev) => prev.filter((r) => !selectedIds.includes(r.id)));
    setSelectedIds([]);
  };

  const addRow = () => {
    if (!newRow.name || !newRow.email || !newRow.phone || !newRow.variation)
      return;

    const newId = Math.max(0, ...rows.map((r) => r.id)) + 1;

    setRows((prev) => [
      ...prev,
      {
        id: newId,
        name: newRow.name!,
        email: newRow.email!,
        phone: newRow.phone!,
        variation: newRow.variation!,
        plateNo: newRow.plateNo || "",
        color: newRow.color || "",
      },
    ]);

    setNewRow({
      name: "",
      email: "",
      phone: "",
      variation: "VIOS",
      plateNo: "",
      color: "",
    });

    setShowAddForm(false);
  };

  const saveEdit = () => {
    if (!editingRow) return;

    setRows((prev) =>
      prev.map((r) => (r.id === editingRow.id ? editingRow : r))
    );

    setEditingRow(null);
    setShowModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              Enhanced Data Table
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddForm((s) => !s)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-3 rounded"
              >
                {showAddForm ? "Close Add" : "Add Row"}
              </button>
              <button
                onClick={() => {
                  if (selectedIds.length === 0) return;
                  setPendingBulkDelete(true);
                  setPendingDeleteId(null);
                  setShowConfirm(true);
                }}
                disabled={selectedIds.length === 0}
                className={`py-2 px-3 rounded font-semibold ${
                  selectedIds.length === 0
                    ? "bg-gray-200 text-gray-500"
                    : "bg-red-600 hover:bg-red-700 text-white"
                }`}
              >
                Delete ({selectedIds.length})
              </button>
            </div>
          </div>

          {/* Filter / Search */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Search
              </label>
              <input
                type="text"
                placeholder="Search by name, email, phone, plate, color, variation..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="w-44">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Variation
              </label>
              <select
                value={filterVariation}
                onChange={(e) => setFilterVariation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option>All</option>
                <option>VIOS</option>
                <option>INNOVA</option>
                <option>MIRAGE</option>
                <option>EXPANDER</option>
                <option>REINA</option>
                <option>RUSH</option>
                <option>AVANZA</option>
              </select>
            </div>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">
                Add New Row
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder="Name"
                  value={newRow.name || ""}
                  onChange={(e) =>
                    setNewRow({ ...newRow, name: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={newRow.email || ""}
                  onChange={(e) =>
                    setNewRow({ ...newRow, email: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  value={newRow.phone || ""}
                  onChange={(e) =>
                    setNewRow({ ...newRow, phone: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <input
                  type="text"
                  placeholder="Plate No."
                  value={newRow.plateNo || ""}
                  onChange={(e) =>
                    setNewRow({ ...newRow, plateNo: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Color"
                  value={newRow.color || ""}
                  onChange={(e) =>
                    setNewRow({ ...newRow, color: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={newRow.variation || "VIOS"}
                  onChange={(e) =>
                    setNewRow({ ...newRow, variation: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option>VIOS</option>
                  <option>INNOVA</option>
                  <option>MIRAGE</option>
                  <option>EXPANDER</option>
                  <option>REINA</option>
                  <option>RUSH</option>
                  <option>AVANZA</option>
                </select>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={addRow}
                  className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                    <input
                      type="checkbox"
                      onChange={toggleSelectAll}
                      checked={
                        filtered.length > 0 &&
                        filtered.every((r) => selectedIds.includes(r.id))
                      }
                    />
                  </th>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                    onClick={() => toggleSort("id")}
                  >
                    ID {sortBy === "id" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                    onClick={() => toggleSort("name")}
                  >
                    Name{" "}
                    {sortBy === "name" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer"
                    onClick={() => toggleSort("email")}
                  >
                    Email{" "}
                    {sortBy === "email" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Plate No.
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Color
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Variation
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => toggleSelect(row.id)}
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {row.id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {row.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {row.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {row.phone}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {row.plateNo}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {row.color}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {row.variation}
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      <button
                        onClick={() => {
                          setEditingRow(row);
                          setShowModal(true);
                        }}
                        className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-1 px-3 rounded text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setPendingDeleteId(row.id);
                          setPendingBulkDelete(false);
                          setShowConfirm(true);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-3 rounded text-sm"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showModal && editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              Edit Row #{editingRow.id}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={editingRow.name}
                onChange={(e) =>
                  setEditingRow({ ...editingRow, name: e.target.value })
                }
                className="px-3 py-2 border rounded"
              />
              <input
                type="email"
                value={editingRow.email}
                onChange={(e) =>
                  setEditingRow({ ...editingRow, email: e.target.value })
                }
                className="px-3 py-2 border rounded"
              />
              <input
                type="tel"
                value={editingRow.phone}
                onChange={(e) =>
                  setEditingRow({ ...editingRow, phone: e.target.value })
                }
                className="px-3 py-2 border rounded"
              />
              <input
                type="text"
                value={editingRow.plateNo}
                onChange={(e) =>
                  setEditingRow({ ...editingRow, plateNo: e.target.value })
                }
                className="px-3 py-2 border rounded"
              />
              <input
                type="text"
                value={editingRow.color}
                onChange={(e) =>
                  setEditingRow({ ...editingRow, color: e.target.value })
                }
                className="px-3 py-2 border rounded"
              />
              <select
                value={editingRow.variation}
                onChange={(e) =>
                  setEditingRow({ ...editingRow, variation: e.target.value })
                }
                className="px-3 py-2 border rounded bg-white"
              >
                <option>VIOS</option>
                <option>INNOVA</option>
                <option>MIRAGE</option>
                <option>EXPANDER</option>
                <option>REINA</option>
                <option>RUSH</option>
                <option>AVANZA</option>
              </select>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingRow(null);
                }}
                className="py-2 px-4 rounded bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="py-2 px-4 rounded bg-green-600 text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirm && (
        <Confirm
          message={
            pendingBulkDelete
              ? "Are you sure you want to delete all selected rows?"
              : "Are you sure you want to delete this row?"
          }
          onConfirm={() => {
            if (pendingBulkDelete) {
              bulkDelete();
              setPendingBulkDelete(false);
            } else if (pendingDeleteId !== null) {
              removeRow(pendingDeleteId);
              setPendingDeleteId(null);
            }
            setShowConfirm(false);
          }}
          onCancel={() => {
            setPendingDeleteId(null);
            setPendingBulkDelete(false);
            setShowConfirm(false);
          }}
        />
      )}
    </div>
  );
}
