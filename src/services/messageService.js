import { supabase } from "./supabaseClient";

export async function hasReceiverIdColumn() {
  const { error } = await supabase
    .from("messages")
    .select("id, receiver_id")
    .limit(1);

  if (error) {
    console.warn(
      "HUMAN DATABASE FIX NEEDED: messages should include receiver_id for strict private conversation queries. Falling back to exact receiver_email matching until the column exists."
    );
    return false;
  }

  return true;
}

export async function getConversation(currentUser, otherUser, useReceiverId) {
  let query = supabase.from("messages").select("*");

  if (useReceiverId) {
    query = query.or(
      `and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUser.id}),and(sender_id.eq.${otherUser.id},receiver_id.eq.${currentUser.id})`
    );
  } else {
    query = query.or(
      `and(sender_id.eq.${currentUser.id},receiver_email.eq.${otherUser.email}),and(sender_id.eq.${otherUser.id},receiver_email.eq.${currentUser.email})`
    );
  }

  const { data, error } = await query.order("created_at", { ascending: true });

  if (error) {
    console.error("Fetch messages error:", error.message);
    return [];
  }

  return data || [];
}

export async function getMyMessageThreads(currentUser, useReceiverId) {
  let query = supabase.from("messages").select("*");

  if (useReceiverId) {
    query = query.or(
      `sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`
    );
  } else {
    query = query.or(
      `sender_id.eq.${currentUser.id},receiver_email.eq.${currentUser.email}`
    );
  }

  const { data, error } = await query.order("created_at", {
    ascending: false,
  });

  if (error) {
    console.error("Fetch message threads error:", error.message);
    return [];
  }

  return data || [];
}

export async function sendMessage({
  senderId,
  receiverId,
  receiverEmail,
  content,
  role,
  useReceiverId,
}) {
  const payload = {
    sender_id: senderId,
    content,
    role,
  };

  if (useReceiverId) {
    payload.receiver_id = receiverId;
  } else {
    payload.receiver_email = receiverEmail;
  }

  const { data, error } = await supabase
    .from("messages")
    .insert([payload])
    .select();

  if (error) throw error;
  return data?.[0];
}
