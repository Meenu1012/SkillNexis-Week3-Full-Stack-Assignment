
import { useEffect, useState } from "react";
import Auth from "./Auth";
import { apiRequest, API_URL } from "./api";
import "./App.css";

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("taskManagerToken") || ""
  );

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("taskManagerUser")) || null;
    } catch {
      return null;
    }
  });

  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("pending");
  const [filter, setFilter] = useState("all");
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploadedImage, setUploadedImage] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadTasks(activeToken = token, activeFilter = filter) {
    if (!activeToken) return;

    try {
      const query =
        activeFilter === "all" ? "" : `?status=${activeFilter}`;

      const data = await apiRequest(
        `/api/tasks${query}`,
        {},
        activeToken
      );

      setTasks(Array.isArray(data) ? data : data.tasks || []);
    } catch (error) {
      setMessage(error.message);
    }
  }

  useEffect(() => {
    if (token) {
      loadTasks(token, "all");
    }
  }, [token]);

  function handleLogin(newToken, newUser) {
    localStorage.setItem("taskManagerToken", newToken);
    localStorage.setItem(
      "taskManagerUser",
      JSON.stringify(newUser || null)
    );

    setToken(newToken);
    setUser(newUser || null);
    setMessage("Login successful!");
  }

  async function handleTaskSubmit(event) {
    event.preventDefault();

    if (!title.trim()) {
      setMessage("Please enter a task title.");
      return;
    }

    try {
      await apiRequest(
        "/api/tasks",
        {
          method: "POST",
          body: JSON.stringify({ title, description, status })
        },
        token
      );

      setTitle("");
      setDescription("");
      setStatus("pending");
      setMessage("Task created successfully!");
      await loadTasks(token, filter);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateTask(taskId, updates) {
    try {
      await apiRequest(
        `/api/tasks/${taskId}`,
        {
          method: "PUT",
          body: JSON.stringify(updates)
        },
        token
      );

      await loadTasks(token, filter);
      setMessage("Task updated successfully!");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteTask(taskId) {
    if (!window.confirm("Are you sure you want to delete this task?")) {
      return;
    }

    try {
      await apiRequest(
        `/api/tasks/${taskId}`,
        { method: "DELETE" },
        token
      );

      await loadTasks(token, filter);
      setMessage("Task deleted successfully!");
    } catch (error) {
      setMessage(error.message);
    }
  }

  function handleImageSelection(event) {
    const file = event.target.files?.[0] || null;

    setSelectedImage(file);
    setUploadedImage("");

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(file ? URL.createObjectURL(file) : "");
  }

  async function handleImageUpload(event) {
    event.preventDefault();

    if (!selectedImage) {
      setMessage("Please select an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("image", selectedImage);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/uploads`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Image upload failed.");
      }

      setUploadedImage(
        data.imageUrl.startsWith("http")
          ? data.imageUrl
          : `${API_URL}${data.imageUrl}`
      );

      setMessage(data.message || "Image uploaded successfully!");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem("taskManagerToken");
    localStorage.removeItem("taskManagerUser");

    setToken("");
    setUser(null);
    setTasks([]);
    setMessage("You have logged out.");
  }

  if (!token) {
    return <Auth onLogin={handleLogin} />;
  }

  return (
    <main className="container">
      <h1>Week 3 Task Manager</h1>

      <p>
        {user?.name ? `Welcome, ${user.name}` : "Manage your tasks"}
      </p>

      <button type="button" onClick={logout}>
        Logout
      </button>

      <h2>Create Task</h2>

      <form onSubmit={handleTaskSubmit}>
        <input
          placeholder="Task title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />

        <textarea
          placeholder="Task description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="pending">Pending</option>
          <option value="in-progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>

        <button type="submit">Add Task</button>
      </form>

      <h2>Your Tasks</h2>

      <select
        value={filter}
        onChange={(event) => {
          const nextFilter = event.target.value;
          setFilter(nextFilter);
          loadTasks(token, nextFilter);
        }}
      >
        <option value="all">All Tasks</option>
        <option value="pending">Pending</option>
        <option value="in-progress">In Progress</option>
        <option value="completed">Completed</option>
      </select>

      <button type="button" onClick={() => loadTasks(token, filter)}>
        Refresh Tasks
      </button>

      {tasks.length === 0 && <p>No tasks to display.</p>}

      {tasks.map((task) => (
        <article className="task" key={task._id}>
          <h3>{task.title}</h3>
          <p>{task.description || "No description provided."}</p>
          <p>Status: {task.status}</p>

          <select
            aria-label={`Status for ${task.title}`}
            value={task.status}
            onChange={(event) =>
              updateTask(task._id, { status: event.target.value })
            }
          >
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <button
            type="button"
            onClick={() => {
              const newTitle = window.prompt(
                "Enter the new task title:",
                task.title
              );

              if (newTitle?.trim()) {
                updateTask(task._id, { title: newTitle.trim() });
              }
            }}
          >
            Edit Title
          </button>

          <button type="button" onClick={() => deleteTask(task._id)}>
            Delete
          </button>
        </article>
      ))}

      <h2>Image Upload</h2>

      <form onSubmit={handleImageUpload}>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageSelection}
        />

        {previewUrl && (
          <>
            <h3>Image Preview</h3>
            <img
              className="preview"
              src={previewUrl}
              alt="Selected image preview"
            />
          </>
        )}

        <button type="submit" disabled={loading}>
          {loading ? "Uploading..." : "Upload Image"}
        </button>
      </form>

      {uploadedImage && (
        <>
          <h3>Uploaded Image</h3>
          <img
            className="preview"
            src={uploadedImage}
            alt="Uploaded image"
          />
        </>
      )}

      {message && <p className="message">{message}</p>}
    </main>
  );
}

export default App;