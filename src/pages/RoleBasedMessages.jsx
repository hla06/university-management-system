import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import Messaging from "./Messaging";
import AdminMessages from "./AdminMessages";
import "../styles/messages.css";

function RoleBasedMessages() {
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRole() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userData.user.id)
        .single();

      if (error) {
        console.error(error.message);
      } else {
        setRole(data.role);
      }

      setLoading(false);
    }

    loadRole();
  }, []);

  if (loading) {
    return (
      <section className="messages-page">
        <div className="messages-card">
          <p className="helper-text">Loading messages...</p>
        </div>
      </section>
    );
  }

  if (role === "doctor" || role === "admin") {
    return <AdminMessages />;
  }

  return <Messaging />;
}

export default RoleBasedMessages;
