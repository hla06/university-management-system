import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import "../styles/listPages.css";

function Announcements() {
  const emptyAnnouncement = { title: "", content: "" };

  const [announcements, setAnnouncements] = useState([]);
  const [role, setRole] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editData, setEditData] = useState(emptyAnnouncement);
  const [newAnnouncement, setNewAnnouncement] = useState(emptyAnnouncement);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isAdmin = role === "admin";

  useEffect(() => {
    loadAnnouncements();
    getRole();
  }, []);

  async function getRole() {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;

    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userData.user.id)
      .single();

    setRole(data?.role);
  }

  async function loadAnnouncements() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setAnnouncements(data || []);
    setLoading(false);
  }

  async function addAnnouncement(e) {
    e.preventDefault();

    if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) {
      setError("Please fill all fields.");
      return;
    }

    const { error } = await supabase.from("announcements").insert([
      {
        title: newAnnouncement.title.trim(),
        content: newAnnouncement.content.trim(),
      },
    ]);

    if (error) {
      setError(error.message);
      return;
    }

    setNewAnnouncement(emptyAnnouncement);
    setShowAddForm(false);
    setMessage("Announcement added successfully.");
    await loadAnnouncements();
  }

  function startEdit(item) {
    setEditingId(item.id);
    setEditData({
      title: item.title || "",
      content: item.content || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData(emptyAnnouncement);
  }

  async function saveEdit() {
    if (!editData.title.trim() || !editData.content.trim()) {
      setError("Please fill all fields.");
      return;
    }

    const { error } = await supabase
      .from("announcements")
      .update({
        title: editData.title.trim(),
        content: editData.content.trim(),
      })
      .eq("id", editingId);

    if (error) {
      setError(error.message);
      return;
    }

    setEditingId(null);
    setEditData(emptyAnnouncement);
    setMessage("Announcement updated successfully.");
    await loadAnnouncements();
  }

  async function deleteAnnouncement(id) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this announcement?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    setEditingId(null);
    setMessage("Announcement deleted successfully.");
    await loadAnnouncements();
  }

  return (
    <div className="list-page">
      <div className="page-header">
        <p className="page-label">Community Module</p>
        <h1>Announcements</h1>
        <p>Stay updated with official university announcements.</p>
      </div>

      {isAdmin && (
        <button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? "Cancel Add Announcement" : "Add Announcement"}
        </button>
      )}

      {error && <div className="empty-state error">{error}</div>}
      {message && <div className="empty-state success">{message}</div>}

      {isAdmin && showAddForm && (
        <div className="card">
          <h3>Add New Announcement</h3>

          <form onSubmit={addAnnouncement}>
            <input
              placeholder="Announcement title"
              value={newAnnouncement.title}
              onChange={(e) =>
                setNewAnnouncement({
                  ...newAnnouncement,
                  title: e.target.value,
                })
              }
            />

            <textarea
              placeholder="Announcement content"
              value={newAnnouncement.content}
              onChange={(e) =>
                setNewAnnouncement({
                  ...newAnnouncement,
                  content: e.target.value,
                })
              }
            />

            <button type="submit">Save Announcement</button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="empty-state">Loading announcements...</div>
      ) : announcements.length === 0 ? (
        <div className="empty-state">No announcements available.</div>
      ) : (
        <div className="list-grid">
          {announcements.map((item) => (
            <div key={item.id} className="info-card">
              {editingId === item.id ? (
                <>
                  <input
                    value={editData.title}
                    onChange={(e) =>
                      setEditData({ ...editData, title: e.target.value })
                    }
                  />

                  <textarea
                    value={editData.content}
                    onChange={(e) =>
                      setEditData({ ...editData, content: e.target.value })
                    }
                  />

                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button onClick={saveEdit}>Save</button>
                    <button onClick={cancelEdit}>Cancel</button>
                    <button
                      style={{ backgroundColor: "#ef4444" }}
                      onClick={() => deleteAnnouncement(item.id)}
                    >
                      Delete
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="badge">Official</span>
                  <h3>{item.title}</h3>
                  <p>{item.content}</p>

                  {isAdmin && (
                    <button onClick={() => startEdit(item)}>Edit</button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Announcements;
