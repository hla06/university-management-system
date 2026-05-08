import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabaseClient";
import {
  getConversation,
  hasReceiverIdColumn,
  sendMessage,
} from "../services/messageService";
import "../styles/messages.css";

function Messaging() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [error, setError] = useState("");
  const [usesReceiverId, setUsesReceiverId] = useState(false);

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setError("");

      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setError("Please login to use messages.");
        setLoading(false);
        return;
      }

      setUser(userData.user);

      const receiverIdSupport = await hasReceiverIdColumn();
      setUsesReceiverId(receiverIdSupport);

      const { data, error: doctorsError } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .eq("role", "doctor")
        .order("full_name", { ascending: true });

      if (doctorsError) {
        setError(doctorsError.message);
        setDoctors([]);
      } else {
        setDoctors(data || []);
        setSelectedDoctor(data?.[0] || null);
      }

      setLoading(false);
    }

    loadPage();
  }, []);

  useEffect(() => {
    async function loadMessages() {
      if (!selectedDoctor || !user) {
        setMessages([]);
        return;
      }

      setConversationLoading(true);
      const data = await getConversation(user, selectedDoctor, usesReceiverId);
      setMessages(data);
      setConversationLoading(false);
    }

    loadMessages();
  }, [selectedDoctor, user, usesReceiverId]);

  const filteredDoctors = useMemo(() => {
    const value = search.toLowerCase().trim();
    if (!value) return doctors;

    return doctors.filter((doctor) =>
      `${doctor.full_name || ""} ${doctor.email || ""}`
        .toLowerCase()
        .includes(value)
    );
  }, [doctors, search]);

  async function handleSend(e) {
    e.preventDefault();
    setError("");

    if (!newMessage.trim() || !user || !selectedDoctor) return;

    try {
      const sent = await sendMessage({
        senderId: user.id,
        receiverId: selectedDoctor.id,
        receiverEmail: selectedDoctor.email,
        content: newMessage.trim(),
        role: "student",
        useReceiverId: usesReceiverId,
      });

      setMessages((prev) => [...prev, sent]);
      setNewMessage("");
    } catch (sendError) {
      setError(sendError.message);
    }
  }

  return (
    <section className="messages-page">
      <div className="messages-hero glass-card">
        <p className="page-label">Community Module</p>
        <h1>Messaging</h1>
        <p>Select a doctor from the conversation list and send messages directly.</p>
      </div>

      {!loading && !usesReceiverId && (
        <div className="messages-card glass-card">
          <p className="helper-text">
            HUMAN DATABASE FIX NEEDED: messages should include receiver_id for
            strict private conversation queries.
          </p>
        </div>
      )}

      {error && (
        <div className="messages-card glass-card">
          <p className="helper-text error">{error}</p>
        </div>
      )}

      <div className="messages-layout">
        <div className="messages-card glass-card">
          <h3>Doctors</h3>

          <input
            className="messages-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search doctors..."
          />

          {loading ? (
            <p className="helper-text">Loading doctors...</p>
          ) : filteredDoctors.length === 0 ? (
            <p className="helper-text">No doctors found.</p>
          ) : (
            <div className="search-results">
              {filteredDoctors.map((doctor) => (
                <button
                  key={doctor.id}
                  className="student-result"
                  onClick={() => setSelectedDoctor(doctor)}
                >
                  <div className="student-avatar">
                    {doctor.full_name?.charAt(0)?.toUpperCase() || "D"}
                  </div>

                  <div>
                    <strong>{doctor.full_name || doctor.email}</strong>
                    <small>{doctor.email}</small>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="messages-card glass-card">
          {!selectedDoctor ? (
            <p className="helper-text">Select a doctor to view messages.</p>
          ) : (
            <>
              <div className="chat-header">
                <div className="student-avatar">
                  {selectedDoctor.full_name?.charAt(0)?.toUpperCase() || "D"}
                </div>

                <div>
                  <h3>{selectedDoctor.full_name || selectedDoctor.email}</h3>
                  <p>{selectedDoctor.email}</p>
                </div>
              </div>

              <div className="chat-box">
                {conversationLoading ? (
                  <p className="helper-text">Loading conversation...</p>
                ) : messages.length === 0 ? (
                  <p className="helper-text">No messages yet.</p>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={
                        msg.sender_id === user?.id
                          ? "message-bubble student-message"
                          : "message-bubble doctor-message"
                      }
                    >
                      <p>{msg.content}</p>
                      <small>
                        {msg.created_at
                          ? new Date(msg.created_at).toLocaleString()
                          : ""}
                      </small>
                    </div>
                  ))
                )}
              </div>

              <form className="message-form" onSubmit={handleSend}>
                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                />
                <button type="submit">Send</button>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

export default Messaging;
