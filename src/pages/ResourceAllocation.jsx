import { useCallback, useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { getCurrentProfile, getCurrentUser } from "../services/authService";
import "../styles/featureModules.css";

const emptyResource = {
  name: "",
  category: "Equipment",
  department_id: "",
  total: "",
  allocated: "",
};

const emptyRequest = {
  resource_id: "",
  quantity: 1,
  reason: "",
};

async function tableHasColumn(table, column) {
  const { error } = await supabase.from(table).select(`id, ${column}`).limit(1);
  return !error;
}

function ResourceAllocation() {
  const [resources, setResources] = useState([]);
  const [requests, setRequests] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [resourceForm, setResourceForm] = useState(emptyResource);
  const [requestForm, setRequestForm] = useState(emptyRequest);
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dbNotes, setDbNotes] = useState([]);
  const [resourcesUseDepartmentId, setResourcesUseDepartmentId] =
    useState(false);
  const [requestsUseStudentId, setRequestsUseStudentId] = useState(false);

  const isAdmin = profile?.role === "admin";
  const isStudent = profile?.role === "student";

  const loadPage = useCallback(async () => {
    setLoading(true);
    setError("");

    const currentProfile = await getCurrentProfile();
    const currentUser = await getCurrentUser();
    const nextNotes = [];

    setProfile(currentProfile);
    setUser(currentUser);

    const [resourceDepartmentSupport, requestStudentSupport] =
      await Promise.all([
        tableHasColumn("resources", "department_id"),
        tableHasColumn("resource_requests", "student_id"),
      ]);

    setResourcesUseDepartmentId(resourceDepartmentSupport);
    setRequestsUseStudentId(requestStudentSupport);

    if (!resourceDepartmentSupport) {
      nextNotes.push(
        "HUMAN DATABASE FIX NEEDED: resources must include department_id. Falling back to legacy owner text until fixed."
      );
    }

    if (!requestStudentSupport) {
      nextNotes.push(
        "HUMAN DATABASE FIX NEEDED: resource_requests must include student_id. Falling back to legacy requester_id until fixed."
      );
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .order("full_name", { ascending: true });

    if (profileError) {
      setError(profileError.message);
      setProfiles([]);
    } else {
      setProfiles(profileData || []);
    }

    const { data: departmentData, error: departmentError } = await supabase
      .from("departments")
      .select("id, name")
      .order("name", { ascending: true });

    if (departmentError) {
      setError(departmentError.message);
      setDepartments([]);
    } else {
      setDepartments(departmentData || []);
    }

    const { data: resourceData, error: resourceError } = await supabase
      .from("resources")
      .select("*")
      .order("id", { ascending: false });

    if (resourceError) {
      setError(resourceError.message);
      setResources([]);
    } else {
      setResources(resourceData || []);
    }

    let requestQuery = supabase
      .from("resource_requests")
      .select("*, resources (*)")
      .order("created_at", { ascending: false });

    if (currentProfile?.role === "student" && currentUser) {
      requestQuery = requestQuery.eq(
        requestStudentSupport ? "student_id" : "requester_id",
        currentUser.id
      );
    } else if (currentProfile?.role !== "admin") {
      requestQuery = null;
    }

    if (requestQuery) {
      const { data: requestData, error: requestError } = await requestQuery;

      if (requestError) {
        setError(requestError.message);
        setRequests([]);
      } else {
        setRequests(requestData || []);
      }
    } else {
      setRequests([]);
    }

    setDbNotes(nextNotes);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      loadPage();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadPage]);

  function handleResourceChange(e) {
    setResourceForm({
      ...resourceForm,
      [e.target.name]: e.target.value,
    });
  }

  function handleRequestChange(e) {
    setRequestForm({
      ...requestForm,
      [e.target.name]: e.target.value,
    });
  }

  function departmentName(id) {
    const department = departments.find((item) => item.id === id);
    return department?.name || "";
  }

  function requesterName(request) {
    const requesterId = request.student_id || request.requester_id;
    const requester = profiles.find((item) => item.id === requesterId);
    return requester?.full_name || requester?.email || "Unknown";
  }

  function resourceOwner(resource) {
    if (resource.department_id) {
      return departmentName(resource.department_id) || "Unknown department";
    }

    return resource.owner || "Not assigned";
  }

  function availableCount(resource) {
    return Number(resource.total || 0) - Number(resource.allocated || 0);
  }

  async function addResource(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!isAdmin) {
      setError("Only admins can add resources.");
      return;
    }

    const total = Number(resourceForm.total);
    const allocated = Number(resourceForm.allocated);

    if (!resourceForm.name.trim() || !resourceForm.department_id) {
      setError("Please fill resource name and department.");
      return;
    }

    if (total <= 0 || allocated < 0 || allocated > total) {
      setError("Resource quantities are invalid.");
      return;
    }

    const payload = {
      name: resourceForm.name.trim(),
      category: resourceForm.category,
      total,
      allocated,
    };

    if (resourcesUseDepartmentId) {
      payload.department_id = resourceForm.department_id;
    } else {
      payload.owner = departmentName(resourceForm.department_id);
    }

    const { error: insertError } = await supabase.from("resources").insert([payload]);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setResourceForm(emptyResource);
    setMessage("Resource added successfully.");
    await loadPage();
  }

  async function submitRequest(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!isStudent || !user) {
      setError("Only students can submit resource requests.");
      return;
    }

    const selectedResource = resources.find(
      (item) => Number(item.id) === Number(requestForm.resource_id)
    );

    if (!selectedResource) {
      setError("Please select a resource.");
      return;
    }

    if (Number(requestForm.quantity) <= 0) {
      setError("Quantity must be greater than 0.");
      return;
    }

    const available = availableCount(selectedResource);

    if (Number(requestForm.quantity) > available) {
      setError("Requested quantity exceeds available resource capacity.");
      return;
    }

    if (!requestForm.reason.trim()) {
      setError("Please enter a request reason.");
      return;
    }

    const payload = {
      resource_id: Number(requestForm.resource_id),
      quantity: Number(requestForm.quantity),
      reason: requestForm.reason.trim(),
      status: "Pending",
    };

    if (requestsUseStudentId) {
      payload.student_id = user.id;
    } else {
      payload.requester_id = user.id;
    }

    const { error: insertError } = await supabase
      .from("resource_requests")
      .insert([payload]);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setRequestForm(emptyRequest);
    setMessage("Resource request submitted successfully.");
    await loadPage();
  }

  async function approveRequest(request) {
    setError("");
    setMessage("");

    if (!isAdmin) {
      setError("Only admins can approve resource requests.");
      return;
    }

    const resource =
      request.resources ||
      resources.find((item) => Number(item.id) === Number(request.resource_id));

    if (!resource) {
      setError("Unable to approve request because resource details are missing.");
      await loadPage();
      return;
    }

    const available = availableCount(resource);

    if (Number(request.quantity) > available) {
      setError("Not enough available quantity to approve this request.");
      return;
    }

    const { error: updateResourceError } = await supabase
      .from("resources")
      .update({
        allocated: Number(resource.allocated || 0) + Number(request.quantity),
      })
      .eq("id", request.resource_id);

    if (updateResourceError) {
      setError(updateResourceError.message);
      return;
    }

    const { error: updateRequestError } = await supabase
      .from("resource_requests")
      .update({
        status: "Approved",
        approved_by: user.id,
        allocated_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    if (updateRequestError) {
      setError(updateRequestError.message);
      return;
    }

    setMessage("Resource request approved.");
    await loadPage();
  }

  async function rejectRequest(id) {
    setError("");
    setMessage("");

    if (!isAdmin) {
      setError("Only admins can reject resource requests.");
      return;
    }

    const { error: rejectError } = await supabase
      .from("resource_requests")
      .update({ status: "Rejected" })
      .eq("id", id);

    if (rejectError) {
      setError(rejectError.message);
      return;
    }

    setMessage("Resource request rejected.");
    await loadPage();
  }

  return (
    <section className="feature-page">
      <div className="feature-hero">
        <div>
          <p className="feature-label">Campus Assets</p>
          <h1>Resource Requests and Allocation</h1>
          <p>
            Students request resources, while admins approve requests and update
            allocation.
          </p>
        </div>

        <div className="feature-stat">
          <strong>{requests.filter((r) => r.status === "Pending").length}</strong>
          <span>Pending Requests</span>
        </div>
      </div>

      {dbNotes.map((note) => (
        <div className="feature-card" key={note}>
          <p>{note}</p>
        </div>
      ))}

      {error && (
        <div className="feature-card">
          <p className="error">{error}</p>
        </div>
      )}

      {message && (
        <div className="feature-card">
          <p className="success">{message}</p>
        </div>
      )}

      <div className="feature-grid">
        {isAdmin && (
          <form className="feature-form" onSubmit={addResource}>
            <h2>Add Resource</h2>

            <div className="feature-form-grid">
              <div className="feature-field">
                <label>Resource Name</label>
                <input
                  name="name"
                  value={resourceForm.name}
                  onChange={handleResourceChange}
                  required
                />
              </div>

              <div className="feature-field">
                <label>Category</label>
                <select
                  name="category"
                  value={resourceForm.category}
                  onChange={handleResourceChange}
                >
                  <option>Equipment</option>
                  <option>Software license</option>
                  <option>Lab space</option>
                  <option>Media kit</option>
                </select>
              </div>

              <div className="feature-field">
                <label>Department</label>
                <select
                  name="department_id"
                  value={resourceForm.department_id}
                  onChange={handleResourceChange}
                  required
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="feature-field">
                <label>Total Quantity</label>
                <input
                  name="total"
                  type="number"
                  min="1"
                  value={resourceForm.total}
                  onChange={handleResourceChange}
                  required
                />
              </div>

              <div className="feature-field">
                <label>Already Allocated</label>
                <input
                  name="allocated"
                  type="number"
                  min="0"
                  value={resourceForm.allocated}
                  onChange={handleResourceChange}
                  required
                />
              </div>
            </div>

            <div className="feature-actions">
              <button type="submit">Add Resource</button>
            </div>
          </form>
        )}

        {isStudent && (
          <form className="feature-form" onSubmit={submitRequest}>
            <h2>Request Resource</h2>

            <div className="feature-form-grid">
              <div className="feature-field">
                <label>Resource</label>
                <select
                  name="resource_id"
                  value={requestForm.resource_id}
                  onChange={handleRequestChange}
                  required
                >
                  <option value="">Select resource</option>
                  {resources.map((resource) => (
                    <option key={resource.id} value={resource.id}>
                      {resource.name} - Available {availableCount(resource)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="feature-field">
                <label>Quantity</label>
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  value={requestForm.quantity}
                  onChange={handleRequestChange}
                  required
                />
              </div>

              <div className="feature-field">
                <label>Reason</label>
                <textarea
                  name="reason"
                  value={requestForm.reason}
                  onChange={handleRequestChange}
                  required
                />
              </div>
            </div>

            <div className="feature-actions">
              <button type="submit">Submit Request</button>
            </div>
          </form>
        )}

        {!isAdmin && !isStudent && (
          <div className="feature-card">
            <h2>Resource Access</h2>
            <p>Doctors can view available resources. Student requests and admin approvals are role-specific.</p>
          </div>
        )}

        <div className="feature-table-wrap">
          <h2>Available Resources</h2>

          {loading ? (
            <p>Loading resources...</p>
          ) : resources.length === 0 ? (
            <p>No resources available.</p>
          ) : (
            <table className="feature-table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Department</th>
                  <th>Category</th>
                  <th>Total</th>
                  <th>Allocated</th>
                  <th>Available</th>
                </tr>
              </thead>

              <tbody>
                {resources.map((resource) => (
                  <tr key={resource.id}>
                    <td>{resource.name}</td>
                    <td>{resourceOwner(resource)}</td>
                    <td>{resource.category}</td>
                    <td>{resource.total}</td>
                    <td>{resource.allocated}</td>
                    <td>{availableCount(resource)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="feature-table-wrap">
        <h2>
          {isAdmin
            ? "Resource Requests"
            : isStudent
            ? "My Resource Requests"
            : "Resource Requests"}
        </h2>

        {requests.length === 0 ? (
          <p>No resource requests found.</p>
        ) : (
          <table className="feature-table">
            <thead>
              <tr>
                <th>Requester</th>
                <th>Resource</th>
                <th>Quantity</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Date</th>
                {isAdmin && <th>Action</th>}
              </tr>
            </thead>

            <tbody>
              {requests.map((request) => (
                <tr key={request.id}>
                  <td>{requesterName(request)}</td>

                  <td>{request.resources?.name || "Deleted resource"}</td>

                  <td>{request.quantity}</td>

                  <td>{request.reason}</td>

                  <td>
                    <span
                      className={
                        request.status === "Approved"
                          ? "status-pill success"
                          : request.status === "Rejected"
                          ? "status-pill danger"
                          : "status-pill warning"
                      }
                    >
                      {request.status}
                    </span>
                  </td>

                  <td>
                    {request.created_at
                      ? new Date(request.created_at).toLocaleDateString()
                      : ""}
                  </td>

                  {isAdmin && (
                    <td>
                      {request.status === "Pending" ? (
                        <>
                          <button onClick={() => approveRequest(request)}>
                            Approve
                          </button>
                          <button onClick={() => rejectRequest(request.id)}>
                            Reject
                          </button>
                        </>
                      ) : (
                        "Completed"
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default ResourceAllocation;
