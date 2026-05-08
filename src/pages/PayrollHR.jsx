import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import "../styles/featureModules.css";

const emptyEmployee = {
  staff_id: "",
  department: "",
  contract: "Full-time",
  salary: "",
};

function PayrollHR() {
  const [employees, setEmployees] = useState([]);
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [form, setForm] = useState(emptyEmployee);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);

    const { data: staffData } = await supabase
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("role", "doctor")
      .order("full_name", { ascending: true });

    setStaff(staffData || []);

    const { data: departmentData } = await supabase
      .from("departments")
      .select("id, name")
      .order("name", { ascending: true });

    setDepartments(departmentData || []);

    const { data, error } = await supabase
      .from("payroll_hr")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      alert(error.message);
      setEmployees([]);
    } else {
      setEmployees(data || []);
    }

    setLoading(false);
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function getStaffName(id) {
    const person = staff.find((item) => item.id === id);
    return person?.full_name || person?.email || "";
  }

  async function addEmployee(e) {
    e.preventDefault();

    const selectedName = getStaffName(form.staff_id);

    const { error } = await supabase.from("payroll_hr").insert([
      {
        staff_id: form.staff_id,
        name: selectedName,
        department: form.department.trim(),
        contract: form.contract,
        salary: Number(form.salary),
        payroll_status: "Pending sync",
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setForm(emptyEmployee);
    await loadPage();
  }

  async function syncPayroll(id) {
    const { error } = await supabase
      .from("payroll_hr")
      .update({ payroll_status: "Synced" })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    await loadPage();
  }

  return (
    <section className="feature-page">
      <div className="feature-hero">
        <div>
          <p className="feature-label">Operations Integration</p>
          <h1>Payroll and HR Interface</h1>
          <p>
            HR records are linked to existing staff profiles instead of manually
            creating unrelated names.
          </p>
        </div>

        <div className="feature-stat">
          <strong>{employees.filter((e) => e.payroll_status !== "Synced").length}</strong>
          <span>Pending</span>
        </div>
      </div>

      <div className="feature-grid">
        <form className="feature-form" onSubmit={addEmployee}>
          <h2>Add HR Record</h2>

          <div className="feature-form-grid">
            <div className="feature-field">
              <label>Staff Member</label>
              <select name="staff_id" value={form.staff_id} onChange={handleChange} required>
                <option value="">Select existing staff</option>
                {staff.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.full_name || person.email} ({person.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="feature-field">
              <label>Department</label>
              <select name="department" value={form.department} onChange={handleChange} required>
                <option value="">Select department</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.name}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="feature-field">
              <label>Contract</label>
              <select name="contract" value={form.contract} onChange={handleChange}>
                <option>Full-time</option>
                <option>Part-time</option>
                <option>Visiting</option>
                <option>Administrative</option>
              </select>
            </div>

            <div className="feature-field">
              <label>Monthly Salary</label>
              <input name="salary" type="number" value={form.salary} onChange={handleChange} required />
            </div>
          </div>

          <div className="feature-actions">
            <button type="submit">Add HR Record</button>
          </div>
        </form>

        <div className="feature-table-wrap">
          <h2>Payroll Sync Queue</h2>

          {loading ? (
            <p>Loading HR records...</p>
          ) : (
            <table className="feature-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Contract</th>
                  <th>Salary</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <strong>{employee.name}</strong>
                      <p>{employee.department}</p>
                    </td>
                    <td>{employee.contract}</td>
                    <td>{Number(employee.salary).toLocaleString()} EGP</td>
                    <td>
                      <span
                        className={
                          employee.payroll_status === "Synced"
                            ? "status-pill success"
                            : "status-pill warning"
                        }
                      >
                        {employee.payroll_status}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => syncPayroll(employee.id)}>
                        Sync
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}

export default PayrollHR;
