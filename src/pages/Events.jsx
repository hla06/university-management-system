import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import "../styles/listPages.css";

function Events() {
  const emptyEvent = {
    title: "",
    description: "",
    event_date: "",
    location: "",
  };

  const [events, setEvents] = useState([]);
  const [role, setRole] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editData, setEditData] = useState(emptyEvent);
  const [newEvent, setNewEvent] = useState(emptyEvent);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const isAdmin = role === "admin";

  useEffect(() => {
    loadEvents();
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

  async function loadEvents() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setEvents(data || []);
    setLoading(false);
  }

  function startEdit(event) {
    setEditingId(event.id);
    setEditData({
      title: event.title || "",
      description: event.description || "",
      event_date: event.event_date || "",
      location: event.location || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditData(emptyEvent);
  }

  async function saveEdit() {
    const { error } = await supabase
      .from("events")
      .update(editData)
      .eq("id", editingId);

    if (error) {
      setError(error.message);
      return;
    }

    setEditingId(null);
    setEditData(emptyEvent);
    setMessage("Event updated successfully.");
    await loadEvents();
  }

  async function addEvent(e) {
    e.preventDefault();

    const { error } = await supabase.from("events").insert([newEvent]);

    if (error) {
      setError(error.message);
      return;
    }

    setNewEvent(emptyEvent);
    setShowAddForm(false);
    setMessage("Event added successfully.");
    await loadEvents();
  }

  async function deleteEvent(eventId) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this event?"
    );

    if (!confirmDelete) return;

    const { error } = await supabase.from("events").delete().eq("id", eventId);

    if (error) {
      setError(error.message);
      return;
    }

    setEditingId(null);
    setMessage("Event deleted successfully.");
    await loadEvents();
  }

  return (
    <div className="list-page">
      <div className="page-header">
        <h1>Events</h1>
        <p>View university activities and upcoming events.</p>
      </div>

      {isAdmin && (
        <button onClick={() => setShowAddForm(!showAddForm)}>
          {showAddForm ? "Cancel Add Event" : "Add Event"}
        </button>
      )}

      {error && <div className="empty-state error">{error}</div>}
      {message && <div className="empty-state success">{message}</div>}

      {isAdmin && showAddForm && (
        <div className="card">
          <h3>Add New Event</h3>

          <form onSubmit={addEvent}>
            <input
              placeholder="Event title"
              value={newEvent.title}
              onChange={(e) =>
                setNewEvent({ ...newEvent, title: e.target.value })
              }
              required
            />

            <input
              placeholder="Description"
              value={newEvent.description}
              onChange={(e) =>
                setNewEvent({ ...newEvent, description: e.target.value })
              }
              required
            />

            <input
              type="date"
              value={newEvent.event_date}
              onChange={(e) =>
                setNewEvent({ ...newEvent, event_date: e.target.value })
              }
              required
            />

            <input
              placeholder="Location"
              value={newEvent.location}
              onChange={(e) =>
                setNewEvent({ ...newEvent, location: e.target.value })
              }
              required
            />

            <button type="submit">Save Event</button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="empty-state">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="empty-state">No events available.</div>
      ) : (
      <div className="list-grid">
        {events.map((event) => (
          <div key={event.id} className="info-card">
            {editingId === event.id ? (
              <>
                <input
                  value={editData.title}
                  onChange={(e) =>
                    setEditData({ ...editData, title: e.target.value })
                  }
                />

                <input
                  value={editData.description}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      description: e.target.value,
                    })
                  }
                />

                <input
                  type="date"
                  value={editData.event_date}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      event_date: e.target.value,
                    })
                  }
                />

                <input
                  value={editData.location}
                  onChange={(e) =>
                    setEditData({ ...editData, location: e.target.value })
                  }
                />

                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={saveEdit}>Save</button>
                  <button onClick={cancelEdit}>Cancel</button>
                  <button
                    style={{ backgroundColor: "#ef4444" }}
                    onClick={() => deleteEvent(event.id)}
                  >
                    Delete
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="badge">{event.event_date}</span>

                <h3>{event.title}</h3>

                <p>{event.description}</p>

                <p>📍 {event.location}</p>

                {isAdmin && (
                  <button onClick={() => startEdit(event)}>Edit</button>
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

export default Events;
