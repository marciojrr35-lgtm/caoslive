document.addEventListener("DOMContentLoaded", () => {
  const postBtn = document.getElementById("createPostBtn");
  const modal = document.getElementById("postModal");
  const closeBtn = document.getElementById("closeModal");
  const form = document.getElementById("postForm");
  const feed = document.getElementById("feed");

  if (!postBtn || !modal || !form || !feed) {
    console.error("Elementos da postagem não encontrados.");
    return;
  }

  postBtn.addEventListener("click", () => {
    modal.classList.add("active");
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      modal.classList.remove("active");
    });
  }

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      modal.classList.remove("active");
    }
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = document.getElementById("author")?.value.trim() || "Anônimo";
    const text = document.getElementById("postText")?.value.trim() || "";
    const image = document.getElementById("imageUrl")?.value.trim() || "";

    if (!text) {
      alert("Escreva alguma coisa antes de publicar!");
      return;
    }

    const post = {
      id: Date.now(),
      name,
      text,
      image,
      date: new Date().toLocaleString("pt-BR")
    };

    const posts = JSON.parse(localStorage.getItem("caoslive_posts") || "[]");
    posts.unshift(post);
    localStorage.setItem("caoslive_posts", JSON.stringify(posts));

    form.reset();
    modal.classList.remove("active");
    renderPosts();
  });

  function renderPosts() {
    const posts = JSON.parse(
      localStorage.getItem("caoslive_posts") || "[]"
    );

    feed.innerHTML = "";

    if (posts.length === 0) {
      feed.innerHTML = `
        <div class="empty">
          <h3>Nenhuma postagem ainda</h3>
          <p>Seja o primeiro a publicar no CAOSLIVE!</p>
        </div>
      `;
      return;
    }

    posts.forEach((post) => {
      const article = document.createElement("article");
      article.className = "post";

      article.innerHTML = `
        <div class="post-header">
          <strong>${escapeHTML(post.name)}</strong>
          <small>${post.date}</small>
        </div>

        <p>${escapeHTML(post.text)}</p>

        ${
          post.image
            ? `<img src="${escapeAttribute(post.image)}" class="post-image" alt="Imagem da postagem">`
            : ""
        }

        <div class="post-actions">
          <button class="memory-btn" data-id="${post.id}">
            ❤️ Recordação
          </button>

          <button class="delete-btn" data-id="${post.id}">
            🗑️ Apagar
          </button>
        </div>
      `;

      feed.appendChild(article);
    });
  }

  feed.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;

    const id = Number(button.dataset.id);
    const posts = JSON.parse(
      localStorage.getItem("caoslive_posts") || "[]"
    );

    if (button.classList.contains("delete-btn")) {
      const updated = posts.filter((post) => post.id !== id);
      localStorage.setItem("caoslive_posts", JSON.stringify(updated));
      renderPosts();
    }

    if (button.classList.contains("memory-btn")) {
      const post = posts.find((post) => post.id === id);
      if (!post) return;

      const memories = JSON.parse(
        localStorage.getItem("caoslive_memories") || "[]"
      );

      if (!memories.some((item) => item.id === id)) {
        memories.unshift(post);
        localStorage.setItem(
          "caoslive_memories",
          JSON.stringify(memories)
        );
        button.textContent = "💾 Salvo!";
      } else {
        button.textContent = "❤️ Já salvo";
      }
    }
  });

  function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function escapeAttribute(text) {
    return text.replace(/"/g, "&quot;");
  }

  renderPosts();
});
