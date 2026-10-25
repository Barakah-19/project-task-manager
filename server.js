const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Get all projects
app.get("/api/projects", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM projects");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all developers
app.get("/api/developers", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM developers");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get one developer
app.get("/api/developers/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM developers WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ error: "Developer not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a developer
app.post("/api/developers", async (req, res) => {
  try {
    const { name, email, role } = req.body;
    if (!name || !email)
      return res.status(400).json({ error: "name and email are required" });
    const [result] = await pool.query(
      "INSERT INTO developers (name, email, role) VALUES (?, ?, ?)",
      [name, email, role || "Developer"],
    );
    res
      .status(201)
      .json({ id: result.insertId, name, email, role: role || "Developer" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a developer
app.put("/api/developers/:id", async (req, res) => {
  try {
    const { name, email, role } = req.body;
    const [result] = await pool.query(
      "UPDATE developers SET name = ?, email = ?, role = ? WHERE id = ?",
      [name, email, role, req.params.id],
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Developer not found" });
    res.json({ message: "Developer updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a developer
app.delete("/api/developers/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM developers WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Developer not found" });
    res.json({ message: "Developer deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get one project, with its team and tasks
app.get("/api/projects/:id", async (req, res) => {
  try {
    const [projects] = await pool.query("SELECT * FROM projects WHERE id = ?", [
      req.params.id,
    ]);
    if (projects.length === 0)
      return res.status(404).json({ error: "Project not found" });

    const [team] = await pool.query(
      `SELECT d.id, d.name, d.role
       FROM project_developers pd
       JOIN developers d ON pd.developer_id = d.id
       WHERE pd.project_id = ?`,
      [req.params.id],
    );
    const [tasks] = await pool.query(
      `SELECT t.*, d.name AS developer_name
   FROM tasks t
   LEFT JOIN developers d ON t.assigned_to = d.id
   WHERE t.project_id = ?
   ORDER BY t.due_date`,
      [req.params.id],
    );

    res.json({ ...projects[0], team, tasks });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a project
app.post("/api/projects", async (req, res) => {
  try {
    const { name, description, status, start_date, due_date } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const [result] = await pool.query(
      "INSERT INTO projects (name, description, status, start_date, due_date) VALUES (?, ?, ?, ?, ?)",
      [
        name,
        description || null,
        status || "planning",
        start_date || null,
        due_date || null,
      ],
    );
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a project
app.put("/api/projects/:id", async (req, res) => {
  try {
    const { name, description, status, start_date, due_date } = req.body;
    const [result] = await pool.query(
      "UPDATE projects SET name = ?, description = ?, status = ?, start_date = ?, due_date = ? WHERE id = ?",
      [
        name,
        description || null,
        status,
        start_date || null,
        due_date || null,
        req.params.id,
      ],
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Project not found" });
    res.json({ message: "Project updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a project
app.delete("/api/projects/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM projects WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Project not found" });
    res.json({ message: "Project deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get tasks (optional filters: ?project_id=1&assigned_to=2&status=todo)
app.get("/api/tasks", async (req, res) => {
  try {
    let sql = `
      SELECT t.id, t.title, t.description, t.status, t.priority, t.due_date,
             t.project_id, p.name AS project_name,
             t.assigned_to, d.name AS developer_name
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      LEFT JOIN developers d ON t.assigned_to = d.id
      WHERE 1 = 1`;
    const params = [];

    if (req.query.project_id) {
      sql += " AND t.project_id = ?";
      params.push(req.query.project_id);
    }
    if (req.query.assigned_to) {
      sql += " AND t.assigned_to = ?";
      params.push(req.query.assigned_to);
    }
    if (req.query.status) {
      sql += " AND t.status = ?";
      params.push(req.query.status);
    }

    sql += " ORDER BY t.due_date";
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a task
app.post("/api/tasks", async (req, res) => {
  try {
    const {
      project_id,
      assigned_to,
      title,
      description,
      status,
      priority,
      due_date,
    } = req.body;
    if (!project_id || !title)
      return res
        .status(400)
        .json({ error: "project_id and title are required" });
    const [result] = await pool.query(
      `INSERT INTO tasks (project_id, assigned_to, title, description, status, priority, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        project_id,
        assigned_to || null,
        title,
        description || null,
        status || "todo",
        priority || "medium",
        due_date || null,
      ],
    );
    res.status(201).json({ id: result.insertId, title });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a task
app.put("/api/tasks/:id", async (req, res) => {
  try {
    const {
      project_id,
      assigned_to,
      title,
      description,
      status,
      priority,
      due_date,
    } = req.body;
    const [result] = await pool.query(
      `UPDATE tasks SET project_id = ?, assigned_to = ?, title = ?, description = ?,
              status = ?, priority = ?, due_date = ? WHERE id = ?`,
      [
        project_id,
        assigned_to || null,
        title,
        description || null,
        status,
        priority,
        due_date || null,
        req.params.id,
      ],
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Task not found" });
    res.json({ message: "Task updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a task
app.delete("/api/tasks/:id", async (req, res) => {
  try {
    const [result] = await pool.query("DELETE FROM tasks WHERE id = ?", [
      req.params.id,
    ]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Task not found" });
    res.json({ message: "Task deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a developer to a project's team
app.post("/api/projects/:id/developers", async (req, res) => {
  try {
    const { developer_id } = req.body;
    if (!developer_id)
      return res.status(400).json({ error: "developer_id is required" });
    await pool.query(
      "INSERT INTO project_developers (project_id, developer_id) VALUES (?, ?)",
      [req.params.id, developer_id],
    );
    res.status(201).json({ message: "Developer added to project" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "Developer is already on this project" });
    }
    if (err.code === "ER_NO_REFERENCED_ROW_2") {
      return res
        .status(404)
        .json({ error: "Project or developer does not exist" });
    }
    res.status(500).json({ error: err.message });
  }
});

// Remove a developer from a project's team
app.delete("/api/projects/:id/developers/:developerId", async (req, res) => {
  try {
    const [result] = await pool.query(
      "DELETE FROM project_developers WHERE project_id = ? AND developer_id = ?",
      [req.params.id, req.params.developerId],
    );
    if (result.affectedRows === 0)
      return res
        .status(404)
        .json({ error: "That developer is not on this project" });
    res.json({ message: "Developer removed from project" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change only a task's status
app.patch("/api/tasks/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    if (!["todo", "in_progress", "done"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const [result] = await pool.query(
      "UPDATE tasks SET status = ? WHERE id = ?",
      [status, req.params.id],
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "Task not found" });
    res.json({ message: "Status updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
