import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabaseClient";
import {
  getConversation,
  getMyMessageThreads,
  hasReceiverIdColumn,
  sendMessage,
} from "../services/messageService";
import "../styles/messages.css";

function AdminMessages() {
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState("");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [error, setError] = useState("");
  const [usesReceiverId, setUsesReceiverId] = useState(false);

  useEffect(() => {
    async function loadPage() {
      setLoading(true);
      setError("");

      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        setError("Please login to use messages.");
        setLoading(false);
        return;
      }

      setUser(authData.user);

      const { data: currentProfile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      setProfile(currentProfile);

      const receiverIdSupport = await hasReceiverIdColumn();
      setUsesReceiverId(receiverIdSupport);

      const [threadData, profilesResult] = await Promise.all([
        getMyMessageThreads(authData.user, receiverIdSupport),
        supabase.from("profiles").select("id, full_name, email, role"),
      ]);

      if (profilesResult.error) {
        setError(profilesResult.error.message);
        setLoading(false);
        return;
      }

      const studentProfiles = (profilesResult.data || []).filter(
        (item) => item.role === "student"
      );
      const studentIds = new Set();
      const studentEmails = new Set();

      threadData.forEach((msg) => {
        if (msg.sender_id === authData.user.id) {
          if (receiverIdSupport && msg.receiver_id) {
            studentIds.add(msg.receiver_id);
          } else if (msg.receiver_email) {
            studentEmails.add(msg.receiver_email);
          }
        } else {
          studentIds.add(msg.sender_id);
        }
      });

      const conversationStudents = studentProfiles.filter(
        (student) =>
          studentIds.has(student.id) || studentEmails.has(student.email)
      );

      setStudents(conversationStudents);
      setSelectedStudent(conversationStudents[0] || null);
      setLoading(false);
    }

    loadPage();
  }, []);

  useEffect(() => {
    async function loadConversation() {
      if (!selectedStudent || !user) {
        setMessages([]);
        return;
      }

      setConversationLoading(true);
      const data = await getConversation(user, selectedStudent, usesReceiverId);
      setMessages(data);
      setConversationLoading(false);
    }

    loadConversation();
  }, [selectedStudent, user, usesReceiverId]);

  const filteredStudents = useMemo(() => {
    const value = search.toLowerCase().trim();
    if (!value) return students;

    return students.filter((student) =>
      `${student.full_name || ""} ${student.email || ""}`
        .toLowerCase()
        .includes(value)
    );
  }, [students, search]);

  async function handleReply(e) {
    e.preventDefault();
    setError("");

    if (!reply.trim() || !selectedStudent || !user) return;

    try {
      const sent = await sendMessage({
        senderId: user.id,
        receiverId: selectedStudent.id,
        receiverEmail: selectedStudent.email,
        content: reply.trim(),
        role: profile?.role || "doctor",
        useReceiverId: usesReceiverId,
      });

      setMessages((prev) => [...prev, sent]);
      setReply("");
    } catch (sendError) {
      setError(sendError.message);
    }
  }

  return (
    <section className="messages-page">
      <div className="messages-hero glass-card">
        <p className="page-label">Communication Module</p>
        <h1>{profile?.role === "admin" ? "Admin Messages" : "Doctor Messages"}</h1>
        <p>Student conversations appear automatically when they involve you.</p>
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
          <h3>Student Conversations</h3>

          <input
            className="messages-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
          />

          {loading ? (
            <p className="helper-text">Loading conversations...</p>
          ) : filteredStudents.length === 0 ? (
            <p className="helper-text">No student conversations found.</p>
          ) : (
            <div className="search-results">
              {filteredStudents.map((student) => (
                <button
                  key={student.id}
                  className="student-result"
                  onClick={() => setSelectedStudent(student)}
                >
                  <div className="student-avatar">
                    {student.full_name?.charAt(0)?.toUpperCase() || "S"}
                  </div>
                  <div>
                    <strong>{student.full_name || student.email}</strong>
                    <small>{student.email}</small>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="messages-card glass-card">
          {!selectedStudent ? (
            <p className="helper-text">Select a student.</p>
          ) : (
            <>
              <div className="chat-header">
                <div className="student-avatar">
                  {selectedStudent.full_name?.charAt(0)?.toUpperCase() || "S"}
                </div>
                <div>
                  <h3>{selectedStudent.full_name || selectedStudent.email}</h3>
                  <p>{selectedStudent.email}</p>
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
                        msg.sender_id === user.id
                          ? "message-bubble doctor-message"
                          : "message-bubble student-message"
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

              <form className="message-form" onSubmit={handleReply}>
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Reply to student..."
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

export default AdminMessages;
