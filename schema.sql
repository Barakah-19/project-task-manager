CREATE DATABASE IF NOT EXISTS project_manager;
USE project_manager;
DROP TABLE IF EXISTS project_developers;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS developers;

CREATE TABLE developers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  role VARCHAR(50) NOT NULL DEFAULT 'Developer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  status ENUM('planning', 'active', 'completed', 'on_hold') NOT NULL DEFAULT 'planning',
  start_date DATE,
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tasks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL,
  assigned_to INT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  status ENUM('todo', 'in_progress', 'done') NOT NULL DEFAULT 'todo',
  priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
  due_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_to) REFERENCES developers(id) ON DELETE SET NULL
);

CREATE TABLE project_developers (
  project_id INT NOT NULL,
  developer_id INT NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (project_id, developer_id),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE
);

-- Sample data
INSERT INTO developers (name, email, role) VALUES
('Amaka Obi', 'amaka@example.com', 'Frontend Developer'),
('Tunde Bello', 'tunde@example.com', 'Backend Developer'),
('Chidi Okafor', 'chidi@example.com', 'Full-Stack Developer'),
('Fatima Yusuf', 'fatima@example.com', 'QA Tester');

INSERT INTO projects (name, description, status, start_date, due_date) VALUES
('Company Website Redesign', 'Revamp the main company website', 'active', '2026-10-01', '2026-12-15'),
('Inventory System', 'Track stock levels for the warehouse', 'planning', '2026-11-01', '2027-02-28'),
('Mobile Payment App', 'Customer payments through mobile', 'on_hold', '2026-09-01', '2027-01-30');

INSERT INTO project_developers (project_id, developer_id) VALUES
(1, 1), (1, 2), (1, 4),
(2, 2), (2, 3),
(3, 1), (3, 3);

INSERT INTO tasks (project_id, assigned_to, title, status, priority, due_date) VALUES
(1, 1, 'Design homepage layout', 'done', 'high', '2026-10-20'),
(1, 2, 'Set up contact form API', 'in_progress', 'medium', '2026-11-05'),
(1, 4, 'Test site on mobile devices', 'todo', 'medium', '2026-12-01'),
(2, 3, 'Design database schema', 'in_progress', 'high', '2026-11-15'),
(2, 2, 'Build stock update endpoint', 'todo', 'high', '2026-12-10'),
(3, 1, 'Create checkout screen', 'todo', 'low', '2027-01-10');